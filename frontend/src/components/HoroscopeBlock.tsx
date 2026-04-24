// ─── HoroscopeBlock ─────────────────────────────────────────────────────────
// Объединённый блок «Гороскоп»: Обзор + Транзиты/прогрессии + Компенсаторика + Подписка

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import {
  Sun, Star, Clock, Heart, Zap, Flame, Droplets, Wind, Mountain,
  RefreshCw, Bell, BellOff, Mail, Copy, Check, X, ChevronDown, ChevronUp,
  Leaf, Waves, Footprints, Music, Dumbbell, Trees, Snowflake,
  BookOpen, Coffee, Scissors, Hammer, Eye,
} from 'lucide-react';
import AstroSummaryBlock from './AstroSummaryBlock';
import PredictiveExpanded from './PredictiveExpanded';
import SolarReturnBlock from './SolarReturnBlock';
import type { BirthInput } from '../types/astro';
import { getAstroSummary } from '../services/astrologyService';
import DateSegmentInput from './DateSegmentInput';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ThemeLike {
  card: string; header: string; accent: string; text: string;
  btn: string; tabActive: string; tabInactive: string; symbol: string;
  wheelTheme: 'dark' | 'light';
}

interface HoroProps {
  theme: ThemeLike;
  birth: BirthInput;
}

type HoroTab = 'overview' | 'transits' | 'solar-return' | 'compensatorics' | 'subscription';

type CompCategory = 'fire' | 'water' | 'earth' | 'air' | 'physical' | 'ritual' | 'social' | 'mental' | 'creative';

interface CompAction {
  id: string;
  action: string;
  detail: string;
  category: CompCategory;
  icon: string;
  intensity: 1 | 2 | 3; // 1=мягко, 2=средне, 3=интенсивно
  tags: string[]; // планеты/аспекты, которым соответствует
}

interface EmailSub {
  email: string;
  frequency: 'daily' | 'weekly' | 'monthly';
  hour: string;
  active: boolean;
  includeTransits: boolean;
  includeCompensatorics: boolean;
}

// ── Compensatorics Database ───────────────────────────────────────────────────
// Каждое действие основано на принципе резонанса: вы используете стихию планеты,
// чтобы либо разрядить напряжение, либо активировать её позитивный потенциал.

