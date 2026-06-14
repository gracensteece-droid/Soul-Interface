**SOUL INTERFACE**
*Development Progress Document*
Sessions: March 2026

## **Project Overview**
Soul Interface is a locally-run astrology and cosmology web application built entirely in HTML and JavaScript, with no server required for core features. The application features three AI seer characters — Maren, Aion, and Arya — an interactive Three.js solar system, and a cosmogenesis sequence that sets the cosmic context before the user enters.

**STACK**
- HTML, JavaScript, CSS — single-file architecture
- Three.js — interactive 3D solar system in index.html
- Canvas 2D — planet renders in planet.html (replaced Three.js/WebGL)
- Anthropic API — claude-opus-4-6 for Aion readings
- localStorage — birth data, readings, and sequence-seen flag

**FILE STRUCTURE**
- index.html — main interface with cosmogenesis sequence and solar system
- planet.html — individual planet detail pages
- config.js — API key configuration (user edits once)

**THREE SEERS**
- Maren — Tropical Astrology · The psyche's map · The wound as door
- Aion — The Origin · Cosmologist · Physicist · The frame that holds all frames
- Arya — Vedic / Jyotish · Karma's timing · The grahas as living intelligence

## **Cosmogenesis Sequence**
The cosmogenesis sequence is the entry experience — a cinematic narration of the origin of the solar system, told by Aion, that plays before the solar system reveals itself. It runs approximately 2.5 minutes and can be skipped.

### **Eight Phases**
- Phase 1 — THE VOID (22s)
– *"Before light, before form, before the first distinction — this."*
- Phase 2 — THE NEBULA (22s)
– *Hydrogen and helium, iron in blood*
- Phase 3 — THE COLLAPSE (18s)
– *"This is not a catastrophe. This is a calling."*
- Phase 4 — THE SUN IGNITES (20s)
– *"For ten billion years, this fire will burn."*
- Phase 5 — THE PLANETS COALESCE (24s)
– *Symphony of orbits*
- Phase 6 — THE FROST LINE (16s)
– *Personal vs transpersonal planets*
- Phase 7 — THE LATE HEAVY BOMBARDMENT (20s)
– *"You will not arrive unmarked."*
- Phase 8 — THE OUTER REACHES (32s)
– *Closes with "Tell us when."*

### **Features Built**
- Multi-line sequential narration — lines stagger in with fade
- Pause/resume — spacebar or button, freezes timer and planet motion
- Skip button — visible from begin screen, works before and during sequence
- Cinematic letterbox bars — retract on council reveal
- Council reveal logic — Maren/Aion/Arya hidden until sequence completes
- localStorage memory — returning visitors skip sequence, go straight to solar system
- "↺ Watch the origin" button — clears flag and replays sequence

## **Solar System (index.html)**
After the cosmogenesis sequence completes, the solar system reveals itself as the main interface. Planets orbit the sun in real time and are clickable to navigate to their detail pages.

