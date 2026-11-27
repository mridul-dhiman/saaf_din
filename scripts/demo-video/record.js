// Records a captioned walkthrough of the live SaafDin site (https://saaf-din.web.app)
// following docs/VIDEO_SCRIPT.md. Captures 1920x1080 frames from Chromium via the
// DevTools screencast, overlays captions + a visible cursor inside the page, and
// writes frames + timing metadata for build.js to turn into an MP4 and an SRT.
const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');
const { installRetry } = require('./common');

const OUT = path.join(__dirname, 'out');
const FRAMES = path.join(OUT, 'frames');
const PHOTOS = path.join(__dirname, 'photos');
const SITE = 'https://saaf-din.web.app';

fs.rmSync(OUT, { recursive: true, force: true });
fs.mkdirSync(FRAMES, { recursive: true });

const frames = []; // { file, t }
const captions = []; // { start, end, text }
const speedups = []; // { start, end, factor }
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);
const now = () => Date.now() / 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------- overlay (captions + cursor), injected into every document ----------
const OVERLAY = `
(() => {
  const install = () => {
    if (document.getElementById('__demo_cap')) return;
    const st = document.createElement('style');
    st.textContent = \`
      #__demo_cap{position:fixed;left:50%;bottom:22px;transform:translateX(-50%);z-index:2147483646;
        max-width:1040px;width:max-content;padding:12px 22px;border-radius:14px;background:rgba(15,23,42,.90);
        color:#fff;font:600 21px/1.4 Inter,system-ui,sans-serif;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.35);
        pointer-events:none;transition:opacity .25s;opacity:0}
      #__demo_cap .k{display:block;font:700 12px/1.2 Inter,system-ui,sans-serif;letter-spacing:.12em;text-transform:uppercase;color:#5eead4;margin-bottom:4px}
      #__demo_cap code{font:700 21px/1.4 ui-monospace,Menlo,monospace;background:#fde68a;color:#111;padding:1px 8px;border-radius:6px}
      #__demo_cap b{color:#fde68a}
      #__demo_cur{position:fixed;left:0;top:0;z-index:2147483647;pointer-events:none;width:26px;height:26px;
        transform:translate(-100px,-100px);transition:none}
      #__demo_ring{position:fixed;z-index:2147483646;pointer-events:none;width:38px;height:38px;margin:-19px 0 0 -19px;
        border-radius:50%;border:3px solid #f59e0b;opacity:0;transform:scale(.4)}
      #__demo_ring.go{animation:__demo_ring .5s ease-out}
      @keyframes __demo_ring{0%{opacity:1;transform:scale(.4)}100%{opacity:0;transform:scale(1.4)}}
    \`;
    document.documentElement.appendChild(st);
    const cap = document.createElement('div'); cap.id = '__demo_cap'; document.documentElement.appendChild(cap);
    const cur = document.createElement('div'); cur.id = '__demo_cur';
    cur.innerHTML = '<svg width="26" height="26" viewBox="0 0 24 24"><path d="M4 2l16 10-7 1.5L9.5 21z" fill="#111" stroke="#fff" stroke-width="1.6" stroke-linejoin="round"/></svg>';
    document.documentElement.appendChild(cur);
    const ring = document.createElement('div'); ring.id = '__demo_ring'; document.documentElement.appendChild(ring);
    const pos = window.__demoPos || { x: -100, y: -100 };
    cur.style.transform = 'translate(' + pos.x + 'px,' + pos.y + 'px)';
    addEventListener('mousemove', (e) => { window.__demoPos = { x: e.clientX, y: e.clientY };
      cur.style.transform = 'translate(' + e.clientX + 'px,' + e.clientY + 'px)'; }, true);
    addEventListener('mousedown', (e) => { ring.style.left = e.clientX + 'px'; ring.style.top = e.clientY + 'px';
      ring.classList.remove('go'); void ring.offsetWidth; ring.classList.add('go'); }, true);
    window.__demoSetCap = (html) => { cap.innerHTML = html || ''; cap.style.opacity = html ? '1' : '0'; };
    if (window.__demoCapHtml) window.__demoSetCap(window.__demoCapHtml);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', install); else install();
})();
`;

