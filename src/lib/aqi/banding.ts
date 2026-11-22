export type AqiCategory =
  | 'Good'
  | 'Moderate'
  | 'Unhealthy for Sensitive Groups'
  | 'Unhealthy'
  | 'Very Unhealthy'
  | 'Hazardous';

export interface AqiBandInfo {
  category: AqiCategory;
  shortLabel: string;
  minAqi: number;
  maxAqi: number;
  colorClass: string;
  bgClass: string;
  badgeBgClass: string;
  badgeTextClass: string;
  borderClass: string;
  healthDescription: string;
}

export const AQI_BANDS: AqiBandInfo[] = [
  {
    category: 'Good',
    shortLabel: 'Good',
    minAqi: 0,
    maxAqi: 50,
    colorClass: 'text-emerald-700',
    bgClass: 'bg-emerald-500',
    badgeBgClass: 'bg-emerald-100',
    badgeTextClass: 'text-emerald-800',
    borderClass: 'border-emerald-300',
    healthDescription: 'Air quality is satisfactory and poses little or no risk.',
  },
  {
    category: 'Moderate',
    shortLabel: 'Moderate',
    minAqi: 51,
    maxAqi: 100,
    colorClass: 'text-amber-700',
    bgClass: 'bg-amber-500',
    badgeBgClass: 'bg-amber-100',
    badgeTextClass: 'text-amber-800',
    borderClass: 'border-amber-300',
    healthDescription: 'Acceptable; unusually sensitive people should consider reducing prolonged outdoor exertion.',
  },
  {
    category: 'Unhealthy for Sensitive Groups',
    shortLabel: 'Sensitive',
    minAqi: 101,
    maxAqi: 150,
    colorClass: 'text-orange-700',
    bgClass: 'bg-orange-500',
    badgeBgClass: 'bg-orange-100',
    badgeTextClass: 'text-orange-800',
    borderClass: 'border-orange-300',
    healthDescription: 'Children, older adults, and individuals with respiratory issues may experience symptoms.',
  },
  {
    category: 'Unhealthy',
    shortLabel: 'Unhealthy / Poor',
    minAqi: 151,
    maxAqi: 200,
    colorClass: 'text-red-700',
    bgClass: 'bg-red-500',
    badgeBgClass: 'bg-error-container',
    badgeTextClass: 'text-on-error-container',
    borderClass: 'border-red-300',
    healthDescription: 'Some members of the general public may experience health effects; sensitive groups more severely.',
  },
  {
    category: 'Very Unhealthy',
    shortLabel: 'Very Unhealthy',
    minAqi: 201,
    maxAqi: 300,
    colorClass: 'text-purple-700',
    bgClass: 'bg-purple-600',
    badgeBgClass: 'bg-purple-100',
    badgeTextClass: 'text-purple-800',
    borderClass: 'border-purple-300',
    healthDescription: 'Health alert: risk of health effects increased for everyone. Minimize outdoor exposure.',
  },
  {
    category: 'Hazardous',
    shortLabel: 'Severe / Hazardous',
    minAqi: 301,
    maxAqi: 9999,
    colorClass: 'text-rose-900',
    bgClass: 'bg-rose-900',
    badgeBgClass: 'bg-rose-950 text-white',
    badgeTextClass: 'text-white',
    borderClass: 'border-rose-800',
    healthDescription: 'Health warning of emergency conditions. Everyone is more likely to be affected.',
  },
];

/**
 * Returns AQI band information based on US AQI value.
 */
export function getAqiBand(usAqi: number): AqiBandInfo {
  const rounded = Math.round(usAqi);
  for (const band of AQI_BANDS) {
    if (rounded >= band.minAqi && rounded <= band.maxAqi) {
      return band;
    }
  }
  return AQI_BANDS[AQI_BANDS.length - 1];
}

/**
 * Maps raw PM2.5 (µg/m³) to a band color class for hourly strips.
 */
export function getPm25ColorClass(pm25: number): string {
  if (pm25 <= 12.0) return 'bg-emerald-500';
  if (pm25 <= 35.4) return 'bg-amber-500';
  if (pm25 <= 55.4) return 'bg-orange-500';
  if (pm25 <= 150.4) return 'bg-red-500';
  if (pm25 <= 250.4) return 'bg-purple-600';
  return 'bg-rose-900';
}
