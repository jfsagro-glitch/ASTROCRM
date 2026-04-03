"""Human Design calculation engine built on Swiss Ephemeris.

This module calculates a practical professional-grade Human Design profile:
- personality and design activations
- gates, lines, colors, tones, bases
- channels and centers
- type, strategy, authority, profile, definition
- incarnation cross descriptor and tailored interpretations
"""

from __future__ import annotations

import math
from datetime import datetime, timedelta
from typing import Any, Dict, List, Tuple

import swisseph as swe


GATE_ORDER = [
    41, 19, 13, 49, 30, 55, 37, 63,
    22, 36, 25, 17, 21, 51, 42, 3,
    27, 24, 2, 23, 8, 20, 16, 35,
    45, 12, 15, 52, 39, 53, 62, 56,
    31, 33, 7, 4, 29, 59, 40, 64,
    47, 6, 46, 18, 48, 57, 32, 50,
    28, 44, 1, 43, 14, 34, 9, 5,
    26, 11, 10, 58, 38, 54, 61, 60,
]

START_DEG = 302.0625
GATE_SPAN = 360.0 / 64.0
LINE_SPAN = GATE_SPAN / 6.0
COLOR_SPAN = LINE_SPAN / 6.0
TONE_SPAN = COLOR_SPAN / 6.0
BASE_SPAN = TONE_SPAN / 5.0

PLANET_SEQUENCE: List[Tuple[str, int | None]] = [
    ("sun", swe.SUN),
    ("earth", None),
    ("north_node", swe.TRUE_NODE),
    ("south_node", None),
    ("moon", swe.MOON),
    ("mercury", swe.MERCURY),
    ("venus", swe.VENUS),
    ("mars", swe.MARS),
    ("jupiter", swe.JUPITER),
    ("saturn", swe.SATURN),
    ("uranus", swe.URANUS),
    ("neptune", swe.NEPTUNE),
    ("pluto", swe.PLUTO),
]

CENTER_DATA = {
    "head": {
        "name": "Head",
        "defined_meaning": "Consistent pressure to inspire, question, and conceptualize.",
        "open_meaning": "Amplifies mental pressure from the environment and samples inspiration.",
    },
    "ajna": {
        "name": "Ajna",
        "defined_meaning": "Reliable way of processing concepts and forming perspective.",
        "open_meaning": "Flexible mind that can see many viewpoints without needing certainty.",
    },
    "throat": {
        "name": "Throat",
        "defined_meaning": "Consistent way of expressing, manifesting, or making energy visible.",
        "open_meaning": "Variable expression; wisdom grows by noticing when to speak and when not to.",
    },
    "g": {
        "name": "G Center",
        "defined_meaning": "Stable identity, direction, and love signature.",
        "open_meaning": "Fluid identity and direction; thrives in correct people and places.",
    },
    "ego": {
        "name": "Ego / Heart",
        "defined_meaning": "Consistent willpower, value, and capacity to commit resources.",
        "open_meaning": "Inconsistent willpower; wisdom comes from not forcing proof or promises.",
    },
    "spleen": {
        "name": "Spleen",
        "defined_meaning": "Stable instinct, immunity, and body awareness in the present.",
        "open_meaning": "Sensitive to fear and wellbeing of others; learns what is healthy to release.",
    },
    "solar": {
        "name": "Solar Plexus",
        "defined_meaning": "Consistent emotional wave and depth of feeling over time.",
        "open_meaning": "Amplifies emotions from others; clarity comes by not avoiding feeling.",
    },
    "sacral": {
        "name": "Sacral",
        "defined_meaning": "Sustainable life-force, work energy, and response capacity.",
        "open_meaning": "Variable access to workforce energy; wisdom lies in rest and discernment.",
    },
    "root": {
        "name": "Root",
        "defined_meaning": "Steady pressure to start, evolve, and move through stress.",
        "open_meaning": "Amplifies stress pressure; mastery comes from pacing instead of rushing.",
    },
}

TYPE_DATA = {
    "Generator": {
        "strategy": "Wait to respond",
        "signature": "Satisfaction",
        "not_self": "Frustration",
        "description": "Your life force works best when it answers what is already in front of you rather than forcing initiation.",
    },
    "Manifesting Generator": {
        "strategy": "Wait to respond, then inform",
        "signature": "Satisfaction",
        "not_self": "Frustration and anger",
        "description": "You are fast, multi-directional, and efficient when you respond first and then move with informed action.",
    },
    "Manifestor": {
        "strategy": "Inform before initiating",
        "signature": "Peace",
        "not_self": "Anger",
        "description": "You are here to initiate movement independently, with less resistance when others are informed first.",
    },
    "Projector": {
        "strategy": "Wait for recognition and invitation",
        "signature": "Success",
        "not_self": "Bitterness",
        "description": "Your gift is guidance and system-seeing; the strongest opportunities arrive through recognition.",
    },
    "Reflector": {
        "strategy": "Wait a lunar cycle",
        "signature": "Surprise",
        "not_self": "Disappointment",
        "description": "You mirror the health of your environment and gain clarity over time rather than in the moment.",
    },
}

AUTHORITY_DATA = {
    "Emotional": "Emotional clarity emerges over time. There is no truth in the heat of the wave.",
    "Sacral": "Your truth is in the body response: immediate expansion, vitality, or a clear no.",
    "Splenic": "Your truth is quiet, immediate instinct in the present moment.",
    "Ego": "Your truth comes from what you genuinely have the will and desire to commit to.",
    "Self-Projected": "Your truth appears when you hear yourself speak from identity and direction.",
    "Mental": "Clarity comes through environment, conversation, and correct sounding boards rather than inner certainty.",
    "Lunar": "Clarity comes across time and cycles; sampling the full lunar movement is key.",
}

