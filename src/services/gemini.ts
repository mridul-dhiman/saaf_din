import { getAI, getGenerativeModel, GoogleAIBackend, Schema } from 'firebase/ai';
import { app } from './firebase';
import { Profile, HourlyForecastPoint, PlannedAction, HourlyForecast } from '../types';
import { DayWindowsResult } from '../lib/aqi';
import { generateRuleBasedPlan, EnrichedAction } from '../lib/impact/rulePlanner';
import { computeActionImpact, makePm25Lookup } from '../lib/impact';
import {
  validatePlan,
  validateRoomFindings,
  validateAssistantReply,
  ALLOWED_ACTION_TYPES,
  RoomFinding,
  ValidatedAssistantReply,
} from '../lib/ai';

/**
 * Current Flash-class model in Firebase AI Logic
 * Documentation source: https://firebase.google.com/docs/ai-logic/models
 */
export const GEMINI_MODEL = 'gemini-2.5-flash';

/**
 * Deterministic hash of string for cache keys
 */
function hashString(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return Math.abs(hash).toString(36);
}

// -----------------------------------------------------------------------------
// 1. Plan Generation
// -----------------------------------------------------------------------------

const planActionSchema = Schema.object({
  properties: {
    type: Schema.enumString({
      enum: ALLOWED_ACTION_TYPES,
    }),
    memberId: Schema.string(),
    start: Schema.string(),
    end: Schema.string(),
    title: Schema.string(),
    reason: Schema.string(),
    params: Schema.object({
      properties: {
        mask: Schema.string(),
        intensity: Schema.string(),
        baselineMode: Schema.string(),
        targetMode: Schema.string(),
        originalStart: Schema.string(),
        originalEnd: Schema.string(),
        worstStart: Schema.string(),
        worstEnd: Schema.string(),
      },
      optionalProperties: [
        'mask',
        'intensity',
        'baselineMode',
        'targetMode',
        'originalStart',
        'originalEnd',
        'worstStart',
        'worstEnd',
      ],
    }),
  },
  optionalProperties: ['memberId', 'params'],
});

const planResponseSchema = Schema.array({
  items: planActionSchema,
});

/**
 * Calls Gemini through Firebase AI Logic (GoogleAIBackend) to generate
 * a personalized daily routine. Strictly enforces response schema and fallback.
 */
export async function generatePlan(
  profile: Profile,
  forecastPoints: HourlyForecastPoint[],
  windows: DayWindowsResult,
  adoptedSwaps: any[] = []
): Promise<EnrichedAction[]> {
  const dateStr = new Date().toISOString().slice(0, 10);
  const profileHash = hashString(JSON.stringify(profile));
  const cacheKey = `saafdin_plan_${dateStr}_${profileHash}`;

  // Check today's cache first to protect quota
  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) {
      const parsed = JSON.parse(cached) as PlannedAction[];
      const getHourlyPm25 = makePm25Lookup(forecastPoints);
      return parsed.map((act) => ({
        ...act,
        impact: computeActionImpact(act, profile, getHourlyPm25),
      }));
    }
  } catch (e) {
    console.warn('Cache check failed:', e);
  }

  let lastErrorHint = '';

  // Attempt plan generation with Gemini (1 retry with error hint)
  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const ai = getAI(app, { backend: new GoogleAIBackend() });

      const model = getGenerativeModel(ai, {
        model: GEMINI_MODEL,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: planResponseSchema,
          temperature: 0.2,
        },
        systemInstruction: `You are SaafDin, a specialized urban air quality routine planner for Indian cities.
Suggest 4 to 6 concise, actionable daily recommendations for this specific household based on their profile, adopted habit swaps, and the outdoor forecast.
The user's preferred language is ${profile.language === 'hi' ? 'Hindi' : 'English'}.

HARD RULES:
1. NEVER produce or invent numbers, measurements, quantities, micrograms (µg), percentages, durations, or cigarette figures in "title" or "reason". The application code calculates all quantitative impacts separately using official EPA/GHG formulas.
2. If an action targets a specific family member, set "memberId" to their exact ID from the profile. If for the whole household, leave null. Do NOT invent unknown member IDs.
3. Keep titles short imperatives under 60 characters (e.g. "Wear N95 mask during morning transit", "Open windows for afternoon ventilation").
4. Keep reasons to one short sentence explaining why in plain language (no numbers).
5. Times belong in "start" and "end" (HH:mm format, end > start), NOT in text.
6. Do NOT suggest overlapping actions for the same family member.
7. Use only action types from: ${ALLOWED_ACTION_TYPES.join(', ')}.`,
      });

      const promptPayload: any = {
        profile: {
          location: profile.location.name,
          members: profile.members.map((m) => ({
            id: m.id,
            name: m.name,
            ageGroup: m.ageGroup,
            sensitivities: m.sensitivities,
            routine: m.routine,
          })),
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
        adoptedSwaps: adoptedSwaps.map((s: any) => ({
          title: s.title,
          fromHabit: s.fromHabit,
          toHabit: s.toHabit,
        })),
      };

      if (lastErrorHint) {
        promptPayload.validationCorrectionNotice = `CRITICAL: Your previous generation failed validation with error: "${lastErrorHint}". Correct this in the output.`;
      }

      const response = await model.generateContent(JSON.stringify(promptPayload));
      const text = response.response.text();
      const parsedJson = JSON.parse(text);

      const validation = validatePlan(parsedJson, profile);

      if (validation.success && validation.actions && validation.actions.length >= 2) {
        // Cache the raw planned actions
        try {
          localStorage.setItem(cacheKey, JSON.stringify(validation.actions));
        } catch (e) {
          console.warn('Failed to cache gemini plan:', e);
        }

        const getHourlyPm25 = makePm25Lookup(forecastPoints);
        return validation.actions.map((act) => ({
          ...act,
          impact: computeActionImpact(act, profile, getHourlyPm25),
        }));
      }

      lastErrorHint = validation.error || 'Schema validation failed';
      console.warn(`Attempt ${attempt}: Gemini plan validation failed (${lastErrorHint}), retrying...`);
    } catch (err: any) {
      lastErrorHint = err?.message || 'Network or parse error';
      console.warn(`Attempt ${attempt}: Gemini call failed:`, err);
    }
  }

  // Graceful fallback to rule-based plan
  console.info('Falling back to rule-based daily plan.');
  return generateRuleBasedPlan(profile, forecastPoints, windows);
}

