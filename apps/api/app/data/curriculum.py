"""
Curriculum whitelist data for SSC Bangladesh (Classes 9-10).
This module provides strict topic boundaries so the LLM cannot drift
into pedagogical or off-syllabus territory.
"""

from typing import Dict, List

# ─── SSC Class 9 Topic Whitelists ─────────────────────────────────────────────

SSC_CLASS_9_MATH: List[str] = [
    "Sets and Functions",
    "Real Numbers",
    "Algebraic Expressions",
    "Linear Equations in One Variable",
    "Linear Equations in Two Variables",
    "Simultaneous Linear Equations",
    "Quadratic Equations",
    "Ratio and Proportion",
    "Indices and Logarithms",
    "Geometry: Lines, Angles, Triangles",
    "Congruence of Triangles",
    "Similarity of Triangles",
    "Pythagoras Theorem",
    "Circles and Tangents",
    "Area and Perimeter",
    "Surface Area and Volume",
    "Statistics: Mean, Median, Mode",
    "Probability",
    "Trigonometric Ratios",
    "Trigonometric Identities",
    "Heights and Distances",
]

SSC_CLASS_9_PHYSICS: List[str] = [
    "Physical Quantities and Measurement",
    "Motion and Rest",
    "Speed, Velocity and Acceleration",
    "Newton's Laws of Motion",
    "Gravitation and Gravity",
    "Work, Energy and Power",
    "Pressure in Solids, Liquids and Gases",
    "Sound: Vibration, Frequency, Wave",
    "Light: Reflection, Refraction",
    "Heat and Temperature",
    "Expansion of Matter",
    "Electricity: Current, Voltage, Resistance",
    "Ohm's Law and Circuits",
    "Magnetic Effects of Electric Current",
    "Modern Physics and Radioactivity",
]

SSC_CLASS_9_CHEMISTRY: List[str] = [
    "Matter and Its Classification",
    "Atomic Structure",
    "Periodic Table",
    "Chemical Bonding",
    "Chemical Reactions and Equations",
    "Acids, Bases and Salts",
    "Mole Concept",
    "Solutions and Solubility",
    "Electrolysis",
    "Metals and Non-metals",
    "Hydrocarbons and Organic Chemistry Basics",
    "Environmental Chemistry",
    "Water: Properties and Treatment",
]

SSC_CLASS_9_BIOLOGY: List[str] = [
    "Biology and Its Branches",
    "Cell Structure and Function",
    "Cell Division: Mitosis and Meiosis",
    "Classification of Living Organisms",
    "Kingdom Plantae",
    "Kingdom Animalia",
    "Nutrition in Plants and Animals",
    "Transport in Plants and Animals",
    "Gaseous Exchange and Respiration",
    "Excretory System",
    "Firmness and Locomotion",
    "Co-ordination: Nervous and Hormonal",
    "Reproduction in Plants and Animals",
    "Heredity and Evolution",
    "Biotechnology",
    "Ecology and Environment",
]

SSC_CLASS_9_HIGHER_MATH: List[str] = [
    "Sets and Relations",
    "Functions and Graphs",
    "Algebraic Formulas and Identities",
    "Polynomials",
    "Linear Inequalities",
    "Quadratic Equations and Graphs",
    "Arithmetic Progression",
    "Geometric Progression",
    "Coordinate Geometry: Distance, Section Formula",
    "Straight Lines",
    "Trigonometry: All Ratios and Identities",
    "Logarithms",
    "Permutations and Combinations",
    "Binomial Theorem",
    "Statistics: Variance and Standard Deviation",
    "Probability: Classical and Conditional",
]

# ─── Master Registry ──────────────────────────────────────────────────────────

CURRICULUM_REGISTRY: Dict[str, Dict[str, List[str]]] = {
    "SSC": {
        "Math": SSC_CLASS_9_MATH,
        "Mathematics": SSC_CLASS_9_MATH,
        "Physics": SSC_CLASS_9_PHYSICS,
        "Chemistry": SSC_CLASS_9_CHEMISTRY,
        "Biology": SSC_CLASS_9_BIOLOGY,
        "Higher Math": SSC_CLASS_9_HIGHER_MATH,
        "Higher Mathematics": SSC_CLASS_9_HIGHER_MATH,
    }
}


