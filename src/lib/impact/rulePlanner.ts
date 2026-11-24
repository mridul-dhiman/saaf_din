import { PlannedAction, Profile, HourlyForecastPoint } from '../../types';
import { DayWindowsResult } from '../aqi';
import { computeActionImpact, ActionImpactResult } from './actionImpact';
import { makePm25Lookup } from './exposure';

export interface EnrichedAction extends PlannedAction {
  impact: ActionImpactResult;
}

/**
 * Generates a deterministic, rule-based daily air quality action plan.
 * Serves as both the P0 standalone daily plan and the permanent fallback
 * if Gemini model calls fail or validate improperly.
 */
export function generateRuleBasedPlan(
  profile: Profile,
  forecastPoints: HourlyForecastPoint[],
  windows: DayWindowsResult
): EnrichedAction[] {
  const getHourlyPm25 = makePm25Lookup(forecastPoints);

  const childMember = profile.members.find((m) => m.ageGroup === 'child');
  const elderlyMember = profile.members.find((m) => m.ageGroup === 'elderly');
  const asthmaMember = profile.members.find((m) => m.sensitivities.includes('asthma'));
  const adultMember = profile.members.find((m) => m.ageGroup === 'adult');

  const actions: PlannedAction[] = [];

  // Action 1: Morning Commute / School run protection during morning peak
  if (childMember) {
    actions.push({
      id: 'act_morning_mask_child',
      type: 'wear_mask',
      memberId: childMember.id,
      start: '07:30',
      end: '08:30',
      title: `Wear N95 mask for ${childMember.name}'s transit`,
      reason: 'Prevents acute peak morning particulate inhalation during road transfer.',
      params: { mask: 'n95', intensity: 'light' },
      completed: true,
    });
  } else if (asthmaMember) {
    actions.push({
      id: 'act_morning_mask_asthma',
      type: 'wear_mask',
      memberId: asthmaMember.id,
      start: '08:00',
      end: '09:00',
      title: `Wear N95 mask outdoors for ${asthmaMember.name}`,
      reason: 'Reduces airborne trigger exposure during high traffic congestion.',
      params: { mask: 'n95', intensity: 'light' },
      completed: true,
    });
  } else {
    actions.push({
      id: 'act_morning_mask_adult',
      type: 'wear_mask',
      memberId: profile.members[0]?.id || null,
      start: '08:00',
      end: '09:00',
      title: 'Wear N95 mask during morning commute',
      reason: 'Filters heavy morning vehicle soot before dispersion begins.',
      params: { mask: 'n95', intensity: 'light' },
      completed: true,
    });
  }

  // Action 2: Mid-day indoor filtration during degraded outdoor conditions
  if (profile.hasPurifier) {
    actions.push({
      id: 'act_purifier_boost',
      type: 'run_purifier',
      memberId: null,
      start: '10:00',
      end: '13:00',
      title: 'Run air purifier on high speed in living room',
      reason: 'Maintains low indoor infiltration while outdoor ground smog peaks.',
      params: { room: 'living_room' },
      completed: true,
    });
  } else {
    actions.push({
      id: 'act_keep_closed',
      type: 'keep_closed',
      memberId: null,
      start: '09:00',
      end: '13:00',
      title: 'Keep all exterior windows and doors tightly sealed',
      reason: 'Minimizes infiltration of heavy outdoor particulate pollution.',
      params: {},
      completed: true,
    });
  }

  // Action 3: Daily Ventilation Strategy
  if (windows.canVentilateToday && windows.bestWindow) {
    actions.push({
      id: 'act_ventilate_window',
      type: 'ventilate',
      memberId: null,
      start: windows.bestWindow.startTime,
      end: windows.bestWindow.endTime,
      title: 'Open windows during clean air window',
      reason: 'Flushes indoor carbon dioxide safely while outdoor PM2.5 is at daily low.',
      params: {
        worstStart: windows.worstWindow?.startTime || '08:00',
        worstEnd: windows.worstWindow?.endTime || '10:00',
      },
      completed: false,
    });
  } else {
    actions.push({
      id: 'act_keep_closed_all_day',
      type: 'keep_closed',
      memberId: null,
      start: '13:00',
      end: '16:00',
      title: 'Keep windows sealed throughout the afternoon',
      reason: 'Outdoor air remains heavily polluted; prioritize indoor air filtration.',
      params: {},
      completed: false,
    });
  }

  // Action 4: Evening Exercise / Routine Shift
  if (childMember) {
    actions.push({
      id: 'act_shift_child_sports',
      type: 'move_activity_indoors',
      memberId: childMember.id,
      start: '17:00',
      end: '18:30',
      title: `Move ${childMember.name}'s sports practice indoors`,
      reason: 'Avoids heavy respiration of roadside dust and evening traffic soot.',
      params: { intensity: 'vigorous' },
      completed: false,
    });
  } else if (elderlyMember) {
    actions.push({
      id: 'act_shift_elderly_walk',
      type: 'move_activity_indoors',
      memberId: elderlyMember.id,
      start: '17:30',
      end: '18:30',
      title: `Move ${elderlyMember.name}'s evening walk to indoor corridor`,
      reason: 'Protects cardiovascular baseline during evening winter inversion.',
      params: { intensity: 'light' },
      completed: false,
    });
  } else {
    actions.push({
      id: 'act_shift_exercise',
      type: 'move_activity_indoors',
      memberId: profile.members[0]?.id || null,
      start: '18:00',
      end: '19:00',
      title: 'Exercise indoors with purifier rather than outdoors',
      reason: 'Prevents deep lung penetration during evening ground ozone spike.',
      params: { intensity: 'moderate' },
      completed: false,
    });
  }

  // Action 5: Commute mode alternative (if commuting by solo car/bike)
  if (profile.commute.mode.startsWith('car_') || profile.commute.mode === 'two_wheeler') {
    actions.push({
      id: 'act_commute_metro',
      type: 'change_commute_mode',
      memberId: adultMember?.id || profile.members[0]?.id || null,
      start: profile.commute.departs || '08:30',
      end: '09:30',
      title: 'Take Metro Rail instead of solo driving',
      reason: 'Substantially reduces your transit tailpipe exposure and direct transport emissions.',
      params: {
        baselineMode: profile.commute.mode,
        targetMode: 'metro',
        distanceKm: profile.commute.distanceKm || 18,
      },
      completed: false,
    });
  }

  // Action 6: Kitchen Exhaust Fan before cooking
  if (profile.hasExhaust) {
    actions.push({
      id: 'act_kitchen_exhaust',
      type: 'use_exhaust_while_cooking',
      memberId: null,
      start: '19:30',
      end: '20:30',
      title: 'Turn on kitchen exhaust fan before cooking',
      reason: 'Extracts ultra-fine oil aerosols and unburned combustion gases before dispersal.',
      params: {},
      completed: false,
    });
  }

  // Compute verifiable receipt for every single action
  return actions.map((act) => ({
    ...act,
    impact: computeActionImpact(act, profile, getHourlyPm25),
  }));
}
