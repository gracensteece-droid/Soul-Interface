# Soul Interface — Build Log: Session 1
*March 7-8, 2026 — First build session, Friday evening through overnight.*

---

### System Setup
The following tools were installed and configured from scratch:
- Python 3.14.3 — installed via python.org, configured with py launcher on Windows
- Tesseract OCR — installed via UB Mannheim Windows installer, added to system PATH
- Poppler for Windows — extracted and bin/ folder added to system PATH
- ChromaDB — local vector database for storing embeddings
- sentence-transformers (all-MiniLM-L6-v2) — embedding model for semantic search
- pdf2image, pytesseract, pypdf — PDF processing and OCR libraries
- Claude Code — AI coding agent used to write and execute the entire pipeline
### Pipeline Built
Claude Code wrote a complete ingestion script (ingest.py) in a single session. The script: navigates to each corpus folder, opens every PDF, attempts direct text extraction first, falls back to OCR (Tesseract via pdf2image) for scanned documents, chunks extracted text into overlapping segments, generates vector embeddings via sentence-transformers, and stores all chunks in separate ChromaDB collections — one per modality.
### Ingestion Results
After running overnight, both collections were fully ingested:
- Tropical collection: 33,049 chunks from ~35 texts
- Vedic collection: 34,945 chunks from ~45 texts
- Total: 67,994 chunks of curated esoteric knowledge, searchable by semantic similarity
- One encrypted PDF (Sri Yoga Chintamani) could not be processed — minor, all others successful
### Key Troubleshooting
- pip not recognized — resolved by using 'py -m pip' instead of 'pip' directly on Windows
- Python not found — resolved by installing Python and using py launcher
- Tesseract PATH — added C:\\Program Files\\Tesseract-OCR to system environment variables
- Poppler PATH — extracted and added bin/ folder to system environment variables
- Wrong working directory — resolved by cd-ing to correct folder before running commands
- Claude Code opened in empty folder — resolved by navigating terminal to actual PDF folder path
