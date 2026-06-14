**SOUL INTERFACE**
*Backend Setup, Troubleshooting & Build Log*
March 27–28, 2026  ·  ~20 hours  ·  One continuous session
*From blank page to three live AI seers with 142,000+ corpus chunks.*

## **1. Session Overview**
This document captures the complete build process for Soul Interface's backend infrastructure — the three seer servers, their ChromaDB corpora, the FastAPI routing, and all the troubleshooting that happened along the way. The session ran approximately 20 hours straight, from the afternoon of March 27 into the morning of March 28, 2026.

**WHAT WAS BUILT**
- Maren (Tropical astrology) — FastAPI server on port 8000, Claude Opus, ~33K chunks
- Arya (Vedic/Jyotish) — FastAPI server on port 8001, Claude Sonnet, ~35K chunks
- Aion (Cosmogenesis) — FastAPI server on port 8002, Claude Sonnet, ~74K chunks
- Three.js solar system frontend with full cosmogenesis sequence
- Seer chat interface with three-tab switching
- ChromaDB RAG pipeline for all three seers
- NASA texture download system for photorealistic planets

**FILE LOCATIONS (FINAL STATE)**
- Maren server: Soul Interface folder — maren.py
- Arya server: Soul Interface folder — arya.py
- Aion server: Aion folder — Aion.py (separate from Soul Interface)
- Maren + Arya ChromaDB: Tropic Seer/chroma\_db (collections: tropical, vedic)
- Aion ChromaDB: Aion/chroma\_db (collection: cosmogenesis)
- Frontend: Soul Interface folder — index.html + seer\_chat.html
## **2. Environment Setup & Early Obstacles**
### **2.1 Python Version Issue**
*Early session — March 27 afternoon*
The first major obstacle was Python version incompatibility. The initial attempt used Python 3.14 which has breaking changes in several dependencies including ChromaDB and some FastAPI internals.
**✗ ERROR  **Python 3.14 caused import failures with chromadb and pydantic.
**✓ RESOLVED  **Downgraded to Python 3.11.9 — all dependencies resolved.
All commands must use py -3.11 prefix. Using python or py alone risks running the wrong version.
py -3.11 -m uvicorn maren:app --reload --port 8000
py -3.11 -m http.server 3000

### **2.2 uvicorn PATH Issue**
After installing uvicorn, running uvicorn directly from the command line failed with 'command not found'. The executable wasn't on PATH.
**✗ ERROR  **uvicorn not found when called directly.
**✓ RESOLVED  **Running via py -3.11 -m uvicorn resolved this permanently.

### **2.3 ChromaDB / Pydantic Conflicts**
ChromaDB's default embedding function had version conflicts with pydantic v2. Required specific pinned versions in requirements.txt.
**✗ ERROR  **chromadb.utils.embedding\_functions import failed on first install.
**✓ RESOLVED  **Pinning chromadb==0.4.x and installing with --break-system-packages resolved.

### **2.4 .env File Saved as .env.txt**
Windows hides file extensions by default. The .env file containing the Anthropic API key was saved as .env.txt, causing load\_dotenv() to silently fail and all API calls to return authentication errors.
**✗ ERROR  **ANTHROPIC\_API\_KEY was None — all Claude API calls returned 401.
**✓ RESOLVED  **Revealed file extensions in Windows Explorer, renamed .env.txt to .env.
This is a persistent Windows gotcha. Always verify .env files don't have hidden extensions.
## **3. ChromaDB Corpus Ingestion**
### **3.1 Maren — Tropical Astrology Corpus**
*March 27, early evening*
Maren's corpus was the first to be ingested. The Tropic Seer folder contained a large library of tropical astrology PDFs — psychological astrology, Chiron tradition, chart interpretation, evolutionary astrology.
**INGESTION DETAILS**
- Source folder: Desktop/Tropic Seer/ (PDFs + TXTs)
- Collection name: tropical
- ChromaDB path: Tropic Seer/chroma\_db
- Final chunk count: ~33,000 chunks
- Embedding model: ChromaDB DefaultEmbeddingFunction (sentence-transformers)
- Runtime: approximately 2-3 hours on CPU

**NOTABLE SOURCE TEXTS**
- Synthesis Counseling in Astrology — 78MB
- Astrology Psychology series
- Chiron and the Healing Journey
- Cosmos and Psyche (Tarnas) — shared with Aion corpus
- Chart Interpretation series, Evolutionary Astrology, Tetrabiblos

### **3.2 Arya — Vedic/Jyotish Corpus**
*March 27, evening*
Arya's corpus was ingested into the same ChromaDB database as Maren but under a separate collection named 'vedic'. This means both seers share one chroma\_db folder in the Tropic Seer directory.
**INGESTION DETAILS**
- Collection name: vedic
- ChromaDB path: same Tropic Seer/chroma\_db as Maren
- Final chunk count: ~35,000 chunks
- Both collections verified with list\_collections() returning [Collection(name=vedic), Collection(name=tropical)]