export const generateGeminiPlan = generatePlan;

// -----------------------------------------------------------------------------
// 2. Room Scan Audit
// -----------------------------------------------------------------------------

const roomFindingItemSchema = Schema.object({
  properties: {
    title: Schema.string(),
    issue: Schema.string(),
    fix: Schema.string(),
    category: Schema.enumString({ enum: ['leak', 'airflow', 'source', 'filtration'] }),
    impact: Schema.enumString({ enum: ['high', 'medium', 'low'] }),
    cost: Schema.enumString({ enum: ['free', 'low', 'medium'] }),
    point: Schema.object({
      properties: {
        x: Schema.number(),
        y: Schema.number(),
      },
    }),
  },
});

const roomScanResponseSchema = Schema.array({
  items: roomFindingItemSchema,
});

/**
 * Calls Gemini multimodal vision to audit an indoor room photo.
 * Drops invalid findings rather than inventing defaults; markers and list match 1-to-1.
 * Returns null on failure so the UI displays an error state with retry.
 */
export async function analyseRoom(base64Image: string): Promise<RoomFinding[] | null> {
  const base64Data = base64Image.split(',')[1] || '';
  if (!base64Data || base64Image.startsWith('data:image/svg+xml')) {
    return null;
  }

  let errorHint = '';

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const ai = getAI(app, { backend: new GoogleAIBackend() });
      const model = getGenerativeModel(ai, {
        model: GEMINI_MODEL,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: roomScanResponseSchema,
          temperature: 0.2,
        },
        systemInstruction: `You are an expert indoor air quality assistant. Inspect the photo of a room for:
1. Leak points (gaps around balcony doors, unsealed windows, AC conduit wall entries)
2. Airflow obstructions (purifiers pushed against walls, blocked intake vents, closed corridors)
3. Unvented combustion sources (incense/agarbatti, dhoop, open kitchen gas fumes, unvented heating)
4. Filtration opportunities (placement of portable air purifiers)

CRITICAL RULES:
- NEVER produce numbers, measurements, or µg/m³ quantities in title, issue, or fix.
- Category must be one of: leak, airflow, source, filtration.
- Impact must be one of: high, medium, low.
- Cost must be one of: free, low, medium.
- Point coordinates x and y must be normalized fractions between 0.0 and 1.0 locating the feature on the image.`,
      });

      const promptParts: any[] = [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: base64Data,
          },
        },
        errorHint
          ? `Inspect this room for air infiltration leaks and air cleaner placement. Correction note: ${errorHint}`
          : 'Inspect this room for air infiltration leaks and air cleaner placement.',
      ];

      const response = await model.generateContent(promptParts);
      const text = response.response.text();
      const parsed = JSON.parse(text);

      const validated = validateRoomFindings(parsed);
      if (validated && validated.length > 0) {
        return validated;
      }

      errorHint = 'Output contained invalid findings or numbers in copy';
      console.warn(`Attempt ${attempt}: Room scan validation failed, retrying...`);
    } catch (err: any) {
      errorHint = err?.message || 'Vision model error';
      console.warn(`Attempt ${attempt}: Room scan failed:`, err);
    }
  }

  return null;
}

