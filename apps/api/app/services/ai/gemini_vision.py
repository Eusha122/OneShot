import logging
import google.generativeai as genai
from app.core.config import settings

logger = logging.getLogger(__name__)

class GeminiVisionService:
    def __init__(self):
        if not settings.google_api_key:
            logger.warning("[GeminiVision] GOOGLE_API_KEY is not set in environment.")
        else:
            genai.configure(api_key=settings.google_api_key)
        self.model = genai.GenerativeModel("gemini-1.5-flash-latest")

    async def extract_text_from_image(self, image_path: str) -> str:
        """
        Extract handwritten text, equations, and reasoning cleanly.
        """
        if not settings.google_api_key:
            raise ValueError("Gemini API key missing or invalid. Check backend configuration.")
            
        try:
            # Upload the file to Gemini temporarily using the File API
            # For optimal latency, we can pass the raw bytes or file path. 
            # Passing the file path using the library handles it.
            myfile = genai.upload_file(image_path)
            
            prompt = (
                "You are an OCR assistant. "
                "Extract the student's handwritten answer cleanly.\n"
                "Rules:\n"
                "- preserve equations\n"
                "- preserve units\n"
                "- preserve formatting when possible\n"
                "- return ONLY the extracted text\n"
            )
            
            response = await self.model.generate_content_async([myfile, prompt])
            
            # Clean up the file from Gemini servers immediately to protect privacy
            try:
                genai.delete_file(myfile.name)
            except Exception as e:
                logger.warning(f"Failed to delete gemini file: {e}")
                
            return response.text.strip()
        except Exception as e:
            logger.error(f"[GeminiVision] extract_text_from_image failed: {e}")
            raise e

    async def detect_subject_from_image(self, image_path: str) -> dict:
        """
        Auto-detect subject, topic, and chapter from notebook uploads.
        """
        if not settings.google_api_key:
            raise ValueError("Gemini API key missing or invalid. Check backend configuration.")
            
        try:
            myfile = genai.upload_file(image_path)
            
            prompt = (
                "Identify:\n"
                "- subject\n"
                "- topic\n"
                "- chapter\n\n"
                "from this handwritten educational content. "
                "Return ONLY a JSON object with these three keys."
            )
            
            response = await self.model.generate_content_async([myfile, prompt])
            
            try:
                genai.delete_file(myfile.name)
            except:
                pass
                
            text = response.text.strip()
            # Clean JSON formatting if wrapped in markdown
            if text.startswith("```json"):
                text = text[7:]
            if text.startswith("```"):
                text = text[3:]
            if text.endswith("```"):
                text = text[:-3]
                
            import json
            return json.loads(text.strip())
        except Exception as e:
            logger.error(f"[GeminiVision] detect_subject_from_image failed: {e}")
            return {"subject": "General", "topic": "Unknown", "chapter": "Unknown"}

    async def assess_student_answer(self, question: str, expected_answer: str, image_path: str) -> str:
        """
        Extracts answer from image, evaluates it against the expected answer, 
        and provides teacher-like feedback.
        """
        # We will keep this method simple for direct calls if needed, 
        # but the main pipeline happens in image_assessment.py 
        # which uses the semantic evaluator layer first.
        # This is a fallback/all-in-one method if the external pipeline is not used.
        if not settings.google_api_key:
            raise ValueError("Gemini API key missing or invalid. Check backend configuration.")
            
        try:
            myfile = genai.upload_file(image_path)
            
            prompt = (
                f"Question: {question}\n"
                f"Expected Answer: {expected_answer}\n\n"
                "This image contains the student's handwritten answer. "
                "1. Extract their answer.\n"
                "2. Evaluate conceptual correctness.\n"
                "3. Explain mistakes naturally (teacher-style feedback).\n"
                "4. Identify any weak topics.\n"
                "Return structured feedback."
            )
            
            response = await self.model.generate_content_async([myfile, prompt])
            
            try:
                genai.delete_file(myfile.name)
            except:
                pass
                
            return response.text.strip()
        except Exception as e:
            logger.error(f"[GeminiVision] assess_student_answer failed: {e}")
            raise e

    async def explain_mistakes(self, question: str, expected: str, student_answer: str) -> str:
        """
        Teacher-style feedback based on text.
        """
        if not settings.google_api_key:
            raise ValueError("Gemini API key missing or invalid. Check backend configuration.")
            
        try:
            prompt = (
                f"Question: {question}\n"
                f"Expected Answer: {expected}\n"
                f"Student Answer: {student_answer}\n\n"
                "You are an AI teacher. The student made a mistake or is incomplete. "
                "Explain the mistake naturally and clearly. "
                "For example: 'You identified Newton's Second Law correctly, but your force calculation forgot unit conversion.'"
            )
            
            response = await self.model.generate_content_async(prompt)
            return response.text.strip()
        except Exception as e:
            logger.error(f"[GeminiVision] explain_mistakes failed: {e}")
            return "I couldn't generate an explanation at this time."

gemini_vision_service = GeminiVisionService()
