import re
from typing import List, Dict, Any

class DocumentChunker:
    def __init__(self, target_words: int = 500, overlap_words: int = 80):
        self.target_words = target_words
        self.overlap_words = overlap_words

    def chunk_document(
        self, 
        pages: List[Dict[str, str]], 
        base_metadata: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """
        Chunks the document based on paragraph boundaries, aiming for 
        ~400-600 words per chunk with 80 words overlap.
        
        base_metadata must contain:
        - subject
        - chapter (if known)
        - topic (if known)
        - source_file
        - content_type
        - trust_level
        - source_type
        - class_level
        """
        chunks = []
        current_chunk_words = []
        current_chunk_text = ""
        
        # Track the page where this chunk started
        start_page = pages[0]["page"] if pages else 1
        
        for page_data in pages:
            page_num = page_data["page"]
            text = page_data["text"]
            
            # Split by double newline to respect paragraphs
            paragraphs = re.split(r'\n\s*\n', text)
            
            for para in paragraphs:
                para = para.strip()
                if not para:
                    continue
                    
                para_words = para.split()
                
                # If adding this paragraph exceeds target words significantly, save current chunk
                if len(current_chunk_words) + len(para_words) > self.target_words and current_chunk_words:
                    chunks.append(self._create_chunk_dict(
                        " ".join(current_chunk_words), 
                        start_page, 
                        base_metadata
                    ))
                    
                    # Create overlap
                    overlap_start = max(0, len(current_chunk_words) - self.overlap_words)
                    current_chunk_words = current_chunk_words[overlap_start:]
                    start_page = page_num # update start page for the new chunk
                
                current_chunk_words.extend(para_words)
        
        # Add the final chunk if anything remains
        if current_chunk_words:
            chunks.append(self._create_chunk_dict(
                " ".join(current_chunk_words), 
                start_page, 
                base_metadata
            ))
            
        return chunks

    def _create_chunk_dict(
        self, 
        text: str, 
        page_number: int, 
        base_metadata: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Helper to create a unified chunk dictionary with required metadata."""
        return {
            "content": text,
            "metadata": {
                "subject": base_metadata.get("subject", ""),
                "chapter": base_metadata.get("chapter", ""),
                "topic": base_metadata.get("topic", ""),
                "page": page_number,
                "source_file": base_metadata.get("source_file", ""),
                "content_type": base_metadata.get("content_type", ""),
                "trust_level": base_metadata.get("trust_level", "medium"),
                "source_type": base_metadata.get("source_type", ""),
                "class_level": base_metadata.get("class_level", "")
            }
        }

chunker = DocumentChunker()
