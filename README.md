<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally.

View your app in AI Studio: https://ai.studio/apps/drive/1NnbwgmJAUDuQTPviyEgdrkIMos_99jnH

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Create `server/.env` from `server/.env.example` and set both `OPENAI_API_KEY` and `GEMINI_API_KEY` to use free quota from both providers (`AI_PROVIDER_MODE=balanced` by default)
3. Run the app (frontend + backend):
   `npm run dev:all`
4. Or run frontend only:
   `npm run dev`