const ALL_COMP_ACTIONS: CompAction[] = [
  // ── МАРС ──────────────────────────────────────────────────────────────────
  {
    id: 'mars-fire',
    action: 'Разжечь костёр или камин',
    detail: 'Марс — бог огня. Буквальный огонь снимает марсианское напряжение лучше любых слов. Разведите костёр, зажгите свечи по кругу или растопите камин.',
    category: 'fire', icon: '🔥', intensity: 2, tags: ['Марс', 'mars'],
  },
  {
    id: 'mars-knife',
    action: 'Наточить ножи или металлические инструменты',
    detail: 'Старинная практика: металл нейтрализует металл. Ритмичное точение лезвий переводит марсианскую агрессию в контролируемое действие с видимым результатом.',
    category: 'ritual', icon: '⚔️', intensity: 1, tags: ['Марс', 'mars', 'Марс_Сатурн'],
  },
  {
    id: 'mars-boxing',
    action: 'Бокс, борьба или кроссфит до пота',
    detail: 'Тело умнее ума — оно знает, как разрядить Марса. Интенсивная схватка тела с собственными пределами вымещает агрессию в безопасное русло.',
    category: 'physical', icon: '🥊', intensity: 3, tags: ['Марс', 'mars', 'Марс_Плутон', 'Марс_Сатурн'],
  },
  {
    id: 'mars-sauna',
    action: 'Баня с веником → холодное погружение',
    detail: 'Горячее разряжает Марс, холодное — закаляет Сатурн. Контраст температур обнуляет накопленное напряжение и восстанавливает баланс между действием и покоем.',
    category: 'water', icon: '🛁', intensity: 3, tags: ['Марс', 'mars', 'Марс_Сатурн', 'Сатурн'],
  },
  {
    id: 'mars-woodchopping',
    action: 'Рубка дров или физический труд',
    detail: 'Ритмичный физический труд с конкретным результатом — идеальный выход для Марса, заблокированного Сатурном. После часа такой работы тело успокаивается.',
    category: 'physical', icon: '🪓', intensity: 3, tags: ['Марс', 'mars', 'Марс_Сатурн'],
  },
  {
    id: 'mars-spicy',
    action: 'Острая / пряная еда с огнём',
    detail: 'Марс правит острым, перцем, пряностями. Активация вкусовых рецепторов направляет марсианский огонь внутрь тела — и он находит выход через пищеварение.',
    category: 'ritual', icon: '🌶️', intensity: 1, tags: ['Марс', 'mars'],
  },

  // ── САТУРН ─────────────────────────────────────────────────────────────────
  {
    id: 'saturn-mountain',
    action: 'Подъём в горы или высокую точку',
    detail: 'Сатурн — хозяин гор и вершин. Физический подъём буквально совпадает с его архетипом: усилие, высота, достижение вершины. После — покой и перспектива.',
    category: 'earth', icon: '⛰️', intensity: 2, tags: ['Сатурн', 'saturn', 'Марс_Сатурн'],
  },
  {
    id: 'saturn-craft',
    action: 'Работа руками: дерево, камень, металл',
    detail: 'Ремесло — квинтэссенция сатурнианской энергии. Создать что-то прочное и конкретное своими руками: полочка, скворечник, украшение из металла.',
    category: 'earth', icon: '🔨', intensity: 2, tags: ['Сатурн', 'saturn', 'Венера_Сатурн'],
  },
  {
    id: 'saturn-clear',
    action: 'Выбросить старые вещи / разобрать накопленное',
    detail: 'Сатурн освобождает от груза прошлого. Физическое избавление от лишнего — прямой способ активировать его трансформирующий потенциал и освободить пространство для нового.',
    category: 'ritual', icon: '🗑️', intensity: 1, tags: ['Сатурн', 'saturn', 'Плутон', 'pluto'],
  },
  {
    id: 'saturn-walk',
    action: 'Длинная прогулка без телефона (2+ часа)',
    detail: 'Медленное методичное движение по земле — антидот сатурнианскому тяготению. Шаги заземляют, тишина структурирует мысли, природа даёт масштаб.',
    category: 'earth', icon: '🚶', intensity: 1, tags: ['Сатурн', 'saturn', 'Луна_Сатурн'],
  },
  {
    id: 'saturn-structure',
    action: 'Расписать планы по конкретным шагам',
    detail: 'Когда Сатурн давит — дайте ему форму. Возьмите лист бумаги и распишите большую задачу на 10–15 конкретных шагов. Туман страха превращается в дорожную карту.',
    category: 'mental', icon: '📋', intensity: 1, tags: ['Сатурн', 'saturn', 'Юпитер_Сатурн'],
  },

  // ── ЛУНА ──────────────────────────────────────────────────────────────────
  {
    id: 'moon-swim',
    action: 'Купаться в природной воде',
    detail: 'Луна правит водой. Река, море, озеро — любая природная вода смывает эмоциональный осадок и синхронизирует с лунным ритмом. Хотя бы 20 минут.',
    category: 'water', icon: '🌊', intensity: 2, tags: ['Луна', 'moon', 'Нептун', 'neptune'],
  },
  {
    id: 'moon-saltbath',
    action: 'Солевая ванна с маслами при свечах',
    detail: 'Соль — очиститель эмоций, вода — стихия Луны, свечи — посредник между мирами. 30 минут в такой ванне снимают напряжение лучше часа разговоров.',
    category: 'water', icon: '🛁', intensity: 1, tags: ['Луна', 'moon', 'Луна_Сатурн', 'Венера_Нептун'],
  },
  {
    id: 'moon-cook',
    action: 'Готовить еду для близких с удовольствием',
    detail: 'Луна — архетип матери и кормилицы. Осознанное приготовление пищи для любимых людей переводит лунное напряжение в заботу и получает обратно — тепло и благодарность.',
    category: 'social', icon: '🍲', intensity: 1, tags: ['Луна', 'moon', 'Луна_Сатурн'],
  },
  {
    id: 'moon-journal',
    action: 'Лунный дневник: записать ощущения и сны',
    detail: 'Луна говорит через образы и ощущения. Записывайте утром сны, вечером — эмоциональный осадок дня. Это создаёт диалог с бессознательным и снижает тревожность.',
    category: 'mental', icon: '📓', intensity: 1, tags: ['Луна', 'moon', 'Меркурий_Нептун'],
  },
  {
    id: 'moon-moonwalk',
    action: 'Прогулка при луне поздно вечером',
    detail: 'Буквально — выйти ночью под открытое небо. Лунный свет воздействует на шишковидную железу, синхронизирует гормональные ритмы и успокаивает эмоциональный шторм.',
    category: 'ritual', icon: '🌙', intensity: 1, tags: ['Луна', 'moon'],
  },

  // ── МЕРКУРИЙ ──────────────────────────────────────────────────────────────
  {
    id: 'mercury-walk',
    action: 'Долгая прогулка без цели и маршрута',
    detail: 'Меркурий — планета движения. Когда он стрессует, блокируется информационный поток. Бесцельная прогулка перезагружает ум и часто приносит инсайты.',
    category: 'air', icon: '🚶‍♂️', intensity: 1, tags: ['Меркурий', 'mercury', 'Меркурий_Нептун'],
  },
  {
    id: 'mercury-handwrite',
    action: 'Писать от руки в дневнике (не на компьютере)',
    detail: 'Рукопись замедляет поток мыслей до скорости понимания. Когда Меркурий в тумане — ручкой на бумаге — и мысли обретут форму.',
    category: 'mental', icon: '✍️', intensity: 1, tags: ['Меркурий', 'mercury', 'Меркурий_Нептун', 'Меркурий_Плутон'],
  },
  {
    id: 'mercury-breathe',
    action: 'Дыхательные практики (10–20 минут)',
    detail: 'Меркурий = воздух = дыхание. Пранаяма, боксёрское дыхание, метод Вима Хофа — любая осознанная работа с дыханием возвращает Меркурия в ясность.',
    category: 'air', icon: '💨', intensity: 1, tags: ['Меркурий', 'mercury', 'Уран', 'uranus'],
  },
  {
    id: 'mercury-puzzle',
    action: 'Головоломки, кроссворды, шахматы',
    detail: 'Дайте уму конкретную задачу с правилами и финальным ответом. Это перенаправляет меркурианскую энергию из хаоса тревожных мыслей в продуктивную игру.',
    category: 'mental', icon: '🧩', intensity: 1, tags: ['Меркурий', 'mercury'],
  },

  // ── ВЕНЕРА ────────────────────────────────────────────────────────────────
  {
    id: 'venus-flowers',
    action: 'Купить живые цветы или ухаживать за растениями',
    detail: 'Венера правит красотой и живой природой. Контакт с цветами через запах, цвет и форму открывает её заблокированный канал. Даже один букет меняет качество дня.',
    category: 'earth', icon: '🌸', intensity: 1, tags: ['Венера', 'venus', 'Венера_Сатурн'],
  },
  {
    id: 'venus-spa',
    action: 'Полный уход за собой: маска, ванна, аромамасла',
    detail: 'Тело — храм Венеры. Когда она заблокирована — вы забываете о себе. Час заботы о физическом теле перезапускает её энергию. Медленно, с удовольствием.',
    category: 'ritual', icon: '✨', intensity: 1, tags: ['Венера', 'venus', 'Венера_Сатурн'],
  },
  {
    id: 'venus-music',
    action: 'Слушать живую музыку или самому играть/петь',
    detail: 'Звук — прямой язык Венеры. Концерт, джазовый бар, пение в душе — вибрации звука буквально реструктурируют энергетическое поле. Живое звучание эффективнее записи.',
    category: 'creative', icon: '🎵', intensity: 1, tags: ['Венера', 'venus', 'Нептун', 'neptune'],
  },
  {
    id: 'venus-cook',
    action: 'Готовить изысканное блюдо с любовью',
    detail: 'Еда — область Венеры. Красиво накрыть стол, приготовить что-то вкусное для себя или важного человека — активирует венерианский принцип: "я достоин красивой жизни".',
    category: 'social', icon: '🍷', intensity: 1, tags: ['Венера', 'venus', 'Марс_Венера'],
  },
  {
    id: 'venus-dance',
    action: 'Танец — медленный или свободный',
    detail: 'Когда Марс и Венера в напряжении, тело застряло между желанием и страхом. Танец разрешает это противоречие через движение: нет слов, есть только тело.',
    category: 'physical', icon: '💃', intensity: 2, tags: ['Марс_Венера', 'Венера', 'venus'],
  },

  // ── ЮПИТЕР ────────────────────────────────────────────────────────────────
  {
    id: 'jupiter-fast',
    action: 'Лёгкий пост или ограничение питания на день',
    detail: 'Юпитер в избытке — это переедание, переобещание, переоценка. Один день умеренности возвращает ему точность. Пост создаёт пространство для нового роста.',
    category: 'ritual', icon: '🥗', intensity: 1, tags: ['Юпитер', 'jupiter', 'Юпитер_Сатурн'],
  },
  {
    id: 'jupiter-travel',
    action: 'Небольшая поездка или однодневный трип',
    detail: 'Юпитер — бог путешествий. Когда он требует внимания — дайте телу физическое перемещение. Даже поездка в незнакомый район города активирует его расширяющую природу.',
    category: 'air', icon: '🚂', intensity: 2, tags: ['Юпитер', 'jupiter'],
  },
  {
    id: 'jupiter-gratitude',
    action: 'Список из 20 конкретных благодарностей',
    detail: 'Юпитер обостряется через благодарность. Не абстрактное "я благодарен за жизнь", а конкретное: "благодарю за звонок Ирины в пятницу". 20 пунктов — и настроение меняется.',
    category: 'mental', icon: '📜', intensity: 1, tags: ['Юпитер', 'jupiter', 'Венера_Юпитер'],
  },

  // ── НЕПТУН ────────────────────────────────────────────────────────────────
  {
    id: 'neptune-swim',
    action: 'Длинное плавание в море, озере или реке',
    detail: 'Нептун — хозяин безграничных вод. Погружение в природную воду растворяет тревожный нептунианский туман. Плыть медленно, без цели, чувствуя воду кожей.',
    category: 'water', icon: '🏊', intensity: 2, tags: ['Нептун', 'neptune', 'Меркурий_Нептун'],
  },
  {
    id: 'neptune-sound',
    action: 'Сеанс звукотерапии или поющие чаши',
    detail: 'Звуковые волны реорганизуют нептунианский хаос на клеточном уровне. Тибетские чаши, органный хорал, 432 Гц медитация — 30 минут возвращают ясность.',
    category: 'ritual', icon: '🔔', intensity: 1, tags: ['Нептун', 'neptune', 'Сатурн_Нептун'],
  },
  {
    id: 'neptune-incense',
    action: 'Благовония ладан или мирра + тихое сидение',
    detail: 'Ладан — очиститель пространства, его используют 3000 лет. Дым разгоняет нептунианские иллюзии и создаёт границу между реальным и иллюзорным.',
    category: 'ritual', icon: '🌫️', intensity: 1, tags: ['Нептун', 'neptune', 'Венера_Нептун'],
  },
  {
    id: 'neptune-boundaries',
    action: 'Написать конкретные личные границы на бумаге',
    detail: 'Нептун растворяет границы — дайте им форму. Напишите: "я не соглашусь на..." "меня не устраивает...". Слова на бумаге создают структуру там, где туман.',
    category: 'mental', icon: '✋', intensity: 1, tags: ['Нептун', 'neptune', 'Меркурий_Нептун'],
  },

  // ── ПЛУТОН ────────────────────────────────────────────────────────────────
  {
    id: 'pluto-burnlist',
    action: 'Написать и сжечь список страхов / обид',
    detail: 'Плутон работает через смерть и возрождение. Напишите всё тёмное на листе — и сожгите его. Буквально. Это древнейший ритуал трансформации, и он работает.',
    category: 'fire', icon: '📄🔥', intensity: 2, tags: ['Плутон', 'pluto', 'Марс_Плутон'],
  },
  {
    id: 'pluto-forest',
    action: 'Одиночество в глубоком лесу или горах',
    detail: 'Плутон требует встречи с тенью. Час в одиночестве среди дикой природы без гаджетов — самый честный способ услышать, что именно внутри требует трансформации.',
    category: 'earth', icon: '🌲', intensity: 2, tags: ['Плутон', 'pluto', 'Марс_Плутон'],
  },
  {
    id: 'pluto-declutter',
    action: 'Радикальная уборка: отдать / выбросить лишнее',
    detail: 'Плутон = трансформация через потерю. Разобрать вещи, которые лежат мёртвым грузом, и отпустить — прямое сотрудничество с его архетипом. Вещи = энергия.',
    category: 'ritual', icon: '🧹', intensity: 2, tags: ['Плутон', 'pluto', 'Сатурн'],
  },
  {
    id: 'pluto-breathwork',
    action: 'Глубокое дыхание или холотропный сеанс',
    detail: 'Интенсивное дыхание открывает доступ к слоям, недоступным разуму. Метод Вима Хофа, холотропное дыхание — Плутон любит работу с глубиной.',
    category: 'physical', icon: '🌬️', intensity: 3, tags: ['Плутон', 'pluto'],
  },

  // ── УРАН ──────────────────────────────────────────────────────────────────
  {
    id: 'uranus-grounding',
    action: 'Ходить босиком по траве / земле / песку',
    detail: 'Уран создаёт электрическое беспокойство — заземление через контакт стоп с землёй буквально снимает статическое напряжение. 20 минут босиком меняют состояние.',
    category: 'earth', icon: '🦶', intensity: 1, tags: ['Уран', 'uranus'],
  },
  {
    id: 'uranus-cold',
    action: 'Холодный душ или купание в холодной воде',
    detail: 'Уран = электричество = холодный импульс. Холодная вода сбрасывает нервное напряжение, возвращает контроль над телом и обнуляет хаотичный ментальный фон.',
    category: 'water', icon: '🧊', intensity: 2, tags: ['Уран', 'uranus', 'Уран_Сатурн'],
  },
  {
    id: 'uranus-rhythm',
    action: 'Установить жёсткое расписание на 3 дня',
    detail: 'Уран хаотизирует — противоядие: предсказуемый ритм. Встать в одно время, есть в одно время, работать блоками. Три дня ритма возвращают почву под ногами.',
    category: 'mental', icon: '🗓️', intensity: 1, tags: ['Уран', 'uranus', 'Уран_Сатурн'],
  },

  // ── АСПЕКТ-СПЕЦИФИЧНЫЕ ────────────────────────────────────────────────────
  {
    id: 'mars-saturn-combo',
    action: 'Горный поход в быстром темпе',
    detail: 'Марс□Сатурн — воля vs ограничение. Подъём в гору объединяет обоих: Марс даёт скорость, Сатурн — направление вверх. После — и разряжены, и достигли чего-то реального.',
    category: 'physical', icon: '🏔️', intensity: 3, tags: ['Марс_Сатурн'],
  },
  {
    id: 'mars-neptune-clarity',
    action: 'Выход на природу + отключение всех экранов',
    detail: 'Марс☌Нептун или квадрат — действие тонет в тумане. Физический выход на природу (лес, парк, берег) плюс тишина без телефона помогают отделить реальное от иллюзорного.',
    category: 'earth', icon: '🌿', intensity: 2, tags: ['Марс_Нептун'],
  },
  {
    id: 'moon-saturn-warmth',
    action: 'Тёплая ванна + написать письмо важному человеку',
    detail: 'Луна□Сатурн — эмоции прижаты страхом. Тепло воды расслабляет тело, а слова на бумаге дают выход накопленным чувствам. Письмо можно не отправлять.',
    category: 'water', icon: '💌', intensity: 1, tags: ['Луна_Сатурн'],
  },
  {
    id: 'mercury-neptune-silence',
    action: 'Звуковая медитация + 1 час без интернета',
    detail: 'Меркурий☍Нептун — ум в тумане, слова расплываются. Звуковые волны (поющие чаши, 528 Гц) плюс цифровой детокс возвращают ментальную ясность.',
    category: 'mental', icon: '🔇', intensity: 1, tags: ['Меркурий_Нептун'],
  },
  {
    id: 'venus-mars-dance',
    action: 'Танцы или латина с партнёром',
    detail: 'Венера□Марс — желание конфликтует со страстью. Контактный танец с живым партнёром — идеальный выход: есть близость, есть игра, есть тело без напряжения.',
    category: 'social', icon: '🕺💃', intensity: 2, tags: ['Марс_Венера'],
  },
  {
    id: 'sun-saturn-sunbath',
    action: 'Солнечные ванны утром + золотые предметы',
    detail: 'Солнце□Сатурн — жизненная сила блокируется. Буквальный солнечный свет утром (20 мин) перезапускает серотонин. Жёлтое и золотое в одежде усиливает солнечный принцип.',
    category: 'ritual', icon: '☀️', intensity: 1, tags: ['Солнце_Сатурн', 'Сатурн'],
  },
  {
    id: 'pluto-mars-martial',
    action: 'Единоборства или силовая тренировка',
    detail: 'Марс☌Плутон или квадрат — трансформирующая сила ищет выход. Единоборства направляют эту взрывную энергию в контролируемый канал. Самбо, боевые, даже бокс с грушей.',
    category: 'physical', icon: '🥋', intensity: 3, tags: ['Марс_Плутон'],
  },
  {
    id: 'general-park',
    action: 'Прогулка в парке или лесу (час и больше)',
    detail: 'Универсальный якорь для любого напряжения. Зелёный цвет деревьев снижает кортизол, ионизированный воздух перезаряжает нервную систему. Работает при любом аспекте.',
    category: 'earth', icon: '🌳', intensity: 1, tags: ['general', 'Сатурн', 'Плутон'],
  },
  {
    id: 'general-friends',
    action: 'Поиграть с друзьями в игры вживую',
    detail: 'Социальный смех — лучший нейтрализатор напряжённых аспектов. Настольные игры, волейбол, городки — живой контакт без экрана восстанавливает всё.',
    category: 'social', icon: '🎲', intensity: 1, tags: ['general', 'Меркурий', 'Юпитер'],
  },
  {
    id: 'general-sea',
    action: 'Поездка к морю, озеру или реке',
    detail: 'Вода всегда работает. Морской воздух насыщен отрицательными ионами, которые нейтрализуют стрессовые гормоны. Даже час у реки перезапускает эмоциональный фон.',
    category: 'water', icon: '🏖️', intensity: 2, tags: ['general', 'Луна', 'Нептун'],
  },
];

