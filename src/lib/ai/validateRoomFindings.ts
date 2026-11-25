import { containsQuantity } from './containsQuantity';

export interface RoomFinding {
  id: string;
  number: number;
  title: string;
  issue: string;
  fix: string;
  category: 'leak' | 'airflow' | 'source' | 'filtration';
  impact: 'high' | 'medium' | 'low';
  cost: 'free' | 'low' | 'medium';
  point: { x: number; y: number }; // normalized 0-1
  completed?: boolean;
}

const VALID_CATEGORIES = new Set(['leak', 'airflow', 'source', 'filtration']);
const VALID_IMPACTS = new Set(['high', 'medium', 'low']);
const VALID_COSTS = new Set(['free', 'low', 'medium']);

/**
 * Validates room audit findings from the Gemini vision model.
 * Enforces:
 * - Drops invalid findings rather than inventing defaults
 * - No cap at 3 findings
 * - Numbers findings 1..N so markers and list match 1-to-1
 * - Rejects any finding containing unpermitted numeric measurements
 * Returns null if no valid findings remain.
 */
export function validateRoomFindings(data: any): RoomFinding[] | null {
  if (!Array.isArray(data)) {
    return null;
  }

  const validFindings: RoomFinding[] = [];

  for (const item of data) {
    if (!item || typeof item !== 'object') continue;

    // Title
    if (typeof item.title !== 'string' || item.title.trim().length === 0) continue;
    const title = item.title.trim();
    if (title.length > 80 || containsQuantity(title)) continue;

    // Issue
    if (typeof item.issue !== 'string' || item.issue.trim().length === 0) continue;
    const issue = item.issue.trim();
    if (issue.length > 200 || containsQuantity(issue)) continue;

    // Fix
    if (typeof item.fix !== 'string' || item.fix.trim().length === 0) continue;
    const fix = item.fix.trim();
    if (fix.length > 200 || containsQuantity(fix)) continue;

    // Category
    const category = typeof item.category === 'string' ? item.category.toLowerCase() : '';
    if (!VALID_CATEGORIES.has(category)) continue;

    // Impact
    const impact = typeof item.impact === 'string' ? item.impact.toLowerCase() : '';
    if (!VALID_IMPACTS.has(impact)) continue;

    // Cost
    const cost = typeof item.cost === 'string' ? item.cost.toLowerCase() : '';
    if (!VALID_COSTS.has(cost)) continue;

    // Point coordinates { x, y } in [0, 1]
    if (!item.point || typeof item.point !== 'object') continue;
    const x = Number(item.point.x);
    const y = Number(item.point.y);
    if (isNaN(x) || isNaN(y) || x < 0 || x > 1 || y < 0 || y > 1) continue;

    validFindings.push({
      id: `fix_${validFindings.length + 1}_${Date.now()}`,
      number: validFindings.length + 1,
      title,
      issue,
      fix,
      category: category as RoomFinding['category'],
      impact: impact as RoomFinding['impact'],
      cost: cost as RoomFinding['cost'],
      point: { x: Number(x.toFixed(3)), y: Number(y.toFixed(3)) },
      completed: false,
    });
  }

  // Renumber to guarantee 1..N matches 1-to-1 with list
  validFindings.forEach((f, idx) => {
    f.number = idx + 1;
  });

  return validFindings.length > 0 ? validFindings : null;
}
