Astrology RAG Ingestion Pipeline

Documentation for ingest.py — a one-time script that reads every PDF from two astrology

book collections, extracts text (with automatic OCR fallback for scanned pages), splits it into

overlapping chunks, embeds each chunk as a vector, and stores everything in a local

ChromaDB database. The result is two searchable vector collections — tropical and vedic —

ready to power a Retrieval-Augmented Generation (RAG) chatbot or query interface.





Pipeline Diagram

SOURCES

─────────────────────────────────────────────────────────────────────────

  Desktop\Tropic Astrology\              Desktop\Vedic Astrology\

  (38 PDFs — Liz Greene,                 (49 PDFs — Parasara, Frawley,

   Demetra George, Arroyo…)               Patel, Jyotisha texts…)

         │                                           │

         └───────────────────┬───────────────────────┘

                              ▼

┌────────────────────────────────────────────────────────────────────┐

│                           ingest.py                                 │

│                                                                     │

│ STEP 1 — TEXT EXTRACTION (per PDF, per page)                      │

│ ┌─────────────────────────────────────────────────────────────┐ │

│ │ pypdf.PdfReader → page.extract_text()                         │ │

│ │                                                               │ │

│ │     text found (≥ 50 chars)? ──YES──► keep text               │ │

│ │                 │                                             │ │

│ │                NO                                             │ │

│ │                 ▼                                             │ │

│ │          OCR FALLBACK                                         │ │

│ │          pdf2image.convert_from_path (Poppler, 300 DPI)     │ │

│ │                 │                                             │ │

│ │          pytesseract.image_to_string (Tesseract)            │ │

│ └─────────────────────────────────────────────────────────────┘ │

│                              │                                      │

│                       full page text                                │

│                              │                                      │

│ STEP 2 — CHUNKING                                                 │

│ ┌─────────────────────────────────────────────────────────────┐ │

│ │ Sliding window over the full book text                        │ │

│ │     chunk size = 1000 characters                              │ │

│ │     overlap     = 200 characters                              │ │

│ │                                                               │ │

│ │    [ chunk 0: chars      0 – 1000 ]                         │ │

│ │         [ chunk 1: chars 800 – 1800 ]                       │ │

│ │              [ chunk 2: chars 1600 – 2600 ]                 │ │

│ │                   …                                           │ │

│ └─────────────────────────────────────────────────────────────┘ │

│                              │                                      │

│                   list of text chunks                               │

│                              │                                      │

│ STEP 3 — EMBEDDING                                                │

│ ┌─────────────────────────────────────────────────────────────┐ │

│ │ SentenceTransformerEmbeddingFunction                          │ │

│ │ Model: all-MiniLM-L6-v2 (~90 MB, fully local)               │ │

│ │                                                               │ │

│ │ "Saturn in the 7th house…"                                  │ │

│ │           │                                                   │ │

│ │           ▼                                                   │ │

│ │ [0.032, -0.187, 0.441, … ] (384-dimension vector)          │ │

│ └─────────────────────────────────────────────────────────────┘ │

│                              │                                      │


│           chunk text + vector + metadata                           │

│                              │                                     │

│ STEP 4 — STORAGE (upsert in batches of 100)                      │

│ ┌─────────────────────────────────────────────────────────────┐ │

│ │ chromadb.PersistentClient → ./chroma_db/                     │ │

│ │                                                              │ │

│ │ collection: "tropical"                                       │ │

│ │     id:        "Saturn_A_New_Look__42"                       │ │

│ │     document: "Saturn in the 7th house…"                    │ │

│ │     vector:    [0.032, -0.187, 0.441, …]                   │ │

│ │     metadata: { source: "Saturn…pdf", chunk_index: 42 }     │ │

│ │                                                              │ │

│ │ collection: "vedic" (same structure, separate namespace) │ │

│ └─────────────────────────────────────────────────────────────┘ │

└────────────────────────────────────────────────────────────────────┘

                              │

                              ▼

                      ./chroma_db/

              (persistent local vector database)

          ┌─────────────────┬────────────────────┐

          │   tropical      │    vedic             │

          │   collection    │    collection        │

          └─────────────────┴────────────────────┘









Folder Structure

Desktop\Tropic Astrology\

├── ingest.py           ← the ingestion pipeline

├── generate_docs.py    ← this document generator

├── requirements.txt    ← Python dependencies

└── chroma_db\          ← created automatically on first run

    ├── tropical\       │ ChromaDB stores vectors and metadata here

    └── vedic\          │ Do not edit manually







