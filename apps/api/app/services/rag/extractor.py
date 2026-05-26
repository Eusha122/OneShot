import re
import fitz  # PyMuPDF
from typing import List, Dict

class PyMuPDFExtractor:
    def __init__(self):
        pass

    def extract_text(self, file_path: str) -> List[Dict[str, str]]:
        """
        Extracts text from a PDF, returning a list of dictionaries.
        Each dictionary contains:
        - "page": the page number (1-indexed)
        - "text": the extracted and cleaned text for that page
        """
        results = []
        doc = fitz.open(file_path)
        
        for i, page in enumerate(doc):
            text = page.get_text()
            cleaned_text = self._clean_text(text)
            
            # Simple length check to filter out empty pages or pages with just a number
            if len(cleaned_text.strip()) > 10:
                results.append({
                    "page": i + 1,
                    "text": cleaned_text
                })
        
        doc.close()
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
