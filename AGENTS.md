# AGENTS.md

## Project Mission
Build a **GitHub Pages-compatible static web app** for **English pronunciation practice and dictation**.

## Phase 1 Scope (Required)
- Deliver a **frontend-only** application.
- Hostable as a **static site on GitHub Pages**.
- Tech stack limited to:
  - HTML
  - CSS
  - Vanilla JavaScript
- No backend services in phase 1.

## Technical Constraints (Must Follow)
1. **Static-only architecture**
   - Do not introduce server-side code, server runtime, or deployment requirements beyond static hosting.
   - Do not depend on API keys or paid cloud services for phase 1 core functionality.

2. **OCR in browser**
   - OCR must execute entirely in the browser (client-side).
   - Keep OCR integration compatible with static hosting (no proxy/backend).

3. **TTS in browser (phase 1)**
   - Use the browser **Web Speech API** only.
   - No external TTS APIs in phase 1.
   - Encapsulate TTS logic behind a simple abstraction layer so it can be replaced in phase 2 with a premium API.

4. **No build step**
   - The app must run without bundlers or transpilers.
   - Keep source files directly usable by a static server.

5. **Mobile-first UI/UX**
   - Design and style for small screens first.
   - Ensure clean, readable Korean-friendly UX copy/text.

6. **Code quality**
   - Keep files and logic simple, readable, and maintainable.
   - Prefer small modules/files with clear responsibilities.

## Required User Flows (Definition of Done)
The implementation is complete only when all flows below work:

1. **Local static run**
   - App runs locally via `index.html` served by a simple static server.

2. **Input methods**
   - User can paste text.
   - User can type text.
   - User can upload an image.

3. **OCR flow**
   - Uploaded image is processed in browser.
   - OCR result text is extracted and available for playback/dictation.

4. **Playback modes**
   - Word-by-word speech playback.
   - Sentence-by-sentence speech playback.

5. **Dictation mode**
   - Supports configurable repeat count.
   - Supports configurable pause length.

6. **Documentation**
   - `README.md` explains:
     - local run instructions
     - GitHub Pages deployment instructions

## Architecture Guidance
- Keep app structure static-site friendly, e.g.:
  - `index.html`
  - `styles.css`
  - `app.js`
  - optional small modules under `js/`
- Create a TTS interface boundary (example concept):
  - `ttsEngine.speak(text, options)`
  - current implementation: Web Speech API adapter
  - future implementation: premium API adapter

## Non-Goals for Phase 1
- Authentication, accounts, or sync.
- Server-side processing.
- Complex build tooling.
- Non-browser TTS services.

## Acceptance Checklist
Before considering a task done, verify:
- [ ] Works on a static server with no backend.
- [ ] OCR runs in browser.
- [ ] Web Speech API is the only TTS backend in use.
- [ ] TTS code is abstracted for future replacement.
- [ ] Mobile-first layout is usable.
- [ ] Korean-friendly UX copy is clear and natural.
- [ ] README includes local + GitHub Pages deployment steps.
