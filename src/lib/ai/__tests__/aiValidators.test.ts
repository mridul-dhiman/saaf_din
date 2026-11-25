import { describe, it, expect } from 'vitest';
import { containsQuantity } from '../containsQuantity';
import { validatePlan } from '../validatePlan';
import { validateRoomFindings } from '../validateRoomFindings';
import { validateAssistantReply } from '../validateAssistantReply';
import { Profile } from '../../../types';

const MOCK_PROFILE: Profile = {
  location: { name: 'Delhi', lat: 28.61, lon: 77.23 },
  members: [
    { id: 'm1', name: 'Arjun', ageGroup: 'adult', sensitivities: [] },
    { id: 'm2', name: 'Aarav', ageGroup: 'child', sensitivities: ['asthma'] },
  ],
  commute: {
    mode: 'car_petrol',
    distanceKm: 18,
    departs: '08:30',
    returns: '18:00',
  },
  cookingFuel: 'png',
  hasExhaust: true,
  hasPurifier: true,
  language: 'en',
};

describe('AI Validators: Quantity Detector (containsQuantity)', () => {
  it('allows approved product and pollutant terms without flagging them', () => {
    expect(containsQuantity('Wear N95 mask during morning transit')).toBe(false);
    expect(containsQuantity('Use FFP2 respirator for outdoor cycling')).toBe(false);
    expect(containsQuantity('PM2.5 concentration peaks during winter temperature inversion')).toBe(false);
    expect(containsQuantity('High PM10 dust particles detected')).toBe(false);
    expect(containsQuantity('Metro rail eliminates vehicle CO2 tailpipe emissions')).toBe(false);
    expect(containsQuantity('Reduces household CO₂ output')).toBe(false);
    expect(containsQuantity('N95 मास्क पहनें')).toBe(false);
  });

  it('rejects unpermitted numbers, percentages, durations, and quantities in English', () => {
    expect(containsQuantity('Wear mask for 25 mins')).toBe(true);
    expect(containsQuantity('Cuts exposure by 70%')).toBe(true);
    expect(containsQuantity('When PM2.5 is above 150 µg/m³')).toBe(true);
    expect(containsQuantity('Prevents 2.5 kg of tailpipe emissions')).toBe(true);
    expect(containsQuantity('Ventilate at 14:00')).toBe(true); // Times belong in start/end, not text
    expect(containsQuantity('Avoids 2 cigarettes equivalent')).toBe(true);
  });

  it('rejects Devanagari digits (०–९) in Hindi copy', () => {
    expect(containsQuantity('२५ मिनट के लिए मास्क पहनें')).toBe(true);
    expect(containsQuantity('७०% तक प्रदूषण कम करें')).toBe(true);
    expect(containsQuantity('१५० स्तर से अधिक')).toBe(true);
  });

  it('allows whitelisted values provided from forecast data in assistant replies', () => {
    // Current AQI is 185
    const allowed = [185, '14:00', '16:00'];
    expect(containsQuantity('Today current US AQI is around 185 in Delhi', allowed)).toBe(false);
    expect(containsQuantity('Best window is 14:00 to 16:00 today', allowed)).toBe(false);

    // Invented value 220 is not in allowed list
    expect(containsQuantity('Today AQI is 185 and PM2.5 is 220', allowed)).toBe(true);
  });
});

