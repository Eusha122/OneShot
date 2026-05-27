import logging
import time
from typing import List, Dict, Any, Optional
from collections import OrderedDict
import json
import re

from app.services.rag.embeddings import embeddings_engine
from app.adapters.chroma_store import chroma_store
from app.core.config import settings

logger = logging.getLogger(__name__)

class HybridRetriever:
    def __init__(self, max_cache_size: int = 100):
        self._cache: OrderedDict = OrderedDict()
        self.max_cache_size = max_cache_size

    def _detect_query_subject(self, query: str) -> Optional[str]:
        """Heuristic to detect subject from user query."""
        q = query.lower()
        if any(w in q for w in ["physics", "newton", "force", "motion", "gravity", "velocity", "acceleration", "projectile", "kinetic"]):
            return "physics"
        if any(w in q for w in ["chemistry", "atom", "molecule", "reaction", "acid", "base", "ph", "periodic"]):
            return "chemistry"
        if any(w in q for w in ["biology", "cell", "dna", "mitosis", "meiosis", "plant", "animal", "tissue"]):
            return "biology"
        if any(w in q for w in ["ict", "computer", "html", "internet", "software", "hardware", "network"]):
            return "ict"
        if any(w in q for w in ["math", "algebra", "geometry", "calculus", "equation", "quadratic", "integral"]):
            return "math"
        return None

    def _get_cache_key(self, query: str, filters: Dict[str, Any]) -> str:
        # Create a deterministic cache key from query and filters
        return f"{query}_{json.dumps(filters, sort_keys=True)}"

    def retrieve(self, query: str, filters: Dict[str, Any], top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Retrieves top chunks using adaptive metadata filtering and semantic search.
        Includes trust-aware reranking and score normalization.
        """
        # Check cache first
        cache_key = self._get_cache_key(query, filters)
        if cache_key in self._cache:
            if settings.rag_debug:
                logger.info(f"[RAG_DEBUG] Cache hit for query: '{query}'")
            return self._cache[cache_key]

        start_time = time.perf_counter()
        
        if settings.rag_debug:
            logger.info(f"[RAG_DEBUG] Retrieving for query: '{query}' with filters: {filters}")
        else:
            logger.info(f"Retrieving for query: '{query}'")

        # 1. Generate query embedding
        embed_start = time.perf_counter()
        query_embedding = embeddings_engine.embed_text(query)
        embed_time = time.perf_counter() - embed_start

        # 2. Adaptive Retrieval Flow
        search_start = time.perf_counter()
        chroma_filter = self._build_chroma_filter(filters)
        
        fallback_used = False
        is_global_search = not chroma_filter and not filters.get("document_ids")
        
        if chroma_filter and "document_ids" in filters:
            logger.info("[RETRIEVER] document-scoped retrieval enabled")
            
        # Curriculum-first retrieval logic for global searches
        if is_global_search:
            # Try finding official textbook chunks first
            curr_filter = {"source_type": {"$eq": "ssc_textbook"}}
            raw_results = chroma_store.query_chunks(
                query_embeddings=[query_embedding],
                filters=curr_filter,
                n_results=top_k * 3
            )
            # If not enough results, fall back to global
            if not raw_results or not raw_results['documents'] or not raw_results['documents'][0]:
                fallback_used = True
                raw_results = chroma_store.query_chunks(
                    query_embeddings=[query_embedding],
                    filters=None,
                    n_results=top_k * 3
                )
        else:
            # Document-scoped or filtered search
            raw_results = chroma_store.query_chunks(
                query_embeddings=[query_embedding],
                filters=chroma_filter,
                n_results=top_k * 3 # Retrieve more for reranking
            )
    
            # Fallback to semantic-only if metadata filtering yields no results
            if not raw_results or not raw_results['documents'] or not raw_results['documents'][0]:
                if chroma_filter:
                    fallback_used = True
                    if settings.rag_debug:
                        logger.info(f"[RAG_DEBUG] Metadata filter yielded empty results. Activating semantic fallback.")
                    raw_results = chroma_store.query_chunks(
                        query_embeddings=[query_embedding],
                        filters=None,
                        n_results=top_k * 3
                    )
        
        search_time = time.perf_counter() - search_start

        logger.info(f"[RETRIEVER] fallback_used={fallback_used}")

        if not raw_results or not raw_results['documents'] or not raw_results['documents'][0]:
            if settings.rag_debug:
                logger.info(f"[RAG_DEBUG] Retrieval completely empty for query: '{query}'")
            return []

        chunks = raw_results['documents'][0]
        metadatas = raw_results['metadatas'][0]
        distances = raw_results['distances'][0] if 'distances' in raw_results and raw_results['distances'] else [0.0] * len(chunks)
        chunk_ids = raw_results['ids'][0]

        # 3. Trust-Aware Reranking & Score Normalization
        rerank_start = time.perf_counter()
        scored_chunks = []
        detected_subject = self._detect_query_subject(query)
        
        for i in range(len(chunks)):
            # Convert Chroma distance to similarity score
            # Cosine distance ranges from 0 to 2, so similarity is max(0, 1 - distance)
            similarity = max(0.0, 1.0 - distances[i])
            meta = metadatas[i]
            
            # Apply trust boosts and penalties
            final_score = self._apply_trust_modifiers(similarity, meta, filters, detected_subject)
            
            # Apply Similarity Threshold (Bypass if document-scoped search)
            if not filters.get("document_ids") and final_score < 0.05:
                continue

            content = chunks[i]
            preview = content[:400] + "..." if len(content) > 400 else content

            scored_chunks.append({
                "chunk_id": chunk_ids[i],
                "document_id": meta.get("document_id"),
                "content": content,
                "preview_content": preview,
                "score": final_score,
                "chapter": meta.get("chapter", "Unknown") or "Unknown",
                "topic": meta.get("topic", "Unknown") or "Unknown",
                "subject": meta.get("subject", "Unknown") or "Unknown",
                "page": meta.get("page", 0) or 0,
                "source": meta.get("source_file", "Unknown") or "Unknown",
                "trust_level": meta.get("trust_level", "medium") or "medium",
                "source_type": meta.get("source_type", "unknown") or "unknown"
            })
            
        # 4. Sort by final score descending and limit to top_k
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        final_results = scored_chunks[:top_k]
        
        print(f"[DEBUG] Retrieved chunks: {len(final_results)}")
        for r in final_results[:3]:
            print(f"[DEBUG] Score: {r['score']}")
            print(f"[DEBUG] Preview: {r['preview_content'][:300]}")
        
        print(f"[DEBUG] Retrieved chunks: {len(final_results)}")
        for r in final_results[:3]:
            print(f"[DEBUG] Score: {r['score']}")
            print(f"[DEBUG] Preview: {r['preview_content'][:300]}")
        
        logger.info(f"[RETRIEVER] retrieved_chunks={len(final_results)}")
        if final_results:
            logger.info(f"[RETRIEVER] top_chunk_preview=\"{final_results[0]['preview_content']}\"")
        
        rerank_time = time.perf_counter() - rerank_start

        total_time = time.perf_counter() - start_time

        # 5. Logging and Metrics
        if settings.rag_debug:
            logger.info(
                f"[RAG_DEBUG] Latency - Embed: {embed_time:.3f}s, Search: {search_time:.3f}s, Rerank: {rerank_time:.3f}s, Total: {total_time:.3f}s"
            )
            for res in final_results:
                logger.info(f"[RAG_DEBUG] Retrieved chunk {res['chunk_id']} with score {res['score']:.3f} from '{res['source']}'")
        else:
            logger.info(f"Retrieval completed in {total_time:.3f}s, found {len(final_results)} chunks above threshold.")

        # 6. Cache successful results
        if final_results:
            self._cache[cache_key] = final_results
            if len(self._cache) > self.max_cache_size:
                self._cache.popitem(last=False) # Evict oldest

        return final_results

    def _build_chroma_filter(self, user_filters: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Converts application-level filters to ChromaDB '$and' / '$eq' syntax.
        """
        if not user_filters:
            return None
            
        conditions = []
        if "subject" in user_filters and user_filters["subject"]:
            conditions.append({"subject": {"$eq": user_filters["subject"].lower()}})
            
        if "class_level" in user_filters and user_filters["class_level"]:
            conditions.append({"class_level": {"$eq": str(user_filters["class_level"])}})
            
        if "document_ids" in user_filters and user_filters["document_ids"]:
            doc_ids = user_filters["document_ids"]
            if len(doc_ids) == 1:
                conditions.append({"document_id": {"$eq": doc_ids[0]}})
            else:
                conditions.append({"document_id": {"$in": doc_ids}})
            
        if not conditions:
            return None
            
        if len(conditions) == 1:
            return conditions[0]
            
        return {"$and": conditions}

    def _apply_trust_modifiers(self, base_score: float, meta: Dict[str, Any], filters: Dict[str, Any], detected_subject: Optional[str] = None) -> float:
        """
        Boosts or penalizes the semantic similarity score based on trust rules.
        """
        score = base_score
        trust_level = meta.get("trust_level", "variable")
        source_type = meta.get("source_type", "unknown")
        chunk_subject = meta.get("subject", "").lower() if meta.get("subject") else ""
        
        # Boosts
        if trust_level == "high":
            score += 0.10
        if source_type in ["ssc_textbook", "board_question"]:
            score += 0.10
        if detected_subject and chunk_subject and detected_subject in chunk_subject:
            score += 0.08
            
        # Penalties
        if trust_level == "variable":
            score -= 0.08
        if source_type in ["uploaded_notes", "internet"]:
            score -= 0.05
            
        return score

# Singleton instance
retriever = HybridRetriever()