// ── Period Openings ───────────────────────────────────────────────────────────

const PERIOD_OPENINGS: Record<string, string[]> = {
  'mars': [
    'Марс вернулся домой — и он голоден.',
    'Энергия сейчас не вопрос мотивации. Вопрос — куда её направить.',
    'Промедление стоит дороже ошибки.',
  ],
  'saturn_neptune': [
    'Туман сгустился — но это строительный материал.',
    'Реальность переписывается. Вопрос: кто пишет сценарий.',
    'Мечта просит скелет. Самое время его дать.',
  ],
  'jupiter': [
    'Вселенная говорит: разворачивайся. Это не метафора.',
    'Юпитер открыл ворота. Не стойте в проходе.',
    'Этот период не для осторожных.',
  ],
  'venus': [
    'Пространство притяжения открылось. Кто войдёт?',
    'Обаяние работает само — просто будьте.',
    'Хорошее время для важных разговоров и новых знакомств.',
  ],
  'mercury_retrograde': [
    'Меркурий тормозит — это сигнал, а не приговор.',
    'Пересматривайте, а не запускайте новое.',
    'Что давно нужно было переделать — самое время.',
  ],
  'neutral': [
    'Тихая вода. Хорошее время копить, а не тратить.',
    'Атмосфера фоновой работы — незаметно, но надолго.',
    'Планеты не давят — они наблюдают. Делайте своё дело.',
  ],
};

