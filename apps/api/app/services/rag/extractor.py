import re
import fitz  # PyMuPDF
from typing import List, Dict
import logging

from app.services.rag.ocr import ocr_engine

logger = logging.getLogger(__name__)

class PyMuPDFExtractor:
    def __init__(self):
        pass

    def extract_text(self, file_path: str, max_pages: int = None) -> List[Dict[str, str]]:
        """
        Extracts text from a PDF, returning a list of dictionaries.
        Each dictionary contains:
        - "page": the page number (1-indexed)
        - "text": the extracted and cleaned text for that page
        
        If standard extraction fails to extract sufficient text, automatically
        falls back to OCR pipeline for scanned textbooks.
        """
        results = []
        doc = fitz.open(file_path)
        
        total_chars = 0
        pages_to_process = min(len(doc), max_pages) if max_pages else len(doc)
        
        for i in range(pages_to_process):
            page = doc[i]
            text = page.get_text()
            cleaned_text = self._clean_text(text)
            
            # Simple length check to filter out empty pages or pages with just a number
            if len(cleaned_text.strip()) > 10:
                total_chars += len(cleaned_text.strip())
                results.append({
                    "page": i + 1,
                    "text": cleaned_text
                })
        
        doc.close()
        
        # Validation checks
        if len(results) == 0 or total_chars < 500:
            logger.warning("[EXTRACTOR] PyMuPDF extraction produced insufficient text.")
            logger.warning(f"[EXTRACTOR] Only extracted {len(results)} pages and {total_chars} chars.")
            logger.info("[OCR] Falling back to OCR pipeline...")
            
            ocr_results = ocr_engine.extract_text_from_pdf(file_path, max_pages)
            if ocr_results:
                return ocr_results
            else:
                logger.error("[OCR] OCR pipeline also failed to extract text.")
        
        return results
        
    def _clean_text(self, text: str) -> str:
        """
        Cleans the extracted text by removing repeated headers/footers
        and fixing whitespace.
        """
        # Remove multiple newlines
        text = re.sub(r'\n{3,}', '\n\n', text)
        
        # Replace multiple spaces with a single space
        text = re.sub(r' {2,}', ' ', text)
        
        # Strip leading/trailing whitespace
        return text.strip()

# Singleton instance
extractor = PyMuPDFExtractor()
