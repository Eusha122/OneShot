import re
from typing import List, Dict, Any

class DocumentChunker:
    def __init__(self, target_words: int = 250, overlap_words: int = 40, max_words: int = 400, max_chars: int = 2000):
        self.target_words = target_words
        self.overlap_words = overlap_words
        self.max_words = max_words
        self.max_chars = max_chars

    def _infer_metadata_from_text(self, text: str, base_metadata: Dict[str, Any]) -> Dict[str, Any]:
        """
        Attempts to infer chapter or topic from text headers.
        Optimized for typical textbook structures including NCTB/Bangladeshi formats.
        """
        inferred = base_metadata.copy()
        
        # Look for the first few lines of the chunk
        lines = [line.strip() for line in text.split('\n')[:5] if line.strip()]
        for line in lines:
            # If a line is short and uppercase, it might be a topic or heading
            if len(line) < 60:
                lower_line = line.lower()
                if "chapter " in lower_line or "unit " in lower_line or "অধ্যায়" in lower_line or "chapter ১" in lower_line:
                    inferred["chapter"] = line[:60]
                elif re.match(r'^\d+\.\d+', line):
                    # Numbered headings like 1.1, 2.3
                    if not inferred.get("topic"):
                        inferred["topic"] = line[:60]
                elif line.isupper() and not inferred.get("topic"):
                    inferred["topic"] = line
                    
        return inferred

    def chunk_document(
        self, 
        pages: List[Dict[str, str]], 
        base_metadata: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        chunks = []
        current_chunk_words = []
        
        start_page = pages[0]["page"] if pages else 1
        current_chapter = base_metadata.get("chapter", "")
        
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
                        chunk_dict = self._create_chunk_dict(" ".join(sub_para), page_num, base_metadata, current_chapter)
                        if "chapter" in chunk_dict["metadata"] and chunk_dict["metadata"]["chapter"]:
                            current_chapter = chunk_dict["metadata"]["chapter"]
                        chunks.append(chunk_dict)
                    continue

                if len(current_chunk_words) + len(para_words) > self.target_words and current_chunk_words:
                    chunk_text = " ".join(current_chunk_words)
                    # Truncate by max chars just in case words are extremely long
                    if len(chunk_text) > self.max_chars:
                        chunk_text = chunk_text[:self.max_chars]

                    chunk_dict = self._create_chunk_dict(chunk_text, start_page, base_metadata, current_chapter)
                    if "chapter" in chunk_dict["metadata"] and chunk_dict["metadata"]["chapter"]:
                        current_chapter = chunk_dict["metadata"]["chapter"]
                    chunks.append(chunk_dict)
                    
                    overlap_start = max(0, len(current_chunk_words) - self.overlap_words)
                    current_chunk_words = current_chunk_words[overlap_start:]
                    start_page = page_num
                
                current_chunk_words.extend(para_words)
        
        if current_chunk_words:
            chunk_text = " ".join(current_chunk_words)
            if len(chunk_text) > self.max_chars:
                chunk_text = chunk_text[:self.max_chars]
                
            chunk_dict = self._create_chunk_dict(chunk_text, start_page, base_metadata, current_chapter)
            chunks.append(chunk_dict)
            
        return chunks

    def _create_chunk_dict(
        self, 
        text: str, 
        page_number: int, 
        base_metadata: Dict[str, Any],
        current_chapter: str = ""
    ) -> Dict[str, Any]:
        """Helper to create a unified chunk dictionary with required metadata."""
        # Infer specific metadata (chapter/topic) based on chunk content
        enriched_meta = self._infer_metadata_from_text(text, base_metadata)
        
        # Carry forward previous chapter if none inferred
        if not enriched_meta.get("chapter") and current_chapter:
            enriched_meta["chapter"] = current_chapter
            
        return {
            "content": text,
            "metadata": {
                "subject": enriched_meta.get("subject", ""),
                "board": enriched_meta.get("board", ""),
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
