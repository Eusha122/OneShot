import logging
from typing import List
from sentence_transformers import SentenceTransformer

logger = logging.getLogger(__name__)

class EmbeddingEngine:
    _instance = None
    
    def __new__(cls):
        if cls._instance is None:
            logger.info("Initializing EmbeddingEngine with all-MiniLM-L6-v2...")
            cls._instance = super(EmbeddingEngine, cls).__new__(cls)
            # Load model ONCE, optimize for CPU
            cls._instance.model = SentenceTransformer('all-MiniLM-L6-v2', device='cpu')
            cls._instance.batch_size = 32
        return cls._instance

    def embed_text(self, text: str) -> List[float]:
        """Embeds a single piece of text."""
        # encode returns a numpy array, convert to list of floats for DB/Chroma
        embedding = self.model.encode(text, convert_to_numpy=True)
        return embedding.tolist()

    def embed_batch(self, texts: List[str]) -> List[List[float]]:
        """Embeds a batch of texts using the configured batch size."""
        embeddings = self.model.encode(texts, batch_size=self.batch_size, convert_to_numpy=True)
        return embeddings.tolist()

# Singleton instance
embeddings_engine = EmbeddingEngine()
