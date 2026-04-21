# ASTROCRM — Статус аудита
## Апрель 2026

Файл отражает все пункты аудита `astrocrm_audit_1.md` и их статус выполнения.
Последнее обновление: **2026-04-14**.

---

## I. ИСПРАВЛЕННЫЕ ОШИБКИ

### ✅ 1. Профекции vs Фирдарии — разделены
**Коммит:** `78e9b02`  
**Файлы:** `astro_predictive.py`, `astro_api.py`

- `POST /predictive/profections` — только профекции (годовые дома)
- `POST /predictive/firdaria` — **новый** эндпоинт, полная реализация Firdariyyat:
  - Определение секты (дневная/ночная карта по позиции Солнца)
  - Дневная: ☉7 → ♀8 → ☿13 → ☽9 → ♄11 → ♃12 → ♂7
  - Ночная: ☽9 → ♄11 → ☿13 → ♂7 → ♀8 → ☉7 → ♃12
  - Подпериоды (каждый главный период делится на 7 частей)
  - Полное расписание на 120 лет; текущий главный и под-период

---

### ✅ 2. Алгоритм затмений — пороги исправлены
**Коммит:** `a1ceff4` (через сессию)  
**Файл:** `astro_predictive.py`, функция `find_eclipses()`

- Лунное полутеневое: `12.5°` → **`14.0°`** (стандарт NASA)
- Лунное полное: `4.5°` → **`4.6°`** (стандарт NASA)
- Солнечное `"total/annular"` → **`"central"`** с комментарием:
  без расстояния до Луны различить полное vs кольцеобразное невозможно математически

---

### ✅ 3. Arabic Parts — формула Части Брака
**Коммит:** `a1ceff4`  
**Файл:** `astro_engine.py`, функция `arabic_parts()`

Заменена одна универсальная формула на три традиционных варианта (Бонатти/Золлер):
```
marriage        = ASC + DSC − Venus     (универсальный, Zoller)
marriage_male   = day:  ASC + Venus − Saturn
                  night: ASC + Saturn − Venus   (Bonatti, мужская карта)
marriage_female = day:  ASC + Mars − Moon
                  night: ASC + Moon − Mars      (Bonatti, женская карта)
```

---

### ✅ 4. CORS — переменная окружения
**Коммит:** `a1ceff4`  
**Файл:** `astro_api.py`

```python
# Раньше (опасно):
allow_origins=["*"]

# Теперь:
ALLOWED_ORIGINS = os.environ.get("ALLOWED_ORIGINS", 
    "http://localhost:3000,http://localhost:5173").split(",")
```
Для production задать в `.env`: `ALLOWED_ORIGINS=https://your-domain.com`

---

### ✅ 5. pyswisseph — предупреждение при отсутствии
**Коммит:** `a1ceff4`  
**Файл:** `astro_api.py`

- Startup-warning если `astro_se` не установлен
- Поле `ephemeris_accuracy` в ответе `GET /health`:
  - `"high"` — Swiss Ephemeris установлен
  - `"medium"` — VSOP87 fallback (Meeus)

---

### ✅ 6. Конверсные/третичные прогрессии — флаг `advanced`
**Коммит:** `78e9b02`  
**Файл:** `astro_api.py`, `PredictiveRequest`

```json
{ "advanced": false }  →  HTTP 400 с сообщением
{ "advanced": true  }  →  расчёт выполняется
```
Добавлено поле `advanced: bool = False` в `PredictiveRequest`.

---

### ✅ 7. Void of Course Moon
**Коммит:** `78e9b02`  
**Файл:** `astro_engine.py`

Новая функция `void_of_course_moon(jd, look_ahead_days, lat, lon)`:
- Сканирование 10-минутными шагами до ингрессии Луны
- Бинарный поиск точного момента смены знака
- Поиск последнего аспекта Луны к 7 классическим планетам
- Возврат: `{is_void, moon_sign, last_aspect, void_start_jd, void_end_jd, void_end_sign, void_duration_hours}`

---

### ✅ 8. Взаимные управления (Mutual Receptions) — top-level поле
**Коммит:** `78e9b02`  
**Файл:** `astro_engine.py`

`mutual_receptions` теперь выводится на верхнем уровне ответа `/natal`:
```json
{ "mutual_receptions": [["venus", "saturn"], ...] }
```
(ранее было только глубоко в `dispositors.mutual_receptions`)

---

## II. НОВЫЕ ЭНДПОИНТЫ

### ✅ POST /predictive/firdaria
Описание — см. пункт 1 выше.

---

### ✅ GET /daily/moon
**Коммит:** `78e9b02`  
**Файл:** `astro_api.py`

