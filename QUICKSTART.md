# Quick Start

## 1. Install dependencies

```bash
npm install
npm run server:install
```

## 2. Configure backend API key

Copy `server/.env.example` to `server/.env` and set:

```env
OPENAI_API_KEY=your_openai_api_key_here
```

Optional model overrides:

```env
OPENAI_CHAT_MODEL=gpt-4o-mini
OPENAI_TRANSCRIPTION_MODEL=whisper-1
```

Optional Gemini fallback:

```env
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
```

## 3. Run the app

```bash
npm run dev:all
```

- Frontend: `http://localhost:5173`
- Backend: `http://localhost:3001`

## 4. Verify AI features

1. Upload audio or PDF in the dashboard.
2. Open a meeting and test summary/chat.
3. In Notes, try `Magic Write`.
