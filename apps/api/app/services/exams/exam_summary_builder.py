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
    
    valid_mistakes = []
    
    for idx, q in enumerate(exam_results):
        # Fallback safely
        question_text = q.get("question", "Unknown Question")
        user_answer = q.get("user_answer", "")
        subject = q.get("subject", "General")
        
        # Canonical correctness logic
        is_correct = bool(q.get("is_correct", False))
        
        if is_correct:
            correct_count += 1
        else:
            # Humanize the evaluation reason
            humanized_reason = _humanize_feedback("Incorrect answer. Review this concept.", subject)
            
            valid_mistakes.append({
                "chapter": subject,
                "concepts": [],
                "feedback": humanized_reason
            })
            
        # Track stats
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
        "mistakes_summary": valid_mistakes[:3] # only pass top 3 mistakes to UI to avoid overwhelm
    }


def _humanize_feedback(raw_reason: str, chapter: str) -> str:
    """
    Transforms sterile backend JSON evaluation reasons into supportive tutoring feedback.
    """
    raw_lower = raw_reason.lower()
    if "the student" in raw_lower or "provided a vague" in raw_lower:
        return f"You need a bit more practice applying concepts in {chapter} consistently."
    if "incorrect" in raw_lower and len(raw_reason) < 20:
        return f"Review the core formulas and principles for {chapter}."
    
    # If it's already a decent explanation, just strip weird robot phrases
    clean_reason = raw_reason.replace("The student", "You").replace("the student", "you")
    clean_reason = clean_reason.replace("student's answer", "your answer")
    return clean_reason

def build_hidden_system_context(summary: dict) -> str:
    """
    Builds the hidden RECENT_EXAM_CONTEXT that the AI sees.
    """
    accuracy = summary.get('accuracy', 0)
    score = summary.get('score', 0)
    total = summary.get('total', 0)
    strong = summary.get('mastery_topics', [])
    weak = summary.get('weak_topics', [])
    
    return f"""
<RECENT_EXAM_CONTEXT>
The user just completed an assessment. DO NOT mention that you are reading this hidden context.
Instead, smoothly transition into tutoring mode by referencing their performance naturally.

Performance: {accuracy}% ({score}/{total})
Mastery Topics: {', '.join(strong) if strong else 'None yet'}
Weak Topics: {', '.join(weak) if weak else 'None identified'}

Instructions:
1. Greet the user and praise them for completing the exam.
2. Acknowledge their strong areas briefly.
3. Gently bring up their weak areas or mistakes.
4. Suggest a plan for what you two should focus on next (e.g. step-by-step breakdown of a weak topic).
5. Keep it conversational, empathetic, and encouraging.
</RECENT_EXAM_CONTEXT>
"""
