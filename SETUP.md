# Luminai-AI Backend Setup

This app uses a backend proxy so your OpenAI key is never exposed in the browser.

## What Changed

- AI provider is OpenAI (ChatGPT API) instead of Gemini.
- Frontend AI features call backend endpoints under `/api/ai/*`.
- Backend handles transcription, summaries, chat, PDF analysis, and note refinement.

## Install

```bash
npm install
npm run server:install
```

## Configure Environment

1. Copy `server/.env.example` to `server/.env`.
2. Set your key:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

Optional model overrides:

```env
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_TRANSCRIPTION_MODEL=whisper-1
```

Optional Gemini fallback (recommended):

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
```

## Run

```bash
npm run dev:all
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

## API Endpoints

Base URL: `http://localhost:3001/api/ai`

- `POST /transcribe-audio`
- `POST /generate-summary`
- `POST /chat`
- `POST /process-pdf`
- `POST /refine-note`

Backward compatibility:
- `/api/gemini/*` remains available as an alias.

## Troubleshooting

- `OpenAI API not configured`: set `OPENAI_API_KEY` in `server/.env`.
- `401` from AI endpoints: key is invalid or missing permissions.
- `429` from AI endpoints: rate limit or quota reached.
- Frontend cannot reach backend: verify `VITE_API_URL` and backend is running on port `3001`.