function pickOpening(aspects: string[], energy: string): string {
  const text = aspects.join(' ').toLowerCase();
  let key = 'neutral';
  if (text.includes('меркурий') && (text.includes('ретро') || energy === 'напряженный')) key = 'mercury_retrograde';
  else if (text.includes('сатурн') && text.includes('нептун')) key = 'saturn_neptune';
  else if (text.includes('марс') && energy !== 'благоприятный') key = 'mars';
  else if (text.includes('юпитер') && energy === 'благоприятный') key = 'jupiter';
  else if (text.includes('венера') && energy === 'благоприятный') key = 'venus';
  const pool = PERIOD_OPENINGS[key];
  return pool[Math.floor(Date.now() / 86400000) % pool.length]; // стабильно меняется раз в день
}

// ── Aspect Pair Practices ─────────────────────────────────────────────────────

const ASPECT_PAIR_PRACTICES: Record<string, { name: string; image: string; tension: string; practices: string[] }> = {
  'Марс_Сатурн': {
    name: 'Квадрат/оппозиция Марс-Сатурн',
    image: 'Двигатель заблокирован. Пар есть — клапан закрыт.',
    tension: 'желание действовать + невозможность двигаться = взрыв или паралич',
    practices: [
      'Горный поход в высоком темпе (Марс пашет, Сатурн задаёт рельеф)',
      'Структурированный физический труд: построить, отремонтировать что-то конкретное руками',
      'Написать план на бумаге + немедленно первый шаг — без ожидания идеального момента',
      'Баня → холодная вода → 10 мин записи: что именно блокирует движение',
      'Заточить ножи или инструменты (металл нейтрализует металл)',
    ],
  },
  'Марс_Нептун': {
    name: 'Квадрат/оппозиция Марс-Нептун',
    image: 'Стрела в тумане. Куда целиться — непонятно.',
    tension: 'энергия есть, но цель расплывается; риск самообмана или растраты сил',
    practices: [
      'Плавание на скорость — физическая усталость прогоняет туман',
      'Написать конкретную цель на бумаге и повесить на видное место',
      'Избегать алкоголя и любых анестетиков в этот период',
      'Медитация с чёткой визуализацией одного конкретного результата',
    ],
  },
  'Луна_Сатурн': {
    name: 'Квадрат/оппозиция Луна-Сатурн',
    image: 'Сердце просит тепла — разум говорит «не заслужил».',
    tension: 'эмоциональное замораживание, одиночество, строгость к себе',
    practices: [
      'Солевая ванна + письмо внутреннему ребёнку (тёплое, не критикующее)',
      'Позвонить старому другу или родственнику — не по делу, просто так',
      'Приготовить еду для себя как для любимого человека',
      '10 мин в темноте: просто сидеть и дышать — без задач',
    ],
  },
  'Луна_Плутон': {
    name: 'Квадрат/оппозиция Луна-Плутон',
    image: 'Эмоции как цунами — или полный штиль как будто умер внутри.',
    tension: 'эмоциональная интенсивность, контролирующий страх, манипуляция',
    practices: [
      'Выплакаться — не сдерживать, дать пройти волне до конца',
      'Ночная прогулка в одиночестве, записать что поднялось',
      'Массаж или остеопат — Плутон держит напряжение в животе и тазу',
    ],
  },
  'Меркурий_Нептун': {
    name: 'Квадрат/оппозиция Меркурий-Нептун',
    image: 'Слова тонут в океане образов. Мысль есть — оформить невозможно.',
    tension: 'туман в голове, фантазирование вместо коммуникации, недопонимания',
    practices: [
      'Звуковая медитация 20-30 мин (поющие чаши, дроны, чистый тон)',
      'Отключить интернет на половину дня — буквально, не метафорически',
      'Писать от руки, не набирать — замедление активирует ясность',
      'Избегать важных переговоров и подписания договорённостей',
    ],
  },
  'Венера_Сатурн': {
    name: 'Квадрат/оппозиция Венера-Сатурн',
    image: 'Любовь проходит проверку реальностью. Или выдержит — или обнажит трещины.',
    tension: 'охлаждение в отношениях, финансовые ограничения, задержки',
    practices: [
      'Честный разговор о будущем — без обвинений, только факты',
      'Купить живые цветы или ухаживать за растениями',
      'Создать что-то красивое своими руками',
    ],
  },
  'Сатурн_Нептун': {
    name: 'Соединение Сатурн-Нептун (глобальный транзит 2025-2026)',
    image: 'Построить храм из тумана. Дать форму неформируемому.',
    tension: 'структура размывается, ИЛИ мечта наконец получает каркас',
    practices: [
      'Плавание с ритмом (интервалы) — дисциплина в воде',
      'Создать ритуал — повторяющееся действие, наполненное личным смыслом',
      'Начать дисциплинированную творческую практику каждый день в одно время',
      'Медитация с чётким намерением: 20 мин, таймер, без отвлечений',
    ],
  },
  'Юпитер_Сатурн': {
    name: 'Квадрат/оппозиция Юпитер-Сатурн',
    image: 'Хочется полёта — земля держит. Слишком много грандиозных планов без исполнения.',
    tension: 'конфликт расширения и ограничения, большие амбиции + нет ресурсов',
    practices: [
      'Написать список всего что хочу + напротив каждого: один конкретный первый шаг',
      'Работать с тем что есть, не ждать идеальных условий',
      'Поход в горы: Сатурн задаёт рельеф, Юпитер даёт перспективу с вершины',
    ],
  },
};

// ── Sun Sign Voice ────────────────────────────────────────────────────────────

const SUN_SIGN_VOICE: Record<string, { opening: string; shadow: string; superpower: string; compensatory_note: string }> = {
  'Овен': {
    opening: 'Овен — это первый удар молотка. Ещё ничего нет, но уже есть импульс.',
    shadow: 'когда не знает, кто он — становится агрессивным или невидимым',
    superpower: 'начинать там, где у других не хватает смелости даже думать',
    compensatory_note: 'Прокрастинация у Овна — это подавленный Марс. Лечится не мотивацией, а физическим действием прямо сейчас.',
  },
  'Телец': {
    opening: 'Телец — это тело, которое знает что вкусно. Надёжность как форма любви.',
    shadow: 'путает безопасность с комфортом, комфорт с жизнью',
    superpower: 'строить медленно то, что простоит века',
    compensatory_note: 'Стресс у Тельца живёт в шее и горле. Пение, массаж, земля под ногами — не метафора, это терапия.',
  },
  'Близнецы': {
    opening: 'Близнецы — это вопрос, который не хочет становиться ответом. И правильно.',
    shadow: 'собирает информацию вместо того, чтобы что-то с ней делать',
    superpower: 'соединять несоединимое одним разговором',
    compensatory_note: 'Перегруз у Близнецов снимается не отдыхом, а переключением на одну конкретную задачу.',
  },
  'Рак': {
    opening: 'Рак — это дом внутри себя. Куда бы ни переехал, берёт домашность с собой.',
    shadow: 'защитные панцири становятся тюрьмой',
    superpower: 'чувствовать то, что другие только думают о том, чтобы почувствовать',
    compensatory_note: 'Агрессия у Рака накапливается молча и выходит боком. Вода и тепло разряжают до взрыва.',
  },
  'Лев': {
    opening: 'Лев — это единственный знак, который по-настоящему верит, что солнце светит для него лично. Иногда это правда.',
    shadow: 'без сцены становится карикатурой на себя или гаснет',
    superpower: 'заряжать других одним только присутствием',
    compensatory_note: 'Непризнанный Лев тратит энергию на доказательство. Хватит доказывать — начни создавать.',
  },
  'Дева': {
    opening: 'Дева — это критик, который хочет мира. Или мастер, которому важен каждый шов.',
    shadow: 'служение превращается в самоуничижение',
    superpower: 'видеть что сломалось раньше, чем другие замечают трещину',
    compensatory_note: 'Тревога у Девы живёт в кишечнике. Режим, ритм, чистота пространства — это не педантизм, это терапия.',
  },
  'Весы': {
    opening: 'Весы — это человек, который помнит все точки зрения, кроме своей собственной.',
    shadow: 'баланс как избегание выбора',
    superpower: 'создавать красоту и гармонию из конфликта',
    compensatory_note: 'Нерешительность у Весов снимается дедлайном. Дайте себе срок — решение придёт само.',
  },
  'Скорпион': {
    opening: 'Скорпион — это знак, который давно перестал бояться дна. Он там живёт.',
    shadow: 'трансформация других вместо себя',
    superpower: 'видеть сквозь любую маску с первого взгляда',
    compensatory_note: 'Напряжение у Скорпиона накапливается в области таза. Вода и трансформационные практики обязательны.',
  },
  'Стрелец': {
    opening: 'Стрелец — это человек, которому тесно в любом городе. Горизонт всегда важнее адреса.',
    shadow: 'мудрость как побег от ответственности',
    superpower: 'видеть смысл там, где другие видят хаос',
    compensatory_note: 'Стресс у Стрельца — от несвободы. Физическое движение, путешествие или смена маршрута обязательны.',
  },
  'Козерог': {
    opening: 'Козерог — это человек, который не доверяет успеху, пока не потрогает его руками.',
    shadow: 'строит лестницу, забывая спросить куда',
    superpower: 'материализовывать невозможное через методичное движение',
    compensatory_note: 'Депрессия у Козерога — это Сатурн без цели. Один конкретный результат разворачивает всё.',
  },
  'Водолей': {
    opening: 'Водолей — это человек из будущего, случайно оказавшийся в настоящем. Ему здесь немного тесно.',
    shadow: 'свобода от всего включая близких людей',
    superpower: 'видеть паттерны там, где другие видят случайности',
    compensatory_note: 'Нервная перегрузка у Водолея — от потока информации. Цифровой детокс — это лекарство, не метафора.',
  },
  'Рыбы': {
    opening: 'Рыбы — это единственный знак, который может чувствовать боль незнакомца на другом конце города.',
    shadow: 'сострадание как растворение себя',
    superpower: 'видеть невидимое, слышать неслышимое, создавать из ничего',
    compensatory_note: 'Потеря берегов у Рыб — это Нептун без якоря. Земля, тело, расписание возвращают форму.',
  },
};

