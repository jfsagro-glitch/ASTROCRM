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
| `POST /daily/personal` | Персональный день: транзиты + луна + совет | 🔲 не реализовано |
| `GET /ephemeris/ingress-calendar` | Календарь ингрессов на год | 🔲 не реализовано |
| `POST /natal/void-of-course` | Текущий/следующий VoC для пользователя | 🔲 не реализовано |
| `chart_shape` в `/natal` | bundle/bowl/bucket/locomotive/seesaw/splash/splay | 🔲 не реализовано |
| `dominant_element/modality` | Подсчёт стихий и модальностей | 🔲 не реализовано |
| `unaspected_planets` | Список планет без аспектов | 🔲 не реализовано |
| `timezone_name` в PredictiveRequest | Для точного Solar/Lunar Return | 🔲 не реализовано |

---

## IV. ИСТОРИЯ КОММИТОВ

| Коммит | Дата | Описание |
|--------|------|----------|
| `a1ceff4` | 2026-04 | Arabic Parts, Eclipse thresholds, CORS, pyswisseph warning, PWA |
| `75e09d4` | 2026-04 | SYSTEM_DESCRIPTION.md — полная документация системы |
| `78e9b02` | 2026-04-14 | Firdaria, VoC Moon, mutual_receptions, daily/moon, compensatory engine, advanced flag |

---

## V. ИТОГ

Из 10 ключевых пунктов аудита — **10 / 10 выполнено** ✅

Из 7 дополнительных пожеланий (раздел III аудита) — **0 / 7** (низкий приоритет, по необходимости).
