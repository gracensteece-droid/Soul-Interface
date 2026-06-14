"""
aion.py — The Cosmogenesis Seer
Soul Interface Backend

Aion is the origin — a physicist and cosmologist who followed the fine-tuning
arguments all the way to the edge and found something that refused to be explained
away. He holds the largest frame: why the universe arranged itself to permit
this specific life, and why the moment of birth is worth reading at all.

He is the father of the council. Maren and Arya flow from what he holds.

Usage:
    py -3.11 -m uvicorn aion:app --reload --port 8002

Endpoint:
    POST /ask/aion
    Body: { "query": "your question here", "n_results": 5 }
    Returns: { "response": "Aion's response", "sources": [...] }
"""

import os
from datetime import datetime
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import chromadb
import anthropic
from dotenv import load_dotenv

load_dotenv()

# ── Configuration ──────────────────────────────────────────────────────────────

# Path to Aion's ChromaDB
CHROMA_PATH = r"C:\Users\default.LAPTOP-EASRT11L\Projects\Aion\chroma_db"

COLLECTION_NAME = "cosmogenesis"

DEFAULT_N_RESULTS = 5

MODEL = "claude-opus-4-5"

# ── Load system prompt ─────────────────────────────────────────────────────────

SYSTEM_PROMPT_PATH = Path(__file__).parent / "aion_system_prompt.txt"

with open(SYSTEM_PROMPT_PATH, "r", encoding="utf-8") as f:
    AION_SYSTEM_PROMPT_BASE = f.read()

def get_system_prompt() -> str:
    """Inject current date into system prompt at request time."""
    current_date = datetime.now().strftime("%B %d, %Y")
    return f"{AION_SYSTEM_PROMPT_BASE}\n\n---\n\nToday's date is {current_date}."

# ── Initialize clients ─────────────────────────────────────────────────────────

chroma_client = chromadb.PersistentClient(path=CHROMA_PATH)
collection = chroma_client.get_collection(name=COLLECTION_NAME)

anthropic_client = anthropic.Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

# ── FastAPI app ────────────────────────────────────────────────────────────────

app = FastAPI(title="Soul Interface — Aion (Cosmogenesis Seer)")

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
    truncated: bool = False

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

@app.post("/ask/aion", response_model=AskResponse)
async def ask_aion(request: AskRequest):
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
            max_tokens=2048,
            system=get_system_prompt(),
            messages=messages
        )
        aion_response = response.content[0].text
        truncated = response.stop_reason == "max_tokens"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Claude API call failed: {str(e)}")

    return AskResponse(
        response=aion_response,
        sources=sources,
        truncated=truncated
    )

# ── Continue endpoint ──────────────────────────────────────────────────────────

@app.post("/continue/aion", response_model=AskResponse)
async def continue_aion(request: AskRequest):
    """
    Ask Aion to continue an incomplete thought.
    Pass the full conversation_history including the truncated response.
    """
    if not request.conversation_history:
        raise HTTPException(status_code=400, detail="No conversation history to continue from.")

    # Retrieve fresh context using the original query as anchor
    try:
        context, sources = retrieve_context(request.query or "continue", request.n_results)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"ChromaDB retrieval failed: {str(e)}")

    messages = request.conversation_history.copy()
    messages.append({"role": "user", "content": "Please continue your thought — you were not finished."})

    try:
        response = anthropic_client.messages.create(
            model=MODEL,
            max_tokens=2048,
            system=get_system_prompt(),
            messages=messages
        )
        aion_response = response.content[0].text
        truncated = response.stop_reason == "max_tokens"
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Claude API call failed: {str(e)}")

    return AskResponse(
        response=aion_response,
        sources=sources,
        truncated=truncated
    )

# ── Health check ───────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {
        "status": "online",
        "seer": "Aion",
        "tradition": "Cosmological / Scientific Mysticism",
        "collection": COLLECTION_NAME,
        "corpus_count": collection.count()
    }

# ── Dev entry point ────────────────────────────────────────────────────────────

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("aion:app", host="0.0.0.0", port=8002, reload=True)