let page;
let curCap = null;
async function caption(kicker, html, holdMs = 0) {
  const t = now();
  if (curCap) curCap.end = t;
  const full = (kicker ? `<span class="k">${kicker}</span>` : '') + html;
  curCap = html ? { start: t, end: null, text: (kicker ? kicker + ' — ' : '') + html.replace(/<[^>]+>/g, '') } : null;
  if (curCap) captions.push(curCap);
  await page.evaluate((h) => { window.__demoCapHtml = h; window.__demoSetCap && window.__demoSetCap(h); }, html ? full : '').catch(() => {});
  if (holdMs) await sleep(holdMs);
}
// Reading time: ~ 60ms per character, min 2.6s
const read = (html) => Math.max(2400, html.replace(/<[^>]+>/g, '').length * 52);
async function say(kicker, html, extra = 0) { await caption(kicker, html, read(html) + extra); }

async function moveTo(locator, opts = {}) {
  await locator.scrollIntoViewIfNeeded().catch(() => {});
  const box = await locator.boundingBox();
  if (!box) throw new Error('no box for locator');
  const x = box.x + box.width * (opts.fx ?? 0.5), y = box.y + box.height * (opts.fy ?? 0.5);
  await page.mouse.move(x, y, { steps: opts.steps ?? 18 });
  await sleep(opts.pause ?? 250);
  return { x, y };
}
async function click(locator, opts = {}) {
  await moveTo(locator, opts);
  await locator.click({ timeout: 10000, ...(opts.force ? { force: true } : {}) });
  await sleep(opts.after ?? 600);
}
async function typeInto(locator, text, { clear = true, delay = 70, after = 800 } = {}) {
  await click(locator, { after: 200 });
  if (clear) { await page.keyboard.press('Control+A'); await page.keyboard.press('Backspace'); }
  await page.keyboard.type(text, { delay });
  await sleep(after);
}
async function selectOpt(locator, value, after = 700) {
  await moveTo(locator);
  await locator.selectOption(value);
  await sleep(after);
}
async function smoothScrollTo(locator, block = 'center') {
  await locator.evaluate((el, b) => el.scrollIntoView({ behavior: 'smooth', block: b }), block);
  await sleep(1100);
}
async function scrollTop() { await page.evaluate(() => scrollTo({ top: 0, behavior: 'smooth' })); await sleep(900); }
async function nav(label) {
  await click(page.locator('aside, nav').getByText(label, { exact: true }).first(), { after: 1500 });
}
// Waits that may take a while are fast-forwarded in the final cut and labelled.
async function waitFast(fn, factor = 6) {
  const s = now();
  try { return await fn(); } finally { speedups.push({ start: s, end: now(), factor }); }
}

