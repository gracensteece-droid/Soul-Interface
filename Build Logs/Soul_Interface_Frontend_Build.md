**SOUL INTERFACE**
*Frontend Build — Session Documentation*
March 27–28, 2026
*Maren  ·  Aion  ·  Arya*

*Built in a single 16-hour session.*
*Cosmogenesis sequence, Three.js solar system, seer chat interface,*
*procedural planet textures, Web Audio engine, and ChromaDB corpora.*
## **1. Project Overview**
Soul Interface is a multi-agent AI divination platform built around three distinct seer characters — Maren (Tropical astrology), Arya (Vedic/Jyotish), and Aion (Cosmogenesis/physics). The platform opens with a cinematic cosmogenesis sequence narrated by Aion, followed by a navigable solar system, and seer chat interfaces that generate personalized readings via RAG-backed language models.

**CORE VISION**
An initiatory experience — users witness the origin of the cosmos before meeting the seers. By the time Maren, Aion, and Arya appear, the user has been contextually primed to receive their reading as meaningful, not merely entertainment.

**PLANNED MONETIZATION**
Free cosmogenesis sequence + one free reading, then $12–18/month subscription for full access to all three seers and the synthesis layer. Target demographic: Chani Nicholas-adjacent spiritual/psychological astrology audience.
## **2. File Structure**
**FRONTEND FILES**
- **Main landing page** — index.html
Three.js solar system + cosmogenesis sequence + seer panel + nebula canvas. All self-contained in a single HTML file.
- **Seer chat interface** — seer\_chat.html
Three-tab seer switcher (Maren / Aion / Arya), per-seer conversation history, connects to Flask servers on ports 8000, 8002, 8001.
- **NASA texture downloader** — download\_textures.py
Run once to download real photographic planet maps from Solar System Scope into textures/ subfolder. 14 files, ~50MB total.

**BACKEND FILES (PER SEER)**
- Maren.py — Tropical astrology seer, port 8000, Claude Opus, ChromaDB tropical corpus (~33K chunks)
- Aion.py — Cosmogenesis seer, port 8002, Claude Sonnet, ChromaDB cosmogenesis corpus (~74K chunks)
- Arya.py — Vedic/Jyotish seer, port 8001, Claude Sonnet, ChromaDB vedic corpus (~35K chunks)
## **3. index.html Architecture**
### **3.1 Layer Stack (z-index order)**
- **Layer 1** — canvas#nebula (z:0)
2D canvas nebula clouds. Slow fade in/out, hue-cycling, edge-positioned. Three asymmetric lobes, cool color palette (blues/purples/teals dominant). Runs independently of Three.js.
- **Layer 2** — canvas#scene (z:1)
Three.js solar system rendered with alpha:true background so nebula canvas shows through. Contains all 3D geometry.
- **Layer 3** — #ui (z:4)
Title block (SOUL INTERFACE, shimmer animation) + seer panel (Maren / Aion / Arya cards with sigils).
- **Layer 4** — #cosmo (z:5)
Cosmogenesis overlay text. Alternates top-left / top-right per phase. Fades in/out with 2.2s transition.
- **Layer 5** — #cosmo-begin (z:20)
Begin screen gate. Required for AudioContext autoplay policy — user must click before audio starts.
- **Layer 6** — #veil (z:60)
Navigation fade veil for transitions to seer\_chat.html.
### **3.2 Three.js Scene**
**SUN**
- Canvas-drawn texture (procedural) with hot-swap slot for NASA tex\_sun.jpg
- 5 corona layers (additive-blended BackSide spheres at increasing radii)
- PointLight at origin — primary scene illumination

**PLANETS**
- 9 planets (Mercury through Pluto) with MeshStandardMaterial
- Procedural per-pixel noise textures as fallbacks (fbm + domain warping)
- Atmospheric rim glow per planet — BackSide additive sphere at 1.18x radius
- Earth has separate cloud layer sphere at 1.008x radius, rotates at different speed
- Saturn has 4 ring bands + Cassini glow ring
- NASA texture hot-swap via THREE.TextureLoader onLoad callback

**STARS & MILKY WAY**
- 5 star layers (8000 + 3000 + 800 + 60 + 20 particles) at varying sizes and opacities
- 2 bright foreground star layers (0.55 and 0.80 size) for pop
- Milky Way band — 3000 particles in equatorial band geometry

