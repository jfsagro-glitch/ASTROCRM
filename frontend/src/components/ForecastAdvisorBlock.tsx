/**
 * ForecastAdvisorBlock — Unified predictive synthesis.
 * Combines annual profection + solar ingress + eclipse + Saturn cycle
 * into ONE actionable block: interpretation + sphere advice + compensatory practices.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { RefreshCw, AlertTriangle, Zap, ChevronDown, ChevronUp } from 'lucide-react';
import {
  getAnnualProfection,   AnnualProfectionResult,
  getIngressPersonal,    IngressPersonalResult,
  getEclipsePersonal,    EclipsePersonalResult,
  getSaturnCycle,        SaturnCycleResult,
} from '../services/astrologyService';
import type { BirthInput } from '../types/astro';

// ─────────────────────────────────────────────────────────────────────────────
// Types
// ─────────────────────────────────────────────────────────────────────────────

interface Practice {
  emoji: string;
  title: string;
  body: string;
  category: 'физическое' | 'ментальное' | 'ритуал' | 'творческое' | 'социальное';
  timing: string;
  intent: 'активация' | 'нейтрализация';
}

interface ThemeLike {
  card: string; header: string; text: string; accent: string; btn: string; symbol: string;
}

interface Props {
  birth: BirthInput;
  theme: ThemeLike;
}

// ─────────────────────────────────────────────────────────────────────────────
// Lookup tables
// ─────────────────────────────────────────────────────────────────────────────

const SIGN_RU: Record<string, string> = {
  aries:'Овен', taurus:'Телец', gemini:'Близнецы', cancer:'Рак',
  leo:'Лев', virgo:'Дева', libra:'Весы', scorpio:'Скорпион',
  sagittarius:'Стрелец', capricorn:'Козерог', aquarius:'Водолей', pisces:'Рыбы',
};
const PLANET_RU: Record<string, string> = {
  sun:'Солнце', moon:'Луна', mercury:'Меркурий', venus:'Венера', mars:'Марс',
  jupiter:'Юпитер', saturn:'Сатурн', uranus:'Уран', neptune:'Нептун', pluto:'Плутон',
  node:'Сев. Узел', lilith:'Лилит',
};
const PLANET_GLYPH: Record<string, string> = {
  sun:'☉', moon:'☽', mercury:'☿', venus:'♀', mars:'♂',
  jupiter:'♃', saturn:'♄', uranus:'⛢', neptune:'♆', pluto:'♇',
  node:'☊', lilith:'⚸',
};
const HOUSE_THEME: Record<number, string> = {
  1:'Личность', 2:'Ресурсы', 3:'Коммуникации', 4:'Дом и семья',
  5:'Творчество', 6:'Здоровье и труд', 7:'Партнёрство', 8:'Трансформация',
  9:'Расширение', 10:'Карьера', 11:'Сообщество', 12:'Уединение',
};
const CATEGORY_COLOR: Record<string, string> = {
  'физическое': 'border-red-500/30 bg-red-500/8 text-red-300',
  'ментальное': 'border-sky-500/30 bg-sky-500/8 text-sky-300',
  'ритуал': 'border-violet-500/30 bg-violet-500/8 text-violet-300',
  'творческое': 'border-amber-500/30 bg-amber-500/8 text-amber-300',
  'социальное': 'border-emerald-500/30 bg-emerald-500/8 text-emerald-300',
};

// ─────────────────────────────────────────────────────────────────────────────
// Compensatory practices by annual lord
// ─────────────────────────────────────────────────────────────────────────────

const LORD_PRACTICES: Record<string, Practice[]> = {
  sun: [
    { emoji:'☀️', title:'Утренний ритуал с огнём', body:'Зажгите свечу на рассвете. 5 минут смотрите на огонь — без телефона, без мыслей о делах. Это активирует солнечную энергию и задаёт тон дню.', category:'ритуал', timing:'каждое утро', intent:'активация' },
    { emoji:'🌟', title:'Золото и жёлтый', body:'Добавьте в гардероб жёлтый или золотой акцент — галстук, шарф, украшение. Цвет Солнца усиливает харизму и помогает вас замечать.', category:'творческое', timing:'по желанию', intent:'активация' },
    { emoji:'🏆', title:'Один шаг к признанию', body:'Раз в неделю сделайте что-то, что выражает вашу уникальность публично: пост, выступление, демонстрация работы. Солнечный год требует видимости.', category:'социальное', timing:'раз в неделю', intent:'активация' },
    { emoji:'🧘', title:'Спина и сердце', body:'Год Солнца нагружает сердечно-сосудистую систему и спину. Плавание, йога, прогулки на свежем воздухе — обязательный минимум.', category:'физическое', timing:'ежедневно', intent:'нейтрализация' },
  ],
  moon: [
    { emoji:'🌊', title:'Контакт с водой', body:'Купание, долгий душ, прогулка у воды — лунная энергия питается через водную стихию. Раз в неделю минимум 20 минут у воды восстанавливает эмоциональный баланс.', category:'физическое', timing:'раз в неделю', intent:'активация' },
    { emoji:'📓', title:'Дневник сновидений', body:'Держите блокнот у постели. Лунный год говорит через сны — записывайте образы сразу после пробуждения. Повторяющиеся символы указывают на то, что требует вашего внимания.', category:'ментальное', timing:'каждое утро', intent:'активация' },
    { emoji:'🌕', title:'Ритуал полнолуния', body:'В полнолуние выйдите на свежий воздух. Напишите на бумаге, что хотите отпустить — и сожгите. Лунный год особенно чувствителен к лунным циклам.', category:'ритуал', timing:'раз в месяц', intent:'нейтрализация' },
    { emoji:'🥗', title:'Питание по ритмам', body:'Эмоциональные перепады в лунный год часто связаны с питанием. Сократите сахар и алкоголь в дни новолуния — вы удивитесь, насколько стабильнее станет настроение.', category:'физическое', timing:'новолуние', intent:'нейтрализация' },
  ],
  mercury: [
    { emoji:'✍️', title:'Утренние страницы', body:'3 страницы от руки каждое утро — без редактуры, просто поток сознания. Меркурий в год Меркурия работает на полную. Дайте ему канал.', category:'ментальное', timing:'каждое утро', intent:'активация' },
    { emoji:'📚', title:'Один курс или книга', body:'Выберите тему, которая давно интересовала — и пройдите курс или прочитайте 3-4 книги подряд. Год Меркурия питает знания и превращает их в навыки.', category:'ментальное', timing:'раз в квартал', intent:'активация' },
    { emoji:'🗣️', title:'Важные разговоры сейчас', body:'Откладываете трудный разговор? Меркурий-год — лучшее время. Слова ложатся точно, договорённости держатся. Не упустите окно.', category:'социальное', timing:'по ситуации', intent:'активация' },
    { emoji:'🧠', title:'Защита от перегрузки', body:'Меркурий-лорд даёт склонность к информационной перегрузке. Устанавливайте «час тишины» без экранов каждый день. Мозг — тоже мышца.', category:'ментальное', timing:'ежедневно', intent:'нейтрализация' },
  ],
  venus: [
    { emoji:'💐', title:'Живые цветы дома', body:'Свежие цветы дома — не роскошь, а инструмент. Венерианская энергия питается красотой. Розы, пионы, гвоздики — держите хотя бы небольшой букет.', category:'ритуал', timing:'раз в неделю', intent:'активация' },
    { emoji:'🎨', title:'Творческое занятие для души', body:'Рисование, пение, танец, приготовление красивой еды — любое занятие, где есть эстетика. Венера-год без творчества — год с ощущением пустоты.', category:'творческое', timing:'раз в неделю', intent:'активация' },
    { emoji:'🤝', title:'Медное украшение', body:'Медь — металл Венеры. Носите медное украшение или браслет, особенно в важные встречи и переговоры. Это усиливает притягательность и гармонизирует контакт.', category:'ритуал', timing:'по желанию', intent:'активация' },
    { emoji:'💚', title:'Зелёное и розовое', body:'Добавьте в интерьер или гардероб зелёный или нежно-розовый. Венерианские цвета дома создают атмосферу гармонии, снижают тревожность и улучшают отношения.', category:'творческое', timing:'постоянно', intent:'нейтрализация' },
  ],
  mars: [
    { emoji:'🏃', title:'Физическая нагрузка', body:'Марс-год без движения = накопленная агрессия. Минимум 30 минут интенсивного движения ежедневно: бег, единоборства, интервальные тренировки. Тело должно уставать.', category:'физическое', timing:'ежедневно', intent:'нейтрализация' },
    { emoji:'🔪', title:'Точить ножи и инструменты', body:'Это буквальная компенсаторика Марса: заточите ножи, наведите порядок в инструментах, почините то, что давно сломано. Марс любит острое и готовое к действию.', category:'ритуал', timing:'раз в месяц', intent:'активация' },
    { emoji:'🔴', title:'Красный цвет в ключевые дни', body:'В дни важных переговоров или соревнований добавьте красный акцент. Цвет Марса усиливает решимость, снижает нерешительность, добавляет силы.', category:'ритуал', timing:'по ситуации', intent:'активация' },
    { emoji:'🌿', title:'Выход злости через тело', body:'Конфликт неизбежен в Марс-год. Правило: прежде чем ответить в конфликте — 10 отжиманий или быстрая прогулка. Физический сброс снимает деструктивность.', category:'физическое', timing:'по ситуации', intent:'нейтрализация' },
  ],
  jupiter: [
    { emoji:'🌍', title:'Одно путешествие', body:'Юпитер-год без расширения горизонтов — упущенная возможность. Запланируйте хотя бы одну поездку в новое место. Расстояние не важно — важна новизна.', category:'физическое', timing:'раз в год', intent:'активация' },
    { emoji:'📖', title:'Углублённое обучение', body:'Выберите одну серьёзную область и погрузитесь: курс, программа, наставник. Юпитер щедр на знания — используйте. Профессиональная экспертиза растёт именно в этот год.', category:'ментальное', timing:'весь год', intent:'активация' },
    { emoji:'💛', title:'Синий и золотой', body:'Цвета Юпитера — синий (сапфировый) и золотой. Добавьте их в интерьер или гардероб. В переговорах синий цвет вызывает доверие и ощущение масштаба.', category:'творческое', timing:'постоянно', intent:'активация' },
    { emoji:'🙏', title:'Щедрость как практика', body:'Юпитер работает через принцип «даю — получаю». Раз в неделю сделайте что-то бескорыстное: помогите, поделитесь, поддержите. Это активирует юпитерианскую удачу.', category:'социальное', timing:'раз в неделю', intent:'активация' },
  ],
  saturn: [
    { emoji:'📋', title:'Еженедельный план', body:'Сатурн-год требует структуры. Каждое воскресенье — 15 минут на план недели. Не расписание по минутам, но 3-5 ключевых задач. Это даёт Сатурну то, что он требует.', category:'ментальное', timing:'раз в неделю', intent:'нейтрализация' },
    { emoji:'🦴', title:'Кости и суставы', body:'Сатурн управляет костной системой. В его год следите за осанкой, принимайте кальций и витамин D, не пренебрегайте болями в спине и суставах — тело сигнализирует рано.', category:'физическое', timing:'ежедневно', intent:'нейтрализация' },
    { emoji:'⚫', title:'Одно «нет» в неделю', body:'Сатурн-год учит отказывать. Найдите одно дело, обязательство или отношение, которое давно пора отпустить — и откажитесь. Освободившее место заполнится достойным.', category:'ментальное', timing:'раз в неделю', intent:'нейтрализация' },
    { emoji:'🕯️', title:'Ритуал подведения итогов', body:'В конце каждого месяца — 30 минут письма себе: что сделано, что не сделано, чему научил месяц. Сатурн вознаграждает за честность с собой.', category:'ритуал', timing:'раз в месяц', intent:'активация' },
  ],
  uranus: [
    { emoji:'⚡', title:'Нарушить одну рутину', body:'Каждую неделю — что-то принципиально новое: другой маршрут, новое блюдо, незнакомый жанр музыки. Уран-год питается от непредсказуемости. Не сопротивляйтесь переменам.', category:'физическое', timing:'раз в неделю', intent:'активация' },
    { emoji:'💻', title:'Технологическое обновление', body:'Уран управляет технологиями. Освойте один новый инструмент или платформу, который давно откладывали. Это год для цифрового роста и нестандартных решений.', category:'ментальное', timing:'раз в квартал', intent:'активация' },
    { emoji:'🔵', title:'Электрический синий', body:'Яркий синий, электрик — цвет Урана. В напряжённые моменты, когда всё идёт не по плану, оденьте что-то этого цвета. Напоминание: хаос — это новый порядок в процессе рождения.', category:'ритуал', timing:'по ситуации', intent:'нейтрализация' },
    { emoji:'🧘', title:'Заземление при потрясениях', body:'Уран даёт непредвиденное. Когда жизнь встряхивает — ноги на землю буквально: стойте босиком на траве или земле 5-10 минут. Это не эзотерика — это простая нейтрализация тревоги.', category:'физическое', timing:'по ситуации', intent:'нейтрализация' },
  ],
  neptune: [
    { emoji:'🌊', title:'Медитация у воды', body:'Нептун-год открывает интуицию, но может замутить реальность. Медитация у воды (речка, море, даже ванна) 2-3 раза в неделю даёт ясность и питает интуицию без потери почвы под ногами.', category:'ритуал', timing:'несколько раз в неделю', intent:'активация' },
    { emoji:'🎵', title:'Музыка как лекарство', body:'Нептун управляет музыкой. Подберите плейлист для каждого состояния: подъём, концентрация, расслабление. Нептун-год особенно отзывчив к звуку — используйте это осознанно.', category:'творческое', timing:'ежедневно', intent:'активация' },
    { emoji:'🌿', title:'Трезвость как практика', body:'Нептун создаёт иллюзии и тягу к побегу от реальности. Алкоголь и другие «отключалки» в нептунианский год работают сильнее и опаснее. Осознанная трезвость — лучшая защита.', category:'физическое', timing:'постоянно', intent:'нейтрализация' },
    { emoji:'📝', title:'Фиксируйте договорённости', body:'Нептун растворяет чёткость. Все устные договорённости записывайте и подтверждайте письменно. Это не паранойя — это гигиена нептунианского года.', category:'ментальное', timing:'по ситуации', intent:'нейтрализация' },
  ],
  pluto: [
    { emoji:'🖤', title:'Работа с психологом или телесным практиком', body:'Плутон-год выводит на поверхность то, что было спрятано. Психотерапия, расстановки, телесные практики — всё, что помогает встретиться с тенью — принесёт трансформацию, а не разрушение.', category:'ментальное', timing:'регулярно', intent:'активация' },
    { emoji:'🗑️', title:'Очищение пространства', body:'Вещи, которые вам не нужны, держат вас в прошлом. Раз в месяц — решительная уборка: что-то выбросьте, отдайте, сожгите. Плутон поощряет за готовность отпускать.', category:'физическое', timing:'раз в месяц', intent:'нейтрализация' },
    { emoji:'🦅', title:'Принятие неизбежного', body:'В плутонический год попытки удержать уходящее стоят слишком дорого. Практика: выберите одну ситуацию, которую пытаетесь контролировать — и намеренно отпустите. Посмотрите, что будет.', category:'ментальное', timing:'по ситуации', intent:'нейтрализация' },
    { emoji:'💎', title:'Тёмные цвета как защита', body:'Чёрный, тёмно-бордовый, тёмно-синий — цвета Плутона. В напряжённые периоды года эти цвета в одежде создают ощущение внутренней силы и неуязвимости.', category:'ритуал', timing:'по ситуации', intent:'активация' },
  ],
  node: [
    { emoji:'🧭', title:'Движение в страхе', body:'Северный Узел указывает на зону роста — туда, куда страшно. Раз в неделю делайте одно небольшое действие в направлении, которое вам некомфортно. Это буквально ваш путь.', category:'ментальное', timing:'раз в неделю', intent:'активация' },
    { emoji:'🌱', title:'Отказ от привычного', body:'Год Узла — не время для привычных паттернов. Замечайте, когда вы делаете что-то «как всегда» — и пробуйте альтернативу. Рост требует отказа от старых стратегий выживания.', category:'ментальное', timing:'постоянно', intent:'нейтрализация' },
  ],
  lilith: [
    { emoji:'🌑', title:'Принятие тёмного желания', body:'Лилит-год выводит вытесненные желания. Честно запишите в личный дневник: «Чего я хочу, но стыжусь хотеть?» Признание без осуждения — уже 80% работы с Лилит.', category:'ментальное', timing:'по ощущению', intent:'активация' },
    { emoji:'🔥', title:'Телесная свобода', body:'Лилит живёт в теле. Танец, движение без правил, пение — дайте телу делать то, что хочет, без контроля. 15 минут в неделю. Это высвобождает энергию, которая иначе становится деструктивной.', category:'физическое', timing:'раз в неделю', intent:'нейтрализация' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// House-based sphere advice
// ─────────────────────────────────────────────────────────────────────────────

const HOUSE_SPHERE_ADVICE: Record<number, Record<string, string>> = {
  1:  { love:'Вы привлекательны как никогда — не прячьтесь. Позвольте себе быть увиденным и выбранным.', work:'Время заявить о себе: новый проект, смена роли, повышение. Инициатива вознаграждается.', health:'Год тела — займитесь им наконец. Новый вид спорта, режим сна, изменение питания дадут плоды.', finance:'Доходы зависят от вашей личной активности — пассивного заработка мало, нужны личные усилия.', creative:'Авторство и подпись под своими работами — ваше слово. Год для творческого старта.' },
  2:  { love:'Любовь требует безопасности и стабильности — убедитесь, что партнёр разделяет ваши ценности.', work:'Финансовый рост через профессиональную ценность. Поднимите цены или попросите о повышении.', health:'Питание и режим — основа года. Тело — ваш главный ресурс, инвестируйте в него.', finance:'Год ревизии финансов: что тратите впустую? Создайте подушку безопасности.', creative:'Монетизация творчества — реальна. Craft и мастерство приносят доход.' },
  3:  { love:'Общение — ключ к близости. Говорите о том, что чувствуете. Молчание создаёт дистанцию.', work:'Сети, контакты, переговоры — ваш инструмент. Записывайтесь на профессиональные мероприятия.', health:'Нервная система под нагрузкой. Медитация, меньше экранного времени, прогулки.', finance:'Доход через информацию, посредничество, обучение. Ищите партнёров.', creative:'Пишите, снимайте, ведите блог. Слово — ваш творческий инструмент года.' },
  4:  { love:'Семейные отношения в центре. Пригласите партнёра глубже в ваш внутренний мир.', work:'Работа из дома или семейный бизнес — резонирует с энергией года. Не игнорируйте нутро.', health:'Дом — место восстановления. Создайте зону отдыха без гаджетов и рабочих мыслей.', finance:'Инвестиции в недвижимость или дом — в резонансе. Не торопитесь с кредитами.', creative:'Домашние проекты, интерьер, сад — ваш творческий канал года.' },
  5:  { love:'Романтика, флирт, страсть — всё доступно. Не анализируйте, просто проживайте.', work:'Играйте: смелые идеи, творческие решения, нестандартные ходы — они работают.', health:'Радость — лучшее лекарство. Что приносит вам удовольствие? Делайте это чаще.', finance:'Риск оправдан, но осознанный. Азартные игры — не вариант. Творческие вложения — да.', creative:'Кульминация творческого потенциала. Создавайте, показывайте, публикуйте.' },
  6:  { love:'Забота выражается в деталях: внимание к здоровью партнёра, совместный ЗОЖ укрепляет связь.', work:'Оптимизируйте процессы. Автоматизируйте рутину. Делегируйте лишнее.', health:'Год тела и режима. Медицинский чек-ап обязателен. Хроническое — требует внимания сейчас.', finance:'Доход от услуг, здоровья, сервиса. Инвестируйте в здоровье — окупится многократно.', creative:'Ремесло и функциональное творчество — ваш путь. Польза + красота.' },
  7:  { love:'Отношения в центре всего. Либо союз крепнет на новом уровне, либо требует пересмотра. Честность важнее комфорта.', work:'Партнёрства, контракты, совместные проекты — время их создавать и укреплять.', health:'Не игнорируйте потребности партнёра в уходе — это зеркало ваших собственных потребностей.', finance:'Совместные финансы, деловые союзы — в фокусе. Проверьте все действующие договоры.', creative:'Со-творчество: создавайте вместе. Дуэты и коллаборации дают лучший результат.' },
  8:  { love:'Интимность на глубинном уровне. Если отношения поверхностны — год их встряхнёт.', work:'Финансы, инвестиции, трансформация рабочих процессов. Хороший год для рефинансирования.', health:'Психосоматика активна. Тело говорит о том, что не принято в психике. Слушайте.', finance:'Наследство, кредиты, чужие ресурсы — в движении. Осторожно с долгами.', creative:'Тёмное, глубокое, трансформирующее творчество. Год для работы с тенью.' },
  9:  { love:'Партнёр из другой культуры, города или взглядов — особенно притягателен. Общий рост объединяет.', work:'Зарубежные связи, обучение, публикации — открыты двери. Думайте масштабно.', health:'Свежий воздух, движение, расширение — тело просит пространства. Активный отдых.', finance:'Международные возможности, образовательные инвестиции — в резонансе.', creative:'Философское, большое, значимое творчество. Ваш голос слышен дальше обычного.' },
  10: { love:'Публичный образ влияет на отношения. Успех в карьере притягивает или отпугивает — будьте собой.', work:'Год максимальных карьерных возможностей. Используйте каждую. Имя создаётся сейчас.', health:'Тело несёт нагрузку амбиций. Не работайте в ущерб сну и восстановлению.', finance:'Карьерный рост = финансовый рост. Инвестиции в профессиональный образ окупаются.', creative:'Публичное творчество, сцена, признание — время заявить о себе громко.' },
  11: { love:'Друзья и сообщества — источник встреч. Ваш партнёр может быть среди единомышленников.', work:'Коллаборации, сетевые проекты, командная работа — эффективнее одиночной игры.', health:'Социальная активность питает. Изоляция истощает. Общение — это здоровье.', finance:'Коллективные инвестиции, краудфандинг, сетевые бизнесы — в резонансе.', creative:'Коллективные проекты, арт-сообщества, взаимная поддержка — ваш путь.' },
  12: { love:'Любовь требует уединения и глубины. Поверхностное не удовлетворяет. Время для сакральной близости.', work:'Работа за кулисами, скрытые проекты, исследования — продуктивнее публичных усилий.', health:'Психическое здоровье — приоритет. Терапия, медитация, уединение. Телу нужен отдых.', finance:'Скрытые доходы и расходы требуют ревизии. Осторожно с тайными схемами.', creative:'Духовное, интуитивное, архетипическое творчество. Создавайте из глубины.' },
};

// ─────────────────────────────────────────────────────────────────────────────
// Saturn phase overlay practices
// ─────────────────────────────────────────────────────────────────────────────

const SATURN_PHASE_PRACTICES: Record<string, Practice[]> = {
  conjunction: [
    { emoji:'📊', title:'Честный аудит жизни', body:'Сатурн вернулся — значит пора расплачиваться по счетам и собирать урожай. Составьте таблицу: 5 главных областей жизни — где честно вложились, где халтурили? Это не самобичевание, это инвентаризация.', category:'ментальное', timing:'сейчас', intent:'нейтрализация' },
    { emoji:'🏗️', title:'Строить на прочном', body:'Всё, что создадите в Возврат Сатурна — останется надолго. Делайте только то, за что готовы нести полную ответственность. Половинчатые решения Сатурн не принимает.', category:'ментальное', timing:'весь период', intent:'активация' },
  ],
  opposition: [
    { emoji:'⚖️', title:'Интеграция полярностей', body:'Оппозиция Сатурна показывает, где вы живёте в крайностях. Найдите одну пару противоположностей в своей жизни (работа/отдых, контроль/свобода) и осознанно ищите середину.', category:'ментальное', timing:'весь период', intent:'нейтрализация' },
    { emoji:'🪞', title:'Зеркало другого', body:'Период оппозиции активирует отношения как зеркало. Что раздражает в других — часто ваш собственный непринятый аспект. Практика: запишите 3 качества, которые бесят в людях, и ищите их в себе.', category:'ментальное', timing:'раз в неделю', intent:'активация' },
  ],
  square_1: [
    { emoji:'🧱', title:'Первые настоящие стены', body:'Первый квадрат встречает вас с реальностью ограничений. Это не провал — это взросление. Практика: для каждого ограничения найдите, чему оно учит, а не от чего мешает.', category:'ментальное', timing:'по ситуации', intent:'нейтрализация' },
  ],
  square_2: [
    { emoji:'🔄', title:'Что переосмыслить', body:'Квадрат зрелости — время пересмотреть правила, по которым вы живёте. Какое убеждение о работе, успехе или отношениях давно устарело? Запишите его — и сознательно замените.', category:'ментальное', timing:'сейчас', intent:'нейтрализация' },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// Synthesis helpers
// ─────────────────────────────────────────────────────────────────────────────

function buildSynthesisNarrative(
  profection: AnnualProfectionResult,
  ingress: IngressPersonalResult | null,
  eclipse: EclipsePersonalResult | null,
  saturn: SaturnCycleResult | null,
): string {
  const house = profection.annual_house;
  const lord  = profection.annual_lord;
  const lordName = PLANET_RU[lord] ?? lord;
  const houseTheme = HOUSE_THEME[house] ?? '';

  const currentIng = ingress?.ingresses.find(i => {
    if (!i.ingress_date) return false;
    const d = new Date(i.ingress_date.slice(0, 10));
    return Date.now() - d.getTime() >= 0 && Date.now() - d.getTime() <= 30 * 86400000;
  });

  const nextEcl = eclipse?.eclipses.find(e => {
    const d = new Date(e.date_str);
    return d.getTime() > Date.now();
  });

  const saturnActive = saturn?.milestones.find(m => {
    const d = new Date(m.date_utc.slice(0, 10));
    return Math.abs(d.getTime() - Date.now()) <= 365 * 86400000;
  });

  let text = `Ваш год под управлением ${lordName} — это год тем ${houseTheme.toLowerCase()}. `;

  if (currentIng) {
    const sunHouseTheme = HOUSE_THEME[currentIng.natal_house] ?? '';
    text += `Прямо сейчас Солнце проходит ваш ${currentIng.natal_house}-й дом — активна зона «${sunHouseTheme.toLowerCase()}». `;
    if (currentIng.natal_house === house) {
      text += `Символично: годовая и текущая тема совпадают — это значит двойной акцент на ${houseTheme.toLowerCase()}. `;
    }
  }

  if (nextEcl) {
    const daysAway = Math.round((new Date(nextEcl.date_str).getTime() - Date.now()) / 86400000);
    const eclTheme = HOUSE_THEME[nextEcl.natal_house] ?? '';
    if (daysAway <= 90) {
      text += `Через ${daysAway} дней — ${nextEcl.type === 'solar' ? 'солнечное' : 'лунное'} затмение в вашем ${nextEcl.natal_house}-м доме (${eclTheme.toLowerCase()}). `;
      text += nextEcl.type === 'solar'
        ? 'Солнечное затмение запускает новый цикл — будьте готовы к началу. '
        : 'Лунное затмение завершает старый цикл — что-то подходит к итогу. ';
    }
  }

  if (saturnActive) {
    const satType = saturnActive.type;
    const satLabel = saturnActive.label;
    text += `Сатурн сейчас в фазе «${satLabel}» — это добавляет в год серьёзность и запрос на структуру. `;
    if (satType === 'conjunction') text += 'Год Возврата Сатурна — время честного пересмотра фундамента. ';
    if (satType === 'opposition') text += 'Оппозиция Сатурна требует баланса между обязанностями и свободой. ';
  }

  return text.trim();
}

function getPractices(
  lord: string,
  saturnMilestone: string | null,
): Practice[] {
  const byLord = LORD_PRACTICES[lord] ?? [];
  const bySaturn = saturnMilestone ? (SATURN_PHASE_PRACTICES[saturnMilestone] ?? []) : [];
  return [...byLord, ...bySaturn];
}

// ─────────────────────────────────────────────────────────────────────────────
// Sub-components
// ─────────────────────────────────────────────────────────────────────────────

function PracticeCard({ p }: { p: Practice }) {
  const [open, setOpen] = useState(false);
  const cc = CATEGORY_COLOR[p.category] ?? 'border-white/20 bg-white/5 text-white/50';
  return (
    <div className={`rounded-xl border ${cc} p-3 transition-all`}>
      <div
        className="flex items-start gap-2 cursor-pointer"
        onClick={() => setOpen(v => !v)}
      >
        <span className="text-xl flex-shrink-0">{p.emoji}</span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-white/90">{p.title}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full border ${
              p.intent === 'активация'
                ? 'border-emerald-500/40 text-emerald-400'
                : 'border-orange-500/40 text-orange-400'
            }`}>
              {p.intent === 'активация' ? '▲ активация' : '▼ нейтрализация'}
            </span>
          </div>
          <div className="text-[10px] opacity-50 mt-0.5">{p.category} · {p.timing}</div>
        </div>
        {open ? <ChevronUp size={14} className="flex-shrink-0 opacity-40 mt-0.5" /> : <ChevronDown size={14} className="flex-shrink-0 opacity-40 mt-0.5" />}
      </div>
      {open && (
        <p className="text-xs text-white/65 leading-relaxed mt-2 pt-2 border-t border-white/10">
          {p.body}
        </p>
      )}
    </div>
  );
}

function SphereRow({ sphere, advice, theme }: { sphere: string; advice: string; theme: ThemeLike }) {
  const [open, setOpen] = useState(false);
  const META: Record<string, { emoji: string; label: string }> = {
    love: { emoji:'❤️', label:'Любовь и отношения' },
    work: { emoji:'💼', label:'Карьера и работа' },
    health: { emoji:'🌿', label:'Здоровье' },
    finance: { emoji:'💰', label:'Финансы' },
    creative: { emoji:'🎨', label:'Творчество' },
  };
  const meta = META[sphere] ?? { emoji:'●', label: sphere };
  return (
    <div
      className={`rounded-xl border ${theme.card} p-3 cursor-pointer hover:bg-white/3 transition-colors`}
      onClick={() => setOpen(v => !v)}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg">{meta.emoji}</span>
        <span className={`text-sm font-medium ${theme.header} flex-1`}>{meta.label}</span>
        {open ? <ChevronUp size={14} className="opacity-30" /> : <ChevronDown size={14} className="opacity-30" />}
      </div>
      {open && (
        <p className={`text-xs ${theme.text} leading-relaxed mt-2 pt-2 border-t border-white/8`}>
          {advice}
        </p>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main component
// ─────────────────────────────────────────────────────────────────────────────

export default function ForecastAdvisorBlock({ birth, theme }: Props) {
  const [profection, setProfection] = useState<AnnualProfectionResult | null>(null);
  const [ingress,    setIngress]    = useState<IngressPersonalResult | null>(null);
  const [eclipse,    setEclipse]    = useState<EclipsePersonalResult | null>(null);
  const [saturn,     setSaturn]     = useState<SaturnCycleResult | null>(null);
  const [loading,    setLoading]    = useState(false);
  const [error,      setError]      = useState<string | null>(null);
  const [practiceFilter, setPracticeFilter] = useState<'все' | 'активация' | 'нейтрализация'>('все');
  const [catFilter, setCatFilter]   = useState<string>('все');

  const today = new Date().toISOString().slice(0, 10);
  const year  = new Date().getFullYear();

  const load = useCallback(async () => {
    if (!birth.date) return;
    setLoading(true); setError(null);
    try {
      const [p, i, e, s] = await Promise.allSettled([
        getAnnualProfection(birth, today),
        getIngressPersonal(birth, year),
        getEclipsePersonal(birth, 6),
        getSaturnCycle(birth, 90),
      ]);
      if (p.status === 'fulfilled') setProfection(p.value);
      else console.warn('profection failed:', p.reason);
      if (i.status === 'fulfilled') setIngress(i.value);
      if (e.status === 'fulfilled') setEclipse(e.value);
      if (s.status === 'fulfilled') setSaturn(s.value);
      if (p.status === 'rejected') setError('Не удалось получить профекции: ' + p.reason?.message);
    } finally {
      setLoading(false);
    }
  }, [birth, today, year]);

  useEffect(() => { load(); }, [load]);

  if (!birth.date) {
    return (
      <div className={`rounded-xl border ${theme.card} p-12 text-center`}>
        <Zap className={`h-12 w-12 mx-auto mb-3 ${theme.symbol} opacity-30`} />
        <p className={`${theme.text} text-sm opacity-60`}>Введите данные рождения для получения персонального прогноза</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="space-y-3">
        {[1,2,3].map(i => <div key={i} className={`rounded-xl border ${theme.card} h-24 animate-pulse`} />)}
        <div className="flex items-center gap-2 justify-center py-4">
          <RefreshCw size={16} className={`${theme.accent} animate-spin`} />
          <span className={`text-sm ${theme.text} opacity-60`}>Загружаем все предиктивные техники…</span>
        </div>
      </div>
    );
  }

  if (error && !profection) {
    return (
      <div className="rounded-xl border border-red-500/30 bg-red-900/20 p-4 flex items-start gap-2">
        <AlertTriangle className="h-4 w-4 text-red-400 mt-0.5" />
        <div>
          <p className="text-red-300 text-sm">{error}</p>
          <button onClick={load} className={`mt-2 text-xs px-3 py-1 rounded-lg ${theme.btn}`}>Повторить</button>
        </div>
      </div>
    );
  }

  if (!profection) return null;

  // Derive key signals
  const lord = profection.annual_lord;
  const house = profection.annual_house;
  const saturnMilestone = (() => {
    if (!saturn) return null;
    const active = saturn.milestones.find(m => {
      const d = new Date(m.date_utc.slice(0, 10));
      return Math.abs(d.getTime() - Date.now()) <= 365 * 86400000;
    });
    return active?.type ?? null;
  })();

  const currentIngress = ingress?.ingresses.find(i => {
    if (!i.ingress_date) return false;
    const d = new Date(i.ingress_date.slice(0, 10));
    return Date.now() - d.getTime() >= 0 && Date.now() - d.getTime() <= 30 * 86400000;
  });

  const nextEclipse = eclipse?.eclipses.find(e => new Date(e.date_str).getTime() > Date.now());

  const narrative = buildSynthesisNarrative(profection, ingress, eclipse, saturn);
  const allPractices = getPractices(lord, saturnMilestone);
  const sphereAdvice = HOUSE_SPHERE_ADVICE[house] ?? {};

  const visiblePractices = allPractices.filter(p => {
    const intentOk = practiceFilter === 'все' || p.intent === practiceFilter;
    const catOk = catFilter === 'все' || p.category === catFilter;
    return intentOk && catOk;
  });

  const categories = Array.from(new Set(allPractices.map(p => p.category)));

  return (
    <div className="space-y-4">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className={`rounded-xl border ${theme.card} p-4`}>
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h2 className={`text-base font-bold font-serif ${theme.header}`}>
              🎯 Астросоветник
            </h2>
            <p className={`text-xs ${theme.text} opacity-50 mt-0.5`}>
              Синтез профекций · затмений · ингрессий · цикла Сатурна
            </p>
          </div>
          <button
            onClick={load}
            disabled={loading}
            className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg ${theme.btn} disabled:opacity-50`}
          >
            <RefreshCw size={12} className={loading ? 'animate-spin' : ''} />
            Обновить
          </button>
        </div>
      </div>

      {/* ── Active signals summary ─────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        {/* Year house */}
        <div className={`rounded-xl border ${theme.card} p-3 text-center`}>
          <div className={`text-2xl font-bold ${theme.accent}`}>
            {house}
          </div>
          <div className={`text-[10px] uppercase tracking-wider opacity-40 ${theme.text}`}>Дом года</div>
          <div className={`text-xs ${theme.header} mt-0.5`}>{HOUSE_THEME[house]}</div>
        </div>

        {/* Lord */}
        <div className={`rounded-xl border ${theme.card} p-3 text-center`}>
          <div className={`text-2xl ${theme.symbol}`}>{PLANET_GLYPH[lord] ?? '●'}</div>
          <div className={`text-[10px] uppercase tracking-wider opacity-40 ${theme.text}`}>Лорд года</div>
          <div className={`text-xs ${theme.header} mt-0.5`}>{PLANET_RU[lord] ?? lord}</div>
        </div>

        {/* Sun now */}
        <div className={`rounded-xl border ${theme.card} p-3 text-center`}>
          <div className={`text-2xl font-bold ${currentIngress ? 'text-amber-400' : theme.text} opacity-${currentIngress ? '100' : '30'}`}>
            {currentIngress ? currentIngress.natal_house : '—'}
          </div>
          <div className={`text-[10px] uppercase tracking-wider opacity-40 ${theme.text}`}>☉ Сейчас</div>
          <div className={`text-xs ${theme.header} mt-0.5`}>
            {currentIngress ? HOUSE_THEME[currentIngress.natal_house] : 'нет данных'}
          </div>
        </div>

        {/* Next eclipse */}
        <div className={`rounded-xl border ${theme.card} p-3 text-center`}>
          <div className={`text-2xl font-bold ${nextEclipse ? 'text-violet-400' : theme.text} opacity-${nextEclipse ? '100' : '30'}`}>
            {nextEclipse ? nextEclipse.natal_house : '—'}
          </div>
          <div className={`text-[10px] uppercase tracking-wider opacity-40 ${theme.text}`}>Затмение</div>
          <div className={`text-xs ${theme.header} mt-0.5`}>
            {nextEclipse ? `${nextEclipse.type === 'solar' ? '☉' : '☽'} ${HOUSE_THEME[nextEclipse.natal_house] ?? ''}` : 'нет данных'}
          </div>
        </div>
      </div>

      {/* Saturn active phase banner */}
      {saturnMilestone && saturn && (() => {
        const sm = saturn.milestones.find(m => m.type === saturnMilestone);
        return sm ? (
          <div className="rounded-xl border border-stone-500/30 bg-stone-500/8 px-4 py-2 flex items-center gap-3">
            <span className="text-xl">♄</span>
            <div>
              <span className="text-xs text-stone-300 font-medium">{sm.label}</span>
              <span className="text-[10px] text-white/35 ml-2">активная фаза цикла Сатурна</span>
            </div>
          </div>
        ) : null;
      })()}

      {/* ── Synthesis narrative ────────────────────────────────────────── */}
      <div className={`rounded-xl border ${theme.card} p-4`}>
        <p className={`text-[10px] font-semibold uppercase tracking-wider opacity-40 mb-2 ${theme.text}`}>
          🔮 Синтез периода
        </p>
        <p className={`text-sm leading-relaxed ${theme.text}`}>{narrative}</p>
      </div>

      {/* ── Sphere recommendations ────────────────────────────────────── */}
      {Object.keys(sphereAdvice).length > 0 && (
        <div className={`rounded-xl border ${theme.card} p-4`}>
          <p className={`text-[10px] font-semibold uppercase tracking-wider opacity-40 mb-3 ${theme.text}`}>
            📌 Рекомендации по сферам
          </p>
          <div className="space-y-2">
            {['love','work','health','finance','creative'].map(sphere => (
              sphereAdvice[sphere] ? (
                <SphereRow
                  key={sphere}
                  sphere={sphere}
                  advice={sphereAdvice[sphere]}
                  theme={theme}
                />
              ) : null
            ))}
          </div>
        </div>
      )}

      {/* ── Compensatory practices ────────────────────────────────────── */}
      <div className={`rounded-xl border ${theme.card} p-4`}>
        <div className="flex items-start justify-between gap-3 flex-wrap mb-3">
          <div>
            <p className={`text-[10px] font-semibold uppercase tracking-wider opacity-40 ${theme.text}`}>
              ⚗️ Компенсаторные практики
            </p>
            <p className={`text-[10px] ${theme.text} opacity-30 mt-0.5`}>
              Для лорда {PLANET_RU[lord] ?? lord}{saturnMilestone ? ' + фаза Сатурна' : ''}
            </p>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-1.5 mb-3">
          {(['все','активация','нейтрализация'] as const).map(f => (
            <button
              key={f}
              onClick={() => setPracticeFilter(f)}
              className={`px-2.5 py-1 rounded-full text-[10px] transition-all ${
                practiceFilter === f
                  ? f === 'активация' ? 'bg-emerald-600 text-white'
                    : f === 'нейтрализация' ? 'bg-orange-600 text-white'
                    : 'bg-white/15 text-white'
                  : 'bg-white/5 text-white/40 hover:text-white/60'
              }`}
            >
              {f === 'активация' ? '▲ Активация' : f === 'нейтрализация' ? '▼ Нейтрализация' : 'Все'}
            </button>
          ))}
          <div className="w-px bg-white/10 mx-1" />
          {['все', ...categories].map(cat => (
            <button
              key={cat}
              onClick={() => setCatFilter(cat)}
              className={`px-2.5 py-1 rounded-full text-[10px] transition-all ${
                catFilter === cat
                  ? 'bg-violet-600 text-white'
                  : 'bg-white/5 text-white/40 hover:text-white/60'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {visiblePractices.length === 0 ? (
          <p className={`text-xs ${theme.text} opacity-40 text-center py-4`}>Нет практик для выбранных фильтров</p>
        ) : (
          <div className="space-y-2">
            {visiblePractices.map((p, i) => (
              <PracticeCard key={`${p.title}-${i}`} p={p} />
            ))}
          </div>
        )}
      </div>

      {/* ── This week focus ───────────────────────────────────────────── */}
      <div className={`rounded-xl border ${theme.card} p-4`}>
        <p className={`text-[10px] font-semibold uppercase tracking-wider opacity-40 mb-3 ${theme.text}`}>
          📅 Фокус на неделю
        </p>
        <div className="space-y-2">
          {[
            { emoji:'1️⃣', text: `Определите одно конкретное действие в зоне «${HOUSE_THEME[house]?.toLowerCase()}» — и сделайте его до конца недели.` },
            { emoji:'2️⃣', text: `Выберите одну практику из списка выше и попробуйте её прямо сегодня.` },
            currentIngress
              ? { emoji:'3️⃣', text: `Солнце в вашем ${currentIngress.natal_house}-м доме — это 30-дневное окно активности. Составьте список из 3 дел именно в этой сфере.` }
              : { emoji:'3️⃣', text: `Запишите, какое из 5 направлений (любовь/работа/здоровье/финансы/творчество) требует первоочередного внимания.` },
            nextEclipse && Math.round((new Date(nextEclipse.date_str).getTime() - Date.now()) / 86400000) <= 60
              ? { emoji:'⚠️', text: `Через ${Math.round((new Date(nextEclipse.date_str).getTime() - Date.now()) / 86400000)} дней — ${nextEclipse.type === 'solar' ? 'солнечное' : 'лунное'} затмение в вашем ${nextEclipse.natal_house}-м доме. Не начинайте важных новых проектов за 2 недели до него.` }
              : { emoji:'4️⃣', text: `Уделите внимание восстановлению: выберите один день на этой неделе полностью без рабочих задач.` },
          ].map((item, i) => (
            <div key={i} className="flex items-start gap-2">
              <span className="text-base flex-shrink-0">{item.emoji}</span>
              <p className={`text-xs ${theme.text} opacity-70 leading-relaxed`}>{item.text}</p>
            </div>
          ))}
        </div>
      </div>

    </div>
  );
}
