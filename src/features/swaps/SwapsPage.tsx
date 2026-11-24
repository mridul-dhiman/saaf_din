import React, { useState, useEffect, useMemo } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { currentForecastProvider } from '../../services/forecast';
import { HABIT_SWAPS, HabitSwap, SwapCategory } from './swapsData';
import { ReceiptModal } from '../../components/ReceiptModal';
import { EnrichedAction } from '../../lib/impact/rulePlanner';
import { formatCigarettes } from '../../lib/impact';

export const SwapsPage: React.FC = () => {
  const { profile } = useProfile();
  const [currentPm25, setCurrentPm25] = useState<number | null>(140);
  const [activeCategory, setActiveCategory] = useState<SwapCategory>('all');
  const [adoptedSwapIds, setAdoptedSwapIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('saafdin_adopted_swaps');
      return saved ? JSON.parse(saved) : ['swap_home_cooking', 'swap_fitness_workout'];
    } catch (e) {
      return ['swap_home_cooking', 'swap_fitness_workout'];
    }
  });

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

  const toggleAdoptSwap = (id: string) => {
    const next = adoptedSwapIds.includes(id)
      ? adoptedSwapIds.filter((x) => x !== id)
      : [...adoptedSwapIds, id];
    setAdoptedSwapIds(next);
    try {
      localStorage.setItem('saafdin_adopted_swaps', JSON.stringify(next));
    } catch (e) {
      console.warn(e);
    }
  };

  // Filter Swaps
  const filteredSwaps = useMemo(() => {
    return HABIT_SWAPS.filter((swap) => {
      const impact = swap.getImpact(profile, currentPm25);
      if (activeCategory === 'all') return true;
      if (activeCategory === 'high-impact') return impact.exposureAvoidedUg !== null && impact.exposureAvoidedUg >= 50;
      return swap.category === activeCategory;
    });
  }, [activeCategory, profile, currentPm25]);

  // Aggregate Impact of Adopted Swaps This Week
  const weeklyImpact = useMemo(() => {
    let totalUg = 0;
    let totalCo2 = 0;
    let qualifyingCount = 0;

    for (const swap of HABIT_SWAPS) {
      if (adoptedSwapIds.includes(swap.id)) {
        const impact = swap.getImpact(profile, currentPm25);
        if (impact.exposureAvoidedUg !== null && impact.exposureAvoidedUg > 0) {
          totalUg += impact.exposureAvoidedUg * 5;
          qualifyingCount++;
        }
        if (impact.co2SavedKg && impact.co2SavedKg > 0) {
          totalCo2 += impact.co2SavedKg * 5;
        }
      }
    }

    // Cigarettes avoided per Berkeley Earth formula: (Delta C_eff * hours) / (22 * 24)
    // IR for adult light transit is 0.7 m³/h: Delta C_eff * hours = totalUg / 0.7
    const deltaEffectiveUgHours = totalUg / 0.7;
    const cigs = deltaEffectiveUgHours / 528;
    const formattedCigs = formatCigarettes(cigs);

    return {
      qualifyingCount,
      totalUg,
      totalCo2: Number(totalCo2.toFixed(1)),
      approxCigs: formattedCigs,
    };
  }, [adoptedSwapIds, profile, currentPm25]);

  const dummyActionForModal: EnrichedAction = {
    id: 'swap_explainer',
    type: 'change_commute_mode',
    memberId: null,
    start: 'All-Day',
    end: 'Routine',
    title: 'Clean Habit Alternatives Calculation',
    reason: 'Screening comparison of baseline habits versus verified low-emission alternatives.',
    params: {},
    impact: {
      exposureAvoidedUg: 54,
      co2SavedKg: 2.5,
    },
  };

  return (
    <div className="flex flex-col gap-space-lg w-full pb-16">
      {/* Page Header */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md lg:p-space-lg shadow-sm border border-surface-container flex flex-col gap-space-sm">
        <div className="flex items-center gap-space-sm">
          <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">swap_horiz</span>
          </div>
          <div className="flex flex-col">
            <h1 className="font-headline-md text-headline-sm lg:text-headline-md text-on-surface font-bold">
              Clean Habit Alternatives
            </h1>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Everyday swaps tailored to Indian urban households that cut personal exposure and direct emissions
            </span>
          </div>
        </div>

        {/* Category Filter Chips */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pt-3 border-t border-surface-container">
          <button
            type="button"
            onClick={() => setActiveCategory('all')}
            className={`shrink-0 px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all ${
              activeCategory === 'all'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            All Swaps
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('commute')}
            className={`shrink-0 px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all ${
              activeCategory === 'commute'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Transit &amp; Commute
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('cooking')}
            className={`shrink-0 px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all ${
              activeCategory === 'cooking'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Home &amp; Cooking
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('puja')}
            className={`shrink-0 px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all ${
              activeCategory === 'puja'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Puja &amp; Rituals
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('fitness')}
            className={`shrink-0 px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all ${
              activeCategory === 'fitness'
                ? 'bg-primary text-on-primary font-bold shadow-sm'
                : 'bg-surface-container-high text-on-surface-variant hover:text-on-surface'
            }`}
          >
            Fitness &amp; Outdoors
          </button>
          <button
            type="button"
            onClick={() => setActiveCategory('high-impact')}
            className={`shrink-0 px-3.5 py-1.5 rounded-full font-label-md text-label-md transition-all flex items-center gap-1 ${
              activeCategory === 'high-impact'
                ? 'bg-secondary text-on-secondary font-bold shadow-sm'
                : 'bg-secondary/15 text-secondary hover:bg-secondary/25'
            }`}
          >
            <span className="material-symbols-outlined text-[16px]">bolt</span>
            <span>High Impact (&gt;50 µg)</span>
          </button>
        </div>
      </div>

      {/* Swaps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
        {filteredSwaps.map((swap: HabitSwap) => {
          const impact = swap.getImpact(profile, currentPm25);
          const isAdopted = adoptedSwapIds.includes(swap.id);

          return (
            <div
              key={swap.id}
              className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container hover:shadow-md transition-all flex flex-col justify-between"
            >
              <div>
                {/* Header: Icon + Title + Difficulty Tag */}
                <div className="flex items-start justify-between gap-2 mb-space-sm">
                  <div className="flex items-center gap-2">
                    <span className="material-symbols-outlined text-secondary text-[22px]">
                      {swap.icon}
                    </span>
                    <h3 className="font-headline-sm text-[16px] text-on-surface font-bold leading-tight">
                      {swap.title}
                    </h3>
                  </div>
                  <span className="px-2 py-0.5 rounded-full bg-surface-container text-on-surface-variant font-label-sm text-[11px] font-semibold shrink-0">
                    {swap.difficulty}
                  </span>
                </div>

                {/* From / To Routine Box */}
                <div className="bg-surface-container-low rounded-xl p-3 flex flex-col gap-2 mb-space-sm border border-surface-container/60">
                  {/* Current Routine */}
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-error/15 text-error flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[12px]">close</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-[10px] text-outline uppercase font-semibold">
                        Current Routine
                      </span>
                      <span className="font-body-sm text-[12px] text-on-surface leading-tight mt-0.5">
                        {swap.fromHabit}
                      </span>
                    </div>
                  </div>

                  {/* Downward Transition Arrow */}
                  <div className="flex items-center justify-center my-0.5">
                    <div className="h-[1px] flex-1 bg-surface-container-highest"></div>
                    <span className="material-symbols-outlined text-secondary text-[16px] mx-2">
                      arrow_downward
                    </span>
                    <div className="h-[1px] flex-1 bg-surface-container-highest"></div>
                  </div>

                  {/* Clean Alternative */}
                  <div className="flex items-start gap-2">
                    <div className="w-5 h-5 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0 mt-0.5">
                      <span className="material-symbols-outlined text-[12px]">check</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="font-label-sm text-[10px] text-secondary uppercase font-bold">
                        Clean Alternative
                      </span>
                      <span className="font-body-sm text-[12px] font-semibold text-on-surface leading-tight mt-0.5">
                        {swap.toHabit}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Impact Receipts Metrics Row */}
                <div className="grid grid-cols-2 gap-2 mb-space-sm">
                  {/* Exposure Avoided */}
                  <div className="bg-surface-container rounded-xl p-2.5 flex flex-col">
                    <span className="font-label-sm text-[10px] text-on-surface-variant font-medium">
                      Exposure Avoided
                    </span>
                    <span className="font-headline-sm text-[15px] text-primary font-bold mt-0.5">
                      {impact.exposureAvoidedUg} µg PM2.5
                    </span>
                  </div>

                  {/* CO2 or Specific Benefit (Hiding 0.0 kg per HANDOFF.md) */}
                  <div className="bg-surface-container rounded-xl p-2.5 flex flex-col justify-center">
                    {impact.co2SavedKg && impact.co2SavedKg > 0 ? (
                      <>
                        <span className="font-label-sm text-[10px] text-on-surface-variant font-medium">
                          CO₂ Saved
                        </span>
                        <span className="font-headline-sm text-[15px] text-secondary font-bold mt-0.5">
                          {impact.co2SavedKg} kg
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-label-sm text-[10px] text-on-surface-variant font-medium">
                          Kitchen Benefit
                        </span>
                        <span className="font-body-sm text-[11px] font-semibold text-secondary leading-tight mt-0.5">
                          {impact.specialBenefit || 'Removes indoor flame'}
                        </span>
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Action Button: Add to My Plan */}
              <button
                type="button"
                onClick={() => toggleAdoptSwap(swap.id)}
                className={`w-full py-2.5 px-3 rounded-xl font-label-md text-label-md font-semibold transition-all flex items-center justify-center gap-1.5 ${
                  isAdopted
                    ? 'bg-surface-container-high text-primary hover:bg-surface-container-highest border border-surface-container'
                    : 'bg-primary text-on-primary hover:bg-primary-container shadow-sm'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isAdopted ? 'task_alt' : 'add_circle'}
                </span>
                <span>{isAdopted ? 'Added to Plan ✓' : 'Add to My Plan'}</span>
              </button>
            </div>
          );
        })}
      </div>

      {/* Active Weekly Dividends Sticky Banner */}
      {weeklyImpact.qualifyingCount > 0 && (
        <div className="bg-primary text-on-primary rounded-2xl p-space-md lg:p-space-lg shadow-xl flex flex-col md:flex-row items-center justify-between gap-space-md">
          <div className="flex items-center gap-space-md">
            <div className="w-12 h-12 rounded-xl bg-primary-container flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary-fixed text-[26px]">eco</span>
            </div>
            <div>
              <div className="font-label-md text-label-md text-primary-fixed uppercase tracking-wider font-semibold">
                Weekly Impact of Your Active Swaps
              </div>
              <div className="font-headline-sm text-headline-sm text-white font-bold tracking-tight">
                {weeklyImpact.totalUg > 0 && `${weeklyImpact.totalUg} µg PM2.5 avoided`}
                {weeklyImpact.totalCo2 > 0 && (
                  <>
                    <span className="text-primary-fixed opacity-70"> · </span>
                    {weeklyImpact.totalCo2} kg CO₂ saved
                  </>
                )}
                {weeklyImpact.approxCigs !== '0' && (
                  <>
                    <span className="text-primary-fixed opacity-70"> · </span>
                    About {weeklyImpact.approxCigs.replace('~', '')} cigarettes avoided
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowFormulaModal(true)}
            className="px-4 py-2.5 rounded-xl font-label-md text-label-md bg-secondary-fixed text-on-secondary-fixed hover:bg-secondary-fixed-dim transition-colors flex items-center gap-1 font-bold shadow-sm shrink-0"
          >
            <span>How this is calculated</span>
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      )}

      {/* Formula Explainer Modal */}
      {showFormulaModal && (
        <ReceiptModal
          action={dummyActionForModal}
          onClose={() => setShowFormulaModal(false)}
        />
      )}
    </div>
  );
};
