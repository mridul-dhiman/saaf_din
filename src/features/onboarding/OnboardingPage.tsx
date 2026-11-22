import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProfile } from '../../context/ProfileContext';
import { currentForecastProvider, Place } from '../../services/forecast';
import { Member, AgeGroup, Sensitivity, TravelMode, CookingFuel, Profile } from '../../types';
import { DEMO_PROFILE } from '../../types/demoProfile';
import { saveProfileToFirestore } from '../../services/firebase';
import { getAqiBand } from '../../lib/aqi';

export const OnboardingPage: React.FC = () => {
  const navigate = useNavigate();
  const { profile, setProfile } = useProfile();

  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [locationName, setLocationName] = useState(profile.location.name);
  const [lat, setLat] = useState(profile.location.lat);
  const [lon, setLon] = useState(profile.location.lon);
  const [searchResults, setSearchResults] = useState<Place[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [previewAqi, setPreviewAqi] = useState<number | null>(null);

  const [members, setMembers] = useState<Member[]>(profile.members);
  const [commuteMode, setCommuteMode] = useState<TravelMode>(profile.commute.mode);
  const [commuteDistance, setCommuteDistance] = useState<number>(profile.commute.distanceKm);
  const [departs, setDeparts] = useState(profile.commute.departs);
  const [returns, setReturns] = useState(profile.commute.returns);
  const [cookingFuel, setCookingFuel] = useState<CookingFuel>(profile.cookingFuel);
  const [hasExhaust, setHasExhaust] = useState(profile.hasExhaust);
  const [hasPurifier, setHasPurifier] = useState(profile.hasPurifier);

  // Member editing modal/inline state
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberAgeGroup, setNewMemberAgeGroup] = useState<AgeGroup>('adult');
  const [newMemberSensitivities, setNewMemberSensitivities] = useState<Sensitivity[]>([]);

  // Fetch AQI preview for selected location
  useEffect(() => {
    let active = true;
    currentForecastProvider.getHourly(lat, lon)
      .then((f) => {
        if (active && f.points.length > 0) {
          setPreviewAqi(f.points[0].us_aqi);
        }
      })
      .catch((e) => console.warn('Preview AQI fetch failed:', e));
    return () => {
      active = false;
    };
  }, [lat, lon]);

  // City Search Handler
  const handleSearch = async (val: string) => {
    setLocationName(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const places = await currentForecastProvider.searchPlaces(val);
      setSearchResults(places);
    } catch (e) {
      console.warn(e);
    } finally {
      setIsSearching(false);
    }
  };

  const selectPlace = (place: Place) => {
    const fullName = `${place.name}${place.admin1 ? `, ${place.admin1}` : ''}`;
    setLocationName(fullName);
    setLat(place.latitude);
    setLon(place.longitude);
    setSearchResults([]);
  };

  // Quick City Presets
  const quickCities = [
    { name: 'Delhi NCR', lat: 28.61, lon: 77.23 },
    { name: 'Mumbai', lat: 19.07, lon: 72.87 },
    { name: 'Bengaluru', lat: 12.97, lon: 77.59 },
    { name: 'Kolkata', lat: 22.57, lon: 88.36 },
    { name: 'Lucknow', lat: 26.84, lon: 80.94 },
    { name: 'Patna', lat: 25.59, lon: 85.13 },
  ];

  // Geolocation Handler
  const handleUseCurrentLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setLat(pos.coords.latitude);
        setLon(pos.coords.longitude);
        setLocationName(`Current Location (${pos.coords.latitude.toFixed(2)}, ${pos.coords.longitude.toFixed(2)})`);
      },
      (err) => {
        console.warn('Geolocation error:', err);
        alert('Could not determine location. Please search manually.');
      }
    );
  };

  // Demo Household Loader
  const handleLoadDemo = () => {
    setLocationName(DEMO_PROFILE.location.name);
    setLat(DEMO_PROFILE.location.lat);
    setLon(DEMO_PROFILE.location.lon);
    setMembers(DEMO_PROFILE.members);
    setCommuteMode(DEMO_PROFILE.commute.mode);
    setCommuteDistance(DEMO_PROFILE.commute.distanceKm);
    setDeparts(DEMO_PROFILE.commute.departs);
    setReturns(DEMO_PROFILE.commute.returns);
    setCookingFuel(DEMO_PROFILE.cookingFuel);
    setHasExhaust(DEMO_PROFILE.hasExhaust);
    setHasPurifier(DEMO_PROFILE.hasPurifier);
  };

  // Add Member
  const handleAddMember = () => {
    if (!newMemberName.trim()) return;
    const newMember: Member = {
      id: `m_${Date.now()}`,
      name: newMemberName.trim(),
      ageGroup: newMemberAgeGroup,
      sensitivities: newMemberSensitivities,
    };
    setMembers([...members, newMember]);
    setNewMemberName('');
    setNewMemberAgeGroup('adult');
    setNewMemberSensitivities([]);
  };

  const handleRemoveMember = (id: string) => {
    if (members.length <= 1) {
      alert('At least one household member is required.');
      return;
    }
    setMembers(members.filter((m) => m.id !== id));
  };

  const toggleSensitivity = (s: Sensitivity) => {
    if (newMemberSensitivities.includes(s)) {
      setNewMemberSensitivities(newMemberSensitivities.filter((x) => x !== s));
    } else {
      setNewMemberSensitivities([...newMemberSensitivities, s]);
    }
  };

  // Save Complete Profile
  const handleSaveProfile = async () => {
    const updatedProfile: Profile = {
      location: {
        name: locationName,
        lat,
        lon,
      },
      members,
      commute: {
        mode: commuteMode,
        distanceKm: commuteDistance,
        departs,
        returns,
      },
      cookingFuel,
      hasExhaust,
      hasPurifier,
      language: profile.language || 'en',
    };

    setProfile(updatedProfile);
    await saveProfileToFirestore(updatedProfile);
    navigate('/today');
  };

  const previewBand = previewAqi !== null ? getAqiBand(previewAqi) : null;

  return (
    <div className="flex flex-col gap-space-lg max-w-3xl mx-auto w-full pb-12">
      {/* Top Header Card */}
      <div className="bg-surface-container-lowest rounded-2xl p-space-md lg:p-space-lg shadow-sm border border-surface-container flex flex-col gap-space-sm">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div className="flex items-center gap-space-sm">
            <div className="w-10 h-10 rounded-xl bg-primary text-on-primary flex items-center justify-center font-bold">
              <span className="material-symbols-outlined text-[24px]">home</span>
            </div>
            <div className="flex flex-col">
              <h1 className="font-headline-md text-headline-sm lg:text-headline-md text-on-surface font-bold">
                Household Air Profile
              </h1>
              <span className="font-body-sm text-body-sm text-on-surface-variant">
                Personalized exposure screening and daily routines
              </span>
            </div>
          </div>

          <button
            onClick={handleLoadDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-secondary-container/20 text-on-secondary-container hover:bg-secondary-container/30 transition-colors font-label-md text-label-md font-semibold"
          >
            <span className="material-symbols-outlined text-[16px] text-secondary">magic_button</span>
            <span>Try a demo household</span>
          </button>
        </div>

        {/* Step Indicator Progress Bar */}
        <div className="flex items-center justify-between gap-2 mt-4 pt-3 border-t border-surface-container">
          <button
            onClick={() => setStep(1)}
            className={`flex-1 flex items-center gap-2 pb-1 border-b-2 transition-all ${
              step === 1 ? 'border-primary text-primary font-bold' : 'border-surface-container text-outline'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-surface-container flex items-center justify-center text-[11px]">1</span>
            <span className="font-label-sm text-label-sm">Location</span>
          </button>
          <button
            onClick={() => setStep(2)}
            className={`flex-1 flex items-center gap-2 pb-1 border-b-2 transition-all ${
              step === 2 ? 'border-primary text-primary font-bold' : 'border-surface-container text-outline'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-surface-container flex items-center justify-center text-[11px]">2</span>
            <span className="font-label-sm text-label-sm">Family</span>
          </button>
          <button
            onClick={() => setStep(3)}
            className={`flex-1 flex items-center gap-2 pb-1 border-b-2 transition-all ${
              step === 3 ? 'border-primary text-primary font-bold' : 'border-surface-container text-outline'
            }`}
          >
            <span className="w-5 h-5 rounded-full bg-surface-container flex items-center justify-center text-[11px]">3</span>
            <span className="font-label-sm text-label-sm">Habits</span>
          </button>
        </div>
      </div>

      {/* STEP 1: LOCATION */}
      {step === 1 && (
        <div className="bg-surface-container-lowest rounded-2xl p-space-md lg:p-space-lg shadow-sm border border-surface-container flex flex-col gap-space-lg">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Step 1: Your Neighborhood
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              We fetch hourly modelled air quality (CAMS/Open-Meteo) for your area.
            </p>
          </div>

          {/* Search Input & GPS button */}
          <div className="flex flex-col gap-2 relative">
            <div className="relative flex items-center">
              <span className="material-symbols-outlined absolute left-3.5 text-outline text-[20px] pointer-events-none">
                search
              </span>
              <input
                type="text"
                value={locationName}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="Search city, sector, or landmark (e.g. South Extension, New Delhi)"
                className="w-full pl-11 pr-24 py-3 rounded-xl bg-surface-container-low border border-surface-container text-on-surface font-body-md text-body-md focus:outline-none focus:ring-2 focus:ring-primary/20"
              />
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                className="absolute right-2 px-2.5 py-1.5 rounded-lg bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors text-label-sm font-semibold flex items-center gap-1"
                title="Use my current GPS location"
              >
                <span className="material-symbols-outlined text-[16px] text-primary">my_location</span>
                <span>GPS</span>
              </button>
            </div>

            {/* Autocomplete Dropdown */}
            {searchResults.length > 0 && (
              <div className="absolute top-14 left-0 right-0 z-30 bg-surface-container-lowest rounded-xl shadow-lg border border-surface-container p-1 max-h-60 overflow-y-auto">
                {searchResults.map((place) => (
                  <button
                    key={`${place.id}-${place.latitude}`}
                    type="button"
                    onClick={() => selectPlace(place)}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-surface-container text-on-surface font-body-sm text-body-sm flex items-center justify-between"
                  >
                    <span className="font-semibold">{place.name}</span>
                    <span className="text-outline text-[12px]">
                      {place.admin1 ? `${place.admin1}, ` : ''}{place.country || ''}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {isSearching && (
              <span className="text-[11px] text-outline px-1">Searching geocoding database…</span>
            )}
          </div>

          {/* Quick City Chips */}
          <div className="flex flex-col gap-1.5">
            <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
              Popular Urban Centers:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
              {quickCities.map((city) => (
                <button
                  key={city.name}
                  type="button"
                  onClick={() => {
                    setLocationName(city.name);
                    setLat(city.lat);
                    setLon(city.lon);
                  }}
                  className={`shrink-0 px-3 py-1.5 rounded-full font-label-md text-label-md transition-colors ${
                    locationName.includes(city.name)
                      ? 'bg-primary text-on-primary font-bold shadow-sm'
                      : 'bg-surface-container-low text-on-surface hover:bg-surface-container'
                  }`}
                >
                  {city.name}
                </button>
              ))}
            </div>
          </div>

          {/* Atmospheric Snapshot Preview Card */}
          <div className="rounded-xl bg-surface-container-low p-space-md flex items-center justify-between border border-surface-container">
            <div className="flex items-center gap-space-sm">
              <div className="w-10 h-10 rounded-xl bg-surface-container flex items-center justify-center text-primary">
                <span className="material-symbols-outlined text-[22px]">location_on</span>
              </div>
              <div className="flex flex-col">
                <span className="font-headline-sm text-[16px] text-on-surface font-bold">
                  {locationName}
                </span>
                <span className="font-body-sm text-[12px] text-on-surface-variant">
                  Lat: {lat.toFixed(2)}, Lon: {lon.toFixed(2)} · Open-Meteo Grid (10 km)
                </span>
              </div>
            </div>

            {previewAqi !== null && previewBand && (
              <div className="flex flex-col items-end text-right">
                <div className="flex items-baseline gap-1">
                  <span className="font-headline-sm text-headline-sm text-error font-extrabold">
                    {previewAqi}
                  </span>
                  <span className="font-label-sm text-label-sm text-on-surface-variant font-semibold">
                    US AQI
                  </span>
                </div>
                <span className="font-label-sm text-[11px] font-bold text-error">
                  {previewBand.shortLabel}
                </span>
              </div>
            )}
          </div>

          {/* Navigation Button */}
          <div className="flex justify-end pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold flex items-center gap-2 hover:bg-primary-container transition-colors shadow-sm"
            >
              <span>Continue to Family</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 2: FAMILY MEMBERS */}
      {step === 2 && (
        <div className="bg-surface-container-lowest rounded-2xl p-space-md lg:p-space-lg shadow-sm border border-surface-container flex flex-col gap-space-lg">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Step 2: Household Members
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Actions and exposure calculations are customized based on age and declared respiratory sensitivity.
            </p>
          </div>

          {/* Current Members List */}
          <div className="flex flex-col gap-space-sm">
            {members.map((member) => (
              <div
                key={member.id}
                className="p-space-sm rounded-xl bg-surface-container-low flex items-center justify-between border border-surface-container/60"
              >
                <div className="flex items-center gap-space-sm">
                  <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-label-md">
                    {member.name.charAt(0)}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center gap-2">
                      <span className="font-label-md text-label-md text-on-surface font-bold">
                        {member.name}
                      </span>
                      <span className="text-[11px] text-outline capitalize bg-surface-container px-2 py-0.5 rounded-full font-semibold">
                        {member.ageGroup}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 mt-0.5">
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
                </div>

                <button
                  type="button"
                  onClick={() => handleRemoveMember(member.id)}
                  aria-label={`Remove ${member.name}`}
                  className="w-8 h-8 rounded-full flex items-center justify-center text-outline hover:text-error hover:bg-error-container/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">delete</span>
                </button>
              </div>
            ))}
          </div>

          {/* Add New Member Box */}
          <div className="p-space-md rounded-xl bg-surface-container-low border border-surface-container flex flex-col gap-space-sm">
            <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-bold">
              Add Member
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <input
                type="text"
                placeholder="Name (e.g. Aarav)"
                value={newMemberName}
                onChange={(e) => setNewMemberName(e.target.value)}
                className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-on-surface text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
              />
              <select
                value={newMemberAgeGroup}
                onChange={(e) => setNewMemberAgeGroup(e.target.value as AgeGroup)}
                className="px-3 py-2 rounded-xl bg-surface-container-lowest border border-surface-container text-on-surface text-body-sm focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="child">Child (6–11)</option>
                <option value="adult">Adult</option>
                <option value="elderly">Elderly (60+)</option>
              </select>
            </div>

            {/* Sensitivity chips */}
            <div className="flex flex-col gap-1 mt-1">
              <span className="text-[11px] text-outline">Sensitivity Tags:</span>
              <div className="flex flex-wrap gap-1.5">
                {(['child', 'elderly', 'asthma', 'pregnant'] as Sensitivity[]).map((tag) => {
                  const active = newMemberSensitivities.includes(tag);
                  return (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => toggleSensitivity(tag)}
                      className={`px-2.5 py-1 rounded-full text-label-sm font-semibold capitalize transition-colors ${
                        active
                          ? 'bg-primary text-on-primary'
                          : 'bg-surface-container text-on-surface-variant hover:bg-surface-container-high'
                      }`}
                    >
                      {tag}
                    </button>
                  );
                })}
              </div>
            </div>

            <button
              type="button"
              onClick={handleAddMember}
              disabled={!newMemberName.trim()}
              className="mt-1 self-start px-4 py-2 rounded-xl bg-surface-container text-primary font-label-md text-label-md font-bold hover:bg-surface-container-high transition-colors disabled:opacity-50"
            >
              + Add Member
            </button>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="px-4 py-2 rounded-xl border border-surface-container text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={() => setStep(3)}
              className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-semibold flex items-center gap-2 hover:bg-primary-container transition-colors shadow-sm"
            >
              <span>Continue to Habits</span>
              <span className="material-symbols-outlined text-[18px]">arrow_forward</span>
            </button>
          </div>
        </div>
      )}

      {/* STEP 3: DAILY HABITS */}
      {step === 3 && (
        <div className="bg-surface-container-lowest rounded-2xl p-space-md lg:p-space-lg shadow-sm border border-surface-container flex flex-col gap-space-lg">
          <div>
            <h2 className="font-headline-sm text-headline-sm text-on-surface font-semibold">
              Step 3: Commute & Indoor Baseline
            </h2>
            <p className="font-body-sm text-body-sm text-on-surface-variant">
              Powers travel emission receipts and indoor infiltration assumptions.
            </p>
          </div>

          {/* Commute Section */}
          <div className="flex flex-col gap-space-sm border-b border-surface-container pb-space-md">
            <span className="font-label-md text-label-md text-primary font-bold uppercase tracking-wider">
              Primary Work / School Commute
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
              <div className="flex flex-col gap-1">
                <label className="text-[12px] text-on-surface-variant font-medium">Commute Mode</label>
                <select
                  value={commuteMode}
                  onChange={(e) => setCommuteMode(e.target.value as TravelMode)}
                  className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm"
                >
                  <option value="car_petrol">Car (Petrol)</option>
                  <option value="car_diesel">Car (Diesel)</option>
                  <option value="car_cng">Car (CNG)</option>
                  <option value="car_ev">Car (EV)</option>
                  <option value="auto_cng">Auto-rickshaw (CNG)</option>
                  <option value="two_wheeler">Two-Wheeler (Motorcycle/Scooter)</option>
                  <option value="metro">Metro Rail</option>
                  <option value="bus">City Bus</option>
                  <option value="cycle">Bicycle</option>
                  <option value="walk">Walking</option>
                </select>
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] text-on-surface-variant font-medium">One-Way Distance (km)</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={commuteDistance}
                  onChange={(e) => setCommuteDistance(Number(e.target.value))}
                  className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] text-on-surface-variant font-medium">Morning Departure</label>
                <input
                  type="time"
                  value={departs}
                  onChange={(e) => setDeparts(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-[12px] text-on-surface-variant font-medium">Evening Return</label>
                <input
                  type="time"
                  value={returns}
                  onChange={(e) => setReturns(e.target.value)}
                  className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm"
                />
              </div>
            </div>
          </div>

          {/* Kitchen & Air Cleaning Setup */}
          <div className="flex flex-col gap-space-sm">
            <span className="font-label-md text-label-md text-primary font-bold uppercase tracking-wider">
              Indoor Air & Kitchen Appliances
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-space-sm">
              <div className="flex flex-col gap-1 sm:col-span-2">
                <label className="text-[12px] text-on-surface-variant font-medium">Primary Cooking Fuel</label>
                <select
                  value={cookingFuel}
                  onChange={(e) => setCookingFuel(e.target.value as CookingFuel)}
                  className="px-3 py-2 rounded-xl bg-surface-container-low border border-surface-container text-on-surface text-body-sm"
                >
                  <option value="lpg">LPG Cylinder Gas</option>
                  <option value="png">Piped Natural Gas (PNG)</option>
                  <option value="induction">Electric Induction Cooktop</option>
                  <option value="biomass">Biomass / Traditional Fuel</option>
                </select>
              </div>

              {/* Exhaust Fan Toggle */}
              <label className="p-space-sm rounded-xl bg-surface-container-low border border-surface-container flex items-center justify-between cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface font-bold">Kitchen Exhaust Fan</span>
                  <span className="text-[11px] text-on-surface-variant">Functional vent or chimney installed</span>
                </div>
                <input
                  type="checkbox"
                  checked={hasExhaust}
                  onChange={(e) => setHasExhaust(e.target.checked)}
                  className="w-5 h-5 rounded text-primary accent-primary cursor-pointer"
                />
              </label>

              {/* Purifier Toggle */}
              <label className="p-space-sm rounded-xl bg-surface-container-low border border-surface-container flex items-center justify-between cursor-pointer">
                <div className="flex flex-col">
                  <span className="font-label-md text-label-md text-on-surface font-bold">HEPA Air Purifier</span>
                  <span className="text-[11px] text-on-surface-variant">Available in primary living area</span>
                </div>
                <input
                  type="checkbox"
                  checked={hasPurifier}
                  onChange={(e) => setHasPurifier(e.target.checked)}
                  className="w-5 h-5 rounded text-primary accent-primary cursor-pointer"
                />
              </label>
            </div>
          </div>

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between pt-2">
            <button
              type="button"
              onClick={() => setStep(2)}
              className="px-4 py-2 rounded-xl border border-surface-container text-on-surface font-label-md text-label-md font-semibold hover:bg-surface-container transition-colors"
            >
              Back
            </button>
            <button
              type="button"
              onClick={handleSaveProfile}
              className="px-6 py-2.5 rounded-xl bg-primary text-on-primary font-label-md text-label-md font-bold flex items-center gap-2 hover:bg-primary-container transition-colors shadow-sm"
            >
              <span>Save &amp; View Daily Plan</span>
              <span className="material-symbols-outlined text-[18px]">check_circle</span>
            </button>
          </div>
        </div>
      )}

      {/* Privacy and Medical Disclaimer footer */}
      <div className="flex items-center gap-2 text-outline text-[12px] px-2">
        <span className="material-symbols-outlined text-[16px]">verified_user</span>
        <span>
          Profile is stored in your private Firebase document and cached in your browser. SaafDin provides screening guidance and does not replace medical advice.
        </span>
      </div>
    </div>
  );
};