**ASTEROID BELT**
- 2500 core particles + torus glow mesh + separate glow cloud particles
- Warm amber/orange coloring, orbit at 22.8 AU
### **3.3 Camera System**
**[DECISION] ***All camera movement goes through sphTarget — never direct camera.position manipulation.*
The camera system uses two objects: sph (current spherical coords) and sphTarget (destination). Every frame, the animate loop lerps sph toward sphTarget at 0.016 speed during cosmogenesis and 0.10 speed after. This prevents any hard snapping or clipping between phases.

sph       = { theta, phi, r }             // current position
sphTarget = { theta, phi, r, lookX, lookY, lookZ } // destination

The lookX/Y/Z fields let the camera point at a specific world position (e.g., a planet during surface shots) rather than always looking at origin. These also lerp at 0.016 per frame so lookAt transitions are smooth.
### **3.4 Cosmogenesis Sequence (8 Phases)**
Total runtime approximately 96 seconds. Each phase calls enter() once on start and fn(pct, dt) every frame. The sequencer in the animate loop advances phases by elapsed time.

**PHASE 1 — THE VOID (8S)**
- Sun barely visible — faint pulsing point
- sphTarget.r = 145, slow theta rotation across phase
- SFX: voidRumble — deep 20Hz subsonic drone

**PHASE 2 — THE NEBULA (14S)**
- 6000 particles bloom as asymmetric 3-lobe cloud (not a sphere)
- Cool palette: 80% blues/purples/teals, 20% warm accent
- Camera at r:280 — far enough to see full cloud extent
- Particles drift with per-particle noise for organic turbulence
- SFX: nebulaWhoosh — filtered white noise whoosh

**PHASE 3 — THE COLLAPSE (11S)**
- Particles rush inward — each moves toward origin proportional to distance
- Camera rushes in from r:280 to r:40 via easeIn curve
- SFX: collapseRumble — accelerating sawtooth 40Hz→18Hz + noise crackle

**PHASE 4 — THE SUN IGNITES (12S)**
- 3-act: compress (0–25%) → blinding flash (25–42%) → resolve (42–100%)
- flashMesh (BackSide sphere, additive blend) creates screen-filling white flash
- sunLight.intensity peaks at 42 during flash
- SFX: sunBoom — 4-layer plasma roar: subsonic thud + sawtooth mid + stereo noise + harmonic ring-out

**PHASE 5 — THE PLANETS COALESCE (24S)**
- Particles lerp to home orbital positions (pre-assigned at init)
- Planets scale in from 0 → 1 staggered across the phase
- One surface shot per planet — hard snap to surface, slow lateral drift, hard snap back
- window.\_shotsFired Set prevents any planet from getting a second shot
- Between shots: continuous theta rotation so camera never freezes
- SFX: planetPing per planet — crystalline sine tone unique per planet

**PHASE 6 — THE FROST LINE (9S)**
- TorusGeometry ring expands outward then fades — marks 2.5 AU ice boundary
- Asteroid belt glow fades in
- SFX: frostSweep — bandpass-filtered sine sweeping 2000→4000→1500 Hz

**PHASE 7 — THE LATE HEAVY BOMBARDMENT (11S)**
- 8 impact flash spheres cycle on inner planets with random positions
- 11 staggered impactThud SFX at irregular intervals
- Planet emissive intensity flickers to simulate heat
- SFX: impactThud — 3-layer: highpass crack + pitch-drop thud + bandpass debris hiss

**PHASE 8 — THE OUTER REACHES (11S)**
- Camera pulls back to r:145, Oort cloud fades in
- Nebula faintly returns — returning to source
- SFX: outerFade — long reverb sine tail at 110Hz
### **3.5 Surface Shot System**
**[DECISION] ***Surface shots use direct camera.position.set() — intentional hard cut, not a lerp.*
During Phase 5, as each planet reaches 55% scale, it triggers a surface shot. The camera hard-snaps to 1.35x planet radius above the surface, positioned at a low horizon angle. It drifts slowly laterally across the surface (0.5 radians across the shot window). On exit, sph is synced from camera.position so the subsequent lerp starts from the correct position.

window.\_shotsFired  = new Set()   // tracks which planets have fired
window.\_inSurfShot  = false       // whether we're currently in a shot
window.\_surfShotEnd = 0           // pct value when current shot ends
### **3.6 Web Audio Engine**
**[DECISION] ***AudioContext is created lazily inside window.\_startAudio() — called on Begin click, never before.*
This is required by browser autoplay policy. Creating AudioContext before user interaction results in a suspended context where all sounds are silently dropped. The Begin screen gate solves this while also providing the cinematic entry point the experience needs.

