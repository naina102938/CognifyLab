// frontend/js/api.js — Backend API client

const API_BASE = 'http://localhost:3000/api';

/**
 * Checks whether the backend and Ollama are reachable.
 * @returns {Promise<{ok: boolean, models: string[]}>}
 */
async function checkHealth() {
  try {
    const res = await fetch(`${API_BASE}/health`, { signal: AbortSignal.timeout(4000) });
    if (!res.ok) return { ok: false, models: [] };
    const data = await res.json();
    return { ok: data.ollama, models: data.models || [] };
  } catch (_) {
    return { ok: false, models: [] };
  }
}

/**
 * Sends notes to the backend to generate questions via Ollama.
 * @param {string} notes
 * @returns {Promise<{questions: Array}>}
 */
async function generateQuestions(notes) {
  const res = await fetch(`${API_BASE}/generate-questions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ notes }),
    signal: AbortSignal.timeout(60000), // Ollama can be slow
  });

  const data = await res.json();

  if (!res.ok) {
    throw new APIError(data.error || 'Failed to generate questions', data.code, res.status);
  }

  return data;
}

/**
 * Sends a question + answer to the backend for AI evaluation.
 * @param {string} question
 * @param {string} answer
 * @param {number} confidence  — 1|2|3
 * @returns {Promise<Object>}  — evaluation object
 */
async function evaluateAnswer(question, answer, confidence) {
  const res = await fetch(`${API_BASE}/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, answer, confidence }),
    signal: AbortSignal.timeout(60000),
  });

  const data = await res.json();

  if (!res.ok) {
    throw new APIError(data.error || 'Failed to evaluate answer', data.code, res.status);
  }

  return data;
}

/** Custom error class for API failures */
class APIError extends Error {
  constructor(message, code, status) {
    super(message);
    this.name = 'APIError';
    this.code = code;
    this.status = status;
  }
}

export { checkHealth, generateQuestions, evaluateAnswer, APIError };