describe('AI Validators: Plan Validation (validatePlan)', () => {
  const validActions = [
    {
      type: 'wear_mask',
      memberId: 'm1',
      start: '08:30',
      end: '09:30',
      title: 'Wear N95 mask during transit',
      reason: 'Reduces inhaled vehicle emissions during morning traffic peak',
      params: { mask: 'n95', intensity: 'light' },
    },
    {
      type: 'ventilate',
      memberId: null,
      start: '14:00',
      end: '16:00',
      title: 'Open windows for room ventilation',
      reason: 'Atmospheric mixing lowers particulate concentrations in afternoon',
      params: { worstStart: '08:00', worstEnd: '10:00' },
    },
    {
      type: 'keep_closed',
      memberId: null,
      start: '18:00',
      end: '21:00',
      title: 'Keep windows sealed during inversion',
      reason: 'Prevents evening traffic smog from infiltrating home',
      params: {},
    },
  ];

  it('accepts a valid plan conforming to schema and rules', () => {
    const res = validatePlan(validActions, MOCK_PROFILE);
    expect(res.success).toBe(true);
    expect(res.actions).toHaveLength(3);
    expect(res.actions![0].title).toBe('Wear N95 mask during transit');
  });

  it('fails if action type is invalid', () => {
    const invalid = [
      ...validActions,
      {
        type: 'invented_action_type',
        memberId: 'm1',
        start: '10:00',
        end: '11:00',
        title: 'Do something',
        reason: 'Because reasons',
      },
    ];
    const res = validatePlan(invalid, MOCK_PROFILE);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Invalid action type');
  });

  it('fails on an unknown memberId (no silent null)', () => {
    const unknownMember = [
      validActions[0],
      {
        ...validActions[1],
        memberId: 'm_ghost_id', // Does not exist in profile
      },
    ];
    const res = validatePlan(unknownMember, MOCK_PROFILE);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Unknown memberId');
  });

  it('fails if end time is not strictly after start time', () => {
    const badTime = [
      validActions[0],
      {
        ...validActions[1],
        start: '16:00',
        end: '14:00', // end < start
      },
    ];
    const res = validatePlan(badTime, MOCK_PROFILE);
    expect(res.success).toBe(false);
    expect(res.error).toContain('end time');
  });

  it('fails if title or reason contains numeric measurements or quantities', () => {
    const withNumbers = [
      validActions[0],
      {
        ...validActions[1],
        title: 'Wear mask for 25 mins', // contains quantity
      },
    ];
    const res = validatePlan(withNumbers, MOCK_PROFILE);
    expect(res.success).toBe(false);
    expect(res.error).toContain('forbidden numeric measurements');

    const withReasonNumbers = [
      validActions[0],
      {
        ...validActions[1],
        reason: 'Cuts particulate exposure by 70%', // contains quantity
      },
    ];
    const resReason = validatePlan(withReasonNumbers, MOCK_PROFILE);
    expect(resReason.success).toBe(false);
  });

  it('rejects overlapping actions for the exact same family member', () => {
    const overlapping = [
      {
        type: 'wear_mask',
        memberId: 'm1',
        start: '08:00',
        end: '09:30',
        title: 'Wear N95 mask on commute',
        reason: 'Protection during morning rush',
      },
      {
        type: 'move_activity_indoors',
        memberId: 'm1', // Same member!
        start: '09:00', // Overlaps with 08:00-09:30
        end: '10:00',
        title: 'Move morning workout indoors',
        reason: 'Avoid roadside ambient air',
      },
    ];
    const res = validatePlan(overlapping, MOCK_PROFILE);
    expect(res.success).toBe(false);
    expect(res.error).toContain('Overlapping actions for member');
  });

  it('allows overlapping times if actions target different members or household', () => {
    const differentMembers = [
      {
        type: 'wear_mask',
        memberId: 'm1',
        start: '08:00',
        end: '09:30',
        title: 'Wear N95 mask on commute',
        reason: 'Protection during morning rush',
      },
      {
        type: 'wear_mask',
        memberId: 'm2', // Different member!
        start: '08:00',
        end: '09:30',
        title: 'Wear child N95 mask for school',
        reason: 'Protection for sensitive airway',
      },
      {
        type: 'keep_closed',
        memberId: null, // Household wide
        start: '08:00',
        end: '10:00',
        title: 'Keep windows sealed during inversion',
        reason: 'Prevents infiltration into home',
      },
    ];
    const res = validatePlan(differentMembers, MOCK_PROFILE);
    expect(res.success).toBe(true);
  });
});

