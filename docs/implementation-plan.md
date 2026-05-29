# Enterprise Implementation Plan — OneShot (Track 1 EdTech)

This plan merges the 16-task product roadmap, the competition Track 1 rubric, and the ShikkhaAI winning pattern into one execution path: fast to demo, solid enough to scale, and judge-ready.

## 0. North Star
What “done” means for the competition:

| Judge expectation | Deliverable |
| --- | --- |
| **Adaptive AI Tutor / Custom EdTech** | End-to-end loop: profile → RAG → LLM → task/visual → analytics → feedback |
| **Mandatory stack story** | Local LLM (Ollama) + cloud LLM (optional) + RAG + scraper/ingest + graph curriculum + Postgres |
| **Personalization logic** | Documented rules: grade, weak topics, mode, difficulty, language |
| **Curriculum alignment** | NCTB/board chunks with metadata + trust labels |
| **Impact measurement** | Pilot metrics: pre/post score, topics improved, time-on-task |
| **Accessibility** | Bangla UI + low-bandwidth/offline path |
| **Enterprise grade** | Migrations, tests, observability, feature flags, typed contracts |

### Architecture Principle (Speed + Quality)
Build in vertical slices (one user journey at a time), not horizontal layers (all DB, then all RAG). Each slice ships demo value and production foundations together.

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐     ┌──────────────┐
│  Profile    │────▶│  RAG + Graph │────▶│ LLM Pipeline│────▶│ Visual/Task  │
└─────────────┘     └──────────────┘     └─────────────┘     └──────────────┘
       │                    │                    │                    │
       └────────────────────┴────────────────────┴────────────────────┘
                                    │
                            ┌───────▼────────┐
                            │ Analytics +   │
                            │ Impact metrics │
                            └───────────────┘
```

---

## 1. Target Stack (Enterprise, Competition-Aligned)

| Layer | Choice | Why |
| --- | --- | --- |
| **Frontend** | React + Vite + Tailwind + Framer Motion (keep) | Already built; skip Lovable rewrite |
| **API** | FastAPI + Pydantic v2 | Async, OpenAPI, fast iteration |
| **DB** | PostgreSQL 16 + Alembic | Conversations, profiles, exams, analytics |
| **Vector** | ChromaDB (now) → adapter for PGVector later | Matches plan; isolate behind port |
| **Graph** | Postgres adjacency (Phase 1) → Neo4j optional (Phase 2) | Faster than GraphDB day 1; satisfies “curriculum graph” |
| **LLM local** | Ollama | Mandatory |
| **LLM cloud** | Gemini or Claude via env flag | Satisfies “LLM + Local LLM” |
| **Embeddings** | `sentence-transformers/all-MiniLM-L6-v2` | Plan default |
| **PDF** | PyMuPDF → pdfplumber → PaddleOCR fallback | Plan default |
| **Search** | SearxNG (profile search) | Variable trust internet |
| **Jobs** | Redis + arq or Celery (pick one) | Async ingest/embed without blocking API |
| **Observability** | structlog + OpenTelemetry hooks | Enterprise traceability |
| **CI** | GitHub Actions: lint, test, build | Gate every PR |

> **Competition Narrative:** “Custom React frontend (Cursor-built), Lovable not required for Custom EdTech; full stack otherwise.”

---

## 2. Monorepo Layout
```
apps/
  web/                    # React app
  api/
    app/
      api/routes/         # Thin HTTP handlers
      domain/             # Business rules (pure Python)
      services/           # AI, RAG, ingest, graph
      adapters/           # Ollama, Chroma, SearxNG, storage
      db/                 # SQLAlchemy models, repositories
      schemas/            # Pydantic API + domain DTOs
      workers/            # Background ingest/embed
packages/
  shared/                 # TS contracts (source of truth for FE)
infra/
  docker/
  migrations/             # Optional: shared SQL seeds
docs/
  implementation-plan.md  # This plan (optional save)
  adr/                    # Architecture decision records