LINE_DATA = {
    1: {"name": "Investigator", "theme": "builds security through study and foundations"},
    2: {"name": "Hermit", "theme": "offers natural gifts that mature through retreat and call-outs"},
    3: {"name": "Martyr", "theme": "learns through trial, error, and resilient adaptation"},
    4: {"name": "Opportunist", "theme": "creates influence through network, trust, and community"},
    5: {"name": "Heretic", "theme": "projects practical solutions and carries collective expectations"},
    6: {"name": "Role Model", "theme": "matures through phases into detached wisdom and example"},
}

GATE_DATA: Dict[int, Dict[str, str]] = {
    1: {"name": "Creativity", "keynote": "creative self-expression", "description": "Brings original expression, aesthetic force, and authentic contribution."},
    2: {"name": "Direction", "keynote": "inner orientation", "description": "Sets the course through receptivity, direction, and attunement."},
    3: {"name": "Ordering", "keynote": "mutation through chaos", "description": "Transforms confusion into new order through adaptation."},
    4: {"name": "Answers", "keynote": "mental formulation", "description": "Searches for workable explanations and conceptual solutions."},
    5: {"name": "Rhythms", "keynote": "natural timing", "description": "Establishes dependable patterns, routines, and energetic cadence."},
    6: {"name": "Friction", "keynote": "emotional boundaries", "description": "Creates intimacy and clarity through emotional discernment."},
    7: {"name": "Leadership", "keynote": "direction for the group", "description": "Guides collective direction through role awareness and strategy."},
    8: {"name": "Contribution", "keynote": "individual style", "description": "Adds distinct style and influence through unique contribution."},
    9: {"name": "Focus", "keynote": "concentration", "description": "Applies sustained attention to the small steps that matter."},
    10: {"name": "Behavior of the Self", "keynote": "self-alignment", "description": "Expresses authentic behavior, self-love, and lived integrity."},
    11: {"name": "Ideas", "keynote": "conceptual abundance", "description": "Produces many stories, images, and possibilities for sharing."},
    12: {"name": "Caution", "keynote": "social timing", "description": "Knows when expression is ripe and when silence is stronger."},
    13: {"name": "The Listener", "keynote": "memory and witness", "description": "Holds stories, history, and the lessons of shared experience."},
    14: {"name": "Power Skills", "keynote": "resource power", "description": "Generates fuel for prosperity, work, and empowered direction."},
    15: {"name": "Extremes", "keynote": "humanity and range", "description": "Moves through rhythms of extremes with deep love for humanity."},
    16: {"name": "Skills", "keynote": "mastery through practice", "description": "Develops talent through repetition, enthusiasm, and refinement."},
    17: {"name": "Opinions", "keynote": "logical patterning", "description": "Forms structured viewpoints from observed patterns and logic."},
    18: {"name": "Correction", "keynote": "improvement instinct", "description": "Sees what can be refined, fixed, or made healthier."},
    19: {"name": "Sensitivity", "keynote": "needs and closeness", "description": "Feels needs acutely and negotiates contact, support, and belonging."},
    20: {"name": "The Now", "keynote": "present-moment expression", "description": "Voices what is true in the immediate moment."},
    21: {"name": "Control", "keynote": "managing resources", "description": "Directs material resources and boundaries with decisive will."},
    22: {"name": "Grace", "keynote": "mood and openness", "description": "Creates refined emotional presence, charm, and social grace."},
    23: {"name": "Assimilation", "keynote": "structuring insight", "description": "Turns inner knowing into clear, digestible expression."},
    24: {"name": "Rationalization", "keynote": "return and contemplation", "description": "Revisits insight until it becomes mentally integrated."},
    25: {"name": "Innocence", "keynote": "universal love", "description": "Acts from purity, trust, and spirit-led openness."},
    26: {"name": "Salesmanship", "keynote": "influence and memory", "description": "Packages value persuasively and knows what will move others."},
    27: {"name": "Caring", "keynote": "nourishment", "description": "Protects life through responsible care and material support."},
    28: {"name": "Struggle", "keynote": "purpose through challenge", "description": "Finds meaning by engaging worthy battles and existential truth."},
    29: {"name": "Perseverance", "keynote": "sacred yes", "description": "Commits deeply and discovers through full-bodied experience."},
    30: {"name": "Feelings", "keynote": "desire and intensity", "description": "Generates emotional intensity, longing, and experiential passion."},
    31: {"name": "Influence", "keynote": "democratic leadership", "description": "Leads through recognized voice and collective trust."},
    32: {"name": "Continuity", "keynote": "instinct for what lasts", "description": "Detects what has future viability and what does not."},
    33: {"name": "Privacy", "keynote": "retreat and reflection", "description": "Withdraws to process experience and return with distilled wisdom."},
    34: {"name": "Power", "keynote": "pure sacral force", "description": "Provides raw life-force power for movement and embodiment."},
    35: {"name": "Change", "keynote": "progress through experience", "description": "Seeks new experiences and learns through transition."},
    36: {"name": "Crisis", "keynote": "emotional turbulence", "description": "Navigates uncertainty through emotional depth and adaptation."},
    37: {"name": "Friendship", "keynote": "tribal bonds", "description": "Builds family, loyalty, agreements, and emotional support structures."},
    38: {"name": "The Fighter", "keynote": "opposition with purpose", "description": "Pushes against what lacks meaning and defends what matters."},
    39: {"name": "Provocation", "keynote": "emotional ignition", "description": "Provokes spirit, mood, and depth through catalytic pressure."},
    40: {"name": "Deliverance", "keynote": "work and aloneness", "description": "Balances service to the tribe with the need for rest and autonomy."},
    41: {"name": "Contraction", "keynote": "imagination and beginning", "description": "Begins cycles through desire, fantasy, and emotional fuel."},
    42: {"name": "Growth", "keynote": "completion", "description": "Finishes processes and matures experience into development."},
    43: {"name": "Insight", "keynote": "inner knowing", "description": "Produces breakthrough knowing that often precedes understanding."},
    44: {"name": "Alertness", "keynote": "pattern memory", "description": "Recognizes recurring patterns and social or material opportunities."},
    45: {"name": "Gathering", "keynote": "stewardship", "description": "Organizes resources and voices the needs of the tribe."},
    46: {"name": "Embodiment", "keynote": "love of the body", "description": "Finds right place and right timing through embodied presence."},
    47: {"name": "Realization", "keynote": "mental alchemy", "description": "Turns confusion into realization through pressure and reflection."},
    48: {"name": "Depth", "keynote": "well of solutions", "description": "Carries practical depth and fear of inadequacy that drives mastery."},
    49: {"name": "Principles", "keynote": "revolution of values", "description": "Changes bonds and agreements when core values are crossed."},
    50: {"name": "Values", "keynote": "custodianship", "description": "Protects what sustains the tribe through ethics and responsibility."},
    51: {"name": "Shock", "keynote": "initiation", "description": "Catalyzes awakening through courage, surprise, and competitive spirit."},
    52: {"name": "Stillness", "keynote": "concentration through restraint", "description": "Holds energy still so focus can become powerful."},
    53: {"name": "Beginnings", "keynote": "starting cycles", "description": "Opens developmental cycles that need time to mature."},
    54: {"name": "Ambition", "keynote": "drive to rise", "description": "Transforms material ambition into evolutionary momentum."},
    55: {"name": "Spirit", "keynote": "emotional abundance", "description": "Moves through moods that reveal spirit, freedom, and faith."},
    56: {"name": "Stimulation", "keynote": "storytelling", "description": "Animates ideas through narrative, curiosity, and experience-sharing."},
    57: {"name": "Intuitive Clarity", "keynote": "survival instinct", "description": "Perceives subtle truth instantly through sharpened instinct."},
    58: {"name": "Joy", "keynote": "vitality for improvement", "description": "Brings zest, life-enhancement, and pressure to make things better."},
    59: {"name": "Intimacy", "keynote": "breaking barriers", "description": "Creates bonding, fertility, and closeness by dissolving defenses."},
    60: {"name": "Limitation", "keynote": "mutation through constraints", "description": "Accepts limits so real innovation can occur."},
    61: {"name": "Inner Truth", "keynote": "mystery pressure", "description": "Seeks the unknowable and is driven toward inner certainty."},
    62: {"name": "Details", "keynote": "precision", "description": "Names specifics and builds trustworthy understanding through detail."},
    63: {"name": "Doubt", "keynote": "testing patterns", "description": "Questions assumptions to strengthen logic and proof."},
    64: {"name": "Confusion", "keynote": "pressure before clarity", "description": "Carries abstract pressure that resolves into perspective over time."},
}

