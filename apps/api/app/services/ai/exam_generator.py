import json
import logging
from app.services.ai.ollama_adapter import OllamaAdapter

logger = logging.getLogger(__name__)

class ExamGenerator:
    def __init__(self):
        self.adapter = OllamaAdapter()

    async def generate_exam(self, subject: str, topic: str, count: int, q_type: str, context: str = "") -> list[dict]:
        """
        Generate exam questions using Ollama based on provided context.
        Forces JSON output format.
        """
        logger.info(f"[ExamGenerator] Generating {count} {q_type} questions for {subject} - {topic}")
        
        type_instruction = ""
        if q_type == "mcq":
            type_instruction = "Each question must be a Multiple Choice Question (MCQ). Provide exactly 4 options."
        elif q_type == "written":
            type_instruction = "Each question must be a short written answer question. Do NOT provide options."
        elif q_type == "fill_blank":
            type_instruction = "Each question must be a fill-in-the-blank question, with exactly one blank represented by '_____'. Do NOT provide options."

        schema = """
        [
          {
            "question": "The text of the question?",
            "options": ["A", "B", "C", "D"],
            "answer": "B",
            "explanation": "Why this is correct",
            "difficulty": "easy",
            "source": "rag" // or "web_enriched"
          }
        ]
        """

        system_prompt = (
            f"You are an expert examiner for {subject}. Your task is to create exactly {count} highly accurate, "
            f"challenging questions about '{topic}'.\n\n"
            f"RULES:\n"
            f"- Output strictly valid JSON matching this array schema:\n{schema}\n"
            f"- Do not include any conversational text or markdown formatting outside of the JSON.\n"
            f"- Use the provided context to ensure accuracy and relevance to the syllabus.\n"
            f"- Generate roughly 70% of questions directly from the CURRICULUM CONTEXT and 30% from the WEB ENRICHMENT to add real-world/conceptual flavor.\n"
            f"- Set 'source' to 'rag' if it's from curriculum, and 'web_enriched' if it relies on web enrichment.\n"
            f"- {type_instruction}"
        )

        user_prompt = f"Topic: {topic}\n\nContext:\n{context if context else 'No context provided. Use your general knowledge.'}\n\nPlease generate the JSON array of exactly {count} questions."

        max_retries = 2
        for attempt in range(max_retries):
            try:
                response_text = await self.adapter.generate(
                    prompt=user_prompt,
                    history=[],
                    system_prompt=system_prompt,
                    temperature=0.3,
                    response_format="json"
                )
                
                logger.info(f"[ExamGenerator] Raw LLM response length: {len(response_text)}")
                
                # Clean up potential markdown formatting around JSON
                clean_text = response_text.strip()
                if clean_text.startswith("```json"):
                    clean_text = clean_text[7:]
                if clean_text.startswith("```"):
                    clean_text = clean_text[3:]
                if clean_text.endswith("```"):
                    clean_text = clean_text[:-3]
                    
                clean_text = clean_text.strip()
                
                questions = json.loads(clean_text)
                
                # Extract list if it's wrapped in a dict
                if isinstance(questions, dict):
                    # Find the first list value in the dict
                    for key, val in questions.items():
                        if isinstance(val, list):
                            questions = val
                            break
                            
                # Strict Validation
                if not isinstance(questions, list):
                    logger.error(f"[ExamGenerator] Raw parsed structure: {type(questions)}")
                    raise ValueError("Root element is not a list and does not contain a list")
                if len(questions) == 0:
                    raise ValueError("List is empty")
                
                for q in questions:
                    if not isinstance(q, dict):
                        raise ValueError("Question item is not a dictionary")
                    required_keys = {"question", "answer", "explanation"}
                    if not required_keys.issubset(q.keys()):
                        raise ValueError(f"Missing required keys in question: {q}")
                    if q_type == "mcq" and ("options" not in q or len(q["options"]) != 4):
                        raise ValueError("MCQ must have exactly 4 options")
                
                return questions
                
            except json.JSONDecodeError as e:
                logger.error(f"[ExamGenerator] JSON parsing failed on attempt {attempt+1}: {e}\nResponse: {response_text[:200]}")
            except Exception as e:
                logger.error(f"[ExamGenerator] Validation failed on attempt {attempt+1}: {e}")
                
            if attempt == max_retries - 1:
                logger.error("[ExamGenerator] All retries exhausted. Returning error.")
                raise ValueError("Failed to parse AI response into valid JSON after retries.")
            
            # On retry, simplify the prompt slightly to beg for strict JSON
            system_prompt += "\n\nCRITICAL: Your last response was invalid JSON. You MUST output ONLY a valid JSON array. No other text."

exam_generator = ExamGenerator()
