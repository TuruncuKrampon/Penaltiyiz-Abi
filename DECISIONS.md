# Decision Log

Non-obvious engineering decisions, newest last.

1. **Fonts via @fontsource instead of WebFontLoader + Google CDN.** The brief
   asked for WebFontLoader; self-hosted `@fontsource/archivo-black` and
   `@fontsource/space-grotesk` achieve the same guarantee (fonts ready before
   first render, enforced in PreloadScene via `document.fonts.load`) while
   removing the runtime CDN dependency — the game stays fully offline-capable
   and CSP-friendly. Turkish glyphs (İ Ş Ğ ı ş ğ) verified in both faces.

2. **Previous vanilla-JS prototype deleted, not archived.** The repo carried a
   canvas-2D prototype (index.html + js/*). Product direction changed to the
   Phaser brief; owner chose root install with deletion — history remains in git.

3. **Match settings via Phaser registry, not scene-init data chains.** Settings
   (mode, difficulty, skins) are written once by CharacterSelect and read by
   Match/Result through `game.registry`, so a scene can be restarted in
   isolation during development (`getMatchSettings` provides a sane default).

4. **Beşiktaş celebration kept from the original spec (owner request).** The
   `bw` skin's goals additionally show a "BABANIZ BEŞİKTAŞ ULAN!" speech bubble
   with layered audio fallback: `assets/babaniz-besiktas.mp3` → Turkish
   speechSynthesis (high rate/pitch) → bubble only. Strings in tr.ts.

5. **Toxic celebrations use sounds, not bubbles (owner request).** The 6 random
   goal celebrations play laugh variants (and a white-noise "şşşş" hush for the
   finger-on-lips one) instead of emoji speech bubbles.

6. **Assets under src/assets via import.meta.glob, not public/.** The manifest
   is discovered at build time, so a missing sprite never triggers a network
   request — no 404s, zero console errors, and the placeholder fallback kicks
   in deterministically. Adding a file just requires a rebuild (Cloudflare
   Pages rebuilds on every push, so contributors only ever "add file + push").
   `tools/slice.py` writes directly into `src/assets/chars/<skin>/`.

7. **All SFX synthesized with WebAudio, zero shipped audio files.** Laughs are
   sawtooth "ha" bursts with formant-ish noise, the hush is band-passed noise,
   crowd is filtered looping noise with an LFO. Keeps payload at 0 bytes for
   audio and sidesteps CC0 sourcing entirely. The only optional audio file is
   the user-supplied `src/assets/audio/babaniz-besiktas.mp3`.

8. **Freeze-frame/slow-mo via scene.tweens.timeScale + scene.time.timeScale**
   driven by real-time `setTimeout`s, so the effect that manipulates game time
   is itself immune to it. `prefers-reduced-motion` disables freeze, shake and
   slow-mo entirely.
