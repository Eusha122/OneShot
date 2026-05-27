import logging
import time
import re
import numpy as np
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# Windows-specific: hardcoded Poppler binary path for pdf2image
POPPLER_PATH = r"C:\poppler-26.02.0\Library\bin"

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
                self.ocr_model = PaddleOCR(use_angle_cls=True, lang="en")
            except ImportError:
                logger.error("paddleocr is not installed. OCR fallback unavailable.")
                return ""

        logger.info("Running OCR fallback on image...")
        result = self.ocr_model.ocr(image_bytes)
        
        if not result or not result[0]:
            return ""
            
        extracted_text = []
        for line in result[0]:
            # line[1][0] contains the recognized text
            extracted_text.append(line[1][0])
            
        return "\n".join(extracted_text)

    def extract_text_from_pdf(self, pdf_path: str, max_pages: int = None) -> List[Dict[str, str]]:
        """
        Extracts text from a scanned PDF by converting pages to images
        and running PaddleOCR on each page.
        """
        results = []
        try:
            from pdf2image import convert_from_path
        except ImportError:
            logger.error("pdf2image is not installed or poppler is missing. OCR fallback unavailable.")
            return []

        if self.ocr_model is None:
            try:
                from paddleocr import PaddleOCR
                logger.info("Initializing PaddleOCR...")
                self.ocr_model = PaddleOCR(use_angle_cls=True, lang="en")
            except ImportError:
                logger.error("paddleocr is not installed. OCR fallback unavailable.")
                return []

        logger.info(f"Converting PDF {pdf_path} to images...")
        start_time = time.time()
        
        # Convert PDF to images page by page to save memory, or get the total page count first
        # But we'll load them. If it's a huge PDF, we might need a generator, but pdf2image supports it.
        # Actually, convert_from_path loads all images into memory unless we use generators, but for hackathon we can use max_pages.
        logger.info(f"[OCR] Using Poppler path: {POPPLER_PATH}")
        try:
            # We'll just convert the allowed number of pages
            # first_page=1, last_page=max_pages
            images = convert_from_path(
                pdf_path, 
                first_page=1, 
                last_page=max_pages,
                poppler_path=POPPLER_PATH
            )
        except Exception as e:
            logger.error(f"[OCR] Failed to convert PDF to images: {e}")
            return []

        for i, img in enumerate(images):
            page_num = i + 1
            logger.info(f"[OCR] Processing page {page_num}...")
            
            # Convert PIL image to numpy array for PaddleOCR
            img_array = np.array(img)
            
            # PaddleOCR expects BGR for cv2, PIL gives RGB
            img_bgr = img_array[:, :, ::-1]
            
            result = self.ocr_model.ocr(img_bgr)
            
            if result and result[0]:
                extracted_text = []
                for line in result[0]:
                    extracted_text.append(line[1][0])
                
                raw_text = "\n".join(extracted_text)
                cleaned_text = self._clean_ocr_text(raw_text)
                
                results.append({
                    "page": page_num,
                    "text": cleaned_text
                })
            else:
                results.append({
                    "page": page_num,
                    "text": ""
                })

        elapsed = time.time() - start_time
        minutes, seconds = divmod(int(elapsed), 60)
        logger.info(f"[OCR] {len(results)} pages extracted in {minutes}m {seconds}s")
        return results

    def _clean_ocr_text(self, text: str) -> str:
        """Lightweight cleanup for OCR output."""
        # Remove repeated whitespace (more than 2 spaces)
        text = re.sub(r' {2,}', ' ', text)
        
        # Normalize line breaks (more than 2 newlines to 2)
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Simple heuristic to fix broken lines within a paragraph:
        # If a line doesn't end with punctuation and next line doesn't start with uppercase,
        # we might join them. But for a hackathon, just preserving the raw spacing is often fine.
        return text.strip()

# Singleton instance
ocr_engine = PaddleOCREngine()
