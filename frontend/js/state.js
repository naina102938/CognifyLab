// frontend/js/state.js — Centralised state with localStorage persistence

const STORAGE_KEY = 'cognifylab_v1';

const defaultState = {
  userName: '',
  userInitials: '',
  onboardAnswers: {},
  obStep: 0,
  currentPanel: 'dashboard',
  sessions: [],        // Array of completed session objects
  activeSession: null, // { notes, questions[], answers{}, confidences{}, evaluations{} }
  currentQuestionId: null,
  selectedConfidence: 0,
};

// ── Load from localStorage ────────────────────────────────────────────────
function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return { ...defaultState };
    const saved = JSON.parse(raw);
    // Merge saved into defaults so new keys always exist
    return { ...defaultState, ...saved };
  } catch (_) {
    return { ...defaultState };
  }
}

// ── Persist to localStorage ───────────────────────────────────────────────
function saveState(state) {
  try {
    // Don't persist transient UI state
    const { obStep, currentPanel, currentQuestionId, selectedConfidence, ...persistent } = state;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(persistent));
  } catch (err) {
    console.warn('[State] localStorage write failed:', err.message);
  }
}

// ── Session helpers ───────────────────────────────────────────────────────
function startNewSession(notes) {
  return {
    id: Date.now(),
    startedAt: new Date().toISOString(),
    notes,
    questions: [],
    answers: {},      // questionId -> string
    confidences: {},  // questionId -> 1|2|3
    evaluations: {},  // questionId -> evaluation object
    completed: false,
  };
}

function finaliseSession(session) {
  const evals = Object.values(session.evaluations);
  if (evals.length === 0) return session;

  const avgScore = evals.reduce((s, e) => s + (e.score || 0), 0) / evals.length;
  const avgConf  = Object.values(session.confidences).reduce((s, c) => s + c, 0) /
                   Math.max(Object.values(session.confidences).length, 1);
  const overconfidentCount = evals.filter(e => e.overconfident).length;

  return {
    ...session,
    completed: true,
    completedAt: new Date().toISOString(),
    stats: {
      totalQuestions: session.questions.length,
      answered: evals.length,
      avgScore: Math.round(avgScore),
      avgConfidence: Math.round(avgConf * 10) / 10,
      overconfidentCount,
      calibrationRate: Math.round(((evals.length - overconfidentCount) / Math.max(evals.length, 1)) * 100),
    },
  };
}

// ── Analytics across all sessions ─────────────────────────────────────────
function computeAnalytics(sessions) {
  const completed = sessions.filter(s => s.completed && s.stats);
  if (completed.length === 0) {
    return { totalSessions: 0, avgAccuracy: 0, streak: 0, overconfidenceRate: 0, topicBreakdown: [] };
  }

  const avgAccuracy = Math.round(
    completed.reduce((s, sess) => s + sess.stats.avgScore, 0) / completed.length
  );

  const allEvals = completed.flatMap(s => Object.values(s.evaluations));
  const overconfidentCount = allEvals.filter(e => e.overconfident).length;
  const overconfidenceRate = allEvals.length > 0
    ? Math.round((overconfidentCount / allEvals.length) * 100)
    : 0;

  // Streak: consecutive days with at least one session
  const streak = computeStreak(completed);

  // Topic breakdown from question types
  const typeTotals = {};
  const typeScores = {};
  completed.forEach(s => {
    s.questions.forEach(q => {
      const t = q.type;
      const ev = s.evaluations[q.id];
      if (!ev) return;
      typeTotals[t] = (typeTotals[t] || 0) + 1;
      typeScores[t] = (typeScores[t] || 0) + ev.score;
    });
  });

  const topicBreakdown = Object.keys(typeTotals).map(type => ({
    type,
    count: typeTotals[type],
    avgScore: Math.round(typeScores[type] / typeTotals[type]),
  }));

  return {
    totalSessions: completed.length,
    avgAccuracy,
    streak,
    overconfidenceRate,
    topicBreakdown,
  };
}

function computeStreak(sessions) {
  if (sessions.length === 0) return 0;
  const days = new Set(
    sessions.map(s => new Date(s.completedAt).toDateString())
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    if (days.has(d.toDateString())) streak++;
    else break;
  }
  return streak;
}

export { loadState, saveState, startNewSession, finaliseSession, computeAnalytics, defaultState };