```
GET /daily/moon?date=2026-04-14&time=12:00&utc=3&look_ahead=3
```

Ответ:
```json
{
  "moon_sign": "scorpio",
  "moon_degree": 14.3,
  "phase": "waxing_gibbous",
  "phase_angle": 142.5,
  "void_of_course": { "is_void": false, ... }
}
```

---

### ✅ POST /compensatory/practices
**Коммит:** `78e9b02`  
**Файл:** `astro_compensatory.py`, `astro_api.py`

Четыре слоя:
1. **Одиночные транзитные планеты** → практики по элементу/функции (`light/medium/deep`)
2. **Аспектные пары** → специфические образы и практики для 14 ключевых связок
3. **Фоновые нарративы** — активные транзиты 2025-2026:
   - Плутон в Водолее (2023-2043)
   - Нептун в Овне (2025-2039)
   - Соединение Сатурн-Нептун в Овне (2025-2026)
   - Уран на 29° Тельца (2025-2026)
   - Юпитер в Раке (янв-авг 2026)
4. **Солнечный профиль** — характер, тень, суперсила, компенсаторная заметка

---

### ✅ POST /compensatory/current
**Коммит:** `78e9b02`  
**Файл:** `astro_api.py`

Практики без натальной карты — только по текущим транзитам.

---

## III. ЧТО ОСТАЛОСЬ (не в аудите, но полезно)

| Пункт | Описание | Статус |
|-------|----------|--------|
| `POST /daily/personal` | Персональный день: транзиты + луна + совет | ✅ реализовано |
| `GET /ephemeris/ingress-calendar` | Календарь ингрессов на год | ✅ реализовано |
| `POST /natal/void-of-course` | Текущий/следующий VoC для пользователя | ✅ реализовано |
| `chart_shape` в `/natal` | bundle/bowl/bucket/locomotive/seesaw/splash/splay | ✅ реализовано |
| `dominant_element/modality` | Подсчёт стихий и модальностей | ✅ реализовано |
| `unaspected_planets` | Список планет без аспектов | ✅ реализовано |
| `timezone_name` в PredictiveRequest | Для точного Solar/Lunar Return | ✅ реализовано |

---

## IV. ИСТОРИЯ КОММИТОВ

| Коммит | Дата | Описание |
|--------|------|----------|
| `a1ceff4` | 2026-04 | Arabic Parts, Eclipse thresholds, CORS, pyswisseph warning, PWA |
| `75e09d4` | 2026-04 | SYSTEM_DESCRIPTION.md — полная документация системы |
| `78e9b02` | 2026-04-14 | Firdaria, VoC Moon, mutual_receptions, daily/moon, compensatory engine, advanced flag |
| `fc7117a` | 2026-04 | Phase 3-4: ZR, primary directions, probability tree, HTML report generator |
| `d6a78c5` | 2026-04 | Phase 4: Gene Keys engine + frontend, SVG touch/pinch-zoom |
| `5d6f88e` | 2026-04 | CRM history module: consultation notes timeline (Firestore sub-collection) |
| `c638edc` | 2026-04-15 | Audit Section III: chart_analysis, ingress calendar, VoC windows, daily/personal, timezone_name |
| `d3db50c` | 2026-04-20 | **АУДИТ #2**: human-design route fix, SPA catch-all moved to EOF, compensatory/current calc_chart fix, duplicate daily/personal deregistered |
| `4b5d270` | 2026-04-20 | Frontend: DailyForecastView crash guard, HumanDesignBlock optional chaining fix, VoC lat/lon accuracy |
| `6cd6b9e` | 2026-04-20 | Critical: /compensatory/practices calc_chart was passing JD as year; fix daily/personal transits arg order; fix lon/longitude key in compensatory engine |
| `90f9517` | 2026-04-20 | /daily/personal v2: wrong keys firdaria (active_major vs current_period), profections (annual_house vs profected_house), transits (aspects vs transit_aspects) |
| `7670d81` | 2026-04-20 | Fix all broken build_compensatory_report calls in /predictive/transits + /eclipse-personal + /daily/personal |

---

## VI. КРИТИЧЕСКИЕ БАГИ НАЙДЕНЫ И ИСПРАВЛЕНЫ (Аудит #2, 2026-04-20)