// ── Current Background ─────────────────────────────────────────────────────────

const CURRENT_BACKGROUND = {
  period: 'Апрель 2026',
  main: 'Сатурн и Нептун идут к точному соединению в Овне — это самое редкое соединение десятилетия. Всё, что строилось на иллюзиях, сейчас получает счёт. Всё, что было мечтой без скелета — либо обретает форму, либо испаряется.',
  jupiter: 'Юпитер в Раке (до августа 2026) — редкая экзальтация. Расширяется всё связанное с домом, семьёй, эмоциональной безопасностью. Хороший период для семейных решений.',
  uranus: 'Уран завершает семилетний марш по Тельцу (29-й градус). Последний сюрприз в теме денег и ценностей — неожиданный, но плановый.',
};

// ── Compensatorics Engine ─────────────────────────────────────────────────────

function buildCompensatorics(keyAspects: string[], energy: string, planets: string[]): CompAction[] {
  const scored: Array<{ action: CompAction; score: number }> = [];

  for (const action of ALL_COMP_ACTIONS) {
    let score = 0;

    // Tag-matching
    for (const tag of action.tags) {
      if (tag === 'general') { score += 1; continue; }
      // Match against aspect strings
      for (const asp of keyAspects) {
        if (asp.includes(tag)) score += 3;
      }
      // Match against active planets
      if (planets.some(p => p === tag || p.toLowerCase() === tag.toLowerCase())) score += 2;
    }

    // Energy modifier
    if (energy === 'напряженный' && action.intensity >= 2) score += 1;
    if (energy === 'благоприятный' && action.category === 'social') score += 1;

    if (score > 0) scored.push({ action, score });
  }

  // Sort by score, deduplicate categories to ensure variety
  scored.sort((a, b) => b.score - a.score);

  const seen = new Set<string>();
  const result: CompAction[] = [];
  for (const { action } of scored) {
    const catKey = `${action.category}_${action.tags[0]}`;
    if (!seen.has(catKey)) {
      seen.add(catKey);
      result.push(action);
    }
    if (result.length >= 8) break;
  }

  // Always add at least 2 general actions
  if (result.length < 3) {
    for (const a of ALL_COMP_ACTIONS) {
      if (a.tags.includes('general') && !result.find(r => r.id === a.id)) {
        result.push(a);
      }
      if (result.length >= 5) break;
    }
  }

  return result;
}

// ── Category metadata ────────────────────────────────────────────────────────

const CATEGORY_META: Record<CompCategory, { label: string; icon: string; color: string; desc: string }> = {
  fire:     { label: 'Огонь',       icon: '🔥', color: '#ef4444', desc: 'Разряжает Марс, активирует волю' },
  water:    { label: 'Вода',        icon: '💧', color: '#3b82f6', desc: 'Очищает Луну и Нептун, снимает эмоции' },
  earth:    { label: 'Земля',       icon: '🌍', color: '#84cc16', desc: 'Заземляет Сатурн, Уран, Плутон' },
  air:      { label: 'Воздух',      icon: '💨', color: '#06b6d4', desc: 'Перезагружает Меркурий, Уран' },
  physical: { label: 'Физическое',  icon: '🏃', color: '#f97316', desc: 'Разряжает накопленное напряжение через тело' },
  ritual:   { label: 'Ритуальное',  icon: '🕯️', color: '#8b5cf6', desc: 'Символические действия через стихии' },
  social:   { label: 'Социальное',  icon: '🤝', color: '#ec4899', desc: 'Активирует Юпитер, Венеру, Меркурий' },
  mental:   { label: 'Ментальное',  icon: '🧠', color: '#6366f1', desc: 'Структурирует, проясняет, успокаивает ум' },
  creative: { label: 'Творческое',  icon: '🎨', color: '#f59e0b', desc: 'Канализирует Нептун, Венеру, Луну' },
};

// ── Intensity filter mapping ──────────────────────────────────────────────────

type IntensityFilter = 'all' | 'soft' | 'active' | 'ritual_filter';

// soft = water/mental/social, active = physical/earth/fire, ritual_filter = ritual/creative/air
function categoryToFilter(cat: CompCategory): IntensityFilter {
  if (['water', 'mental', 'social'].includes(cat)) return 'soft';
  if (['physical', 'earth', 'fire'].includes(cat)) return 'active';
  if (['ritual', 'creative', 'air'].includes(cat)) return 'ritual_filter';
  return 'soft';
}

// ── Helper: find matching aspect pair practice keys ───────────────────────────

function findAspectPairKeys(keyAspects: string[]): string[] {
  const found: string[] = [];
  for (const asp of keyAspects) {
    const lower = asp.toLowerCase();
    for (const pairKey of Object.keys(ASPECT_PAIR_PRACTICES)) {
      const [p1, p2] = pairKey.split('_');
      if (lower.includes(p1.toLowerCase()) && lower.includes(p2.toLowerCase())) {
        if (!found.includes(pairKey)) found.push(pairKey);
      }
    }
  }
  return found;
}

// ── CompensatoricsPanel ───────────────────────────────────────────────────────

function IntensityDots({ n }: { n: 1 | 2 | 3 }) {
  return (
    <div className="flex gap-0.5">
      {[1, 2, 3].map(i => (
        <span key={i} className={`inline-block w-1.5 h-1.5 rounded-full ${i <= n ? 'bg-current opacity-80' : 'bg-current opacity-20'}`} />
      ))}
    </div>
  );
}

function CompActionCard({ action, isDark }: { action: CompAction; isDark: boolean }) {
  const [open, setOpen] = useState(false);
  const meta = CATEGORY_META[action.category];

  return (
    <div
      className={`rounded-xl border transition-all cursor-pointer ${isDark ? 'border-white/10 bg-white/4 hover:bg-white/8' : 'border-black/8 bg-black/2 hover:bg-black/4'}`}
      onClick={() => setOpen(o => !o)}
    >
      <div className="flex items-start gap-3 p-3">
        <span className="text-2xl flex-shrink-0 mt-0.5">{action.icon}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <p className={`text-sm font-semibold leading-snug ${isDark ? 'text-white' : 'text-gray-900'}`}>
              {action.action}
            </p>
            <div className="flex items-center gap-1.5 flex-shrink-0">
              <span className="text-xs px-1.5 py-0.5 rounded-md font-medium"
                style={{ background: meta.color + '25', color: meta.color }}>
                {meta.icon} {meta.label}
              </span>
              <IntensityDots n={action.intensity} />
            </div>
          </div>
        </div>
        <button className={`flex-shrink-0 ${isDark ? 'text-white/40' : 'text-black/30'}`}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </div>
      {open && (
        <div className={`px-3 pb-3 pt-0 text-xs leading-relaxed border-t mx-2 pt-2 ${isDark ? 'border-white/8 text-white/70' : 'border-black/8 text-gray-600'}`}
          style={{ borderTopWidth: '1px' }}>
          {action.detail}
        </div>
      )}
    </div>
  );
}