**MUSIC LAYERS (ALWAYS PLAYING AFTER BEGIN)**
- Sub drone: two oscillators at A1 (55Hz) and A2 (110Hz) — subsonic foundation
- Detuned sawtooth pads: A3/E4/A4/C5 — lush harmonic bed
- Shimmer oscillators: A5/E5 with LFO modulation — high shimmer
- Melodic arpeggios: 3 phrases (ascending, descending, suspended) timed to phases
- Reverb: convolver node with 5.5s impulse response
- Master chain: gain → dynamics compressor (limiter) → destination

**SFX PER PHASE**
- voidRumble — subsonic rumble, fades in slowly
- nebulaWhoosh — bandpass white noise, 4 seconds
- collapseRumble — accelerating sawtooth + highpass crackle, 11 seconds
- sunBoom — 4-layer plasma roar, fires at 25% into phase (3 seconds in)
- planetPing — crystalline sine per planet, 9 unique frequencies
- frostSweep — sweeping bandpass tone, 6 seconds
- impactThud — crack + thud + hiss, randomized intensity per hit
- outerFade — long reverb sine at 110Hz, 11 seconds
### **3.7 Text Display System**
**[DECISION] ***Phase text alternates top-left (even phases) / top-right (odd phases).*
The #cosmo-text element uses CSS classes side-left and side-right toggled per phase by showPhase(). Text fades out (opacity 0) then back in (opacity 1) with 1.6s delay and 2.2s CSS transition. Phase name displays in small caps above narration text. Heavy text-shadow ensures readability against any background.

Text does NOT overlap the seer names panel because it's positioned in the top third of the screen (top: 6vh) while the seer panel sits below the solar system.
## **4. seer\_chat.html Architecture**
Three-tab seer switcher with sliding underline indicator. Each tab maintains its own conversation history — switching tabs preserves the conversation. A back button (← The Council) fades to index.html.

**SEER ROUTING**
- Maren: http://localhost:8000/ask/maren — Tropical astrology, Claude Opus
- Aion:  http://localhost:8002/ask/aion  — Cosmogenesis, Claude Sonnet
- Arya:  http://localhost:8001/ask/arya  — Vedic/Jyotish, Claude Sonnet

**VISUAL DESIGN**
- Star field background canvas (same as index.html)
- Glow orb behind active seer card
- Veil overlay for page transitions
- Each seer has distinct color palette (currently shared template, to be individualized)
## **5. NASA Texture System**
The page works in two modes depending on whether the textures/ folder exists next to index.html:

**MODE 1 — NO TEXTURES FOLDER (CURRENT STATE)**
Procedural per-pixel textures render immediately. Built on value noise + fractal Brownian motion (fbm) + domain warping. Each planet has a realistic palette: Earth has ocean depth gradient + polar ice caps + continental topology; Mars has dark volcanic plains + rusty red highlands + pink polar caps; Jupiter has real band structure with Great Red Spot; etc.

**MODE 2 — WITH TEXTURES FOLDER (AFTER RUNNING DOWNLOAD\_TEXTURES.PY)**
THREE.TextureLoader attempts to load local files. On success, each texture hot-swaps into the material via onLoad callback — planets upgrade from procedural to photographic without any page reload. The Milky Way background also loads as an equirectangular scene background.

**FILES REQUIRED IN TEXTURES/ FOLDER**
- tex\_mercury.jpg, tex\_venus.jpg, tex\_earth.jpg, tex\_earth\_clouds.jpg
- tex\_mars.jpg, tex\_jupiter.jpg, tex\_saturn.jpg, tex\_uranus.jpg, tex\_neptune.jpg
- tex\_pluto.jpg, tex\_sun.jpg, tex\_stars.jpg

