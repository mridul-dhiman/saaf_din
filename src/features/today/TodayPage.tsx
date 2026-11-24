import React, { useEffect, useState, useMemo } from 'react';
import { NavLink } from 'react-router-dom';
import { useProfile } from '../../context/ProfileContext';
import { useLanguage } from '../../i18n';
import { currentForecastProvider } from '../../services/forecast';
import { HourlyForecast } from '../../types';
import { findBestAndWorstWindows } from '../../lib/aqi';
import { AqiBanner } from '../../components/AqiBanner';
import { HourlyStrip } from '../../components/HourlyStrip';
import { generateRuleBasedPlan, EnrichedAction } from '../../lib/impact/rulePlanner';
import { generateGeminiPlan } from '../../services/gemini';
import { ReceiptModal } from '../../components/ReceiptModal';
import { ShareCardModal } from '../../components/ShareCardModal';
import { formatCigarettes, calcTotalCigarettesAvoided, makePm25Lookup } from '../../lib/impact';

export const TodayPage: React.FC = () => {
  const { profile } = useProfile();
  const { t } = useLanguage();
  const [forecast, setForecast] = useState<HourlyForecast | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const [actions, setActions] = useState<EnrichedAction[]>([]);
  const [selectedActionForReceipt, setSelectedActionForReceipt] = useState<EnrichedAction | null>(null);
  const [showFormulaModal, setShowFormulaModal] = useState<boolean>(false);
  const [showShareModal, setShowShareModal] = useState<boolean>(false);

  const todayDateStr = new Date().toISOString().slice(0, 10);
  const storagePlanKey = `saafdin_plan_${todayDateStr}`;

  const fetchForecast = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await currentForecastProvider.getHourly(
        profile.location.lat,
        profile.location.lon
      );
      setForecast(data);
    } catch (err: any) {
      console.error('Failed to load forecast data:', err);
      setError(err?.message || 'Could not connect to forecast service. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchForecast();
  }, [profile.location.lat, profile.location.lon]);

  const windowsResult = useMemo(() => {
    if (!forecast || forecast.points.length === 0) {
      return {
        bestWindow: null,
        worstWindow: null,
        canVentilateToday: false,
        advisory: '',
      };
    }
    return findBestAndWorstWindows(forecast.points);
  }, [forecast]);

  // Generate or load daily plan
  useEffect(() => {
    if (!forecast || forecast.points.length === 0) return;

    let active = true;

    // First render immediate rule-based plan so UI is never blank
    const initialPlan = generateRuleBasedPlan(profile, forecast.points, windowsResult);
    
    // Check local completion state
    let savedCompletion: Record<string, boolean> = {};
    try {
      const saved = localStorage.getItem(storagePlanKey);
      if (saved) savedCompletion = JSON.parse(saved);
    } catch (e) {
      // ignore
    }

    const applyCompletions = (planList: EnrichedAction[]) => {
      return planList.map((act) => ({
        ...act,
        completed: savedCompletion[act.id] !== undefined ? savedCompletion[act.id] : act.completed,
      }));
    };

    setActions(applyCompletions(initialPlan));

    // Then attempt Gemini plan asynchronously
    generateGeminiPlan(profile, forecast.points, windowsResult)
      .then((geminiPlan) => {
        if (active && geminiPlan.length > 0) {
          setActions(applyCompletions(geminiPlan));
        }
      })
      .catch((err) => {
        console.warn('Gemini plan generation error, maintaining rule-based plan:', err);
      });

    return () => {
      active = false;
    };
  }, [forecast, profile, windowsResult]);

  // Toggle action completion
  const handleToggleAction = (id: string) => {
    const updated = actions.map((act) =>
      act.id === id ? { ...act, completed: !act.completed } : act
    );
    setActions(updated);

    // Persist completion state
    try {
      const stateMap = updated.reduce<Record<string, boolean>>((acc, act) => {
        acc[act.id] = !!act.completed;
        return acc;
      }, {});
      localStorage.setItem(storagePlanKey, JSON.stringify(stateMap));
    } catch (e) {
      console.warn('Error persisting plan completions:', e);
    }
  };

  // Calculations for Today's Impact Card
  const completedActions = useMemo(() => actions.filter((a) => a.completed), [actions]);
  const totalActionsCount = actions.length;
  const completedCount = completedActions.length;
  const completionPercentage = totalActionsCount > 0 ? Math.round((completedCount / totalActionsCount) * 100) : 0;

  // Qualifying actions: ticked actions whose receipt is non-null
  const qualifyingActions = useMemo(() => {
    return actions.filter((a) => a.completed && a.impact.exposureAvoidedUg !== null);
  }, [actions]);

  const totalPm25AvoidedUg = useMemo(() => {
    return qualifyingActions.reduce((acc, a) => acc + (a.impact.exposureAvoidedUg as number), 0);
  }, [qualifyingActions]);

  const totalCo2SavedKg = useMemo(() => {
    const sum = qualifyingActions.reduce((acc, a) => acc + (a.impact.co2SavedKg || 0), 0);
    return Number(sum.toFixed(1));
  }, [qualifyingActions]);

  // Cigarette equivalents avoided today (Berkeley Earth: 22 µg/m³ * 24h = 1 cig)
  const approxCigarettesAvoided = useMemo(() => {
    if (!forecast || qualifyingActions.length === 0) return null;
    const lookup = makePm25Lookup(forecast.points);
    const cigs = calcTotalCigarettesAvoided(qualifyingActions, lookup);
    return formatCigarettes(cigs);
  }, [qualifyingActions, forecast]);

  const currentPoint = forecast?.points[0];

  return (
    <div className="flex flex-col gap-space-lg w-full pb-8">
      {/* Loading State */}
      {loading && !forecast && (
        <div className="bg-surface-container-lowest rounded-2xl p-space-xl shadow-sm border border-surface-container flex flex-col items-center justify-center min-h-[300px] text-center gap-space-md">
          <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin"></div>
          <div className="flex flex-col gap-1">
            <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Fetching atmospheric forecast…
            </span>
            <span className="font-body-sm text-body-sm text-on-surface-variant">
              Connecting to Open-Meteo CAMS air quality model for {profile.location.name}
            </span>
          </div>
        </div>
      )}

      {/* Error State */}
      {error && !forecast && (
        <div className="bg-error-container/30 border border-error rounded-2xl p-space-lg shadow-sm flex flex-col gap-space-sm items-start">
          <div className="flex items-center gap-space-sm text-error">
            <span className="material-symbols-outlined text-[24px]">error</span>
            <span className="font-headline-sm text-headline-sm font-semibold">Forecast unavailable</span>
          </div>
          <p className="font-body-md text-body-md text-on-surface">{error}</p>
          <button
            onClick={fetchForecast}
            className="mt-2 px-4 py-2 bg-primary text-on-primary rounded-xl font-label-md text-label-md hover:bg-primary-container transition-colors"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* Main Content */}
      {forecast && currentPoint && (
        <>
          {/* Top Banner: Hero AQI, band, weather tiles */}
          <AqiBanner
            currentPoint={currentPoint}
            source={forecast.source}
            updatedAt={forecast.updatedAt}
            advisoryText={windowsResult.advisory}
          />

          {/* 24-Bar Hourly PM2.5 Strip & Ventilation Windows */}
          <HourlyStrip
            points={forecast.points}
            windows={windowsResult}
          />

          {/* 2-Column Grid: Left (Daily Action Plan) vs Right (Impact & Family Sidebar) */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-space-lg items-start">
            {/* Left 8 Cols: Interactive Daily Action Plan */}
            <div className="lg:col-span-8 flex flex-col gap-space-md">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-primary text-[24px]">checklist</span>
                  <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Action Plan for Today
                  </h2>
                </div>
                <span className="font-label-sm text-label-sm text-on-surface-variant font-medium">
                  {completedCount} of {totalActionsCount} actions done
                </span>
              </div>

              {/* Action Cards Timeline */}
              <div className="flex flex-col gap-3 relative">
                {/* Connecting subtle vertical track */}
                <div className="hidden sm:block absolute left-[22px] top-6 bottom-6 w-0.5 bg-surface-container-highest z-0"></div>

                {actions.map((act) => {
                  const beneficiary = act.memberId
                    ? profile.members.find((m) => m.id === act.memberId)
                    : null;

                  return (
                    <div
                      key={act.id}
                      className={`bg-surface-container-lowest p-space-md rounded-2xl shadow-sm border transition-all relative z-10 flex items-start gap-3.5 ${
                        act.completed
                          ? 'border-surface-container opacity-90'
                          : 'border-surface-container/80 hover:border-secondary/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <input
                        type="checkbox"
                        checked={act.completed}
                        onChange={() => handleToggleAction(act.id)}
                        className="w-5 h-5 mt-1 rounded text-primary accent-primary cursor-pointer shrink-0"
                      />

                      {/* Card Content */}
                      <div className="flex-1 min-w-0">
                        {/* Top Meta Line: Time + Beneficiary Tag + Receipt Pills */}
                        <div className="flex flex-wrap items-center justify-between gap-1.5 mb-1">
                          <div className="flex items-center gap-2">
                            <span className="font-label-sm text-label-sm text-outline font-semibold">
                              {act.start} – {act.end}
                            </span>
                            {beneficiary && (
                              <span className="font-label-sm text-[10px] px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface font-semibold capitalize">
                                {beneficiary.name} ({beneficiary.ageGroup})
                              </span>
                            )}
                          </div>

                          {/* Impact Receipt Pills (Clickable) */}
                          <div className="flex items-center gap-1.5 flex-wrap">
                            {act.impact.exposureAvoidedUg !== null && (
                              <button
                                type="button"
                                onClick={() => setSelectedActionForReceipt(act)}
                                className="inline-flex items-center gap-1 font-label-sm text-label-sm text-primary font-bold bg-primary-fixed/40 hover:bg-primary-fixed/70 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                                title="Click to view calculation breakdown"
                              >
                                <span className="material-symbols-outlined text-[13px]">filter_alt</span>
                                <span>{act.impact.exposureAvoidedUg} µg PM2.5</span>
                              </button>
                            )}

                            {act.impact.co2SavedKg !== null && (
                              <button
                                type="button"
                                onClick={() => setSelectedActionForReceipt(act)}
                                className="inline-flex items-center gap-1 font-label-sm text-label-sm text-secondary font-bold bg-secondary-fixed/50 hover:bg-secondary-fixed/80 px-2 py-0.5 rounded-md transition-colors cursor-pointer"
                                title="Click to view emission calculation"
                              >
                                <span className="material-symbols-outlined text-[13px]">eco</span>
                                <span>{act.impact.co2SavedKg} kg CO₂</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Title */}
                        <h3 className="font-label-lg text-label-lg font-bold text-on-surface leading-tight">
                          {act.title}
                        </h3>

                        {/* Reason */}
                        <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5 leading-snug">
                          {act.reason}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Right 4 Cols: Today's Impact & Family Sidebar */}
            <div className="lg:col-span-4 flex flex-col gap-space-md">
              {/* Today's Impact Card */}
              <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container flex flex-col gap-space-md">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="material-symbols-outlined text-secondary text-[20px]">eco</span>
                    <span className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                      Today's impact
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowFormulaModal(true)}
                    className="font-label-sm text-label-sm text-secondary hover:underline cursor-pointer font-semibold"
                  >
                    How this is calculated
                  </button>
                </div>

                {/* Metric Tiles (Hidden if no action qualifies or all values 0) */}
                {qualifyingActions.length > 0 && (
                  <div className="grid grid-cols-3 gap-2">
                    {totalPm25AvoidedUg > 0 && (
                      <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col items-center text-center">
                        <span className="font-headline-sm text-[17px] text-primary font-bold">
                          {totalPm25AvoidedUg} µg
                        </span>
                        <span className="font-label-sm text-[10px] text-on-surface-variant mt-0.5 leading-tight">
                          PM2.5 avoided
                        </span>
                      </div>
                    )}

                    {totalCo2SavedKg > 0 && (
                      <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col items-center text-center">
                        <span className="font-headline-sm text-[17px] text-primary font-bold">
                          {totalCo2SavedKg} kg
                        </span>
                        <span className="font-label-sm text-[10px] text-on-surface-variant mt-0.5 leading-tight">
                          CO₂ saved
                        </span>
                      </div>
                    )}

                    {approxCigarettesAvoided !== null && approxCigarettesAvoided !== '0' && (
                      <div className="bg-surface-container-low rounded-xl p-2.5 flex flex-col items-center text-center">
                        <span className="font-headline-sm text-[17px] text-secondary font-bold">
                          {approxCigarettesAvoided}
                        </span>
                        <span className="font-label-sm text-[10px] text-on-surface-variant mt-0.5 leading-tight">
                          cigarettes avoided
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Progress Ring and Summary */}
                <div className="flex items-center justify-between pt-2 border-t border-surface-container">
                  <div className="flex flex-col">
                    <span className="font-headline-sm text-[16px] text-on-surface font-bold">
                      {completedCount} of {totalActionsCount}
                    </span>
                    <span className="font-body-sm text-[12px] text-on-surface-variant">
                      actions completed today
                    </span>
                  </div>

                  <div className="relative w-14 h-14 flex items-center justify-center shrink-0">
                    <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
                      <circle
                        className="text-surface-container-highest"
                        cx="50"
                        cy="50"
                        fill="none"
                        r="40"
                        stroke="currentColor"
                        strokeWidth="10"
                      />
                      <circle
                        className="text-secondary transition-all duration-500"
                        cx="50"
                        cy="50"
                        fill="none"
                        r="40"
                        stroke="currentColor"
                        strokeDasharray="251.2"
                        strokeDashoffset={251.2 - (251.2 * completionPercentage) / 100}
                        strokeLinecap="round"
                        strokeWidth="10"
                      />
                    </svg>
                    <span className="font-label-md text-[12px] text-secondary font-bold absolute">
                      {completionPercentage}%
                    </span>
                  </div>
                </div>

                {/* Share Daily Impact Card CTA */}
                <button
                  type="button"
                  onClick={() => setShowShareModal(true)}
                  className="w-full mt-1 py-2 px-3 rounded-xl bg-surface-container hover:bg-surface-container-high text-on-surface font-label-md text-label-md font-semibold flex items-center justify-center gap-1.5 transition-colors border border-surface-container"
                >
                  <span className="material-symbols-outlined text-[16px] text-secondary">share</span>
                  <span>{t.today.shareCard}</span>
                </button>
              </div>

              {/* Family Cards */}
              <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container flex flex-col gap-space-sm">
                <div className="flex items-center justify-between">
                  <h3 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
                    Family
                  </h3>
                  <NavLink
                    to="/onboarding"
                    className="font-label-sm text-label-sm text-secondary hover:underline font-semibold"
                  >
                    Manage
                  </NavLink>
                </div>

                <div className="flex flex-col gap-2">
                  {profile.members.map((member) => (
                    <div
                      key={member.id}
                      className="p-2.5 rounded-xl bg-surface-container-low flex items-center justify-between border border-surface-container/50"
                    >
                      <div className="flex items-center gap-2.5 overflow-hidden">
                        <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center shrink-0 font-bold text-label-sm">
                          {member.name.charAt(0)}
                        </div>
                        <div className="flex flex-col truncate">
                          <span className="font-label-md text-label-md text-on-surface font-semibold truncate">
                            {member.name}
                          </span>
                          <span className="font-body-sm text-[11px] text-on-surface-variant capitalize truncate">
                            {member.ageGroup}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 flex-wrap justify-end">
                        {member.sensitivities.map((s) => (
                          <span
                            key={s}
                            className="font-label-sm text-[10px] px-2 py-0.5 rounded-full bg-surface-container-highest text-on-surface font-semibold capitalize"
                          >
                            {s}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Consult Assistant Quick Button */}
              <NavLink
                to="/assistant"
                className="w-full bg-primary text-on-primary py-3 px-space-md rounded-xl font-label-md text-label-md flex items-center justify-center gap-2 hover:bg-primary-container transition-colors shadow-sm font-semibold"
              >
                <span className="material-symbols-outlined text-[20px]">forum</span>
                <span>Consult Air Assistant</span>
              </NavLink>
            </div>
          </div>
        </>
      )}

      {/* Individual Action Impact Receipt Modal */}
      <ReceiptModal
        action={selectedActionForReceipt}
        onClose={() => setSelectedActionForReceipt(null)}
      />

      {/* General Impact Model Formula Modal */}
      {showFormulaModal && (
        <ReceiptModal
          action={actions[0]}
          onClose={() => setShowFormulaModal(false)}
        />
      )}

      {/* Share Impact Card Modal */}
      {showShareModal && (
        <ShareCardModal
          profile={profile}
          pm25AvoidedUg={totalPm25AvoidedUg}
          co2SavedKg={totalCo2SavedKg}
          cigarettesAvoided={approxCigarettesAvoided ?? '0'}
          completedActionsCount={completedCount}
          onClose={() => setShowShareModal(false)}
        />
      )}
    </div>
  );
};
