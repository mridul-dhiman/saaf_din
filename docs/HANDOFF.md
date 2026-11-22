# SaafDin handoff

This document is for whoever builds the app next, human or agent. It assumes you have read `AGENTS.md` and have the Stitch exports open under `design/`.

## 1. What we are building

A household sets up a profile once: where they live, who lives there, how they commute and cook. Each day the app fetches the hourly air quality forecast for their location and produces a short, time-stamped plan: when to ventilate, when to exercise, how to commute, what to change in the kitchen. Every action carries an "impact receipt" with two figures: PM2.5 exposure avoided and CO2 emissions saved.

The receipts are the differentiator. Most entries for this challenge will be a chatbot over an AQI number. Ours shows what each choice is worth, and the figures come from documented formulas rather than from the model.

What judges should see in a two-minute demo:
1. Onboarding for a family with a child and a grandparent.
2. The Today screen filling with a plan built from the live forecast for that location.
3. One receipt opened to show how its numbers were calculated.
4. A what-if comparison (car at 8:30 am versus metro at 9:15 am).
5. A room photo analysed into a list of fixes.

## 2. Scope

| Priority | Feature | Notes |
|---|---|---|
| P0 | App shell, design tokens, routing | Sidebar on desktop, bottom tabs on mobile |
| P0 | Onboarding and profile storage | Three steps |
| P0 | Forecast fetch and AQI banding | Open-Meteo |
| P0 | Impact library with unit tests | See `IMPACT_MODEL.md` |
| P0 | Today screen with generated plan and receipts | The core of the product |
| P1 | Swaps | Mostly deterministic; Gemini only ranks and words them |
| P1 | What-if simulator | Fully deterministic except the one-sentence verdict |
| P2 | Room scan | Multimodal Gemini call |
| P2 | Assistant chat | Grounded in profile and forecast |
| P2 | Hindi toggle, voice input, share card | Only if time allows |

Deploy to Firebase Hosting as soon as the shell exists, and redeploy after each feature. A working P0 that is live beats a half-finished P2.

## 3. The Stitch exports

There are two exports. Use the second as the primary reference.

- `design/v2/stitch_saafdin_air_quality_assistant/` (20 Nov): the revised round. Six desktop screens plus the mobile Today screen. Most of the invented telemetry has been removed here.
- `design/stitch_saafdin_air_quality_assistant/` (19 Nov): the first round. Use it only for the mobile layouts that v2 does not include, and apply the cut list in section 4 to anything taken from it.

| Route | Desktop mockup (v2) | Mobile mockup |
|---|---|---|
| `/onboarding` | `onboarding_household_air_profile` | v1: `onboarding_step_1_location`, `onboarding_step_2_family_shield`, `onboarding_step_3_daily_habits` |
| `/today` | `today_dashboard_daily_action_plan` | v2: `today_dashboard_mobile` |
| `/swaps` | `swaps_clean_habit_alternatives` | v1: `habit_swaps_mobile` |
| `/simulator` | `what_if_simulator` | v1: `what_if_simulator_mobile` |
| `/room-scan` | `room_scan_indoor_audit_fixes` | v1: `room_scan_mobile` |
| `/assistant` | `air_assistant_clean_air_chat` | v1: `air_assistant_mobile` |

How to use them:
- Each `code.html` is static Tailwind markup. Port the structure and classes into React components; do not embed the HTML files.
- Copy the `tailwind.config` object from any `code.html` into the project's Tailwind config. It is identical across screens and both exports, and is the source of truth for colours, type scale, spacing and radii.
- Fonts are Plus Jakarta Sans (headings, numerals, labels) and Inter (body). Icons are Material Symbols Outlined.
- Onboarding is a three-step wizard showing one step at a time. The v2 desktop mockup has the right fields but still shows all three steps on one page; the v1 mobile screens show the intended flow.

### What v2 got right

