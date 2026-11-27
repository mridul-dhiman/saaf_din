# SaafDin: Demo Video Script (under 4 minutes)

Built against the PromptWars "Video Submission | Guide": logical walkthrough, live data entry, success and edge cases, GenAI clearly shown and shown to be dynamic, under 4 minutes, public Drive or unlisted YouTube link.

Target length: **3:45**. Timings are a budget, not a stopwatch.

---

## Before you hit record

1. **Deploy the latest build** (`npm run build && firebase deploy --only hosting`) and record against `https://saaf-din.web.app`, so judges see the hosted app.
2. **Start clean:** open a fresh Chrome profile or incognito window so there's no cached profile (otherwise onboarding is skipped).
3. **Window at 1280 px wide**, browser zoom 110–125% so typed values are readable. Hide bookmarks bar and other tabs.
4. **Recorder:** macOS `Cmd+Shift+5` → Record Selected Portion → Options → *Show Mouse Clicks*. Or OBS. Use a headset mic if narrating.
5. **Have two photos ready on the Desktop:**
   - `kitchen.jpg`: a real photo of your kitchen/living room showing a window, door or stove.
   - `not-a-room.jpg`: something with no room features (a plate of food, a close-up of a wall, a pet).
6. **Rehearse the Gemini calls once** right before recording (the Spark free tier is rate-limited; a cold first call can be slow). If the plan, scan or assistant is slow, cut the wait in editing; don't fake it.
7. Keep DevTools closed until the offline step.

**Narration rule:** say what you are typing *before* you type it, then pause ~1 s on the filled field so the value is readable. Every time Gemini runs, say "**this is Gemini**".

---

## 0:00 – 0:15 · Hook

**Screen:** SaafDin landing / onboarding at `saaf-din.web.app`.

> "SaafDin turns tomorrow's hourly air-quality forecast into a daily plan for your household, and shows the exact impact of every choice. Gemini picks and explains the actions; every number is computed by a transparent impact model, never by the AI. Let me set up a real household live."

---

## 0:15 – 0:55 · Onboarding: live input, success and edge cases

**Step 1: Neighbourhood**
- Type **`xqzvv`** in the search box → pause on the empty/no-match result.
  > "Edge case: a nonsense place returns nothing, so the app can't plan for a location it doesn't know."
- Clear it, type **`Lajpat Nagar`** → pick *Lajpat Nagar, New Delhi*. Pause on it.

**Step 2: Household members**
- Click **Add Member** with the name empty → button stays disabled.
  > "Edge case: you can't add a nameless member."
- Type **`Aarav`**, choose *Child*, tick *Asthma*, routine e.g. **`School bus 7:30`**. Add.
- Type **`Dadi`**, choose *Elderly*, routine **`Morning park walk`**. Add.

**Step 3: Commute & indoor**
- Commute: *Car*, distance **`12`** km. Cooking fuel: *LPG*. Exhaust: *No*. Purifier: *Yes*.
- Click **Save & View Daily Plan**. Point at the "Not medical advice" disclaimer on the way.

---

## 0:55 – 1:40 · Today: the forecast plus the Gemini plan

- **Hero AQI card:** point to US AQI, PM2.5, and the "Forecast: Open-Meteo (CAMS) · fetched at …" timestamp.
- **24-hour strip:** hover a few bars; point to **Worst Window** and **Best Window**.
  > "Ventilation windows are found by pure code: the best daytime stretch below the PM2.5 threshold."
- **Action timeline:** wait for the badge next to the title to change from *Asking Gemini…* to **Planned by Gemini**, and point at it. If it says *Rule-based plan · Gemini unavailable*, stop and re-record once Gemini is responding.
  > "**This is Gemini.** We send it the household profile and a forecast summary, and it returns structured JSON: which actions, for whom, and when. Notice Aarav gets a mask action for the school run, and Dadi's walk is moved to the cleaner window. It's tailored to the people I just typed in."