```

> **Rule:** `packages/shared` types must match OpenAPI-generated or hand-synced Python schemas. Add a CI check: JSON Schema diff or datamodel-code-generator weekly.

---

## 3. Execution Phases

| Phase | Duration | Outcome | Competition % |
| --- | --- | --- | --- |
| **0 Foundation hardening** | 3–4 days | DB, CI, adapters, flags | 10% |
| **1 Persistence + profile** | 1 week | Real chats + learner profile | 25% |
| **2 RAG core** | 1.5 weeks | Upload, chunk, embed, query, cite | 50% |
| **3 Tutor loop + pipeline** | 1 week | Full chat with RAG + real status SSE | 65% |
| **4 Personalization + graph** | 1 week | Adaptive difficulty + curriculum graph | 75% |
| **5 Visual intelligence** | 1 week | Confidence, Why?, replay persist | 85% |
| **6 Exams + challenges + analytics** | 1.5 weeks | Exam prep + dashboard + impact | 95% |
| **7 Bangla + offline + polish** | 1 week | Track accessibility + rural story | 100% demo |

### Phase 0 — Foundation Hardening (Days 1–4)
Do this first. Everything else depends on it.

#### 0.1 Database layer
- Add dependencies: `sqlalchemy[asyncio]`, `asyncpg`, `alembic`, `redis`, `arq` (or celery).
- `apps/api/app/db/session.py` — async engine from settings.database_url.
- `apps/api/app/db/models/` — base model + timestamps.
- First migration: empty + extensions (`uuid-ossp`, `pg_trgm` optional).
- **Acceptance:**
  - `alembic upgrade head` against Docker Postgres succeeds.
  - Health check includes `db: ok | fail`.

#### 0.2 Domain interfaces (enterprise pattern)
Create ports (abstract) before implementations:
```python
# app/domain/ports.py (conceptual)
class LLMPort: generate, stream
class VectorStorePort: upsert, query
class DocumentStorePort: save_file, get_chunks
class CurriculumGraphPort: neighbors, prerequisites
```
Implement in `adapters/`. Routes only call application services.

#### 0.3 Feature flags
- Settings: `ENABLE_RAG`, `ENABLE_INTERNET`, `ENABLE_CLOUD_LLM`, `MOCK_LLM`.
- Frontend: `VITE_FEATURE_*` mirrors for UI gating.

#### 0.4 CI pipeline
- Github Action configuration (`.github/workflows/ci.yml`):
  - Lint web (eslint)
  - Lint api (ruff)
  - Pytest apps/api
  - Build check web
  - Optional contract check

#### 0.5 Fix infra/ folder
- `infra/docker/.env.example`
- `infra/scripts/wait-for-postgres.sh`
- Document `docker compose up` in README.

---

### Phase 1 — Persistence + Learner Profile (Week 1)
Maps to Task 3 + track user profiling engine.

#### 1.1 Schema (PostgreSQL)
- **learners**: `id`, `display_name`, `grade`, `board` (SSC/FBISE), `language_pref` (bn/en), `created_at`
- **conversations**: `id`, `learner_id`, `title`, `selected_mode`, `updated_at`
- **messages**: `id`, `conversation_id`, `role`, `content`, `learning_mode`, `visual_blocks` (JSONB), `sources` (JSONB), `created_at`
- **conversation_memory**: `conversation_id`, `weak_topics` (JSONB), `explanation_style`, `recent_mistakes` (JSONB), `visual_depth` (enum)
- **attachments**: `id`, `conversation_id`, `file_path`, `mime`, `status`
- **Indexes:** `(learner_id, updated_at DESC)`, `(conversation_id, created_at)`

#### 1.2 APIs
- `POST /api/learners` — Onboarding
- `GET/PATCH /api/learners/{id}` — Profile
- `GET /api/conversations?learner_id=` — Sidebar
- `POST /api/conversations` — New chat
- `GET /api/conversations/{id}` — Reload thread
- `PATCH /api/conversations/{id}/memory` — Update weak topics etc.
- `POST /api/chat/message` — Persist user + assistant
- `POST /api/chat/stream` — Same + stream

---

## 4. What to Do First (First 72 Hours)
1. **Alembic + SQLAlchemy + Docker Postgres wired** (6h, Backend)
2. **Models: learners, conversations, messages, memory** (6h, Backend)
3. **CRUD APIs + OpenAPI** (8h, Backend)
4. **Wire App.tsx sidebar + message load/save** (8h, Frontend)
5. **CI: ruff + pytest + build** (4h, DevOps)
6. **Onboarding modal (grade, language)** (4h, Frontend)
7. **TutorOrchestrator skeleton + pipeline SSE types** (4h, Backend)

---

## 5. Proposed Verification Plan

### Automated Tests
- Integration tests for `/api/chat/stream` and DB persistence.
- Pytest test suites for learner and conversation endpoints.

### Manual Verification
- Testing onboarding flow manually via the frontend UI.
- Validating database persistence by reloading the chat page and verifying previous messages load from PostgreSQL.
