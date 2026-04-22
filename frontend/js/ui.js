// frontend/js/ui.js — Pure DOM rendering functions

// ── Toast ─────────────────────────────────────────────────────────────────
function showToast(message, type = 'emerald') {
  const COLOR = {
    indigo: '#6366f1',
    emerald: '#10B981',
    amber: '#f59e0b',
    rose: '#f43f5e',
    gray: '#64748b',
  };
  const wrap = document.getElementById('toast-wrap');
  const t = document.createElement('div');
  t.className = 'toast';
  t.innerHTML = `
    <span class="toast-dot" style="background:${COLOR[type] || COLOR.emerald}"></span>
    <span class="toast-msg">${escapeHTML(message)}</span>
  `;
  wrap.appendChild(t);
  setTimeout(() => {
    t.classList.add('out');
    setTimeout(() => t.remove(), 320);
  }, 3600);
}

// ── Loading overlay ───────────────────────────────────────────────────────
function setLoading(elementId, isLoading, label = 'Processing…') {
  const el = document.getElementById(elementId);
  if (!el) return;
  if (isLoading) {
    el.dataset.originalContent = el.innerHTML;
    el.innerHTML = `<span class="btn-spinner"></span>${label}`;
    el.disabled = true;
  } else {
    if (el.dataset.originalContent) el.innerHTML = el.dataset.originalContent;
    el.disabled = false;
  }
}

// ── Question card list ────────────────────────────────────────────────────
function renderQuestionList(questions, activeId, container) {
  if (!container) return;

  if (questions.length === 0) {
    container.innerHTML = `
      <div class="qlist-empty">
        Questions will appear here after you paste notes and click Generate.
      </div>`;
    return;
  }

  container.innerHTML = questions.map(q => {
    const isActive = q.id === activeId;
    const isAnswered = q.answered;
    return `
      <div class="qcard ${isActive ? 'qcard--active' : ''} ${isAnswered ? 'qcard--answered' : ''}"
           data-qid="${q.id}"
           role="button"
           tabindex="0"
           aria-label="${q.type} question">
        <span class="qcard-type">${escapeHTML(q.type)}</span>
        <p class="qcard-text">${escapeHTML(q.question)}</p>
      </div>`;
  }).join('');
}

// ── Answer area ───────────────────────────────────────────────────────────
function showAnswerArea(question) {
  const area = document.getElementById('answer-area');
  const qtype = document.getElementById('a-qtype');
  const qtext = document.getElementById('a-qtext');
  const input = document.getElementById('a-input');

  qtype.textContent = question.type + ' Question';
  qtext.textContent = question.question;
  input.value = '';
  area.style.display = 'block';
  area.scrollIntoView({ behavior: 'smooth', block: 'nearest' });

  // Reset confidence buttons
  document.querySelectorAll('.conf-btn').forEach(b => {
    b.className = 'conf-btn';
    b.setAttribute('aria-pressed', 'false');
  });
}

// ── Evaluation modal ──────────────────────────────────────────────────────
function renderEvaluationModal(ev) {
  document.getElementById('eval-score').textContent = ev.score + '%';
  document.getElementById('eval-title').textContent = ev.grade || 'Evaluated';
  document.getElementById('eval-sub').textContent = ev.correctness || '';
  document.getElementById('eval-body').textContent = ev.improvement || '';

  // Score ring
  const ring = document.getElementById('ring-fill');
  const circumference = 163;
  const offset = circumference - (ev.score / 100) * circumference;
  ring.style.stroke = ev.score >= 80 ? '#10B981' : ev.score >= 55 ? '#f59e0b' : '#f43f5e';
  setTimeout(() => { ring.style.strokeDashoffset = offset; }, 80);

  // Confidence gap indicator
  const gapEl = document.getElementById('eval-gap');
  if (ev.overconfident) {
    gapEl.innerHTML = `
      <div class="gap-ind gap-ind--over">
        <span class="gi-dot"></span>
        <div class="gap-text">
          <strong>Overconfidence detected</strong>
          ${escapeHTML(ev.confidence_analysis || 'Your confidence was higher than your actual performance.')}
        </div>
      </div>`;
  } else if (ev.score >= 75 && !ev.overconfident) {
    gapEl.innerHTML = `
      <div class="gap-ind gap-ind--match">
        <span class="gi-dot"></span>
        <div class="gap-text">
          <strong>Well calibrated</strong>
          ${escapeHTML(ev.confidence_analysis || 'Your confidence matched your performance.')}
        </div>
      </div>`;
  } else {
    gapEl.innerHTML = `
      <div class="gap-ind gap-ind--under">
        <span class="gi-dot"></span>
        <div class="gap-text">
          <strong>Keep building confidence</strong>
          ${escapeHTML(ev.confidence_analysis || 'More practice will help here.')}
        </div>
      </div>`;
  }

  // Missing concepts & misconceptions
  const detailEl = document.getElementById('eval-detail');
  let detailHTML = '';

  if (ev.missing_concepts?.length > 0) {
    detailHTML += `
      <div class="eval-list-section">
        <p class="eval-list-label">Concepts to review</p>
        <ul class="eval-list">${ev.missing_concepts.map(c => `<li>${escapeHTML(c)}</li>`).join('')}</ul>
      </div>`;
  }

  if (ev.misconceptions?.length > 0) {
    detailHTML += `
      <div class="eval-list-section">
        <p class="eval-list-label">Misconceptions identified</p>
        <ul class="eval-list eval-list--warn">${ev.misconceptions.map(c => `<li>${escapeHTML(c)}</li>`).join('')}</ul>
      </div>`;
  }

  detailEl.innerHTML = detailHTML;
}

