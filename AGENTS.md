# SaafDin: Urban Air Quality Assistant

Hackathon entry for PromptWars Virtual, Main Challenge 06. A web-first GenAI assistant that turns the hourly air quality forecast into a personalised daily plan for a household, and shows the impact of every suggested choice.

The brief, verbatim: "Create a GenAI-powered assistant that suggests low-emission daily routines, indoor air quality hacks, and sustainable alternatives tailored to a user's location and lifestyle, while clearly explaining the direct impact of their choices."

Read these before building:
- `docs/HANDOFF.md`: scope, screen-by-screen spec, data model, AI contracts, build order.
- `docs/IMPACT_MODEL.md`: the formulas and constants behind every number shown in the UI.
- `design/v2/stitch_saafdin_air_quality_assistant/`: the revised Stitch export and the primary design reference. One folder per screen with `code.html` and `screen.png`.
- `design/stitch_saafdin_air_quality_assistant/`: the first export. Use only for the mobile layouts missing from v2. `docs/HANDOFF.md` section 3 maps routes to mockups.

## Status

Complete application built across Phases 1 through 5, fully tested, and production-ready:

1. **Impact & AQI Engine (`src/lib/impact`, `src/lib/aqi`)**:
   - Pure, deterministic calculation of inhaled PM2.5 particulate dose integrating hourly outdoor concentration ($C_{\text{out}}$), environment penetration ($F_{\text{env}}$), mask filtration ($F_{\text{mask}}$), volumetric inhalation rates ($\text{IR}$ by age and activity intensity), and duration ($\Delta t$).
   - Travel $\text{CO}_2$ emissions differential based on mode-specific emission factors and distance.
   - Berkeley Earth cigarette equivalence model ($22\,\mu\text{g/m}^3 \times 24\,\text{h} = 1\,\text{cigarette}$ avoided).
   - Household action multi-member distribution, air purifier electrical grid carbon cost, and 24-hour rolling ventilation window detection (06:00–22:00 window search with $\le 150\,\mu\text{g/m}^3$ threshold).
   - Fully unit-tested with Vitest (49 passing test cases).

2. **Model Integration & Guardrails (`src/services/gemini.ts`, `src/lib/ai`)**:
   - Google Gemini via Firebase AI Logic (`gemini-2.5-flash`) on the Firebase Spark plan.
   - Centralized service module with strict response schemas and pure validators (`validatePlan`, `validateRoomFindings`, `validateAssistantReply`, `containsQuantity`).
   - Hard architectural rule enforced: **Gemini never generates numerical estimates**; all quantities on screen originate from `src/lib/impact`.

3. **Responsive Client & UI (`src/app`, `src/features`, `src/components`)**:
   - Unified responsive layout (sidebar on desktop $\ge 1024\,\text{px}$, bottom navigation bar on mobile $< 1024\,\text{px}$).
   - **Today**: Hero US AQI banner with source and timestamp, 24h hourly PM2.5 strip, interactive daily action timeline with clickable calculation receipt modals, family cards with routines, and impact summary ring.
   - **Swaps**: Filterable clean habit alternative catalogue scored against live forecast, active habit adoption, and weekly dividends tracker.
   - **Simulator**: Interactive what-if scenario modeller for activity, time slot, and member, with baseline vs. alternative dose comparison and single-action verdict.
   - **Room Scan**: Multimodal Gemini vision screening with sample demo, 1:1 marker-to-recommendation mapping, and high/medium/low impact banding.
   - **Assistant**: Conversational interface with profile-grounded suggested questions, non-medical screening disclaimer, and action adoption.
   - **Onboarding**: 3-step setup (neighborhood geocoding with GPS, household members with routines, commute/cooking hours/school run), and a one-click "Try a demo household" link.
   - **How We Calculate**: Full transparency page listing governing formulas and dynamic constants table with exact source links and verification status.

