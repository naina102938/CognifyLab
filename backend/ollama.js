// backend/ollama.js — Ollama HTTP client

const OLLAMA_BASE = process.env.OLLAMA_URL || 'http://localhost:11434';
const MODEL_PRIORITY = ['llama3', 'mistral', 'phi', 'llama2'];

/**
 * Sends a prompt to Ollama and returns the raw text response.
 * Tries models in priority order until one succeeds.
 * @param {string} prompt
 * @param {string|null} preferredModel  — override model selection
 * @returns {Promise<string>}
 */
async function queryOllama(prompt, preferredModel = null) {
  const modelsToTry = preferredModel
    ? [preferredModel, ...MODEL_PRIORITY.filter(m => m !== preferredModel)]
    : MODEL_PRIORITY;

  let lastError = null;

  for (const model of modelsToTry) {
    try {
      const response = await fetch(`${OLLAMA_BASE}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model,
          prompt,
          stream: false,
          options: {
            temperature: 0.3,   // Lower temp = more deterministic JSON
            top_p: 0.9,
            num_predict: 1024,
          },
        }),
      });

      if (!response.ok) {
        const errText = await response.text();
        throw new Error(`Ollama HTTP ${response.status}: ${errText}`);
      }

      const data = await response.json();
      const text = data.response || '';

      if (!text.trim()) throw new Error('Empty response from model');

      console.log(`[Ollama] Model=${model} | Tokens=${data.eval_count || '?'} | Done=${data.done}`);
      return text;
    } catch (err) {
      console.warn(`[Ollama] Model "${model}" failed: ${err.message}`);
      lastError = err;
    }
  }

  throw new Error(`All Ollama models failed. Last error: ${lastError?.message}`);
}

/**
 * Lists available models from Ollama.
 * @returns {Promise<string[]>}
 */
async function listModels() {
  const response = await fetch(`${OLLAMA_BASE}/api/tags`);
  if (!response.ok) throw new Error('Cannot reach Ollama');
  const data = await response.json();
  return (data.models || []).map(m => m.name);
}

/**
 * Extracts a JSON value from a string that might contain surrounding text.
 * Handles cases where the model adds prose before/after the JSON.
 * @param {string} raw
 * @param {'array'|'object'} expectedType
 * @returns {Array|Object}
 */
function extractJSON(raw, expectedType = 'object') {
  // Strip markdown code fences if present
  let cleaned = raw.replace(/```json\s*/gi, '').replace(/```\s*/gi, '').trim();

  // Try direct parse first
  try {
    const parsed = JSON.parse(cleaned);
    return parsed;
  } catch (_) {}

  // Try finding the first { ... } or [ ... ] block
  const startChar = expectedType === 'array' ? '[' : '{';
  const endChar = expectedType === 'array' ? ']' : '}';
  const start = cleaned.indexOf(startChar);
  const end = cleaned.lastIndexOf(endChar);

  if (start !== -1 && end !== -1 && end > start) {
    try {
      return JSON.parse(cleaned.slice(start, end + 1));
    } catch (_) {}
  }

  throw new Error(`Could not extract valid JSON (${expectedType}) from model response`);
}

module.exports = { queryOllama, extractJSON, listModels };
