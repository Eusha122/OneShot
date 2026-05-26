import logging

from app.db.database import sessionmanager
from app.db.models import Document, DocumentChunk, DocumentStatus
from app.services.rag.extractor import extractor
from app.services.rag.chunker import chunker
from app.services.rag.embeddings import embeddings_engine
from app.adapters.chroma_store import chroma_store

logger = logging.getLogger(__name__)


async def process_document_task(document_id: int, file_path: str):
    """
    Background task to process an uploaded PDF document.

    Creates its own AsyncSession via sessionmanager because
    BackgroundTasks run outside the request lifecycle — the
    route-injected session is already closed by the time this runs.
    """
    async with sessionmanager.session() as session:
        try:
            # 1. Update status to processing
            doc = await session.get(Document, document_id)
            if not doc:
                logger.error(f"Document {document_id} not found.")
                return

            doc.status = DocumentStatus.processing
            await session.commit()

            # 2. Extract text (PyMuPDF)
            logger.info(f"Extracting text from {file_path}")
            pages = extractor.extract_text(file_path)

            if not pages:
                raise ValueError("No text extracted from document.")

            # 3. Chunk text
            logger.info(f"Chunking document {document_id}")
            base_metadata = {
                "source_file": doc.original_name,
                "source_type": doc.source_type or "uploaded_notes",
                "trust_level": doc.trust_level or "variable",
            }

            chunks = chunker.chunk_document(pages, base_metadata)

            if not chunks:
                raise ValueError("No chunks generated from document.")

            # 4. Generate embeddings
            logger.info(f"Generating embeddings for {len(chunks)} chunks")
            texts = [chunk["content"] for chunk in chunks]
            embeddings = embeddings_engine.embed_batch(texts)

            # 5. Store vectors in ChromaDB
            logger.info(f"Upserting to ChromaDB for document {document_id}")
            chroma_store.upsert_chunks(document_id, chunks, embeddings)

            # 6. Save chunk metadata to SQLite
            for i, chunk in enumerate(chunks):
                db_chunk = DocumentChunk(
                    document_id=document_id,
                    chunk_index=i,
                    page_number=chunk["metadata"]["page"],
                    content_preview=chunk["content"][:200],
                    embedding_id=f"doc_{document_id}_chunk_{i}",
                    trust_level=chunk["metadata"]["trust_level"],
                    source_type=chunk["metadata"]["source_type"],
                )
                session.add(db_chunk)

            # 7. Mark completed
            doc.status = DocumentStatus.completed
            doc.page_count = len(pages)
            doc.chunk_count = len(chunks)
            await session.commit()
            logger.info(f"Successfully processed document {document_id}")

        except Exception:
            logger.exception(f"Failed to process document {document_id}")
            await session.rollback()
            # Mark as failed in a clean transaction
            try:
                doc = await session.get(Document, document_id)
                if doc:
                    doc.status = DocumentStatus.failed
                    await session.commit()
            except Exception:
                logger.exception(
                    f"Could not mark document {document_id} as failed"
                )