GATE_ENCYCLOPEDIA: Dict[int, str] = {
    1: "Original creation and authentic style. Psychologically this gate matures when self-expression is lived as discipline rather than performance.",
    2: "Receptive inner direction and orientation. Practical strength appears when direction is allowed to emerge from response, place, and timing.",
    3: "Mutation through early disorder and adaptive restructuring. Its mastery is patience with chaotic starts until living order forms.",
    4: "Conceptual answers and mental formulation. The healthy expression tests ideas in reality before claiming certainty.",
    5: "Rhythm, routine, and energetic cadence. This gate stabilizes life through repeatable patterns and protected recovery cycles.",
    6: "Emotional boundary management and relational threshold control. Intimacy becomes healthy when contact is paced and explicitly negotiated.",
    7: "Strategic leadership for the collective. Influence is strongest when service to group direction replaces egoic control.",
    8: "Individual contribution with visible social relevance. Practical power comes from making unique talent concretely useful.",
    9: "Concentration on critical detail. This gate excels through narrowed focus and completion of small essential steps.",
    10: "Behavior aligned with personal integrity. It regulates self-respect, embodied ethics, and consistent decision conduct.",
    11: "High-volume idea generation and conceptual imagery. Maturity requires curation: fewer ideas executed deeply.",
    12: "Social timing and emotionally correct expression. Silence is strategic when timing is not yet ripe for impact.",
    13: "Witnessing memory and narrative listening. This gate turns lived stories into pattern wisdom when emotional load is bounded.",
    14: "Resource power and meaningful productivity. It channels workforce energy toward direction that creates durable value.",
    15: "Humanity through rhythmic extremes. Psychological growth comes from honoring variability without collapsing consistency.",
    16: "Skill acquisition through repetition and enthusiasm. Mastery is procedural: deliberate practice, feedback, refinement.",
    17: "Logical opinion and pattern framing. Its practical excellence is structured thinking with intellectual humility.",
    18: "Corrective instinct and system improvement. Constructive diagnosis must accompany critique for this gate to stay healthy.",
    19: "Sensitivity to needs, support, and belonging. Clear agreements around reciprocity prevent emotional depletion.",
    20: "Present-moment articulation and manifestation. Spontaneity becomes precise when anchored in authority.",
    21: "Resource control, boundaries, and executive stewardship. It works best under explicit responsibility and accountability.",
    22: "Emotional grace and social openness. Contact quality depends on mood timing and emotional congruence.",
    23: "Assimilation and clear translation of insight. The practical gift is simplifying complexity without losing essence.",
    24: "Mental return and integration loops. Reflection becomes productive when it moves from rumination to application.",
    25: "Universal love and principled innocence. Its mature expression is open-hearted discernment rather than naive exposure.",
    26: "Persuasion, memory, and strategic influence. Ethical framing determines whether impact becomes service or manipulation.",
    27: "Nourishment, care, and protective responsibility. Sustainability requires boundaries so caregiving remains regenerative.",
    28: "Purpose through meaningful struggle. This gate thrives when life force is invested only in worthy battles.",
    29: "The sacred yes and deep commitment. Practical growth requires selective commitment to avoid overextension.",
    30: "Desire intensity and emotional appetite for experience. Maturity is full feeling with lower attachment to outcomes.",
    31: "Recognized influence and representative leadership. Authority is most effective when entrusted by the collective.",
    32: "Instinct for continuity and viability. It detects what can endure and where strategic investment should go.",
    33: "Retreat, privacy, and reflective distillation. Wisdom becomes transferable only after protected integration cycles.",
    34: "Pure life-force power and rapid embodiment. Correct use depends on response alignment before force deployment.",
    35: "Change through experiential progression. Completion of one cycle before seeking another is the core discipline.",
    36: "Crisis navigation and emotional adaptation. Turbulence becomes intelligence when processed instead of dramatized.",
    37: "Tribal bonding, agreements, and mutual support. Healthy loyalty requires explicit reciprocity and relational contracts.",
    38: "Purposeful opposition and selective resistance. Power grows when conflict is reserved for meaningful stakes.",
    39: "Provocative pressure that awakens emotional truth. Conscious provocation can catalyze depth rather than chaos.",
    40: "Work-service balance with restorative solitude. Contract clarity protects both contribution and personal recovery.",
    41: "Cycle initiation through desire and imagination. It selects which fantasy becomes lived narrative investment.",
    42: "Completion energy and developmental closure. This gate converts process endings into integrated growth.",
    43: "Breakthrough insight preceding consensus. Impact depends on timing and contextual framing of disruptive knowing.",
    44: "Pattern memory and social opportunity detection. It reads recurring dynamics and chooses strategic alliances.",
    45: "Stewardship of shared resources and tribal voice. Mature expression is transparent governance and fair distribution.",
    46: "Embodiment, place, and timing through the body. Somatic alignment becomes a practical navigation system.",
    47: "Mental alchemy from confusion to realization. Clarity matures through pressure, sequencing, and reflective patience.",
    48: "Depth of solution and competence pressure. Skill confidence grows through applied practice, not endless preparation.",
    49: "Values revolution and boundary reset. It reforms agreements when core principles are structurally violated.",
    50: "Custodianship, ethics, and continuity standards. This gate protects long-cycle wellbeing in families and systems.",
    51: "Initiation through shock and courageous disruption. It awakens dormant potential by breaking comfort patterns.",
    52: "Stillness that enables sustained concentration. Holding energy in place unlocks high-quality deep work.",
    53: "Beginning force for developmental cycles. Structural follow-through is required so starts become outcomes.",
    54: "Ambition and strategic ascent in material life. The mature form ties growth goals to values and discipline.",
    55: "Spirit and emotional atmosphere of freedom. Mood literacy is the practical key to stable expression.",
    56: "Narrative stimulation and idea storytelling. Communication works best when stories transmit actionable meaning.",
    57: "Immediate intuitive clarity and survival sensing. Trust sharpens when instinct is validated against context.",
    58: "Vital pressure to improve life quality. Constructive channeling prevents perfectionism and over-correction.",
    59: "Barrier dissolution and intimate bonding force. Selective openness with boundaries preserves relational health.",
    60: "Limitation as container for mutation. Real innovation appears when constraints are accepted and utilized.",
    61: "Mystery pressure and search for inner truth. This gate matures through inquiry without rigid dogma.",
    62: "Precision, detail, and operational language. It builds trust by naming specifics clearly and consistently.",
    63: "Doubt that stress-tests logic. Its gift is verification and error prevention in decision systems.",
    64: "Abstract pressure before narrative coherence. Insight forms nonlinearly and should not be forced prematurely.",
}

