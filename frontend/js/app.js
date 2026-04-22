// frontend/js/app.js — Main application controller

import { loadState, saveState, startNewSession, finaliseSession, computeAnalytics } from './state.js';
import { checkHealth, generateQuestions, evaluateAnswer } from './api.js';
import {
  showToast, setLoading, renderQuestionList, showAnswerArea,
  renderEvaluationModal, setConnectionStatus, renderAnalytics,
  addRipple, spawnConfetti, escapeHTML,
} from './ui.js';

// ── App state (in-memory, persisted to localStorage on mutations) ─────────
let S = loadState();

// ── Onboarding data ───────────────────────────────────────────────────────
const OB_STEPS = [
  {
    q: 'Welcome. What should I call you?',
    sub: 'Just your first name. This personalises your entire experience.',
    type: 'text', ph: 'Your first name…', key: 'name',
  },
  {
    q: 'What is your primary learning goal?',
    sub: "I'll adjust difficulty, pacing, and question types accordingly.",
    type: 'opts', key: 'goal',
    opts: [
      { icon: 'grad',    l: 'Exam prep',    d: 'Upcoming test or certification' },
      { icon: 'brain',   l: 'Deep mastery', d: 'Truly understand the material' },
      { icon: 'refresh', l: 'Quick review', d: 'Refresh existing knowledge' },
      { icon: 'search',  l: 'Research',     d: 'Explore new fields deeply' },
    ],
  },
  {
    q: 'How do you study best?',
    sub: 'This shapes your session flow and feedback tone.',
    type: 'opts', key: 'focus',
    opts: [
      { icon: 'clock', l: 'Short bursts',   d: '15–25 min focused sprints' },
      { icon: 'inf',   l: 'Long sessions',  d: '1–2 hour deep dives' },
      { icon: 'sun',   l: 'Morning person', d: 'Best focus early in the day' },
      { icon: 'moon',  l: 'Night owl',      d: 'Peak performance after dark' },
    ],
  },
  {
    q: 'Which subject challenges you most?',
    sub: "I'll schedule harder questions and extra reinforcement here.",
    type: 'opts', key: 'weak',
    opts: [
      { icon: 'flask', l: 'Sciences',    d: 'Biology, Chemistry, Physics' },
      { icon: 'sigma', l: 'Mathematics', d: 'Calculus, Stats, Algebra' },
      { icon: 'book',  l: 'Humanities',  d: 'History, Literature, Philosophy' },
      { icon: 'cpu',   l: 'Technology',  d: 'CS, Programming, Systems' },
    ],
  },
  {
    q: 'Do you tend to be overconfident or unsure about your knowledge?',
    sub: 'This calibrates your starting metacognitive profile. Be honest.',
    type: 'opts', key: 'metacog',
    opts: [
      { icon: 'warn',   l: 'Overconfident',   d: 'Often surprised by low scores' },
      { icon: 'target', l: 'Well-calibrated',  d: 'Scores match expectations' },
      { icon: 'check',  l: 'Underconfident',   d: 'Score higher than expected' },
      { icon: 'shrug',  l: 'Not sure',         d: "Haven't tracked it" },
    ],
  },
];

