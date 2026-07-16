# TURUNCU KRAMPON — Architecture & Milestones

## Architecture

- **Stack**: Phaser 3 + TypeScript + Vite. Static build (`dist/`) deploys as-is to Cloudflare Pages.
- **Resolution**: 1280x720 base, `Scale.FIT` + `CENTER_BOTH`, landscape-first.
- **Scenes** (`src/scenes/`): Boot → Preload → MainMenu → CharacterSelect → Match → Result.
- **Config discipline**:
  - `src/config/balance.ts` — every gameplay tunable (probabilities, timings, sizes, weights). No magic numbers in scene code.
  - `src/config/tr.ts` — every user-facing string (Turkish). English swap = provide a file with the same shape.
  - `src/config/theme.ts` — color/font/dimension tokens.
- **Systems** (`src/systems/`):
  - `rng.ts` — seedable mulberry32 RNG (`?seed=` for reproducible matches).
  - `settings.ts` — match settings passed via Phaser registry; localStorage for difficulty + vs-CPU streak.
  - `debug.ts` — `?debug=1` FPS overlay + 3x2 zone grid.
  - (M1) `shootout.ts` — pure match-state engine: turn order, early termination, sudden death.
  - (M2) `assets.ts` — manifest loader with capsule-placeholder fallback.
  - (M3) `audio.ts`, `juice.ts`, `celebrations.ts`.
- **UI** (`src/ui/`): shared tweened button; later scoreboard, announcer.
- **Asset pipeline**: `tools/slice.py` turns AI-generated character sheets into manifest-named sprites (rembg background removal, gap-split, trim, 1024px normalize).

## Milestones

- **M0 — Scaffold** ✅ (this commit): Vite+TS+Phaser boots, scene routing, FIT scaling, fonts (self-hosted), debug overlay, config skeletons.
- **M1 — Gray-box**: ENTIRE loop playable with shapes only. 5-phase kick (aim X → aim Y → power → run-up/keeper commit → resolve), real shootout rules (early termination, sudden death), hot-seat hand-over screen, vs CPU (3 difficulties, seeded RNG), all numbers from balance.ts. Feel is tuned here first.
- **M2 — Assets**: manifest + placeholder fallback (game must run with zero PNGs), `tools/slice.py`, sprite integration, run cycle, dive mirroring, in-engine shadows, stadium background.
- **M3 — Juice**: freeze-frame, shake, slow-mo, ball trail, confetti, net ripple, audio (<1.5MB), announcer slams, 6 toxic goal celebrations with laugh/hush sounds (no speech bubbles), keeper sad reaction, Beşiktaş special celebration (speech bubble + mp3 → TTS fallback), `prefers-reduced-motion`.
- **M4 — Ship**: mobile touch layer, portrait letterbox, payload audit (<8MB), README (asset pipeline usage, Cloudflare Pages deploy, mp3 drop-in), acceptance pass.

## Acceptance criteria (from brief)

- `npm run dev` menu < 3s; `npm run build` works.
- Full best-of-5 + sudden death completes in BOTH modes, zero console errors.
- Deleting any sprite PNG → placeholders, no crash.
- 60fps desktop / 45fps mid-range phone; payload < 8MB.
- Tuning = balance.ts only; strings = tr.ts only; Turkish glyphs correct.

## Out of scope (v2)

Online multiplayer, tournaments, additional skins, replay export.
