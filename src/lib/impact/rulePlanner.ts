import { PlannedAction, Profile, HourlyForecastPoint } from '../../types';
import { DayWindowsResult } from '../aqi';
import { computeActionImpact, ActionImpactResult } from './actionImpact';
import { makePm25Lookup } from './exposure';
import { URBAN_SPEEDS_KMH } from './constants';

export interface EnrichedAction extends PlannedAction {
  impact: ActionImpactResult;
}

/**
 * Adds hours (or fractional hours) to a HH:mm time string.
 */
export function addHoursToTime(startStr: string, durationHours: number): string {
  const [h, m] = startStr.split(':').map(Number);
  const totalMinutes = Math.round(h * 60 + m + durationHours * 60);
  const endH = Math.floor(totalMinutes / 60) % 24;
  const endM = totalMinutes % 60;
  return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
}

/**
 * Converts HH:mm string to minutes from midnight.
 */
function timeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

/**
 * Checks if two time intervals [start1, end1] and [start2, end2] overlap.
 */
export function intervalsOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
  const s1 = timeToMinutes(start1);
  const e1 = timeToMinutes(end1);
  const s2 = timeToMinutes(start2);
  const e2 = timeToMinutes(end2);
  return Math.max(s1, s2) < Math.min(e1, e2);
}

/**
 * Generates a deterministic, rule-based daily air quality action plan.
 * Serves as both the P0 standalone daily plan and the permanent fallback
 * if Gemini model calls fail or validate improperly.
 *
 * Rules:
 * - completed: false for every action (never pre-ticked).
 * - Times derived strictly from forecast windows and profile commute/routines.
 * - Plain language only: no technical jargon (soot, inversion, ozone spike, etc.).
 * - De-duplication: Never emits overlapping actions for the same member.
 */
