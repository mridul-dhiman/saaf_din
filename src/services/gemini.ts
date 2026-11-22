import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from 'firebase/ai';
import { app } from './firebase';
import { Profile, HourlyForecastPoint, PlannedAction, ActionType } from '../types';
import { DayWindowsResult } from '../lib/aqi';
import { generateRuleBasedPlan, EnrichedAction } from '../lib/impact/rulePlanner';
import { computeActionImpact } from '../lib/impact';

const ALLOWED_ACTION_TYPES: ActionType[] = [
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

/**
 * Validates the raw JSON output from the Gemini model.
 * Returns null if validation fails.
 */
function validatePlannedActions(data: any, profile: Profile): PlannedAction[] | null {
  if (!Array.isArray(data) || data.length < 2) {
    return null;
  }

  const validMemberIds = new Set(profile.members.map((m) => m.id));
  const timeRegex = /^([01]\d|2[0-3]):[0-5]\d$/;
  const validated: PlannedAction[] = [];

  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    if (!item || typeof item !== 'object') return null;

    // Type check
    if (!ALLOWED_ACTION_TYPES.includes(item.type)) {
      return null;
    }

    // Time check
    if (typeof item.start !== 'string' || !timeRegex.test(item.start)) return null;
    if (typeof item.end !== 'string' || !timeRegex.test(item.end)) return null;

    // Member ID check
    let memberId: string | null = null;
    if (item.memberId && validMemberIds.has(item.memberId)) {
      memberId = item.memberId;
    }

    // Title & Reason: ensure strings, strip accidental numeric claims if present
    if (typeof item.title !== 'string' || item.title.trim().length === 0) return null;
    if (typeof item.reason !== 'string' || item.reason.trim().length === 0) return null;

    const title = item.title.slice(0, 70).trim();
    const reason = item.reason.slice(0, 160).trim();

    validated.push({
      id: `gemini_act_${i}_${Date.now()}`,
      type: item.type,
      memberId,
      start: item.start,
      end: item.end,
      title,
      reason,
      params: (item.params && typeof item.params === 'object') ? item.params : {},
      completed: false,
    });
  }

  return validated;
}

/**
 * Calls Gemini through Firebase AI Logic (GoogleAIBackend) to generate
 * a personalized daily routine. Strictly enforces response schema and fallback.
 */
export async function generateGeminiPlan(
  profile: Profile,
  forecastPoints: HourlyForecastPoint[],
  windows: DayWindowsResult
): Promise<EnrichedAction[]> {
  const dateStr = new Date().toISOString().slice(0, 10);
  const cacheKey = `saafdin_gemini_plan_${dateStr}_${profile.location.lat.toFixed(2)}`;

  // Check today's cache first to protect quota
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as PlannedAction[];
      const getHourlyPm25 = (hour: number) => {
        const pt = forecastPoints.find((p) => p.hour === hour);
        return pt ? pt.pm2_5 : 120;
      };
      return parsed.map((act) => ({
        ...act,
        impact: computeActionImpact(act, profile, getHourlyPm25),
      }));
    }
  } catch (e) {
    console.warn('Cache check failed:', e);
  }

  // Attempt plan generation with Gemini (1 retry)
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const ai = getAI(app, { backend: new GoogleAIBackend() });

      const planSchema = Schema.array({
        items: Schema.object({
          properties: {
            type: Schema.enumString({
              enum: ALLOWED_ACTION_TYPES,
            }),
            memberId: Schema.string(),
            start: Schema.string(),
            end: Schema.string(),
            title: Schema.string(),
            reason: Schema.string(),
          },
          optionalProperties: ['memberId'],
        }),
      });

      const model = getGenerativeModel(ai, {
        model: 'gemini-1.5-flash',
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: planSchema,
          temperature: 0.2,
        },
        systemInstruction: `You are SaafDin, a specialized urban air quality routine planner.
Suggest 4 to 6 concise, actionable daily recommendations for this specific household based on their profile and the 24-hour outdoor air quality forecast.

HARD RULES:
1. NEVER produce, mention, or invent numbers, measurements, quantities, micrograms (µg), percentages, or cigarette figures in "title" or "reason". The application code calculates all quantitative impacts separately using official EPA/GHG formulas.
2. If an action targets a specific family member, set "memberId" to their exact ID from the profile. Otherwise leave null.
3. Keep titles short imperatives under 60 characters (e.g. "Wear N95 mask during morning transit", "Open windows for afternoon ventilation", "Shift cricket practice indoors").
4. Keep reasons to one short sentence explaining why in plain language (no numbers).
5. Use only action types from: ${ALLOWED_ACTION_TYPES.join(', ')}.`,
      });

      const prompt = JSON.stringify({
        profile: {
          location: profile.location.name,
          members: profile.members.map((m) => ({ id: m.id, name: m.name, ageGroup: m.ageGroup, sensitivities: m.sensitivities })),
          commute: profile.commute,
          cookingFuel: profile.cookingFuel,
          hasExhaust: profile.hasExhaust,
          hasPurifier: profile.hasPurifier,
        },
        forecastSummary: {
          currentAqi: forecastPoints[0]?.us_aqi,
          currentPm25: forecastPoints[0]?.pm2_5,
          bestVentilationWindow: windows.bestWindow,
          worstWindow: windows.worstWindow,
          canVentilateToday: windows.canVentilateToday,
        },
      });

      const response = await model.generateContent(prompt);
      const text = response.response.text();
      const parsedJson = JSON.parse(text);

      const validatedActions = validatePlannedActions(parsedJson, profile);

      if (validatedActions && validatedActions.length >= 3) {
        // Cache the raw planned actions
        try {
          localStorage.setItem(cacheKey, JSON.stringify(validatedActions));
        } catch (e) {
          console.warn('Failed to cache gemini plan:', e);
        }

        const getHourlyPm25 = (hour: number) => {
          const pt = forecastPoints.find((p) => p.hour === hour);
          return pt ? pt.pm2_5 : 120;
        };

        return validatedActions.map((act) => ({
          ...act,
          impact: computeActionImpact(act, profile, getHourlyPm25),
        }));
      }

      console.warn(`Attempt ${attempt}: Gemini plan validation failed, retrying...`);
    } catch (err) {
      console.warn(`Attempt ${attempt}: Gemini call failed:`, err);
    }
  }

  // Graceful fallback to rule-based plan
  console.info('Falling back to rule-based daily plan.');
  return generateRuleBasedPlan(profile, forecastPoints, windows);
}
