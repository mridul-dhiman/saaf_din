# Impact model

Every number SaafDin shows next to an action comes from the formulas here, implemented in `src/lib/impact` as pure functions with unit tests. The model never supplies a figure.

The constants below are reasonable starting values written from memory of published sources. Each one marked **verify** must be checked against its source before the demo, and the sources listed in the app's "How we calculate" page. Keep all constants in one file (`src/lib/impact/constants.ts`) so that checking them is a single review.

These are screening-level estimates. They are good enough to rank choices and show orders of magnitude; they are not a dose assessment. The UI should round accordingly: whole µg, one decimal for kg, and "about" in front of cigarette equivalents.

## 1. Inhaled PM2.5

For one person doing one activity over a period:

```
inhaled_ug = Σ over hours ( C_outdoor[h] × F_env × F_mask × IR × fraction_of_hour )
```

- `C_outdoor[h]`: forecast PM2.5 for that hour, µg/m³, from Open-Meteo.
- `F_env`: how much of the outdoor concentration reaches the person.
- `F_mask`: fraction that passes a mask.
- `IR`: inhalation rate, m³ per hour.

**Exposure avoided** by an action is `inhaled_ug(baseline) − inhaled_ug(alternative)` for the same person. If the result is negative or under 1 µg, show no exposure pill.

### Inhalation rate, m³/h (verify: US EPA Exposure Factors Handbook, chapter 6)

| Intensity | Child (6–11) | Adult | Elderly |
|---|---|---|---|
| `rest` (sitting, sleeping) | 0.3 | 0.3 | 0.3 |
| `light` (walking slowly, housework, commuting as a passenger) | 0.7 | 0.7 | 0.7 |
| `moderate` (brisk walk, cycling, play) | 1.3 | 1.6 | 1.5 |
| `vigorous` (running, sport) | 2.5 | 3.0 | 2.5 |

```ts
type Intensity = 'rest' | 'light' | 'moderate' | 'vigorous';
```

Children inhale less air in absolute terms but more per kilogram of body weight, which is why they are treated as sensitive. Do not express that as a bigger µg figure; express it by prioritising their actions in the plan.

### Environment factor `F_env` (verify: indoor/outdoor PM2.5 infiltration literature)

| Setting | `F_env` |
|---|---|
| Outdoors | 1.0 |
| Indoors, windows open | 0.9 |
| Indoors, windows closed | 0.5 |
| Indoors, windows closed, purifier running | 0.2 |
| Car, windows closed, recirculation on | 0.4 |
| Car or auto-rickshaw, open | 1.0 |
| Metro (underground or air-conditioned coach) | 0.5 |
| Bus | 0.8 |

Real values vary widely with the building and the vehicle. These are mid-range defaults; say so in the explanation panel.

Roadside concentrations are higher than the grid forecast suggests. A traffic multiplier (for example 1.5 on `C_outdoor` during time spent in or beside heavy traffic) is defensible but optional; if used, it applies to both baseline and alternative wherever each is on the road.

### Mask factor `F_mask` (verify)

| Mask | `F_mask` |
|---|---|
| None | 1.0 |
| Cloth or surgical | 0.7 |
| N95 / FFP2, ordinary fit | 0.3 |

### Cooking and indoor combustion

Indoor sources add to exposure independently of the outdoor forecast, and we have no measurement of them. For actions of type `use_exhaust_while_cooking` and `avoid_indoor_combustion`, either:

- show no exposure figure and let the reason text carry it, or
- use a single documented assumption per source (for example an added indoor concentration during the activity, reduced by a fixed fraction with the exhaust on), clearly labelled as an assumption.

Start with the first option. Add the second only if there is time to find sources.

## 2. Cigarette equivalents

The widely quoted Berkeley Earth rule of thumb: breathing air at 22 µg/m³ PM2.5 for 24 hours is roughly comparable to smoking one cigarette (**verify**).

That rule is defined on concentration over time, so apply it to the change in effective concentration, not to inhaled mass:

