import { ActionType, PlannedAction, Profile, TravelMode, Intensity } from '../../types';
import { containsQuantity } from './containsQuantity';

export const ALLOWED_ACTION_TYPES: ActionType[] = [
  'ventilate',
  'keep_closed',
  'run_purifier',
  'shift_outdoor_activity',
  'move_activity_indoors',
  'wear_mask',
  'change_commute_mode',
  'shift_commute_time',
  'use_exhaust_while_cooking',
  'avoid_indoor_combustion',
];

const VALID_TRAVEL_MODES: Set<TravelMode> = new Set([
  'walk',
  'cycle',
  'metro',
  'bus',
  'auto_cng',
  'two_wheeler',
  'car_petrol',
  'car_diesel',
  'car_cng',
  'car_ev',
  'carpool',
]);

const VALID_INTENSITIES: Set<Intensity> = new Set(['rest', 'light', 'moderate', 'vigorous']);
const VALID_MASKS = new Set(['none', 'cloth', 'surgical', 'n95', 'ffp2']);

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

function parseTimeToMinutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export interface PlanValidationResult {
  success: boolean;
  actions?: PlannedAction[];
  error?: string;
}

/**
 * Pure validator for raw Gemini-generated daily plans.
 * Enforces:
 * - Fixed ActionType enum membership
 * - Valid time format, start/end inside 24h day, and end > start
 * - Unknown memberId fails validation (no silent null)
 * - Quantitative numbers in title/reason rejected (allowing N95, PM2.5, etc.)
 * - Valid params per ActionType
 * - Rejection of overlapping actions for the same household member
 */
