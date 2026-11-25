import { ActionType, Profile } from '../../types';
import { ALLOWED_ACTION_TYPES } from './validatePlan';
import { containsQuantity } from './containsQuantity';

const TIME_REGEX = /^([01]\d|2[0-3]):[0-5]\d$/;

export interface AssistantRecommendedAction {
  type: ActionType;
  title: string;
  start: string;
  end: string;
  memberId: string | null;
}

export interface ValidatedAssistantReply {
  replyText: string;
  recommendedAction?: AssistantRecommendedAction;
}

/**
 * Validates the assistant model response.
 * Enforces:
 * - replyText is verified against the quantity detector, allowing ONLY values passed in from forecast
 * - recommendedAction.type is verified against ALLOWED_ACTION_TYPES
 * - memberId must be an existing member in profile or null
 * - Action title has no quantitative claims
 * Returns null if validation fails.
 */
export function validateAssistantReply(
  data: any,
  profile: Profile,
  allowedForecastValues: (number | string)[] = []
): ValidatedAssistantReply | null {
  if (!data || typeof data !== 'object') {
    return null;
  }

  // 1. Reply Text
  if (typeof data.replyText !== 'string' || data.replyText.trim().length === 0) {
    return null;
  }

  const replyText = data.replyText.trim();

  // Quantity check: only allow values explicitly passed in from the forecast
  if (containsQuantity(replyText, allowedForecastValues)) {
    return null;
  }

  // 2. Recommended Action (Optional)
  let recommendedAction: AssistantRecommendedAction | undefined = undefined;

  if (data.recommendedAction && typeof data.recommendedAction === 'object') {
    const rawAct = data.recommendedAction;
    if (rawAct.type && ALLOWED_ACTION_TYPES.includes(rawAct.type)) {
      const type = rawAct.type as ActionType;

      // Title
      const title = typeof rawAct.title === 'string' ? rawAct.title.trim() : 'Recommended Routine Action';
      if (containsQuantity(title)) {
        return null;
      }

      // Member ID
      let memberId: string | null = null;
      if (rawAct.memberId && typeof rawAct.memberId === 'string') {
        const found = profile.members.find((m) => m.id === rawAct.memberId);
        if (found) {
          memberId = found.id;
        }
      }

      // Start & End
      const start = typeof rawAct.start === 'string' && TIME_REGEX.test(rawAct.start) ? rawAct.start : '10:00';
      const end = typeof rawAct.end === 'string' && TIME_REGEX.test(rawAct.end) ? rawAct.end : '12:00';

      recommendedAction = {
        type,
        title,
        start,
        end,
        memberId,
      };
    }
  }

  return {
    replyText,
    recommendedAction,
  };
}
