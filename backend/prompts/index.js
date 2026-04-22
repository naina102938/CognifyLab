// prompts/index.js — Centralised prompt templates for Ollama

/**
 * Builds the question-generation prompt.
 * Strictly requests JSON-only output so the parser never breaks.
 */
function buildQuestionPrompt(notes) {
  return `You are an expert study-question designer. Given the study notes below, generate exactly 5 high-quality questions to help a student master the material.

REQUIREMENTS:
- Exactly 2 Recall questions  (direct fact retrieval)
- Exactly 2 Conceptual questions (understanding, explanation, comparison)
- Exactly 1 Application question  (applying knowledge to a scenario)

OUTPUT FORMAT — respond with ONLY a valid JSON array, no markdown, no prose, no code fences:
[
  {"type": "Recall",      "question": "..."},
  {"type": "Recall",      "question": "..."},
  {"type": "Conceptual",  "question": "..."},
  {"type": "Conceptual",  "question": "..."},
  {"type": "Application", "question": "..."}
]

STUDY NOTES:
${notes.trim()}

Respond with ONLY the JSON array.`;
}

/**
 * Builds the answer-evaluation prompt.
 * Returns a structured JSON object with score, analysis, gaps, and suggestions.
 */
function buildEvaluationPrompt(question, answer, confidence) {
  const confLabel = { 1: 'Not confident', 2: 'Somewhat confident', 3: 'Very confident' }[confidence] || 'Unknown';

  return `You are a rigorous but encouraging academic tutor. Evaluate the student's answer to the question below.

QUESTION:
${question}

STUDENT'S ANSWER:
${answer}

STUDENT'S SELF-REPORTED CONFIDENCE: ${confLabel}

Evaluate thoroughly and respond with ONLY a valid JSON object (no markdown, no code fences, no extra text):
{
  "score": <integer 0-10>,
  "grade": "<Excellent|Good|Partial|Insufficient>",
  "correctness": "<one sentence summary of what is correct>",
  "missing_concepts": ["<concept 1>", "<concept 2>"],
  "misconceptions": ["<misconception 1>"],
  "improvement": "<2-3 sentences of actionable advice>",
  "confidence_analysis": "<one sentence comparing stated confidence vs actual performance>",
  "overconfident": <true|false>
}

Respond with ONLY the JSON object.`;
}

module.exports = { buildQuestionPrompt, buildEvaluationPrompt };
