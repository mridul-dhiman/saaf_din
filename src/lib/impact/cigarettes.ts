import { CIGARETTE_HOURS_DENOMINATOR } from './constants';
import { ExposureSlice } from './exposure';

export interface EffectiveConcentrationParams {
  fEnv: number;
  fMask: number;
}

/**
 * Calculates cigarette equivalents avoided based on Berkeley Earth rule:
 * breathing air at 22 µg/m³ PM2.5 for 24 hours ≈ 1 cigarette (528 µg·h/m³).
 *
 * Formula:
 * cigarettes_avoided = Σ over hours ( (C_eff_baseline[h] - C_eff_alternative[h]) × fraction_of_hour ) / (22 × 24)
 * where C_eff = C_outdoor × F_env × F_mask
 *
 * Used only for daily and weekly totals, formatted with "~".
 */
export function calcCigarettesAvoided(
  slices: ExposureSlice[],
  getHourlyPm25: (hour: number) => number,
  baseline: EffectiveConcentrationParams,
  alternative: EffectiveConcentrationParams
): number {
  if (slices.length === 0) return 0;

  let totalEffectiveDeltaUgHours = 0;
  for (const slice of slices) {
    const cOutdoor = getHourlyPm25(slice.hour) || 0;
    const cEffBaseline = cOutdoor * baseline.fEnv * baseline.fMask;
    const cEffAlt = cOutdoor * alternative.fEnv * alternative.fMask;
    const delta = cEffBaseline - cEffAlt;
    if (delta > 0) {
      totalEffectiveDeltaUgHours += delta * slice.fraction;
    }
  }

  const cigs = totalEffectiveDeltaUgHours / CIGARETTE_HOURS_DENOMINATOR;
  return cigs;
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