```
cigarettes_avoided = Σ over hours ( (C_eff_baseline[h] − C_eff_alternative[h]) × fraction_of_hour ) / (22 × 24)

where C_eff = C_outdoor × F_env × F_mask
```

Use it only for the daily and weekly totals, never per action, and always with "about". It is a communication device, not a health claim; the explanation panel should say that.

The mockups show pairings such as "68 µg ≈ 1.2 cigarettes". Those do not follow from any formula and must not be reused.

## 3. CO2 emissions

### Travel

```
co2_kg = distance_km × EF[mode] / 1000
co2_saved_kg = co2_kg(baseline mode) − co2_kg(alternative mode)
```

Emission factors, grams of CO2 per passenger-kilometre (**verify all**: India GHG Program transport factors, CPCB, operator sustainability reports):

| Mode | `EF` |
|---|---|
| `walk`, `cycle` | 0 |
| `metro` | 30 |
| `bus` | 40 |
| `auto_cng` (auto-rickshaw, per passenger at typical occupancy) | 60 |
| `two_wheeler` | 45 |
| `car_petrol` (solo) | 170 |
| `car_diesel` (solo) | 160 |
| `car_cng` (solo) | 130 |
| `car_ev` (solo, Indian grid) | 110 |
| `carpool` | car factor ÷ occupants |

```ts
type TravelMode =
  | 'walk' | 'cycle' | 'metro' | 'bus' | 'auto_cng' | 'two_wheeler'
  | 'car_petrol' | 'car_diesel' | 'car_cng' | 'car_ev' | 'carpool';
```

Shifting the time of a commute without changing the mode saves exposure but no CO2. Show only the exposure pill.

### Cooking

- LPG: about 3.0 kg CO2 per kg of fuel burned (**verify**).
- Grid electricity in India: about 0.7 kg CO2 per kWh (**verify**: Central Electricity Authority CO2 baseline database, latest year).

On the current Indian grid, switching from LPG to induction does not reliably cut CO2 per meal; the two are close, and the answer depends on appliance efficiency. Compute it rather than assuming a saving, and if the result is not clearly positive, show no CO2 pill. The real benefit of induction is removing a combustion source from the kitchen, which belongs in the reason text. The mockup's "0.8 kg CO2 saved" for this swap is not supported.

### Purifier and ventilation

Running a purifier uses electricity: `kWh = watts × hours / 1000`, times the grid factor. An action that turns the purifier off during a clean-air window can show that as a small saving. An action that turns it on has a small CO2 cost; do not hide it if the receipt is opened, but it does not need its own pill.

## 4. Estimated indoor level

Where a screen needs an indoor figure, use `C_outdoor × F_env` for the current window and purifier state, and label it "estimated indoor PM2.5". Never present it as a reading.

## 5. Best and worst windows

In `src/lib/aqi`:

- **Best window**: the contiguous run of at least two hours, between 06:00 and 22:00 local time, with the lowest mean PM2.5 in the next 24 hours.
- **Worst window**: the same with the highest mean.
- If the best window's mean is still above a threshold (suggest 150 µg/m³), the day has no good time to ventilate; the plan should say so rather than recommend opening windows.

## 6. Daily totals

- **Exposure avoided today**: sum of `exposureAvoidedUg` over ticked actions, per member and for the household.
- **CO2 saved today**: sum of `co2SavedKg` over ticked actions.
- **Planned versus done**: show both, so unticked actions read as potential rather than achieved.

Avoid double counting: if two actions cover the same person in the same hour (for example "move cricket indoors" and "wear a mask at cricket"), only the one actually ticked counts, and the plan generator should not emit overlapping actions for the same member.

## 7. Tests to write first

- Zero duration returns zero.
- Identical baseline and alternative return no receipt (`null`), not `0`.
- A masked hour outdoors inhales `F_mask` times the unmasked hour.
- A period crossing an hour boundary weights each hour's concentration by the fraction spent in it.
- Car to metro over 18 km returns the expected kg from the table.
- Time-shift actions return `co2SavedKg: null`.
- Best-window detection on a hand-written 24-hour series.
- Cigarette equivalents: 24 hours at a 22 µg/m³ difference returns 1.0.