Configuration Reference

All tuneable settings live at the top of ingest.py:



Constant                          Value                             What it controls

COLLECTIONS                       dict of name → folder list        Which folders feed which

                                                                    collection

CHROMA_PATH                       ./chroma_db                       Where the vector DB is

                                                                    saved on disk

EMBED_MODEL                       all-MiniLM-L6-v2                  Sentence-transformer

                                                                    model used for embeddings

CHUNK_SIZE                        1000                              Max characters per chunk

CHUNK_OVERLAP                     200                               Characters shared between

                                                                    adjacent chunks

UPSERT_BATCH                      100                               Chunks sent to ChromaDB

                                                                    per write call

OCR_MIN_CHARS                     50                                Pages below this char count

                                                                    trigger OCR

TESSERACT_CMD                     C:\Program                        Path to Tesseract binary

                                  Files\Tesseract-

                                  OCR\tesseract.exe

POPPLER_PATH                      None (uses system PATH)           Path to Poppler bin/ folder


Function Reference

main()

Entry point. Initialises the embedding model and ChromaDB client, then loops over each

collection, creates or opens it, and calls ingest_folder() for every source folder assigned to it.



ingest_folder(collection, folder)

Finds all .pdf files in folder, calls extract_text() on each, chunks the result, builds IDs and

metadata, and upserts everything into the given ChromaDB collection in batches of 100.



extract_text(pdf_path)

Opens a PDF with pypdf and iterates over every page. For each page it checks whether the

extracted text is long enough (≥ OCR_MIN_CHARS characters). If not, it calls ocr_page()

instead. Returns the full concatenated text of the book.



ocr_page(pdf_path, page_num)

Uses pdf2image (backed by Poppler) to render a single PDF page to a 300 DPI image, then

passes that image to pytesseract (backed by Tesseract) to produce a text string. Only called

for pages that fail the text extraction threshold.



chunk_text(text)

Splits a long string into overlapping chunks using a sliding window. With

CHUNK_SIZE=1000 and CHUNK_OVERLAP=200, each chunk starts 800 characters after the

previous one, preserving context across chunk boundaries.





Dependencies



Python Packages

Package                                          Role

chromadb                                         Local vector database — stores chunks,

                                                 vectors, and metadata

sentence-transformers                            Loads and runs the all-MiniLM-L6-v2

                                                 embedding model locally

pypdf                                            Reads text from text-layer PDFs

pytesseract                                      Python wrapper around the Tesseract OCR

                                                 engine

pdf2image                                        Converts PDF pages to images for OCR

                                                 (requires Poppler)





System Tools

Tool                             Status                           Role


Tesseract OCR                  Installed at C:\Program        Reads text from scanned

                               Files\Tesseract-OCR\           page images

Poppler                        v25.12.0 — on system           Renders PDF pages to

                               PATH                           images for OCR









How Chunk IDs Work

Each chunk stored in ChromaDB gets a deterministic ID built from the PDF filename and the

chunk's position within that file:

{pdf_filename_stem}__{chunk_index}



Example:

_OceanofPDF.com_Saturn_A_New_Look_at_an_Old_Devil_-_Liz_Greene__42



Because upsert is used rather than insert, re-running the script will overwrite existing

chunks with the same ID rather than creating duplicates. This makes it safe to add new

books and re-run without corrupting the database.





What Happens on First Run

1. all-MiniLM-L6-v2 is downloaded from HuggingFace (~90 MB, one time only).

2. chroma_db/ folder is created next to ingest.py.

3. Each PDF is processed in alphabetical order within each folder.

4. Text-layer pages are extracted in milliseconds; scanned pages take ~2–5 seconds each

   (Poppler renders the image, Tesseract reads it).

5. All chunks are embedded and written to ChromaDB.

6. Console output shows progress per book and a running total per collection.





Querying the Database (Next Steps)

Once ingestion is complete, the chroma_db/ database can be queried with the following

Python snippet:



import chromadb

from chromadb.utils.embedding_functions import

SentenceTransformerEmbeddingFunction



client   = chromadb.PersistentClient(path="./chroma_db")

embed_fn = SentenceTransformerEmbeddingFunction(model_name="all-MiniLM-L6-v2")



collection = client.get_collection(name="tropical",

embedding_function=embed_fn)



results = collection.query(

    query_texts=["Saturn return and psychological transformation"],

    n_results=5,

)


for doc, meta in zip(results["documents"][0], results["metadatas"][0]):

    print(meta["source"], "—", doc[:200])
