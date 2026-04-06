# ASTROCRM

Full-stack astrology CRM with a React frontend and a FastAPI backend.
Полнофункциональная астрологическая CRM-система с React-фронтендом и FastAPI-бэкендом.

## What is in this repo
## Что есть в репозитории

- `frontend/` - Vite + React application.
- `astro_api.py` - main FastAPI app used by the frontend.
- `astro_engine.py`, `astro_predictive.py`, `astro_synastry.py`, `astro_relocation.py` - core astrology engines.
- `human_design_engine.py`, `jyotish_engine.py` - optional engines (Swiss Ephemeris based).
- `server/aiProxy.ts` - optional Gemini proxy service.
- `scripts/dev.mjs` - local dev runner (starts backend + frontend together).
- `frontend/` - приложение на Vite + React.
- `astro_api.py` - основной FastAPI-сервис, который использует фронтенд.
- `astro_engine.py`, `astro_predictive.py`, `astro_synastry.py`, `astro_relocation.py` - основные астрологические движки.
- `human_design_engine.py`, `jyotish_engine.py` - опциональные движки (на базе Swiss Ephemeris).
- `server/aiProxy.ts` - опциональный Gemini proxy.
- `scripts/dev.mjs` - локальный dev-раннер (запускает backend + frontend вместе).

## Requirements
## Требования

- Node.js 18+
- Python 3.11+ (recommended)
- Node.js 18+
- Python 3.11+ (рекомендуется)

## Quick start
## Быстрый старт

1. Install dependencies:
1. Установите зависимости:

```bash
npm run install:all
python -m pip install -r requirements.txt
```

2. Create env files:
2. Создайте env-файлы:

`frontend/.env.local`

```bash
VITE_API_URL=http://localhost:8000
```

Optional root `.env.local` (only for Gemini proxy):
Опциональный root `.env.local` (только для Gemini proxy):

```bash
GEMINI_API_KEY=your_key
AI_PROXY_PORT=8787
APP_URL=https://your-public-proxy-url
```

3. Start local development:
3. Запустите локальную разработку:

```bash
npm run dev
```

Local URLs:
Локальные адреса:

- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- FastAPI docs: `http://localhost:8000/docs`
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8000`
- Документация FastAPI: `http://localhost:8000/docs`

## Scripts
## Скрипты

- `npm run dev` - starts backend and frontend together.
- `npm run dev:backend` - starts only FastAPI (`uvicorn astro_api:app --reload`).
- `npm run dev:frontend` - starts only Vite frontend.
- `npm run dev:proxy` - starts optional Gemini proxy.
- `npm run type-check` - TypeScript check for frontend.
- `npm run build` - installs frontend deps and builds `frontend/dist`.
- `npm run start:backend` - production-style FastAPI start (no reload).
- `npm run dev` - запускает backend и frontend вместе.
- `npm run dev:backend` - запускает только FastAPI (`uvicorn astro_api:app --reload`).
- `npm run dev:frontend` - запускает только Vite frontend.
- `npm run dev:proxy` - запускает опциональный Gemini proxy.
- `npm run type-check` - проверка TypeScript для frontend.
- `npm run build` - устанавливает frontend-зависимости и собирает `frontend/dist`.
- `npm run start:backend` - запуск FastAPI в production-режиме (без reload).

## API summary
## Кратко по API

- Core: `/natal`, `/predictive/*`, `/synastry/*`, `/interaction/*`, `/relocation/*`, `/timezone`.
- Human Design: `/human-design`, `/human-design/transits`, `/human-design/synastry`, reference endpoints under `/human-design/reference/*`.
- Jyotish: `/jyotish`.
- Service: `/health`, `/ephemeris/status`, `/ephemeris/download`.
- Базовые: `/natal`, `/predictive/*`, `/synastry/*`, `/interaction/*`, `/relocation/*`, `/timezone`.
- Human Design: `/human-design`, `/human-design/transits`, `/human-design/synastry`, справочные эндпоинты `/human-design/reference/*`.
- Jyotish: `/jyotish`.
- Сервисные: `/health`, `/ephemeris/status`, `/ephemeris/download`.

## Optional dependencies
## Опциональные зависимости

`pyswisseph` is required for full Human Design / Jyotish capabilities.  
If optional engines are not available, related endpoints return `503`, and `/health` reports availability.
`pyswisseph` нужен для полной работы Human Design / Jyotish.  
Если опциональные движки недоступны, соответствующие эндпоинты возвращают `503`, а `/health` показывает их статус.

## Smoke checks
## Smoke-проверки

Repository includes `ci_smoke.sh` for endpoint smoke checks:
В репозитории есть `ci_smoke.sh` для smoke-проверок эндпоинтов:

```bash
bash ci_smoke.sh
```

To run against a custom deployment:
Для запуска против другого деплоя:

```bash
API=https://your-api-url bash ci_smoke.sh
```

## Troubleshooting
## Устранение проблем

- Backend does not start: verify Python deps from `requirements.txt` are installed in the same interpreter used by `uvicorn`.
- Frontend cannot reach API: verify `frontend/.env.local` and `VITE_API_URL`.
- Human Design / Jyotish returns `503`: verify `pyswisseph` installation and ephemeris availability.
- Backend не стартует: проверьте, что Python-зависимости из `requirements.txt` установлены в тот же интерпретатор, который использует `uvicorn`.
- Frontend не может достучаться до API: проверьте `frontend/.env.local` и `VITE_API_URL`.
- Human Design / Jyotish возвращает `503`: проверьте установку `pyswisseph` и доступность ephemeris-файлов.