| # | Файл | Баг | Статус |
|---|------|-----|--------|
| 1 | `astro_api.py` | `human_design()` без `@app.post` декоратора → 405 на фронте | ✅ |
| 2 | `astro_api.py` | SPA catch-all `@app.get("/{full_path:path}")` на строке 4104 блокировал все последующие GET-роуты | ✅ |
| 3 | `astro_api.py` | `/compensatory/current` вызывал `calc_chart(jd, 0, 0, ...)` — JD вместо года | ✅ |
| 4 | `astro_api.py` | `/daily/personal` v1 переопределял v2 → лучший хендлер игнорировался | ✅ |
| 5 | `astro_api.py` | `/compensatory/practices` вызывал `calc_chart(natal_jd, req.lat, req.lon, ...)` — JD вместо года | ✅ |
| 6 | `astro_api.py` | `/daily/personal` v2: `transits()` вызывался с `(jd, date, req.lat, req.lon, req.utc)` — lat как target_time | ✅ |
| 7 | `astro_compensatory.py` | `build_compensatory_report()` читал `"longitude"` ключ, но `calc_chart()` возвращает `"lon"` | ✅ |
| 8 | `astro_api.py` | `/daily/personal` v2: `firdaria_result.get("current_period")` — ключ не существует, правильный: `"active_major"` | ✅ |
| 9 | `astro_api.py` | `/daily/personal` v2: `profections_result.get("profected_house")` — правильный: `"annual_house"` | ✅ |
| 10 | `astro_api.py` | `/daily/personal` v2: `result.get("transit_aspects")` — правильный: `"aspects"` | ✅ |
| 11 | `astro_api.py` | `/predictive/transits`, `/eclipse-personal`, `/daily/personal` — `build_compensatory_report` вызывался без обязательных `transit_chart` и `target_date` | ✅ |
| 12 | `frontend/DailyForecastView.tsx` | `forecasts.reduce(..., forecasts[0])` крашилось при пустом массиве | ✅ |
| 13 | `frontend/HumanDesignBlock.tsx` | `result?.incarnation_cross.prop` — TypeError при null incarnation_cross | ✅ |

---

---

## VII. КРИТИЧЕСКИЕ БАГИ — Аудит #3 (2026-04-20)

| # | Файл | Баг | Коммит | Статус |
|---|------|-----|--------|--------|
| 1 | `astro_api.py` | `/full-profile`: `build_compensatory_report(depth="light")` — нет обязательных `transit_chart`, `target_date`; неверный kwarg `depth=` вместо `intensity=` | `50658a2` | ✅ |
| 2 | `astro_api.py` | `/full-profile`: `calc_human_design(yr, mo, dy, h, mi, sc, lat, lon, utc)` — функция принимает строки `(date_str, time_str, lat, lon, utc)`, а не int-компоненты | `50658a2` | ✅ |
| 3 | `astro_api.py` | `/full-profile`: `void_of_course_moon(jd)` без `lat`/`lon` → неточный расчёт по координатам (0,0) | `50658a2` | ✅ |
| 4 | `astro_api.py` | `/report/generate`: `transits().get("transit_aspects")` — правильный ключ `"aspects"` | `50658a2` | ✅ |
| 5 | `astro_api.py` | `/report/generate`: `solar_return(natal_jd, req.lat, req.lon, target)` — 2-й аргумент должен быть `int(year)`, а не `lat` | `d944af9` | ✅ |
| 6 | `astro_api.py` | `/report/generate`: `build_compensatory_report` — те же ошибки: `depth=` вместо `intensity=`, нет `transit_chart`/`target_date` | `d944af9` | ✅ |
| 7 | `astro_api.py` | HTML-report firdaria-секция: читала `"current_period"`/`"current_sub"` с `"planet"`/`"start"`/`"end"` → пустые поля | `d944af9` | ✅ |
| 8 | `astro_api.py` | HTML-report profections-секция: читала `"active_house"`/`"year_lord"` — правильные: `"annual_house"`/`"annual_lord"` | `d944af9` | ✅ |
| 9 | `astro_api.py` | HTML-report transits-таблица: `asp.get("transiting_planet")` → правильно: `"transit_planet"` | `bde0ee7` | ✅ |
| 10 | `astro_probability.py` | `build_probability_tree`: читал `asp.get("transiting_planet")` → пустые имена планет в ветках вероятностей | `bde0ee7` | ✅ |
| 11 | `astrologyService.ts` | `DailyTransitAspect.transiting_planet` → API возвращает `transit_planet` → глифы/имена планет не отображались | `bde0ee7` | ✅ |
| 12 | `astro_api.py` | `_gen_solar_return_interp`: `planets.get("Sun")` → `calc_planets()` возвращает lowercase `"sun"`, `"moon"` | `9018ae7` | ✅ |

---

## V. ИТОГ

Из 10 ключевых пунктов аудита #1 — **10 / 10 выполнено** ✅

Из 7 дополнительных пожеланий — **7 / 7 выполнено** ✅

Из 13 критических багов аудита #2 — **13 / 13 исправлено** ✅

Из 12 критических багов аудита #3 — **12 / 12 исправлено** ✅
