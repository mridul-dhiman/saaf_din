import React, { useState, useEffect, useMemo } from 'react';
import { useProfile } from '../../context/ProfileContext';
import { useLanguage } from '../../i18n';
import { currentForecastProvider } from '../../services/forecast';
import { HourlyForecast } from '../../types';
import { ReceiptModal } from '../../components/ReceiptModal';
import { scoreAndFilterSwaps, calculateWeeklySwapTotals, ScoredSwap } from '../../lib/impact';
import { saveSwapsToFirestore, loadSwapsFromFirestore } from '../../services/firebase';

export type SwapCategory = 'all' | 'commute' | 'cooking' | 'puja' | 'fitness' | 'high-impact';

export const SwapsPage: React.FC = () => {
  const { profile } = useProfile();
  const { t } = useLanguage();
  const [forecast, setForecast] = useState<HourlyForecast | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeCategory, setActiveCategory] = useState<SwapCategory>('all');
  const [adoptedSwapIds, setAdoptedSwapIds] = useState<string[]>(() => {
    try {
      const saved = localStorage.getItem('saafdin_adopted_swaps');
      return saved ? JSON.parse(saved) : ['swap_home_cooking', 'swap_office_commute'];
    } catch (e) {
      return ['swap_home_cooking', 'swap_office_commute'];
    }
  });

  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);

  useEffect(() => {
    loadSwapsFromFirestore().then((swaps) => {
      if (swaps && swaps.length > 0) {
        setAdoptedSwapIds(swaps);
      }
    });
  }, []);

  useEffect(() => {
    setLoading(true);
    currentForecastProvider.getHourly(profile.location.lat, profile.location.lon)
      .then((f) => {
        setForecast(f);
      })
      .catch((e) => console.warn(e))
      .finally(() => setLoading(false));
  }, [profile.location.lat, profile.location.lon]);

  const toggleAdoptSwap = (id: string) => {
    const next = adoptedSwapIds.includes(id)
      ? adoptedSwapIds.filter((x) => x !== id)
      : [...adoptedSwapIds, id];
    setAdoptedSwapIds(next);
    saveSwapsToFirestore(next);
  };

  // Evaluate pure swaps catalogue using forecast points
  const allScoredSwaps: ScoredSwap[] = useMemo(() => {
    if (!forecast || forecast.points.length === 0) return [];
    return scoreAndFilterSwaps(profile, forecast.points);
  }, [profile, forecast]);

  // Filter Swaps by category and profile applicability
  const filteredSwaps = useMemo(() => {
    return allScoredSwaps.filter((swap) => {
      if (!swap.isApplicable) return false;
      if (activeCategory === 'all') return true;
      if (activeCategory === 'high-impact') {
        return swap.exposureAvoidedUg !== null && swap.exposureAvoidedUg >= 50;
      }
      return swap.category === activeCategory;
    });
  }, [activeCategory, allScoredSwaps]);

  // Aggregate Impact of Adopted Swaps This Week
  const weeklyImpact = useMemo(() => {
    return calculateWeeklySwapTotals(allScoredSwaps, adoptedSwapIds);
  }, [allScoredSwaps, adoptedSwapIds]);

  return (
    <div className="flex flex-col gap-space-lg w-full pb-16">
      {/* Page Header */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md lg:p-space-lg shadow-sm border border-surface-container flex flex-col gap-space-sm">
        <div className="flex items-center gap-space-sm">
          <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center">
            <span className="material-symbols-outlined text-[24px]">swap_horiz</span>
          </div>
          <div>
            <h1 className="font-headline-sm text-headline-sm text-on-surface font-bold">
              {t.swaps.title}
            </h1>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              {t.swaps.subtitle} ({profile.location.name})
            </p>
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
            {t.swaps.allSwaps}
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
            {t.swaps.commute}
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
            {t.swaps.cooking}
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
            {t.swaps.puja}
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
            {t.swaps.fitness}
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
            <span>{t.swaps.highImpact}</span>
          </button>
        </div>
      </div>

      {/* Loading state before forecast points arrive */}
      {loading && !forecast && (
        <div className="bg-surface-container-lowest rounded-2xl p-space-xl text-center border border-surface-container flex flex-col items-center gap-2">
          <div className="w-8 h-8 border-3 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <span className="font-body-sm text-body-sm text-on-surface-variant">
            Evaluating habit alternatives from live atmospheric forecast…
          </span>
        </div>
      )}

      {/* Swaps Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-space-md">
        {filteredSwaps.map((swap: ScoredSwap) => {
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
                        {t.swaps.baselineHabit}
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
                        {t.swaps.cleanAlternative}
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
                      {t.swaps.exposureAvoided}
                    </span>
                    <span className="font-headline-sm text-[15px] text-primary font-bold mt-0.5">
                      {swap.exposureAvoidedUg !== null
                        ? `${swap.exposureAvoidedUg} µg PM2.5`
                        : 'Unquantified'}
                    </span>
                  </div>

                  {/* CO2 or Specific Benefit */}
                  <div className="bg-surface-container rounded-xl p-2.5 flex flex-col justify-center">
                    {swap.co2SavedKg && swap.co2SavedKg > 0 ? (
                      <>
                        <span className="font-label-sm text-[10px] text-on-surface-variant font-medium">
                          {t.swaps.co2Saved}
                        </span>
                        <span className="font-headline-sm text-[15px] text-secondary font-bold mt-0.5">
                          {swap.co2SavedKg} kg
                        </span>
                      </>
                    ) : (
                      <>
                        <span className="font-label-sm text-[10px] text-on-surface-variant font-medium">
                          {t.swaps.actionBenefit}
                        </span>
                        <span className="font-body-sm text-[11px] font-semibold text-secondary leading-tight mt-0.5">
                          {swap.specialBenefit || t.swaps.cleanAlternative}
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
                className={`w-full py-2.5 px-3 rounded-xl font-label-md text-label-md font-semibold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                  isAdopted
                    ? 'bg-surface-container-high text-primary hover:bg-surface-container-highest border border-surface-container'
                    : 'bg-primary text-on-primary hover:bg-primary-container shadow-sm'
                }`}
              >
                <span className="material-symbols-outlined text-[18px]">
                  {isAdopted ? 'task_alt' : 'add_circle'}
                </span>
                <span>{isAdopted ? `${t.swaps.adopted} ✓` : t.swaps.adopt}</span>
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
                {t.swaps.weeklyImpact} (5 days commute, 7 days daily habits)
              </div>
              <div className="font-headline-sm text-headline-sm text-white font-bold tracking-tight">
                {weeklyImpact.totalUg > 0 && `${weeklyImpact.totalUg} µg PM2.5 ${t.today.pm25Avoided}`}
                {weeklyImpact.totalCo2 > 0 && (
                  <>
                    <span className="text-primary-fixed opacity-70"> · </span>
                    {weeklyImpact.totalCo2} kg {t.today.co2Saved}
                  </>
                )}
                {weeklyImpact.totalCigs > 0 && (
                  <>
                    <span className="text-primary-fixed opacity-70"> · </span>
                    {Math.round(weeklyImpact.totalCigs)} {t.today.cigsAvoided}
                  </>
                )}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowFormulaModal(true)}
            className="px-4 py-2.5 rounded-xl font-label-md text-label-md bg-secondary-fixed text-on-secondary-fixed hover:bg-secondary-fixed-dim transition-colors flex items-center gap-1 font-bold shadow-sm shrink-0 cursor-pointer"
          >
            <span>{t.today.howCalculated}</span>
            <span className="material-symbols-outlined text-[18px]">chevron_right</span>
          </button>
        </div>
      )}

      {/* Formula Explainer Modal */}
      {showFormulaModal && (
        <ReceiptModal
          formulaOnly
          title="How Habit Swaps Impact Is Calculated"
          onClose={() => setShowFormulaModal(false)}
        />
      )}
    </div>
  );
};
