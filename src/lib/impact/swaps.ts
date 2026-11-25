import { Profile, TravelMode, EffectiveSlice, HourlyForecastPoint } from '../../types';
import {
  ENV_FACTORS,
  MASK_FACTORS,
  URBAN_SPEEDS_KMH,
  WEEKLY_COMMUTE_DAYS,
  WEEKLY_DAILY_DAYS,
  EnvFactorKey,
} from './constants';
import { getTimeSlices, calcInhaledUg, calcExposureAvoided, makePm25Lookup } from './exposure';
import { calcTravelCo2SavedKg } from './emissions';
import { calcActionCigarettesAvoided } from './cigarettes';

export interface ScoredSwap {
  id: string;
  title: string;
  category: 'commute' | 'cooking' | 'puja' | 'fitness';
  difficulty: 'Easy' | 'Moderate' | 'Community Effort';
  icon: string;
  fromHabit: string;
  toHabit: string;
  daysPerWeek: number;
  exposureAvoidedUg: number | null;
  co2SavedKg: number | null;
  cigarettesAvoided: number | null;
  baselineSlices?: EffectiveSlice[];
  alternativeSlices?: EffectiveSlice[];
  specialBenefit?: string;
  isApplicable: boolean;
}

function addHoursToTime(startStr: string, durationHours: number): string {
  const [h, m] = startStr.split(':').map(Number);
  const totalMinutes = Math.round(h * 60 + m + durationHours * 60);
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

function addMinutes(startStr: string, minutes: number): string {
  const [h, m] = startStr.split(':').map(Number);
  const totalMinutes = Math.round(h * 60 + m + minutes);
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

/**
 * Pure evaluation and profile-filtering for the habit alternatives catalogue.
 * Strictly adheres to IMPACT_MODEL.md and HANDOFF.md specifications:
 * - Commute: derived from profile commute distance, mode, departs/returns, speed constants. Zero/missing distance yields no figures.
 * - School run: shown only if a child member exists. Shown with benefit line and no figures until onboarding captures school run.
 * - Fitness: applies only if a member has an outdoor routine.
 * - Cooking: hidden if already on induction; indoor combustion shows unquantified benefit.
 */
export function scoreAndFilterSwaps(
  profile: Profile,
  forecastPoints: HourlyForecastPoint[]
): ScoredSwap[] {
  const getHourlyPm25 = makePm25Lookup(forecastPoints);
  const swaps: ScoredSwap[] = [];

  // 1. Office Commute Swap
  // Filter out if user already commutes via metro
  const isCommuteMetro = profile.commute.mode === 'metro';
  if (!isCommuteMetro) {
    const baselineMode = profile.commute.mode;
    const targetMode: TravelMode = 'metro';
    const distanceKm = profile.commute.distanceKm;

    let exposureAvoidedUg: number | null = null;
    let co2SavedKg: number | null = null;
    let cigs: number | null = null;
    let baselineEffectiveSlices: EffectiveSlice[] | undefined = undefined;
    let altEffectiveSlices: EffectiveSlice[] | undefined = undefined;

    // A zero or missing distance means no CO2 and no duration, so no figures
    if (distanceKm && distanceKm > 0) {
      const baselineSpeed = URBAN_SPEEDS_KMH[baselineMode];
      const targetSpeed = URBAN_SPEEDS_KMH['metro'];

      const baseDurationHours = Math.max(0.25, distanceKm / baselineSpeed);
      const targetDurationHours = Math.max(0.25, distanceKm / targetSpeed);

      const departs = profile.commute.departs || '08:30';
      const baseEnd = addHoursToTime(departs, baseDurationHours);
      const targetEnd = addHoursToTime(departs, targetDurationHours);

      const baseSlices = getTimeSlices(departs, baseEnd);
      const targetSlices = getTimeSlices(departs, targetEnd);

      const baseEnvKey: EnvFactorKey = baselineMode === 'bus'
        ? 'bus'
        : baselineMode === 'two_wheeler'
        ? 'two_wheeler'
        : 'car_closed_recirc';

      const baseFenv = ENV_FACTORS[baseEnvKey];
      const targetFenv = ENV_FACTORS['metro'];
      const fMask = MASK_FACTORS['none'];

      const adultMember = profile.members.find((m) => m.ageGroup === 'adult') || profile.members[0];
      const ageGroup = adultMember?.ageGroup || 'adult';

      const baselineInhaled = calcInhaledUg(baseSlices, getHourlyPm25, {
        ageGroup,
        intensity: 'light',
        env: baseEnvKey,
        mask: 'none',
      });

      const altInhaled = calcInhaledUg(targetSlices, getHourlyPm25, {
        ageGroup,
        intensity: 'light',
        env: 'metro',
        mask: 'none',
      });

      exposureAvoidedUg = calcExposureAvoided(baselineInhaled, altInhaled);
      co2SavedKg = calcTravelCo2SavedKg(baselineMode, targetMode, distanceKm);

      baselineEffectiveSlices = baseSlices.map((s) => ({
        hour: s.hour,
        fraction: s.fraction,
        fEnv: baseFenv,
        fMask,
      }));
      altEffectiveSlices = targetSlices.map((s) => ({
        hour: s.hour,
        fraction: s.fraction,
        fEnv: targetFenv,
        fMask,
      }));

      cigs = calcActionCigarettesAvoided(baselineEffectiveSlices, altEffectiveSlices, getHourlyPm25);
    }

    swaps.push({
      id: 'swap_office_commute',
      title: 'Morning Office Commute',
      category: 'commute',
      difficulty: 'Moderate',
      icon: 'directions_subway',
      fromHabit: `Solo commute by ${baselineMode.replace('_', ' ')} in peak morning traffic`,
      toHabit: 'Delhi Metro Rail coach transit',
      daysPerWeek: WEEKLY_COMMUTE_DAYS,
      exposureAvoidedUg,
      co2SavedKg,
      cigarettesAvoided: cigs,
      baselineSlices: baselineEffectiveSlices,
      alternativeSlices: altEffectiveSlices,
      isApplicable: true,
    });
  }

  // 2. Child School Run Swap
  // Filter out if no child in household
  // When onboarding captures a school run (profile.schoolRun), quantify using two_wheeler -> metro pair, no N95 in alternative.
  const childMember = profile.members.find((m) => m.ageGroup === 'child');
  if (childMember) {
    let exposureAvoidedUg: number | null = null;
    let co2SavedKg: number | null = null;
    let cigs: number | null = null;
    let baselineEffectiveSlices: EffectiveSlice[] | undefined = undefined;
    let altEffectiveSlices: EffectiveSlice[] | undefined = undefined;

    if (profile.schoolRun && profile.schoolRun.time && profile.schoolRun.distanceKm > 0) {
      const departs = profile.schoolRun.time;
      const distanceKm = profile.schoolRun.distanceKm;
      const baseSpeed = URBAN_SPEEDS_KMH['two_wheeler'];
      const targetSpeed = URBAN_SPEEDS_KMH['metro'];

      const baseDurationMin = Math.round((distanceKm / baseSpeed) * 60);
      const targetDurationMin = Math.round((distanceKm / targetSpeed) * 60);

      const baseEnd = addMinutes(departs, baseDurationMin);
      const targetEnd = addMinutes(departs, targetDurationMin);

      const baseSlices = getTimeSlices(departs, baseEnd);
      const targetSlices = getTimeSlices(departs, targetEnd);

      const baseFenv = ENV_FACTORS['two_wheeler'];
      const targetFenv = ENV_FACTORS['metro'];
      const fMask = MASK_FACTORS['none'];

      const baselineInhaled = calcInhaledUg(baseSlices, getHourlyPm25, {
        ageGroup: childMember.ageGroup,
        intensity: 'light',
        env: 'two_wheeler',
        mask: 'none',
      });

      const altInhaled = calcInhaledUg(targetSlices, getHourlyPm25, {
        ageGroup: childMember.ageGroup,
        intensity: 'light',
        env: 'metro',
        mask: 'none',
      });

      exposureAvoidedUg = calcExposureAvoided(baselineInhaled, altInhaled);
      co2SavedKg = calcTravelCo2SavedKg('two_wheeler', 'metro', distanceKm);

      baselineEffectiveSlices = baseSlices.map((s) => ({
        hour: s.hour,
        fraction: s.fraction,
        fEnv: baseFenv,
        fMask,
      }));
      altEffectiveSlices = targetSlices.map((s) => ({
        hour: s.hour,
        fraction: s.fraction,
        fEnv: targetFenv,
        fMask,
      }));

      cigs = calcActionCigarettesAvoided(baselineEffectiveSlices, altEffectiveSlices, getHourlyPm25);
    }

    swaps.push({
      id: 'swap_school_run',
      title: 'Child Morning School Run',
      category: 'commute',
      difficulty: 'Moderate',
      icon: 'backpack',
      fromHabit: `Open-air two-wheeler or auto-rickshaw during rush hour for ${childMember.name}`,
      toHabit: 'Shared electric school shuttle or Metro coach',
      daysPerWeek: WEEKLY_COMMUTE_DAYS,
      exposureAvoidedUg,
      co2SavedKg,
      cigarettesAvoided: cigs,
      baselineSlices: baselineEffectiveSlices,
      alternativeSlices: altEffectiveSlices,
      specialBenefit: 'Shields developing lungs from direct roadside tailpipe emissions',
      isApplicable: true,
    });
  }

  // 3. Home Cooking Swap
  // Filter out if household already cooks with induction
  if (profile.cookingFuel !== 'induction') {
    swaps.push({
      id: 'swap_home_cooking',
      title: 'Evening Home Cooking',
      category: 'cooking',
      difficulty: 'Easy',
      icon: 'skillet',
      fromHabit: `${profile.cookingFuel.toUpperCase()} gas flame frying with open kitchen and no exhaust`,
      toHabit: 'Induction cooktop with active kitchen exhaust fan during tadka',
      daysPerWeek: WEEKLY_DAILY_DAYS,
      exposureAvoidedUg: null,
      co2SavedKg: null,
      cigarettesAvoided: null,
      specialBenefit: 'Removes an open flame and unburned gas from kitchen',
      isApplicable: true,
    });
  }

  // 4. Daily Puja Swap
  swaps.push({
    id: 'swap_daily_puja',
    title: 'Morning Daily Puja',
    category: 'puja',
    difficulty: 'Easy',
    icon: 'local_fire_department',
    fromHabit: 'Burning multiple charcoal-based agarbatti and dhoop indoors',
    toHabit: 'Essential oil diffuser or low-smoke pure cow-ghee brass diya',
    daysPerWeek: WEEKLY_DAILY_DAYS,
    exposureAvoidedUg: null,
    co2SavedKg: null,
    cigarettesAvoided: null,
    specialBenefit: 'Eliminates benzene and particle smoke from indoor worship',
    isApplicable: true,
  });

  // 5. Winter Heating Swap
  swaps.push({
    id: 'swap_winter_heating',
    title: 'Night Room Warming',
    category: 'cooking',
    difficulty: 'Community Effort',
    icon: 'fireplace',
    fromHabit: 'Burning scrap wood or coal angithi in or near house',
    toHabit: 'Oil-filled radiant electric heater with thermostatic cut-off',
    daysPerWeek: WEEKLY_DAILY_DAYS,
    exposureAvoidedUg: null,
    co2SavedKg: null,
    cigarettesAvoided: null,
    specialBenefit: 'Removes a smoke source from your home',
    isApplicable: true,
  });

  // 6. Fitness & Workout Swap
  // Filter out if no member has an outdoor routine
  const outdoorMember = profile.members.find((m) => m.routine && m.routine.outdoors);
  if (outdoorMember && outdoorMember.routine) {
    const routine = outdoorMember.routine;
    const slices = getTimeSlices(routine.start, routine.end);
    const targetEnv: EnvFactorKey = profile.hasPurifier ? 'indoors_closed_purifier' : 'indoors_closed';
    const baseFenv = ENV_FACTORS['outdoors'];
    const targetFenv = ENV_FACTORS[targetEnv];

    const baselineInhaled = calcInhaledUg(slices, getHourlyPm25, {
      ageGroup: outdoorMember.ageGroup,
      intensity: routine.intensity,
      env: 'outdoors',
      mask: 'none',
    });

    const altInhaled = calcInhaledUg(slices, getHourlyPm25, {
      ageGroup: outdoorMember.ageGroup,
      intensity: routine.intensity,
      env: targetEnv,
      mask: 'none',
    });

    const exposureAvoidedUg = calcExposureAvoided(baselineInhaled, altInhaled);

    const baselineEffectiveSlices: EffectiveSlice[] = slices.map((s) => ({
      hour: s.hour,
      fraction: s.fraction,
      fEnv: baseFenv,
      fMask: 1.0,
    }));
    const altEffectiveSlices: EffectiveSlice[] = slices.map((s) => ({
      hour: s.hour,
      fraction: s.fraction,
      fEnv: targetFenv,
      fMask: 1.0,
    }));

    const cigs = calcActionCigarettesAvoided(baselineEffectiveSlices, altEffectiveSlices, getHourlyPm25);

    swaps.push({
      id: 'swap_fitness_workout',
      title: 'Cardio Fitness & Jogging',
      category: 'fitness',
      difficulty: 'Easy',
      icon: 'fitness_center',
      fromHabit: `Outdoor ${routine.label} at ${routine.start} for ${outdoorMember.name}`,
      toHabit: `Purified indoor gym session or shifting activity to clean afternoon window`,
      daysPerWeek: WEEKLY_COMMUTE_DAYS,
      exposureAvoidedUg,
      co2SavedKg: null,
      cigarettesAvoided: cigs,
      baselineSlices: baselineEffectiveSlices,
      alternativeSlices: altEffectiveSlices,
      isApplicable: true,
    });
  }

  return swaps;
}

/**
 * Calculates weekly total impact for a set of adopted swap IDs.
 */
export function calculateWeeklySwapTotals(
  swaps: ScoredSwap[],
  adoptedSwapIds: string[]
): {
  totalUg: number;
  totalCo2: number;
  totalCigs: number;
  qualifyingCount: number;
} {
  let totalUg = 0;
  let totalCo2 = 0;
  let totalCigs = 0;
  let qualifyingCount = 0;

  for (const swap of swaps) {
    if (!adoptedSwapIds.includes(swap.id)) continue;
    if (!swap.isApplicable) continue;

    const hasExposure = swap.exposureAvoidedUg !== null && swap.exposureAvoidedUg > 0;
    const hasCo2 = swap.co2SavedKg !== null && swap.co2SavedKg > 0;

    if (hasExposure || hasCo2) {
      qualifyingCount++;
    }

    if (hasExposure) {
      totalUg += (swap.exposureAvoidedUg as number) * swap.daysPerWeek;
    }
    if (hasCo2) {
      totalCo2 += (swap.co2SavedKg as number) * swap.daysPerWeek;
    }
    if (swap.cigarettesAvoided !== null && swap.cigarettesAvoided > 0) {
      totalCigs += swap.cigarettesAvoided * swap.daysPerWeek;
    }
  }

  return {
    totalUg,
    totalCo2: Number(totalCo2.toFixed(1)),
    totalCigs,
    qualifyingCount,
  };
}
