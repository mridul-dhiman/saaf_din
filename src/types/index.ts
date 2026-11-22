export type Sensitivity = 'child' | 'elderly' | 'asthma' | 'pregnant';

export type AgeGroup = 'child' | 'adult' | 'elderly';

export type Intensity = 'rest' | 'light' | 'moderate' | 'vigorous';

export type TravelMode =
  | 'walk'
  | 'cycle'
  | 'metro'
  | 'bus'
  | 'auto_cng'
  | 'two_wheeler'
  | 'car_petrol'
  | 'car_diesel'
  | 'car_cng'
  | 'car_ev'
  | 'carpool';

export interface Routine {
  label: string;
  start: string; // HH:mm
  end: string;   // HH:mm
  outdoors: boolean;
  intensity: Intensity;
}

export interface Member {
  id: string;
  name: string;
  ageGroup: AgeGroup;
  sensitivities: Sensitivity[];
  routine?: Routine;
}

export type CookingFuel = 'lpg' | 'png' | 'induction' | 'biomass';

export interface Profile {
  location: {
    name: string;
    lat: number;
    lon: number;
  };
  members: Member[];
  commute: {
    mode: TravelMode;
    distanceKm: number;
    departs: string;
    returns: string;
  };
  cookingFuel: CookingFuel;
  hasExhaust: boolean;
  hasPurifier: boolean;
  language: 'en' | 'hi';
}

export type ActionType =
  | 'ventilate'
  | 'keep_closed'
  | 'run_purifier'
  | 'shift_outdoor_activity'
  | 'move_activity_indoors'
  | 'wear_mask'
  | 'change_commute_mode'
  | 'shift_commute_time'
  | 'use_exhaust_while_cooking'
  | 'avoid_indoor_combustion';

export interface PlannedAction {
  id: string;
  type: ActionType;
  memberId: string | null;
  start: string; // e.g. "07:00"
  end: string;   // e.g. "09:00"
  title: string;
  reason: string;
  params: Record<string, string | number>;
  completed?: boolean;
}

export interface ImpactReceipt {
  exposureAvoidedUg: number | null;
  co2SavedKg: number | null;
  explanation?: string;
  calculationBreakdown?: {
    baselineExposureUg?: number;
    alternativeExposureUg?: number;
    baselineCo2Kg?: number;
    alternativeCo2Kg?: number;
    formula?: string;
  };
}

export interface HourlyForecastPoint {
  time: string; // ISO string
  hour: number; // 0-23
  pm2_5: number;
  pm10: number;
  us_aqi: number;
  temperature_2m?: number;
  relative_humidity_2m?: number;
  wind_speed_10m?: number;
}

export interface HourlyForecast {
  updatedAt: string;
  source: string;
  points: HourlyForecastPoint[];
}
