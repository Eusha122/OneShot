import argparse
import os
import shutil
import time
from pathlib import Path

# Add project root to path if running directly
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))

from app.core.storage import TEXTBOOKS_DIR, init_storage
from app.services.rag.extractor import extractor
from app.services.rag.chunker import chunker
from app.services.rag.embeddings import embeddings_engine
from app.adapters.chroma_store import chroma_store
from app.db.database import sessionmanager
from app.db.models import Document, DocumentChunk, DocumentStatus

async def ingest_file(file_path: str, subject: str, grade: str, board: str, max_pages: int = None):
    start_time = time.time()
    source_path = Path(file_path)
    if not source_path.exists():
        print(f"Error: File '{file_path}' does not exist.")
        return

    # Initialize storage
    init_storage()

    # Create a destination in the permanent textbooks folder
    dest_path = TEXTBOOKS_DIR / source_path.name
    # Don't overwrite if it's the same file
    if source_path.resolve() != dest_path.resolve():
        shutil.copy2(source_path, dest_path)
        print(f"Copied {source_path.name} to permanent storage.")

    # Create Document record
    async with sessionmanager.session() as session:
        # Check if already exists
        # To avoid duplicating logic and handle async properly in this script
        from sqlalchemy import select
        result = await session.execute(select(Document).filter_by(filename=dest_path.name))
        existing_doc = result.scalar_one_or_none()
        
        if existing_doc:
            print(f"Document {dest_path.name} already exists in DB. Proceeding will overwrite its chunks.")
            doc_id = existing_doc.id
            # Delete old chunks
            await session.execute(
                DocumentChunk.__table__.delete().where(DocumentChunk.document_id == doc_id)
            )
            await session.commit()
            chroma_store.delete_document_chunks(doc_id)
        else:
            doc = Document(
                filename=dest_path.name,
                original_name=source_path.name,
                status=DocumentStatus.processing,
                source_type="ssc_textbook",
                trust_level="high"
            )
            session.add(doc)
            await session.commit()
            await session.refresh(doc)
            doc_id = doc.id
            
    print(f"Starting extraction for {dest_path.name}...")
    pages = extractor.extract_text(str(dest_path), max_pages=max_pages)
    
    if not pages:
        print("[ERROR] OCR extraction failed. No text could be extracted from textbook.")
        print(f"Aborting ingestion for {dest_path.name}.")
        # Optionally, delete the document record if created
        async with sessionmanager.session() as session:
            await session.execute(Document.__table__.delete().where(Document.id == doc_id))
            await session.commit()
        return

    print(f"Chunking {len(pages)} pages...")
    base_metadata = {
        "subject": subject,
        "class_level": grade,
        "board": board,
        "source_file": dest_path.name,
        "source_type": "ssc_textbook",
        "trust_level": "high",
    }
    chunks = chunker.chunk_document(pages, base_metadata)
    
    if not chunks:
        print("[ERROR] Extraction failed. No chunks generated from textbook.")
        print(f"Aborting ingestion for {dest_path.name}.")
        async with sessionmanager.session() as session:
            await session.execute(Document.__table__.delete().where(Document.id == doc_id))
            await session.commit()
        return
        
    print(f"Embedding {len(chunks)} chunks...")
    texts_to_embed = [c["content"] for c in chunks]
    embeddings = embeddings_engine.embed_batch(texts_to_embed)
    
    print("Saving to ChromaDB...")
    chroma_store.upsert_chunks(doc_id, chunks, embeddings)
    
    print("Saving chunk metadata to SQLite...")
    async with sessionmanager.session() as session:
        for i, chunk in enumerate(chunks):
            meta = chunk["metadata"]
            db_chunk = DocumentChunk(
                document_id=doc_id,
                chunk_index=i,
                chapter=meta.get("chapter"),
                topic=meta.get("topic"),
                subject=meta.get("subject"),
                class_level=meta.get("class_level"),
                page_number=meta.get("page"),
                content_preview=chunk["content"][:200],
                trust_level=meta.get("trust_level"),
                source_type=meta.get("source_type")
            )
            session.add(db_chunk)
            
        result = await session.execute(select(Document).filter_by(id=doc_id))
        doc = result.scalar_one()
        doc.status = DocumentStatus.completed
        doc.page_count = len(pages)
        doc.chunk_count = len(chunks)
        await session.commit()

    elapsed = time.time() - start_time
    print(f"Successfully ingested {dest_path.name}!")
    print(f"Stats: {len(pages)} pages, {len(chunks)} chunks, took {elapsed:.1f} seconds.")

async def main():
    parser = argparse.ArgumentParser(description="Ingest curriculum textbooks into Educational RAG")
    parser.add_argument("--file", type=str, help="Path to single PDF file")
    parser.add_argument("--dir", type=str, help="Path to directory containing PDF files")
    parser.add_argument("--subject", type=str, required=True, choices=["Physics", "Chemistry", "Biology", "ICT", "Higher Math", "General Math"])
    parser.add_argument("--grade", type=str, required=True, help="e.g., 'Class 9', 'Class 10'")
    parser.add_argument("--board", type=str, required=True, help="e.g., 'SSC', 'HSC'")
    parser.add_argument("--max-pages", type=int, default=None, help="Maximum number of pages to extract (useful for OCR debugging)")
    
    args = parser.parse_args()
    
    if not args.file and not args.dir:
        print("Error: Must provide either --file or --dir")
        return
        
    if args.file:
        await ingest_file(args.file, args.subject, args.grade, args.board, args.max_pages)
    
    if args.dir:
        directory = Path(args.dir)
        if not directory.is_dir():
            print(f"Error: Directory '{args.dir}' does not exist or is not a directory.")
            return
            
        for pdf_path in directory.glob("*.pdf"):
            print(f"\n--- Processing {pdf_path.name} ---")
            await ingest_file(str(pdf_path), args.subject, args.grade, args.board, args.max_pages)

if __name__ == "__main__":
    import asyncio
    asyncio.run(main())
