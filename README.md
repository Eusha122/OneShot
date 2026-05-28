# AI Visual Learning Platform

A production-oriented foundation for a RAG-powered visual AI tutor. The first milestone is a premium chat workspace with local AI support, contextual visual learning blocks, and contracts ready for RAG, replay, source trust, and conversation-scoped memory.

## Workspace

```txt
apps/web       React + Vite + TailwindCSS frontend
apps/api       FastAPI backend
packages/shared Shared TypeScript contracts
infra          Local service configuration
docs           Architecture and implementation notes
```

## Local Development

Install frontend dependencies:

```bash
npm install
```

Run the frontend:

```bash
npm run dev:web
```

Install backend dependencies:

```bash
python -m pip install -e apps/api
```

Run the backend:

```bash
uvicorn app.main:app --app-dir apps/api --reload
```

Run with local Ollama:

```bash
ollama serve
ollama pull qwen2.5:1.5b
ollama run qwen2.5:1.5b
python -m uvicorn app.main:app --app-dir apps/api --reload --host 127.0.0.1 --port 8000
npm.cmd run dev:web
```

Start local infrastructure:

```bash
docker compose up -d postgres chromadb ollama
```

Health check:

```bash
curl http://localhost:8000/health
```