Take these as designed: the "Forecast: Open-Meteo · updated" source line, the "US AQI" label, "Profile" in the nav, the text wordmark and initials avatars, checkboxes and receipt pills on every plan card, the "Today's impact" card with its "How this is calculated" link, the onboarding fields and "Try a demo household" link, the swap cards (down arrow, full-width text, "Removes a flame from your kitchen" in place of a CO2 figure on the cooking swap), the two-bar simulator comparison, the room scan impact and cost chips with the "Based on what is visible in the photo" line, and the simplified assistant with "Add to my plan" buttons and the disclaimer.

### Defects still in v2, to fix in code

All screens:
- Images are still hotlinked from `lh3.googleusercontent.com`, and the onboarding and simulator screens still use the broken logo image. Use the text wordmark everywhere and ship no remote images.

Today, desktop:
- **The 24-hour chart is still broken** (a column of hour labels over a collapsed plot). Stitch has failed at this twice; build it from scratch as a row of 24 colour-banded bars with the best and worst windows bracketed. The v2 mobile "Ventilation Forecast" strip is the nearest reference.
- **The top banner is broken in a new way.** A second copy of "Today's impact", the family cards and the assistant button has been dropped into it, overlapping the summary, and the large AQI number is gone. Build the banner as: large AQI number, band label, one-line summary, then the row of PM2.5, PM10, temperature, humidity and wind tiles. Impact and family cards appear once, in the side column.
- Replace jargon headings: "24-Hour Predictive Dispatch" and "Atmospheric boundary dispersion curve" become "Next 24 hours"; "Meteorological Diagnostic · Urgent" becomes a plain summary line.
- Remove the subtitle "Synchronized with real-time Delhi sensor stations".

Today, mobile:
- Rename "Family Guard Shield" to "Family".
- "12.5x WHO safe limit" is only acceptable if computed against a stated guideline value; otherwise remove.

Swaps:
- Hide the CO2 tile when the saving is zero ("0.0 kg" on the fitness swap) rather than showing it.
- Drop "vetted" and "View Detailed Audit"; the weekly banner links to the calculation explainer instead.

Simulator:
- Remove "COPD Profile" from the member selector; members show tags only.
- Remove "Safe baseline: <15 µg" and "9.4x Over WHO Limit". They compare an inhaled mass with a concentration guideline, which is a unit error.
- The verdict banner has a stray second "Add to my plan" squeezed beside its icon. One button only.
- Plain labels: "Filtered Transit", "Active Sanctuary Strategy" and "toxic" go.

Room scan:
- The mockup shows the upload state and the results state stacked. They are separate states.
- The photo has four markers but the list has three fixes. Markers and list items must match one to one.
- Remove "Infiltration Depth: High", "3 Critical Leaks & 1 Stagnant Pocket Identified", "Interactive Nodes" and false precision such as "8mm brush seal".

Assistant:
- "Dadi (COPD Stage 1)" survives in an advisory heading. Remove it.
- The receipt still pairs "68 µg" with "1.2 cigarettes". Receipts in chat come from the impact library like any other; cigarette equivalents appear only in daily and weekly totals.
- Remove "Instant Insights" and "Switch Profile".

## 4. Cut list: things in the mockups that must not ship

Stitch filled the first export with plausible-sounding detail that we cannot back. Shipping any of it would mislead users and will not survive a judge's question. The second export removed most of it, but this list stays authoritative: it applies in full to the v1 mobile screens and to any generated copy.