### **3.3 Aion — Cosmogenesis Corpus**
*March 28, 10:00 AM — 1:34 PM*
Aion's corpus was the most complex to set up and the largest. 81 PDFs totaling hundreds of megabytes of cosmology, physics, philosophy of mind, and theology.

**PATH ISSUES (EXTENDED TROUBLESHOOTING)**
The ingest script pointed to a OneDrive virtual folder that wasn't locally synced. This caused repeated failures even though the folder appeared in Explorer.
**✗ ERROR  **DOCS\_PATH pointed to Cosmogenesis Seer folder — OneDrive cloud-only, not accessible.
**✗ ERROR  **dir showed folder but cd failed — OneDrive placeholder, not local.
**→ INFO  **Right-clicked folder → 'Always keep on this device' — forced local sync.
**✓ RESOLVED  **Copied 81 PDFs to Aion/docs/ folder as workaround.
**✓ RESOLVED  **Changed DOCS\_PATH in ingest\_aion.py to Path(\_\_file\_\_).parent / 'docs'

**THE INGESTION RUN**
73,937 total chunks extracted across 148 batches of 500 chunks each. CPU ran at 80-90% for approximately 3 hours. The process completed fully with the final output:
✓ Ingestion complete.
  Collection: cosmogenesis
  Total chunks: 73937
  ChromaDB path: ...\\Desktop\\Aion\\chroma\_db
  Aion is ready. Start his server:
  py -3.11 -m uvicorn aion:app --reload --port 8002

**NOTABLE SOURCE TEXTS (81 PDFS)**
- Carl Sagan — Cosmos, Cosmic Connection, El cerebro de Broca
- Roger Penrose — Cycles of Time, Emperor's New Mind, Twistor Theory
- Lawrence Krauss — A Universe from Nothing, Fear of Physics, Hiding in the Mirror
- Paul Davies — About Time, God and the New Physics, How to Build a Time Machine
- David Bohm — Quantum Theory, Causality and Chance in Modern Physics
- Richard Tarnas — Cosmos and Psyche, Cosmos and Psyche Intimations
- Alfred North Whitehead — Philosopher of Time (Lestienne), Quantum Mechanics and Whitehead (Epperson)
- CS Lewis — Miracles
- Stephen Jay Gould — Eight Little Piggies, Wonderful Life
- Dancing Wu Li Masters, Science and the Trinity, The Language of Life, and 60+ more
## **4. Server Configuration & Troubleshooting**
### **4.1 File Organization Problem**
*March 28, afternoon*
The Soul Interface project evolved through many rapid iterations without a consistent file structure. Server files (maren.py, arya.py) ended up in the Soul Interface folder while Aion.py remained in its own Aion folder. The ChromaDB for Maren and Arya was in the Tropic Seer folder, while Aion's was in the Aion folder.
**✗ ERROR  **maren.py CHROMA\_PATH pointed to 'Tropic Astrology/chroma\_db' — folder doesn't exist.
**✗ ERROR  **arya.py CHROMA\_PATH had same wrong path.
**✗ ERROR  **Aion.py CHROMA\_PATH pointed to Cosmogenesis Seer parent — OneDrive issue.

**FINAL CORRECT CHROMA\_PATH VALUES**
maren.py:
CHROMA\_PATH = r"C:\\Users\\default.LAPTOP-EASRT11L\\OneDrive\\Desktop\\Tropic Seer\\chroma\_db"
arya.py:
CHROMA\_PATH = r"C:\\Users\\default.LAPTOP-EASRT11L\\OneDrive\\Desktop\\Tropic Seer\\chroma\_db"
Aion.py:
CHROMA\_PATH = str(Path(\_\_file\_\_).parent / "chroma\_db")

### **4.2 Missing .env in Aion Folder**
Aion's folder had no .env file. The Soul Interface folder had the .env with the Anthropic API key, but Aion.py uses load\_dotenv() which looks for .env in the current working directory.
**✗ ERROR  **Every POST /ask/aion returned 500 Internal Server Error.
**→ INFO  **Traced to ANTHROPIC\_API\_KEY being None — no .env file in Aion folder.
**✓ RESOLVED  **Copied .env from Soul Interface folder to Aion folder.
copy "C:\\Users\\default.LAPTOP-EASRT11L\\OneDrive\\Desktop\\Soul Interface\\.env" .env

### **4.3 Aion Module Name Case Sensitivity**
uvicorn is case-sensitive on module names. Running py -3.11 -m uvicorn aion:app failed because the file is named Aion.py with a capital A.
**✗ ERROR  **Error loading ASGI app. Could not import module 'aion'.
**✓ RESOLVED  **Changed to py -3.11 -m uvicorn Aion:app — resolved.

