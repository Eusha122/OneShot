# AI Visual Learning Platform (OneShot AI)

A production-oriented foundation for a RAG-powered visual AI tutor. The platform provides a premium chat workspace with local AI support, contextual visual learning blocks, interactive physics/math simulations, and adaptive exam generation.

## System Architecture

```txt
apps/web       React + Vite + TailwindCSS frontend
apps/api       FastAPI backend
packages/shared Shared TypeScript contracts
infra          Local service configuration
docs           Architecture and implementation notes
```

---

## Getting Started: Local Setup Guide

Follow these steps to get the entire project running on your local machine.

### 1. Prerequisites
Ensure you have the following installed on your machine:
* **Node.js** (v18+ recommended)
* **Python** (3.10+ recommended)
* **Docker** & **Docker Compose**
* **Ollama** (for local LLM inference)

### 2. Infrastructure Setup (Databases & Services)
The project relies on PostgreSQL, ChromaDB, and optionally SearXNG. Start the required backend infrastructure using Docker Compose:

```bash
docker compose up -d
```
*(This starts `postgres`, `chromadb`, and `redis` in the background).*

### 3. Local AI Engine (Ollama)
The platform uses the `qwen2.5:1.5b` model locally (as well as larger models for specific tasks). Make sure the Ollama daemon is running, pull the model, and keep it active:

```bash
# In terminal 1: Start the Ollama server (if not running as a background service)
ollama serve

# In terminal 2: Pull the required model
ollama pull qwen2.5:1.5b
```

### 4. Backend Setup (FastAPI)
Install the Python dependencies and launch the backend server:

```bash
# Install the API dependencies
python -m pip install -e apps/api

# Run the backend API with hot-reloading
python -m uvicorn app.main:app --app-dir apps/api --reload --host 127.0.0.1 --port 8000
```
*Health Check:* You can verify the API is running by visiting `http://127.0.0.1:8000/health` in your browser.

### 5. Frontend Setup (React / Vite)
Install Node modules and start the Vite development server for the web app:

```bash
# Install all dependencies (from the root directory)
npm install

# Start the frontend app
npm run dev:web
```

The web interface should now be accessible at `http://localhost:5173` (or whichever port Vite allocates).