export function generateRuleBasedPlan(
  profile: Profile,
  forecastPoints: HourlyForecastPoint[],
  windows: DayWindowsResult
): EnrichedAction[] {
  const getHourlyPm25 = makePm25Lookup(forecastPoints);
  const candidateActions: PlannedAction[] = [];

  const adultMember = profile.members.find((m) => m.ageGroup === 'adult') || profile.members[0];

  // 1. Daily Ventilation Window
  if (windows.canVentilateToday && windows.bestWindow) {
    candidateActions.push({
      id: 'act_ventilate_window',
      type: 'ventilate',
      memberId: null,
      start: windows.bestWindow.startTime,
      end: windows.bestWindow.endTime,
      title: 'Open windows during clean air window',
      reason: 'Flushes stale indoor air safely while outdoor PM2.5 is at its lowest daily level.',
      params: windows.worstWindow
        ? {
            worstStart: windows.worstWindow.startTime,
            worstEnd: windows.worstWindow.endTime,
          }
        : {},
      completed: false,
    });
  }

  // 2. Indoor Air Filtration / Windows Sealed during Peak Hours
  if (windows.worstWindow) {
    if (profile.hasPurifier) {
      candidateActions.push({
        id: 'act_purifier_peak',
        type: 'run_purifier',
        memberId: null,
        start: windows.worstWindow.startTime,
        end: windows.worstWindow.endTime,
        title: 'Run air purifier on high speed in living room',
        reason: 'Cleans indoor air actively while outdoor pollution is at its daily peak.',
        params: { room: 'living_room' },
        completed: false,
      });
    } else {
      candidateActions.push({
        id: 'act_keep_closed_peak',
        type: 'keep_closed',
        memberId: null,
        start: windows.worstWindow.startTime,
        end: windows.worstWindow.endTime,
        title: 'Keep windows and doors sealed tightly',
        reason: 'Reduces outdoor pollution from leaking indoors while outdoor air quality is poorest.',
        params: {},
        completed: false,
      });
    }
  }

  // 3. Member Routine Shifts (Exercise / Sports)
  for (const member of profile.members) {
    if (member.routine && member.routine.outdoors && member.routine.start && member.routine.end) {
      candidateActions.push({
        id: `act_routine_${member.id}`,
        type: 'move_activity_indoors',
        memberId: member.id,
        start: member.routine.start,
        end: member.routine.end,
        title: `Move ${member.name}'s ${member.routine.label.toLowerCase()} indoors`,
        reason: 'Protects heart and lungs from elevated outdoor pollution during physical exertion.',
        params: { intensity: member.routine.intensity || 'moderate' },
        completed: false,
      });
    }
  }

  // 4. Commute Actions (Morning departure and evening return)
  if (adultMember && profile.commute && profile.commute.departs && profile.commute.returns) {
    const distanceKm = profile.commute.distanceKm;
    if (distanceKm > 0) {
      const mode = profile.commute.mode;
      const speedKmh = URBAN_SPEEDS_KMH[mode] || 25;
      const tripDurationHours = Math.max(0.25, distanceKm / speedKmh);

      const morningStart = profile.commute.departs;
      const morningEnd = addHoursToTime(morningStart, tripDurationHours);

      const eveningStart = profile.commute.returns;
      const eveningEnd = addHoursToTime(eveningStart, tripDurationHours);

      // Morning Commute Action
      if (mode.startsWith('car_') || mode === 'two_wheeler') {
        candidateActions.push({
          id: 'act_commute_metro',
          type: 'change_commute_mode',
          memberId: adultMember.id,
          start: morningStart,
          end: morningEnd,
          title: 'Take Metro Rail instead of driving',
          reason: 'Reduces vehicle exhaust exposure and cuts direct tailpipe carbon emissions.',
          params: {
            baselineMode: mode,
            targetMode: 'metro',
            distanceKm,
          },
          completed: false,
        });
      } else if (['bus', 'two_wheeler', 'walk', 'cycle'].includes(mode)) {
        candidateActions.push({
          id: 'act_commute_mask_morning',
          type: 'wear_mask',
          memberId: adultMember.id,
          start: morningStart,
          end: morningEnd,
          title: 'Wear N95 mask during morning commute',
          reason: 'Filters fine particulate matter and vehicle exhaust during transit.',
          params: { mask: 'n95', intensity: 'light' },
          completed: false,
        });
      }

      // Evening Commute Return Trip Action
      if (['bus', 'two_wheeler', 'walk', 'cycle'].includes(mode)) {
        candidateActions.push({
          id: 'act_commute_mask_evening',
          type: 'wear_mask',
          memberId: adultMember.id,
          start: eveningStart,
          end: eveningEnd,
          title: 'Wear N95 mask during evening return trip',
          reason: 'Protects breathing passages during evening transit congestion.',
          params: { mask: 'n95', intensity: 'light' },
          completed: false,
        });
      }
    }
  }

  // 5. Kitchen Exhaust Fan (Cooking)
  if (profile.hasExhaust) {
    if (profile.cookingTimes && profile.cookingTimes.length > 0) {
      for (let i = 0; i < profile.cookingTimes.length; i++) {
        const ct = profile.cookingTimes[i];
        candidateActions.push({
          id: `act_kitchen_exhaust_${i}`,
          type: 'use_exhaust_while_cooking',
          memberId: null,
          start: ct.start,
          end: ct.end,
          title: 'Turn on kitchen exhaust fan while cooking',
          reason: 'Removes cooking smoke and combustion particles directly at the stove.',
          params: {},
          completed: false,
        });
      }
    } else {
      // Until cookingTimes is set in onboarding, emit action without fixed time or time-bound receipt
      candidateActions.push({
        id: 'act_kitchen_exhaust',
        type: 'use_exhaust_while_cooking',
        memberId: null,
        start: '',
        end: '',
        title: 'Turn on kitchen exhaust fan while cooking',
        reason: 'Removes cooking smoke and combustion particles directly at the stove.',
        params: {},
        completed: false,
      });
    }
  }

  // De-duplication: Never emit overlapping actions for the same member
  const deduplicatedActions: PlannedAction[] = [];
  for (const candidate of candidateActions) {
    if (candidate.memberId !== null) {
      const hasOverlap = deduplicatedActions.some(
        (a) => a.memberId === candidate.memberId && intervalsOverlap(a.start, a.end, candidate.start, candidate.end)
      );
      if (!hasOverlap) {
        deduplicatedActions.push(candidate);
      }
    } else {
      // For household actions (memberId === null), avoid overlapping identical or conflicting windows
      const hasOverlap = deduplicatedActions.some(
        (a) => a.memberId === null && intervalsOverlap(a.start, a.end, candidate.start, candidate.end)
      );
      if (!hasOverlap) {
        deduplicatedActions.push(candidate);
      }
    }
  }

  // Ensure completed is false for every single action
  const finalActions = deduplicatedActions.map((act) => ({
    ...act,
    completed: false,
  }));

  // Compute verifiable receipt for every single action
  return finalActions.map((act) => ({
    ...act,
    impact: computeActionImpact(act, profile, getHourlyPm25),
  }));
}
