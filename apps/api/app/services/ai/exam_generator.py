import json
import logging
import re
import uuid
from typing import Optional
from app.services.ai.ai_router import ai_router, InfrastructureError, InferenceError
from app.services.ai.ollama_client import ValidationError
from app.data.curriculum import get_topic_list_string, get_subject_rules

logger = logging.getLogger(__name__)


def _normalise_question(q: dict) -> None:
    """
    In-place normalisation of a question dict so it always matches our canonical schema:
      - q["answer"] is always the FULL option text (never a letter like "C" or an index like 2)
      - q["options"] is always a flat list of strings
    Handles the various formats cloud models return.
    """
    # ── Step 1: flatten option objects → strings, noting which was flagged correct ──
    inferred_answer: str | None = None
    if "options" in q and isinstance(q["options"], list):
        raw_opts = q["options"]
        flat: list[str] = []
        for opt in raw_opts:
            if isinstance(opt, dict):
                text = str(opt.get("text") or opt.get("value") or opt.get("option") or "")
                flat.append(text)
                if inferred_answer is None:
                    if opt.get("isCorrect") or opt.get("is_correct") or opt.get("correct"):
                        inferred_answer = text
            else:
                flat.append(str(opt))
        q["options"] = flat

    options: list[str] = q.get("options", [])

    # ── Step 2: resolve the answer field ─────────────────────────────────────────
    # Collect whatever the model called the answer field
    raw_answer: str | None = None
    for key in ("answer", "correct_answer", "correctAnswer", "correct", "Answer"):
        if key in q and q[key] is not None:
            raw_answer = str(q.pop(key) if key != "answer" else q[key])
            if key != "answer":
                pass  # we'll set q["answer"] below
            break

    if raw_answer is None and inferred_answer:
        raw_answer = inferred_answer

    # ── Step 3: if raw_answer is a letter (A/B/C/D) or a 1-based index, resolve
    #           to the actual option text so evaluation works correctly ──────────
    resolved: str | None = None
    if raw_answer is not None and options:
        letter_map = {chr(65 + i): opt for i, opt in enumerate(options)}  # A→opt[0] …
        raw_stripped = raw_answer.strip()

        # Case: single letter "C" or "c"
        if re.fullmatch(r'[A-Da-d]', raw_stripped):
            resolved = letter_map.get(raw_stripped.upper())

        # Case: "A)" / "A." / "A) some text"
        elif re.match(r'^[A-Da-d][).\s]', raw_stripped):
            resolved = letter_map.get(raw_stripped[0].upper())

        # Case: integer index "2" (1-based) or "0" (0-based)
        elif re.fullmatch(r'\d', raw_stripped):
            idx = int(raw_stripped)
            # try 1-based first (more common in model output), fall back to 0-based
            if 1 <= idx <= len(options):
                resolved = options[idx - 1]
            elif 0 <= idx < len(options):
                resolved = options[idx]

        # Case: full text that exactly matches one option — keep as-is
        elif any(raw_stripped.lower() == opt.strip().lower() for opt in options):
            resolved = next(opt for opt in options if opt.strip().lower() == raw_stripped.lower())

        # Case: full text that partially matches (cloud sometimes adds extra punctuation)
        else:
            for opt in options:
                if opt.strip().lower() in raw_stripped.lower() or raw_stripped.lower() in opt.strip().lower():
                    resolved = opt
                    break

    q["answer"] = resolved if resolved is not None else (raw_answer or "")