### **Planet Navigation**
- 9 planets: Mercury, Venus, Earth, Mars, Jupiter, Saturn, Uranus, Neptune, Pluto
- Planet labels projected from 3D world positions to CSS screen coordinates every frame
- Labels always visible post-cosmo — names float above each planet
- Click label or planet mesh → navigates to planet.html#[slug]
- Hash-based URL routing (#jupiter) — required for Edge file:// protocol compatibility

### **Key Technical Decisions**
- Hash URLs instead of query strings — Edge strips ?p= from file:// URLs
- Raycasting + label click — two independent click paths for planet navigation
- \_labelsPostCosmo flag — controls when navigation activates

## **Planet Detail Pages (planet.html)**
Each planet has its own detail page with a Canvas 2D render, Aion's universal description, astrological stats, and a personal reading tab.

### **Layout**
- Top center — planet symbol, name, archetype line, rule
- Below that center — THE BODY | YOUR READING tabs
- Center — planet sphere (Canvas 2D, centered at 50% viewport)
- Left side — Aion's description text, flanks planet vertically
- Right side — stats panel (Rulership, Orbital Period, In the chart, Shadow)
- Bottom center — PREV · dots · NEXT navigation

### **Canvas 2D Planet Renderer**
Three.js/WebGL was replaced entirely with a Canvas 2D renderer after WebGL was found to fail on file:// protocol in Edge. The Canvas 2D renderer works reliably from local files.

- Deep space background with 1800 twinkling stars
- Planet sphere with radial gradient lighting (upper-left key light, shadow terminator)
- Atmospheric glow per planet
- Surface band detail for gas giants (Jupiter, Saturn, Uranus, Neptune)
- Saturn rings — three concentric elliptical arcs
- Specular highlight
- Slow continuous rotation animation

**PLANET COLOR PALETTES**
- Mercury — grey/brown rocky tones
- Venus — golden/amber cloud bands
- Earth — blue oceans, green continents
- Mars — iron oxide red
- Jupiter — amber bands with Great Red Spot area
- Saturn — pale gold with ring system
- Uranus — cyan/teal
- Neptune — deep cobalt blue
- Pluto — dusty rose/mauve

### **Two-Tab System**
- "The Body" tab — Aion's universal 3-paragraph cosmological description of the planet
- "Your Reading" tab — personalized reading via Anthropic API

### **Aion API Readings**
- Model: claude-opus-4-6, max\_tokens: 600
- System prompt establishes Aion as 81-year-old cosmologist speaking from deep time
- Prompt includes birth date, optional time, place, and which planet is being asked about
- Response cached per planet slug in localStorage (si\_reading\_[slug])
- Birth data stored as {date, time, place} under si\_birth key
- "↺ Change birth data" clears all birth data and cached readings

### **config.js — API Key Management**
To avoid re-entering the API key on every update, a config.js file holds the key and is loaded by planet.html. The user edits config.js once.

// config.js
window.SOUL\_INTERFACE\_API\_KEY = 'sk-ant-your-key-here';

*planet.html reads: const ANTHROPIC\_API\_KEY = window.SOUL\_INTERFACE\_API\_KEY || 'fallback';*

## **Technical Challenges Solved**

### **WebGL Blocked on file:// Protocol**
Three.js WebGL renderer produced a pure black canvas when opening files locally in Edge. Replaced entirely with Canvas 2D renderer that works reliably from local files without any server.

### **Edge Query String Stripping**
Edge strips query strings (?p=jupiter) from file:// URLs as a security measure. All planet navigation was switched to hash-based URLs (#jupiter). The getSlugFromURL() function tries hash, query string, then full href scan as three independent fallback methods.

### **API Key Syntax Error**
The most persistent bug: when the API key was pasted without quotes (sk-ant-... instead of 'sk-ant-...'), JavaScript interpreted sk as an undefined variable, crashing the entire script before PLANETS was defined. This caused the page to show a blank slate with only the label text visible.

### **Browser Cache Aggressive Behavior**
Edge aggressively caches file:// pages. Multiple sessions were spent diagnosing issues that turned out to be Edge serving old cached versions. Solutions: Ctrl+Shift+Delete to clear cache, Ctrl+F5 for hard refresh, and ultimately adding !important flags and inline styles to override cached CSS.

### **Pointer-Events Blocking**
A full-screen overlay div absorbed all clicks including planet navigation. Resolved by setting pointer-events:none on overlay elements and ensuring the veil never had pointer-events:all except when intentionally blocking.

### **Veil Never Clearing**
The page-transition veil (full-screen dark overlay) relied on JavaScript to clear. When JS errored, it stayed black permanently. Fixed by adding a CSS animation fallback: animation:veilClear 0s 2.5s ease forwards — CSS clears the veil after 2.5 seconds regardless of JS state.

## **Planet Content**
All planet descriptions were written in Aion's voice: precise, unhurried, cosmologically grounded. Each planet has three description paragraphs plus four stat fields.

**NINE PLANETS**
- Mercury — The messenger. The mind.
– *88 Earth days · Gemini/Virgo · Thought, speech, perception*
- Venus — The mirror. The principle of attraction.
– *225 Earth days · Taurus/Libra · Love, beauty, values*
- Earth — The ground of incarnation.
– *365.25 days · No rulership — the observer*
- Mars — The drive. Will made visible.
– *687 Earth days · Aries/Scorpio · Drive, desire, conflict*
- Jupiter — The expansion. The search for meaning.
– *11.86 years · Sagittarius/Pisces · Growth, philosophy, faith*
- Saturn — The limit. The teacher who does not spare you.
– *29.5 years · Capricorn/Aquarius · Structure, time, mastery*
- Uranus — The awakener. The revolutionary.
– *84 years · Aquarius · Revolution, innovation, sudden change*
- Neptune — The dissolver. The longing for union.
– *165 years · Pisces · Mysticism, dreams, dissolution*
- Pluto — The transformer. Lord of the deep.
– *248 years · Scorpio · Death, rebirth, transformation*

## **Current State**

### **Working**
- Full cosmogenesis sequence with Aion narration across 8 phases
- Pause/resume and skip functionality
- Interactive solar system with orbiting planets
- Planet labels float above planets in post-cosmo mode
- Planet navigation from solar system to detail pages
- Canvas 2D planet renders — all 9 planets with distinct visual identities
- Saturn rings rendered correctly
- Two-tab system on planet pages (The Body / Your Reading)
- Aion readings via Anthropic API with localStorage caching
- Birth data entry and persistence across all planets
- config.js API key system — enter key once, never again
- Back navigation, prev/next arrows, dot navigation
- Council reveal (Maren, Aion, Arya) after sequence completes
- localStorage memory — returning visitors skip sequence

### **Pending / On the Horizon**
- Cosmogenesis early phases still show hints of solar system
- Particle system rebuild — currently squares on some GPUs, round sprite fix in progress
- Proper keyframe timeline for the sequence
- Houses feature — planned for later development, potentially Unreal Engine
- Seer chat pages (Maren, Arya) — existing files in folder, not rebuilt yet
- Planet renders are gradient spheres — procedural texture upgrade planned

## **Soul Interface Folder**
**LOCATION**
*C:\\Users\\default.LAPTOP-EASRT11L\\OneDrive\\Desktop\\Soul Interface\\*

**KEY FILES**
- index.html — main entry point, open this to launch
- planet.html — planet detail pages
- config.js — API key (edit this once with your sk-ant- key)
- seer\_chat.html — existing seer chat interface
- arya.html — Arya interface

**HOW TO RUN**
- Double-click index.html to open in Edge
- No server required for core features
- For "Your Reading" API calls: run python -m http.server 8000 in the folder, then open localhost:8000

**AFTER EACH UPDATE**
- Download new files from Claude, replace in Soul Interface folder
- Press Ctrl+Shift+Delete in Edge → clear cached images and files → All time
- Or press Ctrl+F5 on the page for a hard refresh