4. **Persistence & Localization (`src/services/firebase.ts`, `src/i18n`)**:
   - LocalStorage-first resilience with offline fallback displaying cache timestamps.
   - Anonymous Firebase authentication and Firestore syncing for profiles (`users/{uid}`), daily plans (`users/{uid}/plans/{date}`), and swaps (`users/{uid}/swaps/{swapId}`).
   - Comprehensive English and Hindi localization with instant header toggle; Western Arabic numerals `0–9` preserved across both languages.
   - Strict cut-list enforcement: zero invented telemetry, zero fake sensors, zero medical diagnoses.

## Stack

- React + Vite + TypeScript, Tailwind CSS installed as a dependency (the mockups use the CDN build; do not ship that).
- React Router, client-side only. No server code of any kind.
- Firebase on the free Spark plan: Hosting, Firestore, Anonymous Auth, and Firebase AI Logic (Gemini Developer API backend) called from the browser.
- Open-Meteo for air quality, weather and geocoding. No API key.
- Vitest for unit tests on `src/lib/impact`.

**Hackathon rule: Google only for AI generation and deployment.** All model calls go to Gemini through Firebase AI Logic, and the app is hosted on Firebase Hosting. Do not add any other AI provider, SDK or model, and do not deploy to any non-Google host (no Vercel, Netlify, GitHub Pages).

Open-Meteo is a data source, not AI or hosting. It sits behind a `ForecastProvider` interface in `src/services/forecast/` so it can be swapped for the Google Maps Platform Air Quality API without touching anything else. See `docs/HANDOFF.md` section 5.

Cloud Functions and Firebase App Hosting need the paid Blaze plan. Do not add them, and do not add any dependency that needs a server or a secret key in the client.

## Rules that are easy to get wrong

1. **The model never produces numbers.** Gemini chooses and explains actions and returns structured JSON. Every µg, kg CO2, percentage and cigarette-equivalent in the UI is computed in `src/lib/impact` from forecast data and the constants in `docs/IMPACT_MODEL.md`. If a number cannot be computed, show no number.
2. **Do not copy the mockups' fake telemetry.** In the first export Stitch invented connected purifiers, indoor sensors, smart-home automation, biometric readings, certifications, confidence scores and named data partners. None of that exists, and traces remain in v2. The full cut list is in `docs/HANDOFF.md`.
3. **Mock copy and mock numbers are placeholders.** Take layout, components and tone from the mockups; take content from live data and the profile.
4. **Design tokens come from the `tailwind.config` block inside each `code.html`**, not from the prose in `DESIGN.md`. Where they disagree (they do, on several hex values and on radii), the config wins because it is what the screenshots render.
5. **AQI colours are for air quality indicators only.** They never appear in navigation, buttons or other chrome.
6. **One responsive app, not two.** Desktop and mobile mockups are the same routes at different widths: sidebar at `lg` and above, bottom tab bar below.
7. **This is guidance, not medical advice.** No diagnoses, no clinical claims, and a short disclaimer on the assistant and onboarding screens.

## Conventions

- `src/lib/` holds pure, tested logic (impact maths, AQI banding, forecast windows). `src/services/` holds anything that does I/O (Open-Meteo, Firebase, Gemini). Components do neither.
- All Gemini calls go through one module that sets the response schema and validates the parsed result before it reaches a component.
- The app must work with the network calls failing: cache the last forecast and plan in `localStorage` and show them with their timestamp.
- User-facing strings live in one place so the Hindi toggle is a lookup, not a rewrite.

## Working in Antigravity

- This file is the project's rules file. `docs/BUILD_PROMPT.md` is the kickoff prompt for the first session.
- Produce an implementation plan for each build step and wait for approval before large changes; keep each step to the scope in `docs/HANDOFF.md` section 9.
- Use the built-in browser to check every screen at 360 px and 1280 px wide against the mockup screenshot, and to confirm that nothing from the cut list is on screen.
- Stop and ask the user for anything that needs their Google account: creating the Firebase project, enabling Anonymous Auth, Firestore and AI Logic, `firebase login`, and deploying.
- Do not edit anything under `design/`; it is reference material.

## Commands

- Dev server: `npm run dev`
- Run unit tests: `npm test`
- Build for production: `npm run build`
- Deploy to Firebase Hosting: `firebase deploy --only hosting`
