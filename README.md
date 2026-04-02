# HOLO Astrology CRM

Full-stack astrology application with real astronomical calculations + AI interpretations.

## Architecture

**frontend/** — React Vite + Tailwind  
**server/aiProxy.ts** — Express proxy for Gemini interpretations  
astro_api.py — Python FastAPI for astronomical calculations (optional, can run separately)

## Development Setup

**Prerequisites:** Node.js 18+

1. Install dependencies:
   ```bash
   npm run install:all
   ```

2. Configure `.env.local`:
   ```
   GEMINI_API_KEY=your_gemini_key
   AI_PROXY_PORT=8787
   ```

3. Run development:
   ```bash
   npm run dev
   ```
   - Frontend: http://localhost:3000
   - AI Proxy: http://localhost:8787

## Production

### Build
```bash
npm run build
```
Output: `frontend/dist/` (static files)

### Deploy

**Option 1: Full Stack (Frontend + API Proxy)**
- Start AI Proxy: `npm run start:api`
- Serve frontend from `frontend/dist/`

**Option 2: Serverless Frontend (recommended)**
- Deploy `frontend/dist/` to Vercel/Netlify
- Deploy AI Proxy to Cloud Run/Lambda
- Use `VITE_AI_API_URL=https://your-api-url` in frontend build

## Environment Variables

| Variable | Purpose | Default |
|----------|---------|---------|
| `GEMINI_API_KEY` | Gemini API key | required |
| `AI_PROXY_PORT` | Server proxy port | 8787 |
| `VITE_AI_API_URL` | Frontend API URL | /api (dev proxy) |

## Features

- **4 Chart Themes** — Cosmic, Ethereal, Vintage, Cyber
- **Fast Calcs** — Transits, progressions, synastry, relocation  
- **AI Interpretations** — Gemini-powered readings
- **Multi-language** — Russian/English support
- **PDF Export** — Download charts and readings
- **Real Astrology** — Not horoscope, real calculations

## Troubleshooting

- **"An API Key must be set"** → Set `GEMINI_API_KEY` in `.env.local`
- **Frontend 500 errors** → Check AI Proxy is running on :8787
- **Build fails** → Run `npm run install:all` first