class ExamGenerator:
    def __init__(self):
        self.client = ai_router

    async def generate_exam(
        self,
        subject: str,
        topic: str,
        count: int,
        q_type: str,
        context: str = "",
        board: str = "SSC",
        class_name: str = "Class 9",
        weak_topics: Optional[list[str]] = None,
    ) -> list[dict]:
        """
        Generate exam questions using Ollama based on curriculum context.
        Strictly grounded in the syllabus whitelist.
        """
        logger.info(f"[ExamGenerator] Generating {count} {q_type} questions for {board} {class_name} {subject} - {topic}")

        # ── Build type-specific instruction ──────────────────────────────
        type_instruction = ""
        if q_type == "mcq":
            type_instruction = (
                "Each question MUST be a Multiple Choice Question (MCQ). "
                "Provide exactly 4 options as short values (numbers, formulas, or brief phrases). "
                "The 'answer' field MUST be the full text of the correct option, not just a letter."
            )
        elif q_type == "written":
            type_instruction = (
                "Each question must be a short written answer question. "
                "Do NOT provide options. The 'answer' field should contain the expected answer."
            )
        elif q_type == "fill_blank":
            type_instruction = (
                "Each question must be a fill-in-the-blank question with one blank shown as '_____'. "
                "Do NOT provide options. The 'answer' field should contain the word/value for the blank."
            )
        elif q_type == "math_numeric":
            type_instruction = (
                "Each question must expect a single, exact numerical value as the answer. "
                "Do NOT provide options. The 'answer' field MUST contain only the number (e.g. '4', '42.5')."
            )
        elif q_type == "math_expression":
            type_instruction = (
                "Each question must expect an algebraic or symbolic mathematical expression as the answer. "
                "Do NOT provide options. The 'answer' field MUST contain only the expression (e.g. '2*x + 4')."
            )
        elif q_type == "conceptual":
            type_instruction = (
                "Each question must test theoretical concepts with a short written answer. "
                "Do NOT provide options. The 'answer' field should contain the expected conceptual answer."
            )

        # ── Build syllabus whitelist ─────────────────────────────────────
        approved_topics = get_topic_list_string(board, subject)
        topic_constraint = ""
        if approved_topics:
            topic_constraint = (
                f"\nAPPROVED SYLLABUS TOPICS for {board} {class_name} {subject}:\n"
                f"{approved_topics}\n\n"
                f"You MUST ONLY generate questions from these approved topics.\n"
            )

        # ── Get subject-specific rules ───────────────────────────────────
        subject_rules = get_subject_rules(subject)

        # ── Weak topic emphasis ──────────────────────────────────────────
        weak_instruction = ""
        if weak_topics and len(weak_topics) > 0:
            weak_str = ", ".join(weak_topics)
            weak_instruction = (
                f"\nThe student is weak in: {weak_str}. "
                f"Generate at least 40% of questions from these weak areas to help them practice.\n"
            )

        # ── JSON schema ─────────────────────────────────────────────────
        schema = f"""[
  {{
    "question": "The actual question text with numbers/equations",
    "type": "{q_type}",
    "options": ["Option A value", "Option B value", "Option C value", "Option D value"], // ONLY if type is mcq
    "answer": "The expected exact answer",
    "explanation": "Brief explanation of why this is correct",
    "difficulty": "easy|medium|hard",
    "chapter": "The chapter/topic this belongs to"
  }}
]"""

        # ── System prompt with HARD constraints ──────────────────────────
        system_prompt = (
            f"You are a STRICT {board} {class_name} {subject} exam generator.\n\n"
            f"You are creating questions for a REAL school examination.\n"
            f"The student is in {class_name} under the {board} board.\n\n"
            f"ABSOLUTE RULES:\n"
            f"1. Output ONLY a valid JSON array matching this schema:\n{schema}\n"
            f"2. Generate exactly {count} questions.\n"
            f"3. {type_instruction}\n"
            f"4. Every question must be directly from the {subject} syllabus.\n"
            f"5. Questions must test ACTUAL subject knowledge with real problems.\n\n"
            f"FORBIDDEN - NEVER generate any of these:\n"
            f"- Questions about educational philosophy or pedagogy\n"
            f"- Questions about 'the importance of {subject}'\n"
            f"- Questions about teaching methodology\n"
            f"- Questions about curriculum theory\n"
            f"- Vague conceptual questions without concrete content\n\n"
            f"{topic_constraint}"
            f"{subject_rules}"
            f"{weak_instruction}"
            f"\nDo NOT include any text outside of the JSON array. No markdown, no commentary."
        )

        # ── User prompt ──────────────────────────────────────────────────
        topic_text = topic if topic.strip().lower() != "full book" else f"all topics from {subject}"
        context_text = context if context else f"Use your knowledge of {board} {class_name} {subject} curriculum."

        user_prompt = (
            f"Generate {count} {q_type} questions for: {board} {class_name} {subject} — {topic_text}\n\n"
            f"Reference material:\n{context_text}\n\n"
            f"Output ONLY the JSON array."
        )

        # ── LLM call with retries ────────────────────────────────────────
        max_retries = 3
        for attempt in range(max_retries):
            try:
                # Use a long timeout — small local models are slow for structured JSON generation
                response_text = await self.client.generate(
                    prompt=user_prompt,
                    history=[],
                    system_prompt=system_prompt,
                    temperature=0.3,
                    response_format="json",
                    timeout=240,
                )

                logger.info(f"[ExamGenerator] Raw LLM response length: {len(response_text)}")

                # Strip markdown fences the model sometimes wraps around JSON
                clean_text = response_text.strip()
                for fence in ("```json", "```"):
                    if clean_text.startswith(fence):
                        clean_text = clean_text[len(fence):]
                if clean_text.endswith("```"):
                    clean_text = clean_text[:-3]
                clean_text = clean_text.strip()

                questions = json.loads(clean_text)

                # Unwrap from any container the model decided to use
                if isinstance(questions, dict):
                    # Case 1: {"questions": [...]}  or any key whose value is a list
                    extracted = None
                    for val in questions.values():
                        if isinstance(val, list):
                            extracted = val
                            break
                    if extracted is None:
                        # Case 2: {"0": {...}, "1": {...}} — dict of question objects
                        extracted = list(questions.values())
                    questions = extracted

                # Strict Validation
                if not isinstance(questions, list):
                    logger.error(f"[ExamGenerator] Raw parsed structure: {type(questions)}")
                    raise ValidationError("Root element is not a list and does not contain a list")

                # Filter out any non-dict items (null, string, number) instead of hard-failing
                original_len = len(questions)
                questions = [q for q in questions if isinstance(q, dict)]
                if len(questions) < original_len:
                    logger.warning(f"[ExamGenerator] Dropped {original_len - len(questions)} non-dict items from LLM output")

                if not questions:
                    raise ValidationError("No valid questions generated")

                # Normalise field names — cloud models use different conventions
                for q in questions:
                    _normalise_question(q)

                for i, q in enumerate(questions):
                    required_keys = {"question", "answer"}
                    if not required_keys.issubset(q.keys()):
                        raise ValidationError(f"Missing required keys in question: {q}")
                    if q_type == "mcq" and ("options" not in q or len(q.get("options", [])) < 2):
                        raise ValidationError("MCQ must have at least 2 options")
                    # Enforce Canonical Schema
                    if "id" not in q:
                        q["id"] = f"q_{i}_{uuid.uuid4().hex[:6]}"
                    if "subject" not in q:
                        q["subject"] = subject
                    if "difficulty" not in q:
                        q["difficulty"] = "medium"
                    if "explanation" not in q:
                        q["explanation"] = ""
                    if "chapter" not in q:
                        q["chapter"] = topic if topic.strip().lower() != "full book" else subject

                return questions

            except json.JSONDecodeError as e:
                logger.error(f"[ExamGenerator] JSON parsing failed on attempt {attempt+1}: {e}\nResponse: {response_text[:300]}")
            except ValidationError as e:
                logger.error(f"[ExamGenerator] Validation failed on attempt {attempt+1}: {e}")
            except InferenceError as e:
                logger.error(f"[ExamGenerator] Inference failed on attempt {attempt+1}: {e}")
            except InfrastructureError as e:
                # Do NOT retry on infrastructure failures like DNS, timeout, connection refused
                logger.exception("[ExamGenerator] Infrastructure error encountered. Aborting exam generation.")
                raise  # Let this bubble up to return 503

            if attempt == max_retries - 1:
                logger.error("[ExamGenerator] All retries exhausted. Returning error.")
                raise ValueError("Failed to generate valid questions. Please try again.")

            # On retry, add stronger constraint
            system_prompt += "\n\nCRITICAL: Your last response was invalid or timed out. You MUST output ONLY a valid JSON array. No other text."


exam_generator = ExamGenerator()