export function validatePlan(data: any, profile: Profile): PlanValidationResult {
  if (!Array.isArray(data)) {
    return { success: false, error: 'Output is not an array of actions' };
  }

  if (data.length < 2) {
    return { success: false, error: `Plan has too few actions (${data.length}), expected at least 2` };
  }

  const validMemberIds = new Set(profile.members.map((m) => m.id));
  const validatedActions: PlannedAction[] = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (!item || typeof item !== 'object') {
      return { success: false, error: `Action at index ${i} is not a valid object` };
    }

    // 1. Action Type
    if (!ALLOWED_ACTION_TYPES.includes(item.type)) {
      return { success: false, error: `Invalid action type "${item.type}" at index ${i}` };
    }

    // 2. Member ID: must be null or an existing member ID (fail on unknown memberId)
    let memberId: string | null = null;
    if (item.memberId !== undefined && item.memberId !== null && item.memberId !== '') {
      if (typeof item.memberId !== 'string' || !validMemberIds.has(item.memberId)) {
        return {
          success: false,
          error: `Unknown memberId "${item.memberId}" at index ${i}. Must match an ID from household profile or be null`,
        };
      }
      memberId = item.memberId;
    }

    // 3. Start & End times
    if (typeof item.start !== 'string' || !TIME_REGEX.test(item.start)) {
      return { success: false, error: `Invalid start time "${item.start}" at index ${i}. Must be HH:mm format` };
    }
    if (typeof item.end !== 'string' || !TIME_REGEX.test(item.end)) {
      return { success: false, error: `Invalid end time "${item.end}" at index ${i}. Must be HH:mm format` };
    }

    const startMins = parseTimeToMinutes(item.start);
    const endMins = parseTimeToMinutes(item.end);
    if (endMins <= startMins) {
      return {
        success: false,
        error: `Action at index ${i} has end time (${item.end}) not strictly after start time (${item.start})`,
      };
    }

    // 4. Title & Reason: strings, length, and no unpermitted numbers
    if (typeof item.title !== 'string' || item.title.trim().length === 0) {
      return { success: false, error: `Missing or empty title at index ${i}` };
    }
    if (item.title.length > 70) {
      return { success: false, error: `Title at index ${i} exceeds maximum character limit (${item.title.length} > 70)` };
    }
    if (containsQuantity(item.title)) {
      return {
        success: false,
        error: `Title at index ${i} ("${item.title}") contains forbidden numeric measurements or quantities`,
      };
    }

    if (typeof item.reason !== 'string' || item.reason.trim().length === 0) {
      return { success: false, error: `Missing or empty reason at index ${i}` };
    }
    if (item.reason.length > 180) {
      return { success: false, error: `Reason at index ${i} exceeds maximum character limit (${item.reason.length} > 180)` };
    }
    if (containsQuantity(item.reason)) {
      return {
        success: false,
        error: `Reason at index ${i} ("${item.reason}") contains forbidden numeric measurements or quantities`,
      };
    }

    // 5. Params validation per ActionType
    const rawParams = item.params && typeof item.params === 'object' ? item.params : {};
    const params: Record<string, any> = {};

    if (item.type === 'wear_mask') {
      if (rawParams.mask && typeof rawParams.mask === 'string') {
        const maskLower = rawParams.mask.toLowerCase();
        if (VALID_MASKS.has(maskLower)) {
          params.mask = maskLower;
        }
      }
      if (rawParams.intensity && typeof rawParams.intensity === 'string') {
        if (VALID_INTENSITIES.has(rawParams.intensity as Intensity)) {
          params.intensity = rawParams.intensity;
        }
      }
    } else if (item.type === 'change_commute_mode') {
      if (rawParams.baselineMode && VALID_TRAVEL_MODES.has(rawParams.baselineMode)) {
        params.baselineMode = rawParams.baselineMode;
      }
      if (rawParams.targetMode && VALID_TRAVEL_MODES.has(rawParams.targetMode)) {
        params.targetMode = rawParams.targetMode;
      }
    } else if (item.type === 'shift_outdoor_activity' || item.type === 'shift_commute_time') {
      if (rawParams.originalStart && typeof rawParams.originalStart === 'string' && TIME_REGEX.test(rawParams.originalStart)) {
        params.originalStart = rawParams.originalStart;
      }
      if (rawParams.originalEnd && typeof rawParams.originalEnd === 'string' && TIME_REGEX.test(rawParams.originalEnd)) {
        params.originalEnd = rawParams.originalEnd;
      }
      if (rawParams.intensity && VALID_INTENSITIES.has(rawParams.intensity)) {
        params.intensity = rawParams.intensity;
      }
    } else if (item.type === 'ventilate') {
      if (rawParams.worstStart && typeof rawParams.worstStart === 'string' && TIME_REGEX.test(rawParams.worstStart)) {
        params.worstStart = rawParams.worstStart;
      }
      if (rawParams.worstEnd && typeof rawParams.worstEnd === 'string' && TIME_REGEX.test(rawParams.worstEnd)) {
        params.worstEnd = rawParams.worstEnd;
      }
    }

    validatedActions.push({
      id: `gemini_act_${i}_${Date.now()}`,
      type: item.type,
      memberId,
      start: item.start,
      end: item.end,
      title: item.title.trim(),
      reason: item.reason.trim(),
      params,
      completed: false,
    });
  }

  // 6. Overlapping actions check for the same member
  for (let i = 0; i < validatedActions.length; i++) {
    for (let j = i + 1; j < validatedActions.length; j++) {
      const a = validatedActions[i];
      const b = validatedActions[j];

      // Only check if both actions target the exact same member
      if (a.memberId !== null && a.memberId === b.memberId) {
        const aStart = parseTimeToMinutes(a.start);
        const aEnd = parseTimeToMinutes(a.end);
        const bStart = parseTimeToMinutes(b.start);
        const bEnd = parseTimeToMinutes(b.end);

        // Check if [aStart, aEnd] overlaps with [bStart, bEnd]
        if (aStart < bEnd && aEnd > bStart) {
          return {
            success: false,
            error: `Overlapping actions for member "${a.memberId}": "${a.title}" (${a.start}–${a.end}) overlaps with "${b.title}" (${b.start}–${b.end})`,
          };
        }
      }
    }
  }

  return { success: true, actions: validatedActions };
}
