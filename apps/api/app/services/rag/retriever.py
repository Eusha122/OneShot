import logging
from typing import List, Dict, Any, Optional

from app.services.rag.embeddings import embeddings_engine
from app.adapters.chroma_store import chroma_store

logger = logging.getLogger(__name__)

class HybridRetriever:
    def __init__(self):
        pass

    def retrieve(self, query: str, filters: Dict[str, Any], top_k: int = 5) -> List[Dict[str, Any]]:
        """
        Retrieves top chunks using a combination of metadata filtering and semantic search.
        Includes trust-aware reranking/boosting.
        """
        logger.info(f"Retrieving for query: '{query}' with filters: {filters}")
        
        # 1. Generate query embedding
        query_embedding = embeddings_engine.embed_text(query)
        
        # 2. Build Chroma metadata filter
        chroma_filter = self._build_chroma_filter(filters)
        
        # 3. We retrieve slightly more chunks than top_k to allow for reranking
        raw_results = chroma_store.query_chunks(
            query_embeddings=[query_embedding],
            filters=chroma_filter,
            n_results=top_k * 2
        )
        
        if not raw_results or not raw_results['documents'] or not raw_results['documents'][0]:
            return []
            
        chunks = raw_results['documents'][0]
        metadatas = raw_results['metadatas'][0]
        distances = raw_results['distances'][0] if 'distances' in raw_results and raw_results['distances'] else [0.0] * len(chunks)
        
        # 4. Trust-Aware Reranking
        scored_chunks = []
        for i in range(len(chunks)):
            base_score = 1.0 - distances[i] if distances[i] <= 1.0 else 0.0 # Convert distance to similarity score
            meta = metadatas[i]
            
            # Apply trust boosts and penalties
            final_score = self._apply_trust_modifiers(base_score, meta, filters)
            
            scored_chunks.append({
                "content": chunks[i],
                "score": final_score,
                "chapter": meta.get("chapter", "Unknown"),
                "topic": meta.get("topic", "Unknown"),
                "subject": meta.get("subject", "Unknown"),
                "page": meta.get("page", 0),
                "source": meta.get("source_file", "Unknown"),
                "trust_level": meta.get("trust_level", "medium"),
                "source_type": meta.get("source_type", "unknown")
            })
            
        # 5. Sort by final score descending and limit to top_k
        scored_chunks.sort(key=lambda x: x["score"], reverse=True)
        return scored_chunks[:top_k]

    def _build_chroma_filter(self, user_filters: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """
        Converts application-level filters to ChromaDB '$and' / '$eq' syntax.
        """
        if not user_filters:
            return None
            
        conditions = []
        # We strictly filter by subject if provided
        if "subject" in user_filters and user_filters["subject"]:
            conditions.append({"subject": {"$eq": user_filters["subject"].lower()}})
            
        # We strictly filter by class_level if provided
        if "class_level" in user_filters and user_filters["class_level"]:
            conditions.append({"class_level": {"$eq": str(user_filters["class_level"])}})
            
        if not conditions:
            return None
            
        if len(conditions) == 1:
            return conditions[0]
            
        return {"$and": conditions}

    def _apply_trust_modifiers(self, base_score: float, meta: Dict[str, Any], filters: Dict[str, Any]) -> float:
        """
        Boosts or penalizes the semantic similarity score based on trust rules.
        """
        score = base_score
        trust_level = meta.get("trust_level", "variable")
        source_type = meta.get("source_type", "unknown")
        
        # Boosts
        if trust_level == "high":
            score += 0.1
        if source_type in ["ssc_textbook", "board_question"]:
            score += 0.15
            
        # Penalties
        if trust_level == "variable":
            score -= 0.1
        if source_type in ["uploaded_notes", "internet"]:
            score -= 0.15
            
        return score

# Singleton instance
retriever = HybridRetriever()