// SVG icon map (no emoji)
const ICONS = {
  grad:    `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><polygon points="8,2 15,6 8,10 1,6" stroke="#a5b4fc" stroke-width="1.2" fill="none" stroke-linejoin="round"/><path d="M4 8v3.5l4 2 4-2V8" stroke="#a5b4fc" stroke-width="1.2" fill="none" stroke-linejoin="round"/></svg>`,
  brain:   `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M5 8c0-1.7 1.3-3 3-3s3 1.3 3 3-1.3 3-3 3-3-1.3-3-3z" stroke="#a5b4fc" stroke-width="1.2" fill="none"/><path d="M8 11v3M3 8H1M15 8h-2" stroke="#a5b4fc" stroke-width="1.1" stroke-linecap="round"/></svg>`,
  refresh: `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M12 8A4 4 0 1 1 8 4" stroke="#a5b4fc" stroke-width="1.2" stroke-linecap="round" fill="none"/><path d="M12 4v4h-4" stroke="#a5b4fc" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  search:  `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="7" cy="7" r="4" stroke="#a5b4fc" stroke-width="1.2" fill="none"/><path d="M10.5 10.5L14 14" stroke="#a5b4fc" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  clock:   `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="5.5" stroke="#a5b4fc" stroke-width="1.2" fill="none"/><path d="M8 5v3l2 1.5" stroke="#a5b4fc" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  inf:     `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M2 8c0-2 1.5-3 3-3s3 2.5 3 2.5S9.5 5 11 5s3 1 3 3-1.5 3-3 3-3-2.5-3-2.5S6.5 11 5 11s-3-1-3-3z" stroke="#a5b4fc" stroke-width="1.2" fill="none"/></svg>`,
  sun:     `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="3" stroke="#a5b4fc" stroke-width="1.2" fill="none"/><path d="M8 1.5v1.5M8 13v1.5M1.5 8h1.5M13 8h1.5M3.5 3.5l1 1M11.5 11.5l1 1M3.5 12.5l1-1M11.5 4.5l1-1" stroke="#a5b4fc" stroke-width="1" stroke-linecap="round"/></svg>`,
  moon:    `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M12 9A6 6 0 1 1 7 3c0 0 2 1 2 3s-1 4 3 3z" stroke="#a5b4fc" stroke-width="1.2" fill="none" stroke-linejoin="round"/></svg>`,
  flask:   `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M5.5 2h5M6 2v5L3 13h10L10 7V2" stroke="#a5b4fc" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  sigma:   `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M12 2H4l5 6-5 6h8" stroke="#a5b4fc" stroke-width="1.3" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
  book:    `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 2h7l3 3v9H3V2z" stroke="#a5b4fc" stroke-width="1.2" fill="none"/><path d="M5 6.5h6M5 9h4" stroke="#a5b4fc" stroke-width="1.1" stroke-linecap="round"/></svg>`,
  cpu:     `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><rect x="3" y="3" width="10" height="10" rx="1.5" stroke="#a5b4fc" stroke-width="1.2" fill="none"/><rect x="5.5" y="5.5" width="5" height="5" rx="1" stroke="#a5b4fc" stroke-width="1.1" fill="none"/><path d="M6 1v2M10 1v2M6 13v2M10 13v2M1 6h2M1 10h2M13 6h2M13 10h2" stroke="#a5b4fc" stroke-width="1" stroke-linecap="round"/></svg>`,
  warn:    `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M8 2L15 14H1L8 2z" stroke="#a5b4fc" stroke-width="1.2" fill="none" stroke-linejoin="round"/><path d="M8 7v3M8 12v1" stroke="#a5b4fc" stroke-width="1.2" stroke-linecap="round"/></svg>`,
  target:  `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6" stroke="#a5b4fc" stroke-width="1.2" fill="none"/><circle cx="8" cy="8" r="3" stroke="#a5b4fc" stroke-width="1.2" fill="none"/><circle cx="8" cy="8" r="1" fill="#a5b4fc"/></svg>`,
  check:   `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><path d="M3 8l3 3 7-7" stroke="#a5b4fc" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
  shrug:   `<svg width="13" height="13" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="5" r="2.5" stroke="#a5b4fc" stroke-width="1.2" fill="none"/><path d="M4 13c0-2.2 1.8-4 4-4s4 1.8 4 4" stroke="#a5b4fc" stroke-width="1.2" fill="none" stroke-linecap="round"/><path d="M2 9.5l2-1M14 9.5l-2-1" stroke="#a5b4fc" stroke-width="1.1" stroke-linecap="round"/></svg>`,
};

// ══════════════════════════════════════════════════════════════════════════
// ONBOARDING
// ══════════════════════════════════════════════════════════════════════════
function renderObStep() {
  const step = OB_STEPS[S.obStep];
  const pct = ((S.obStep + 1) / OB_STEPS.length) * 100;
  document.getElementById('ob-prog').style.width = pct + '%';
  document.getElementById('ob-step').textContent = `Step ${S.obStep + 1} of ${OB_STEPS.length}`;

  let html = `<div class="ob-q">${escapeHTML(step.q)}</div>
               <div class="ob-sub">${escapeHTML(step.sub)}</div>`;

  if (step.type === 'text') {
    html += `<input type="text" id="ob-ti" class="ob-text-input" placeholder="${escapeHTML(step.ph)}" autocomplete="off">`;
  } else {
    html += `<div class="option-grid">${
      step.opts.map((o, i) => `
        <button class="option-btn" data-idx="${i}" data-key="${step.key}" data-val="${escapeHTML(o.l)}">
          <span class="opt-icon">${ICONS[o.icon] || ''}</span>
          <span class="opt-label">${escapeHTML(o.l)}</span>
          <span class="opt-desc">${escapeHTML(o.d)}</span>
        </button>`).join('')
    }</div>`;
  }

  const content = document.getElementById('ob-content');
  content.innerHTML = html;

  // Restore existing selection
  const ex = S.onboardAnswers[step.key];
  if (ex && step.type === 'opts') {
    content.querySelectorAll('.option-btn').forEach(b => {
      if (b.dataset.val === ex) b.classList.add('selected');
    });
  }
  if (ex && step.type === 'text') {
    const inp = document.getElementById('ob-ti');
    if (inp) inp.value = ex;
  }

  // Bind option-btn clicks
  content.querySelectorAll('.option-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      content.querySelectorAll('.option-btn').forEach(b => b.classList.remove('selected'));
      btn.classList.add('selected');
      S.onboardAnswers[btn.dataset.key] = btn.dataset.val;
    });
  });

  // Auto-bind text input
  const ti = document.getElementById('ob-ti');
  if (ti) {
    ti.addEventListener('input', () => { S.onboardAnswers[step.key] = ti.value; });
    ti.addEventListener('keydown', (e) => { if (e.key === 'Enter') handleObNext(); });
    ti.focus();
  }
}

function handleObNext() {
  const step = OB_STEPS[S.obStep];
  if (step.type === 'text') {
    const val = (S.onboardAnswers[step.key] || '').trim();
    if (!val) { showToast('Please enter your name.', 'rose'); return; }
    S.onboardAnswers[step.key] = val;
  } else if (!S.onboardAnswers[step.key]) {
    showToast('Please select an option.', 'rose'); return;
  }

  if (S.obStep < OB_STEPS.length - 1) {
    S.obStep++;
    renderObStep();
  } else {
    finishOnboarding();
  }
}

function finishOnboarding() {
  const name = S.onboardAnswers.name || 'Learner';
  S.userName = name;
  S.userInitials = name.split(' ').map(w => w[0].toUpperCase()).join('').slice(0, 2);
  saveState(S);

  // Populate UI with user data
  document.getElementById('sb-av').textContent = S.userInitials;
  document.getElementById('sb-name').textContent = name;
  document.getElementById('prof-av').textContent = S.userInitials;
  document.getElementById('prof-name').textContent = name;
  document.getElementById('pf-goal').textContent = S.onboardAnswers.goal || '—';
  document.getElementById('pf-focus').textContent = S.onboardAnswers.focus || '—';
  document.getElementById('pf-weak').textContent = S.onboardAnswers.weak || '—';
  document.getElementById('pf-session').textContent =
    (S.onboardAnswers.focus || '').includes('Short') ? '20 min' : '60 min';
  document.getElementById('prof-tags').innerHTML =
    [S.onboardAnswers.goal, S.onboardAnswers.weak, S.onboardAnswers.metacog]
      .filter(Boolean).map(t => `<span class="ptag">${escapeHTML(t)}</span>`).join('');

  document.getElementById('screen-onboarding').classList.remove('active');
  document.getElementById('screen-app').classList.add('active');

  initApp();
}

// ══════════════════════════════════════════════════════════════════════════
// APP INIT (post-onboarding)
// ══════════════════════════════════════════════════════════════════════════
function initApp() {
  document.getElementById('tp-date').textContent =
    new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });

  // Populate from existing state
  document.getElementById('sb-av').textContent = S.userInitials || '?';
  document.getElementById('sb-name').textContent = S.userName || 'Learner';
  document.getElementById('prof-av').textContent = S.userInitials || '?';
  document.getElementById('prof-name').textContent = S.userName || 'Learner';
  document.getElementById('pf-goal').textContent = S.onboardAnswers.goal || '—';
  document.getElementById('pf-focus').textContent = S.onboardAnswers.focus || '—';
  document.getElementById('pf-weak').textContent = S.onboardAnswers.weak || '—';
  document.getElementById('pf-session').textContent =
    (S.onboardAnswers.focus || '').includes('Short') ? '20 min' : '60 min';
  document.getElementById('prof-tags').innerHTML =
    [S.onboardAnswers.goal, S.onboardAnswers.weak, S.onboardAnswers.metacog]
      .filter(Boolean).map(t => `<span class="ptag">${escapeHTML(t)}</span>`).join('');

  const analytics = computeAnalytics(S.sessions || []);
  renderAnalytics(analytics, S.sessions || []);

  // Check Ollama connection
  checkHealth().then(({ ok, models }) => {
    setConnectionStatus(ok, ok ? `AI Ready (${models[0] || 'llama3'})` : 'AI Offline');
    if (!ok) showToast('Ollama not detected. Start Ollama to enable AI features.', 'amber');
  });
}

// ══════════════════════════════════════════════════════════════════════════
// STUDY SESSION
// ══════════════════════════════════════════════════════════════════════════
async function handleGenerateQuestions() {
  const notes = document.getElementById('notes-input').value.trim();
  if (notes.length < 20) {
    showToast('Please add at least a few sentences of notes.', 'rose');
    return;
  }

  const btn = document.getElementById('btn-generate');
  setLoading('btn-generate', true, 'Generating…');
  document.getElementById('qlist').innerHTML = `
    <div class="generating">
      <div class="dot-loader"><span></span><span></span><span></span></div>
      Asking AI to generate questions…
    </div>`;
  document.getElementById('qcount').textContent = '…';

  try {
    const { questions } = await generateQuestions(notes);

    S.activeSession = startNewSession(notes);
    S.activeSession.questions = questions;
    S.currentQuestionId = null;
    S.selectedConfidence = 0;

    document.getElementById('answer-area').style.display = 'none';
    document.getElementById('qcount').textContent = `${questions.length} questions`;

    renderQuestionList(questions, null, document.getElementById('qlist'));
    showToast(`${questions.length} questions generated.`, 'indigo');
  } catch (err) {
    document.getElementById('qlist').innerHTML = `
      <div class="qlist-empty error-msg">
        Failed to generate questions. Is Ollama running?<br>
        <small>${escapeHTML(err.message)}</small>
      </div>`;
    document.getElementById('qcount').textContent = '0 questions';
    showToast('Question generation failed.', 'rose');
  } finally {
    setLoading('btn-generate', false);
  }
}

function handleSelectQuestion(qid) {
  if (!S.activeSession) return;
  const q = S.activeSession.questions.find(x => x.id === qid);
  if (!q) return;

  S.currentQuestionId = qid;
  S.selectedConfidence = 0;

  showAnswerArea(q);
  renderQuestionList(S.activeSession.questions, qid, document.getElementById('qlist'));
}

function handleConfidenceSelect(level) {
  S.selectedConfidence = level;
  document.querySelectorAll('.conf-btn').forEach((b, i) => {
    b.className = 'conf-btn' + (i + 1 === level ? ` conf-btn--s${level}` : '');
    b.setAttribute('aria-pressed', String(i + 1 === level));
  });
}

async function handleSubmitAnswer() {
  if (!S.activeSession || S.currentQuestionId === null) return;

  const answer = document.getElementById('a-input').value.trim();
  if (answer.length < 5) { showToast('Please write a more complete answer.', 'rose'); return; }
  if (!S.selectedConfidence) { showToast('Please rate your confidence.', 'amber'); return; }

  const q = S.activeSession.questions.find(x => x.id === S.currentQuestionId);
  if (!q) return;

  // Store answer + confidence
  S.activeSession.answers[S.currentQuestionId] = answer;
  S.activeSession.confidences[S.currentQuestionId] = S.selectedConfidence;

  setLoading('btn-evaluate', true, 'Evaluating…');

  try {
    const evaluation = await evaluateAnswer(q.question, answer, S.selectedConfidence);

    S.activeSession.evaluations[S.currentQuestionId] = evaluation;
    q.answered = true;

    renderQuestionList(S.activeSession.questions, S.currentQuestionId, document.getElementById('qlist'));
    renderEvaluationModal(evaluation);
    openModal('eval-modal');

    if (evaluation.score >= 80) spawnConfetti();
  } catch (err) {
    showToast('Evaluation failed. Is Ollama running?', 'rose');
    console.error('[Evaluate]', err);
  } finally {
    setLoading('btn-evaluate', false);
  }
}

function handleSkipQuestion() {
  if (!S.activeSession) return;
  const next = S.activeSession.questions.find(q => !q.answered && q.id !== S.currentQuestionId);
  if (next) handleSelectQuestion(next.id);
  else showToast('No more unanswered questions.', 'amber');
}

function handleNextQuestion() {
  closeModal('eval-modal');
  if (!S.activeSession) return;
  const next = S.activeSession.questions.find(q => !q.answered);
  if (next) {
    setTimeout(() => handleSelectQuestion(next.id), 200);
  } else {
    // Session complete — save it
    const finalSession = finaliseSession(S.activeSession);
    S.sessions = [...(S.sessions || []), finalSession];
    S.activeSession = null;
    saveState(S);

    const analytics = computeAnalytics(S.sessions);
    renderAnalytics(analytics, S.sessions);

    document.getElementById('answer-area').style.display = 'none';
    showToast('Session complete. Results saved to Insights.', 'emerald');
  }
}

function handleClearNotes() {
  document.getElementById('notes-input').value = '';
  document.getElementById('qlist').innerHTML = `
    <div class="qlist-empty">Questions will appear here after you paste notes and click Generate.</div>`;
  document.getElementById('qcount').textContent = '0 questions';
  document.getElementById('answer-area').style.display = 'none';
  S.activeSession = null;
  S.currentQuestionId = null;
}

function handleLoadSample() {
  document.getElementById('notes-input').value = SAMPLE_NOTES;
  showToast('Sample notes loaded.', 'emerald');
}

// ══════════════════════════════════════════════════════════════════════════
// NAVIGATION
// ══════════════════════════════════════════════════════════════════════════
function switchPanel(id) {
  document.querySelectorAll('.content-panel').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
  const panel = document.getElementById('panel-' + id);
  const navItem = document.querySelector(`.nav-item[data-panel="${id}"]`);
  if (panel) panel.classList.add('active');
  if (navItem) navItem.classList.add('active');
  const TITLES = { dashboard: 'Dashboard', study: 'Study Session', visualize: 'Insights', profile: 'Profile' };
  document.getElementById('tp-title').textContent = TITLES[id] || '';
  S.currentPanel = id;
}

// ══════════════════════════════════════════════════════════════════════════
// MODAL HELPERS
// ══════════════════════════════════════════════════════════════════════════
function openModal(id) {
  const el = document.getElementById(id);
  if (el) el.classList.add('open');
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (el) {
    el.classList.remove('open');
    document.getElementById('ring-fill').style.strokeDashoffset = '163';
  }
}

// ══════════════════════════════════════════════════════════════════════════
// EVENT BINDING (no inline HTML handlers)
// ══════════════════════════════════════════════════════════════════════════
function bindEvents() {
  // Onboarding
  document.getElementById('ob-next')?.addEventListener('click', handleObNext);

  // Nav items
  document.querySelectorAll('.nav-item[data-panel]').forEach(el => {
    el.addEventListener('click', () => switchPanel(el.dataset.panel));
  });

  // Study controls
  document.getElementById('btn-generate')?.addEventListener('click', handleGenerateQuestions);
  document.getElementById('btn-clear')?.addEventListener('click', handleClearNotes);
  document.getElementById('btn-sample')?.addEventListener('click', handleLoadSample);
  document.getElementById('btn-evaluate')?.addEventListener('click', handleSubmitAnswer);
  document.getElementById('btn-skip')?.addEventListener('click', handleSkipQuestion);

  // Question list delegation
  document.getElementById('qlist')?.addEventListener('click', (e) => {
    const card = e.target.closest('.qcard');
    if (card) handleSelectQuestion(Number(card.dataset.qid));
  });

  document.getElementById('qlist')?.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      const card = e.target.closest('.qcard');
      if (card) handleSelectQuestion(Number(card.dataset.qid));
    }
  });

  // Confidence buttons
  document.querySelectorAll('.conf-btn').forEach((btn, i) => {
    btn.addEventListener('click', () => handleConfidenceSelect(i + 1));
  });

  // Modal controls
  document.getElementById('btn-close-eval')?.addEventListener('click', () => closeModal('eval-modal'));
  document.getElementById('btn-next-q')?.addEventListener('click', handleNextQuestion);
  document.getElementById('eval-modal')?.addEventListener('click', (e) => {
    if (e.target === e.currentTarget) closeModal('eval-modal');
  });

  // Action cards on dashboard
  document.getElementById('action-study')?.addEventListener('click', () => switchPanel('study'));
  document.getElementById('action-insights')?.addEventListener('click', () => switchPanel('visualize'));

  // Profile toggles (no special logic needed)
  // Ripple on interactive elements
  document.addEventListener('click', (e) => {
    const el = e.target.closest('.btn-primary, .btn-secondary, .tool-btn, .action-card, .option-btn');
    if (el) addRipple({ currentTarget: el, clientX: e.clientX, clientY: e.clientY });
  });

  // Restart demo
  document.getElementById('btn-restart')?.addEventListener('click', () => {
    if (confirm('This will clear all data and restart the onboarding. Continue?')) {
      localStorage.clear();
      location.reload();
    }
  });
}

// ══════════════════════════════════════════════════════════════════════════
// ENTRY POINT
// ══════════════════════════════════════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  bindEvents();

  // If user already completed onboarding, skip straight to app
  if (S.userName) {
    document.getElementById('screen-onboarding').classList.remove('active');
    document.getElementById('screen-app').classList.add('active');
    initApp();
    switchPanel(S.currentPanel || 'dashboard');
  } else {
    document.getElementById('screen-onboarding').classList.add('active');
    renderObStep();
  }
});

// ══════════════════════════════════════════════════════════════════════════
// SAMPLE NOTES
// ══════════════════════════════════════════════════════════════════════════
const SAMPLE_NOTES = `Neurons are the fundamental units of the brain and nervous system. They communicate via electrochemical signals across specialised junctions called synapses.

Action potentials are all-or-nothing electrical signals. They are triggered when the membrane potential reaches the threshold of approximately -55mV. The resting membrane potential is around -70mV.

Myelin sheaths, produced by Schwann cells in the peripheral nervous system and oligodendrocytes in the CNS, insulate axons and dramatically increase signal conduction velocity through saltatory conduction.

Neurotransmitters like dopamine, serotonin, acetylcholine, and GABA are released from presynaptic terminals and bind to receptors on postsynaptic neurons, producing either excitatory (EPSP) or inhibitory (IPSP) postsynaptic potentials.

Neuroplasticity is the brain's ability to reorganise itself by forming new neural connections. Long-Term Potentiation (LTP) is the cellular mechanism underlying learning and memory.`;
