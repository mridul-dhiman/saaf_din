import { TravelMode } from '../../types';
import { EMISSION_FACTORS } from './constants';

/**
 * Calculates CO2 emissions in kg for a trip of given mode and distance in km.
 * Formula: distance_km × EF[mode] / 1000
 */
export function calcTravelCo2Kg(mode: TravelMode, distanceKm: number): number {
  if (distanceKm <= 0) return 0;
  const ef = EMISSION_FACTORS[mode] ?? 0;
  return (distanceKm * ef) / 1000;
}

/**
 * Calculates travel CO2 emissions saved in kg.
 * If baseline and alternative modes are identical (e.g. time-shift only),
 * returns null so no CO2 pill is rendered.
 * If saved CO2 is <= 0, returns null.
 * Rounds to one decimal place.
 */
export function calcTravelCo2SavedKg(
  baselineMode: TravelMode,
  alternativeMode: TravelMode,
  distanceKm: number
): number | null {
  if (baselineMode === alternativeMode) {
    // Shifting time without changing mode saves exposure, not CO2
    return null;
  }

  const baselineKg = calcTravelCo2Kg(baselineMode, distanceKm);
  const alternativeKg = calcTravelCo2Kg(alternativeMode, distanceKm);
  const saved = baselineKg - alternativeKg;

  if (saved <= 0.05) {
    return null;
  }

  return Number(saved.toFixed(1));
}
