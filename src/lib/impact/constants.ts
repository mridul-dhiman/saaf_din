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
 * Source: assumption (indoor/outdoor PM2.5 infiltration literature defaults)
 */
export type EnvFactorKey =
  | 'outdoors'
  | 'indoors_open'
  | 'indoors_closed'
  | 'indoors_closed_purifier'
  | 'car_closed_recirc'
  | 'car_open'
  | 'auto_rickshaw'
  | 'metro'
  | 'bus'
  | 'walk'
  | 'cycle'
  | 'two_wheeler';

export const ENV_FACTORS: Record<EnvFactorKey, number> = {
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
 * Source: assumption (mask filtration defaults)
 */
export type MaskFactorKey = 'none' | 'cloth' | 'surgical' | 'n95' | 'ffp2';

export const MASK_FACTORS: Record<MaskFactorKey, number> = {
  none: 1.0,
  cloth: 0.7,
  surgical: 0.7,
  n95: 0.3,
  ffp2: 0.3,
};

/**
 * Transport emission factors EF (grams CO2 per passenger-km)
 * Source: assumption, not verified
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
 * Source: Berkeley Earth (Muller & Muller 2015), confirmed in source
 * https://berkeleyearth.org/air-pollution-and-cigarette-equivalence/
 */
export const CIGARETTE_EQUIVALENT_UG_PER_M3_24H = 22;
export const CIGARETTE_HOURS_DENOMINATOR = 22 * 24; // 528 µg·h/m³

export interface ConstantSourceInfo {
  constant: string;
  value: string;
  unit: string;
  source: string;
  sourceUrl?: string;
  status: 'confirmed in source' | 'assumption, not verified';
}

export const CONSTANT_SOURCES: ConstantSourceInfo[] = [
  {
    constant: 'F_env (outdoors)',
    value: '1.0',
    unit: 'ratio',
    source: 'Ambient reference definition',
    status: 'assumption, not verified',
  },
  {
    constant: 'F_env (indoors_closed)',
    value: '0.5',
    unit: 'ratio',
    source: 'Residential infiltration literature default',
    status: 'assumption, not verified',
  },
  {
    constant: 'F_env (indoors_closed_purifier)',
    value: '0.2',
    unit: 'ratio',
    source: 'Domestic air purifier with closed windows literature default',
    status: 'assumption, not verified',
  },
  {
    constant: 'F_mask (N95 / FFP2)',
    value: '0.3',
    unit: 'ratio',
    source: 'Particulate respirator fit and leakage literature default',
    status: 'assumption, not verified',
  },
  {
    constant: 'Inhalation Rates (IR)',
    value: '0.3 – 3.0',
    unit: 'm³/h',
    source: 'US EPA Exposure Factors Handbook, chapter 6',
    status: 'assumption, not verified',
  },
  {
    constant: 'Emission Factors (EF)',
    value: '0 – 170',
    unit: 'g CO₂/pkm',
    source: 'Passenger transport emission estimates',
    status: 'assumption, not verified',
  },
  {
    constant: 'Cigarette Equivalence',
    value: '22',
    unit: 'µg/m³ · 24h',
    source: 'Berkeley Earth (Muller & Muller 2015)',
    sourceUrl: 'https://berkeleyearth.org/air-pollution-and-cigarette-equivalence/',
    status: 'confirmed in source',
  },
  {
    constant: 'URBAN_SPEEDS_KMH',
    value: '4.5 – 32',
    unit: 'km/h',
    source: 'Urban travel speed estimates',
    status: 'assumption, not verified',
  },
  {
    constant: 'PURIFIER_WATTS',
    value: '45',
    unit: 'Watts',
    source: 'Domestic HEPA purifier nominal power',
    status: 'assumption, not verified',
  },
  {
    constant: 'GRID_KG_CO2_PER_KWH',
    value: '0.7',
    unit: 'kg CO₂/kWh',
    source: 'Central Electricity Authority baseline database approximation',
    status: 'assumption, not verified',
  },
  {
    constant: 'SCHOOL_RUN_DISTANCE_KM',
    value: '6',
    unit: 'km',
    source: 'Typical school transit distance estimate',
    status: 'assumption, not verified',
  },
];

/**
 * Average urban travel speeds (km/h) for Indian cities
 * Used to derive trip duration from commute distance: duration_hours = distance_km / speed_kmh
 * Source: assumption (no verified source)
 */
export const URBAN_SPEEDS_KMH: Record<TravelMode, number> = {
  walk: 4.5,
  cycle: 12,
  metro: 32,
  bus: 15,
  auto_cng: 20,
  two_wheeler: 25,
  car_petrol: 20,
  car_diesel: 20,
  car_cng: 20,
  car_ev: 20,
  carpool: 20,
};

/**
 * Assumed typical one-way school transit distance (km)
 * Source: assumption, no source
 */
export const SCHOOL_RUN_DISTANCE_KM = 6;

/**
 * Travel mode to environment factor mapping
 * Source: assumption
 */
export const MODE_TO_ENV: Record<TravelMode, EnvFactorKey> = {
  walk: 'outdoors',
  cycle: 'outdoors',
  two_wheeler: 'two_wheeler', // F_env = 1.0 (open)
  auto_cng: 'auto_rickshaw',  // F_env = 1.0 (open)
  car_petrol: 'car_closed_recirc',
  car_diesel: 'car_closed_recirc',
  car_cng: 'car_closed_recirc',
  car_ev: 'car_closed_recirc',
  carpool: 'car_closed_recirc',
  bus: 'bus',
  metro: 'metro',
};

/**
 * Travel mode to activity intensity mapping
 */
export const MODE_TO_INTENSITY: Record<TravelMode, Intensity> = {
  walk: 'moderate',
  cycle: 'moderate',
  two_wheeler: 'light',
  auto_cng: 'light',
  car_petrol: 'light',
  car_diesel: 'light',
  car_cng: 'light',
  car_ev: 'light',
  carpool: 'light',
  bus: 'light',
  metro: 'light',
};

/**
 * Nominal domestic air purifier electric power consumption (Watts)
 * Source: assumption, not verified (typical domestic HEPA purifier on medium fan speed)
 */
export const PURIFIER_WATTS = 45;

/**
 * Grid electricity emission intensity for India (kg CO2 per kWh)
 * Source: assumption, not verified (Central Electricity Authority CO2 baseline database ~0.7-0.8 kg/kWh)
 */
export const GRID_KG_CO2_PER_KWH = 0.7;

/**
 * Standard weekly frequencies for habit alternatives
 */
export const WEEKLY_COMMUTE_DAYS = 5;
export const WEEKLY_DAILY_DAYS = 7;