- Click one action's **impact receipt** → show the calculation breakdown (hourly C_outdoor, F_env, F_mask, breathing rate, inhaled vs avoided, CO₂, cigarette equivalent).
  > "Gemini is forbidden from producing numbers; outputs containing numbers fail validation and are retried. Every µg and kg here comes from these formulas."
- Point at the **Today's impact** totals and family cards.

---

## 1:40 – 2:05 · Swaps: prove the AI output is dynamic

- Open **Swaps** → filter **Commute** → **Adopt** *Car → Metro* (pause on the exposure-avoided and CO₂-saved figures).
- Go back to **Today** and wait for the plan to refresh.
  > "I changed one habit and Gemini re-planned. The timeline now reflects the Metro commute instead of the car. Same app, different input, different plan, so nothing is hard-coded."

---

## 2:05 – 2:35 · Simulator: what-if, with changing numbers

- **Select member:** Aarav. **Activity:** Commute.
- Baseline: *Car, no mask*, duration **`45`** min. Alternative: *Metro, N95*.
- Pause on the **Simulated Exposure Reduction** and verdict.
- Change the duration to **`90`** → numbers update live.
  > "Doubling the trip changes the dose. This is the impact model, not the AI."
- Click **Add to My Plan** → "Added to My Plan ✓".

---

## 2:35 – 3:10 · Room Scan: multimodal Gemini, success and failure

- Click **Upload Photo** → choose **`kitchen.jpg`**. Show the "Analysing room image…" state.
  > "**This is Gemini vision.** The photo is resized in the browser and never stored."
- Hover the markers and the **Prioritized Fixes** (issue → fix, impact badge).
- Click **Scan Another Room** → upload **`not-a-room.jpg`**.
  > "Edge case: no doors, windows or stove, so instead of inventing findings it says *Room Analysis Inconclusive*."
- Do **not** use "Try with Sample Room" in the video: it's a labelled canned example, not a live AI call.

---

## 3:10 – 3:35 · Assistant: grounded chat, plus language switch

- Type (don't click the chip): **`Should Aarav wear an N95 mask to school today?`** → send. Pause on the reply.
  > "**This is Gemini**, grounded in this household, today's forecast and the current plan. It names Aarav and suggests an action I can add."
- Click the header language toggle to **हिन्दी**, then type **`दादी के लिए आज शाम टहलना ठीक है?`** → send.
  > "Different question, different person, different language, and the answer changes each time."
- Point at the "Not medical advice" disclaimer.

---

## 3:35 – 3:50 · Transparency and resilience, then close

- Switch back to English. Open **How We Calculate** and scroll the constants table quickly; point at the *confirmed in source* and *assumption, not verified* status badges.
  > "Every constant is listed with its source, and we label what's still an assumption."
- *(Optional, if time allows)* DevTools → Network → **Offline** → reload Today: the cached forecast and plan load with their timestamp.
- Close:
  > "SaafDin: Gemini decides *what* to do, transparent maths shows *why it matters*. Built on Firebase and Gemini. Thanks!"

---

## After recording

- [ ] Trim dead waits (especially Gemini latency); keep total **under 4:00**.
- [ ] Every typed value readable at 1080p.
- [ ] Upload to YouTube as **Unlisted** (or Google Drive with "Anyone with the link").
- [ ] Open the link in an **incognito window** to confirm it plays without a sign-in or access request.
- [ ] Submit the link.

## Guide checklist → where it's covered

| Guide requirement | Segment |
|---|---|
| Core features in logical order | Onboarding → Today → Swaps → Simulator → Room Scan → Assistant → How We Calculate |
| Data entered live | Location, members, commute, simulator duration, photos, chat questions |
| Success **and** edge cases | Nonsense location, empty member name, non-room photo |
| Exact values readable | Every typed value is listed above in **bold code** |
| GenAI clearly shown | "This is Gemini" call-outs at plan, room scan, assistant |
| AI is dynamic | Plan re-generates after adopting a swap; assistant answers different questions/people/language |
| Under 4 minutes | Budgeted at ~3:45 |
