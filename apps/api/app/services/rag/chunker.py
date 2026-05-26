import re
from typing import List, Dict, Any

class DocumentChunker:
    def __init__(self, target_words: int = 500, overlap_words: int = 80, max_words: int = 800, max_chars: int = 4000):
        self.target_words = target_words
        self.overlap_words = overlap_words
        self.max_words = max_words
        self.max_chars = max_chars

    def _infer_metadata_from_text(self, text: str, base_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Attempts to infer chapter or topic from text headers.
        Optimized for typical textbook structures (e.g., 'CHAPTER 1: INTRODUCTION').
        """
        inferred = base_metadata.copy()
        
        # Look for the first few lines of the chunk
        lines = [line.strip() for line in text.split('\n')[:5] if line.strip()]
        for line in lines:
            # If a line is short and uppercase, it might be a topic or heading
            if len(line) < 60 and line.isupper():
                if "CHAPTER" in line or "UNIT" in line:
                    inferred["chapter"] = line
                elif not inferred.get("topic"):
                    inferred["topic"] = line
                    
            # Look for explicit chapter prefixes even if not uppercase
            elif line.lower().startswith("chapter ") or line.lower().startswith("unit "):
                inferred["chapter"] = line[:60]
                
        return inferred

    def chunk_document(
        self, 
        pages: List[Dict[str, str]], 
        base_metadata: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        chunks = []
        current_chunk_words = []
        
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
                
                # Check for absolute maximums to avoid massive malformed chunks
                if len(para_words) > self.max_words:
                    # Hard split the paragraph if it's monstrously huge (e.g., no newlines)
                    for i in range(0, len(para_words), self.target_words):
                        sub_para = para_words[i:i + self.target_words]
                        chunks.append(self._create_chunk_dict(" ".join(sub_para), page_num, base_metadata))
                    continue

                if len(current_chunk_words) + len(para_words) > self.target_words and current_chunk_words:
                    chunk_text = " ".join(current_chunk_words)
                    # Truncate by max chars just in case words are extremely long
                    if len(chunk_text) > self.max_chars:
                        chunk_text = chunk_text[:self.max_chars]

                    chunks.append(self._create_chunk_dict(
                        chunk_text, 
                        start_page, 
                        base_metadata
                    ))
                    
                    overlap_start = max(0, len(current_chunk_words) - self.overlap_words)
                    current_chunk_words = current_chunk_words[overlap_start:]
                    start_page = page_num
                
                current_chunk_words.extend(para_words)
        
        if current_chunk_words:
            chunk_text = " ".join(current_chunk_words)
            if len(chunk_text) > self.max_chars:
                chunk_text = chunk_text[:self.max_chars]
                
            chunks.append(self._create_chunk_dict(
                chunk_text, 
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
        # Infer specific metadata (chapter/topic) based on chunk content
        enriched_meta = self._infer_metadata_from_text(text, base_metadata)
        
        return {
            "content": text,
            "metadata": {
                "subject": enriched_meta.get("subject", ""),
                "chapter": enriched_meta.get("chapter", ""),
                "topic": enriched_meta.get("topic", ""),
                "page": page_number,
                "source_file": enriched_meta.get("source_file", ""),
                "content_type": enriched_meta.get("content_type", ""),
                "trust_level": enriched_meta.get("trust_level", "medium"),
                "source_type": enriched_meta.get("source_type", ""),
                "class_level": enriched_meta.get("class_level", "")
            }
        }

chunker = DocumentChunker()