function AspectPairCard({ pairKey, isDark }: { pairKey: string; isDark: boolean }) {
  const [open, setOpen] = useState(false);
  const pair = ASPECT_PAIR_PRACTICES[pairKey];
  if (!pair) return null;
  return (
    <div className={`rounded-xl border overflow-hidden ${isDark ? 'border-amber-500/20 bg-amber-900/10' : 'border-amber-200 bg-amber-50'}`}>
      <button className="w-full flex items-start gap-3 p-3 text-left" onClick={() => setOpen(o => !o)}>
        <span className="text-xl flex-shrink-0">⚡</span>
        <div className="flex-1 min-w-0">
          <p className={`text-xs font-bold ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>{pair.name}</p>
          <p className={`text-xs italic mt-0.5 ${isDark ? 'text-amber-300/70' : 'text-amber-700/70'}`}>{pair.image}</p>
        </div>
        <button className={`flex-shrink-0 mt-0.5 ${isDark ? 'text-white/40' : 'text-black/30'}`}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </button>
      </button>
      {open && (
        <div className={`px-3 pb-3 space-y-2 border-t ${isDark ? 'border-amber-500/10' : 'border-amber-100'}`}>
          <p className={`text-[11px] mt-2 ${isDark ? 'text-amber-200/70' : 'text-amber-800/70'}`}>
            <span className="font-semibold">Напряжение:</span> {pair.tension}
          </p>
          <p className={`text-[11px] font-semibold ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>Практики:</p>
          <ul className="space-y-1">
            {pair.practices.map((p, i) => (
              <li key={i} className={`text-[11px] leading-snug flex items-start gap-1.5 ${isDark ? 'text-amber-100/75' : 'text-amber-900/75'}`}>
                <span className="flex-shrink-0 mt-0.5">•</span>
                <span>{p}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function BackgroundNarrativeCard({ isDark }: { isDark: boolean }) {
  const [open, setOpen] = useState(false);
  return (
    <div className={`rounded-2xl border overflow-hidden ${isDark ? 'border-indigo-500/25 bg-gradient-to-br from-indigo-900/20 to-violet-900/20' : 'border-indigo-200 bg-gradient-to-br from-indigo-50 to-violet-50'}`}>
      <button className="w-full flex items-center gap-3 p-4 text-left" onClick={() => setOpen(o => !o)}>
        <span className="text-xl">🌍</span>
        <div className="flex-1">
          <p className={`text-sm font-bold ${isDark ? 'text-indigo-200' : 'text-indigo-800'}`}>
            Астрофон {CURRENT_BACKGROUND.period}
          </p>
          <p className={`text-xs mt-0.5 ${isDark ? 'text-indigo-300/60' : 'text-indigo-600/70'}`}>
            Глобальные транзиты, которые формируют общий фон
          </p>
        </div>
        <span className={`flex-shrink-0 ${isDark ? 'text-white/40' : 'text-black/30'}`}>
          {open ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
        </span>
      </button>
      {open && (
        <div className={`px-4 pb-4 space-y-3 border-t ${isDark ? 'border-indigo-500/10' : 'border-indigo-100'}`}>
          <p className={`text-sm leading-relaxed mt-3 ${isDark ? 'text-indigo-100/85' : 'text-indigo-900/80'}`}>
            {CURRENT_BACKGROUND.main}
          </p>
          <div className={`rounded-lg p-3 ${isDark ? 'bg-white/5' : 'bg-white/60'}`}>
            <p className={`text-[11px] font-semibold mb-1 ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>♃ Юпитер в Раке</p>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-white/70' : 'text-gray-700'}`}>{CURRENT_BACKGROUND.jupiter}</p>
          </div>
          <div className={`rounded-lg p-3 ${isDark ? 'bg-white/5' : 'bg-white/60'}`}>
            <p className={`text-[11px] font-semibold mb-1 ${isDark ? 'text-cyan-300' : 'text-cyan-700'}`}>♅ Уран в Тельце (29°)</p>
            <p className={`text-[11px] leading-relaxed ${isDark ? 'text-white/70' : 'text-gray-700'}`}>{CURRENT_BACKGROUND.uranus}</p>
          </div>
        </div>
      )}
    </div>
  );
}

function CompensatoricsPanel({
  keyAspects, energy, activePlanets, isDark, theme, sunSign,
}: {
  keyAspects: string[];
  energy: string;
  activePlanets: string[];
  isDark: boolean;
  theme: ThemeLike;
  sunSign?: string;
}) {
  const [intensityFilter, setIntensityFilter] = useState<IntensityFilter>('all');

  const actions = useMemo(
    () => buildCompensatorics(keyAspects, energy, activePlanets),
    [keyAspects, energy, activePlanets],
  );

  const filteredActions = useMemo(() => {
    if (intensityFilter === 'all') return actions;
    return actions.filter(a => categoryToFilter(a.category) === intensityFilter);
  }, [actions, intensityFilter]);

  const aspectPairKeys = useMemo(() => findAspectPairKeys(keyAspects), [keyAspects]);

  const liveOpening = useMemo(() => pickOpening(keyAspects, energy), [keyAspects, energy]);

  const sunVoice = sunSign ? SUN_SIGN_VOICE[sunSign] : undefined;

  const principleText = useMemo(() => {
    const hasFirePlanets = keyAspects.some(a => a.includes('Марс') || a.includes('Солнце'));
    const hasWaterPlanets = keyAspects.some(a => a.includes('Луна') || a.includes('Нептун'));
    const hasSaturn = keyAspects.some(a => a.includes('Сатурн'));
    const hasTense = energy === 'напряженный';

    if (hasTense && hasFirePlanets && hasSaturn)
      return 'Фон сегодня — сжатая пружина между действием и ограничением. Компенсаторика работает через физический выход: тело умнее слов.';
    if (hasWaterPlanets)
      return 'Эмоциональный фон высокий. Вода в любой форме — море, ванна, река — снимает напряжение быстрее любых разговоров.';
    if (hasTense)
      return 'Напряжённый фон требует канализации: не терпеть и не взрываться, а находить физический выход для избыточной энергии.';
    return 'Гармоничный период: компенсаторика активирует потенциал, а не нейтрализует напряжение. Используйте её для усиления.';
  }, [keyAspects, energy]);

  const FILTER_OPTIONS: { key: IntensityFilter; emoji: string; label: string; desc: string }[] = [
    { key: 'all',           emoji: '✦',  label: 'Все',       desc: '' },
    { key: 'soft',          emoji: '🌱', label: 'Мягко',     desc: 'чай, прогулка, ванна' },
    { key: 'active',        emoji: '🔥', label: 'Активно',   desc: 'физнагрузка, спорт, труд' },
    { key: 'ritual_filter', emoji: '✨', label: 'Ритуал',    desc: 'медитация, огонь, письмо' },
  ];

  return (
    <div className="space-y-5">
      {/* Background narrative */}
      <BackgroundNarrativeCard isDark={isDark} />

      {/* Principle card with live opening */}
      <div className={`rounded-2xl border p-4 ${isDark ? 'bg-gradient-to-br from-violet-900/20 to-indigo-900/20 border-violet-500/20' : 'bg-gradient-to-br from-violet-50 to-indigo-50 border-violet-200'}`}>
        <div className="flex items-start gap-3">
          <span className="text-2xl">⚗️</span>
          <div>
            <h3 className={`font-semibold mb-1 ${isDark ? 'text-violet-200' : 'text-violet-800'}`}>
              Принцип компенсаторики
            </h3>
            <p className={`text-sm leading-relaxed font-medium mb-2 ${isDark ? 'text-violet-100' : 'text-violet-900'}`}>
              {liveOpening}
            </p>
            <p className={`text-sm leading-relaxed ${isDark ? 'text-violet-100/80' : 'text-violet-900/70'}`}>
              {principleText}
            </p>
            <p className={`text-xs mt-2 leading-relaxed ${isDark ? 'text-white/50' : 'text-gray-500'}`}>
              Каждое действие выбрано по резонансу стихии: огонь разряжает Марса, вода — Луну и Нептун, земля заземляет Сатурн и Уран, воздух очищает Меркурий.
            </p>
          </div>
        </div>
      </div>

      {/* Sun Sign Voice */}
      {sunVoice && sunSign && (
        <div className={`rounded-2xl border p-4 ${isDark ? 'border-amber-500/20 bg-amber-900/10' : 'border-amber-200 bg-amber-50'}`}>
          <div className="flex items-start gap-3">
            <span className="text-2xl">☀️</span>
            <div className="flex-1">
              <h3 className={`font-semibold mb-2 ${isDark ? 'text-amber-200' : 'text-amber-800'}`}>
                Голос знака Солнца — {sunSign}
              </h3>
              <p className={`text-sm leading-relaxed italic mb-3 ${isDark ? 'text-amber-100/90' : 'text-amber-900/80'}`}>
                {sunVoice.opening}
              </p>
              <div className="space-y-1.5">
                <p className={`text-xs ${isDark ? 'text-white/70' : 'text-gray-700'}`}>
                  <span className={`font-semibold ${isDark ? 'text-amber-300' : 'text-amber-700'}`}>Суперсила:</span> {sunVoice.superpower}
                </p>
                <p className={`text-xs ${isDark ? 'text-white/60' : 'text-gray-600'}`}>
                  <span className={`font-semibold ${isDark ? 'text-orange-300' : 'text-orange-700'}`}>Тень:</span> {sunVoice.shadow}
                </p>
              </div>
              <div className={`mt-3 rounded-lg p-2.5 text-xs leading-relaxed ${isDark ? 'bg-white/5 text-white/75' : 'bg-white/70 text-gray-700'}`}>
                💡 {sunVoice.compensatory_note}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Aspect Pair Practices */}
      {aspectPairKeys.length > 0 && (
        <div className="space-y-2">
          <h3 className={`font-semibold text-sm flex items-center gap-2 ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
            <span>⚡</span> Специфика активных аспектов
            <span className={`text-[10px] font-normal ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
              — практики под конкретные пары
            </span>
          </h3>
          {aspectPairKeys.map(key => (
            <AspectPairCard key={key} pairKey={key} isDark={isDark} />
          ))}
        </div>
      )}

      {/* Actions with intensity filter */}
      {actions.length === 0 ? (
        <p className={`text-sm text-center py-8 ${isDark ? 'text-white/40' : 'text-gray-400'}`}>
          Нет данных об аспектах — откройте вкладку Обзор и обновите данные.
        </p>
      ) : (
        <div className="space-y-3">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h3 className={`font-semibold text-sm ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
              Рекомендованные действия ({filteredActions.length})
            </h3>
            {/* Intensity filter */}
            <div className="flex gap-1.5 flex-wrap">
              {FILTER_OPTIONS.map(opt => (
                <button
                  key={opt.key}
                  onClick={() => setIntensityFilter(opt.key)}
                  title={opt.desc}
                  className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium border transition-all ${
                    intensityFilter === opt.key
                      ? (isDark ? 'bg-violet-600/40 border-violet-400/40 text-violet-200' : 'bg-violet-100 border-violet-300 text-violet-700')
                      : (isDark ? 'border-white/10 text-white/50 hover:border-white/20' : 'border-black/10 text-gray-500 hover:border-black/20')
                  }`}
                >
                  <span>{opt.emoji}</span>
                  <span>{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
          {filteredActions.length === 0 ? (
            <p className={`text-xs text-center py-4 ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
              Нет практик с таким фильтром — попробуйте другой.
            </p>
          ) : (
            <div className="space-y-2">
              {filteredActions.map(a => (
                <CompActionCard key={a.id} action={a} isDark={isDark} />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Element legend */}
      <div className={`rounded-xl border p-3 ${isDark ? 'border-white/8 bg-white/3' : 'border-black/6 bg-black/2'}`}>
        <p className={`text-xs font-semibold mb-2 ${isDark ? 'text-white/60' : 'text-gray-500'}`}>Стихии и их действие</p>
        <div className="grid grid-cols-2 gap-1.5">
          {(['fire', 'water', 'earth', 'air'] as const).map(cat => {
            const meta = CATEGORY_META[cat];
            return (
              <div key={cat} className="flex items-start gap-1.5">
                <span className="text-base">{meta.icon}</span>
                <div>
                  <p className="text-xs font-medium" style={{ color: meta.color }}>{meta.label}</p>
                  <p className={`text-xs ${isDark ? 'text-white/45' : 'text-gray-500'}`}>{meta.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ── Subscription Panel ────────────────────────────────────────────────────────

const SUB_KEY = 'astro_horoscope_sub_v2';

function loadSub(): EmailSub {
  try {
    const raw = localStorage.getItem(SUB_KEY);
    if (raw) return { includeTransits: true, includeCompensatorics: true, ...JSON.parse(raw) };
  } catch { /* */ }
  return { email: '', frequency: 'daily', hour: '08:00', active: false, includeTransits: true, includeCompensatorics: true };
}

function saveSub(s: EmailSub) {
  try { localStorage.setItem(SUB_KEY, JSON.stringify(s)); } catch { /* */ }
}

function SubscriptionPanel({ isDark, theme }: { isDark: boolean; theme: ThemeLike }) {
  const [sub, setSub] = useState<EmailSub>(loadSub);
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  const update = useCallback((patch: Partial<EmailSub>) => {
    setSub(prev => {
      const next = { ...prev, ...patch };
      saveSub(next);
      return next;
    });
  }, []);

  const handleSave = () => {
    saveSub(sub);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const previewText = useMemo(() => {
    const freq = sub.frequency === 'daily' ? 'ежедневно' : sub.frequency === 'weekly' ? 'еженедельно' : 'ежемесячно';
    return `Вы подписаны на личный астропрогноз ${freq} в ${sub.hour}.\n\nВключено:\n${sub.includeTransits ? '✓ Транзиты и прогрессии\n' : ''}${sub.includeCompensatorics ? '✓ Компенсаторные практики\n' : ''}✓ Обзор периода, аспекты, сферы жизни\n\nПрогнозы будут включать расчёт активных транзитных планет и персональные рекомендации.`;
  }, [sub]);

  const handleCopy = () => {
    navigator.clipboard.writeText(previewText).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const cardCls = `rounded-2xl border p-4 ${isDark ? 'border-white/10 bg-white/4' : 'border-black/8 bg-black/2'}`;
  const inputCls = `w-full px-3 py-2 rounded-xl border text-sm ${isDark ? 'bg-white/5 border-white/15 text-white placeholder-white/30' : 'bg-white border-gray-200 text-gray-900 placeholder-gray-400'}`;
  const labelCls = `text-xs mb-1.5 block ${isDark ? 'text-white/60' : 'text-gray-500'}`;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className={`rounded-2xl border p-4 ${isDark ? 'bg-gradient-to-br from-indigo-900/20 to-purple-900/20 border-indigo-500/20' : 'bg-gradient-to-br from-indigo-50 to-purple-50 border-indigo-200'}`}>
        <div className="flex items-start gap-3">
          <Bell className={`h-5 w-5 mt-0.5 flex-shrink-0 ${isDark ? 'text-indigo-300' : 'text-indigo-600'}`} />
          <div>
            <h3 className={`font-semibold mb-1 ${isDark ? 'text-indigo-200' : 'text-indigo-800'}`}>
              Личные прогнозы по транзитам
            </h3>
            <p className={`text-sm ${isDark ? 'text-indigo-100/70' : 'text-indigo-900/60'}`}>
              Получайте персональный астропрогноз на почту: активные транзиты, компенсаторные практики и ключевые окна недели — сформированные специально под вашу натальную карту.
            </p>
          </div>
        </div>
      </div>

      {/* Form */}
      <div className={cardCls}>
        <div className="space-y-4">
          <div>
            <label className={labelCls}>Email для прогнозов</label>
            <input
              type="email"
              value={sub.email}
              onChange={e => update({ email: e.target.value })}
              placeholder="your@email.com"
              className={inputCls}
            />
          </div>

          <div>
            <label className={labelCls}>Частота</label>
            <div className="flex gap-2">
              {([['daily', '☀️ Ежедневно'], ['weekly', '📅 Еженедельно'], ['monthly', '🌙 Ежемесячно']] as const).map(([k, label]) => (
                <button key={k} onClick={() => update({ frequency: k })}
                  className={`flex-1 py-2 text-xs rounded-xl border font-medium transition-all ${sub.frequency === k ? theme.tabActive : theme.tabInactive}`}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className={labelCls}>Время отправки</label>
            <input
              type="time"
              value={sub.hour}
              onChange={e => update({ hour: e.target.value })}
              className={`${inputCls} w-32`}
            />
          </div>

          <div className="space-y-2">
            <label className={labelCls}>Включить в прогноз</label>
            {([
              ['includeTransits', '🌍 Транзиты и прогрессии'],
              ['includeCompensatorics', '⚗️ Компенсаторные практики'],
            ] as const).map(([field, label]) => (
              <label key={field} className="flex items-center gap-2 cursor-pointer">
                <div
                  onClick={() => update({ [field]: !sub[field] })}
                  className={`w-9 h-5 rounded-full relative transition-colors cursor-pointer ${sub[field] ? 'bg-indigo-500' : isDark ? 'bg-white/15' : 'bg-gray-200'}`}
                >
                  <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-transform ${sub[field] ? 'translate-x-4' : 'translate-x-0.5'}`} />
                </div>
                <span className={`text-sm ${isDark ? 'text-white/80' : 'text-gray-700'}`}>{label}</span>
              </label>
            ))}
          </div>

          {/* Active toggle */}
          <div className={`flex items-center justify-between p-3 rounded-xl border ${isDark ? 'border-white/10 bg-white/3' : 'border-gray-100 bg-gray-50'}`}>
            <div>
              <p className={`text-sm font-medium ${isDark ? 'text-white' : 'text-gray-800'}`}>
                {sub.active ? '🟢 Подписка активна' : '⚪ Подписка неактивна'}
              </p>
              <p className={`text-xs ${isDark ? 'text-white/40' : 'text-gray-500'}`}>
                {sub.active ? `Прогноз будет отправляться ${sub.frequency === 'daily' ? 'ежедневно' : sub.frequency === 'weekly' ? 'еженедельно' : 'ежемесячно'} в ${sub.hour}` : 'Включите, чтобы получать прогнозы'}
              </p>
            </div>
            <div
              onClick={() => update({ active: !sub.active })}
              className={`w-11 h-6 rounded-full relative transition-colors cursor-pointer ${sub.active ? 'bg-green-500' : isDark ? 'bg-white/15' : 'bg-gray-200'}`}
            >
              <div className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform ${sub.active ? 'translate-x-5' : 'translate-x-0.5'}`} />
            </div>
          </div>

          <button onClick={handleSave}
            className={`w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-semibold ${theme.btn}`}>
            {saved ? <Check className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
            {saved ? 'Сохранено' : 'Сохранить настройки'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className={cardCls}>
        <div className="flex items-center justify-between mb-3">
          <p className={`text-sm font-medium ${isDark ? 'text-white/80' : 'text-gray-700'}`}>
            📋 Пример содержимого прогноза
          </p>
          <button onClick={handleCopy}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs border transition-all ${isDark ? 'border-white/15 text-white/60 hover:border-white/30' : 'border-gray-200 text-gray-500 hover:border-gray-300'}`}>
            {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
            {copied ? 'Скопировано' : 'Копировать'}
          </button>
        </div>
        <pre className={`text-xs leading-relaxed whitespace-pre-wrap ${isDark ? 'text-white/55' : 'text-gray-500'}`}>
          {previewText}
        </pre>
      </div>

      <p className={`text-xs text-center ${isDark ? 'text-white/30' : 'text-gray-400'}`}>
        Для автоматической отправки требуется настройка SMTP на сервере. Сохранённые настройки можно использовать для ручной отправки через «Открыть в почте».
      </p>
    </div>
  );
}

// ── Main HoroscopeBlock ───────────────────────────────────────────────────────

const TABS: { key: HoroTab; icon: string; label: string }[] = [
  { key: 'overview',       icon: '🧭', label: 'Обзор' },
  { key: 'transits',       icon: '🌀', label: 'Транзиты' },
  { key: 'solar-return',   icon: '🌞', label: 'Соляр' },
  { key: 'compensatorics', icon: '⚗️', label: 'Компенсаторика' },
  { key: 'subscription',   icon: '🔔', label: 'Подписка' },
];

export default function HoroscopeBlock({ theme, birth }: HoroProps) {
  const isDark = theme.wheelTheme === 'dark';
  const [tab, setTab] = useState<HoroTab>('overview');

  // Minimal period data for compensatorics engine when in that tab
  const [compAspects, setCompAspects] = useState<string[]>([]);
  const [compEnergy, setCompEnergy] = useState('переменный');
  const [compPlanets, setCompPlanets] = useState<string[]>([]);
  const [compSunSign, setCompSunSign] = useState<string | undefined>(undefined);

  // Fetch minimal data for compensatorics
  useEffect(() => {
    if (tab !== 'compensatorics') return;
    const today = new Date().toISOString().slice(0, 10);
    getAstroSummary(today, '12:00').then((resp: unknown) => {
      const data = resp as { periods?: { day?: { key_aspects?: string[]; energy?: string; sun_sign?: string } } };
      const day = data?.periods?.day;
      if (day) {
        setCompAspects(day.key_aspects ?? []);
        setCompEnergy(day.energy ?? 'переменный');
        if (day.sun_sign) setCompSunSign(day.sun_sign);
        // Extract planet names from aspects
        const planetPattern = /Марс|Венера|Меркурий|Юпитер|Сатурн|Луна|Солнце|Нептун|Уран|Плутон/g;
        const planets = new Set<string>();
        for (const asp of day.key_aspects ?? []) {
          const matches = asp.match(planetPattern) ?? [];
          matches.forEach(m => planets.add(m));
        }
        setCompPlanets(Array.from(planets));
      }
    }).catch(() => {
      // fallback: use empty
    });
  }, [tab]);

  const hasBirth = !!(birth.date && birth.lat && birth.lon);

  return (
    <div className="space-y-4">
      {/* Top tab navigation */}
      <div className={`rounded-2xl border p-1 ${isDark ? 'border-white/10 bg-white/3' : 'border-black/8 bg-black/2'}`}>
        <div className="flex gap-1 flex-wrap">
          {TABS.map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium rounded-xl border transition-all ${tab === t.key ? theme.tabActive : theme.tabInactive}`}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      {tab === 'overview' && (
        <AstroSummaryBlock theme={theme} />
      )}

      {tab === 'transits' && (
        hasBirth
          ? <PredictiveExpanded birth={birth} theme={theme} />
          : (
            <div className={`rounded-2xl border p-12 text-center ${theme.card}`}>
              <Star className={`h-10 w-10 mx-auto mb-3 ${theme.symbol} opacity-30`} />
              <p className={`${theme.text} text-sm`}>
                Для транзитов и прогрессий нужны данные рождения.<br />
                Заполните форму выше и пересчитайте натальную карту.
              </p>
            </div>
          )
      )}

      {tab === 'solar-return' && (
        hasBirth
          ? <SolarReturnBlock birth={birth} theme={theme} />
          : (
            <div className={`rounded-2xl border p-12 text-center ${theme.card}`}>
              <Star className={`h-10 w-10 mx-auto mb-3 ${theme.symbol} opacity-30`} />
              <p className={`${theme.text} text-sm`}>
                Для Соляра нужны данные рождения.<br />
                Заполните форму выше и пересчитайте натальную карту.
              </p>
            </div>
          )
      )}

      {tab === 'compensatorics' && (
        <CompensatoricsPanel
          keyAspects={compAspects}
          energy={compEnergy}
          activePlanets={compPlanets}
          isDark={isDark}
          theme={theme}
          sunSign={(birth as { sun_sign?: string }).sun_sign ?? compSunSign}
        />
      )}

      {tab === 'subscription' && (
        <SubscriptionPanel isDark={isDark} theme={theme} />
      )}
    </div>
  );
}