### **4.4 CORS — Frontend Can't Talk to Servers**
Opening index.html and seer\_chat.html as local files (file:///) blocks all fetch() calls to localhost servers due to browser CORS policy. This made it appear the seers weren't working even when all servers were running.
**✗ ERROR  **Fetch to localhost:8000 blocked — CORS policy violation when opening as file:///.
**✓ RESOLVED  **Running py -3.11 -m http.server 3000 from Soul Interface folder resolved.
All Soul Interface files must be accessed via http://localhost:3000, never as file:/// paths. This is permanent — always start the http.server before opening the app.

### **4.5 Frontend File Version Chaos**
Due to rapid iteration, the Downloads folder accumulated 38+ versions of index.html (index\_1.html through index\_38.html) and 9 versions of seer\_chat.html. The Soul Interface folder had an old 22KB index.html while the correct 91KB version was in Downloads.
**✗ ERROR  **Soul Interface folder had index.html from March 14 — missing entire solar system.
**✓ RESOLVED  **Replaced with index\_38.html (91KB) renamed to index.html.
**✓ RESOLVED  **Replaced seer\_chat.html with seer\_chat\_9.html (21KB, includes Aion tab).
Going forward: every file saved from Claude goes directly to Soul Interface folder with the correct final name. No numbered downloads.
## **5. Standard Startup Procedure**
Four terminal windows must be open simultaneously to run Soul Interface. Open each with Win+R → cmd → Enter.

**TERMINAL 1 — MAREN (TROPICAL ASTROLOGY)**
cd "C:\\Users\\default.LAPTOP-EASRT11L\\OneDrive\\Desktop\\Soul Interface"
py -3.11 -m uvicorn maren:app --reload --port 8000

**TERMINAL 2 — ARYA (VEDIC/JYOTISH)**
cd "C:\\Users\\default.LAPTOP-EASRT11L\\OneDrive\\Desktop\\Soul Interface"
py -3.11 -m uvicorn arya:app --reload --port 8001

**TERMINAL 3 — AION (COSMOGENESIS)**
cd "C:\\Users\\default.LAPTOP-EASRT11L\\OneDrive\\Desktop\\Aion"
py -3.11 -m uvicorn Aion:app --reload --port 8002

**TERMINAL 4 — FRONTEND HTTP SERVER**
cd "C:\\Users\\default.LAPTOP-EASRT11L\\OneDrive\\Desktop\\Soul Interface"
py -3.11 -m http.server 3000

**THEN OPEN IN BROWSER**
http://localhost:3000/index.html        ← main experience
http://localhost:3000/seer\_chat.html    ← seer chat directly

*Bookmark http://localhost:3000/index.html. Never open the HTML files directly from Explorer.*
## **6. Corpus Verification Commands**
Run these from the appropriate folder to confirm ChromaDB collections exist and are populated.

**VERIFY AION (FROM AION FOLDER)**
python -c "import chromadb; c = chromadb.PersistentClient(path='chroma\_db'); col = c.get\_collection('cosmogenesis'); print('Chunks:', col.count())"
Expected output: Chunks: 73937

**VERIFY MAREN + ARYA (FROM ANYWHERE)**
python -c "import chromadb; c = chromadb.PersistentClient(path='C:/Users/default.LAPTOP-EASRT11L/OneDrive/Desktop/Tropic Seer/chroma\_db'); print(c.list\_collections())"
Expected output: [Collection(name=vedic), Collection(name=tropical)]
## **7. Key Lessons & Decisions**

**FILE MANAGEMENT**
- Always save files to their final location with final name immediately — numbered downloads cause confusion
- Keep one canonical version of each file in the project folder
- The Soul Interface folder IS the project — everything else is noise

**ENVIRONMENT**
- Always use py -3.11 — never python or py alone
- Always run servers from the correct folder — cd first, then uvicorn
- .env files must exist in the same folder as each server script
- Check Windows file extensions — .env.txt is not .env

**ARCHITECTURE**
- Maren and Arya share one ChromaDB in Tropic Seer folder (two collections)
- Aion has its own ChromaDB in the Aion folder (one collection: cosmogenesis)
- All frontend must be served via http.server — never opened as file:///
- index.html is the entry point; seer\_chat.html is the chat destination

**ONEDRIVE GOTCHAS**
- OneDrive virtual folders appear in Explorer but aren't locally accessible
- Always right-click → 'Always keep on this device' before running scripts against OneDrive folders
- When cd fails but dir shows the folder — it's a cloud placeholder, not local
## **8. Current Status — End of Session**

**WORKING**
- Maren — responding on port 8000, tropical collection live
- Arya — responding on port 8001, vedic collection live
- Aion — responding on port 8002, cosmogenesis collection live (73,937 chunks)
- Frontend — serving correctly from localhost:3000
- All three seers reachable from seer\_chat.html
- NASA textures downloaded and loading in index.html
- Cosmogenesis sequence running with 8 phases and full audio

**PENDING NEXT SESSION**
- Build personalized seer landing pages with birth data input form
- Birth chart calculation engine integration
- Horizon-based house view with clickable houses
- Aion narrating cosmogenesis sequence in his own voice
- Distinct visual environments per seer
- Mobile experience optimization
- Create start\_soul\_interface.bat that reliably launches all four servers

*73,937 chunks. Three seers. One origin.*
Soul Interface — Backend Build Log — March 27–28, 2026
