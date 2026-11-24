import { AgeGroup, Intensity } from '../../types';
import {
  ENV_FACTORS,
  INHALATION_RATES,
  MASK_FACTORS,
  EnvFactorKey,
  MaskFactorKey,
} from './constants';

export interface ExposureSlice {
  hour: number;
  fraction: number;
}

/**
 * Splits a time range (HH:mm to HH:mm) into hourly fractions.
 * e.g., "07:30" to "09:15" ->
 *   [{ hour: 7, fraction: 0.5 }, { hour: 8, fraction: 1.0 }, { hour: 9, fraction: 0.25 }]
 */
export function getTimeSlices(startStr: string, endStr: string): ExposureSlice[] {
  const [startH, startM] = startStr.split(':').map(Number);
  const [endH, endM] = endStr.split(':').map(Number);

  if (
    isNaN(startH) || isNaN(startM) ||
    isNaN(endH) || isNaN(endM)
  ) {
    return [];
  }

  const startTotalMinutes = startH * 60 + startM;
  let endTotalMinutes = endH * 60 + endM;

  // If end is earlier than start, it wraps to next day
  if (endTotalMinutes < startTotalMinutes) {
    endTotalMinutes += 24 * 60;
  }

  if (endTotalMinutes <= startTotalMinutes) {
    return [];
  }

  const slices: ExposureSlice[] = [];
  let current = startTotalMinutes;

  while (current < endTotalMinutes) {
    const currentHourIndex = Math.floor(current / 60) % 24;
    const nextHourMark = (Math.floor(current / 60) + 1) * 60;
    const sliceEnd = Math.min(nextHourMark, endTotalMinutes);
    const durationMinutes = sliceEnd - current;
    const fraction = durationMinutes / 60;

    if (fraction > 0) {
      slices.push({
        hour: currentHourIndex,
        fraction,
      });
    }

    current = sliceEnd;
  }

  return slices;
}

export interface ActivityContext {
  ageGroup: AgeGroup;
  intensity: Intensity;
  env: EnvFactorKey;
  mask?: MaskFactorKey;
  fEnvOverride?: number;
  fMaskOverride?: number;
}

/**
 * Creates an hourly PM2.5 lookup function from forecast points.
 * Returns null if the requested hour has null/missing PM2.5 or is not found in points.
 * Built from the points array so Phase 4 can switch to timestamp keys without touching callers.
 */
export function makePm25Lookup(
  points: { hour?: number; pm2_5: number | null; time?: string }[]
): (hour: number) => number | null {
  const map = new Map<number, number | null>();
  for (const pt of points) {
    let h = pt.hour;
    if (h === undefined && pt.time) {
      const parsed = parseInt(pt.time.split('T')[1]?.split(':')[0] ?? '', 10);
      if (!isNaN(parsed)) {
        h = parsed;
      }
    }
    if (h !== undefined) {
      map.set(h, pt.pm2_5 !== undefined ? pt.pm2_5 : null);
    }
  }
  return (hour: number) => {
    const val = map.get(hour);
    return val !== undefined ? val : null;
  };
}

/**
 * Calculates inhaled PM2.5 (in micrograms, µg) for a specified period and activity context.
 * Formula: Σ over hours ( C_outdoor[h] × F_env × F_mask × IR × fraction_of_hour )
 * Returns null if any required hour in the slices has missing (null) concentration.
 */
export function calcInhaledUg(
  slices: ExposureSlice[],
  getHourlyPm25: (hour: number) => number | null,
  context: ActivityContext
): number | null {
  if (slices.length === 0) return 0;

  const ir = INHALATION_RATES[context.intensity][context.ageGroup];
  const fEnv = context.fEnvOverride ?? ENV_FACTORS[context.env];
  const fMask = context.fMaskOverride ?? (context.mask ? MASK_FACTORS[context.mask] : 1.0);

  let totalInhaled = 0;
  for (const slice of slices) {
    const cOutdoor = getHourlyPm25(slice.hour);
    if (cOutdoor === null || isNaN(cOutdoor)) {
      return null;
    }
    totalInhaled += cOutdoor * fEnv * fMask * ir * slice.fraction;
  }

  return totalInhaled;
}

/**
 * Calculates PM2.5 exposure avoided between baseline and alternative scenarios.
 * Returns null if either baseline or alternative is null, or avoided exposure is <= 0 or < 1 µg.
 * Rounds to whole µg.
 */
export function calcExposureAvoided(
  baselineInhaled: number | null,
  alternativeInhaled: number | null
): number | null {
  if (baselineInhaled === null || alternativeInhaled === null) {
    return null;
  }
  const avoided = baselineInhaled - alternativeInhaled;
  // If baseline and alternative are identical or avoided is under 1 µg, show no pill
  if (avoided < 1.0) {
    return null;
  }
  return Math.round(avoided);
}
