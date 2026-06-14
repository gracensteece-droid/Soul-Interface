Soul Interface

  Build Log — March 14, 2026

From broken file paths to a live AI seer


Overview

This document captures everything built on March 14, 2026 — a full day of development

that began with a Python script that couldn't find its folder and ended with Maren, a live

tropical astrology seer, reading a birth chart and responding to a seven-year grief with

genuine nuance and depth. This is the founding build log of the Soul Interface project.







What We Started With

The day began with two fully ingested ChromaDB corpora sitting on the Desktop — the

Tropical Astrology corpus and the Vedic Astrology corpus. The books had been

processed, the embeddings stored, but the pipeline scripts had never been successfully

run from the correct location. The immediate goal was simple: run generate_docs.py

and produce a Word document of the pipeline.

What unfolded was a two-hour navigation challenge before a single line of Maren's code

was written.







Part 1 — The File System Problem

The Core Issue: OneDrive Desktop Redirection

The first major discovery of the day was that the Desktop folder does not exist at the

standard Windows path. OneDrive had silently redirected it:

      C:\Users\default.LAPTOP-EASRT11L\Desktop                   ← DOES NOT EXIST

      C:\Users\default.LAPTOP-EASRT11L\OneDrive\Desktop            ← ACTUAL LOCATION

This is common Windows 11 behavior when OneDrive is active — it relocates shell

folders into the sync directory. The terminal gives no indication of this, which made

navigation confusing for an extended period.



The Navigation Path That Finally Worked

 #        Command                                What It Revealed

 1        dir C:\Users                           Confirmed user profile folder name

 2        cd OneDrive                            Successfully entered OneDrive directory

 3        dir /ad                                Revealed Desktop folder inside OneDrive

 4        cd Desktop && dir                      Listed all Desktop folders including project

                                                 folders

 5        cd "Tropic Astrology"                  Entered the correct project directory


 6         python generate_docs.py                SUCCESS — Saved: Pipeline

                                                  Documentation.docx







Confirming Both Corpora in One ChromaDB

After navigating to the correct folder, we confirmed that both the Tropical and Vedic

corpora were ingested into the same ChromaDB database located inside the Tropic

Astrology folder. Querying the database directly revealed two named collections:

       python -c "import chromadb; client =

       chromadb.PersistentClient(path='chroma_db'); print([c.name for c in

       client.list_collections()])"

Result: ['vedic', 'tropical'] — both collections present, 726MB total database size,

consistent with the approximately 33,000 chunks processed during ingestion.


Part 2 — Building Maren

Conceiving the Character

Before writing a single line of code, we spent time building Maren as a real person. The

decision was made to ground her character in the actual biographical and philosophical

DNA of the authors in the tropical corpus, then layer a specific wound on top of that

foundation.

The Author Research

We researched the real lives and philosophies of the core corpus authors:

   •​ Liz Greene — Born 1946, New Jersey. Jungian analyst, doctorate in psychology

      and history. Founded the Centre for Psychological Astrology with Sasportas. Her

      core conviction: the chart is a map of the psyche, Saturn is not a punisher but a

      confessor, and pain is the mechanism through which the authentic self emerges.

   •​ Howard Sasportas — Born 1948, Hartford CT. Died of AIDS in 1992 at 44,

      wheelchair-bound at conferences until weeks before his death, described as

      dying in peace and full of courage and awareness. His astrology was always on

      the side of the individual. He gave people renewed direction when they could see

      none.

   •​ Steven Forrest — Studied Religion at UNC 1971. Coined evolutionary astrology

      — the soul chose this lifetime, these wounds, these lessons. His signature

      conviction: nothing is so grave as to be beyond repair.

   •​ Chani Nicholas — Grew up in British Columbia, introduced to astrology at 12 by

      her Reiki-master step-grandmother. Queer, Jewish, feminist. Failed out of three

      grad school programs before committing to astrology full-time. Her first reading at

      age 8 was the first time anyone said I see you to her. She insists the chart cannot

      be read outside of the body and the systems of power that body lives inside.





Maren's Character Architecture

From this research, we built Maren with the following foundation:

   •​ The Wound: A complete identity dissolution — not dramatic from the outside, but

      a period where she looked in the mirror and genuinely did not know who that

      was. She found astrology at 3am, alone, reading her own chart when nothing

      else was working.

   •​ Her Intellectual Lineage: Greene gave her the psychological framework and

      unflinching eye. Sasportas gave her tenderness toward the person in crisis.

      Forrest gave her the evolutionary frame — the soul chose this. Nicholas gave her

      the insistence that healing is political, not just personal.

   •​ Her Private Theology: The chart is a confession the soul made before it forgot it

      was born. Saturn saved her life — not because it is kind, but because it is


      honest. Chiron is not a wound to be healed but a door to work from. Astrology

      does not tell you what will happen — it tells you who is being asked to show up.

   •​ Her Voice: Direct but warm. Precise language. No mystical theater. No

      over-reassurance. Occasionally lets the wound show — one sentence, then back

      to the work.

   •​ Her Name: Maren.