// -----------------------------------------------------------------------------
// 3. Assistant Chat
// -----------------------------------------------------------------------------

const assistantReplySchema = Schema.object({
  properties: {
    replyText: Schema.string(),
    recommendedAction: Schema.object({
      properties: {
        type: Schema.enumString({ enum: ALLOWED_ACTION_TYPES }),
        title: Schema.string(),
        start: Schema.string(),
        end: Schema.string(),
        memberId: Schema.string(),
      },
      optionalProperties: ['memberId', 'start', 'end', 'title', 'type'],
    }),
  },
  optionalProperties: ['recommendedAction'],
});

/**
 * Calls Gemini to answer household air quality queries.
 * Validates reply text against unpermitted invented numbers, allowing only
 * numbers explicitly provided from the forecast.
 */
export async function askAssistant(
  userQuery: string,
  profile: Profile,
  forecast: HourlyForecast | null,
  windows: DayWindowsResult,
  currentPlan: EnrichedAction[] = []
): Promise<ValidatedAssistantReply | null> {
  const currentAqi = forecast?.points[0]?.us_aqi;
  const currentPm25 = forecast?.points[0]?.pm2_5;

  const allowedForecastValues: (number | string)[] = [];
  if (currentAqi !== undefined && currentAqi !== null) allowedForecastValues.push(currentAqi);
  if (currentPm25 !== undefined && currentPm25 !== null) allowedForecastValues.push(currentPm25);
  if (windows.bestWindow) {
    allowedForecastValues.push(windows.bestWindow.startTime);
    allowedForecastValues.push(windows.bestWindow.endTime);
    if (windows.bestWindow.meanPm25 !== null) allowedForecastValues.push(Math.round(windows.bestWindow.meanPm25));
  }
  if (windows.worstWindow) {
    allowedForecastValues.push(windows.worstWindow.startTime);
    allowedForecastValues.push(windows.worstWindow.endTime);
    if (windows.worstWindow.meanPm25 !== null) allowedForecastValues.push(Math.round(windows.worstWindow.meanPm25));
  }

  let errorHint = '';

  for (let attempt = 1; attempt <= 2; attempt++) {
    try {
      const ai = getAI(app, { backend: new GoogleAIBackend() });
      const model = getGenerativeModel(ai, {
        model: GEMINI_MODEL,
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: assistantReplySchema,
          temperature: 0.3,
        },
        systemInstruction: `You are SaafDin, a helpful air quality assistant for Indian households.
Answer user questions grounded in their family profile, today's atmospheric forecast, and their daily action plan.
Respond in ${profile.language === 'hi' ? 'Hindi' : 'English'}.

HARD RULES:
1. Keep answers concise (2 to 3 sentences max).
2. DO NOT invent fake sensor readings, vitals, measurements, or quantities. If citing numbers, you may cite ONLY values explicitly supplied in the forecast context (e.g. current AQI).
3. If recommending an action matching an ActionType (${ALLOWED_ACTION_TYPES.join(', ')}), structure recommendedAction. Title must NOT contain numbers.
4. Output JSON schema format: { "replyText": string, "recommendedAction": { "type": ActionType, "title": string, "start": "HH:00", "end": "HH:00", "memberId": string | null } }`,
      });

      const contextPayload: any = {
        query: userQuery,
        language: profile.language,
        profile: {
          location: profile.location.name,
          members: profile.members,
          commute: profile.commute,
          hasPurifier: profile.hasPurifier,
        },
        forecast: {
          currentAqi,
          currentPm25,
          bestWindow: windows.bestWindow,
          worstWindow: windows.worstWindow,
        },
        currentPlan: currentPlan.map((act) => ({
          type: act.type,
          title: act.title,
          start: act.start,
          end: act.end,
        })),
      };

      if (errorHint) {
        contextPayload.correctionNotice = `CRITICAL: Previous reply failed validation: "${errorHint}". Do not invent numeric figures.`;
      }

      const response = await model.generateContent(JSON.stringify(contextPayload));
      const resText = response.response.text();
      const parsed = JSON.parse(resText);

      const validated = validateAssistantReply(parsed, profile, allowedForecastValues);
      if (validated) {
        return validated;
      }

      errorHint = 'Contains unpermitted numbers or invalid action structure';
      console.warn(`Attempt ${attempt}: Assistant validation failed, retrying...`);
    } catch (err: any) {
      errorHint = err?.message || 'Assistant call error';
      console.warn(`Attempt ${attempt}: Assistant call failed:`, err);
    }
  }

  return null;
}
