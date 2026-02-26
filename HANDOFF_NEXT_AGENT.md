# Handoff Notes for Next Agent

Date: 2026-02-26
Repo: voicebox (origin: https://github.com/Beatwrecka/voicebox)
Branch: main

## What Was Implemented

### Voice Sculpting Features
- Added generation controls for:
  - `secondary_profile_id` + `secondary_weight` (2-voice blending)
  - `pitch_shift` (semitones)
  - `formant_shift` (spectral envelope/formant scaling)
- Backend applies blend + pitch/formant effects in generation pipeline.
- Frontend form payload/types/schemas updated to include these fields.

### New Saved Blend Recipes (Frontend Persisted)
- Added a persisted store for saved blend/effect presets:
  - file: `app/src/stores/blendPresetStore.ts`
  - stores up to 30 recipes in local storage (`voicebox-blend-presets`)
- Generation UI now supports:
  - selecting a saved recipe
  - saving current blend/effect setup
  - deleting selected recipe

### Generator Layout Change
- Moved generator box from bottom-floating position into a docked section directly under `Import Voice` / `Create Voice` on the main view.
- Stories route still uses floating behavior.

### Neumorphic Styling Pass
- Introduced neumorphic design tokens/utilities and applied them across core UI primitives.

## UX/Behavior Notes
- Generation form now preserves sculpting controls (`blend`, `pitch`, `formant`, `language`, `model`) after submit.
- Only `text`, `instruct`, and `seed` are cleared after successful generation.

## Verification Done
- Backend syntax check: `python -m compileall backend` (passed)
- Frontend build: `npm run build` in `app/` (passed)
- Runtime health:
  - frontend `http://127.0.0.1:4173/` reachable
  - backend `http://127.0.0.1:17493/health` healthy

## Known Caveats / Findings
- Do not commit local `.venv/`.
- `package-lock.json` exists locally from dependency install but is not required for Bun-based flow.
- App entrypoint under `app/` can show blank UI depending on platform provider assumptions; web entrypoint on `4173` was used for browser testing.

## Suggested Next Goals
1. Add real-time/preview FX audition loop (A/B and short loop region) before full generation.
2. Add macro controls for vocal tract shaping (e.g., age/size/breathiness) mapped to multiple DSP params.
3. Add automation lanes so pitch/formant can change over clip time, not just globally.
4. Optional: persist saved blend recipes server-side to share across devices/profiles.

## Commands Used Frequently
- Backend:
  - `./.venv/bin/python -m uvicorn backend.main:app --host 127.0.0.1 --port 17493`
- Frontend (web):
  - `~/.bun/bin/bun run dev -- --host 127.0.0.1 --port 4173`
