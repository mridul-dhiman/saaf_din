import {
  PlannedAction,
  Profile,
  Member,
  EffectiveSlice,
  ActionCalculationBreakdown,
  MemberExposureBreakdown,
  TravelMode,
  Intensity,
} from '../../types';
import { calcExposureAvoided, calcInhaledUg, getTimeSlices } from './exposure';
import { calcTravelCo2SavedKg } from './emissions';
import {
  ENV_FACTORS,
  MASK_FACTORS,
  INHALATION_RATES,
  EMISSION_FACTORS,
  MODE_TO_ENV,
  MODE_TO_INTENSITY,
  PURIFIER_WATTS,
  GRID_KG_CO2_PER_KWH,
  EnvFactorKey,
  MaskFactorKey,
} from './constants';

export interface ActionImpactResult {
  exposureAvoidedUg: number | null;
  co2SavedKg: number | null;
  baselineSlices?: EffectiveSlice[];
  alternativeSlices?: EffectiveSlice[];
  calculationBreakdown?: ActionCalculationBreakdown;
  details?: string;
}

/**
 * Computes the impact receipt for any PlannedAction given the profile and forecast PM2.5 function.
 * Strictly adheres to:
 * 1. Model chooses & explains; code calculates.
 * 2. Household actions (memberId === null) sum the impact over ALL members in profile, each with their own age group.
 * 3. Mode -> environment mapping uses typed MODE_TO_ENV table in constants.ts.
 * 4. run_purifier computes the purifier's CO2 cost (PURIFIER_WATTS & GRID_KG_CO2_PER_KWH) in calculationBreakdown without its own pill.
 * 5. Fills calculationBreakdown for every action type.
 */
