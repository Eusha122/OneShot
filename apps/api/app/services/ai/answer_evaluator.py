import difflib
import logging
import json
import re
from app.services.ai.ollama_adapter import OllamaAdapter

logger = logging.getLogger(__name__)

class AnswerEvaluator:
    def __init__(self):
        self.adapter = OllamaAdapter()

    def _normalize_text(self, text: str) -> str:
        """Lowercases, strips punctuation, normalizes spaces."""
        text = str(text).lower()
        text = re.sub(r'[^\w\s]', '', text)
        return re.sub(r'\s+', ' ', text).strip()

    async def evaluate_answer(self, expected: str, actual: str) -> dict:
        """
        Evaluates a written answer.
        Returns: {"correct": bool, "partial_credit": float, "reason": str}
        """
        norm_expected = self._normalize_text(expected)
        norm_actual = self._normalize_text(actual)
        
        # 1. Exact match or highly similar fast path
        similarity = difflib.SequenceMatcher(None, norm_expected, norm_actual).ratio()
        if similarity >= 0.85:
            return {"correct": True, "partial_credit": 1.0, "reason": "Exact or highly similar match."}
            
        # 2. LLM Judge Fallback
        schema = """
        {
          "correct": false, // true or false
          "partial_credit": 0.5, // float from 0.0 to 1.0
          "reason": "Brief explanation of grading"
        }
        """
        system_prompt = (
            "You are a strict but fair educational AI judge. "
            "Your task is to evaluate a student's short conceptual answer against the expected correct answer.\n"
            "RULES:\n"
            "- Ignore spelling and minor grammar mistakes.\n"
            "- Focus ONLY on conceptual equivalence.\n"
            "- If the student's answer captures the core concept but is incomplete, give partial credit.\n"
            f"- Output strictly valid JSON matching this schema:\n{schema}\n"
            "- No conversational text."
        )
        user_prompt = f"Expected Answer: {expected}\nStudent Answer: {actual}\n\nEvaluate the student's answer."
        
        try:
            # temperature=0 for deterministic judging
            response_text = await self.adapter.generate(
                prompt=user_prompt,
                history=[],
                system_prompt=system_prompt,
                temperature=0.0,
                response_format="json"
            )
            
            clean_text = response_text.strip()
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            if clean_text.startswith("```"):
                clean_text = clean_text[3:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            
            result = json.loads(clean_text.strip())
            
            return {
                "correct": bool(result.get("correct", False)),
                "partial_credit": float(result.get("partial_credit", 0.0)),
                "reason": str(result.get("reason", "Graded by AI judge."))
            }
        except Exception as e:
            logger.error(f"[AnswerEvaluator] LLM judging failed: {e}")
            # If LLM fails, fallback to strict string matching
            return {
                "correct": similarity > 0.75,
                "partial_credit": 1.0 if similarity > 0.75 else 0.0,
                "reason": "Fallback to similarity matching due to LLM error."
            }

answer_evaluator = AnswerEvaluator()