CHANNEL_DATA = [
    {"gates": (64, 47), "name": "Abstraction", "centers": ("head", "ajna"), "summary": "Transforms past experience into realized understanding."},
    {"gates": (61, 24), "name": "Awareness", "centers": ("head", "ajna"), "summary": "Seeks inner truth and rationalizes mystery into insight."},
    {"gates": (63, 4), "name": "Logic", "centers": ("head", "ajna"), "summary": "Tests patterns and formulates answers through doubt."},
    {"gates": (17, 62), "name": "Acceptance", "centers": ("ajna", "throat"), "summary": "Expresses logical opinions with precise detail."},
    {"gates": (43, 23), "name": "Structuring", "centers": ("ajna", "throat"), "summary": "Voices inner knowing in unexpectedly transformative ways."},
    {"gates": (11, 56), "name": "Curiosity", "centers": ("ajna", "throat"), "summary": "Shares stimulating ideas and stories with others."},
    {"gates": (31, 7), "name": "The Alpha", "centers": ("throat", "g"), "summary": "Leads by recognized influence and directional guidance."},
    {"gates": (8, 1), "name": "Inspiration", "centers": ("throat", "g"), "summary": "Models creative individuality through visible contribution."},
    {"gates": (33, 13), "name": "The Prodigal", "centers": ("throat", "g"), "summary": "Withdraws, reflects, and then shares lessons from experience."},
    {"gates": (10, 20), "name": "Awakening", "centers": ("g", "throat"), "summary": "Lives and speaks authentic behavior in the now."},
    {"gates": (20, 57), "name": "The Brainwave", "centers": ("throat", "spleen"), "summary": "Voices immediate intuitive awareness in the present."},
    {"gates": (16, 48), "name": "The Wavelength", "centers": ("throat", "spleen"), "summary": "Turns depth into practiced talent and masterful expression."},
    {"gates": (12, 22), "name": "Openness", "centers": ("throat", "solar"), "summary": "Expresses emotional mood through refined social presence."},
    {"gates": (35, 36), "name": "Transitoriness", "centers": ("throat", "solar"), "summary": "Seeks change and learns through emotional experience."},
    {"gates": (45, 21), "name": "Money", "centers": ("throat", "ego"), "summary": "Directs resources and material power for the tribe."},
    {"gates": (25, 51), "name": "Initiation", "centers": ("g", "ego"), "summary": "Awakens spirit through courage, innocence, and shock."},
    {"gates": (46, 29), "name": "Discovery", "centers": ("g", "sacral"), "summary": "Finds growth through full-bodied commitment and experience."},
    {"gates": (15, 5), "name": "Rhythm", "centers": ("g", "sacral"), "summary": "Aligns life through natural timing, extremes, and flow."},
    {"gates": (2, 14), "name": "The Beat", "centers": ("g", "sacral"), "summary": "Channels resources into empowered direction and purpose."},
    {"gates": (10, 57), "name": "Perfected Form", "centers": ("g", "spleen"), "summary": "Embodies intuitive survival and correct bodily behavior."},
    {"gates": (10, 34), "name": "Exploration", "centers": ("g", "sacral"), "summary": "Lives self-empowerment through autonomous sacral movement."},
    {"gates": (26, 44), "name": "Surrender", "centers": ("ego", "spleen"), "summary": "Uses instinctive memory and persuasive force for influence."},
    {"gates": (37, 40), "name": "Community", "centers": ("solar", "ego"), "summary": "Builds tribal agreements, family bonds, and reciprocal support."},
    {"gates": (27, 50), "name": "Preservation", "centers": ("sacral", "spleen"), "summary": "Protects and nourishes life through responsible care."},
    {"gates": (34, 57), "name": "Power", "centers": ("sacral", "spleen"), "summary": "Unites primal power with sharp instinct in the now."},
    {"gates": (59, 6), "name": "Mating", "centers": ("sacral", "solar"), "summary": "Creates bonding and intimacy through emotional chemistry."},
    {"gates": (42, 53), "name": "Maturation", "centers": ("sacral", "root"), "summary": "Carries cycles from beginning to completion and growth."},
    {"gates": (3, 60), "name": "Mutation", "centers": ("sacral", "root"), "summary": "Transforms limitation into new life patterns and change."},
    {"gates": (9, 52), "name": "Concentration", "centers": ("sacral", "root"), "summary": "Holds still focus long enough for mastery to develop."},
    {"gates": (18, 58), "name": "Judgment", "centers": ("spleen", "root"), "summary": "Improves life through corrective pressure and vitality."},
    {"gates": (28, 38), "name": "Struggle", "centers": ("spleen", "root"), "summary": "Finds purpose by fighting for meaning that is worth it."},
    {"gates": (32, 54), "name": "Transformation", "centers": ("spleen", "root"), "summary": "Uses ambition and instinct to evolve material potential."},
    {"gates": (19, 49), "name": "Synthesis", "centers": ("root", "solar"), "summary": "Reforms bonds and support structures through need and principle."},
    {"gates": (39, 55), "name": "Emoting", "centers": ("root", "solar"), "summary": "Provokes spirit and emotional depth through mood pressure."},
    {"gates": (41, 30), "name": "Recognition of Feelings", "centers": ("root", "solar"), "summary": "Begins emotional experience through desire and imagination."},
    {"gates": (34, 20), "name": "Charisma", "centers": ("sacral", "throat"), "summary": "Turns sacral power directly into visible action in the moment."},
]

