# Luminai-AI Security & Backend Setup

This update secures your Gemini API key by moving it to a backend server proxy.

## What Changed

### 🔒 Security Improvements
- **API Key Protection**: Gemini API key now stored on backend server (never exposed to clients)
- **Rate Limiting**: Prevents API abuse with configurable request limits
- **CORS Protection**: Controls which origins can access your API

### 🏗️ New Backend Server
Located in `/server` directory:
- **Express server** with security middleware (Helmet, CORS)
- **Proxy endpoints** for all Gemini API calls
- **Environment-based configuration**

### 📝 Updated Components
- `AudioProcessor.tsx` - Uses backend proxy for transcription
- `MeetingDetail.tsx` - Uses backend proxy for summaries and AI chat
- Added `utils/apiService.ts` for consistent API access

---

## Setup Instructions

### 1. Install Dependencies

```bash
# Install frontend dependencies
npm install

# Install backend dependencies
npm run server:install
```

### 2. Configure Environment Variables

#### Backend Server (IMPORTANT!)

Edit `server/.env` and add your Gemini API key:

```env
GEMINI_API_KEY=your_actual_gemini_api_key_here
```

> **Get your API key**: https://aistudio.google.com/app/apikey

The frontend `.env.local` is already configured for local development.

### 3. Run the Application

#### Option A: Run Both Together (Recommended)
```bash
npm run dev:all
```

This starts:
- Frontend on http://localhost:5173
- Backend on http://localhost:3001

#### Option B: Run Separately
Terminal 1 (Frontend):
```bash
npm run dev
```

Terminal 2 (Backend):
```bash
npm run dev:server
```

---

## How It Works

### Before (Insecure)
```
Browser → Gemini API (with exposed key)
```

### After (Secure)
```
Browser → Backend Server → Gemini API (key secure on server)
```

### API Flow Example:

1. **User uploads audio file**
2. **Frontend** sends base64 data to `/api/gemini/transcribe-audio`
3. **Backend** validates request, calls Gemini API with secure key
4. **Backend** returns transcription to frontend
5. **Frontend** displays results

---

## API Endpoints

All endpoints: `http://localhost:3001/api/gemini/...`

- `POST /transcribe-audio` - Transcribe audio files
- `POST /generate-summary` - Generate meeting summaries
- `POST /chat` - Chat with AI about meetings
- `GET /health` - Health check

---

## Troubleshooting

### Backend won't start
- **Check**: Did you add `GEMINI_API_KEY` to `server/.env`?
- **Check**: Did you run `npm run server:install`?

### Frontend can't connect to backend
- **Check**: Is backend running on port 3001?
- **Check**: CORS origins in `server/.env` match your frontend URL

### "Cannot find module" errors
- **Fix**: Run `npm install` (frontend) and `npm run server:install` (backend)

---

## Next Steps

✅ **Current**: API key is secure on backend
📋 **Recommended Next**:
1. Set up real authentication (Firebase/Supabase)
2. Add database for persistent storage
3. Deploy to production (separate frontend/backend)

See `implementation_plan.md` for full roadmap.

---

## Production Deployment

When deploying:

1. **Backend**: Deploy to a Node.js host (Render, Railway, Heroku)
2. **Frontend**: Update `.env.production` with backend URL:
   ```env
   VITE_API_URL=https://your-backend-domain.com
   ```
3. **Environment**: Set `GEMINI_API_KEY` in backend hosting environment variables

---

Need help? Check the full assessment in `implementation_plan.md`
