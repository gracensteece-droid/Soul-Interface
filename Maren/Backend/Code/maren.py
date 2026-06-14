"""
maren.py — The Tropical Seer
Soul Interface Backend

Maren is a tropical astrology seer agent. She retrieves relevant passages
from the tropical ChromaDB corpus and passes them to Claude as grounded context,
then responds in her voice as defined in her system prompt.

Usage:
    uvicorn maren:app --reload --port 8000

Endpoint:
    POST /ask/maren
    Body: { "query": "your question here", "n_results": 5 }
    Returns: { "response": "Maren's response", "sources": [...] }
"""

import os
from dotenv import load_dotenv
load_dotenv()
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
import anthropic

# ── Configuration ──────────────────────────────────────────────────────────────

# Path to the ChromaDB — adjust if you move things around
CHROMA_PATH = r"C:\Users\default.LAPTOP-EASRT11L\Projects\Tropic Seer\chroma_db"

COLLECTION_NAME = "tropical"

# How many corpus chunks to retrieve per query
DEFAULT_N_RESULTS = 5

# Claude model
MODEL = "claude-opus-4-5"

# ── Load system prompt ─────────────────────────────────────────────────────────

SYSTEM_PROMPT_PATH = Path(__file__).parent / "maren_system_prompt.txt"

with open(SYSTEM_PROMPT_PATH, "r", encoding="utf-8") as f:
    MAREN_SYSTEM_PROMPT = f.read()

# ── Initialize clients ─────────────────────────────────────────────────────────

# ChromaDB
chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = chroma_client.get_collection(name=COLLECTION_NAME)

# Anthropic
anthropic_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# ── FastAPI app ────────────────────────────────────────────────────────────────

app = FastAPI(title="Soul Interface — Maren (Tropical Seer)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Tighten this when you move to production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request / Response models ──────────────────────────────────────────────────

class AskRequest(BaseModel):
    query: str
    n_results: int = DEFAULT_N_RESULTS
    conversation_history: list = []  # List of {role, content} dicts for multi-turn

class AskResponse(BaseModel):
    response: str
    sources: list  # Metadata of retrieved chunks for transparency

# ── RAG retrieval ──────────────────────────────────────────────────────────────

def retrieve_context(query: str, n_results: int) -> tuple[str, list]:
    """
    Query the tropical ChromaDB collection and return:
    - A formatted context string to inject into the prompt
    - A list of source metadata for the response
    """
    results = collection.query(
        query_texts=[query],
        n_results=n_results,
        include=["documents", "metadatas", "distances"]
    )

    documents = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0]

    # Build context block
    context_parts = []
    sources = []

    for i, (doc, meta, dist) in enumerate(zip(documents, metadatas, distances)):
        source_label = meta.get("source", "Unknown source")
        context_parts.append(
            f"[Passage {i+1} — {source_label}]\n{doc}"
        )
        sources.append({
            "source": source_label,
            "relevance_score": round(1 - dist, 4),  # Convert distance to similarity
            "snippet": doc[:200] + "..." if len(doc) > 200 else doc
        })

    context_string = "\n\n---\n\n".join(context_parts)
    return context_string, sources

# ── Build the augmented prompt ─────────────────────────────────────────────────

def build_user_message(query: str, context: str) -> str:
    """
    Wrap the user's query with retrieved corpus context.
    Maren's system prompt instructs her to use this as a living library.
    """
    return f"""The following passages have been retrieved from your corpus as potentially relevant to this question. Use them to inform your response — synthesize and interpret, do not recite.

--- RETRIEVED PASSAGES ---
{context}
--- END PASSAGES ---

The question or message from the person:
{query}"""

# ── Main endpoint ──────────────────────────────────────────────────────────────

@app.post("/ask/maren", response_model=AskResponse)
async def ask_maren(request: AskRequest):
    """
    Ask Maren a question. She retrieves relevant passages from the tropical
    corpus and responds as herself — grounded in the tradition, in her voice.
    """
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    # 1. Retrieve context from ChromaDB
    try:
        context, sources = retrieve_context(request.query, request.n_results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ChromaDB retrieval failed: {str(e)}")

    # 2. Build the augmented user message
    augmented_message = build_user_message(request.query, context)

    # 3. Build message history (supports multi-turn conversation)
    messages = request.conversation_history.copy()
    messages.append({"role": "user", "content": augmented_message})

    # 4. Call Claude with Maren's system prompt
    try:
        response = anthropic_client.messages.create(
            model=MODEL,
            max_tokens=1500,
            system=MAREN_SYSTEM_PROMPT,
            messages=messages
        )
        maren_response = response.content[0].text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Claude API call failed: {str(e)}")

    return AskResponse(
        response=maren_response,
        sources=sources
    )

# ── Health check ───────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "online",
        "seer": "Maren",
        "tradition": "Tropical",
        "collection": COLLECTION_NAME,
        "corpus_count": collection.count()
    }

# ── Dev entry point ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("maren:app", host="0.0.0.0", port=8000, reload=True)
