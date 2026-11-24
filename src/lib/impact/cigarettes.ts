import { CIGARETTE_HOURS_DENOMINATOR } from './constants';
import { ExposureSlice } from './exposure';
import { EffectiveSlice } from '../../types';

export type { EffectiveSlice };

export interface EffectiveConcentrationParams {
  fEnv: number;
  fMask: number;
}

/**
 * Calculates cigarette equivalents avoided for an action given its baseline and alternative slices.
 * Formula per IMPACT_MODEL.md section 2:
 * cigarettes = (Σ baseline C_out·F_env·F_mask·Δt − Σ alternative C_out·F_env·F_mask·Δt) / (22 × 24)
 * Returns null if any required hour in baseline or alternative slices has null PM2.5.
 * Treats a result <= 0 as 0.
 */
export function calcActionCigarettesAvoided(
  baselineSlices: EffectiveSlice[],
  alternativeSlices: EffectiveSlice[],
  getHourlyPm25: (hour: number) => number | null
): number | null {
  if (baselineSlices.length === 0 && alternativeSlices.length === 0) return 0;

  let sumBaseline = 0;
  for (const s of baselineSlices) {
    const cOut = getHourlyPm25(s.hour);
    if (cOut === null || isNaN(cOut)) return null;
    sumBaseline += cOut * s.fEnv * s.fMask * s.fraction;
  }

  let sumAlt = 0;
  for (const s of alternativeSlices) {
    const cOut = getHourlyPm25(s.hour);
    if (cOut === null || isNaN(cOut)) return null;
    sumAlt += cOut * s.fEnv * s.fMask * s.fraction;
  }

  const delta = sumBaseline - sumAlt;
  if (delta <= 0) return 0;
  return delta / CIGARETTE_HOURS_DENOMINATOR;
}

/**
 * Calculates cigarette equivalents avoided based on Berkeley Earth rule:
 * breathing air at 22 µg/m³ PM2.5 for 24 hours ≈ 1 cigarette (528 µg·h/m³).
 */
export function calcCigarettesAvoided(
  slices: ExposureSlice[],
  getHourlyPm25: (hour: number) => number | null,
  baseline: EffectiveConcentrationParams,
  alternative: EffectiveConcentrationParams
): number | null {
  const baseSlices: EffectiveSlice[] = slices.map((s) => ({
    hour: s.hour,
    fraction: s.fraction,
    fEnv: baseline.fEnv,
    fMask: baseline.fMask,
  }));
  const altSlices: EffectiveSlice[] = slices.map((s) => ({
    hour: s.hour,
    fraction: s.fraction,
    fEnv: alternative.fEnv,
    fMask: alternative.fMask,
  }));
  return calcActionCigarettesAvoided(baseSlices, altSlices, getHourlyPm25);
}

export interface ActionWithReceipt {
  impact: {
    exposureAvoidedUg: number | null;
    co2SavedKg: number | null;
    baselineSlices?: EffectiveSlice[];
    alternativeSlices?: EffectiveSlice[];
  };
}

/**
 * Calculates total cigarette equivalents avoided across qualifying actions.
 * Only actions whose cigarette value is non-null are counted.
 * If an action's hours are missing or slices are absent, it drops out of the cigarette sum.
 */
export function calcTotalCigarettesAvoided(
  actions: ActionWithReceipt[],
  getHourlyPm25: (hour: number) => number | null
): number {
  let totalCigs = 0;
  for (const act of actions) {
    if (!act.impact.baselineSlices || !act.impact.alternativeSlices) continue;

    const actionCigs = calcActionCigarettesAvoided(
      act.impact.baselineSlices,
      act.impact.alternativeSlices,
      getHourlyPm25
    );
    if (actionCigs !== null && actionCigs > 0) {
      totalCigs += actionCigs;
    }
  }
  return totalCigs;
}

/**
 * Formats cigarette equivalents for presentation in daily/weekly totals:
 * e.g., "~2" or "< 1" or "0"
 */
export function formatCigarettes(cigs: number): string {
  if (cigs <= 0) return '0';
  if (cigs < 0.5) return '< 1';
  return `~${Math.round(cigs)}`;
}
