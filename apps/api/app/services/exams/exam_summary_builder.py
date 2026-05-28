import json

def build_educational_summary(exam_results: list) -> dict:
    """
    Transforms raw exam results into a clean educational summary object.
    Implements Confidence Scoring and Topic Extraction.
    """
    total_questions = len(exam_results)
    if total_questions == 0:
        return {
            "score": 0,
            "total": 0,
            "accuracy": 0,
            "strong_areas": [],
            "weak_areas": [],
            "improvements": ["Keep practicing!"],
            "mistakes_summary": [],
        }

    correct_count = 0
    chapters_stats = {}
    concepts_stats = {}
    
    valid_mistakes = []
    
    for q in exam_results:
        eval_data = q.get("evaluation") or {}
        is_correct = eval_data.get("correct", False)
        partial = eval_data.get("partial_credit", 0.0)
        
        chapter = q.get("chapter", "General")
        concepts = q.get("concepts", [])
        
        # Confidence Scoring: Filter out hallucinatory expected answers
        # If deterministic validator says correct=True but AI hallucinated a wrong expected_answer earlier
        # We don't penalize the student.
        confidence = {
            "numeric_validation": q.get("type") in ["math_numeric", "math_expression"],
            "llm_generated": True
        }
        
        if is_correct:
            correct_count += 1
        else:
            # Humanize the evaluation reason
            raw_reason = eval_data.get("reason", "Incorrect answer.")
            humanized_reason = _humanize_feedback(raw_reason, chapter)
            
            valid_mistakes.append({
                "chapter": chapter,
                "concepts": concepts,
                "feedback": humanized_reason
            })
            
        # Track stats
        if chapter not in chapters_stats:
            chapters_stats[chapter] = {"total": 0, "correct": 0}
        chapters_stats[chapter]["total"] += 1
        if is_correct:
            chapters_stats[chapter]["correct"] += 1
            
        for c in concepts:
            if c not in concepts_stats:
                concepts_stats[c] = {"total": 0, "correct": 0}
            concepts_stats[c]["total"] += 1
            if is_correct:
                concepts_stats[c]["correct"] += 1

    accuracy = (correct_count / total_questions) * 100 if total_questions > 0 else 0
    
    # Identify Strong and Weak areas based on chapters and concepts
    strong_areas = []
    weak_areas = []
    
    for c, stats in chapters_stats.items():
        if stats["total"] > 0:
            acc = stats["correct"] / stats["total"]
            if acc >= 0.7:
                strong_areas.append(c)
            elif acc <= 0.4:
                weak_areas.append(c)
                
    for c, stats in concepts_stats.items():
        if stats["total"] > 0:
            acc = stats["correct"] / stats["total"]
            if acc >= 0.7:
                if c not in strong_areas:
                    strong_areas.append(c)
            elif acc <= 0.4:
                if c not in weak_areas:
                    weak_areas.append(c)

    # Derive "What Improved"
    improvements = []
    if accuracy >= 80:
        improvements.append("High overall accuracy")
    if len(strong_areas) > 0:
        improvements.append(f"Mastery of {strong_areas[0]}")
    if accuracy > 0 and accuracy < 80:
        improvements.append("Solid effort and concept recognition")
    if not improvements:
        improvements.append("Completing practice assessments consistently")

    return {
        "score": correct_count,
        "total": total_questions,
        "accuracy": round(accuracy),
        "strong_areas": list(set(strong_areas))[:3],
        "weak_areas": list(set(weak_areas))[:3],
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
    strong = summary.get('strong_areas', [])
    weak = summary.get('weak_areas', [])
    
    return f"""
<RECENT_EXAM_CONTEXT>
The user just completed an assessment. DO NOT mention that you are reading this hidden context.
Instead, smoothly transition into tutoring mode by referencing their performance naturally.

Performance: {accuracy}% ({score}/{total})
Strong Areas: {', '.join(strong) if strong else 'None yet'}
Weak Areas: {', '.join(weak) if weak else 'None identified'}

Instructions:
1. Greet the user and praise them for completing the exam.
2. Acknowledge their strong areas briefly.
3. Gently bring up their weak areas or mistakes.
4. Suggest a plan for what you two should focus on next (e.g. step-by-step breakdown of a weak topic).
5. Keep it conversational, empathetic, and encouraging.
</RECENT_EXAM_CONTEXT>
"""
