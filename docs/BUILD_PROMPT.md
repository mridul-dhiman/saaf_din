Build SaafDin, a web-first air quality assistant for a hackathon. The repo has no code yet, only design exports and docs.

Before writing anything, read in this order:
1. AGENTS.md (stack, rules, conventions)
2. docs/HANDOFF.md (scope, screen map, cut list, data model, AI contract, build order)
3. docs/IMPACT_MODEL.md (formulas and constants for every number in the UI)
4. The screenshots in design/v2/stitch_saafdin_air_quality_assistant/ (primary), and design/stitch_saafdin_air_quality_assistant/ for mobile layouts only

Then follow the build order in HANDOFF.md section 9, step by step:
1. Scaffold React + Vite + TypeScript with Tailwind installed as a dependency. Copy the tailwind.config tokens from any code.html. Add Plus Jakarta Sans, Inter and Material Symbols.
2. Build the responsive shell (sidebar at lg and above, bottom tabs below) with six empty routes: /onboarding, /today, /swaps, /simulator, /room-scan, /assistant.
3. Write src/lib/aqi and src/lib/impact as pure functions with Vitest tests, starting from the test list in IMPACT_MODEL.md section 7.
4. Write the forecast service behind the ForecastProvider interface and render the Today banner and a 24-bar hourly strip from live data.
5. Build the three-step onboarding wizard, anonymous auth, profile storage in Firestore, and security rules limiting each user to their own documents.
6. Build a rule-based daily plan on Today with computed impact receipts. This stays as the fallback.
7. Add Gemini plan generation through Firebase AI Logic with a response schema, validation, one retry, then fallback to the rule-based plan.
8. Build Swaps, then the What-if simulator.
9. Build Room scan, then the Assistant chat.
10. Add the Hindi strings, the demo household, and polish.

Hard rules:
- Google only for AI generation and deployment: Gemini through Firebase AI Logic, and Firebase Hosting. No other AI provider or host. Put forecast data behind the ForecastProvider interface described in HANDOFF.md section 5, with Open-Meteo as the default.
- The model never produces numbers. Every figure shown comes from src/lib/impact. If a number cannot be computed, show nothing.
- Nothing from the cut list in HANDOFF.md section 4 may appear, and fix every v2 defect listed in section 3. Mock copy and mock numbers are placeholders, not content.
- Build the Today top banner and the 24-hour chart from scratch; both are broken in the mockups.
- Free Firebase Spark plan only: no Cloud Functions, no App Hosting, no server code, no secret keys in the client.
- No Tailwind CDN script and no hotlinked images.
- Look up the current Firebase AI Logic SDK import path and Gemini model name in the Firebase docs, and check the Open-Meteo parameter names against its docs. Do not trust the versions written in the handoff from memory.

Working method:
- After each numbered step, run the tests and the build, and tell me what works and what does not before moving on.
- Stop and ask me when you need something only I can do: creating the Firebase project, enabling Anonymous Auth, Firestore and AI Logic in the console, running firebase login, and deploying.
- Once the project is scaffolded, fill in the Commands section of AGENTS.md.
- Check each screen at 360 px and 1280 px wide.

Start with steps 1 to 3 and report back.