*Source: Solar System Scope free texture pack (CC BY 4.0) at https://www.solarsystemscope.com/textures/*
## **6. Key Architectural Decisions**
**[DECISION] ***Begin screen gates BOTH audio AND sequencer. AudioContext created inside click handler.*
**[DECISION] ***Camera: unified sphTarget system. Never set camera.position directly except during surface shots.*
**[DECISION] ***Surface shots: hard snap (direct position set) is intentional — cinematic cut feel.*
**[DECISION] ***Textures: procedural fallbacks always render immediately. NASA hot-swaps asynchronously.*
**[DECISION] ***Text: alternating top-left/top-right positioning. Keeps text out of seer panel zone.*
**[DECISION] ***Audio: all SFX use Web Audio API nodes, no audio files. Fully self-contained HTML.*
**[DECISION] ***Nebula: 3-lobe asymmetric structure. Cool color palette. Camera at r:280 — clearly not the sun.*
**[DECISION] ***Phase transitions: sphTarget changes happen in phase fn(), lerp happens in animate(). Never both.*
**[DECISION] ***Aion's role: not just narrator — synthesis layer between Maren and Arya, plus dream/transit interpretation.*
## **7. Current Status (as of March 28, 2026)**
### **Working**
- Full cosmogenesis sequence (8 phases, ~96 seconds)
- Three.js solar system — all 9 planets, asteroid belt, Saturn rings, Oort cloud
- Seer chat interface with tab switching and conversation history
- Web Audio engine — music layers + 8 phase SFX
- Begin screen gate for audio autoplay compliance
- Procedural planet textures (realistic noise-based, not plasma swirls)
- Atmospheric rim glow per planet
- Earth cloud layer (separate rotating sphere)
- Text alternating left/right per phase
- Surface shots during Planets Coalesce phase
- Maren corpus ingested (~33K chunks, Tropical astrology library)
- Arya corpus ingested (~35K chunks, Vedic/Jyotish library)
- Aion corpus ingesting (~74K chunks — IN PROGRESS as of this writing)
### **Pending / Next Session**
- Download NASA textures → drop in textures/ folder (20 min)
- Verify Aion ingestion completed, test Aion in chat
- Birth data input form — the personalization gateway
- Maren/Arya/Aion personalized landing pages per birth chart
- Horizon-based house view with clickable houses
- Distinct visual environments per seer (currently shared template)
- ElevenLabs voice for Aion narrating cosmogenesis sequence
- Mobile experience optimization
## **8. ChromaDB Corpus Details**
### **Maren — Tropical Astrology**
- ~33,000 chunks
- Collection name: tropical (must match COLLECTION\_NAME in Maren.py)
- Source: Tropical astrology library — practitioners, psychological astrology, Chiron/wounded healer tradition
- Embedding: ChromaDB DefaultEmbeddingFunction (sentence-transformers)

### **Arya — Vedic/Jyotish**
- ~35,000 chunks
- Collection name: vedic (must match COLLECTION\_NAME in Arya.py)
- Source: Vedic astrology library — classical texts, grahas as living intelligence, Jyotish practitioners

### **Aion — Cosmogenesis**
- ~74,000 chunks (largest corpus)
- Collection name: cosmogenesis (must match COLLECTION\_NAME in Aion.py)
- Source: 81 PDFs — Sagan, Penrose, Krauss, Davies, Whitehead, Bohm, Tarnas, CS Lewis, Gould, and more
- Notable titles: Cosmos and Psyche (Tarnas), Cycles of Time (Penrose), Emperor's New Mind (Penrose), Quantum Theory (Bohm), Dancing Wu Li Masters, Causality and Chance (Bohm)
- Ingestion command: python ingest\_aion.py (from Aion folder, with docs/ subfolder containing PDFs)
- Runtime: approximately 3-5 hours on CPU
## **9. Running the Project**
### **Start All Three Seers**
cd "C:\\Users\\default.LAPTOP-EASRT11L\\OneDrive\\Desktop\\Maren"
python Maren.py

cd "C:\\Users\\default.LAPTOP-EASRT11L\\OneDrive\\Desktop\\Arya"
python Arya.py

cd "C:\\Users\\default.LAPTOP-EASRT11L\\OneDrive\\Desktop\\Aion"
python Aion.py

### **Open Frontend**
Open index.html directly in browser (Chrome recommended). No local server needed — all assets are inline or loaded from textures/ subfolder.

### **Verify Corpus Chunk Count**
python -c "import chromadb; c = chromadb.PersistentClient(path='chroma\_db'); col = c.get\_collection('cosmogenesis'); print('Chunks:', col.count())"

### **Re-run Ingestion (if needed)**
cd "C:\\Users\\default.LAPTOP-EASRT11L\\OneDrive\\Desktop\\Aion"
python ingest\_aion.py
*Ensure docs/ folder contains all PDFs. Leave terminal open — takes 3-5 hours. Do not close the window.*

*A council of seers. An origin before them.*
Soul Interface — Built March 27–28, 2026
