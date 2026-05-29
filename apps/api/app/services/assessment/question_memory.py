import time
from typing import Dict, Any

# Simple In-Memory Cache
_active_questions: Dict[str, Dict[str, Any]] = {}

def store_question(question_id: str, data: Dict[str, Any]) -> None:
    data["created_at"] = time.time()
    _active_questions[question_id] = data

def get_question(question_id: str) -> Dict[str, Any]:
    return _active_questions.get(question_id)

def delete_question(question_id: str) -> None:
    if question_id in _active_questions:
        del _active_questions[question_id]

def cleanup_old_questions() -> None:
    """Auto-delete old questions after 2 hours to prevent memory leaks."""
    now = time.time()
    to_delete = []
    for qid, data in _active_questions.items():
        # 2 hours = 7200 seconds
        if now - data.get("created_at", now) > 7200:
            to_delete.append(qid)
            
    for qid in to_delete:
        del _active_questions[qid]
