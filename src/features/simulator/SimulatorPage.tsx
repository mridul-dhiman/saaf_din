import React, { useState, useEffect, useMemo } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { currentForecastProvider } from '../../services/forecast';
import { TravelMode, Intensity } from '../../types';
import { calcInhaledUg, calcExposureAvoided, getTimeSlices, calcTravelCo2Kg, calcTravelCo2SavedKg } from '../../lib/impact';
import { ReceiptModal } from '../../components/ReceiptModal';
import { EnrichedAction } from '../../lib/impact/rulePlanner';

type ScenarioActivity = 'commute' | 'exercise' | 'ventilation';

export const SimulatorPage: React.FC = () => {
  const { profile } = useProfile();
  const [currentPm25, setCurrentPm25] = useState<number | null>(145);

  // Selectors State
  const [activity, setActivity] = useState<ScenarioActivity>('commute');
  const [timeSlot, setTimeSlot] = useState<string>('08:30'); // "08:30", "14:00", "18:00"
  const [selectedMemberId, setSelectedMemberId] = useState<string>(
    profile.members[0]?.id || 'default'
  );

  const [addedToPlan, setAddedToPlan] = useState<boolean>(false);
  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);

  useEffect(() => {
    currentForecastProvider.getHourly(profile.location.lat, profile.location.lon)
      .then((f) => {
        if (f.points.length > 0) {
          setCurrentPm25(f.points[0].pm2_5);
        }
      })
      .catch((e) => console.warn(e));
  }, [profile.location.lat, profile.location.lon]);

  const selectedMember = useMemo(() => {
    return profile.members.find((m) => m.id === selectedMemberId) || profile.members[0];
  }, [selectedMemberId, profile.members]);

  const ageGroup = selectedMember?.ageGroup || 'adult';

  // Deterministic Impact Model Calculation
  const simulationResults = useMemo(() => {
    const timeSlices = getTimeSlices(timeSlot, `${parseInt(timeSlot.split(':')[0]) + 1}:30`);
    const mockHourlyLookup = () => currentPm25;

    if (activity === 'commute') {
      const distanceKm = profile.commute.distanceKm || 18;
      const baselineMode: TravelMode = profile.commute.mode || 'car_petrol';
      const alternativeMode: TravelMode = 'metro';

      const baselineInhaled = calcInhaledUg(timeSlices, mockHourlyLookup, {
        ageGroup,
        intensity: 'light',
        env: 'car_closed_recirc',
        mask: 'none',
      });

      const alternativeInhaled = calcInhaledUg(timeSlices, mockHourlyLookup, {
        ageGroup,
        intensity: 'light',
        env: 'metro',
        mask: 'n95',
      });

      const baselineCo2 = calcTravelCo2Kg(baselineMode, distanceKm);
      const alternativeCo2 = calcTravelCo2Kg(alternativeMode, distanceKm);
      const co2Saved = calcTravelCo2SavedKg(baselineMode, alternativeMode, distanceKm);
      const avoidedUg = calcExposureAvoided(baselineInhaled, alternativeInhaled);

      const hasPct = baselineInhaled !== null && alternativeInhaled !== null && baselineInhaled > 0;
      const pct = hasPct ? Math.round(((baselineInhaled - alternativeInhaled) / baselineInhaled) * 100) : null;

      let verdict = `Switching from solo car to Metro rail with an N95 mask`;
      if (pct !== null && avoidedUg !== null) {
        verdict += ` cuts ${selectedMember.name}'s inhaled particulate exposure by ~${pct}%`;
      } else {
        verdict += ` reduces ${selectedMember.name}'s inhaled particulate exposure`;
      }
      if (co2Saved !== null && co2Saved > 0) {
        verdict += ` and prevents ${co2Saved} kg of tailpipe CO₂ emissions.`;
      } else {
        verdict += `.`;
      }

      return {
        activityLabel: 'Work / School Commute',
        baseline: {
          title: 'Solo Petrol Car in Traffic',
          envLabel: 'Vehicle Cabin (Recirc Off)',
          maskLabel: 'No Mask',
          inhaledUg: baselineInhaled !== null ? Math.round(baselineInhaled) : null,
          co2Kg: Number(baselineCo2.toFixed(1)),
        },
        alternative: {
          title: 'Metro Rail + N95 Mask',
          envLabel: 'Air-Conditioned Metro Coach',
          maskLabel: 'N95 Respirator',
          inhaledUg: alternativeInhaled !== null ? Math.round(alternativeInhaled) : null,
          co2Kg: Number(alternativeCo2.toFixed(1)),
        },
        exposureAvoidedUg: avoidedUg,
        co2SavedKg: co2Saved,
        verdict,
      };
    } else if (activity === 'exercise') {
      const baselineInhaled = calcInhaledUg(timeSlices, mockHourlyLookup, {
        ageGroup,
        intensity: 'vigorous' as Intensity,
        env: 'outdoors',
        mask: 'none',
      });

      const alternativeInhaled = calcInhaledUg(timeSlices, mockHourlyLookup, {
        ageGroup,
        intensity: 'moderate' as Intensity,
        env: 'indoors_closed_purifier',
        mask: 'none',
      });

      const avoidedUg = calcExposureAvoided(baselineInhaled, alternativeInhaled);
      const hasPct = baselineInhaled !== null && alternativeInhaled !== null && baselineInhaled > 0;
      const pct = hasPct ? Math.round(((baselineInhaled - alternativeInhaled) / baselineInhaled) * 100) : null;

      let verdict = `Shifting intense cardio indoors`;
      if (pct !== null && avoidedUg !== null) {
        verdict += ` cuts ${selectedMember.name}'s inhaled exposure by ~${pct}% during peak pollution hours, shielding sensitive respiratory airways.`;
      } else {
        verdict += ` reduces ${selectedMember.name}'s inhaled particulate exposure during peak pollution hours, shielding sensitive respiratory airways.`;
      }

      return {
        activityLabel: 'Daily Workout & Exercise',
        baseline: {
          title: 'Roadside Outdoor Jog / Sports',
          envLabel: 'Ambient Roadside Air',
          maskLabel: 'Unmasked (Deep Breaths)',
          inhaledUg: baselineInhaled !== null ? Math.round(baselineInhaled) : null,
          co2Kg: null,
        },
        alternative: {
          title: 'Indoor Treadmill / Gym with HEPA Purifier',
          envLabel: 'Sealed Room with Purifier',
          maskLabel: 'Filtered Indoor Air',
          inhaledUg: alternativeInhaled !== null ? Math.round(alternativeInhaled) : null,
          co2Kg: null,
        },
        exposureAvoidedUg: avoidedUg,
        co2SavedKg: null,
        verdict,
      };
    } else {
      // Ventilation
      const baselineInhaled = calcInhaledUg(timeSlices, mockHourlyLookup, {
        ageGroup,
        intensity: 'rest',
        env: 'indoors_open',
        mask: 'none',
      });

      const alternativeInhaled = calcInhaledUg(timeSlices, mockHourlyLookup, {
        ageGroup,
        intensity: 'rest',
        env: 'indoors_closed_purifier',
        mask: 'none',
      });

      const avoidedUg = calcExposureAvoided(baselineInhaled, alternativeInhaled);
      const hasPct = baselineInhaled !== null && alternativeInhaled !== null && baselineInhaled > 0;
      const pct = hasPct ? Math.round(((baselineInhaled - alternativeInhaled) / baselineInhaled) * 100) : null;

      let verdict = `Keeping windows sealed and running indoor air filtration`;
      if (pct !== null && avoidedUg !== null) {
        verdict += ` cuts ${selectedMember.name}'s inhaled exposure by ~${pct}% compared to unventilated peak smog.`;
      } else {
        verdict += ` prevents acute particulate penetration while outdoor dispersion remains sluggish.`;
      }

      return {
        activityLabel: 'Home Ventilation & Air Cleaning',
        baseline: {
          title: 'Open Windows during Inversion Peak',
          envLabel: 'Outdoor Smog Infiltration',
          maskLabel: 'Unfiltered Room',
          inhaledUg: baselineInhaled !== null ? Math.round(baselineInhaled) : null,
          co2Kg: null,
        },
        alternative: {
          title: 'Sealed Room + Active Purifier Recirculation',
          envLabel: 'HEPA Purified Sanctuary',
          maskLabel: 'Closed & Filtered',
          inhaledUg: alternativeInhaled !== null ? Math.round(alternativeInhaled) : null,
          co2Kg: null,
        },
        exposureAvoidedUg: avoidedUg,
        co2SavedKg: null,
        verdict,
      };
    }
  }, [activity, timeSlot, ageGroup, currentPm25, profile.commute, selectedMember.name]);

  const dummyActionForModal: EnrichedAction = {
    id: 'simulator_explainer',
    type: 'change_commute_mode',
    memberId: selectedMember.id,
    start: timeSlot,
    end: `${parseInt(timeSlot.split(':')[0]) + 1}:30`,
    title: simulationResults.alternative.title,
    reason: simulationResults.verdict,
    params: {},
    impact: {
      exposureAvoidedUg: simulationResults.exposureAvoidedUg,
      co2SavedKg: simulationResults.co2SavedKg,
    },
  };

  return (
    <div className="flex flex-col gap-space-lg w-full pb-16">
      {/* Top Header Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md lg:p-space-lg shadow-sm border border-surface-container flex flex-col gap-space-sm">
        <div className="flex items-center gap-space-sm">
          <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">tune</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline-md text-headline-sm lg:text-headline-md text-on-surface font-bold">
              What-If Decision Simulator
            </h1>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Model personal exposure and emission differences between routine choices
            </span>
          </div>
        </div>

        {/* 3 Interactive Selectors */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-space-sm pt-4 border-t border-surface-container">
          {/* Selector 1: Activity */}
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">
              1. Routine Activity
            </label>
            <select
              value={activity}
              onChange={(e) => setActivity(e.target.value as ScenarioActivity)}
              className="px-3 py-2.5 rounded-xl bg-surface-container-low border border-surface-container text-on-surface font-label-md text-label-md focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="commute">Work / School Commute</option>
              <option value="exercise">Outdoor Workout &amp; Sports</option>
              <option value="ventilation">Balcony &amp; Room Air Flow</option>
            </select>
          </div>

          {/* Selector 2: Time Slot */}
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">
              2. Time of Day
            </label>
            <select
              value={timeSlot}
              onChange={(e) => setTimeSlot(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-surface-container-low border border-surface-container text-on-surface font-label-md text-label-md focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="08:30">08:30 AM (Morning Traffic Peak)</option>
              <option value="14:00">02:00 PM (Afternoon Dispersal Window)</option>
              <option value="18:00">06:00 PM (Evening Rush &amp; Inversion)</option>
            </select>
          </div>

          {/* Selector 3: Family Member (Clean tags only, no fake COPD) */}
          <div className="flex flex-col gap-1">
            <label className="font-label-sm text-[11px] text-on-surface-variant uppercase font-bold tracking-wider">
              3. Family Member
            </label>
            <select
              value={selectedMemberId}
              onChange={(e) => setSelectedMemberId(e.target.value)}
              className="px-3 py-2.5 rounded-xl bg-surface-container-low border border-surface-container text-on-surface font-label-md text-label-md focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {profile.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.ageGroup}{m.sensitivities.length > 0 ? ` · ${m.sensitivities.join(', ')}` : ''})
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Side-by-Side Comparison Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-space-lg items-stretch">
        {/* Left Panel: Baseline / Usual Routine */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-md lg:p-space-lg shadow-sm border border-error/30 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-error"></div>

          <div>
            <div className="flex items-center justify-between mb-space-sm pt-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-error-container text-error flex items-center justify-center font-bold text-[14px]">
                  ✕
                </div>
                <div>
                  <h3 className="font-headline-sm text-[17px] text-on-surface font-bold">
                    Your Usual Routine
                  </h3>
                  <span className="font-label-sm text-[11px] text-error font-semibold">
                    Unfiltered Baseline Exposure
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-[11px] font-semibold uppercase">
                Baseline
              </span>
            </div>

            {/* Matrix */}
            <div className="bg-surface-container-low rounded-xl p-3 flex flex-col gap-1.5 mb-space-md border border-surface-container">
              <div className="flex items-center justify-between text-body-sm text-[13px]">
                <span className="text-on-surface-variant">Mode / Activity:</span>
                <span className="font-semibold text-on-surface">{simulationResults.baseline.title}</span>
              </div>
              <div className="flex items-center justify-between text-body-sm text-[13px]">
                <span className="text-on-surface-variant">Environment:</span>
                <span className="font-semibold text-on-surface">{simulationResults.baseline.envLabel}</span>
              </div>
              <div className="flex items-center justify-between text-body-sm text-[13px]">
                <span className="text-on-surface-variant">Filtration:</span>
                <span className="font-semibold text-error">{simulationResults.baseline.maskLabel}</span>
              </div>
            </div>

            {/* Baseline Metrics */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-baseline justify-between">
                <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                  Inhaled PM2.5 Exposure
                </span>
                <span className="font-headline-sm text-headline-sm text-error font-bold">
                  {simulationResults.baseline.inhaledUg !== null ? `${simulationResults.baseline.inhaledUg} µg` : ''}
                </span>
              </div>
              <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                <div className="bg-error h-full rounded-full w-[90%]"></div>
              </div>

              {simulationResults.baseline.co2Kg !== null && (
                <div className="flex items-baseline justify-between pt-2 border-t border-surface-container">
                  <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                    Trip CO₂ Footprint
                  </span>
                  <span className="font-headline-sm text-[16px] text-on-surface font-bold">
                    {simulationResults.baseline.co2Kg} kg CO₂
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Clean Alternative */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-md lg:p-space-lg shadow-sm border border-secondary/40 flex flex-col justify-between relative overflow-hidden">
          <div className="absolute top-0 left-0 right-0 h-1.5 bg-secondary"></div>

          <div>
            <div className="flex items-center justify-between mb-space-sm pt-1">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-full bg-secondary-container/50 text-secondary flex items-center justify-center font-bold text-[14px]">
                  ✓
                </div>
                <div>
                  <h3 className="font-headline-sm text-[17px] text-on-surface font-bold">
                    Clean Alternative
                  </h3>
                  <span className="font-label-sm text-[11px] text-secondary font-semibold">
                    Target Routine Choice
                  </span>
                </div>
              </div>
              <span className="px-2.5 py-0.5 rounded-full bg-secondary-container/30 text-on-secondary-container font-label-sm text-[11px] font-bold uppercase">
                Optimized
              </span>
            </div>

            {/* Matrix */}
            <div className="bg-surface-container-low rounded-xl p-3 flex flex-col gap-1.5 mb-space-md border border-surface-container">
              <div className="flex items-center justify-between text-body-sm text-[13px]">
                <span className="text-on-surface-variant">Mode / Activity:</span>
                <span className="font-semibold text-on-surface">{simulationResults.alternative.title}</span>
              </div>
              <div className="flex items-center justify-between text-body-sm text-[13px]">
                <span className="text-on-surface-variant">Environment:</span>
                <span className="font-semibold text-on-surface">{simulationResults.alternative.envLabel}</span>
              </div>
              <div className="flex items-center justify-between text-body-sm text-[13px]">
                <span className="text-on-surface-variant">Filtration:</span>
                <span className="font-semibold text-secondary">{simulationResults.alternative.maskLabel}</span>
              </div>
            </div>

            {/* Alternative Metrics */}
            <div className="flex flex-col gap-space-sm">
              <div className="flex items-baseline justify-between">
                <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                  Inhaled PM2.5 Exposure
                </span>
                <span className="font-headline-sm text-headline-sm text-primary font-bold">
                  {simulationResults.alternative.inhaledUg !== null ? `${simulationResults.alternative.inhaledUg} µg` : ''}
                </span>
              </div>
              <div className="w-full bg-surface-container-highest h-2 rounded-full overflow-hidden">
                <div
                  className="bg-primary h-full rounded-full transition-all"
                  style={{
                    width: simulationResults.alternative.inhaledUg !== null && simulationResults.baseline.inhaledUg !== null && simulationResults.baseline.inhaledUg > 0
                      ? `${Math.max(15, Math.min(100, Math.round((simulationResults.alternative.inhaledUg / simulationResults.baseline.inhaledUg) * 100)))}%`
                      : '0%',
                  }}
                ></div>
              </div>

              {simulationResults.alternative.co2Kg !== null && (
                <div className="flex items-baseline justify-between pt-2 border-t border-surface-container">
                  <span className="font-label-md text-label-md text-on-surface-variant font-medium">
                    Trip CO₂ Footprint
                  </span>
                  <span className="font-headline-sm text-[16px] text-secondary font-bold">
                    {simulationResults.alternative.co2Kg} kg CO₂
                  </span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Decision Verdict Card (Single Action Button) */}
      <div className="bg-primary text-on-primary rounded-2xl p-space-md lg:p-space-lg shadow-xl flex flex-col md:flex-row items-center justify-between gap-space-md">
        <div className="flex items-start gap-space-sm">
          <div className="w-11 h-11 rounded-xl bg-primary-container text-secondary-fixed flex items-center justify-center shrink-0 mt-0.5">
            <span className="material-symbols-outlined text-[24px]">verified</span>
          </div>
          <div className="flex flex-col">
            <span className="font-label-md text-label-md text-primary-fixed uppercase tracking-wider font-semibold">
              Simulation Verdict
            </span>
            <p className="font-body-md text-body-md text-white font-medium mt-0.5 max-w-2xl leading-snug">
              {simulationResults.verdict}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-space-sm shrink-0 w-full md:w-auto justify-end">
          <button
            type="button"
            onClick={() => setAddedToPlan(!addedToPlan)}
            className={`w-full md:w-auto px-5 py-2.5 rounded-xl font-label-md text-label-md font-bold transition-all flex items-center justify-center gap-1.5 shadow-sm ${
              addedToPlan
                ? 'bg-secondary-fixed text-on-secondary-fixed'
                : 'bg-surface-container-lowest text-primary hover:bg-surface-container'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">
              {addedToPlan ? 'check' : 'add_circle'}
            </span>
            <span>{addedToPlan ? 'Added to My Plan ✓' : 'Add to My Plan'}</span>
          </button>
        </div>
      </div>

      {/* Collapsible Explainer Link */}
      <div className="flex items-center justify-between text-outline text-[12px] px-2">
        <button
          type="button"
          onClick={() => setShowFormulaModal(true)}
          className="flex items-center gap-1 text-secondary hover:underline font-semibold"
        >
          <span className="material-symbols-outlined text-[16px]">help_outline</span>
          <span>How we calculate exposure and emissions differences</span>
        </button>
        <span>Screening model based on US EPA &amp; India GHG standards</span>
      </div>

      {/* Mathematical Audit Modal */}
      {showFormulaModal && (
        <ReceiptModal
          action={dummyActionForModal}
          onClose={() => setShowFormulaModal(false)}
        />
      )}
    </div>
  );
};
