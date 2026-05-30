import json
import logging

logger = logging.getLogger(__name__)

def build_educational_summary(exam_results: list, request_id: str = "unknown") -> dict:
    """
    Transforms raw exam results into a clean educational summary object.
    Implements Confidence Scoring and Topic Extraction.
    """
    logger.info(
        "[SUMMARY INPUT COUNT] %d",
        len(exam_results)
    )
    
    total_questions = len(exam_results)
    logger.info(f"[EXAM_SUMMARY][{request_id}] Building summary for {total_questions} questions")
    
    if total_questions == 0:
        logger.error(f"[EXAM_SUMMARY][{request_id}] EvaluationPipelineError: total_questions is 0")
        raise ValueError("EvaluationPipelineError: total_questions cannot be zero.")

    correct_count = 0
    subject_stats = {}
    all_question_feedback = []

    for idx, q in enumerate(exam_results):
        question_text = q.get("question", "Unknown Question")
        user_answer = q.get("user_answer", "")
        correct_answer = q.get("correct_answer", "")
        subject = q.get("subject", "General")

        is_correct = bool(q.get("is_correct", False))

        if is_correct:
            correct_count += 1
            feedback = _correct_feedback(question_text, user_answer, subject)
        else:
            feedback = _wrong_feedback(question_text, user_answer, correct_answer, subject)

        all_question_feedback.append({
            "chapter": subject,
            "is_correct": is_correct,
            "question": question_text,
            "user_answer": user_answer,
            "correct_answer": correct_answer,
            "feedback": feedback,
        })

        if subject not in subject_stats:
            subject_stats[subject] = {"total": 0, "correct": 0}
        subject_stats[subject]["total"] += 1
        if is_correct:
            subject_stats[subject]["correct"] += 1

    accuracy = (correct_count / total_questions) * 100 if total_questions > 0 else 0
    logger.info(f"[EXAM_SUMMARY][{request_id}] Calculated score: {correct_count}/{total_questions} ({accuracy}%)")
    
    # Identify Strong and Weak areas based on chapters and concepts
    mastery_topics = []
    weak_topics = []
    
    for s, stats in subject_stats.items():
        if stats["total"] > 0:
            acc = stats["correct"] / stats["total"]
            if acc >= 0.8:
                mastery_topics.append(s)
            elif acc < 0.6:
                weak_topics.append(s)

    # Derive "What Improved"
    improvements = []
    if accuracy >= 80:
        improvements.append("High overall accuracy")
    if len(mastery_topics) > 0:
        improvements.append(f"Mastery of {mastery_topics[0]}")
    if accuracy > 0 and accuracy < 80:
        improvements.append("Solid effort and concept recognition")
    if not improvements:
        improvements.append("Completing practice assessments consistently")

    return {
        "score": correct_count,
        "total": total_questions,
        "accuracy": round(accuracy),
        "mastery_topics": list(set(mastery_topics))[:3],
        "weak_topics": list(set(weak_topics))[:3],
        "improvements": improvements,
        "mistakes_summary": all_question_feedback,
    }


def _correct_feedback(question: str, user_answer: str, chapter: str) -> str:
    if not user_answer or user_answer.strip() == "":
        return "You got this right!"
    return f"Nailed it! '{user_answer}' is correct."


def _wrong_feedback(question: str, user_answer: str, correct_answer: str, chapter: str) -> str:
    if not user_answer or user_answer.strip() == "":
        return f"You skipped this one — worth revisiting '{chapter}' so you're ready next time."
    if correct_answer:
        return (
            f"You went with '{user_answer}', but it's actually '{correct_answer}'. "
            f"Don't stress — just look up why in {chapter} and it'll click!"
        )
    return f"Not quite — take another look at this concept in {chapter}."

def build_hidden_system_context(summary: dict) -> str:
    """
    Builds the hidden RECENT_EXAM_CONTEXT that the AI sees.
    Includes specific question-level mistakes so the AI can give targeted feedback.
    """
    accuracy = summary.get('accuracy', 0)
    score = summary.get('score', 0)
    total = summary.get('total', 0)
    strong = summary.get('mastery_topics', [])
    weak = summary.get('weak_topics', [])
    all_questions = summary.get('mistakes_summary', [])
    wrong_questions = [q for q in all_questions if not q.get('is_correct', False)]

    if wrong_questions:
        lines = []
        for i, m in enumerate(wrong_questions, 1):
            q = m.get('question', '(unknown)')
            ua = m.get('user_answer', '') or '(skipped)'
            ca = m.get('correct_answer', '') or '(unknown)'
            chapter = m.get('chapter', 'General')
            lines.append(
                f"  {i}. [{chapter}] {q}\n"
                f"     They said: {ua}  |  Right answer: {ca}"
            )
        mistakes_section = "Questions they got wrong:\n" + "\n".join(lines)
    else:
        mistakes_section = "They got everything right — perfect score!"

    return f"""
<RECENT_EXAM_CONTEXT>
The student just finished their exam. You are their study buddy, NOT a corporate assistant.
Talk like a friend who happens to be great at this subject — casual, warm, a little encouraging.
DO NOT mention this context or that you're reading it.

Score: {score}/{total} ({accuracy}%)
Strong areas: {', '.join(strong) if strong else 'none yet'}
Needs work: {', '.join(weak) if weak else 'nothing specific'}

{mistakes_section}

How to respond:
- Be real and casual, like texting a friend ("hey, you actually did well on X!" not "I commend your performance")
- Mention the actual score in a natural, human way
- For each wrong answer, briefly explain WHY the right answer is correct — reference the actual question, don't just say "review Chapter X"
- Keep it short: 2-3 short paragraphs max
- End by asking what they want to work on or offering to dive into a weak spot
</RECENT_EXAM_CONTEXT>
"""
