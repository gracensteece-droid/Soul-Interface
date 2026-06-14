# Soul Interface — Build Log: Session 2
*June 14, 2026 — Repo refinement, secret management, and local migration.*

---

### Aion Integration
- Merged Aion's code into the per-seer repo structure: `Aion/Backend/Code/` now holds `Aion.py`, `aion_system_prompt.txt`, and `ingest_aion.py`.
- Excluded `.env` and a duplicate `Ingest Aion.txt` from the merge.
- Aion now matches the same `Frontend|Backend / Code|Build Log` structure already used for Maren and Arya.

### Security Audit
- Confirmed no `.env` files exist anywhere in the repo.
- Confirmed no hardcoded API keys in any script — all three seer backends read `ANTHROPIC_API_KEY` via `os.environ.get(...)`.

### Doppler Secret Management
- Found the repo's Doppler scope was misconfigured (`project = example-project`, a placeholder).
- Fixed via `doppler configure set project=soul-interface config=dev` from the repo root — scope cascades to all subdirectories.
- Verified `doppler secrets --only-names` returns `ANTHROPIC_API_KEY`, `DOPPLER_CONFIG`, `DOPPLER_ENVIRONMENT`, `DOPPLER_PROJECT`.
- `doppler run -- <cmd>` now injects secrets as environment variables for all three backends, fully replacing `.env`.

### Centralized Scripts Folder
- Created a dedicated folder (later renamed **Centralized Scripts**) for repo-wide utility scripts.
- Moved `start_soul_interface.bat` and `download_textures.py` here from the repo root.
- Rewrote `start_soul_interface.bat` to use local, relative (`%~dp0`) paths instead of OneDrive paths, and wired each backend launch through `doppler run --`.
- Fixed `download_textures.py`'s `TEXTURES_DIR` calculation (one extra `dirname`) so it still resolves to the repo-root `textures/` folder after the move.
- Updated the docstring usage example in `download_textures.py` to reference the new local path instead of an old OneDrive path.

### ChromaDB / Local Data Migration
- Moved `Tropic Seer/` (1.3GB ChromaDB + ~35 source PDFs, shared between Maren's `tropical` and Arya's `vedic` collections) from `OneDrive\Desktop\Tropic Seer` to `Projects\Tropic Seer` via robocopy.
- Updated `CHROMA_PATH` in `maren.py` and `arya.py` to point to `Projects\Tropic Seer\chroma_db`.
- Updated `CHROMA_PATH` in `Aion.py` to point to `Projects\Aion\chroma_db` (was previously a relative path that resolved incorrectly).

### Repo Cleanup
- Deleted `Soul Interface current frontends.txt` (repo root) — an outdated snapshot of `index.html` (622 lines vs. current 3070).
- Deleted `!DOCTYPE html.txt` (repo root) — another outdated `index.html` snapshot (871 lines).
- Deleted stale `__pycache__/` directory (4 mismatched `.pyc` files from old script locations/Python versions).
- Removed empty, purposeless `SI Current visual UI/` folder.
- Populated `.gitignore` (previously empty) with `__pycache__/`, `*.pyc`, `.env`, `.env.*`, and `.obsidian/`.

### Documentation Review
- Confirmed `Build Logs/` correctly holds only general/shared docs (ingestion pipeline setup, cross-seer backend troubleshooting, shared frontend architecture).
- Confirmed `Vision & Architecture/` categorization is correct — general design docs at top level, per-seer docs under `Seers/`.
- Converted `Vision & Architecture/Seers/Aion/Aion Logic.pdf` (40 pages) to `Aion Logic.md` via `pypdf`, then deleted the source PDF — completes markdown parity across all three seers' Vision & Architecture docs.

### OneDrive Duplicate Resolved
- Discovered a second, older copy of the entire project at `OneDrive\Desktop\Soul Interface\` — a pre-reorganization snapshot left behind from an earlier session's restructure into `Projects\soul-interface`.
- Confirmed every file in the OneDrive copy was already superseded by `Projects\soul-interface` (equal or older).
- Deleted the OneDrive copy entirely. `Projects\soul-interface` is now the single, fully local copy of the project — no OneDrive dependencies remain anywhere (code, scripts, or data).

### New Material
- `Aion/Frontend/Build Log/Cosmogenesis photo references/` — new folder with phase-by-phase visual reference screenshots (Phases 2–8) for the upcoming frontend cosmogenesis sequence rebuild.

### Doppler Verification & Claude Permission Lockdown
- Verified live: `doppler run --` correctly injects `ANTHROPIC_API_KEY` (108 chars) when run from `Maren/Backend/Code`, confirming the cascaded scope works for all three seer backends.
- Added `.claude/settings.json` at the repo root with a permission `deny` list blocking `doppler secrets get` and `doppler secrets download` — prevents Claude Code from ever printing/exporting raw secret values in this repo, while `doppler run --` (injection only, no display) remains unaffected.

### Key Troubleshooting
- Doppler project/config scope must be set explicitly per-directory (`doppler configure set`) — it doesn't infer from the repo name.
- `pypdf` wasn't installed — `py -3.11 -m pip install pypdf --quiet` resolved it.
- Printing extracted PDF text to the Windows console hit `UnicodeEncodeError` on `→` (cp1252) — fixed by writing to a UTF-8 file instead.
- VS Code Explorer showing stale folders (e.g. `SI Current visual UI`) after deletion turned out to be because VS Code had the *old OneDrive copy* open, not `Projects\soul-interface`.