// ── Status indicator (Ollama connection) ──────────────────────────────────
function setConnectionStatus(ok, label = '') {
  const el = document.getElementById('connection-status');
  if (!el) return;
  el.className = `conn-status ${ok ? 'conn-status--ok' : 'conn-status--err'}`;
  el.textContent = label || (ok ? 'AI Connected' : 'AI Offline');
  el.title = ok ? 'Ollama is reachable' : 'Ollama not reachable — start Ollama and refresh';
}

// ── Analytics panel ───────────────────────────────────────────────────────
function renderAnalytics(analytics, sessions) {
  // Summary cards
  safeSet('stat-sessions', analytics.totalSessions || '0');
  safeSet('stat-accuracy', (analytics.avgAccuracy || '0') + '%');
  safeSet('stat-streak', analytics.streak || '0');
  safeSet('stat-overconf', (analytics.overconfidenceRate || '0') + '%');

  // Recent sessions list
  const recentEl = document.getElementById('recent-sessions-list');
  if (recentEl) {
    const recent = [...sessions].reverse().slice(0, 5);
    if (recent.length === 0) {
      recentEl.innerHTML = `<div class="sess-row"><span class="sname">No sessions yet. Start studying!</span></div>`;
    } else {
      recentEl.innerHTML = recent.map(s => {
        const score = s.stats?.avgScore ?? 0;
        const color = score >= 80 ? '#10B981' : score >= 55 ? '#f59e0b' : '#f43f5e';
        const badgeClass = score >= 80 ? 'be' : score >= 55 ? 'ba' : 'br';
        const date = s.completedAt ? new Date(s.completedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '—';
        return `
          <div class="sess-row">
            <div class="sdot" style="background:${color}"></div>
            <div class="sname">${escapeHTML(s.notes.slice(0, 40).trim())}…</div>
            <span class="badge ${badgeClass}">${score}%</span>
            <span class="sess-date">${date}</span>
          </div>`;
      }).join('');
    }
  }

  // Topic breakdown table
  const tbody = document.getElementById('topic-tbody');
  if (tbody && analytics.topicBreakdown?.length > 0) {
    tbody.innerHTML = analytics.topicBreakdown.map(t => {
      const color = t.avgScore >= 80 ? '#10B981' : t.avgScore >= 55 ? '#f59e0b' : '#f43f5e';
      return `
        <tr>
          <td style="font-weight:600">${escapeHTML(t.type)}</td>
          <td style="color:var(--text2)">${t.count}</td>
          <td><span style="color:${color};font-weight:600">${t.avgScore}%</span></td>
        </tr>`;
    }).join('');
  }
}

// ── Ripple effect ─────────────────────────────────────────────────────────
function addRipple(event) {
  const el = event.currentTarget;
  const r = document.createElement('span');
  r.className = 'ripple';
  const size = Math.max(el.offsetWidth, el.offsetHeight);
  const rect = el.getBoundingClientRect();
  r.style.cssText = `
    width:${size}px; height:${size}px;
    left:${event.clientX - rect.left - size / 2}px;
    top:${event.clientY - rect.top - size / 2}px;
  `;
  el.appendChild(r);
  setTimeout(() => r.remove(), 600);
}

// ── Confetti burst for high scores ───────────────────────────────────────
function spawnConfetti() {
  const colors = ['#6366f1', '#10B981', '#f59e0b', '#a5b4fc', '#34d399'];
  for (let i = 0; i < 18; i++) {
    setTimeout(() => {
      const s = document.createElement('div');
      s.className = 'sparkle';
      s.style.cssText = `
        left:${10 + Math.random() * 80}vw;
        top:${10 + Math.random() * 80}vh;
        background:${colors[Math.floor(Math.random() * colors.length)]};
        animation-delay:${Math.random() * 0.3}s;
      `;
      document.body.appendChild(s);
      setTimeout(() => s.remove(), 700);
    }, i * 30);
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────
function escapeHTML(str) {
  if (typeof str !== 'string') return '';
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function safeSet(id, value) {
  const el = document.getElementById(id);
  if (el) el.textContent = value;
}

export {
  showToast, setLoading, renderQuestionList, showAnswerArea,
  renderEvaluationModal, setConnectionStatus, renderAnalytics,
  addRipple, spawnConfetti, escapeHTML,
};
