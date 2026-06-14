# Soul Interface — Maren (Tropical Seer)

## Setup

1. Copy the Soul Interface folder to your Desktop alongside the Tropic Astrology folder.

2. Install dependencies:
```
pip install -r requirements.txt
```

3. Create your .env file:
```
copy .env.example .env
```
Then open .env and add your Anthropic API key.

4. Run Maren:
```
uvicorn maren:app --reload --port 8000
```

5. Test her health check:
```
http://localhost:8000/health
```

6. Ask her something:
```
POST http://localhost:8000/ask/maren
Content-Type: application/json

{
  "query": "What does Saturn in the 12th house mean for someone in a period of dissolution?",
  "n_results": 5
}
```

## Folder Structure

```
Soul Interface/
├── maren.py                  ← The tropical seer agent
├── maren_system_prompt.txt   ← Maren's full persona and instructions
├── requirements.txt
├── .env.example
└── README.md

Tropic Astrology/             ← Must sit alongside Soul Interface
└── chroma_db/                ← Both tropical + vedic collections live here
```

## Multi-turn Conversation

Pass conversation history to maintain context across turns:

```json
{
  "query": "And what about the Saturn return specifically?",
  "n_results": 5,
  "conversation_history": [
    {
      "role": "user",
      "content": "What does Saturn in the 12th house mean?"
    },
    {
      "role": "assistant", 
      "content": "Maren's previous response here..."
    }
  ]
}
```

## Notes

- The ChromaDB path is set relative to the file location. If you move folders, update CHROMA_PATH in maren.py.
- CORS is open (*) for development. Lock it down when you deploy.
- The model is set to claude-opus-4-5 for depth. Switch to claude-sonnet-4-5 if you need faster/cheaper responses during development.
