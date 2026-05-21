from app.schemas.chat import LearningMode


MODE_INSTRUCTIONS: dict[LearningMode, str] = {
    "explain_simply": "Explain simply for a beginner. Keep it short and plain.",
    "exam_mode": "Answer in board-exam style with key points and formulas.",
    "visual_mode": "Prefer visual explanation when useful. Describe what the visual shows.",
    "step_by_step": "Show the reasoning step by step.",
    "fast_revision": "Give a compact revision answer with formulas and reminders.",
    "challenge_me": "Teach through a short challenge and give a hint before the answer.",
}


def build_tutor_prompt(message: str, learning_mode: LearningMode) -> str:
    return (
        f"{MODE_INSTRUCTIONS[learning_mode]}\n\n"
        "Formatting rules:\n"
        "- Use Markdown headings and short sections.\n"
        "- Use $...$ for inline math and $$...$$ for display equations.\n"
        "- Use \\frac{a}{b} for fractions instead of a/b when writing math.\n"
        "- Do not use raw \\(...\\) or \\[...\\] delimiters.\n\n"
        f"Student question: {message}"
    )