// Wait until the assistant has appended a reply (message count grows) and the send spinner is gone.
async function waitReply(q) {
  const form = page.locator('form');
  const before = await page.locator('main').innerText();
  const start = Date.now();
  while (Date.now() - start < 90000) {
    await sleep(500);
    const busy = await page.locator('main .animate-spin, main .animate-pulse, main .animate-bounce').count();
    const txt = await page.locator('main').innerText();
    if (!busy && txt.length > before.length + q.length + 60) { await sleep(800); return; }
  }
}
// ---------- Gemini status, read from real network traffic ----------
const gemini = { ok: 0, fail: 0, lastStatus: null };

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1.5, locale: 'en-IN', timezoneId: 'Asia/Kolkata' });
  await installRetry(ctx, (m) => log(m));
  await ctx.addInitScript(OVERLAY);
  page = await ctx.newPage();
  page.on('response', (r) => {
    if (/firebasevertexai\.googleapis\.com/.test(r.url())) {
      gemini.lastStatus = r.status(); if (r.status() === 200) gemini.ok++; else gemini.fail++;
      log('gemini', r.status());
    }
  });

  const cdp = await ctx.newCDPSession(page);
  cdp.on('Page.screencastFrame', async (f) => {
    const file = path.join(FRAMES, String(frames.length).padStart(6, '0') + '.jpg');
    fs.writeFileSync(file, Buffer.from(f.data, 'base64'));
    frames.push({ file, t: f.metadata.timestamp });
    cdp.send('Page.screencastFrameAck', { sessionId: f.sessionId }).catch(() => {});
  });

  await page.goto(SITE + '/', { waitUntil: 'domcontentloaded' });
  await page.waitForURL(/onboarding/, { timeout: 20000 });
  await page.getByPlaceholder(/Search city/).waitFor();
  await sleep(1500);
  await cdp.send('Page.startScreencast', { format: 'jpeg', quality: 90, maxWidth: 1920, maxHeight: 1080, everyNthFrame: 1 });
  const t0 = now();
  await page.mouse.move(640, 300);
  await sleep(500);

  // ================= 0. Hook =================
  await say('SaafDin · live at saaf-din.web.app', 'SaafDin turns the hourly air-quality forecast into a <b>daily plan for your household</b> and shows the impact of every choice.');
  await say('How it works', 'Gemini (via Firebase AI Logic) chooses and explains actions. <b>Every number</b> comes from a transparent impact model, never from the AI.');

  // ================= 1. Onboarding =================
  const search = page.getByPlaceholder(/Search city/);
  await caption('Step 1 · Onboarding — location', 'Edge case: searching a nonsense place name <code>xqzvv</code>');
  await typeInto(search, 'xqzvv', { after: 2500 });
  const noHits = (await page.locator('button:has(span.font-semibold)').filter({ hasText: /xqzvv/i }).count()) === 0;
  await say('Result', noHits ? 'No matches are offered, so the app <b>cannot plan for an unknown place</b>.' : 'Search finished.');

  await caption('Step 1 · Onboarding — location', 'Success case: typing <code>Lajpat Nagar</code>');
  await typeInto(search, 'Lajpat Nagar', { after: 2500, delay: 130 });
  const hit = page.locator('div.absolute button').filter({ hasText: 'Lajpat Nagar' }).filter({ hasText: /Delhi/ }).first();
  // The app geocodes on every keystroke without debouncing, so an older response can land last.
  // Re-trigger the final query (backspace + retype the last letter) until the Delhi result shows.
  for (let i = 0; i < 4 && !(await hit.isVisible()); i++) {
    await page.keyboard.press('Backspace'); await sleep(400); await page.keyboard.type('r'); await sleep(2500);
  }
  await hit.waitFor({ timeout: 15000 });
  await click(hit, { after: 3000 });
  await say('Result', 'Live geocoding (Open-Meteo) resolves <b>Lajpat Nagar, Delhi</b> and previews its current US AQI.');
  await click(page.getByRole('button', { name: /Continue/ }), { after: 1200 });

  // ---- Step 2: family ----
  await caption('Step 2 · Onboarding — household', 'Remove the pre-filled sample members and enter our own family');
  const sampleNames = await page.locator('button[aria-label^="Remove "]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label').slice(7)));
  for (const n of sampleNames) {
    const del = page.locator(`button[aria-label="Remove ${n}"]`);
    const before = await page.locator('button[aria-label^="Remove "]').count();
    await click(del, { after: 450, steps: 10 });
    if ((await page.locator('button[aria-label^="Remove "]').count()) === before) break; // the app keeps at least one member
  }
  const addBtn = page.getByRole('button', { name: /\+ Add Member/ });
  await moveTo(addBtn, { pause: 800 });
  await say('Edge case', 'With the name empty, <b>Add Member stays disabled</b>: no nameless members.', 400);

  const nameInput = page.getByPlaceholder('Name (e.g. Aarav)');
  const ageSel = nameInput.locator('xpath=following-sibling::select[1]');
  const routineToggle = page.getByText(/Add regular daily routine/);
  const routineLabel = page.getByPlaceholder('e.g. Morning park walk');

  await caption('Step 2 · Add a child', 'Name <code>Aarav</code> · Child · tag <code>asthma</code> · routine <code>School bus stop wait</code>');
  await typeInto(nameInput, 'Aarav', { after: 500 });
  await selectOpt(ageSel, 'child');
  await click(page.getByRole('button', { name: 'asthma', exact: true }), { after: 400 });
  await click(routineToggle, { after: 500 });
  await typeInto(routineLabel, 'School bus stop wait', { after: 1400 });
  await click(addBtn, { after: 1500 });

  await caption('Step 2 · Add a grandparent', 'Name <code>Dadi</code> · Elderly (60+) · routine <code>Morning park walk</code>');
  await typeInto(nameInput, 'Dadi', { after: 500 });
  await selectOpt(ageSel, 'elderly');
  await click(page.getByRole('button', { name: 'elderly', exact: true }), { after: 400 });
  if (!(await routineLabel.isVisible())) await click(routineToggle, { after: 500 });
  await typeInto(routineLabel, 'Morning park walk', { after: 1400 });
  await click(addBtn, { after: 1500 });
  // remove any sample member the app kept (it never lets the list go empty)
  for (const n of sampleNames.filter((x) => !['Aarav', 'Dadi'].includes(x))) {
    const del = page.locator(`button[aria-label="Remove ${n}"]`);
    if (await del.count()) await click(del, { after: 500, steps: 10 });
  }
  await smoothScrollTo(page.getByText('Aarav', { exact: true }).first(), 'start');
  await caption('Result', 'Household is now <b>Aarav</b> + <b>Dadi</b>, each with their own tags and routine.', 2600);
  await click(page.getByRole('button', { name: /Continue/ }), { after: 1200 });

  // ---- Step 3: habits ----
  await scrollTop();
  const commuteSel = page.locator('select').filter({ has: page.locator('option[value="car_petrol"]') });
  const distance = page.locator('label:has-text("One-Way Distance (km)") + input').first();
  await caption('Step 3 · Daily habits', 'Commute: <code>Car (Petrol)</code> · one-way distance <code>12</code> km');
  await selectOpt(commuteSel, 'car_petrol');
  await typeInto(distance, '12', { after: 1200 });
  await caption('Step 3 · Indoor setup', 'Cooking fuel <code>LPG</code> · Kitchen exhaust <code>No</code> · HEPA purifier <code>Yes</code>');
  const fuelSel = page.locator('select').filter({ has: page.locator('option[value="lpg"]') });
  await selectOpt(fuelSel, 'lpg');
  const exhaust = page.locator('label:has-text("Kitchen Exhaust Fan") input[type=checkbox]');
  const purifier = page.locator('label:has-text("HEPA Air Purifier") input[type=checkbox]');
  await smoothScrollTo(exhaust);
  if (await exhaust.isChecked()) await click(exhaust, { after: 500 }); else await moveTo(exhaust, { pause: 600 });
  if (!(await purifier.isChecked())) await click(purifier, { after: 500 }); else await moveTo(purifier, { pause: 600 });
  await sleep(1200);
  const save = page.getByRole('button', { name: /Save & View Daily Plan/ });
  await smoothScrollTo(save);
  await moveTo(page.getByText(/does not replace medical advice/), { pause: 300 });
  await caption('Disclaimer', 'Guidance only, <b>not medical advice</b>.', 2200);
  await click(save, { after: 800 });

  // ================= 2. Today =================
  await page.waitForURL(/today/, { timeout: 20000 });
  await caption('Step 4 · Today', 'Loading the live hourly forecast for Lajpat Nagar…');
  await waitFast(() => page.getByText(/fetched at/).first().waitFor({ timeout: 60000 }));
  await sleep(800);
  await moveTo(page.getByText(/US AQI ·/).first(), { pause: 400 });
  await say('Step 4 · Today', 'Live <b>US AQI</b>, PM2.5, PM10 and weather for Lajpat Nagar, with source and fetch time.');
  await moveTo(page.getByText(/fetched at/).first(), { pause: 600 });

  const strip = page.getByText('Next 24 hours').first();
  await smoothScrollTo(strip, 'start');
  await caption('Step 4 · Next 24 hours', 'Hover any hour. The <b>best and worst ventilation windows</b> are found by plain code, not AI.');
  const bars = page.locator('[class*="cursor"]').filter({ has: page.locator('xpath=.') });
  const chart = page.getByText(/Hover or tap any bar/).first();
  const cb = await chart.boundingBox();
  if (cb) {
    for (const fx of [0.05, 0.2, 0.35, 0.55, 0.75]) {
      await page.mouse.move(280 + (cb.x + cb.width - 280) * fx, cb.y + 85, { steps: 14 });
      await sleep(700);
    }
  }
  await sleep(1500);

  const planTitle = page.getByText('Action Plan for Today').first();
  await smoothScrollTo(planTitle, 'start');
  await say('Step 5 · Action plan', 'The household profile + forecast summary are sent to <b>Gemini</b>, which must return structured JSON…');
  const badge = page.getByText(/Planned by Gemini|Rule-based plan · Gemini unavailable/).first();
  await waitFast(() => badge.waitFor({ timeout: 90000 }));
  await moveTo(badge, { pause: 600 });
  const planByGemini = /Planned by Gemini/.test(await badge.innerText());
  log('plan source:', planByGemini ? 'gemini' : 'fallback');
  if (planByGemini) {
    await say('This is Gemini', 'Badge: <b>Planned by Gemini</b>. It picked which actions, for whom and when, for the people typed in a minute ago.', 800);
  } else {
    await say('Gemini status on the live site', 'Badge: <b>Rule-based plan · Gemini unavailable</b>. The Gemini call failed, so the app shows a deterministic plan and <b>says so</b> rather than pretending.', 800);
  }
  const firstCard = page.locator('text=/\\d{2}:\\d{2} – \\d{2}:\\d{2}/').first();
  await smoothScrollTo(firstCard);
  await sleep(1200);

  // receipt
  const pill = page.getByRole('button', { name: /µg PM2\.5|kg CO₂/ }).first();
  await caption('Step 6 · Impact receipt', 'Open one action\'s receipt to see <b>how its numbers are calculated</b>.');
  await click(pill, { after: 1800 });
  const dialog = page.locator('[role=dialog], .fixed.inset-0').last();
  await say('Impact receipt', 'Hourly PM2.5 × penetration × breathing rate → µg avoided, plus CO₂. <b>The AI never produces these numbers.</b>');
  const scrollable = dialog.locator('div[class*="overflow-y"]').first();
  
  const closeBtn = page.getByRole('button', { name: /close/i }).last();
  if (await closeBtn.count()) await click(closeBtn, { after: 800 }); else { await page.keyboard.press('Escape'); await sleep(800); }


  // ================= 3. Swaps =================
  await nav('Swaps');
  await scrollTop();
  await click(page.getByRole('button', { name: 'Commute', exact: true }), { after: 1200 });
  const commuteCard = page.locator('div').filter({ has: page.getByText('Child Morning School Run', { exact: true }) }).filter({ has: page.getByRole('button', { name: /Adopt|Adopted/ }) }).last();
  await say('Step 7 · Swaps', 'Live input: adopt the <code>Child Morning School Run</code> swap: open-air auto → shared electric shuttle or Metro for Aarav');
  await moveTo(commuteCard.getByText(/Exposure Avoided/).first(), { pause: 900 });
  const adopt = commuteCard.getByRole('button', { name: /Adopt Swap/ });
  if (await adopt.count()) await click(adopt, { after: 1500 });
  await say('Result', 'Adopted. Exposure avoided and CO₂ saved come from the impact model.');
  await nav('Today');
  await smoothScrollTo(page.getByText('Action Plan for Today').first(), 'start');
  await caption('Step 7 · Re-plan', 'Changing a habit changes the input, so the plan is <b>regenerated</b>…');
  const badge2 = page.getByText(/Planned by Gemini|Rule-based plan · Gemini unavailable/).first();
  await waitFast(() => badge2.waitFor({ timeout: 90000 }));
  await sleep(1500);
  const metroLine = page.getByText(/Metro/i).first();
  if (await metroLine.count()) await moveTo(metroLine, { pause: 600 });
  if (/Planned by Gemini/.test(await badge2.innerText())) {
    await say('This is Gemini · dynamic', 'New input → <b>new Gemini plan</b>. The commute is now planned around the Metro instead of the car.');
  } else {
    await say('Re-planned', 'The plan was rebuilt for the new commute (rule-based fallback while Gemini is unavailable).');
  }

  // ================= 4. Simulator =================
  await nav('Simulator');
  await scrollTop();
  const actSel = page.locator('select').filter({ has: page.locator('option[value="commute"]') });
  const timeSel = page.locator('select').filter({ has: page.locator('option[value="08:30"]') });
  const memSel = page.locator('select').nth(2);
  await caption('Step 8 · What-if simulator', 'Inputs: activity <code>Work / School Commute</code> · time <code>08:30 AM</code> · member <code>Aarav</code>');
  await selectOpt(actSel, 'commute');
  await selectOpt(timeSel, '08:30');
  const aaravVal = await memSel.locator('option', { hasText: 'Aarav' }).first().getAttribute('value');
  await selectOpt(memSel, aaravVal, 1500);
  const doseNums = page.getByText(/µg/).filter({ hasNot: page.locator('select') });
  await moveTo(page.getByText('Inhaled PM2.5 Dose').first(), { pause: 600 });
  await say('Result', 'Usual routine vs alternative: inhaled PM2.5 dose and trip CO₂.');
  await caption('Step 8 · Change one input', 'Now change the time to <code>02:00 PM</code>, the afternoon clean-air window. Watch the numbers.');
  await selectOpt(timeSel, '14:00', 2500);
  await moveTo(page.getByText('Inhaled PM2.5 Dose').first(), { pause: 600 });
  await say('Result', 'Same trip, cleaner hour → <b>lower dose</b>. This is the impact model, recomputed live.', 600);
  const verdict = page.getByText(/SIMULATION VERDICT|Simulation Verdict/i).first();
  await moveTo(verdict, { pause: 1200 });
  const addPlan = page.getByRole('button', { name: /Add to My Plan/ });
  await click(addPlan, { after: 1800 });
  await caption('Added', 'Scenario added to today\'s plan.', 1800);

  // ================= 5. Room scan =================
  await nav('Room Scan');
  await scrollTop();
  const fileInput = page.locator('input[type=file]');
  const uploadBtn = page.getByRole('button', { name: /Upload/i }).first();
  if (await uploadBtn.count()) await moveTo(uploadBtn, { pause: 300 });
  await say('Step 9 · Room Scan (Gemini vision)', 'Upload a real photo: <code>kitchen.jpg</code> (window, cooktop, hood). It is resized in the browser and not stored.');
  const gBefore = gemini.ok + gemini.fail;
  await fileInput.setInputFiles(path.join(PHOTOS, 'kitchen.jpg'));
  await caption('Step 9 · Room Scan', 'Photo sent to <b>Gemini</b> for analysis…');
  const roomDone = page.getByText(/Room Analysis Inconclusive|Scan Another Room|Prioritized Fixes/i).first();
  await waitFast(() => roomDone.waitFor({ timeout: 90000 }));
  await sleep(1500);
  const inconclusive1 = await page.getByText('Room Analysis Inconclusive').count();
  const roomGeminiOk = gemini.ok > 0 && gemini.lastStatus === 200;
  if (!inconclusive1) {
    const markers = page.locator('main img').first();
    await moveTo(markers, { pause: 1200 });
    await smoothScrollTo(page.getByText(/Prioritized Fixes/i).first(), 'start');
    await say('This is Gemini vision', 'Gemini found the windows, stove and ventilation in <b>this</b> photo and turned them into prioritized fixes with impact bands.', 800);
  } else {
    await say('Result', roomGeminiOk ? 'Gemini could not identify room features.'
      : 'Gemini is unavailable on the live site right now, so no findings are invented: the scan reports <b>Inconclusive</b>.', 600);
  }
  const again = page.getByRole('button', { name: /Scan Another Room|Try Again|Upload/i }).first();
  if (await again.count()) await click(again, { after: 1000 });
  await caption('Step 9 · Edge case', 'Upload something that is not a room: <code>not-a-room.jpg</code> (a cake on a plate)');
  await sleep(1200);
  await page.locator('input[type=file]').setInputFiles(path.join(PHOTOS, 'not-a-room.jpg'));
  const roomDone2 = page.getByText(/Room Analysis Inconclusive|Prioritized Fixes/i).first();
  await waitFast(() => roomDone2.waitFor({ timeout: 90000 }));
  await sleep(1500);
  if (await page.getByText('Room Analysis Inconclusive').count()) {
    await moveTo(page.getByText('Room Analysis Inconclusive').first(), { pause: 600 });
    await say('Result', 'No doors, windows or stove → <b>Room Analysis Inconclusive</b> instead of made-up findings.', 600);
  } else {
    await say('Result', 'Scan finished.');
  }

  // ================= 6. Assistant =================
  await nav('Assistant');
  await scrollTop();
  const ask = page.locator('form input[type=text]');
  const q1 = 'Should Aarav wear an N95 mask to school today?';
  await caption('Step 10 · Assistant', `Typed question: <code>${q1}</code>`);
  await typeInto(ask, q1, { after: 1200 });
  const okBefore = gemini.ok;
  await page.keyboard.press('Enter');
  await waitFast(() => waitReply(q1));
  await sleep(1500);
  const assistantGemini = gemini.ok > okBefore;
  await say(assistantGemini ? 'This is Gemini' : 'Reply', assistantGemini
    ? 'Gemini answers grounded in <b>this household, today\'s forecast and the plan</b>, and names Aarav.'
    : 'Reply shown from the app\'s built-in fallback (Gemini is unavailable on the live site right now).', 1200);

  await caption('Step 10 · Language switch', 'Switch the whole app to Hindi: <code>हिं</code>');
  await click(page.locator('header').getByRole('button', { name: 'हिं' }).first(), { after: 1500 });
  const q2 = 'दादी के लिए आज शाम टहलना ठीक है?';
  await caption('Step 10 · Assistant (Hindi)', `Different person, different language: <code>${q2}</code>`);
  await typeInto(ask, q2, { after: 1200 });
  const okBefore2 = gemini.ok;
  await page.keyboard.press('Enter');
  await waitFast(() => waitReply(q2));
  await sleep(1500);
  await say(gemini.ok > okBefore2 ? 'This is Gemini · dynamic' : 'Reply', gemini.ok > okBefore2
    ? 'A different question about a different person, in Hindi, gets a different answer.'
    : 'The reply comes back in Hindi (fallback text while Gemini is unavailable).', 1200);

  // ================= 7. How we calculate =================
  await click(page.locator('header').getByRole('button', { name: 'EN' }).first(), { after: 1200 });
  await nav('How We Calculate');
  await scrollTop();
  await say('Step 11 · How We Calculate', 'Every formula and constant is published, with its source.');
  const table = page.locator('table').first();
  if (await table.count()) {
    await smoothScrollTo(table, 'start');
    const badgeC = page.getByText(/confirmed/i).first();
    if (await badgeC.count()) await moveTo(badgeC, { pause: 600 });
    await say('Transparency', 'Each constant is labelled <b>confirmed in source</b> or <b>assumption, not verified</b>.', 400);
  }
  await say('SaafDin', 'Gemini decides <b>what</b> to do; transparent maths shows <b>why it matters</b>. Built on Firebase + Gemini.', 1200);
  await caption(null, '');
  await sleep(800);

  await cdp.send('Page.stopScreencast');
  await sleep(500);
  if (curCap) curCap.end = now();
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify({ t0, tEnd: now(), frames, captions, speedups, gemini, planByGemini }, null, 1));
  log('frames', frames.length, 'duration', (now() - t0).toFixed(1), 's', 'gemini', JSON.stringify(gemini));
  await browser.close();
})().catch(async (e) => {
  console.error('FAILED', e);
  try { await page.screenshot({ path: path.join(OUT, 'failure.png') }); } catch {}
  fs.writeFileSync(path.join(OUT, 'meta.json'), JSON.stringify({ frames, captions, speedups, gemini, failed: String(e) }, null, 1));
  process.exit(1);
});
