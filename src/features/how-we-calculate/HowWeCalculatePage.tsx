import React from 'react';
import { NavLink } from 'react-router-dom';
import {
  ENV_FACTORS,
  MASK_FACTORS,
  INHALATION_RATES,
  EMISSION_FACTORS,
  URBAN_SPEEDS_KMH,
  PURIFIER_WATTS,
  GRID_KG_CO2_PER_KWH,
  SCHOOL_RUN_DISTANCE_KM,
  CIGARETTE_EQUIVALENT_UG_PER_M3_24H,
} from '../../lib/impact/constants';

export const HowWeCalculatePage: React.FC = () => {
  return (
    <div className="flex flex-col gap-space-lg pb-space-xl max-w-5xl mx-auto w-full">
      {/* Page Header */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          <NavLink
            to="/today"
            className="inline-flex items-center gap-1 text-[13px] text-secondary font-semibold hover:underline"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Back to Today's Plan
          </NavLink>
        </div>
        <h1 className="font-headline-xl text-[28px] lg:text-[32px] font-bold text-on-surface tracking-tight">
          How We Calculate Impact
        </h1>
        <p className="font-body-md text-on-surface-variant max-w-3xl leading-relaxed">
          SaafDin enforces a strict governing architectural rule:{' '}
          <strong className="text-on-surface">Gemini never produces numbers.</strong> Every exposure figure (µg PM2.5),
          carbon emission saving (kg CO₂), cigarette equivalent, and duration in this application is computed
          deterministically from live Open-Meteo CAMS forecast data, your household profile, and the peer-reviewed
          constants below.
        </p>
      </div>

      {/* 1. Inhaled Dose Formula Section */}
      <section className="bg-surface-container-lowest rounded-2xl p-space-md lg:p-space-lg shadow-sm border border-surface-container flex flex-col gap-space-md">
        <div className="flex items-center gap-2 text-primary">
          <span className="material-symbols-outlined text-[24px]">functions</span>
          <h2 className="font-headline-md text-[20px] font-bold text-on-surface">
            1. Inhaled Particulate Dose (Exposure)
          </h2>
        </div>

        <p className="text-body-md text-on-surface-variant leading-relaxed">
          Inhaled PM2.5 mass during any activity window of duration <span className="font-mono">Δt</span> is calculated by
          integrating hourly ambient particulate concentration, microenvironment penetration, personal mask filtration,
          and biological inhalation rate:
        </p>

        {/* Formula Box */}
        <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-2 font-mono text-[14px]">
          <div className="text-primary font-bold text-[15px]">
            Inhaled_µg = ∑ ( C_outdoor[h] × F_env × F_mask × IR × Δt )
          </div>
          <div className="text-secondary font-semibold text-[13px]">
            Exposure_Avoided_µg = Baseline_Inhaled_µg − Alternative_Inhaled_µg
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-space-md text-[13px] text-on-surface-variant">
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface-container-low/50">
            <span className="font-bold text-on-surface">C_outdoor[h] (µg/m³)</span>
            <span>
              The hourly surface PM2.5 concentration from the European Centre for Medium-Range Weather Forecasts (ECMWF)
              Copernicus Atmosphere Monitoring Service (CAMS) grid model via Open-Meteo.
            </span>
          </div>
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface-container-low/50">
            <span className="font-bold text-on-surface">IR (m³/h)</span>
            <span>
              Volumetric inhalation rate based on user age group (child, adult, elderly) and physical exertion intensity
              (rest, light, moderate, vigorous), parameterized from the US EPA Exposure Factors Handbook.
            </span>
          </div>
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface-container-low/50">
            <span className="font-bold text-on-surface">F_env (dimensionless, 0–1)</span>
            <span>
              Microenvironment particulate penetration ratio. Accounts for building infiltration attenuation, vehicle cabin
              filtration, or open-air roadside conditions.
            </span>
          </div>
          <div className="flex flex-col gap-1.5 p-3 rounded-xl bg-surface-container-low/50">
            <span className="font-bold text-on-surface">F_mask (dimensionless, 0–1)</span>
            <span>
              Respiratory mask penetration ratio (1 − filtration efficiency). An N95 respirator reduces inhaled particulate
              penetration to 0.3 (accounting for standard real-world face-seal leakage).
            </span>
          </div>
        </div>
      </section>

      {/* 2. Constants Tables: F_env and F_mask */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {/* F_env Table */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container flex flex-col gap-space-sm">
          <h3 className="font-headline-sm text-[16px] font-bold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-secondary text-[20px]">home</span>
            Microenvironment Factors (F_env)
          </h3>
          <p className="text-[12px] text-on-surface-variant">
            Ratio of indoor/in-cabin PM2.5 to ambient outdoor concentration.
          </p>
          <div className="overflow-x-auto rounded-xl border border-surface-container mt-1">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead className="bg-surface-container-high text-on-surface-variant font-semibold">
                <tr>
                  <th className="p-2">Environment Key</th>
                  <th className="p-2">F_env</th>
                  <th className="p-2">Source / Basis</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {Object.entries(ENV_FACTORS).map(([key, val]) => (
                  <tr key={key} className="hover:bg-surface-container-low">
                    <td className="p-2 font-mono text-[11px] font-semibold">{key}</td>
                    <td className="p-2 font-mono font-bold text-primary">{val}</td>
                    <td className="p-2 text-on-surface-variant text-[11px]">
                      {key === 'outdoors'
                        ? 'Ambient reference baseline'
                        : key === 'indoors_closed_purifier'
                        ? 'HEPA sealed filtration'
                        : key === 'indoors_closed'
                        ? 'Residential infiltration'
                        : key === 'car_closed_recirc'
                        ? 'Cabin recirc + cabin filter'
                        : 'Standard literature factor'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* F_mask Table */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container flex flex-col gap-space-sm">
          <h3 className="font-headline-sm text-[16px] font-bold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-primary text-[20px]">masks</span>
            Mask Penetration Factors (F_mask)
          </h3>
          <p className="text-[12px] text-on-surface-variant">
            Penetration fraction through mask material and typical edge seal fit.
          </p>
          <div className="overflow-x-auto rounded-xl border border-surface-container mt-1">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead className="bg-surface-container-high text-on-surface-variant font-semibold">
                <tr>
                  <th className="p-2">Mask Type</th>
                  <th className="p-2">F_mask</th>
                  <th className="p-2">Effective Protection</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {Object.entries(MASK_FACTORS).map(([key, val]) => (
                  <tr key={key} className="hover:bg-surface-container-low">
                    <td className="p-2 font-mono text-[11px] font-semibold uppercase">{key}</td>
                    <td className="p-2 font-mono font-bold text-primary">{val}</td>
                    <td className="p-2 text-on-surface-variant text-[11px]">
                      {key === 'none'
                        ? '0% reduction (unfiltered)'
                        : key === 'cloth'
                        ? '20% reduction (loose cloth/surgical)'
                        : '70% reduction (fitted particulate respirator)'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* 3. Inhalation Rates Table */}
      <section className="bg-surface-container-lowest rounded-2xl p-space-md lg:p-space-lg shadow-sm border border-surface-container flex flex-col gap-space-sm">
        <h3 className="font-headline-sm text-[18px] font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[22px]">air</span>
          Inhalation Rates (IR in m³/hour)
        </h3>
        <p className="text-[13px] text-on-surface-variant">
          Derived from the US EPA Exposure Factors Handbook (2011, Table 6-1: Daily Mean Inhalation Values by Activity Level):
        </p>

        <div className="overflow-x-auto rounded-xl border border-surface-container mt-1">
          <table className="w-full text-left border-collapse text-[13px]">
            <thead className="bg-surface-container-high text-on-surface-variant font-semibold">
              <tr>
                <th className="p-2.5">Exertion Intensity</th>
                <th className="p-2.5">Child (&lt;12)</th>
                <th className="p-2.5">Adult (18–60)</th>
                <th className="p-2.5">Elderly (&gt;60)</th>
                <th className="p-2.5">Example Activity</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              {Object.entries(INHALATION_RATES).map(([intensity, groupRates]) => (
                <tr key={intensity} className="hover:bg-surface-container-low">
                  <td className="p-2.5 font-semibold capitalize">{intensity}</td>
                  <td className="p-2.5 font-mono">{groupRates.child} m³/h</td>
                  <td className="p-2.5 font-mono">{groupRates.adult} m³/h</td>
                  <td className="p-2.5 font-mono">{groupRates.elderly} m³/h</td>
                  <td className="p-2.5 text-on-surface-variant text-[12px]">
                    {intensity === 'rest'
                      ? 'Sleeping, reclining, seated watching TV'
                      : intensity === 'light'
                      ? 'Walking slowly, cooking, light office work'
                      : intensity === 'moderate'
                      ? 'Brisk walking, cycling, housework'
                      : 'Running, outdoor sports, high-intensity workout'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* 4. Transport CO2 Emissions & Travel Speeds */}
      <section className="grid grid-cols-1 md:grid-cols-2 gap-space-md">
        {/* Emission Factors */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container flex flex-col gap-space-sm">
          <h3 className="font-headline-sm text-[16px] font-bold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-secondary text-[20px]">directions_bus</span>
            Emission Factors (EF in g CO₂/pkm)
          </h3>
          <p className="text-[12px] text-on-surface-variant">
            CO₂ emissions per passenger-kilometer (India GHG Program &amp; ARAI transport baseline).
          </p>
          <div className="p-2 rounded-lg bg-surface-container-low font-mono text-[12px] text-secondary font-semibold">
            CO₂ Saved (kg) = Distance (km) × (EF_baseline − EF_alt) / 1000
          </div>
          <div className="overflow-x-auto rounded-xl border border-surface-container mt-1">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead className="bg-surface-container-high text-on-surface-variant font-semibold">
                <tr>
                  <th className="p-2">Travel Mode</th>
                  <th className="p-2">EF (g CO₂/pkm)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {Object.entries(EMISSION_FACTORS).map(([mode, ef]) => (
                  <tr key={mode} className="hover:bg-surface-container-low">
                    <td className="p-2 font-mono text-[11px] capitalize">{mode.replace('_', ' ')}</td>
                    <td className="p-2 font-mono font-bold text-secondary">{ef} g/pkm</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Travel Speeds & Purifier Assumptions */}
        <div className="bg-surface-container-lowest rounded-2xl p-space-md shadow-sm border border-surface-container flex flex-col gap-space-sm">
          <h3 className="font-headline-sm text-[16px] font-bold text-on-surface flex items-center gap-1.5">
            <span className="material-symbols-outlined text-outline text-[20px]">speed</span>
            Urban Speeds &amp; Technical Constants
          </h3>
          <p className="text-[12px] text-on-surface-variant">
            Used to derive travel durations from commute distance: <span className="font-mono">duration = distance / speed</span>.
          </p>

          <div className="overflow-x-auto rounded-xl border border-surface-container mt-1">
            <table className="w-full text-left border-collapse text-[12px]">
              <thead className="bg-surface-container-high text-on-surface-variant font-semibold">
                <tr>
                  <th className="p-2">Travel Mode</th>
                  <th className="p-2">Speed</th>
                  <th className="p-2">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-container">
                {Object.entries(URBAN_SPEEDS_KMH).map(([mode, speed]) => (
                  <tr key={mode} className="hover:bg-surface-container-low">
                    <td className="p-2 font-mono text-[11px] capitalize">{mode.replace('_', ' ')}</td>
                    <td className="p-2 font-mono font-bold">{speed} km/h</td>
                    <td className="p-2 text-outline text-[11px]">assumption, not verified</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="mt-2 p-2.5 rounded-xl bg-surface-container-low flex flex-col gap-1 text-[11px] text-on-surface-variant">
            <div className="flex justify-between">
              <span>Purifier Power ({PURIFIER_WATTS}W):</span>
              <span className="font-mono text-outline">assumption, not verified</span>
            </div>
            <div className="flex justify-between">
              <span>Grid Electricity Emission ({GRID_KG_CO2_PER_KWH} kg CO₂/kWh):</span>
              <span className="font-mono text-outline">assumption, not verified</span>
            </div>
            <div className="flex justify-between">
              <span>School Run Distance ({SCHOOL_RUN_DISTANCE_KM} km):</span>
              <span className="font-mono text-outline">assumption, no source</span>
            </div>
          </div>
        </div>
      </section>

      {/* 5. Berkeley Earth Cigarette Equivalence */}
      <section className="bg-surface-container-lowest rounded-2xl p-space-md lg:p-space-lg shadow-sm border border-surface-container flex flex-col gap-space-sm">
        <h3 className="font-headline-sm text-[18px] font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-outline text-[22px]">smoking_rooms</span>
          Berkeley Earth Cigarette Equivalence Rule
        </h3>
        <p className="text-[13px] text-on-surface-variant leading-relaxed">
          To provide an intuitive public-health benchmark for acute particulate exposure, SaafDin translates particulate
          reduction into cigarette equivalents based on the epidemiological model published by Berkeley Earth (Richard &amp;
          Elizabeth Muller, 2015):
        </p>

        <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container font-mono text-[13px] text-on-surface flex flex-col gap-1.5">
          <div className="text-secondary font-bold">
            Cigarettes_Avoided = ∑ ( (C_eff_base − C_eff_alt) × Δt ) / ( {CIGARETTE_EQUIVALENT_UG_PER_M3_24H} × 24 )
          </div>
          <div className="text-[12px] text-outline font-normal">
            Where C_eff = C_outdoor × F_env × F_mask. A result ≤ 0 is clamped to 0.
          </div>
        </div>

        <p className="text-[12px] text-on-surface-variant">
          <strong>Rule of thumb:</strong> Breathing an ambient PM2.5 concentration of 22 µg/m³ continuously over 24 hours
          is roughly equivalent in particulate lung deposition to smoking one cigarette.
        </p>
      </section>

      {/* 6. Indoor Combustion Sources */}
      <section className="bg-surface-container-lowest rounded-2xl p-space-md lg:p-space-lg shadow-sm border border-surface-container flex flex-col gap-space-sm">
        <h3 className="font-headline-sm text-[18px] font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-error text-[22px]">local_fire_department</span>
          Indoor Combustion Sources (Unquantified Figures)
        </h3>
        <p className="text-[13px] text-on-surface-variant leading-relaxed">
          Indoor combustion sources — such as chulha biomass, incense/dhoop, mosquito coils, and unvented gas cooking —
          release dense particulate matter directly into living spaces. These internal emissions occur independently of the
          outdoor atmospheric forecast.
        </p>
        <div className="p-3 rounded-xl bg-surface-container-low border border-surface-container text-[12px] text-on-surface-variant flex items-start gap-2.5">
          <span className="material-symbols-outlined text-secondary text-[20px] shrink-0 mt-0.5">verified_user</span>
          <p>
            Because SaafDin does not connect to unverified indoor telemetry or proprietary hardware,{' '}
            <strong className="text-on-surface">we do not invent fake indoor PM2.5 numbers</strong>. For indoor combustion
            swaps and exhaust actions, we present the qualitative health benefit directly in plain language, with figures
            omitted.
          </p>
        </div>
      </section>

      {/* 7. Constants Verification Checklist */}
      <section className="bg-surface-container-lowest rounded-2xl p-space-md lg:p-space-lg shadow-sm border border-surface-container flex flex-col gap-space-sm">
        <h3 className="font-headline-sm text-[18px] font-bold text-on-surface flex items-center gap-2">
          <span className="material-symbols-outlined text-secondary text-[22px]">fact_check</span>
          Complete Constants Verification Checklist
        </h3>
        <p className="text-[13px] text-on-surface-variant">
          Full audit inventory of every numerical parameter used in the impact calculation engine:
        </p>

        <div className="overflow-x-auto rounded-xl border border-surface-container mt-1">
          <table className="w-full text-left border-collapse text-[12px]">
            <thead className="bg-surface-container-high text-on-surface-variant font-semibold">
              <tr>
                <th className="p-2.5">Constant</th>
                <th className="p-2.5">Value</th>
                <th className="p-2.5">Unit</th>
                <th className="p-2.5">Citation / Source</th>
                <th className="p-2.5">Audit Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-container">
              <tr className="hover:bg-surface-container-low">
                <td className="p-2.5 font-mono font-semibold">F_env (outdoors)</td>
                <td className="p-2.5 font-mono">1.0</td>
                <td className="p-2.5 text-on-surface-variant">ratio</td>
                <td className="p-2.5 text-on-surface-variant">Ambient reference definition</td>
                <td className="p-2.5 text-primary font-bold">Verified</td>
              </tr>
              <tr className="hover:bg-surface-container-low">
                <td className="p-2.5 font-mono font-semibold">F_env (indoors_closed)</td>
                <td className="p-2.5 font-mono">0.5</td>
                <td className="p-2.5 text-on-surface-variant">ratio</td>
                <td className="p-2.5 text-on-surface-variant">Residential infiltration studies</td>
                <td className="p-2.5 text-primary font-bold">Verified</td>
              </tr>
              <tr className="hover:bg-surface-container-low">
                <td className="p-2.5 font-mono font-semibold">F_env (indoors_purifier)</td>
                <td className="p-2.5 font-mono">0.2</td>
                <td className="p-2.5 text-on-surface-variant">ratio</td>
                <td className="p-2.5 text-on-surface-variant">Domestic HEPA room filtration studies</td>
                <td className="p-2.5 text-primary font-bold">Verified</td>
              </tr>
              <tr className="hover:bg-surface-container-low">
                <td className="p-2.5 font-mono font-semibold">F_mask (N95 / FFP2)</td>
                <td className="p-2.5 font-mono">0.3</td>
                <td className="p-2.5 text-on-surface-variant">ratio</td>
                <td className="p-2.5 text-on-surface-variant">NIOSH real-world fit factor leakage model</td>
                <td className="p-2.5 text-primary font-bold">Verified</td>
              </tr>
              <tr className="hover:bg-surface-container-low">
                <td className="p-2.5 font-mono font-semibold">Inhalation Rates (IR)</td>
                <td className="p-2.5 font-mono">0.3 – 2.5</td>
                <td className="p-2.5 text-on-surface-variant">m³/h</td>
                <td className="p-2.5 text-on-surface-variant">US EPA Exposure Factors Handbook (2011 Table 6-1)</td>
                <td className="p-2.5 text-primary font-bold">Verified</td>
              </tr>
              <tr className="hover:bg-surface-container-low">
                <td className="p-2.5 font-mono font-semibold">Emission Factors (EF)</td>
                <td className="p-2.5 font-mono">0 – 170</td>
                <td className="p-2.5 text-on-surface-variant">g CO₂/pkm</td>
                <td className="p-2.5 text-on-surface-variant">India GHG Program &amp; ARAI transport baseline</td>
                <td className="p-2.5 text-primary font-bold">Verified</td>
              </tr>
              <tr className="hover:bg-surface-container-low">
                <td className="p-2.5 font-mono font-semibold">Cigarette Equivalence</td>
                <td className="p-2.5 font-mono">{CIGARETTE_EQUIVALENT_UG_PER_M3_24H}</td>
                <td className="p-2.5 text-on-surface-variant">µg/m³ · 24h</td>
                <td className="p-2.5 text-on-surface-variant">Berkeley Earth (Muller &amp; Muller 2015)</td>
                <td className="p-2.5 text-primary font-bold">Verified</td>
              </tr>
              <tr className="hover:bg-surface-container-low">
                <td className="p-2.5 font-mono font-semibold">URBAN_SPEEDS_KMH</td>
                <td className="p-2.5 font-mono">4 – 35</td>
                <td className="p-2.5 text-on-surface-variant">km/h</td>
                <td className="p-2.5 text-on-surface-variant">Internal urban commute approximation</td>
                <td className="p-2.5 text-outline font-semibold">assumption, not verified</td>
              </tr>
              <tr className="hover:bg-surface-container-low">
                <td className="p-2.5 font-mono font-semibold">PURIFIER_WATTS</td>
                <td className="p-2.5 font-mono">{PURIFIER_WATTS}</td>
                <td className="p-2.5 text-on-surface-variant">Watts</td>
                <td className="p-2.5 text-on-surface-variant">Typical domestic HEPA purifier nominal power</td>
                <td className="p-2.5 text-outline font-semibold">assumption, not verified</td>
              </tr>
              <tr className="hover:bg-surface-container-low">
                <td className="p-2.5 font-mono font-semibold">GRID_KG_CO2_PER_KWH</td>
                <td className="p-2.5 font-mono">{GRID_KG_CO2_PER_KWH}</td>
                <td className="p-2.5 text-on-surface-variant">kg CO₂/kWh</td>
                <td className="p-2.5 text-on-surface-variant">Central Electricity Authority baseline database</td>
                <td className="p-2.5 text-outline font-semibold">assumption, not verified</td>
              </tr>
              <tr className="hover:bg-surface-container-low">
                <td className="p-2.5 font-mono font-semibold">SCHOOL_RUN_DISTANCE_KM</td>
                <td className="p-2.5 font-mono">{SCHOOL_RUN_DISTANCE_KM}</td>
                <td className="p-2.5 text-on-surface-variant">km</td>
                <td className="p-2.5 text-on-surface-variant">Default school run estimate</td>
                <td className="p-2.5 text-outline font-semibold">assumption, no source</td>
              </tr>
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
};
