import os
import chromadb
from chromadb.config import Settings
from typing import List, Dict, Any

from app.core.storage import CHROMA_DIR

class ChromaStore:
    def __init__(self, persist_directory: str = str(CHROMA_DIR)):
        # Ensure the directory exists
        os.makedirs(persist_directory, exist_ok=True)
        
        # Initialize local persistent Chroma client
        self.client = chromadb.PersistentClient(path=persist_directory)
        
        # Get or create the main collection
        self.collection_name = "ssc_documents"
        self.collection = self.client.get_or_create_collection(
            name=self.collection_name,
            metadata={"hnsw:space": "cosine"}
        )

    def upsert_chunks(self, document_id: int, chunks: List[Dict[str, Any]], embeddings: List[List[float]]):
        """
        Upserts a list of chunks and their corresponding embeddings into ChromaDB.
        chunks should be a list of dicts with 'content' and 'metadata'.
        """
        if not chunks:
            return
            
        ids = []
        documents = []
        metadatas = []
        
        for i, chunk in enumerate(chunks):
            # Unique ID for the chunk in ChromaDB
            chunk_id = f"doc_{document_id}_chunk_{i}"
            ids.append(chunk_id)
            
            documents.append(chunk["content"])
            
            # Ensure metadata values are valid ChromaDB types (str, int, float, bool)
            meta = chunk["metadata"].copy()
            meta["document_id"] = document_id
            
            # Convert any unsupported types or empty values to string or default
            clean_meta = {}
            for k, v in meta.items():
                if v is None:
                    continue
                if isinstance(v, (str, int, float, bool)):
                    clean_meta[k] = v
                else:
                    clean_meta[k] = str(v)
            
            metadatas.append(clean_meta)

        self.collection.upsert(
            ids=ids,
            embeddings=embeddings,
            documents=documents,
            metadatas=metadatas
        )

    def query_chunks(self, query_embeddings: List[List[float]], filters: Dict[str, Any] = None, n_results: int = 5):
        """
        Queries the vector store for the closest chunks based on embeddings.
        Applies optional metadata filters.
        """
        query_params = {
            "query_embeddings": query_embeddings,
            "n_results": n_results
        }
        
        if filters:
            query_params["where"] = filters
            
        return self.collection.query(**query_params)

    def delete_document_chunks(self, document_id: int):
        """
        Deletes all chunks associated with a specific document.
        """
        self.collection.delete(
            where={"document_id": document_id}
        )

# Singleton instance
chroma_store = ChromaStore()