| In the mockups | Do instead |
|---|---|
| "2 Purifiers Connected", "Filter 84%", purifier model names, "Boost Speed", "Automated" actions, "Smart Home Sync", "Sensor Kitchen Hub" | The profile records only whether the household owns a purifier. Actions say "run your purifier on high"; the user ticks them off. |
| Indoor AQI readings ("Bedroom AQI 38", "Indoor AQI currently 28", "Baseline 84 µg/m³") | We have no indoor sensor. Show an estimated indoor level derived from outdoor PM2.5 and an infiltration factor, labelled "estimated". |
| "Oxygen Sat 98%", biometric alerts, "COPD Stage 1", "Asthma Alert Active" | Profile holds self-declared sensitivity tags only (child, elderly, asthma, pregnant). No diagnoses or vitals. |
| "Clinical Protocol v4.2", "Atmospheric Model v3.4", "AI Vision Sensor V2.4", "Pediatric Bronchial Safety certified", "Zero Alarmist Noise Guarantee" | Delete. |
| "Confidence: 98.4% (based on 14 local sensors)", "Sensor Lag: 42s" | Delete. Show the data source and the forecast timestamp instead. |
| "Station: South Ext II (0.8 km away)", "Delhi CPCB Sync", "Calibrated with IIT-Delhi", "SAFAR reference", "MODIS_TERRA_AOD" | Open-Meteo serves modelled grid data, not station readings. Say "Forecast: Open-Meteo (CAMS)" with the update time. |
| "Corridor Real-Time Cam", "Ultrafine Black Carbon Soot Count" | Delete the camera panel and that chart row. Keep PM2.5 and CO2 only. |
| "Encrypted Domestic Health Telemetry" | Delete. If privacy needs a line, say the profile is stored in the user's own Firebase record. |
| Product links and prices ("View ₹299 DIY Seal Strip") | Delete. No shopping links. |
| "I will push a phone ping automatically", "Set 30m Timer", auto-reminders | No push notifications in scope. A timer can be a simple in-page countdown, or drop it. |
| Room scan precise drops ("-28 µg/m³ (-33%)") and "WHO Safe" projection | A photo cannot measure PM2.5. Show an impact band (high, medium, low) per fix. See section 7. |
| Hard-coded figures everywhere ("2.4 cigarettes", "68% shield score", "431 µg/day") | Compute from the impact library, or omit. "Shield score" has no definition; either define it as the share of today's avoidable exposure actually avoided, or drop the ring. |
| Alarming medical language ("Severe Lung Stress Index", "alveolar soot", "bronchial tract shielded") | Plain language: "high exposure", "much lower exposure". |

Things in the mockups that are good and should be kept: the impact receipt pills on every action, the best and worst window callouts, the per-member family cards, the usual-versus-alternative comparison layout, numbered markers on the room photo, the suggested-question chips, the English/Hindi toggle, and the India-specific swaps (puja incense, tadka, auto-rickshaw school run, winter wood fires).

## 5. Architecture

```
src/
  app/            router, shell (sidebar, bottom tabs, top bar)
  features/
    onboarding/
    today/
    swaps/
    simulator/
    room-scan/
    assistant/
  components/     shared UI: Card, StatPill, AqiBadge, ImpactReceipt, HourlyStrip
  lib/
    impact/       exposure, emissions, cigarette equivalents (pure, tested)
    aqi/          banding, colour lookup, best/worst window detection
  services/
    openMeteo.ts  forecast, weather, geocoding
    firebase.ts   app init, anonymous auth, Firestore helpers
    gemini.ts     the only module that talks to the model
  i18n/           en.ts, hi.ts
```

### Google-only rule

The hackathon requires Google services for AI generation and for deployment. Gemini through Firebase AI Logic and Firebase Hosting satisfy both; nothing else may be used for either.

Forecast data is a separate question. Put it behind an interface so the source is a one-file decision:

```ts
interface ForecastProvider {
  getHourly(lat: number, lon: number): Promise<HourlyForecast>;   // PM2.5, PM10, AQI per hour
  searchPlaces(query: string): Promise<Place[]>;
}
```

- `openMeteoProvider` is the default: free, no key, no billing account.
- `googleProvider` is the all-Google alternative: the Maps Platform Air Quality API (current conditions and hourly forecast) with the Geocoding or Places API for city search. It needs a Google Cloud billing account attached to the project, even to stay within the free monthly allowance, and an API key that ships in the client, so restrict the key by HTTP referrer and by API. Check current quotas, forecast horizon and India coverage in the Maps Platform docs before committing to it. If this provider is used, the source line in the UI reads "Forecast: Google Air Quality API" and the AQI label follows whichever index is requested.

### External data: Open-Meteo

No key, CORS enabled, free for non-commercial use.

- Air quality: `https://air-quality-api.open-meteo.com/v1/air-quality?latitude={lat}&longitude={lon}&hourly=pm2_5,pm10,us_aqi,nitrogen_dioxide&timezone=auto&forecast_days=2`
- Weather: `https://api.open-meteo.com/v1/forecast?latitude={lat}&longitude={lon}&hourly=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto&forecast_days=2`
- Geocoding for the onboarding city search: `https://geocoding-api.open-meteo.com/v1/search?name={query}&count=5`