export function computeActionImpact(
  action: PlannedAction,
  profile: Profile,
  getHourlyPm25: (hour: number) => number | null
): ActionImpactResult {
  const slices = getTimeSlices(action.start, action.end);
  const durationHours = slices.reduce((acc, s) => acc + s.fraction, 0);
  const hoursUsed = slices.map((s) => s.hour);
  const hourlyPm25 = slices.map((s) => ({ hour: s.hour, pm2_5: getHourlyPm25(s.hour) }));

  const isHousehold = action.memberId === null;
  let targetMembers: Member[] = [];
  if (isHousehold) {
    targetMembers = profile.members;
  } else {
    const foundMember = profile.members.find((m) => m.id === action.memberId);
    if (!foundMember) {
      // A member-specific action without a valid member returns null figures
      return {
        exposureAvoidedUg: null,
        co2SavedKg: null,
      };
    }
    targetMembers = [foundMember];
  }

  switch (action.type) {
    case 'keep_closed': {
      const fEnvBase = ENV_FACTORS['indoors_open'];
      const fEnvAlt = ENV_FACTORS['indoors_closed'];
      const fMaskBase = MASK_FACTORS['none'];
      const fMaskAlt = MASK_FACTORS['none'];

      const memberBreakdown: MemberExposureBreakdown[] = [];
      let totalBaseUg = 0;
      let totalAltUg = 0;
      let anyNull = false;

      for (const m of targetMembers) {
        const ir = INHALATION_RATES['rest'][m.ageGroup];
        const mBase = calcInhaledUg(slices, getHourlyPm25, {
          ageGroup: m.ageGroup,
          intensity: 'rest',
          env: 'indoors_open',
        });
        const mAlt = calcInhaledUg(slices, getHourlyPm25, {
          ageGroup: m.ageGroup,
          intensity: 'rest',
          env: 'indoors_closed',
        });

        if (mBase === null || mAlt === null) {
          anyNull = true;
        } else {
          totalBaseUg += mBase;
          totalAltUg += mAlt;
        }

        const mAvoided = calcExposureAvoided(mBase, mAlt);
        memberBreakdown.push({
          memberId: m.id,
          memberName: m.name,
          ageGroup: m.ageGroup,
          ir,
          baselineInhaledUg: mBase !== null ? Math.round(mBase) : null,
          altInhaledUg: mAlt !== null ? Math.round(mAlt) : null,
          avoidedUg: mAvoided,
        });
      }

      const totalAvoided = anyNull ? null : calcExposureAvoided(totalBaseUg, totalAltUg);

      return {
        exposureAvoidedUg: totalAvoided,
        co2SavedKg: null,
        baselineSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: fEnvBase, fMask: fMaskBase })),
        alternativeSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: fEnvAlt, fMask: fMaskAlt })),
        calculationBreakdown: {
          durationHours,
          hoursUsed,
          hourlyPm25,
          fEnvBase,
          fEnvAlt,
          fMaskBase,
          fMaskAlt,
          ir: !isHousehold ? INHALATION_RATES['rest'][targetMembers[0]?.ageGroup || 'adult'] : undefined,
          baselineTotalUg: anyNull ? null : Math.round(totalBaseUg),
          alternativeTotalUg: anyNull ? null : Math.round(totalAltUg),
          isHousehold,
          memberBreakdown: isHousehold ? memberBreakdown : undefined,
        },
      };
    }

    case 'run_purifier': {
      const fEnvBase = ENV_FACTORS['indoors_closed'];
      const fEnvAlt = ENV_FACTORS['indoors_closed_purifier'];
      const fMaskBase = MASK_FACTORS['none'];
      const fMaskAlt = MASK_FACTORS['none'];

      const memberBreakdown: MemberExposureBreakdown[] = [];
      let totalBaseUg = 0;
      let totalAltUg = 0;
      let anyNull = false;

      for (const m of targetMembers) {
        const ir = INHALATION_RATES['rest'][m.ageGroup];
        const mBase = calcInhaledUg(slices, getHourlyPm25, {
          ageGroup: m.ageGroup,
          intensity: 'rest',
          env: 'indoors_closed',
        });
        const mAlt = calcInhaledUg(slices, getHourlyPm25, {
          ageGroup: m.ageGroup,
          intensity: 'rest',
          env: 'indoors_closed_purifier',
        });

        if (mBase === null || mAlt === null) {
          anyNull = true;
        } else {
          totalBaseUg += mBase;
          totalAltUg += mAlt;
        }

        const mAvoided = calcExposureAvoided(mBase, mAlt);
        memberBreakdown.push({
          memberId: m.id,
          memberName: m.name,
          ageGroup: m.ageGroup,
          ir,
          baselineInhaledUg: mBase !== null ? Math.round(mBase) : null,
          altInhaledUg: mAlt !== null ? Math.round(mAlt) : null,
          avoidedUg: mAvoided,
        });
      }

      const totalAvoided = anyNull ? null : calcExposureAvoided(totalBaseUg, totalAltUg);

      // Compute purifier electrical CO2 cost (not displayed as its own pill, but shown in receipt)
      const kWh = (PURIFIER_WATTS * durationHours) / 1000;
      const co2CostKg = Number((kWh * GRID_KG_CO2_PER_KWH).toFixed(2));

      return {
        exposureAvoidedUg: totalAvoided,
        co2SavedKg: null,
        baselineSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: fEnvBase, fMask: fMaskBase })),
        alternativeSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: fEnvAlt, fMask: fMaskAlt })),
        calculationBreakdown: {
          durationHours,
          hoursUsed,
          hourlyPm25,
          fEnvBase,
          fEnvAlt,
          fMaskBase,
          fMaskAlt,
          ir: !isHousehold ? INHALATION_RATES['rest'][targetMembers[0]?.ageGroup || 'adult'] : undefined,
          baselineTotalUg: anyNull ? null : Math.round(totalBaseUg),
          alternativeTotalUg: anyNull ? null : Math.round(totalAltUg),
          co2CostKg,
          isHousehold,
          memberBreakdown: isHousehold ? memberBreakdown : undefined,
        },
      };
    }

    case 'ventilate': {
      // Opening windows during clean air window vs worst peak pollution window
      const worstStart = action.params?.worstStart as string | undefined;
      const worstEnd = action.params?.worstEnd as string | undefined;

      if (!worstStart || !worstEnd) {
        // With no worst window, the ventilate action has no receipt
        return {
          exposureAvoidedUg: null,
          co2SavedKg: null,
          calculationBreakdown: {
            durationHours,
            hoursUsed,
            hourlyPm25,
            fEnvBase: ENV_FACTORS['indoors_open'],
            fEnvAlt: ENV_FACTORS['indoors_open'],
            fMaskBase: MASK_FACTORS['none'],
            fMaskAlt: MASK_FACTORS['none'],
            baselineTotalUg: null,
            alternativeTotalUg: null,
            isHousehold,
          },
        };
      }

      const worstSlices = getTimeSlices(worstStart, worstEnd);

      const fEnvBase = ENV_FACTORS['indoors_open'];
      const fEnvAlt = ENV_FACTORS['indoors_open'];
      const fMaskBase = MASK_FACTORS['none'];
      const fMaskAlt = MASK_FACTORS['none'];

      const memberBreakdown: MemberExposureBreakdown[] = [];
      let totalBaseUg = 0;
      let totalAltUg = 0;
      let anyNull = false;

      for (const m of targetMembers) {
        const ir = INHALATION_RATES['rest'][m.ageGroup];
        const mBase = calcInhaledUg(worstSlices, getHourlyPm25, {
          ageGroup: m.ageGroup,
          intensity: 'rest',
          env: 'indoors_open',
        });
        const mAlt = calcInhaledUg(slices, getHourlyPm25, {
          ageGroup: m.ageGroup,
          intensity: 'rest',
          env: 'indoors_open',
        });

        if (mBase === null || mAlt === null) {
          anyNull = true;
        } else {
          totalBaseUg += mBase;
          totalAltUg += mAlt;
        }

        const mAvoided = calcExposureAvoided(mBase, mAlt);
        memberBreakdown.push({
          memberId: m.id,
          memberName: m.name,
          ageGroup: m.ageGroup,
          ir,
          baselineInhaledUg: mBase !== null ? Math.round(mBase) : null,
          altInhaledUg: mAlt !== null ? Math.round(mAlt) : null,
          avoidedUg: mAvoided,
        });
      }

      const totalAvoided = anyNull ? null : calcExposureAvoided(totalBaseUg, totalAltUg);

      return {
        exposureAvoidedUg: totalAvoided,
        co2SavedKg: null,
        baselineSlices: worstSlices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: fEnvBase, fMask: fMaskBase })),
        alternativeSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: fEnvAlt, fMask: fMaskAlt })),
        calculationBreakdown: {
          durationHours,
          hoursUsed,
          hourlyPm25,
          fEnvBase,
          fEnvAlt,
          fMaskBase,
          fMaskAlt,
          ir: !isHousehold ? INHALATION_RATES['rest'][targetMembers[0]?.ageGroup || 'adult'] : undefined,
          baselineTotalUg: anyNull ? null : Math.round(totalBaseUg),
          alternativeTotalUg: anyNull ? null : Math.round(totalAltUg),
          isHousehold,
          memberBreakdown: isHousehold ? memberBreakdown : undefined,
        },
      };
    }

    case 'wear_mask': {
      const rawMask = (action.params?.mask as string) || 'n95';
      const maskType: MaskFactorKey = (rawMask in MASK_FACTORS) ? (rawMask as MaskFactorKey) : 'n95';
      const intensity = (action.params?.intensity as Intensity) || 'light';

      const fEnvBase = ENV_FACTORS['outdoors'];
      const fEnvAlt = ENV_FACTORS['outdoors'];
      const fMaskBase = MASK_FACTORS['none'];
      const fMaskAlt = MASK_FACTORS[maskType];

      const targetMember = targetMembers[0];
      const ageGroup = targetMember.ageGroup;
      const ir = INHALATION_RATES[intensity][ageGroup];

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

      const avoidedUg = calcExposureAvoided(baselineInhaled, altInhaled);

      return {
        exposureAvoidedUg: avoidedUg,
        co2SavedKg: null,
        baselineSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: fEnvBase, fMask: fMaskBase })),
        alternativeSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: fEnvAlt, fMask: fMaskAlt })),
        calculationBreakdown: {
          durationHours,
          hoursUsed,
          hourlyPm25,
          fEnvBase,
          fEnvAlt,
          fMaskBase,
          fMaskAlt,
          ir,
          baselineTotalUg: baselineInhaled !== null ? Math.round(baselineInhaled) : null,
          alternativeTotalUg: altInhaled !== null ? Math.round(altInhaled) : null,
          isHousehold: false,
        },
      };
    }

    case 'move_activity_indoors': {
      const intensity = (action.params?.intensity as Intensity) || 'moderate';
      const targetEnv: EnvFactorKey = profile.hasPurifier ? 'indoors_closed_purifier' : 'indoors_closed';
      const fEnvBase = ENV_FACTORS['outdoors'];
      const fEnvAlt = ENV_FACTORS[targetEnv];
      const fMaskBase = MASK_FACTORS['none'];
      const fMaskAlt = MASK_FACTORS['none'];

      const targetMember = targetMembers[0];
      const ageGroup = targetMember.ageGroup;
      const ir = INHALATION_RATES[intensity][ageGroup];

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

      const avoidedUg = calcExposureAvoided(baselineInhaled, altInhaled);

      return {
        exposureAvoidedUg: avoidedUg,
        co2SavedKg: null,
        baselineSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: fEnvBase, fMask: fMaskBase })),
        alternativeSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: fEnvAlt, fMask: fMaskAlt })),
        calculationBreakdown: {
          durationHours,
          hoursUsed,
          hourlyPm25,
          fEnvBase,
          fEnvAlt,
          fMaskBase,
          fMaskAlt,
          ir,
          baselineTotalUg: baselineInhaled !== null ? Math.round(baselineInhaled) : null,
          alternativeTotalUg: altInhaled !== null ? Math.round(altInhaled) : null,
          isHousehold: false,
        },
      };
    }

    case 'shift_outdoor_activity': {
      const originalStart = (action.params?.originalStart as string) || '07:00';
      const originalEnd = (action.params?.originalEnd as string) || '08:00';
      const originalSlices = getTimeSlices(originalStart, originalEnd);
      const intensity = (action.params?.intensity as Intensity) || 'moderate';
      const fEnvBase = ENV_FACTORS['outdoors'];
      const fEnvAlt = ENV_FACTORS['outdoors'];
      const fMaskBase = MASK_FACTORS['none'];
      const fMaskAlt = MASK_FACTORS['none'];

      const targetMember = targetMembers[0];
      const ageGroup = targetMember.ageGroup;
      const ir = INHALATION_RATES[intensity][ageGroup];

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

      const avoidedUg = calcExposureAvoided(baselineInhaled, altInhaled);

      return {
        exposureAvoidedUg: avoidedUg,
        co2SavedKg: null,
        baselineSlices: originalSlices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: fEnvBase, fMask: fMaskBase })),
        alternativeSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: fEnvAlt, fMask: fMaskAlt })),
        calculationBreakdown: {
          durationHours,
          hoursUsed,
          hourlyPm25,
          fEnvBase,
          fEnvAlt,
          fMaskBase,
          fMaskAlt,
          ir,
          baselineTotalUg: baselineInhaled !== null ? Math.round(baselineInhaled) : null,
          alternativeTotalUg: altInhaled !== null ? Math.round(altInhaled) : null,
          isHousehold: false,
        },
      };
    }

    case 'change_commute_mode': {
      const baselineMode: TravelMode = (action.params?.baselineMode as TravelMode) || profile.commute.mode;
      const targetMode: TravelMode = (action.params?.targetMode as TravelMode) || 'metro';
      const distanceKm = Number(action.params?.distanceKm) || profile.commute.distanceKm;

      const baselineEnv: EnvFactorKey = MODE_TO_ENV[baselineMode];
      const targetEnv: EnvFactorKey = MODE_TO_ENV[targetMode];
      const baselineIntensity: Intensity = MODE_TO_INTENSITY[baselineMode];
      const targetIntensity: Intensity = MODE_TO_INTENSITY[targetMode];

      const fEnvBase = ENV_FACTORS[baselineEnv];
      const fEnvAlt = ENV_FACTORS[targetEnv];
      const fMaskBase = MASK_FACTORS['none'];
      const fMaskAlt = MASK_FACTORS['none'];

      const targetMember = targetMembers[0];
      const ageGroup = targetMember.ageGroup;
      const irBase = INHALATION_RATES[baselineIntensity][ageGroup];

      const baselineInhaled = calcInhaledUg(slices, getHourlyPm25, {
        ageGroup,
        intensity: baselineIntensity,
        env: baselineEnv,
      });
      const altInhaled = calcInhaledUg(slices, getHourlyPm25, {
        ageGroup,
        intensity: targetIntensity,
        env: targetEnv,
      });

      const co2Saved = calcTravelCo2SavedKg(baselineMode, targetMode, distanceKm);
      const efBase = EMISSION_FACTORS[baselineMode];
      const efAlt = EMISSION_FACTORS[targetMode];

      return {
        exposureAvoidedUg: calcExposureAvoided(baselineInhaled, altInhaled),
        co2SavedKg: co2Saved,
        baselineSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: fEnvBase, fMask: fMaskBase })),
        alternativeSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv: fEnvAlt, fMask: fMaskAlt })),
        calculationBreakdown: {
          durationHours,
          hoursUsed,
          hourlyPm25,
          fEnvBase,
          fEnvAlt,
          fMaskBase,
          fMaskAlt,
          ir: irBase,
          baselineTotalUg: baselineInhaled !== null ? Math.round(baselineInhaled) : null,
          alternativeTotalUg: altInhaled !== null ? Math.round(altInhaled) : null,
          distanceKm: distanceKm > 0 ? distanceKm : undefined,
          efBase,
          efAlt,
          isHousehold: false,
        },
      };
    }

    case 'shift_commute_time': {
      const originalStart = (action.params?.originalStart as string) || profile.commute.departs;
      const originalEnd = (action.params?.originalEnd as string) || '09:30';
      const originalSlices = getTimeSlices(originalStart, originalEnd);
      const mode: TravelMode = (action.params?.mode as TravelMode) || profile.commute.mode;
      const env: EnvFactorKey = MODE_TO_ENV[mode];
      const intensity: Intensity = MODE_TO_INTENSITY[mode];

      const fEnv = ENV_FACTORS[env];
      const fMask = MASK_FACTORS['none'];

      const targetMember = targetMembers[0];
      const ageGroup = targetMember.ageGroup;
      const ir = INHALATION_RATES[intensity][ageGroup];

      const baselineInhaled = calcInhaledUg(originalSlices, getHourlyPm25, {
        ageGroup,
        intensity,
        env,
      });
      const altInhaled = calcInhaledUg(slices, getHourlyPm25, {
        ageGroup,
        intensity,
        env,
      });

      return {
        exposureAvoidedUg: calcExposureAvoided(baselineInhaled, altInhaled),
        co2SavedKg: null,
        baselineSlices: originalSlices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv, fMask })),
        alternativeSlices: slices.map((s) => ({ hour: s.hour, fraction: s.fraction, fEnv, fMask })),
        calculationBreakdown: {
          durationHours,
          hoursUsed,
          hourlyPm25,
          fEnvBase: fEnv,
          fEnvAlt: fEnv,
          fMaskBase: fMask,
          fMaskAlt: fMask,
          ir,
          baselineTotalUg: baselineInhaled !== null ? Math.round(baselineInhaled) : null,
          alternativeTotalUg: altInhaled !== null ? Math.round(altInhaled) : null,
          isHousehold: false,
        },
      };
    }

    case 'use_exhaust_while_cooking':
    case 'avoid_indoor_combustion':
    default:
      // In accordance with IMPACT_MODEL.md section 1:
      // Indoor combustion sources add exposure independently of outdoor forecast.
      // Show no exposure figure and let reason text carry it.
      return {
        exposureAvoidedUg: null,
        co2SavedKg: null,
        calculationBreakdown: {
          durationHours,
          hoursUsed,
          hourlyPm25,
          fEnvBase: ENV_FACTORS['indoors_open'],
          fEnvAlt: ENV_FACTORS['indoors_open'],
          fMaskBase: MASK_FACTORS['none'],
          fMaskAlt: MASK_FACTORS['none'],
          baselineTotalUg: null,
          alternativeTotalUg: null,
          isHousehold: false,
        },
      };
  }
}
