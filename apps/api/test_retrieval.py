import sys
import asyncio
from app.api.routes.chat import _is_simple_greeting
from app.services.rag.retriever import retriever

def run_tests():
    queries = [
        {"q": "hello", "expected_rag": False},
        {"q": "thanks", "expected_rag": False},
        {"q": "What languages are mentioned?", "expected_rag": True},
        {"q": "Explain momentum", "expected_rag": True},
        {"q": "ajkshdjkas hdkasjhdask j", "expected_rag": True} # nonsense
    ]
    
    print("Running Regression Tests for Query Classification...")
    for item in queries:
        q = item["q"]
        is_greeting = _is_simple_greeting(q)
        rag_used = not is_greeting
        
        status = "PASS" if rag_used == item["expected_rag"] else "FAIL"
        print(f"[{status}] Query: '{q}' -> RAG Triggered: {rag_used} (Expected: {item['expected_rag']})")
        
        if rag_used:
            res = retriever.retrieve(query=q, filters={}, top_k=3)
            print(f"         Found {len(res)} chunks")

if __name__ == "__main__":
    run_tests()