Check the parameter names against the Open-Meteo docs when you wire this up; they are written from memory.

The data is a modelled grid of roughly 10 km resolution, so it will not distinguish neighbourhoods within a city. Do not imply that it does.

**AQI scale.** Open-Meteo returns US AQI, and the design's colour bands follow the US breakpoints (0–50, 51–100, 101–150, 151–200, 201–300, 301+). Use US AQI and label it as such in the UI. Indian users are used to CPCB numbers, which differ; converting is a possible later addition but not needed for the demo. All impact maths uses raw PM2.5 in µg/m³, never the AQI index.

### Firebase

- **Auth**: sign in anonymously on first load.
- **Firestore**:
  - `users/{uid}`: the profile (below).
  - `users/{uid}/plans/{yyyy-mm-dd}`: the generated plan and which actions are ticked.
  - `users/{uid}/swaps/{swapId}`: swaps the user adopted.
- **Rules**: a user can read and write only under their own `users/{uid}`. Write these before the first deploy; the default test-mode rules expire and are open to everyone.
- **AI Logic**: initialise with the Gemini Developer API backend and a current Flash-class model. Look up the current model name and SDK import path in the Firebase AI Logic docs rather than trusting an older snippet, and enable the API in the Firebase console first. The free tier is rate-limited, so cache plans per day and never regenerate on every render.

### Profile shape

```ts
type Sensitivity = 'child' | 'elderly' | 'asthma' | 'pregnant';

interface Member {
  id: string;
  name: string;
  ageGroup: 'child' | 'adult' | 'elderly';
  sensitivities: Sensitivity[];
  routine?: { label: string; start: string; end: string; outdoors: boolean; intensity: Intensity };
}

interface Profile {
  location: { name: string; lat: number; lon: number };
  members: Member[];
  commute: { mode: TravelMode; distanceKm: number; departs: string; returns: string };
  cookingFuel: 'lpg' | 'png' | 'induction' | 'biomass';
  hasExhaust: boolean;
  hasPurifier: boolean;
  language: 'en' | 'hi';
}
```

`Intensity` and `TravelMode` are defined in `IMPACT_MODEL.md`.

## 6. The AI contract

The rule from `AGENTS.md` bears repeating: the model selects and explains; code calculates. This is what makes the numbers defensible, and it also makes the plan cheap to regenerate.

### Plan generation

Input to the model: the profile, the next 24 hours of PM2.5 and weather, the best and worst windows already computed by `lib/aqi`, and the catalogue of action types it may choose from.

Output, enforced with a response schema:

```ts
interface PlannedAction {
  type: ActionType;          // from a fixed enum, see below
  memberId: string | null;   // who it is for, or null for the household
  start: string;             // "14:00", local time
  end: string;
  title: string;             // short imperative, under 60 characters
  reason: string;            // one sentence in plain language, no figures
  params: Record<string, string | number>;  // inputs the impact function needs
}
```

`ActionType` enum for the first version: `ventilate`, `keep_closed`, `run_purifier`, `shift_outdoor_activity`, `move_activity_indoors`, `wear_mask`, `change_commute_mode`, `shift_commute_time`, `use_exhaust_while_cooking`, `avoid_indoor_combustion`.

Each type maps to one function in `lib/impact` that takes the action, the forecast and the profile and returns `{ exposureAvoidedUg: number | null, co2SavedKg: number | null }`. A `null` renders as no pill, not as a dash or a zero.

Instruct the model explicitly not to put numbers in `title` or `reason`, and strip or reject responses that contain them. Validate the parsed JSON (types, enum membership, times inside the forecast range, `memberId` exists) before it reaches the UI. On a failed validation, retry once, then fall back to a rule-based plan built from the best and worst windows so the Today screen is never empty.

### Swaps

A static catalogue in code: each swap has a "from" habit, a "to" habit, a category, a difficulty and the impact function that scores it. Filter by profile (no "switch to metro" for someone who already takes it), compute the receipts, sort by impact. Gemini's only job, if used at all, is to write the one-line reason in the user's language.