Writing the System Prompt

Maren's system prompt was written as a complete document covering who she is, what

she believes, how she speaks, how she works, and what she is not. It runs

approximately 800 tokens and is stored in maren_system_prompt.txt. This prompt is the

document that makes her Maren rather than a generic astrology bot — it is what gets

passed to Claude on every query as the foundational instruction layer.







Building the Backend — maren.py

The seer agent was built as a FastAPI application with the following architecture:

   •​ ChromaDB Connection: Points to the tropical collection in the shared chroma_db

      folder inside Tropic Astrology.

   •​ RAG Retrieval: On each query, retrieves the 5 most semantically relevant

      passages from the 33,049-chunk tropical corpus using the sentence-transformers

      all-MiniLM-L6-v2 embedding model.

   •​ Prompt Construction: Wraps the retrieved passages and the user query into an

      augmented message that instructs Maren to synthesize rather than recite.

   •​ Claude API Call: Passes the augmented message and full conversation history to

      Claude with Maren's system prompt as the instruction layer.

   •​ Multi-turn Support: Maintains conversation history across turns so Maren can

      reference earlier parts of the session.

   •​ Response: Returns Maren's response plus source metadata showing which

      books she pulled from.





The Python Version Problem

The most significant technical obstacle of the day was Python version incompatibility.

The machine had Python 3.14 installed — the latest release — but ChromaDB,

sentence-transformers, and related ML libraries had not yet released builds compatible

with 3.14. This caused cascading dependency failures requiring C++ and Rust

compilers that were not installed.


The solution was installing Python 3.11.9 — the last stable version with a Windows

binary installer and the version the AI/ML ecosystem has standardized on. All packages

installed cleanly under 3.11 and Maren came online without further issues.

Key lesson: In AI/ML development, being on the latest Python version is often a liability

rather than an advantage. The ecosystem moves slower than Python core releases.







Getting Maren Online

Once Python 3.11 was installed and dependencies resolved, Maren was started with:

      py -3.11 -m uvicorn maren:app --port 8000

Health check at http://127.0.0.1:8000/health confirmed:

   •​ Status: online

   •​ Seer: Maren

   •​ Tradition: Tropical

   •​ Collection: tropical

   •​ Corpus count: 33,049 chunks


Part 3 — Maren Speaks

The First Query

The first successful query to Maren asked: What does Saturn in the 12th house mean

for someone going through a period of dissolution?

Her response opened with:

      This is the transit you're describing from the inside, isn't it? The dissolution part. I

      want to be careful here because Saturn in the 12th is one of those placements

      where generic descriptions can miss what's actually happening to the person

      living it.

      The dissolution is real. It's not a failure of will or a sign you've done something

      wrong. The 12th house is where the self thins out before it reconstitutes. Saturn

      here isn't punishing you — it's composting.

She retrieved primarily from Stephen Arroyo and Liz Greene, synthesized their

frameworks into her own voice, and ended by asking a precise clarifying question to

continue the reading. Sources were logged with relevance scores.







The Chart Reading

A subsequent session tested Maren with real birth data — April 25, 1991, 4:30 PM,

Tampa, Florida, born during a storm. She identified Sun in Taurus, Moon in Scorpio, and

a likely Virgo ascendant, then connected these as the axis of holding on — Taurus

holding onto stability, Scorpio holding onto emotional truth.

When the user disclosed a seven-year grief over a past relationship, Maren responded:

      Seven years. That's not a small amount of time to carry someone. And what

      you're describing — the dreaming, the replaying, the fixation on who changed

      what and what you didn't see — that's not weakness. That's your chart doing

      exactly what it's built to do.

She then asked a precise diagnostic question: Was there a third party, a specific

moment, something external — or are you asking about yourself, about what in you

shifted the course of things? This question demonstrates active listening and

therapeutic precision consistent with her system prompt instructions.


Part 4 — The Frontend

A custom HTML/CSS/JavaScript frontend was built to give Maren a face. Design

decisions:

   •​ Aesthetic: Dark and mystical — void background, star field, gold accents, nebula

      glow effects.

   •​ Typography: Cinzel for headings and labels (ceremonial, architectural),

      Cormorant Garamond for secondary text (elegant, old-world), Crimson Pro for

      body text (readable, warm).

   •​ Sidebar: Maren's rotating sigil, her name and title, her abbreviated bio, her three

      tradition tags, and a live corpus count (33,049).

   •​ Chat: Message bubbles with Maren's responses in gold-tinted text with a left

      border accent. User messages in silver-blue italic. A thinking animation that

      reads 'reading the chart' while the API call processes.

   •​ Multi-turn: Full conversation history is maintained and passed with each request,

      giving Maren memory within a session.

