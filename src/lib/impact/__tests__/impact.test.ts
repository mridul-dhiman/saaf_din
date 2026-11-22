import { describe, it, expect } from 'vitest';
import {
  calcInhaledUg,
  calcExposureAvoided,
  getTimeSlices,
} from '../exposure';
import { calcTravelCo2Kg, calcTravelCo2SavedKg } from '../emissions';
import { calcCigarettesAvoided, formatCigarettes } from '../cigarettes';
import { MASK_FACTORS, EMISSION_FACTORS } from '../constants';

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

    expect(unmasked).toBeGreaterThan(0);
    // N95 factor is 0.3
    expect(MASK_FACTORS.n95).toBe(0.3);
    expect(maskedN95).toBeCloseTo(unmasked * 0.3, 5);
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

    expect(cigs).toBeCloseTo(1.0, 5);
    expect(formatCigarettes(cigs)).toBe('~1');
  });
});
