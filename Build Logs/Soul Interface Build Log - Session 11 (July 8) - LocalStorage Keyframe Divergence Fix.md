# Soul Interface Build Log — Session 11 (July 8)
## Topic: Git Commit/Push Clarification, and the Real Chrome vs. Edge Bug

---

### What We Did

Short follow-on session. Started with confusion over what "commit my keyframes" actually means given how this scene persists state, then found and fixed a real cross-browser bug underneath what had looked like a false alarm the day before.

---

### Part 1 — Keyframes Aren't Files

Ricky asked to commit his current keyframe edits to git. Turned out he'd been saving via the sequencer's 💾 controls, which persist to the browser's **localStorage** (`originSceneSequencers_v1` for keyframes, `originSceneParamDefaults_v1` for per-group defaults) — not to `main.js` on disk. Git only tracks files, so there was nothing to commit until that data was pulled out of the browser.

Also clarified along the way: the panel's **📋 Export Values** button (added Session 9) only dumps the *resolved* `tVals` snapshot at one instant — a single fixed number per property — not the actual keyframe timelines. Baking that in as-is would have frozen every animated property to whatever it happened to equal at export time, destroying the actual animation. The real keyframe data had to come from the console directly:

```js
copy(localStorage.getItem('originSceneSequencers_v1'))
```

Once Ricky ran that in Edge (where his tuned keyframes actually lived) and pasted the result, it was baked into `main.js` as a new `BAKED_SEQ_DATA` constant — used as the fallback only when a browser's own `localStorage` is empty, so it doesn't override anyone's live in-progress tuning. Committed locally as `8443bd0`.

---

### Part 2 — The Chrome/Edge Difference Was Real This Time

Session 10 (July 7) diagnosed a Chrome-vs-Edge "different version" report as a false alarm — both browsers had identical saved state, the visual difference was just two screenshots ~2s apart during a turbulence-driven sequence.

Today's report was the same symptom but a **different, real cause**: localStorage is per-browser/per-profile. Ricky had been saving keyframes while tuning in Edge; Chrome's `localStorage` for `localhost:5176` never received any of that, so Chrome was silently running the sequence's empty/default state the whole time while Edge showed the actual tuned scene. Not a caching bug, not a Vite bug — just two completely separate, unsynced storage buckets that happen to point at the same URL.

The `BAKED_SEQ_DATA` fallback from Part 1 fixes this going forward: any browser with empty localStorage (a fresh Chrome profile, a different machine, etc.) now starts from Ricky's tuned sequence instead of blank, so this specific divergence shouldn't recur unless he tunes further and only saves in one browser again.

---

### Current State

All changes are in `Aion/Frontend/origin/src/main.js` only. Local commits so far this stretch of work (none pushed to `origin/master` yet — 10 commits ahead as of this session):

```
8443bd0  Bake in Ricky's tuned keyframes as the sequencer's default fallback
1b30f96  Add Session 10 build log — Sun.dissolve effect + Chrome/Edge non-bug
ad7fca0  Add Sun.dissolve control — sun breaks apart into particles
```

### Dev Server
```
cd Aion/Frontend/origin
npm run dev
```

---

### Next Session

- Ricky still hasn't confirmed the baked-in keyframes actually resolved the Chrome view after a reload — check that first.
- Push to `origin/master` is still pending — Ricky confirmed he wants a direct push (no PR workflow, single `master` branch) whenever he's ready to do it.
- `Vision & Architecture/Seers/Maren/01 - The Twelve Houses as Landscapes.md` still has a zero-content line-ending-only diff sitting in the working tree — harmless, but worth a `git checkout` or a real edit to clear it eventually.
- Carried over from Session 10: confirm the `Sun.dissolve` effect reads the way Ricky wants once watched end-to-end.
