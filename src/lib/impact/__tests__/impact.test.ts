import { describe, it, expect } from 'vitest';
import {
  calcInhaledUg,
  calcExposureAvoided,
  getTimeSlices,
  makePm25Lookup,
} from '../exposure';
import { calcTravelCo2Kg, calcTravelCo2SavedKg } from '../emissions';
import {
  calcCigarettesAvoided,
  calcActionCigarettesAvoided,
  calcTotalCigarettesAvoided,
  formatCigarettes,
} from '../cigarettes';
import { MASK_FACTORS, EMISSION_FACTORS } from '../constants';
import { computeActionImpact } from '../actionImpact';
import { Profile, PlannedAction } from '../../../types';

const MOCK_PROFILE: Profile = {
  location: { name: 'Delhi', lat: 28.61, lon: 77.23 },
  members: [
    { id: 'm1', name: 'Arjun', ageGroup: 'adult', sensitivities: [] },
  ],
  commute: {
    mode: 'car_petrol',
    distanceKm: 18,
    departs: '08:30',
    returns: '18:00',
  },
  cookingFuel: 'png',
  hasExhaust: true,
  hasPurifier: true,
  language: 'en',
};

describe('Impact Model Unit Tests (IMPACT_MODEL.md Section 7)', () => {
  // Test 1: Zero duration returns zero
  it('1. Zero duration returns zero', () => {
    const slices = getTimeSlices('08:00', '08:00');
    expect(slices).toHaveLength(0);

    const inhaled = calcInhaledUg(slices, () => 150, {
      ageGroup: 'adult',
      intensity: 'rest',
      env: 'outdoors',
    });
    expect(inhaled).toBe(0);
  });

  // Test 2: Identical baseline and alternative return no receipt (null), not 0
  it('2. Identical baseline and alternative return no receipt (null), not 0', () => {
    const inhaledBaseline = 50;
    const inhaledAlternative = 50;
    const exposureAvoided = calcExposureAvoided(inhaledBaseline, inhaledAlternative);
    expect(exposureAvoided).toBeNull();

    // Less than 1 µg avoided also returns null
    expect(calcExposureAvoided(50.5, 50.0)).toBeNull();
  });

  // Test 3: A masked hour outdoors inhales F_mask times the unmasked hour
  it('3. A masked hour outdoors inhales F_mask times the unmasked hour', () => {
    const slices = getTimeSlices('08:00', '09:00');
    expect(slices).toHaveLength(1);
    expect(slices[0].fraction).toBe(1.0);

    const hourlyPm25 = () => 100; // 100 µg/m³
    const unmasked = calcInhaledUg(slices, hourlyPm25, {
      ageGroup: 'adult',
      intensity: 'light',
      env: 'outdoors',
      mask: 'none',
    });

    const maskedN95 = calcInhaledUg(slices, hourlyPm25, {
      ageGroup: 'adult',
      intensity: 'light',
      env: 'outdoors',
      mask: 'n95',
    });

    expect(unmasked).not.toBeNull();
    expect(unmasked!).toBeGreaterThan(0);
    // N95 factor is 0.3
    expect(MASK_FACTORS.n95).toBe(0.3);
    expect(maskedN95).not.toBeNull();
    expect(maskedN95!).toBeCloseTo(unmasked! * 0.3, 5);
  });

  // Test 4: A period crossing an hour boundary weights each hour's concentration by the fraction spent in it
  it('4. A period crossing an hour boundary weights each hour by the fraction spent in it', () => {
    // 07:30 to 09:15 ->
    // 7:30 - 8:00 (0.5 hr) at hour 7
    // 8:00 - 9:00 (1.0 hr) at hour 8
    // 9:00 - 9:15 (0.25 hr) at hour 9
    const slices = getTimeSlices('07:30', '09:15');
    expect(slices).toEqual([
      { hour: 7, fraction: 0.5 },
      { hour: 8, fraction: 1.0 },
      { hour: 9, fraction: 0.25 },
    ]);

    // Suppose PM2.5 is: hour 7 = 100, hour 8 = 200, hour 9 = 40
    const pmLookup: Record<number, number> = { 7: 100, 8: 200, 9: 40 };
    // Adult rest: IR = 0.3 m³/h, outdoors: F_env = 1.0, mask: 1.0
    // Expected inhaled = (100 * 0.5 + 200 * 1.0 + 40 * 0.25) * 1.0 * 1.0 * 0.3
    //                  = (50 + 200 + 10) * 0.3 = 260 * 0.3 = 78 µg
    const inhaled = calcInhaledUg(slices, (h) => pmLookup[h] ?? 0, {
      ageGroup: 'adult',
      intensity: 'rest',
      env: 'outdoors',
    });
    expect(inhaled).toBeCloseTo(78.0, 5);
  });

  // Test 5: Car to metro over 18 km returns the expected kg from the table
  it('5. Car to metro over 18 km returns the expected kg from the table', () => {
    // Distance = 18 km
    // Baseline: car_petrol (EF = 170 g/pkm) -> 18 * 170 / 1000 = 3.06 kg
    // Alternative: metro (EF = 30 g/pkm) -> 18 * 30 / 1000 = 0.54 kg
    // Saved: 3.06 - 0.54 = 2.52 kg -> formatted to one decimal: 2.5 kg
    expect(EMISSION_FACTORS.car_petrol).toBe(170);
    expect(EMISSION_FACTORS.metro).toBe(30);

    const carKg = calcTravelCo2Kg('car_petrol', 18);
    expect(carKg).toBeCloseTo(3.06, 5);

    const metroKg = calcTravelCo2Kg('metro', 18);
    expect(metroKg).toBeCloseTo(0.54, 5);

    const savedKg = calcTravelCo2SavedKg('car_petrol', 'metro', 18);
    expect(savedKg).toBe(2.5);
  });

  // Test 6: Time-shift actions return co2SavedKg: null
  it('6. Time-shift actions return co2SavedKg: null', () => {
    // If modes are identical, saved CO2 should be null
    const saved = calcTravelCo2SavedKg('car_petrol', 'car_petrol', 18);
    expect(saved).toBeNull();

    const metroShift = calcTravelCo2SavedKg('metro', 'metro', 12);
    expect(metroShift).toBeNull();
  });

  // Test 7: Cigarette equivalents: 24 hours at a 22 µg/m³ difference returns 1.0
  it('7. Cigarette equivalents: 24 hours at a 22 µg/m³ difference returns 1.0', () => {
    const slices = getTimeSlices('00:00', '24:00');
    expect(slices).toHaveLength(24);

    // Baseline: outdoors (F_env = 1.0, F_mask = 1.0)
    // PM2.5 = 22 µg/m³ throughout
    // Alternative: 0 concentration (F_env = 0.0) -> difference = 22 µg/m³
    const cigs = calcCigarettesAvoided(
      slices,
      () => 22,
      { fEnv: 1.0, fMask: 1.0 },
      { fEnv: 0.0, fMask: 1.0 }
    );

    expect(cigs).not.toBeNull();
    expect(cigs!).toBeCloseTo(1.0, 5);
    expect(formatCigarettes(cigs!)).toBe('~1');
  });

  // Test 8: Missing forecast hour gives a null receipt
  it('8. Missing forecast hour gives a null receipt', () => {
    const points = [
      { hour: 7, pm2_5: 100 },
      { hour: 8, pm2_5: null }, // Missing hour!
      { hour: 9, pm2_5: 80 },
    ];
    const lookup = makePm25Lookup(points);

    // Slice crossing into hour 8
    const slices = getTimeSlices('07:30', '08:30');
    const inhaled = calcInhaledUg(slices, lookup, {
      ageGroup: 'adult',
      intensity: 'light',
      env: 'outdoors',
    });
    // Must be null because hour 8 is null
    expect(inhaled).toBeNull();

    const exposureAvoided = calcExposureAvoided(inhaled, 50);
    expect(exposureAvoided).toBeNull();

    const action: PlannedAction = {
      id: 'act_test_missing_hour',
      type: 'wear_mask',
      memberId: 'm1',
      start: '07:30',
      end: '08:30',
      title: 'Wear N95 Mask',
      reason: 'Protection during commute',
      params: { mask: 'n95' },
    };

    const impact = computeActionImpact(action, MOCK_PROFILE, lookup);
    expect(impact.exposureAvoidedUg).toBeNull();
  });

  // Test 9: Cigarette totals over two ticked actions equal the mathematical formula result
  it('9. Cigarette totals over two ticked actions equal the mathematical formula result', () => {
    // Action 1: keep_closed for 2 hours (10:00 to 12:00)
    // PM2.5 = 100 µg/m³. Baseline F_env = 0.9, Alt F_env = 0.5. Delta = 100 * (0.9 - 0.5) = 40 µg/m³.
    // Duration = 2 hours -> 40 * 2 = 80 µg·h/m³
    // Action 2: wear_mask for 1 hour (08:00 to 09:00)
    // PM2.5 = 200 µg/m³. Baseline F_mask = 1.0, Alt F_mask = 0.3. Delta = 200 * (1.0 - 0.3) = 140 µg/m³.
    // Duration = 1 hour -> 140 * 1 = 140 µg·h/m³
    // Total delta = 80 + 140 = 220 µg·h/m³
    // Denominator = 22 * 24 = 528
    // Expected cigarettes = 220 / 528 ≈ 0.41666...
    const lookup = (h: number) => (h === 8 ? 200 : 100);

    const action1: PlannedAction = {
      id: 'act1',
      type: 'keep_closed',
      memberId: null,
      start: '10:00',
      end: '12:00',
      title: 'Keep windows closed',
      reason: 'Prevents infiltration',
      params: {},
    };

    const action2: PlannedAction = {
      id: 'act2',
      type: 'wear_mask',
      memberId: 'm1',
      start: '08:00',
      end: '09:00',
      title: 'Wear N95 mask',
      reason: 'Filters vehicles exhaust',
      params: { mask: 'n95' },
    };

    const impact1 = computeActionImpact(action1, MOCK_PROFILE, lookup);
    const impact2 = computeActionImpact(action2, MOCK_PROFILE, lookup);

    const totalCigs = calcTotalCigarettesAvoided(
      [{ impact: impact1 }, { impact: impact2 }],
      lookup
    );

    const expectedCigs = (80 + 140) / (22 * 24);
    expect(totalCigs).toBeCloseTo(expectedCigs, 5);
    expect(formatCigarettes(totalCigs)).toBe('< 1');
  });

  // Test 10: A shift action's cigarette value uses its own baseline and alternative slices
  it('10. A shift action cigarette value uses its own baseline and alternative slices', () => {
    // Action: shift outdoor activity from 07:00-08:00 (peak PM2.5 = 300) to 14:00-15:00 (cleaner PM2.5 = 60)
    // Baseline slices: hour 7, PM2.5 = 300, F_env = 1.0, F_mask = 1.0 -> 300 * 1 = 300
    // Alternative slices: hour 14, PM2.5 = 60, F_env = 1.0, F_mask = 1.0 -> 60 * 1 = 60
    // Delta = 300 - 60 = 240 µg·h/m³
    // Expected cigarettes = 240 / 528 ≈ 0.4545...
    const lookup = (h: number) => (h === 7 ? 300 : h === 14 ? 60 : 150);

    const shiftAction: PlannedAction = {
      id: 'act_shift',
      type: 'shift_outdoor_activity',
      memberId: 'm1',
      start: '14:00',
      end: '15:00',
      title: 'Shift workout to afternoon',
      reason: 'Avoid morning peak inversion',
      params: { originalStart: '07:00', originalEnd: '08:00', intensity: 'moderate' },
    };

    const impact = computeActionImpact(shiftAction, MOCK_PROFILE, lookup);
    expect(impact.baselineSlices).toBeDefined();
    expect(impact.alternativeSlices).toBeDefined();
    expect(impact.baselineSlices?.[0].hour).toBe(7);
    expect(impact.alternativeSlices?.[0].hour).toBe(14);

    const cigs = calcActionCigarettesAvoided(
      impact.baselineSlices!,
      impact.alternativeSlices!,
      lookup
    );
    expect(cigs).not.toBeNull();
    expect(cigs!).toBeCloseTo(240 / (22 * 24), 5);
  });

  // Test 11: Totals exclude null-receipt actions
  it('11. Totals exclude null-receipt actions', () => {
    const points = [
      { hour: 7, pm2_5: 200 },
      { hour: 8, pm2_5: null }, // hour 8 missing
      { hour: 10, pm2_5: 100 },
      { hour: 11, pm2_5: 100 },
    ];
    const lookup = makePm25Lookup(points);

    // Action 1: Valid receipt (10:00 to 12:00)
    const validAction: PlannedAction = {
      id: 'act_valid',
      type: 'keep_closed',
      memberId: null,
      start: '10:00',
      end: '12:00',
      title: 'Keep windows closed',
      reason: 'Prevents infiltration',
      params: {},
    };

    // Action 2: Missing hour 8 (07:30 to 08:30) -> receipt is null
    const invalidAction: PlannedAction = {
      id: 'act_invalid',
      type: 'wear_mask',
      memberId: 'm1',
      start: '07:30',
      end: '08:30',
      title: 'Wear N95 mask',
      reason: 'Commute protection',
      params: { mask: 'n95' },
    };

    const impactValid = computeActionImpact(validAction, MOCK_PROFILE, lookup);
    const impactInvalid = computeActionImpact(invalidAction, MOCK_PROFILE, lookup);

    expect(impactValid.exposureAvoidedUg).not.toBeNull();
    expect(impactInvalid.exposureAvoidedUg).toBeNull(); // Missing hour drops out

    // calcTotalCigarettesAvoided should only count the valid action
    const totalCigs = calcTotalCigarettesAvoided(
      [{ impact: impactValid }, { impact: impactInvalid }],
      lookup
    );

    const singleActionCigs = calcActionCigarettesAvoided(
      impactValid.baselineSlices!,
      impactValid.alternativeSlices!,
      lookup
    );
    expect(totalCigs).toBeCloseTo(singleActionCigs!, 5);
  });
});
