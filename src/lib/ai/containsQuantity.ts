/**
 * Quantity detector for SaafDin GenAI outputs.
 *
 * Strictly enforces:
 * - Allowed product and pollutant tokens (N95, FFP2, PM2.5, PM10, CO2, CO₂) are permitted.
 * - Any remaining digit, including Devanagari digits (०–९), is rejected as a quantitative claim.
 * - Times belong in start/end parameters, not in copy.
 * - Optional allowedValues whitelist (e.g. current forecast AQI/PM2.5 passed into assistant).
 */

const ALLOWED_TOKENS = [
  /PM2\.5/gi,
  /PM10/gi,
  /N95/gi,
  /FFP2/gi,
  /CO2/gi,
  /CO₂/gi,
];

// Matches ASCII digits 0-9 and Unicode Devanagari digits ०-९ (\u0966-\u096F)
const DIGIT_REGEX = /[0-9\u0966-\u096F]/;

/**
 * Checks whether text contains quantitative claims or unpermitted digits.
 * Returns true if an unpermitted quantity/digit is found, false if clean.
 */
export function containsQuantity(
  text: string,
  allowedValues: (string | number)[] = []
): boolean {
  if (!text || typeof text !== 'string') return false;

  let sanitized = text;

  // 1. Remove permitted domain tokens (PM2.5, N95, etc.)
  for (const tokenRegex of ALLOWED_TOKENS) {
    sanitized = sanitized.replace(tokenRegex, ' ');
  }

  // 2. Remove explicitly allowed dynamic values (e.g., current forecast AQI)
  for (const val of allowedValues) {
    if (val !== undefined && val !== null && val !== '') {
      const valStr = String(val);
      // Replace only complete numeric occurrences
      const escaped = valStr.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      sanitized = sanitized.replace(new RegExp(`\\b${escaped}\\b`, 'g'), ' ');
    }
  }

  // 3. Test if any digit remains (ASCII 0-9 or Devanagari ०-९)
  return DIGIT_REGEX.test(sanitized);
}
