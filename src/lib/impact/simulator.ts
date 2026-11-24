import { Profile, TravelMode, HourlyForecastPoint } from '../../types';
import {
  URBAN_SPEEDS_KMH,
  EnvFactorKey,
} from './constants';
import { getTimeSlices, calcInhaledUg, calcExposureAvoided, makePm25Lookup } from './exposure';
import { calcTravelCo2Kg, calcTravelCo2SavedKg } from './emissions';

export type ScenarioActivity = 'commute' | 'exercise' | 'ventilation';

export interface ScenarioResultSide {
  title: string;
  envLabel: string;
  maskLabel: string;
  inhaledUg: number | null;
  co2Kg: number | null;
}

export interface SimulationResult {
  activityLabel: string;
  durationLabel: string;
  baseline: ScenarioResultSide;
  alternative: ScenarioResultSide;
  exposureAvoidedUg: number | null;
  co2SavedKg: number | null;
  percentageCut: number | null;
  verdict: string;
}

function addHoursToTime(startStr: string, durationHours: number): string {
  const [h, m] = startStr.split(':').map(Number);
  const totalMinutes = Math.round(h * 60 + m + durationHours * 60);
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

/**
 * Pure simulation scenario calculator.
 * Strictly adheres to:
 * - Change one variable per comparison
 * - Commute: compares modes only (no mask bundled), uses profile commute mode and distance
 * - Zero or missing distance means no CO2 and no duration, so no figures
 * - Exercise: same intensity in both scenarios (only environment changes)
 * - Ventilation: indoors_closed_purifier only if profile.hasPurifier, else indoors_closed
 * - Exact time boundaries (zero-padded)
 * - If forecast is missing for the selected hours, yields null figures and no percentage
 */
export function computeSimulationScenario(
  profile: Profile,
  forecastPoints: HourlyForecastPoint[],
  selections: {
    activity: ScenarioActivity;
    timeSlot: string; // "08:30", "14:00", "18:00"
    selectedMemberId: string;
  }
): SimulationResult {
  const getHourlyPm25 = makePm25Lookup(forecastPoints);
  const selectedMember = profile.members.find((m) => m.id === selections.selectedMemberId) || profile.members[0];
  const ageGroup = selectedMember?.ageGroup || 'adult';
  const memberName = selectedMember?.name || 'your household';

  if (selections.activity === 'commute') {
    const baselineMode = profile.commute.mode || 'car_petrol';
    const alternativeMode: TravelMode = baselineMode === 'metro' ? 'bus' : 'metro';
    const distanceKm = profile.commute.distanceKm;

    const baseTitle = baselineMode === 'car_petrol'
      ? 'Solo Petrol Car'
      : baselineMode === 'car_diesel'
      ? 'Solo Diesel Car'
      : baselineMode === 'two_wheeler'
      ? 'Motorcycle / Scooter'
      : baselineMode === 'auto_cng'
      ? 'Auto-Rickshaw'
      : baselineMode.replace('_', ' ');

    const baseEnvLabel = baselineMode === 'two_wheeler' || baselineMode === 'auto_cng'
      ? 'Open Roadway'
      : 'Vehicle Cabin (Windows Closed, Recirculation On)';

    // A zero or missing distance means no CO2 and no duration, so no figures
    if (!distanceKm || distanceKm <= 0) {
      return {
        activityLabel: 'Work / School Commute',
        durationLabel: 'Commute distance not specified',
        baseline: {
          title: baseTitle,
          envLabel: baseEnvLabel,
          maskLabel: 'No Mask',
          inhaledUg: null,
          co2Kg: null,
        },
        alternative: {
          title: 'Metro Rail',
          envLabel: 'Air-Conditioned Metro Coach',
          maskLabel: 'No Mask',
          inhaledUg: null,
          co2Kg: null,
        },
        exposureAvoidedUg: null,
        co2SavedKg: null,
        percentageCut: null,
        verdict: 'Specify your daily commute distance in profile settings to simulate exposure and tailpipe emissions.',
      };
    }

    const baselineSpeed = URBAN_SPEEDS_KMH[baselineMode];
    const durationHours = Math.max(0.25, Number((distanceKm / baselineSpeed).toFixed(2)));
    const endTime = addHoursToTime(selections.timeSlot, durationHours);
    const timeSlices = getTimeSlices(selections.timeSlot, endTime);

    const baseEnvKey: EnvFactorKey = baselineMode === 'two_wheeler'
      ? 'two_wheeler'
      : baselineMode === 'bus'
      ? 'bus'
      : 'car_closed_recirc';

    const baselineInhaled = calcInhaledUg(timeSlices, getHourlyPm25, {
      ageGroup,
      intensity: 'light',
      env: baseEnvKey,
      mask: 'none',
    });

    const alternativeInhaled = calcInhaledUg(timeSlices, getHourlyPm25, {
      ageGroup,
      intensity: 'light',
      env: 'metro',
      mask: 'none', // Mode comparison only
    });

    const baselineCo2 = calcTravelCo2Kg(baselineMode, distanceKm);
    const alternativeCo2 = calcTravelCo2Kg(alternativeMode, distanceKm);
    const co2Saved = calcTravelCo2SavedKg(baselineMode, alternativeMode, distanceKm);
    const avoidedUg = calcExposureAvoided(baselineInhaled, alternativeInhaled);

    const hasPct = baselineInhaled !== null && alternativeInhaled !== null && baselineInhaled > 0;
    const percentageCut = hasPct ? Math.round(((baselineInhaled - alternativeInhaled) / baselineInhaled) * 100) : null;

    let verdict = `Switching from ${baseTitle.toLowerCase()} to Metro rail`;
    if (percentageCut !== null && avoidedUg !== null) {
      verdict += ` cuts ${memberName}'s inhaled particulate exposure by ~${percentageCut}%`;
    } else {
      verdict += ` reduces ${memberName}'s inhaled particulate exposure`;
    }
    if (co2Saved !== null && co2Saved > 0) {
      verdict += ` and prevents ${co2Saved} kg of tailpipe CO₂ emissions.`;
    } else {
      verdict += `.`;
    }

    return {
      activityLabel: 'Work / School Commute',
      durationLabel: `${selections.timeSlot} – ${endTime} (${Math.round(durationHours * 60)} mins)`,
      baseline: {
        title: `${baseTitle} (${distanceKm} km)`,
        envLabel: baseEnvLabel,
        maskLabel: 'No Mask',
        inhaledUg: baselineInhaled !== null ? Math.round(baselineInhaled) : null,
        co2Kg: baselineCo2 !== null ? Number(baselineCo2.toFixed(1)) : null,
      },
      alternative: {
        title: `Metro Rail (${distanceKm} km)`,
        envLabel: 'Air-Conditioned Metro Coach',
        maskLabel: 'No Mask',
        inhaledUg: alternativeInhaled !== null ? Math.round(alternativeInhaled) : null,
        co2Kg: alternativeCo2 !== null ? Number(alternativeCo2.toFixed(1)) : null,
      },
      exposureAvoidedUg: avoidedUg,
      co2SavedKg: co2Saved,
      percentageCut,
      verdict,
    };
  }

  if (selections.activity === 'exercise') {
    // 1-hour workout duration with equal intensity
    const durationHours = 1.0;
    const endTime = addHoursToTime(selections.timeSlot, durationHours);
    const timeSlices = getTimeSlices(selections.timeSlot, endTime);

    // Identical intensity in both scenarios
    const intensity = 'moderate';
    const altEnv: EnvFactorKey = profile.hasPurifier ? 'indoors_closed_purifier' : 'indoors_closed';

    const baselineInhaled = calcInhaledUg(timeSlices, getHourlyPm25, {
      ageGroup,
      intensity,
      env: 'outdoors',
      mask: 'none',
    });

    const alternativeInhaled = calcInhaledUg(timeSlices, getHourlyPm25, {
      ageGroup,
      intensity,
      env: altEnv,
      mask: 'none',
    });

    const avoidedUg = calcExposureAvoided(baselineInhaled, alternativeInhaled);
    const hasPct = baselineInhaled !== null && alternativeInhaled !== null && baselineInhaled > 0;
    const percentageCut = hasPct ? Math.round(((baselineInhaled - alternativeInhaled) / baselineInhaled) * 100) : null;

    const altTitle = profile.hasPurifier
      ? 'Indoor Workout with Air Purifier'
      : 'Indoor Workout in Sealed Room';
    const altEnvLabel = profile.hasPurifier
      ? 'Sealed Room with HEPA Purifier'
      : 'Sealed Indoor Room';

    let verdict = `Shifting moderate exercise indoors`;
    if (percentageCut !== null && avoidedUg !== null) {
      verdict += ` cuts ${memberName}'s inhaled particulate exposure by ~${percentageCut}% during peak pollution hours, shielding sensitive airways.`;
    } else {
      verdict += ` reduces ${memberName}'s inhaled particulate exposure during peak pollution hours, shielding sensitive airways.`;
    }

    return {
      activityLabel: 'Daily Workout & Exercise',
      durationLabel: `${selections.timeSlot} – ${endTime} (60 mins)`,
      baseline: {
        title: 'Outdoor Roadside Jog / Workout',
        envLabel: 'Ambient Outdoor Air',
        maskLabel: 'No Mask',
        inhaledUg: baselineInhaled !== null ? Math.round(baselineInhaled) : null,
        co2Kg: null,
      },
      alternative: {
        title: altTitle,
        envLabel: altEnvLabel,
        maskLabel: 'No Mask',
        inhaledUg: alternativeInhaled !== null ? Math.round(alternativeInhaled) : null,
        co2Kg: null,
      },
      exposureAvoidedUg: avoidedUg,
      co2SavedKg: null,
      percentageCut,
      verdict,
    };
  }

  // Ventilation Scenario
  const durationHours = 1.0;
  const endTime = addHoursToTime(selections.timeSlot, durationHours);
  const timeSlices = getTimeSlices(selections.timeSlot, endTime);

  const altEnv: EnvFactorKey = profile.hasPurifier ? 'indoors_closed_purifier' : 'indoors_closed';

  const baselineInhaled = calcInhaledUg(timeSlices, getHourlyPm25, {
    ageGroup,
    intensity: 'rest',
    env: 'indoors_open',
    mask: 'none',
  });

  const alternativeInhaled = calcInhaledUg(timeSlices, getHourlyPm25, {
    ageGroup,
    intensity: 'rest',
    env: altEnv,
    mask: 'none',
  });

  const avoidedUg = calcExposureAvoided(baselineInhaled, alternativeInhaled);
  const hasPct = baselineInhaled !== null && alternativeInhaled !== null && baselineInhaled > 0;
  const percentageCut = hasPct ? Math.round(((baselineInhaled - alternativeInhaled) / baselineInhaled) * 100) : null;

  const altTitle = profile.hasPurifier
    ? 'Sealed Room with Air Purifier'
    : 'Sealed Room with Windows Closed';
  const altEnvLabel = profile.hasPurifier
    ? 'Sealed Room with Purifier'
    : 'Sealed Indoor Room';

  let verdict = `Keeping windows sealed`;
  if (profile.hasPurifier) verdict += ' and running air filtration';
  if (percentageCut !== null && avoidedUg !== null) {
    verdict += ` cuts ${memberName}'s inhaled exposure by ~${percentageCut}% compared to outdoor infiltration.`;
  } else {
    verdict += ` prevents particulate infiltration while outdoor dispersion remains sluggish.`;
  }

  return {
    activityLabel: 'Home Ventilation & Air Cleaning',
    durationLabel: `${selections.timeSlot} – ${endTime} (60 mins)`,
    baseline: {
      title: 'Open Windows during Inversion Peak',
      envLabel: 'Outdoor Air Infiltration',
      maskLabel: 'Unfiltered Room',
      inhaledUg: baselineInhaled !== null ? Math.round(baselineInhaled) : null,
      co2Kg: null,
    },
    alternative: {
      title: altTitle,
      envLabel: altEnvLabel,
      maskLabel: 'Closed & Sealed',
      inhaledUg: alternativeInhaled !== null ? Math.round(alternativeInhaled) : null,
      co2Kg: null,
    },
    exposureAvoidedUg: avoidedUg,
    co2SavedKg: null,
    percentageCut,
    verdict,
  };
}
