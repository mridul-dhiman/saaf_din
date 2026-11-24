import { PlannedAction, Profile, Member, EffectiveSlice } from '../../types';
import { calcExposureAvoided, calcInhaledUg, getTimeSlices } from './exposure';
import { calcTravelCo2SavedKg } from './emissions';
import { ENV_FACTORS, MASK_FACTORS, EnvFactorKey, MaskFactorKey } from './constants';

export interface ActionImpactResult {
  exposureAvoidedUg: number | null;
  co2SavedKg: number | null;
  baselineSlices?: EffectiveSlice[];
  alternativeSlices?: EffectiveSlice[];
  details?: string;
}

/**
 * Computes the impact receipt for any PlannedAction given the profile and forecast PM2.5 function.
 * Strictly adheres to the rule: model chooses & explains; code calculates.
 */
export function computeActionImpact(
  action: PlannedAction,
  profile: Profile,
  getHourlyPm25: (hour: number) => number | null
): ActionImpactResult {
  const slices = getTimeSlices(action.start, action.end);
  const member: Member | undefined = action.memberId
    ? profile.members.find((m) => m.id === action.memberId)
    : profile.members[0];

  const ageGroup = member?.ageGroup ?? 'adult';

  switch (action.type) {
    case 'keep_closed': {
      const fEnvBase = ENV_FACTORS['indoors_open'];
      const fEnvAlt = ENV_FACTORS['indoors_closed'];
      const fMask = MASK_FACTORS['none'];

      // Baseline: windows open vs Alternative: windows closed
      const baselineInhaled = calcInhaledUg(slices, getHourlyPm25, {
        ageGroup,
        intensity: 'rest',
        env: 'indoors_open',
      });
      const altInhaled = calcInhaledUg(slices, getHourlyPm25, {
        ageGroup,
        intensity: 'rest',
        env: 'indoors_closed',
      });
      return {
        exposureAvoidedUg: calcExposureAvoided(baselineInhaled, altInhaled),
        co2SavedKg: null,
        baselineSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: fEnvBase, fMask })),
        alternativeSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: fEnvAlt, fMask })),
      };
    }

    case 'run_purifier': {
      const fEnvBase = ENV_FACTORS['indoors_closed'];
      const fEnvAlt = ENV_FACTORS['indoors_closed_purifier'];
      const fMask = MASK_FACTORS['none'];

      // Baseline: indoors closed without purifier vs Alternative: indoors closed with purifier
      const baselineInhaled = calcInhaledUg(slices, getHourlyPm25, {
        ageGroup,
        intensity: 'rest',
        env: 'indoors_closed',
      });
      const altInhaled = calcInhaledUg(slices, getHourlyPm25, {
        ageGroup,
        intensity: 'rest',
        env: 'indoors_closed_purifier',
      });
      return {
        exposureAvoidedUg: calcExposureAvoided(baselineInhaled, altInhaled),
        co2SavedKg: null,
        baselineSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: fEnvBase, fMask })),
        alternativeSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: fEnvAlt, fMask })),
      };
    }

    case 'wear_mask': {
      // Baseline: outdoors without mask vs Alternative: outdoors with mask
      const rawMask = (action.params?.mask as string) || 'n95';
      const maskType: MaskFactorKey = (rawMask in MASK_FACTORS) ? (rawMask as MaskFactorKey) : 'n95';
      const fEnv = ENV_FACTORS['outdoors'];
      const fMaskBase = MASK_FACTORS['none'];
      const fMaskAlt = MASK_FACTORS[maskType];
      const intensity = (action.params?.intensity as any) || 'light';

      const baselineInhaled = calcInhaledUg(slices, getHourlyPm25, {
        ageGroup,
        intensity,
        env: 'outdoors',
        mask: 'none',
      });
      const altInhaled = calcInhaledUg(slices, getHourlyPm25, {
        ageGroup,
        intensity,
        env: 'outdoors',
        mask: maskType,
      });
      return {
        exposureAvoidedUg: calcExposureAvoided(baselineInhaled, altInhaled),
        co2SavedKg: null,
        baselineSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv, fMask: fMaskBase })),
        alternativeSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv, fMask: fMaskAlt })),
      };
    }

    case 'move_activity_indoors': {
      // Baseline: outdoors vs Alternative: indoors closed (with or without purifier)
      const intensity = (action.params?.intensity as any) || 'moderate';
      const targetEnv: EnvFactorKey = profile.hasPurifier ? 'indoors_closed_purifier' : 'indoors_closed';
      const fEnvBase = ENV_FACTORS['outdoors'];
      const fEnvAlt = ENV_FACTORS[targetEnv];
      const fMask = MASK_FACTORS['none'];

      const baselineInhaled = calcInhaledUg(slices, getHourlyPm25, {
        ageGroup,
        intensity,
        env: 'outdoors',
      });
      const altInhaled = calcInhaledUg(slices, getHourlyPm25, {
        ageGroup,
        intensity,
        env: targetEnv,
      });
      return {
        exposureAvoidedUg: calcExposureAvoided(baselineInhaled, altInhaled),
        co2SavedKg: null,
        baselineSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: fEnvBase, fMask })),
        alternativeSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: fEnvAlt, fMask })),
      };
    }

    case 'shift_outdoor_activity': {
      // Activity shifted from original peak time to action.start - action.end
      const originalStart = (action.params?.originalStart as string) || '07:00';
      const originalEnd = (action.params?.originalEnd as string) || '08:00';
      const originalSlices = getTimeSlices(originalStart, originalEnd);
      const intensity = (action.params?.intensity as any) || 'moderate';
      const fEnv = ENV_FACTORS['outdoors'];
      const fMask = MASK_FACTORS['none'];

      const baselineInhaled = calcInhaledUg(originalSlices, getHourlyPm25, {
        ageGroup,
        intensity,
        env: 'outdoors',
      });
      const altInhaled = calcInhaledUg(slices, getHourlyPm25, {
        ageGroup,
        intensity,
        env: 'outdoors',
      });
      return {
        exposureAvoidedUg: calcExposureAvoided(baselineInhaled, altInhaled),
        co2SavedKg: null, // Shifting outdoor time does not save CO2
        baselineSlices: originalSlices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv, fMask })),
        alternativeSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv, fMask })),
      };
    }

    case 'change_commute_mode': {
      const baselineMode = (action.params?.baselineMode as any) || profile.commute.mode;
      const targetMode = (action.params?.targetMode as any) || 'metro';
      const distanceKm = Number(action.params?.distanceKm) || profile.commute.distanceKm;

      // Inhaled calculation
      const baselineEnv: EnvFactorKey = baselineMode === 'metro' ? 'metro' : baselineMode === 'bus' ? 'bus' : 'car_closed_recirc';
      const targetEnv: EnvFactorKey = targetMode === 'metro' ? 'metro' : targetMode === 'bus' ? 'bus' : 'outdoors';
      const baseFenv = ENV_FACTORS[baselineEnv];
      const targetFenv = ENV_FACTORS[targetEnv];
      const fMask = MASK_FACTORS['none'];

      const baselineInhaled = calcInhaledUg(slices, getHourlyPm25, {
        ageGroup,
        intensity: 'light',
        env: baselineEnv,
      });
      const altInhaled = calcInhaledUg(slices, getHourlyPm25, {
        ageGroup,
        intensity: 'light',
        env: targetEnv,
      });

      const co2Saved = calcTravelCo2SavedKg(baselineMode, targetMode, distanceKm);
      return {
        exposureAvoidedUg: calcExposureAvoided(baselineInhaled, altInhaled),
        co2SavedKg: co2Saved,
        baselineSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: baseFenv, fMask })),
        alternativeSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: targetFenv, fMask })),
      };
    }

    case 'shift_commute_time': {
      const originalStart = (action.params?.originalStart as string) || profile.commute.departs;
      const originalEnd = (action.params?.originalEnd as string) || '09:30';
      const originalSlices = getTimeSlices(originalStart, originalEnd);
      const mode = (action.params?.mode as any) || profile.commute.mode;
      const env: EnvFactorKey = mode === 'metro' ? 'metro' : mode === 'bus' ? 'bus' : 'car_closed_recirc';
      const envF = ENV_FACTORS[env];
      const fMask = MASK_FACTORS['none'];

      const baselineInhaled = calcInhaledUg(originalSlices, getHourlyPm25, {
        ageGroup,
        intensity: 'light',
        env,
      });
      const altInhaled = calcInhaledUg(slices, getHourlyPm25, {
        ageGroup,
        intensity: 'light',
        env,
      });

      return {
        exposureAvoidedUg: calcExposureAvoided(baselineInhaled, altInhaled),
        co2SavedKg: null, // Time shift saves no CO2
        baselineSlices: originalSlices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: envF, fMask })),
        alternativeSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: envF, fMask })),
      };
    }

    case 'ventilate': {
      // Opening windows during clean air window
      // Exposure avoided compared to opening during peak polluted hours
      const worstStart = (action.params?.worstStart as string) || '08:00';
      const worstEnd = (action.params?.worstEnd as string) || '10:00';
      const worstSlices = getTimeSlices(worstStart, worstEnd);
      const fEnv = ENV_FACTORS['indoors_open'];
      const fMask = MASK_FACTORS['none'];

      const baselineInhaled = calcInhaledUg(worstSlices, getHourlyPm25, {
        ageGroup,
        intensity: 'rest',
        env: 'indoors_open',
      });
      const altInhaled = calcInhaledUg(slices, getHourlyPm25, {
        ageGroup,
        intensity: 'rest',
        env: 'indoors_open',
      });

      return {
        exposureAvoidedUg: calcExposureAvoided(baselineInhaled, altInhaled),
        co2SavedKg: null,
        baselineSlices: worstSlices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv, fMask })),
        alternativeSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv, fMask })),
      };
    }

    case 'use_exhaust_while_cooking':
    case 'avoid_indoor_combustion':
    default:
      // In accordance with IMPACT_MODEL.md section 1:
      // Indoor sources add exposure independently of outdoor forecast and have no direct measurement.
      // Show no exposure figure and let the reason text carry it.
      return {
        exposureAvoidedUg: null,
        co2SavedKg: null,
      };
  }
}
