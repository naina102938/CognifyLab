# CognifyLab — AI-Powered Learning Platform

A full-stack, locally-running cognitive learning app. Paste your study notes,
get AI-generated questions, answer them, self-report confidence, receive
detailed AI evaluation, and track metacognitive accuracy over time.

---

## Architecture

```
Browser (HTML/CSS/JS)
       |
       | fetch() calls
       v
  Node.js + Express  (localhost:3000)
       |
       | HTTP POST /api/generate
       v
    Ollama           (localhost:11434)
       |
    llama3 / mistral / phi
```

---

## Prerequisites

1. **Node.js** 18+ — https://nodejs.org
2. **Ollama** — https://ollama.ai
3. At least one model pulled: `ollama pull llama3`

---

## Quick Start

### 1. Start Ollama

```bash
ollama serve
ollama pull llama3   # or: ollama pull mistral
```

### 2. Start the backend

```bash
cd backend
npm install
npm start
# → Server running at http://localhost:3000
```

### 3. Open the frontend

Open `frontend/index.html` directly in your browser, **or** open
`http://localhost:3000` (the Express server also serves the frontend).

---

## API Endpoints

| Method | Path                    | Body                                | Returns                        |
|--------|-------------------------|-------------------------------------|--------------------------------|
| GET    | `/api/health`           | —                                   | `{ status, ollama, models[] }` |
| POST   | `/api/generate-questions` | `{ notes: string }`               | `{ questions[], count }`       |
| POST   | `/api/evaluate`         | `{ question, answer, confidence }` | Evaluation object              |

---

## Project Structure

```
cognifylab/
├── backend/
│   ├── server.js          ← Express entry point
│   ├── ollama.js          ← Ollama HTTP client + JSON extractor
│   ├── routes/
│   │   └── api.js         ← Route handlers
│   └── prompts/
│       └── index.js       ← Prompt engineering templates
├── frontend/
│   ├── index.html         ← Semantic HTML, no inline handlers
│   ├── css/
│   │   └── styles.css     ← Full design system
│   └── js/
│       ├── app.js         ← Main controller, event binding
│       ├── api.js         ← fetch() wrappers
│       ├── state.js       ← localStorage persistence + analytics
│       └── ui.js          ← DOM rendering helpers
└── README.md
```

---

## Customisation

- **Model**: Set `OLLAMA_URL` environment variable to point at a remote Ollama
- **Port**: `PORT=8080 npm start`
- **Model priority**: Edit `MODEL_PRIORITY` array in `backend/ollama.js`
- **Prompt style**: Modify templates in `backend/prompts/index.js`

---

## Privacy

All processing happens locally. No data leaves your machine.
