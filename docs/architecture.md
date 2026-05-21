# Architecture

The platform is a monorepo with a React/Vite frontend, FastAPI backend, shared contracts, and local-first infrastructure services.

## Services

- Web app: premium AI learning workspace.
- API: chat, persistence, AI adapters, RAG, documents, exams, analytics.
- PostgreSQL: conversations, messages, memory, exams, analytics.
- ChromaDB: vector storage for educational chunks.
- Ollama: first local LLM runtime.
- SearxNG: optional self-hosted internet search.

## Design Direction

The first user-facing experience is the chat workspace. Visual whiteboard, graph, simulation, replay, and expansion blocks appear contextually inside the conversation.
