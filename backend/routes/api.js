// backend/routes/api.js — Express route handlers

const express = require('express');
const router = express.Router();
const { queryOllama, extractJSON, listModels } = require('../ollama');
const { buildQuestionPrompt, buildEvaluationPrompt } = require('../prompts');

// ── Health / model status ──────────────────────────────────────────────────
router.get('/health', async (req, res) => {
  try {
    const models = await listModels();
    res.json({ status: 'ok', ollama: true, models });
  } catch (err) {
    res.status(503).json({ status: 'degraded', ollama: false, error: err.message });
  }
});

// ── POST /api/generate-questions ──────────────────────────────────────────
router.post('/generate-questions', async (req, res) => {
  const { notes, model } = req.body;

  if (!notes || typeof notes !== 'string' || notes.trim().length < 20) {
    return res.status(400).json({
      error: 'Notes must be at least 20 characters.',
      code: 'NOTES_TOO_SHORT',
    });
  }

  try {
    const prompt = buildQuestionPrompt(notes);
    const raw = await queryOllama(prompt, model || null);
    const questions = extractJSON(raw, 'array');

    if (!Array.isArray(questions)) {
      throw new Error('Model returned non-array JSON');
    }

    // Validate and normalise each question object
    const validated = questions
      .filter(q => q && typeof q.question === 'string' && q.question.trim())
      .map((q, idx) => ({
        id: idx,
        type: q.type || 'Recall',
        question: q.question.trim(),
        answered: false,
      }));

    if (validated.length === 0) {
      throw new Error('No valid questions parsed from model response');
    }

    res.json({ questions: validated, count: validated.length });
  } catch (err) {
    console.error('[/generate-questions]', err.message);
    res.status(500).json({
      error: 'Failed to generate questions.',
      detail: err.message,
      code: 'GENERATION_FAILED',
    });
  }
});

// ── POST /api/evaluate ────────────────────────────────────────────────────
router.post('/evaluate', async (req, res) => {
  const { question, answer, confidence, model } = req.body;

  if (!question || !answer) {
    return res.status(400).json({
      error: 'Both question and answer are required.',
      code: 'MISSING_FIELDS',
    });
  }

  if (answer.trim().length < 5) {
    return res.status(400).json({
      error: 'Answer is too short to evaluate.',
      code: 'ANSWER_TOO_SHORT',
    });
  }

  try {
    const prompt = buildEvaluationPrompt(question, answer, confidence || 2);
    const raw = await queryOllama(prompt, model || null);
    const evaluation = extractJSON(raw, 'object');

    // Normalise score to 0-100 scale for the UI
    const rawScore = Number(evaluation.score) || 0;
    const normalised = rawScore <= 10 ? rawScore * 10 : rawScore;

    res.json({
      score: normalised,
      grade: evaluation.grade || 'Unknown',
      correctness: evaluation.correctness || '',
      missing_concepts: Array.isArray(evaluation.missing_concepts) ? evaluation.missing_concepts : [],
      misconceptions: Array.isArray(evaluation.misconceptions) ? evaluation.misconceptions : [],
      improvement: evaluation.improvement || '',
      confidence_analysis: evaluation.confidence_analysis || '',
      overconfident: Boolean(evaluation.overconfident),
    });
  } catch (err) {
    console.error('[/evaluate]', err.message);
    res.status(500).json({
      error: 'Failed to evaluate answer.',
      detail: err.message,
      code: 'EVALUATION_FAILED',
    });
  }
});

module.exports = router;
