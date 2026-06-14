"""
ingest_aion.py — Cosmogenesis Seer Corpus Ingestion
Soul Interface

Ingests the Cosmogenesis Seer corpus into ChromaDB under the
"cosmogenesis" collection. Run this once before starting aion.py.

Usage:
    py -3.11 ingest_aion.py

Place this script inside the Cosmogenesis Seer folder alongside
your source documents (PDFs, TXTs, etc.)

Directory structure expected:
    Cosmogenesis Seer/
    ├── ingest_aion.py          ← this file
    ├── chroma_db/              ← created by this script
    └── docs/                   ← your source documents go here
        ├── davies_mind_of_god.pdf
        ├── penrose_emperors_new_mind.pdf
        └── ... etc
"""

import os
import re
from pathlib import Path
import chromadb
from chromadb.utils import embedding_functions

# ── Configuration ──────────────────────────────────────────────────────────────

# Where ChromaDB will be stored
CHROMA_PATH = str(Path(__file__).parent / "chroma_db")

# Collection name — must match COLLECTION_NAME in aion.py
COLLECTION_NAME = "cosmogenesis"

# Folder containing your source documents
DOCS_PATH = Path(__file__).parent / "docs"

# Chunk settings
CHUNK_SIZE = 1000       # characters per chunk
CHUNK_OVERLAP = 150     # overlap between chunks

# ── Embedding function ─────────────────────────────────────────────────────────

# Uses ChromaDB's default sentence-transformers (no API key needed)
embedding_fn = embedding_functions.DefaultEmbeddingFunction()

# ── ChromaDB setup ─────────────────────────────────────────────────────────────

chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)

# Delete existing collection if re-ingesting
try:
    chroma_client.delete_collection(name=COLLECTION_NAME)
    print(f"Deleted existing '{COLLECTION_NAME}' collection.")
except Exception:
    pass

collection = chroma_client.create_collection(
    name=COLLECTION_NAME,
    embedding_function=embedding_fn,
    metadata={"hnsw:space": "cosine"}
)

print(f"Created collection: {COLLECTION_NAME}")

# ── Text extraction ────────────────────────────────────────────────────────────

def extract_text_from_pdf(path: Path) -> str:
    """Extract text from PDF using pypdf."""
    try:
        import pypdf
        text = ""
        with open(path, "rb") as f:
            reader = pypdf.PdfReader(f)
            for page in reader.pages:
                text += page.extract_text() or ""
        return text
    except ImportError:
        print(f"  ⚠ pypdf not installed. Run: pip install pypdf --break-system-packages")
        return ""
    except Exception as e:
        print(f"  ⚠ Could not read {path.name}: {e}")
        return ""

def extract_text_from_txt(path: Path) -> str:
    try:
        return path.read_text(encoding="utf-8", errors="ignore")
    except Exception as e:
        print(f"  ⚠ Could not read {path.name}: {e}")
        return ""

def extract_text(path: Path) -> str:
    suffix = path.suffix.lower()
    if suffix == ".pdf":
        return extract_text_from_pdf(path)
    elif suffix in (".txt", ".md"):
        return extract_text_from_txt(path)
    else:
        print(f"  ⚠ Unsupported file type: {path.suffix} — skipping {path.name}")
        return ""

# ── Chunking ───────────────────────────────────────────────────────────────────

def chunk_text(text: str, chunk_size: int, overlap: int) -> list[str]:
    """Split text into overlapping chunks, respecting sentence boundaries."""
    text = re.sub(r'\s+', ' ', text).strip()
    chunks = []
    start = 0

    while start < len(text):
        end = start + chunk_size

        if end < len(text):
            # Try to break at sentence boundary
            boundary = text.rfind('. ', start, end)
            if boundary > start + chunk_size // 2:
                end = boundary + 1

        chunk = text[start:end].strip()
        if len(chunk) > 50:  # skip tiny fragments
            chunks.append(chunk)

        start = end - overlap

    return chunks

# ── Ingestion ──────────────────────────────────────────────────────────────────

def ingest_documents():
    if not DOCS_PATH.exists():
        print(f"\n⚠ Docs folder not found at: {DOCS_PATH}")
        print("Create a 'docs' folder inside your Cosmogenesis Seer directory")
        print("and place your source documents there.\n")
        return

    doc_files = list(DOCS_PATH.glob("**/*"))
    doc_files = [f for f in doc_files if f.is_file() and f.suffix.lower() in (".pdf", ".txt", ".md")]

    if not doc_files:
        print(f"\n⚠ No supported documents found in {DOCS_PATH}")
        print("Supported formats: .pdf, .txt, .md\n")
        return

    print(f"\nFound {len(doc_files)} document(s) to ingest:\n")

    all_chunks = []
    all_ids = []
    all_metadata = []
    chunk_counter = 0

    for doc_path in doc_files:
        print(f"  Processing: {doc_path.name}")
        text = extract_text(doc_path)

        if not text.strip():
            print(f"  ⚠ No text extracted — skipping.\n")
            continue

        chunks = chunk_text(text, CHUNK_SIZE, CHUNK_OVERLAP)
        print(f"  → {len(chunks)} chunks extracted")

        source_label = doc_path.stem.replace("_", " ").replace("-", " ").title()

        for i, chunk in enumerate(chunks):
            all_chunks.append(chunk)
            all_ids.append(f"doc_{chunk_counter:06d}")
            all_metadata.append({
                "source": source_label,
                "filename": doc_path.name,
                "chunk_index": i,
                "total_chunks": len(chunks)
            })
            chunk_counter += 1

        print()

    if not all_chunks:
        print("No chunks to ingest. Check your documents.\n")
        return

    # Batch insert (ChromaDB recommends batches of ~500)
    batch_size = 500
    total_batches = (len(all_chunks) + batch_size - 1) // batch_size

    print(f"Ingesting {len(all_chunks)} total chunks in {total_batches} batch(es)...\n")

    for i in range(0, len(all_chunks), batch_size):
        batch_docs = all_chunks[i:i + batch_size]
        batch_ids = all_ids[i:i + batch_size]
        batch_meta = all_metadata[i:i + batch_size]

        collection.add(
            documents=batch_docs,
            ids=batch_ids,
            metadatas=batch_meta
        )
        print(f"  Batch {i // batch_size + 1}/{total_batches} complete ({len(batch_docs)} chunks)")

    print(f"\n✓ Ingestion complete.")
    print(f"  Collection: {COLLECTION_NAME}")
    print(f"  Total chunks: {collection.count()}")
    print(f"  ChromaDB path: {CHROMA_PATH}")
    print(f"\nAion is ready. Start his server:")
    print(f"  py -3.11 -m uvicorn aion:app --reload --port 8002\n")

# ── Run ────────────────────────────────────────────────────────────────────────

if __name__ == "__main__":
    ingest_documents()