### Simulator

No model call for the comparison. Two scenario objects go through the same impact functions and the UI charts the difference. One optional model call turns the result into the verdict sentence, with the computed figures passed in and quoted verbatim.

### Assistant chat

System instruction carries the profile, today's forecast summary and the current plan. The assistant answers in the selected language, keeps answers short, refers to times of day from the forecast, and does not invent measurements. Where a reply recommends an action that has an `ActionType`, return it as a structured part so the UI can attach a computed receipt.

## 7. Room scan

Send the photo to the multimodal model with a schema like:

```ts
interface RoomFinding {
  title: string;             // "Seal the gap under the balcony door"
  issue: string;
  fix: string;
  category: 'leak' | 'airflow' | 'source' | 'filtration';
  impact: 'high' | 'medium' | 'low';
  cost: 'free' | 'low' | 'medium';
  point: { x: number; y: number };  // normalised 0–1 position on the image
}
```

Draw numbered markers at each `point` over the image and list the findings beside it, as in the mockup.

Be honest in the UI about what this is: a visual check for likely problems, not a measurement. No µg/m³ figures on this screen. A line such as "Based on what is visible in the photo" under the heading is enough.

Resize the image client-side (longest edge around 1024 px) before sending, and do not store the photo in Firestore.

## 8. Screen notes

**Onboarding.** Step 1: city search using geocoding, plus a "use my location" button. Step 2: add members with name, age group and sensitivity chips. Step 3: commute mode, distance and times; cooking fuel; exhaust; purifier. The final button writes the profile and routes to `/today`. Keep it completable in under a minute; pre-fill a sample family behind a "Try a demo household" link for judges.

**Today.** Top banner: current US AQI, band label, PM2.5 and PM10, temperature, humidity, wind, and a one-line summary. Then the 24-hour strip with best and worst windows. Then the plan timeline; each card has time, title, reason, a checkbox and the receipt. A side column (below the plan on mobile) shows the day's totals and the family cards. Tapping a receipt opens a small "how this was calculated" panel with the inputs and formula.

**Swaps.** Filter chips by category, a grid of swap cards, and a running total for adopted swaps. "Add to my plan" stores the swap and feeds it into the next plan generation.

**Simulator.** Three selectors (activity, time of day, family member), two result panels, a bar comparison for PM2.5 and CO2, and the verdict. Collapsible "how we calculate" section linking to the same explanation as the receipts.

**Room scan.** Upload state, analysing state, results state. Checkbox per fix.

**Assistant.** Suggested-question chips built from the profile, message list, input with send. Language toggle in the header. Microphone button only if voice input is built (Web Speech API); otherwise remove it.

## 9. Build order

1. Scaffold Vite + React + TypeScript, install Tailwind, copy in the token config, add fonts and icons.
2. Build the shell with all six routes as empty pages. Create the Firebase project, add Hosting, deploy.
3. `lib/aqi` and `lib/impact` with tests, working from `IMPACT_MODEL.md`.
4. `services/openMeteo.ts`; render the Today banner and hourly strip from live data for a hard-coded location.
5. Onboarding, anonymous auth, profile in Firestore, security rules.
6. Rule-based plan on Today (no model yet) with real receipts. This is the fallback and it proves the receipts end to end.
7. Gemini plan generation replacing the rule-based plan, with validation and fallback.
8. Swaps, then Simulator.
9. Room scan, then Assistant.
10. Hindi strings, share card, polish, demo household, final deploy.

Stop and deploy after steps 2, 6, 7 and 8.

## 10. Before submitting

- Every figure on screen traces to a function in `lib/impact`.
- Nothing from the cut list is visible anywhere.
- The data source and forecast time are shown on Today.
- The app loads and shows a cached plan with the network throttled or offline.
- Firestore rules restrict each user to their own documents.
- No hotlinked images, no Tailwind CDN script.
- Works at 360 px wide and at 1280 px wide.
- A disclaimer that the app offers general guidance and is not medical advice.
- The constants in `IMPACT_MODEL.md` marked "verify" have been checked and their sources listed on an About or "How we calculate" page.
