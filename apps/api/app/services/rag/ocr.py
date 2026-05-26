import logging

logger = logging.getLogger(__name__)

class PaddleOCREngine:
    def __init__(self):
        self.ocr_model = None

    def extract_text_from_image(self, image_bytes: bytes) -> str:
        """
        Fallback OCR extraction.
        Should only be called if PyMuPDF yields insufficient text.
        """
        # Lazy initialization to avoid heavy loading if OCR is never used
        if self.ocr_model is None:
            try:
                from paddleocr import PaddleOCR
                # use_angle_cls=True helps with rotated text
                # lang="en" can be extended to "bn" for Bangla later
                logger.info("Initializing PaddleOCR...")
                self.ocr_model = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
            except ImportError:
                logger.error("paddleocr is not installed. OCR fallback unavailable.")
                return ""

        logger.info("Running OCR fallback on image...")
        result = self.ocr_model.ocr(image_bytes, cls=True)
        
        if not result or not result[0]:
            return ""
            
        extracted_text = []
        for line in result[0]:
            # line[1][0] contains the recognized text
            extracted_text.append(line[1][0])
            
        return "\n".join(extracted_text)

# Singleton instance
ocr_engine = PaddleOCREngine()