CHANNEL_ENCYCLOPEDIA: Dict[str, str] = {
    "64-47": "Transforms abstract confusion into coherent realization through retrospective processing and mental synthesis.",
    "61-24": "Cycles mystery pressure into inner certainty through repeated contemplation and conceptual integration.",
    "63-4": "Tests patterns with doubt and converts uncertainty into structured, testable answers.",
    "17-62": "Organizes opinions into precise language; ideal for documentation, specification, and logical communication.",
    "43-23": "Converts disruptive insight into transmissible form; timing determines whether it is rejected or transformative.",
    "11-56": "Animates ideas through stories and conceptual movement, creating social learning through narrative.",
    "31-7": "Represents collective direction through recognized influence and role-based leadership.",
    "8-1": "Expresses unique identity as practical contribution, influencing culture through visible originality.",
    "33-13": "Processes collective memory through retreat and later storytelling, turning experience into usable wisdom.",
    "10-20": "Expresses authentic behavior in real time; alignment and immediacy become one channel of action.",
    "20-57": "Voices intuitive truth in the present moment with rapid situational sensing.",
    "16-48": "Converts depth into practiced mastery through repetition, competence pressure, and refinement.",
    "12-22": "Channels emotional mood into social expression; communication quality depends on emotional timing.",
    "35-36": "Drives growth through emotionally charged experience and adaptive transitions.",
    "45-21": "Manages material resources through executive control, stewardship, and boundary authority.",
    "25-51": "Initiates awakening through shock, courage, and high-voltage transformative pressure.",
    "46-29": "Discovers truth through embodied commitment and full participation in life experience.",
    "15-5": "Regulates life rhythm across extremes, supporting long-cycle sustainability and energetic coherence.",
    "2-14": "Aligns resource power with inner direction, creating purpose-driven productivity.",
    "10-57": "Embodies intuitive correctness in behavior, merging somatic truth and personal conduct.",
    "10-34": "Channels autonomous empowerment through direct sacral movement and self-directed action.",
    "26-44": "Combines instinctive memory with persuasive influence; ethical intent determines quality of impact.",
    "37-40": "Builds community through agreements, reciprocity, and mature tribal exchange structures.",
    "27-50": "Protects continuity through responsible care, nourishment, and value-based support systems.",
    "34-57": "Unites primal power with immediate instinct for fast, high-stakes decision capacity.",
    "59-6": "Creates intimacy by dissolving barriers while negotiating emotional boundary sensitivity.",
    "42-53": "Carries developmental cycles from initiation to completion, integrating growth through closure.",
    "3-60": "Mutates under limitation, producing innovation through structured constraints.",
    "9-52": "Focuses concentrated energy into precise execution and durable deep work.",
    "18-58": "Improves systems through corrective vitality, turning critique into practical uplift.",
    "28-38": "Finds meaning through purposeful struggle and selective confrontation with adversity.",
    "32-54": "Transforms ambition through instinctive timing and strategic material evolution.",
    "19-49": "Reconfigures bonds and norms through need sensitivity and principled boundary resets.",
    "39-55": "Provokes emotional spirit and depth, revealing authenticity through mood dynamics.",
    "41-30": "Initiates experiential arcs through desire and emotional imagination.",
    "34-20": "Manifests sacral life force directly into visible present-moment action.",
}


