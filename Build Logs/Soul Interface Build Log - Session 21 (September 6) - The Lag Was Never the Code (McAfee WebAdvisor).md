# Soul Interface Build Log — Session 21 (September 6)
## Topic: Months of Perceived Lag Traced to a Browser Extension, Not the Scene

---

### What Happened

Continuing straight from Session 20's performance saga on `Aion/Frontend/Code/cosmogenesis-with-nebula-intro.html`. Picked up two specific, still-open complaints: lag when all six intro-nebula groups are simultaneously active/formed (~2.5–7s), and a lag at ~T=63s when the cosmogenesis "collapse" phase spin ramps up.

Did the further step-budget cuts already queued from last session (Group A 16→11, B 12→8, C 12→8, D 9→6, E 6→4, F 4→3), then cut `FINE_N` 14000→10000 and `CLOUD_N` 2800→2000 at Ricky's request. Reported: the T=63 lag was still there.

Went looking "architecturally" for the T=63 cause by reading code (no live browser connection again this session): traced through the Collapse-phase update logic, confirmed `drainMat`/`cvortMat`/the bipolar-jet layers are genuinely dead code (gAlpha never gets a real base value, only ever multiplied — confirmed again, still true), and landed on a theory that `cloudMat`'s point-sprite size (clamped up to 400px, uncapped relative to the other particle layers which cap at 5–13px) was causing a fill-rate/overdraw spike as the camera zooms in during collapse (`sph.r` shrinks 320→135). Capped it to 160px. **Ricky reported this made things worse, not better** — reverted immediately.

This was the point Ricky (rightly) pushed back hard: multiple sessions of code-level performance work, increasing frustration, a direct and fair "would Unity guarantee this doesn't happen" question, and real doubt about whether this was fixable at all or worth more time.

### The Actual Breakthrough

Answered the Unity question honestly: no engine guarantees away real-time rendering performance problems, but better GPU/CPU profiling tooling was the real gap — everything this whole debugging arc (across Sessions 20 and 21) had been reasoned from reading shader code, never from an actual trace, because the Chrome browser tool has been disconnected every session.

Asked Ricky to record a Chrome DevTools Performance trace himself and screenshot the Summary tab. **This is what actually broke it open.** The first trace (0–55s, i.e. essentially the whole scene up through just before collapse) showed:

- Scripting: 28,836 ms out of a 55,168 ms total — over half of all main-thread time.
- Broken down by source: **`localhost` (the actual scene code): only 1,586.3 ms.** `[unattributed]`: 26,229.3 ms. **McAfee® WebAdvisor (browser extension): 9,175.9 ms.**

The scene's own JS was responsible for a tiny fraction of the recorded main-thread time. A background antivirus browser extension was eating over 9 full seconds of it.

A second trace (taken before properly disabling the extension — Ricky had only unpinned it from the toolbar via the puzzle-piece "site access" popup, which does not disable it) showed McAfee's share had gone *up*, confirming the toolbar pin/unpin control isn't the same as the real per-extension toggle at `chrome://extensions`.

Walked Ricky through disabling it properly (`chrome://extensions` directly, not the toolbar popup — flip the actual on/off switch on the extension's card), followed by a hard refresh before re-recording (extensions already injected into a live tab don't fully unload from just toggling without a reload).

**Result: no lag, at either previously-reported trouble spot.** Confirmed by Ricky directly: "oh my god no lags finally."

---

### Root Cause

McAfee WebAdvisor was running content scripts/observers on the page this whole time, consuming a large, apparently front-loaded chunk of main-thread time completely unrelated to the Three.js scene. This likely explains a meaningful share of the "I changed X and it got worse for no reason" experiences across Sessions 20 and 21 — the actual bottleneck for a lot of that time wasn't in the code being edited at all.

None of the earlier in-code fixes from Session 20 (GC-pressure fixes, dead-code identification, group staggering, step-budget cuts, the early-discard shader fix) are wrong or wasted — `localhost`'s own main-thread share was already down to ~1.6 seconds across a 55-second trace by the time this was measured, which reflects that real work. They just weren't the dominant cost next to a 9-second extension tax.

### Takeaway

**Get a real trace before touching code, every time — this cannot be skipped again.** Every session this arc ran without a working Chrome browser tool connection, meaning every "fix" was a guess against shader math, not a measurement. The moment an actual DevTools Performance trace existed, the real cause was identifiable in one screenshot. If the browser tool is disconnected again in a future session and a performance complaint comes in, ask Ricky to pull a trace screenshot himself (Performance tab → record → Summary tab, "Main thread time" broken out by 1st/3rd party) before any code changes — do not resume guessing from code alone.

Also worth checking early, alongside [[project_chrome_gpu_routing_fix]]: browser extensions and OS-level GPU routing are both real, non-code causes that have each independently accounted for major perceived performance swings on this machine. Check both before touching the scene's own code.

---

### Current State

- `Aion/Frontend/Code/cosmogenesis-with-nebula-intro.html`: step-budget cuts and `FINE_N`/`CLOUD_N` reduction from this session are in place and kept (harmless, already-verified-good reductions). The `cloudMat` point-size cap experiment was tried and reverted — back to the original `clamp(ptSz,4.0,400.0)`, unchanged from Session 20.
- No further code changes needed for either previously-reported lag — both are resolved by disabling the McAfee WebAdvisor extension.
- GitHub Pages 404 from Session 20 is still open/unresolved — not revisited this session.
