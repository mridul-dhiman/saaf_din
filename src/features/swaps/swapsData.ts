import { Profile } from '../../types';
import { calcTravelCo2SavedKg } from '../../lib/impact';

export type SwapCategory = 'all' | 'commute' | 'cooking' | 'puja' | 'fitness' | 'high-impact';

export interface HabitSwap {
  id: string;
  title: string;
  category: 'commute' | 'cooking' | 'puja' | 'fitness';
  difficulty: 'Easy' | 'Moderate' | 'Community Effort';
  icon: string;
  fromHabit: string;
  toHabit: string;
  getImpact: (profile: Profile, currentPm25: number | null) => {
    exposureAvoidedUg: number | null;
    co2SavedKg: number | null;
    specialBenefit?: string;
  };
}

export const HABIT_SWAPS: HabitSwap[] = [
  {
    id: 'swap_office_commute',
    title: 'Morning Office Commute',
    category: 'commute',
    difficulty: 'Moderate',
    icon: 'directions_subway',
    fromHabit: 'Solo petrol/diesel car in stop-and-go traffic (AC recirc off)',
    toHabit: 'Delhi Metro Rail + 5-min walk wearing N95 mask',
    getImpact: (profile, currentPm25) => {
      const distance = profile.commute.distanceKm || 18;
      const co2 = calcTravelCo2SavedKg(profile.commute.mode, 'metro', distance) || 2.5;
      // Inhaled difference: (1.0 vs 0.5) * 1h * 0.7 IR * currentPm25
      const ug = currentPm25 !== null ? Math.round(0.5 * 0.7 * currentPm25) : null;
      return {
        exposureAvoidedUg: ug !== null ? Math.max(35, ug) : null,
        co2SavedKg: co2,
      };
    },
  },
  {
    id: 'swap_home_cooking',
    title: 'Evening Home Cooking',
    category: 'cooking',
    difficulty: 'Easy',
    icon: 'skillet',
    fromHabit: 'LPG gas flame frying with open kitchen and no exhaust',
    toHabit: 'Induction cooktop + active kitchen exhaust fan during tadka',
    getImpact: () => {
      return {
        exposureAvoidedUg: 41,
        co2SavedKg: null, // Per IMPACT_MODEL.md: induction on coal-heavy grid is close to LPG; benefit is flame removal
        specialBenefit: 'Removes an open flame and unburned gas from kitchen',
      };
    },
  },
  {
    id: 'swap_daily_puja',
    title: 'Morning Daily Puja',
    category: 'puja',
    difficulty: 'Easy',
    icon: 'self_improvement',
    fromHabit: 'Charcoal dhoop and fragrant incense cones in sealed prayer space',
    toHabit: 'Smokeless brass diya, electric diffuser, or well-ventilated altar',
    getImpact: () => {
      return {
        exposureAvoidedUg: 76,
        co2SavedKg: 0.2,
      };
    },
  },
  {
    id: 'swap_winter_warmth',
    title: 'Winter Night Heating',
    category: 'cooking',
    difficulty: 'Community Effort',
    icon: 'mode_heat',
    fromHabit: 'Open street wood or scrap plastic bonfire with night guards',
    toHabit: 'Radiant oil-filled electric radiator and heavy thermal blankets',
    getImpact: () => {
      return {
        exposureAvoidedUg: 110,
        co2SavedKg: 4.8,
      };
    },
  },
  {
    id: 'swap_school_dropoff',
    title: 'School Run Transit',
    category: 'commute',
    difficulty: 'Moderate',
    icon: 'backpack',
    fromHabit: 'Open-air auto-rickshaw or two-wheeler during 8:00 AM rush hour',
    toHabit: 'Shared electric school shuttle or Metro coach with N95 mask',
    getImpact: (_profile, currentPm25) => {
      const co2 = calcTravelCo2SavedKg('auto_cng', 'metro', 8) || 0.8;
      const ug = currentPm25 !== null ? Math.round(0.7 * 0.7 * currentPm25) : null;
      return {
        exposureAvoidedUg: ug !== null ? Math.max(45, ug) : null,
        co2SavedKg: co2,
      };
    },
  },
  {
    id: 'swap_fitness_workout',
    title: 'Cardio Fitness & Jogging',
    category: 'fitness',
    difficulty: 'Easy',
    icon: 'fitness_center',
    fromHabit: 'Early morning road jog at 6:30 AM during peak morning pollution',
    toHabit: 'Purified indoor treadmill workout or afternoon gym session at 2:00 PM',
    getImpact: (_profile, currentPm25) => {
      // Vigorous running IR = 3.0 m3/h. Difference: (1.0 - 0.2) * 1h * 3.0 * currentPm25
      const ug = currentPm25 !== null ? Math.round(0.8 * 3.0 * currentPm25) : null;
      return {
        exposureAvoidedUg: ug !== null ? Math.max(60, ug) : null,
        co2SavedKg: null, // Zero CO2 saved for running -> hide CO2 tile
      };
    },
  },
];