def _norm(lon: float) -> float:
    return lon % 360.0


def _opposite(lon: float) -> float:
    return _norm(lon + 180.0)


def _planet_lon(jd_ut: float, body: int) -> float:
    result, _ = swe.calc_ut(jd_ut, body, swe.FLG_MOSEPH | swe.FLG_SPEED)
    return _norm(float(result[0]))


def _gate_from_lon(lon: float) -> Dict[str, Any]:
    offset = (lon - START_DEG) % 360.0
    gate_idx = int(offset // GATE_SPAN)
    gate_num = GATE_ORDER[gate_idx]
    gate_remainder = offset - gate_idx * GATE_SPAN
    line = min(6, int(gate_remainder // LINE_SPAN) + 1)
    line_remainder = gate_remainder - (line - 1) * LINE_SPAN
    color = min(6, int(line_remainder // COLOR_SPAN) + 1)
    color_remainder = line_remainder - (color - 1) * COLOR_SPAN
    tone = min(6, int(color_remainder // TONE_SPAN) + 1)
    tone_remainder = color_remainder - (tone - 1) * TONE_SPAN
    base = min(5, int(tone_remainder // BASE_SPAN) + 1)
    gate_info = GATE_DATA[gate_num]
    return {
        "gate": gate_num,
        "line": line,
        "color": color,
        "tone": tone,
        "base": base,
        "name": gate_info["name"],
        "keynote": gate_info["keynote"],
        "description": gate_info["description"],
    }


def _jd_from_local(date_str: str, time_str: str, utc_offset: float) -> float:
    date_part = datetime.strptime(f"{date_str} {time_str}", "%Y-%m-%d %H:%M:%S" if len(time_str.split(":")) == 3 else "%Y-%m-%d %H:%M")
    utc_dt = date_part - timedelta(hours=utc_offset)
    hour = utc_dt.hour + utc_dt.minute / 60.0 + utc_dt.second / 3600.0
    return swe.julday(utc_dt.year, utc_dt.month, utc_dt.day, hour)


def _datetime_from_jd_local(jd_ut: float, utc_offset: float) -> Dict[str, str]:
    y, m, d, hour = swe.revjul(jd_ut, swe.GREG_CAL)
    utc_dt = datetime(y, m, d) + timedelta(hours=hour)
    local_dt = utc_dt + timedelta(hours=utc_offset)
    return {
        "date_utc": utc_dt.strftime("%Y-%m-%d"),
        "time_utc": utc_dt.strftime("%H:%M:%S"),
        "date_local": local_dt.strftime("%Y-%m-%d"),
        "time_local": local_dt.strftime("%H:%M:%S"),
    }


def _unwrapped_sun_lon(jd_ut: float, birth_sun_lon: float) -> float:
    lon = _planet_lon(jd_ut, swe.SUN)
    if lon > birth_sun_lon:
        lon -= 360.0
    return lon


def _design_jd(birth_jd: float) -> float:
    birth_sun = _planet_lon(birth_jd, swe.SUN)
    target = birth_sun - 88.0
    low = birth_jd - 110.0
    high = birth_jd - 70.0
    for _ in range(60):
        mid = (low + high) / 2.0
        current = _unwrapped_sun_lon(mid, birth_sun)
        if current > target:
            low = mid
        else:
            high = mid
    return (low + high) / 2.0


def _activation_for_planet(planet: str, lon: float, side: str) -> Dict[str, Any]:
    gate_data = _gate_from_lon(lon)
    return {
        "planet": planet,
        "longitude": round(lon, 6),
        "side": side,
        **gate_data,
        "label": f"{gate_data['gate']}.{gate_data['line']}.{gate_data['color']}.{gate_data['tone']}.{gate_data['base']}",
    }


def _all_activations(jd_ut: float, side: str) -> List[Dict[str, Any]]:
    activations: List[Dict[str, Any]] = []
    cached: Dict[str, float] = {}
    for planet_name, body in PLANET_SEQUENCE:
        if planet_name == "earth":
            lon = _opposite(cached["sun"])
        elif planet_name == "south_node":
            lon = _opposite(cached["north_node"])
        else:
            lon = _planet_lon(jd_ut, body)
            cached[planet_name] = lon
        activations.append(_activation_for_planet(planet_name, lon, side))
    return activations


def _build_active_gates(personality: List[Dict[str, Any]], design: List[Dict[str, Any]]) -> Dict[int, Dict[str, Any]]:
    active: Dict[int, Dict[str, Any]] = {}
    for activation in personality + design:
        gate = activation["gate"]
        side = activation["side"]
        bucket = active.setdefault(gate, {
            "gate": gate,
            "name": activation["name"],
            "keynote": activation["keynote"],
            "description": activation["description"],
            "personality": [],
            "design": [],
        })
        bucket[side].append({
            "planet": activation["planet"],
            "line": activation["line"],
            "color": activation["color"],
            "tone": activation["tone"],
            "base": activation["base"],
            "label": activation["label"],
        })
    for gate_num, gate_data in active.items():
        gate_data["encyclopedic"] = _gate_encyclopedic_text(
            gate_num,
            gate_data["name"],
            gate_data["keynote"],
            gate_data["description"],
            len(gate_data["personality"]),
            len(gate_data["design"]),
        )
    return active


def _gate_encyclopedic_text(gate_num: int, gate_name: str, keynote: str, description: str, personality_count: int, design_count: int) -> str:
    _ = (gate_name, keynote, description, personality_count, design_count)
    return GATE_ENCYCLOPEDIA.get(gate_num, GATE_DATA[gate_num]["description"])


def _center_encyclopedic_text(center_key: str, defined: bool, active_gates: List[int], channels: List[str]) -> str:
    center_name = CENTER_DATA[center_key]["name"]
    state = "defined" if defined else "open"
    base_meaning = CENTER_DATA[center_key]["defined_meaning"] if defined else CENTER_DATA[center_key]["open_meaning"]
    gate_text = ", ".join(str(g) for g in active_gates) if active_gates else "none"
    channel_text = ", ".join(channels) if channels else "none"
    return (
        f"{center_name} is {state} in this bodygraph. {base_meaning} "
        f"From an encyclopedic perspective, this center regulates a stable axis of psychological and energetic behavior over time. "
        f"Active gates here: {gate_text}. Full channels anchoring this center: {channel_text}. "
        f"Practical reading principle: evaluate this center through decision strategy and context, not as a fixed personality label."
    )


def _channel_encyclopedic_text(channel: Dict[str, Any], active_gates: Dict[int, Dict[str, Any]]) -> str:
    _ = active_gates
    gate_a, gate_b = channel["gates"]
    return CHANNEL_ENCYCLOPEDIA.get(f"{gate_a}-{gate_b}", channel["summary"])


def _gate_to_centers() -> Dict[int, List[str]]:
    mapping: Dict[int, List[str]] = {}
    for channel in CHANNEL_DATA:
        a, b = channel["gates"]
        c1, c2 = channel["centers"]
        mapping.setdefault(a, []).append(c1)
        mapping.setdefault(a, []).append(c2)
        mapping.setdefault(b, []).append(c1)
        mapping.setdefault(b, []).append(c2)
    return {k: sorted(set(v)) for k, v in mapping.items()}


GATE_CENTERS = _gate_to_centers()


def _defined_channels(active_gates: Dict[int, Dict[str, Any]]) -> List[Dict[str, Any]]:
    active_set = set(active_gates)
    defined = []
    for channel in CHANNEL_DATA:
        a, b = channel["gates"]
        if a in active_set and b in active_set:
            defined.append({
                **channel,
                "label": f"{a}-{b}",
                "encyclopedic": _channel_encyclopedic_text(channel, active_gates),
            })
    return defined


def _defined_centers(defined_channels: List[Dict[str, Any]], active_gates: Dict[int, Dict[str, Any]]) -> List[Dict[str, Any]]:
    by_center = {key: {"defined": False, "channels": [], "active_gates": []} for key in CENTER_DATA}
    for gate in active_gates:
        for center in GATE_CENTERS.get(gate, []):
            by_center[center]["active_gates"].append(gate)
    for channel in defined_channels:
        for center in channel["centers"]:
            by_center[center]["defined"] = True
            by_center[center]["channels"].append(channel["label"])
    return [
        {
            "key": key,
            "name": CENTER_DATA[key]["name"],
            "defined": data["defined"],
            "active_gates": sorted(set(data["active_gates"])),
            "channels": data["channels"],
            "interpretation": CENTER_DATA[key]["defined_meaning"] if data["defined"] else CENTER_DATA[key]["open_meaning"],
            "encyclopedic": _center_encyclopedic_text(
                key,
                data["defined"],
                sorted(set(data["active_gates"])),
                data["channels"],
            ),
        }
        for key, data in by_center.items()
    ]


def _definition(defined_channels: List[Dict[str, Any]], centers: List[Dict[str, Any]]) -> str:
    defined_center_keys = {center["key"] for center in centers if center["defined"]}
    if not defined_center_keys:
        return "None"
    graph = _center_graph(defined_channels, defined_center_keys)

    components = 0
    seen: set[str] = set()
    for node in defined_center_keys:
        if node in seen:
            continue
        components += 1
        stack = [node]
        while stack:
            current = stack.pop()
            if current in seen:
                continue
            seen.add(current)
            stack.extend(graph[current] - seen)

    if components <= 1:
        return "Single Definition"
    if components == 2:
        return "Split Definition"
    if components == 3:
        return "Triple Split Definition"
    return "Quadruple Split Definition"


def _center_graph(defined_channels: List[Dict[str, Any]], nodes: set[str]) -> Dict[str, set[str]]:
    graph: Dict[str, set[str]] = {key: set() for key in nodes}
    for channel in defined_channels:
        a, b = channel["centers"]
        if a in graph and b in graph:
            graph[a].add(b)
            graph[b].add(a)
    return graph


def _connected(graph: Dict[str, set[str]], start: str, target: str) -> bool:
    if start not in graph or target not in graph:
        return False
    stack = [start]
    seen: set[str] = set()
    while stack:
        current = stack.pop()
        if current == target:
            return True
        if current in seen:
            continue
        seen.add(current)
        stack.extend(graph[current] - seen)
    return False


def _type_and_authority(defined_channels: List[Dict[str, Any]], centers: List[Dict[str, Any]]) -> Dict[str, str]:
    center_map = {center["key"]: center["defined"] for center in centers}
    defined_center_keys = {center["key"] for center in centers if center["defined"]}
    graph = _center_graph(defined_channels, defined_center_keys)

    def throat_connected_to(center_key: str) -> bool:
        return _connected(graph, "throat", center_key)

    if not any(center_map.values()):
        hd_type = "Reflector"
    else:
        throat_connected_to_motor = any(throat_connected_to(center) for center in ("sacral", "ego", "solar", "root"))
        if center_map["sacral"]:
            hd_type = "Manifesting Generator" if throat_connected_to_motor else "Generator"
        elif throat_connected_to_motor:
            hd_type = "Manifestor"
        else:
            hd_type = "Projector"

    if hd_type == "Reflector":
        authority = "Lunar"
    elif center_map["solar"]:
        authority = "Emotional"
    elif center_map["sacral"]:
        authority = "Sacral"
    elif center_map["spleen"]:
        authority = "Splenic"
    elif center_map["ego"]:
        authority = "Ego"
    elif center_map["g"] and throat_connected_to("g"):
        authority = "Self-Projected"
    else:
        authority = "Mental"

    type_data = TYPE_DATA[hd_type]
    return {
        "type": hd_type,
        "strategy": type_data["strategy"],
        "signature": type_data["signature"],
        "not_self": type_data["not_self"],
        "type_description": type_data["description"],
        "authority": authority,
        "authority_description": AUTHORITY_DATA[authority],
    }


def _profile(personality_sun: Dict[str, Any], design_sun: Dict[str, Any]) -> Dict[str, str]:
    profile = f"{personality_sun['line']}/{design_sun['line']}"
    left_profiles = {"4/6", "5/1", "5/2", "6/2", "6/3"}
    right_profiles = {"1/3", "1/4", "2/4", "2/5", "3/5", "3/6"}
    if profile == "4/1":
        angle = "Juxtaposition"
    elif profile in left_profiles:
        angle = "Left Angle"
    elif profile in right_profiles:
        angle = "Right Angle"
    else:
        angle = "Right Angle"
    p_line = LINE_DATA[personality_sun["line"]]
    d_line = LINE_DATA[design_sun["line"]]
    return {
        "profile": profile,
        "profile_name": f"{profile} {p_line['name']} / {d_line['name']}",
        "angle": angle,
        "description": f"Conscious line {personality_sun['line']} {p_line['theme']}; unconscious line {design_sun['line']} {d_line['theme']}.",
    }


def _cross(personality_sun: Dict[str, Any], personality_earth: Dict[str, Any], design_sun: Dict[str, Any], design_earth: Dict[str, Any], profile_data: Dict[str, str]) -> Dict[str, Any]:
    angle = profile_data["angle"]
    cross_name = f"{angle} Cross of {personality_sun['name']} and {design_sun['name']}"
    gates = [
        {"role": "Personality Sun", "gate": personality_sun["gate"], "line": personality_sun["line"], "name": personality_sun["name"]},
        {"role": "Personality Earth", "gate": personality_earth["gate"], "line": personality_earth["line"], "name": personality_earth["name"]},
        {"role": "Design Sun", "gate": design_sun["gate"], "line": design_sun["line"], "name": design_sun["name"]},
        {"role": "Design Earth", "gate": design_earth["gate"], "line": design_earth["line"], "name": design_earth["name"]},
    ]
    description = (
        f"Your incarnation theme blends conscious purpose in Gate {personality_sun['gate']} {personality_sun['name']} "
        f"with grounding in Gate {personality_earth['gate']} {personality_earth['name']}, while the design side adds "
        f"Gate {design_sun['gate']} {design_sun['name']} and Gate {design_earth['gate']} {design_earth['name']}."
    )
    return {
        "name": cross_name,
        "angle": angle,
        "gates": gates,
        "description": description,
    }


def calc_human_design(date: str, time: str, lat: float, lon: float, utc: float) -> Dict[str, Any]:
    birth_jd = _jd_from_local(date, time, utc)
    design_jd = _design_jd(birth_jd)

    personality = _all_activations(birth_jd, "personality")
    design = _all_activations(design_jd, "design")
    active_gates = _build_active_gates(personality, design)
    defined_channels = _defined_channels(active_gates)
    centers = _defined_centers(defined_channels, active_gates)
    type_data = _type_and_authority(defined_channels, centers)

    personality_map = {item["planet"]: item for item in personality}
    design_map = {item["planet"]: item for item in design}
    profile_data = _profile(personality_map["sun"], design_map["sun"])
    definition = _definition(defined_channels, centers)
    cross = _cross(
        personality_map["sun"], personality_map["earth"],
        design_map["sun"], design_map["earth"],
        profile_data,
    )

    return {
        "metadata": {
            "birth": {
                "date": date,
                "time": time,
                "lat": lat,
                "lon": lon,
                "utc": utc,
                "jd_ut": round(birth_jd, 6),
            },
            "design": {
                **_datetime_from_jd_local(design_jd, utc),
                "jd_ut": round(design_jd, 6),
            },
        },
        "overview": {
            **type_data,
            **profile_data,
            "definition": definition,
        },
        "incarnation_cross": cross,
        "centers": centers,
        "channels": defined_channels,
        "activations": {
            "personality": personality,
            "design": design,
        },
        "gates": sorted(active_gates.values(), key=lambda item: item["gate"]),
        "statistics": {
            "defined_centers": sum(1 for center in centers if center["defined"]),
            "defined_channels": len(defined_channels),
            "active_gates": len(active_gates),
        },
    }