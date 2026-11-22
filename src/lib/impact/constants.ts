import { AgeGroup, Intensity, TravelMode } from '../../types';

/**
 * Inhalation rate IR (m³/h) by AgeGroup and Intensity
 * Source: US EPA Exposure Factors Handbook, chapter 6
 */
export const INHALATION_RATES: Record<Intensity, Record<AgeGroup, number>> = {
  rest: {
    child: 0.3,
    adult: 0.3,
    elderly: 0.3,
  },
  light: {
    child: 0.7,
    adult: 0.7,
    elderly: 0.7,
  },
  moderate: {
    child: 1.3,
    adult: 1.6,
    elderly: 1.5,
  },
  vigorous: {
    child: 2.5,
    adult: 3.0,
    elderly: 2.5,
  },
};

/**
 * Environment penetration factor F_env
 * Fraction of outdoor PM2.5 that reaches the person
 * Source: Indoor/outdoor PM2.5 infiltration literature defaults
 */
export const ENV_FACTORS: Record<string, number> = {
  outdoors: 1.0,
  indoors_open: 0.9,
  indoors_closed: 0.5,
  indoors_closed_purifier: 0.2,
  car_closed_recirc: 0.4,
  car_open: 1.0,
  auto_rickshaw: 1.0,
  metro: 0.5,
  bus: 0.8,
  walk: 1.0,
  cycle: 1.0,
  two_wheeler: 1.0,
};

/**
 * Mask penetration factor F_mask
 * Fraction of PM2.5 that penetrates the mask
 */
export const MASK_FACTORS: Record<string, number> = {
  none: 1.0,
  cloth: 0.7,
  surgical: 0.7,
  n95: 0.3,
  ffp2: 0.3,
};

/**
 * Transport emission factors EF (grams CO2 per passenger-km)
 * Source: India GHG Program transport factors, CPCB, operator sustainability reports
 */
export const EMISSION_FACTORS: Record<TravelMode, number> = {
  walk: 0,
  cycle: 0,
  metro: 30,
  bus: 40,
  auto_cng: 60,
  two_wheeler: 45,
  car_petrol: 170,
  car_diesel: 160,
  car_cng: 130,
  car_ev: 110,
  carpool: 57, // car_petrol / 3 occupants
};

/**
 * Berkeley Earth cigarette equivalence:
 * Breathing air at 22 µg/m³ PM2.5 for 24 hours ≈ smoking 1 cigarette
 */
export const CIGARETTE_EQUIVALENT_UG_PER_M3_24H = 22;
export const CIGARETTE_HOURS_DENOMINATOR = 22 * 24; // 528 µg·h/m³