def get_approved_topics(board: str, subject: str) -> List[str]:
    """Return the whitelist of approved topics for a given board and subject."""
    board_data = CURRICULUM_REGISTRY.get(board, {})
    return board_data.get(subject, [])


def get_topic_list_string(board: str, subject: str) -> str:
    """Return a formatted string of approved topics for injection into LLM prompts."""
    topics = get_approved_topics(board, subject)
    if not topics:
        return ""
    return "\n".join(f"  - {t}" for t in topics)


# ─── Subject-specific generation instructions ────────────────────────────────

MATH_GENERATION_RULES = """
CRITICAL MATH RULES:
- Every question MUST contain actual mathematical content: equations, calculations, numeric values, or geometric reasoning.
- Generate problems that require SOLVING, CALCULATING, or COMPUTING.
- Use specific numbers, variables, and expressions (e.g., "Solve 3x + 5 = 20", "Find the area of a triangle with base 8cm and height 5cm").
- For MCQ options, provide 4 plausible numeric/algebraic answers, not descriptive text.
- NEVER generate questions about "the importance of math" or "why we study algebra" or any educational philosophy.
- Questions should resemble a real SSC school exam paper.

EXAMPLE GOOD QUESTIONS:
- "If 3x + 5 = 20, find the value of x." Options: A) 3, B) 5, C) 7, D) 15
- "Find the area of a circle with radius 7 cm. (Use π = 22/7)" Options: A) 44 cm², B) 154 cm², C) 308 cm², D) 22 cm²
- "If tan θ = 3/4, find the value of sin θ." Options: A) 3/5, B) 4/5, C) 3/4, D) 5/3

EXAMPLE BAD QUESTIONS (NEVER GENERATE THESE):
- "What is the importance of algebra in daily life?"
- "Explain the role of geometry in architecture."
- "Why is mathematics important for education?"
"""

PHYSICS_GENERATION_RULES = """
CRITICAL PHYSICS RULES:
- Questions must test understanding of physical laws, formulas, units, and calculations.
- Include numeric problems where appropriate (e.g., "A body of mass 5 kg is moving at 10 m/s. Find its kinetic energy.").
- Test conceptual understanding of Newton's Laws, circuits, optics, thermodynamics etc.
- NEVER ask about "the history of physics education" or "why physics is important".
- Questions should resemble a real SSC board exam.
"""

CHEMISTRY_GENERATION_RULES = """
CRITICAL CHEMISTRY RULES:
- Questions must test understanding of chemical formulas, reactions, atomic structure, the periodic table, and calculations.
- Include balancing equations, mole calculations, pH calculations where appropriate.
- NEVER ask about "the importance of chemistry" or educational philosophy.
- Questions should resemble a real SSC board exam.
"""

BIOLOGY_GENERATION_RULES = """
CRITICAL BIOLOGY RULES:
- Questions must test knowledge of biological processes, cell structures, organ systems, taxonomy, and ecology.
- Include diagram-based conceptual questions (describe what happens during mitosis, photosynthesis steps, etc.).
- NEVER ask about "the importance of biology education" or pedagogical theory.
- Questions should resemble a real SSC board exam.
"""

SUBJECT_RULES: Dict[str, str] = {
    "Math": MATH_GENERATION_RULES,
    "Mathematics": MATH_GENERATION_RULES,
    "Physics": PHYSICS_GENERATION_RULES,
    "Chemistry": CHEMISTRY_GENERATION_RULES,
    "Biology": BIOLOGY_GENERATION_RULES,
    "Higher Math": MATH_GENERATION_RULES,
    "Higher Mathematics": MATH_GENERATION_RULES,
}


def get_subject_rules(subject: str) -> str:
    """Return subject-specific generation rules for the LLM prompt."""
    return SUBJECT_RULES.get(subject, "")