describe('AI Validators: Room Audit Findings (validateRoomFindings)', () => {
  const mockFindings = [
    {
      title: 'Seal sliding balcony door gap',
      issue: 'Unsealed perimeter track permits outdoor smog penetration',
      fix: 'Install self-adhesive flexible silicone sweep',
      category: 'leak',
      impact: 'high',
      cost: 'low',
      point: { x: 0.25, y: 0.75 },
    },
    {
      title: 'Move air purifier away from wall obstruction',
      issue: 'Wall placement limits air intake circulation',
      fix: 'Reposition unit one meter into open room',
      category: 'airflow',
      impact: 'medium',
      cost: 'free',
      point: { x: 0.5, y: 0.7 },
    },
    {
      title: 'Add standalone HEPA filter unit to bedroom',
      issue: 'High ambient infiltration during sleep hours',
      fix: 'Place clean air delivery unit near bed',
      category: 'filtration',
      impact: 'high',
      cost: 'medium',
      point: { x: 0.8, y: 0.4 },
    },
    {
      title: 'Seal AC wall conduit penetration',
      issue: 'Open hole around piping connects to outdoor ambient air',
      fix: 'Fill void with sealing putty',
      category: 'leak',
      impact: 'medium',
      cost: 'low',
      point: { x: 0.65, y: 0.25 },
    },
  ];

  it('validates and preserves all valid findings without artificial 3-item cap', () => {
    const res = validateRoomFindings(mockFindings);
    expect(res).not.toBeNull();
    expect(res).toHaveLength(4);
    // Renumbered 1 to 4 sequentially
    expect(res![0].number).toBe(1);
    expect(res![1].number).toBe(2);
    expect(res![2].number).toBe(3);
    expect(res![3].number).toBe(4);
  });

  it('drops invalid findings containing numeric claims rather than filling defaults', () => {
    const withBadFinding = [
      mockFindings[0],
      {
        ...mockFindings[1],
        issue: 'Infiltration adds 65 µg/m³ of PM2.5', // forbidden quantity!
      },
      mockFindings[2],
    ];
    const res = validateRoomFindings(withBadFinding);
    expect(res).not.toBeNull();
    // Bad finding dropped, 2 valid findings remain
    expect(res).toHaveLength(2);
    expect(res![0].title).toBe('Seal sliding balcony door gap');
    expect(res![1].title).toBe('Add standalone HEPA filter unit to bedroom');
    expect(res![1].number).toBe(2); // Sequential renumbering
  });

  it('returns null if no valid findings remain', () => {
    const allBad = [
      {
        title: 'Reduces 50% PM2.5', // quantity
        issue: 'bad',
        fix: 'bad',
        category: 'leak',
        impact: 'high',
        cost: 'low',
        point: { x: 0.5, y: 0.5 },
      },
    ];
    const res = validateRoomFindings(allBad);
    expect(res).toBeNull();
  });
});

describe('AI Validators: Assistant Reply (validateAssistantReply)', () => {
  it('validates a clean assistant reply with no invented numbers', () => {
    const raw = {
      replyText: 'I recommend keeping windows closed during morning rush and using an N95 mask outdoors.',
      recommendedAction: {
        type: 'wear_mask',
        title: 'Wear N95 mask during morning transit',
        start: '08:30',
        end: '09:30',
        memberId: 'm1',
      },
    };

    const res = validateAssistantReply(raw, MOCK_PROFILE, []);
    expect(res).not.toBeNull();
    expect(res!.replyText).toBe(raw.replyText);
    expect(res!.recommendedAction?.type).toBe('wear_mask');
  });

  it('rejects assistant reply containing unpermitted invented numbers', () => {
    const raw = {
      replyText: 'Air quality will improve by ~70% and save 2.5 kg of tailpipe emissions.',
    };

    const res = validateAssistantReply(raw, MOCK_PROFILE, []);
    expect(res).toBeNull();
  });

  it('accepts assistant reply quoting allowed values from forecast context', () => {
    const raw = {
      replyText: 'Current US AQI in Delhi is 185. It is best to stay indoors during this peak.',
    };

    const res = validateAssistantReply(raw, MOCK_PROFILE, [185]);
    expect(res).not.toBeNull();
    expect(res!.replyText).toContain('185');
  });
});
