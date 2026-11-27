# SaafDin: Urban Air Quality Assistant

Hackathon entry for PromptWars Virtual, Main Challenge 06. A web-first GenAI assistant that turns the hourly air quality forecast into a personalised daily plan for a household, and shows the impact of every suggested choice.

The brief, verbatim: "Create a GenAI-powered assistant that suggests low-emission daily routines, indoor air quality hacks, and sustainable alternatives tailored to a user's location and lifestyle, while clearly explaining the direct impact of their choices."

Read these before building:
- `docs/PROGRESS.md`: **start here.** Current state, live-site blockers, setup on a new machine, next steps.
- `docs/HANDOFF.md`: scope, screen-by-screen spec, data model, AI contracts, build order.
- `docs/IMPACT_MODEL.md`: the formulas and constants behind every number shown in the UI.
- `design/v2/stitch_saafdin_air_quality_assistant/`: the revised Stitch export and the primary design reference. One folder per screen with `code.html` and `screen.png`.
- `design/stitch_saafdin_air_quality_assistant/`: the first export. Use only for the mobile layouts missing from v2. `docs/HANDOFF.md` section 3 maps routes to mockups.

## Status

SaafDin is built across Phases 1 through 5 as a client-side React + Vite web application:
- **Core Engine (`src/lib/impact`, `src/lib/aqi`)**: Deterministic calculations of inhaled PM2.5 dose, travel CO₂ differences, cigarette equivalence (Berkeley Earth), multi-member household action distribution, air purifier electrical grid carbon cost, and daytime rolling ventilation window detection (06:00–22:00 window search, ≤ 150 µg/m³ threshold). 50 unit tests in Vitest.
- **Model Integration (`src/services/gemini.ts`, `src/lib/ai`)**: Central Gemini service via Firebase AI Logic (`gemini-2.5-flash`) on the Firebase Spark plan with pure schema validators (`validatePlan`, `validateRoomFindings`, `validateAssistantReply`, `containsQuantity`). Gemini never generates numbers; all quantities originate from the impact model.
- **Responsive Web UI (`src/app`, `src/features`, `src/components`)**: Responsive shell (desktop sidebar ≥ 1024px, mobile bottom tab bar < 1024px) covering Today (hero AQI, 24h strip, timeline, receipts, family cards), Swaps (catalogue, habit adoption), Simulator (what-if scenarios, comparative verdict), Room Scan (multimodal vision markers), Assistant (profile-grounded chat), Onboarding (3 steps, GPS geocoding, demo household), and How We Calculate (transparent equations and constants table).
- **Persistence & Localization (`src/services/firebase.ts`, `src/i18n`)**: LocalStorage caching with offline resilience, Anonymous Firebase Auth + Firestore sync (`users/{uid}`), and full English and Hindi localization with instant header toggle.

### Known Gaps
1. **Unverified Constants**: Except for Berkeley Earth cigarette equivalence (confirmed in Muller & Muller 2015), the remaining constants in `src/lib/impact/constants.ts` (penetration factors F_env and F_mask, inhalation rates IR, mode emission factors EF, urban travel speeds, purifier wattage, grid carbon intensity, and school run distance) are literature-based defaults or assumptions marked "assumption, not verified".
2. **Forecast Model Initialization Timestamp**: Open-Meteo Air Quality API returns generation compute time in ms (`generationtime_ms`) but does not expose model run initialization timestamps. Forecast time is labeled as "fetched at".
3. **Indoor Telemetry Limitation**: No domestic indoor sensor or IoT hardware exists; indoor actions rely on infiltration and ventilation math rather than live room telemetry.

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