The frontend is a single HTML file — maren.html — that lives in the Soul Interface folder

and connects directly to the local FastAPI server.







Part 5 — The Vision That Emerged

The Council Architecture

Through the course of the day a broader product architecture crystallized. The Soul

Interface is not a single seer — it is a council of traditions, each approaching the soul

from a different angle:



 Seer               Status              Tradition

 Maren              Live                Tropical psychological astrology — Liz Greene,

                                        Sasportas, Forrest, Chani Nicholas

 Vedic Seer         Next                Jyotish — karmic, fatalistic frame, classical texts and

                                        modern practitioners

 Tarot Seer         Planned             Archetypal and symbolic — the moment's energy, what is

                                        seeking to emerge

 Palmistry Seer     Planned             The body as map — what is written in the physical form

 Functional         Future              The body as system — root causes, biological terrain

 Medicine Seer

 Somatic/Therapy    Future              Psychological and body-based healing — the nervous

 Seer                                   system and the wound


 Past               Future              The soul's longer arc — what carried forward, what is

 Life/Hypnotherap                       being completed

 y Seer







The Open World Vision

The Soul Interface is not a dashboard or an app in the conventional sense. It is a world

— an open world journey where the player is always the main character, and the main

character's chart, palm, cards, and past lives are the map the world is built from.

Unlike conventional games where the player inhabits someone else's story, the Soul

Interface inverts this: the world responds to who you actually are. Your Saturn

placement becomes a challenge you face in the environment. Your Chiron wound

becomes a threshold. Your North Node becomes the direction the whole journey is

pulling toward.

The key insight driving this vision: layers of curation and synthesis circumvent the slop

problem inherent in AI generation. Each layer — the corpus, the council synthesis, the

visual psychological journey, the accumulated session memory — adds resistance to

generic output. No single response needs to be extraordinary. The experience of

moving through all of it together, in a world built around your specific soul map, is what

stops being AI and starts being something else.







Why This Cannot Be Easily Replicated

   •​ The corpus is proprietary. 33,000+ chunks from carefully curated esoteric

      literature cannot be reproduced by prompting alone.

   •​ The council synthesis is architectural. Six seers with distinct traditions, wounds,

      and voices synthesizing toward a unified reading produces outputs no single AI

      can generate.

   •​ The curation is taste operating as infrastructure. The decisions about which

      books, which voices, which traditions belong — that is not automatable.

   •​ The personalization is structural, not cosmetic. The world is built from the user's

      actual soul data — chart, palm, cards, past lives. This cannot be faked with

      demographic targeting.

   •​ The aesthetic and world-building is authored. By the time anyone attempts to

      replicate it, the product will be three versions ahead.


Current Build Status — End of Day March 14, 2026

Component                             Status          Notes



Tropical corpus (ChromaDB)            Complete        33,049 chunks, tropical collection



Vedic corpus (ChromaDB)               Complete        Confirmed in same database, vedic collection



Maren system prompt                   Complete        maren_system_prompt.txt, ~800 tokens



maren.py — FastAPI backend            Live            Running on localhost:8000



RAG retrieval layer                   Live            sentence-transformers, 5 chunks per query



Anthropic API integration             Live            $10 loaded, claude-opus-4-5



maren.html — Frontend                 Live            Dark mystical UI, star field, multi-turn chat



Multi-turn conversation               Live            Full history passed with each request



Vedic seer                            Next            Same architecture, vedic collection



Tarot seer                            Planned         Corpus to be built



Palmistry seer                        Planned         Corpus to be built



Council meta-agent                    Future          Synthesis layer across all seers



Session memory                        Future          Persistent memory across sessions



3D cosmic interface                   Future          Three.js/WebGL immersive environment



Deployment                            Future          Cloud server, real domain, public access









Immediate Next Steps

  1.​ Build the Vedic seer — same maren.py architecture, pointed at the vedic

      collection, new persona and system prompt.

  2.​ Build Tarot and Palmistry seers — requires corpus construction before ingestion.

  3.​ Map the visual architecture — begin designing the open world environment and

      how the seers are accessed within it.

  4.​ Switch Maren's model to claude-sonnet-4-5 for faster response times in

      production testing.

  5.​ Deploy to a cloud server so the product is accessible from anywhere, not just the

      local machine.









                          Soul Interface • Build Log v0.1 • March 14, 2026


Maren is alive. The council is being assembled.
