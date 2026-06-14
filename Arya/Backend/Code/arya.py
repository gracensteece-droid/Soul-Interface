"""
arya.py — The Vedic Seer
Soul Interface Backend

Arya is a Vedic Jyotish seer agent. She retrieves relevant passages
from the Vedic ChromaDB corpus and passes them to Claude as grounded context,
then responds in her voice as defined in her system prompt.

Usage:
    py -3.11 -m uvicorn arya:app --reload --port 8001

Note: Runs on port 8001 so Maren (8000) can run simultaneously.

Endpoint:
    POST /ask/arya
    Body: { "query": "your question here", "n_results": 5 }
    Returns: { "response": "Arya's response", "sources": [...] }
"""

import os
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
import anthropic
from dotenv import load_dotenv

load_dotenv()

# ── Configuration ──────────────────────────────────────────────────────────────

CHROMA_PATH = r"C:\Users\default.LAPTOP-EASRT11L\Projects\Tropic Seer\chroma_db"

COLLECTION_NAME = "vedic"

DEFAULT_N_RESULTS = 5

MODEL = "claude-sonnet-4-5"

# ── Load system prompt ─────────────────────────────────────────────────────────

SYSTEM_PROMPT_PATH = Path(__file__).parent / "arya_system_prompt.txt"

with open(SYSTEM_PROMPT_PATH, "r", encoding="utf-8") as f:
    ARYA_SYSTEM_PROMPT = f.read()

# ── Initialize clients ─────────────────────────────────────────────────────────

chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = chroma_client.get_collection(name=COLLECTION_NAME)

anthropic_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# ── FastAPI app ────────────────────────────────────────────────────────────────

app = FastAPI(title="Soul Interface — Arya (Vedic Seer)")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Request / Response models ──────────────────────────────────────────────────

class AskRequest(BaseModel):
    query: str
    n_results: int = DEFAULT_N_RESULTS
    conversation_history: list = []

class AskResponse(BaseModel):
    response: str
    sources: list

# ── RAG retrieval ──────────────────────────────────────────────────────────────

def retrieve_context(query: str, n_results: int) -> tuple[str, list]:
    results = collection.query(
        query_texts=[query],
        n_results=n_results,
        include=["documents", "metadatas", "distances"]
    )

    documents = results["documents"][0]
    metadatas = results["metadatas"][0]
    distances = results["distances"][0]

    context_parts = []
    sources = []

    for i, (doc, meta, dist) in enumerate(zip(documents, metadatas, distances)):
        source_label = meta.get("source", "Unknown source")
        context_parts.append(
            f"[Passage {i+1} — {source_label}]\n{doc}"
        )
        sources.append({
            "source": source_label,
            "relevance_score": round(1 - dist, 4),
            "snippet": doc[:200] + "..." if len(doc) > 200 else doc
        })

    context_string = "\n\n---\n\n".join(context_parts)
    return context_string, sources

# ── Build the augmented prompt ─────────────────────────────────────────────────

def build_user_message(query: str, context: str) -> str:
    return f"""The following passages have been retrieved from your corpus as potentially relevant to this question. Use them to inform your response — synthesize and interpret, do not recite.

--- RETRIEVED PASSAGES ---
{context}
--- END PASSAGES ---

The question or message from the person:
{query}"""

# ── Main endpoint ──────────────────────────────────────────────────────────────

@app.post("/ask/arya", response_model=AskResponse)
async def ask_arya(request: AskRequest):
    if not request.query.strip():
        raise HTTPException(status_code=400, detail="Query cannot be empty.")

    try:
        context, sources = retrieve_context(request.query, request.n_results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ChromaDB retrieval failed: {str(e)}")

    augmented_message = build_user_message(request.query, context)

    messages = request.conversation_history.copy()
    messages.append({"role": "user", "content": augmented_message})

    try:
        response = anthropic_client.messages.create(
            model=MODEL,
            max_tokens=1500,
            system=ARYA_SYSTEM_PROMPT,
            messages=messages
        )
        arya_response = response.content[0].text
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Claude API call failed: {str(e)}")

    return AskResponse(
        response=arya_response,
        sources=sources
    )

# ── Health check ───────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "online",
        "seer": "Arya",
        "tradition": "Vedic / Jyotish",
        "collection": COLLECTION_NAME,
        "corpus_count": collection.count()
    }

# ── Dev entry point ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("arya:app", host="0.0.0.0", port=8001, reload=True)
