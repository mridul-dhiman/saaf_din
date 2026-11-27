# Demo video recorder

Records the captioned demo walkthrough in `docs/VIDEO_SCRIPT.md` against the live site (https://saaf-din.web.app) in headless Chromium.

- `record.js` drives the app like a user: live typing, edge cases, every screen. It captures 1920×1080 frames through the DevTools screencast and draws the captions and a visible cursor inside the page.
- `build.js` turns the frames into `out/saafdin-demo.mp4` (H.264, 30 fps) and `out/saafdin-demo.srt`. Waits for network and Gemini are fast-forwarded 6×. The whole cut plays at `SPEED` (default 1.1) so it stays under 4 minutes.
- Captions follow what actually happens. The recorder watches the real Gemini (Firebase AI Logic) responses and the plan badge. When Gemini answers, the captions say "This is Gemini". When it doesn't, they say the app fell back, and why.

```bash
cd scripts/demo-video
node record.js
SPEED=1.18 node build.js
```

Needs Playwright with Chromium, plus ffmpeg.

`common.js`: if Open-Meteo's weather endpoint answers 429 (shared IP over its daily quota), a real response saved earlier for the same coordinates is served from `.weather-cache/` (gitignored), if one exists.

Photos (CC0, Wikimedia Commons): `photos/kitchen.jpg` is "Blue white kitchen interior (Unsplash)". `photos/not-a-room.jpg` is "Piece of chocolate cake on a white plate decorated with chocolate sauce".
