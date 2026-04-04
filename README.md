# HOLO Astrology CRM

Full-stack astrology application with a React frontend and a Python FastAPI backend for real chart calculations.

## Architecture

- `frontend/` - Vite + React client
- `astro_api.py` - primary FastAPI backend used by the frontend
- `server/aiProxy.ts` - optional Gemini proxy for AI-only features and experiments
- `astro_engine.py`, `astro_predictive.py`, `astro_synastry.py`, `astro_relocation.py` - calculation engines
- `human_design_engine.py`, `jyotish_engine.py` - optional specialty engines that depend on Swiss Ephemeris bindings

## Prerequisites

- Node.js 18+
- Python 3.11+ recommended

## Install

```bash
npm run install:all
python -m pip install -r requirements.txt
```

If you want Human Design or Jyotish endpoints, make sure `pyswisseph` is installed successfully in your Python environment.

## Environment

Frontend env lives in `frontend/.env.local`:

```bash
VITE_API_URL=http://localhost:8000
```

Optional Gemini proxy env can live in `.env.local` at the repo root:

```bash
GEMINI_API_KEY=your_gemini_key
AI_PROXY_PORT=8787
```

## Development

Primary local workflow:

```bash
npm run dev
```

This starts:

- FastAPI backend on `http://localhost:8000`
- Frontend on `http://localhost:3000`

Useful individual commands:

```bash
npm run dev:backend
npm run dev:frontend
npm run dev:proxy
```

`dev:proxy` is optional. The current frontend talks to `VITE_API_URL`, not to the Gemini proxy.

## Build

```bash
npm run type-check
npm run build
```

Frontend production output is written to `frontend/dist/`.

## API Notes

- `/natal`, `/predictive/*`, `/synastry/*`, `/relocation/*`, `/timezone` work without Human Design bindings.
- `/human-design*` and `/jyotish` return `503` when their optional engine dependencies are unavailable.
- `/health` reports which optional engines are currently available.

## Troubleshooting

- If FastAPI fails on startup, install Python requirements first.
- If Human Design or Jyotish returns `503`, check that `pyswisseph` is installed in the same Python environment used to run the API.
- If the frontend cannot load data, verify `VITE_API_URL` points at the running FastAPI server.
