# SaafDin: Where We Are (session handoff)

Last updated: **2026-11-27**. Read this first when picking the project up on a new machine or in a new session. `docs/HANDOFF.md` is the product spec; this file is the current state and what to do next.

## TL;DR

- App is feature-complete (Phases 1–5) and deployed at **https://saaf-din.web.app**.
- **Blocker: Gemini does not run on the live site.** Two Firebase console settings are off (see "Blockers" below). Until they're fixed, every plan, room scan and assistant reply on the live site is a fallback or an error, and the Today screen shows **"Rule-based plan · Gemini unavailable"**.
- Remaining hackathon deliverable: **the demo video**. Script is in `docs/VIDEO_SCRIPT.md`; the submission guide's rules are summarised at the top of it.

## Set up on a new machine

```bash
git clone https://github.com/mridul-dhiman/saaf_din.git
cd saaf_din
npm install
npm test            # expect 50 passing
npm run dev         # http://localhost:5173

npm install -g firebase-tools
firebase login
firebase use saaf-din   # .firebaserc is gitignored, so this is needed once per machine
```

- No `.env` needed: the Firebase web config (including the public web API key) is in `src/services/firebase.ts`. That key is designed to be public; access is controlled by Firebase rules and console settings.
- Deploy: `npm run build && firebase deploy --only hosting` (hosting site `saaf-din`, serves `dist/`).
- Design zips (`*.zip`) are gitignored; the unzipped `design/` folders are committed.

## Blockers (need the Google account owner, in the Firebase console)

Found on 2026-11-27 by loading the live site with the demo household in headless Chromium:

1. **Firebase AI Logic is not enabled.** Console error: *"The Firebase AI SDK requires the Firebase AI API ('firebasevertexai.googleapis.com') to be enabled"* (HTTP 403).
   Fix: Firebase console → project `saaf-din` → **AI Logic** → Get started → choose the **Gemini Developer API** backend (Spark-compatible). Wait a few minutes for it to take effect.
2. **Anonymous Auth is not enabled.** Error `auth/configuration-not-found`.
   Fix: Firebase console → **Authentication** → Get started → Sign-in method → enable **Anonymous**.
3. **Firestore requests return HTTP 400.** Probably a knock-on effect of (2), or the Firestore database not being created yet. After fixing (2), check that Firestore → Database exists (Native mode), then deploy rules with `firebase deploy --only firestore:rules`.

**Verify:** open https://saaf-din.web.app in an incognito window → *Try a demo household* → the badge next to "Action Plan for Today" should go from *Asking Gemini…* to **Planned by Gemini**. No code change or redeploy is needed for (1) and (2).

## Recent work (newest first)

- `9afff5c` (on `main`, pushed, deployed): **Plan-source badge** on Today (*Asking Gemini…* / *Planned by Gemini* / *Rule-based plan · Gemini unavailable*), in English and Hindi. It also fixed two bugs:
  - the plan cache key ignored adopted swaps, so adopting a swap never re-planned;
  - Today passed swap **ids** to Gemini, so the prompt contained empty swap objects. It now passes the full `HABIT_SWAPS` records.
  - Also added `docs/VIDEO_SCRIPT.md`.
- `c815ed0` and earlier: Phases 1–5 and review fixes; see `git log`.

## Next steps

1. Fix the three console blockers above, then verify the badge says **Planned by Gemini**.
2. Smoke-test the live Gemini paths: plan, Room Scan with a real photo (not "Try with Sample Room", which is a labelled canned example), and Assistant in English and Hindi.
3. Check the two script moments that haven't been run yet: what a nonsense location search (`xqzvv`) shows in onboarding, and that the Today plan visibly changes after adopting *Car → Metro* in Swaps.
4. Record the video following `docs/VIDEO_SCRIPT.md` (under 4 min), upload as unlisted YouTube or public Drive, test the link in incognito, and submit.

## Known gaps (unchanged, also in AGENTS.md)

- Most constants in `src/lib/impact/constants.ts` are literature defaults marked "assumption, not verified" (only the Berkeley Earth cigarette equivalence is confirmed).
- Open-Meteo has no model-run timestamp, so the UI shows "fetched at".
- No indoor sensors; indoor advice is infiltration and ventilation maths.
- Build warns about a large JS chunk (>500 kB). This is harmless but could be code-split if time allows.
