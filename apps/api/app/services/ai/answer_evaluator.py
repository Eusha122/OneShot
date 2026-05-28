import difflib
import logging
import json
import re
from app.services.ai.ollama_adapter import OllamaAdapter
import sympy

logger = logging.getLogger(__name__)

class AnswerEvaluator:
    def __init__(self):
        self.adapter = OllamaAdapter()

    def _normalize_text(self, text: str) -> str:
        """Lowercases, strips punctuation, normalizes spaces."""
        text = str(text).lower()
        text = re.sub(r'[^\w\s]', '', text)
        return re.sub(r'\s+', ' ', text).strip()

    async def evaluate_answer(self, expected: str, actual: str, question_type: str = "conceptual") -> dict:
        """
        Evaluates an answer based on question type.
        Returns: {"correct": bool, "partial_credit": float, "reason": str}
        """
        if question_type == "mcq":
            return self._evaluate_mcq(expected, actual)
        elif question_type == "math_numeric":
            return self._evaluate_numeric(expected, actual)
        elif question_type == "math_expression":
            return self._evaluate_symbolic(expected, actual)
        else:
            return await self._evaluate_semantic(expected, actual)

    def _evaluate_mcq(self, expected: str, actual: str) -> dict:
        """Exact string match for MCQ options."""
        expected_clean = str(expected).strip().lower()
        actual_clean = str(actual).strip().lower()
        
        # Check if they just sent the letter "B" or the full text
        # If expected is "b) 42" and actual is "b", we want a match.
        # So we extract the first letter if it looks like an option format.
        exp_letter_match = re.match(r'^([a-d])[\)\.\s]', expected_clean)
        act_letter_match = re.match(r'^([a-d])[\)\.\s]', actual_clean)
        
        exp_letter = exp_letter_match.group(1) if exp_letter_match else expected_clean
        act_letter = act_letter_match.group(1) if act_letter_match else actual_clean
        
        if expected_clean == actual_clean:
            is_correct = True
        elif len(actual_clean) == 1 and expected_clean.startswith(actual_clean):
            # actual is 'b', expected is 'b) 42'
            is_correct = True
        elif exp_letter == act_letter and exp_letter in ['a', 'b', 'c', 'd']:
            is_correct = True
        else:
            is_correct = False
        
        return {
            "correct": is_correct,
            "partial_credit": 1.0 if is_correct else 0.0,
            "reason": "" # No reason needed for deterministic MCQ
        }

    def _evaluate_numeric(self, expected: str, actual: str) -> dict:
        """Extracts number from student answer and compares it to expected float."""
        try:
            # Extract expected number
            exp_match = re.search(r'-?\d*\.?\d+', str(expected))
            if not exp_match:
                # If expected doesn't contain a number, fallback to exact match
                return self._evaluate_mcq(expected, actual)
            exp_val = float(exp_match.group())

            # Extract student number (can handle things like "x=4" or "The answer is 4")
            act_match = re.search(r'-?\d*\.?\d+', str(actual))
            if not act_match:
                return {
                    "correct": False,
                    "partial_credit": 0.0,
                    "reason": ""
                }
            act_val = float(act_match.group())

            is_correct = abs(exp_val - act_val) < 0.0001
            
            return {
                "correct": is_correct,
                "partial_credit": 1.0 if is_correct else 0.0,
                "reason": ""
            }
        except Exception as e:
            logger.error(f"[AnswerEvaluator] Numeric eval failed: {e}")
            return self._evaluate_mcq(expected, actual)

    def _preprocess_symbolic(self, expr_str: str) -> str:
        """Normalizes expressions like '2x' to '2*x' for SymPy."""
        # Insert '*' between a number and a letter (e.g. 2x -> 2*x)
        expr_str = re.sub(r'(\d)([a-zA-Z])', r'\1*\2', str(expr_str))
        # Insert '*' between a letter and an open parenthesis (e.g. x(a+b) -> x*(a+b))
        expr_str = re.sub(r'([a-zA-Z])\(', r'\1*(', expr_str)
        # Insert '*' between a number and an open parenthesis (e.g. 2(a+b) -> 2*(a+b))
        expr_str = re.sub(r'(\d)\(', r'\1*(', expr_str)
        # Handle 'x=4' -> '4' if expected is an expression
        if '=' in expr_str:
            expr_str = expr_str.split('=')[1].strip()
            
        return expr_str

    def _evaluate_symbolic(self, expected: str, actual: str) -> dict:
        """Evaluates algebraic expression equivalence using SymPy."""
        try:
            exp_clean = self._preprocess_symbolic(expected)
            act_clean = self._preprocess_symbolic(actual)
            
            # Use sympify with evaluate=False if needed, but normally simplify does the job
            exp_sym = sympy.sympify(exp_clean)
            act_sym = sympy.sympify(act_clean)
            
            diff = sympy.simplify(act_sym - exp_sym)
            is_correct = (diff == 0)
            
            return {
                "correct": is_correct,
                "partial_credit": 1.0 if is_correct else 0.0,
                "reason": ""
            }
        except Exception as e:
            logger.warning(f"[AnswerEvaluator] Symbolic eval failed or invalid math syntax: {e}")
            # If sympy fails (e.g. "2x+++"), it's gracefully incorrect.
            return {
                "correct": False,
                "partial_credit": 0.0,
                "reason": "Invalid mathematical expression."
            }

    async def _evaluate_semantic(self, expected: str, actual: str) -> dict:
        """
        Evaluates a written answer using LLM semantic judge.
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
