import React from 'react';
import { NavLink, Outlet, useLocation, Navigate } from 'react-router-dom';
import { useProfile } from '../context/ProfileContext';
import { useLanguage } from '../i18n';

export const Shell: React.FC = () => {
  const { profile, hasProfile } = useProfile();
  const { language, setLanguage, t } = useLanguage();
  const location = useLocation();

  // If first-time user has no profile in localStorage or Firestore, route to onboarding
  if (!hasProfile && location.pathname !== '/onboarding') {
    return <Navigate to="/onboarding" replace />;
  }

  // Format today's date
  const todayFormatted = new Intl.DateTimeFormat(language === 'hi' ? 'hi-IN' : 'en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  }).format(new Date());

  const navItems = [
    { path: '/today', label: t.nav.today, icon: 'grid_view', mobileIcon: 'event_available' },
    { path: '/swaps', label: t.nav.swaps, icon: 'swap_horiz', mobileIcon: 'swap_horiz' },
    { path: '/simulator', label: t.nav.simulator, icon: 'tune', mobileIcon: 'tune' },
    { path: '/room-scan', label: t.nav.roomScan, icon: 'document_scanner', mobileIcon: 'document_scanner' },
    { path: '/assistant', label: t.nav.assistant, icon: 'forum', mobileIcon: 'chat_bubble' },
    { path: '/how-we-calculate', label: t.nav.howCalculated, icon: 'calculate', mobileIcon: 'calculate', desktopOnly: true },
    { path: '/onboarding', label: t.nav.profile, icon: 'person', mobileIcon: 'person', desktopOnly: true },
  ];

  const householdInitials = profile.members.length > 0
    ? profile.members[0].name.substring(0, 1) + (profile.members[1]?.name?.substring(0, 1) || 'F')
    : 'SF';

  return (
    <div className="min-h-screen bg-surface font-body-md text-on-surface flex flex-col">
      {/* DESKTOP SIDEBAR (lg and above) */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-[260px] bg-surface-container-lowest shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-50 flex-col justify-between border-r border-surface-container">
        <div className="flex flex-col">
          {/* Logo & Wordmark */}
          <div className="p-space-lg flex items-center gap-space-sm">
            <div className="flex flex-col">
              <span className="font-headline-xl text-headline-md font-bold text-primary tracking-tight">
                {t.appName}
              </span>
              <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider font-semibold">
                {t.appSubtitle}
              </span>
            </div>
          </div>

          {/* Location / Live status indicator */}
          <div className="px-space-md mb-space-md">
            <NavLink
              to="/onboarding"
              className="bg-surface-container-low rounded-xl p-space-sm flex items-center justify-between shadow-[0_1px_3px_0_rgba(15,23,42,0.03)] hover:bg-surface-container transition-colors group"
            >
              <div className="flex items-center gap-space-xs overflow-hidden">
                <span className="w-2 h-2 rounded-full bg-error animate-pulse shrink-0"></span>
                <div className="flex flex-col truncate">
                  <span className="font-label-sm text-label-sm text-on-surface truncate font-semibold">
                    {profile.location.name}
                  </span>
                  <span className="font-body-sm text-[11px] text-error font-semibold leading-tight">
                    {t.banner.usAqi} Monitored
                  </span>
                </div>
              </div>
              <span className="material-symbols-outlined text-outline text-[18px] group-hover:text-primary transition-colors">
                near_me
              </span>
            </NavLink>
          </div>

          {/* Navigation Links */}
          <nav className="flex flex-col gap-space-xs px-space-md">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-space-sm px-space-md py-space-sm rounded-xl font-label-md text-label-md transition-all ${
                    isActive
                      ? 'bg-primary text-on-primary font-semibold shadow-sm'
                      : 'text-on-surface-variant hover:bg-surface-container-high hover:text-on-surface'
                  }`
                }
              >
                <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* User / Household footer */}
        <div className="p-space-md flex flex-col gap-space-xs">
          <NavLink
            to="/onboarding"
            className="bg-surface-container rounded-xl p-space-sm flex items-center justify-between cursor-pointer hover:bg-surface-container-high transition-colors"
          >
            <div className="flex items-center gap-space-sm overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center shrink-0 font-bold text-label-sm">
                {householdInitials}
              </div>
              <div className="flex flex-col truncate">
                <span className="font-label-md text-label-md text-on-surface truncate font-semibold">
                  {profile.members[0]?.name ? `${profile.members[0].name}'s Household` : 'Sharma Family'}
                </span>
                <span className="font-body-sm text-[11px] text-on-surface-variant truncate">
                  {profile.members.length} {t.today.family.toLowerCase()}
                </span>
              </div>
            </div>
            <span className="material-symbols-outlined text-outline text-[18px]">unfold_more</span>
          </NavLink>
        </div>
      </aside>

      {/* TOP HEADER */}
      {/* Desktop Header */}
      <header className="hidden lg:flex fixed top-0 left-[260px] right-0 h-16 bg-surface/85 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] z-40 items-center justify-between px-space-lg border-b border-surface-container">
        <div className="flex items-center gap-space-md">
          <div className="flex items-center gap-space-xs text-on-surface-variant">
            <span className="material-symbols-outlined text-[18px] text-secondary">calendar_today</span>
            <span className="font-label-md text-label-md text-on-surface font-semibold">{todayFormatted}</span>
            <span className="text-outline-variant font-label-md">·</span>
            <span className="font-label-md text-label-md text-on-surface-variant">
              {t.banner.forecastSource} · updated live
            </span>
          </div>
        </div>

        <div className="flex items-center gap-space-md">
          {/* Language Toggle */}
          <div className="flex items-center bg-surface-container-low rounded-full p-0.5 border border-surface-container text-[12px] font-bold">
            <button
              type="button"
              onClick={() => setLanguage('en')}
              className={`px-2.5 py-1 rounded-full transition-colors ${
                language === 'en' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              EN
            </button>
            <button
              type="button"
              onClick={() => setLanguage('hi')}
              className={`px-2.5 py-1 rounded-full transition-colors ${
                language === 'hi' ? 'bg-primary text-on-primary shadow-xs' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              हिं
            </button>
          </div>

          {/* Disclaimer badge */}
          <div className="hidden xl:flex items-center gap-1.5 px-3 py-1 rounded-full bg-surface-container-low text-on-surface-variant text-[11px]">
            <span className="material-symbols-outlined text-[14px] text-outline">info</span>
            <span>{t.disclaimer}</span>
          </div>

          <NavLink
            to="/onboarding"
            aria-label="Household Profile"
            className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-label-sm shadow-sm hover:opacity-90 transition-opacity"
          >
            {householdInitials}
          </NavLink>
        </div>
      </header>

      {/* Mobile Top Header */}
      <header className="lg:hidden fixed top-0 w-full z-40 bg-surface/90 backdrop-blur-xl shadow-[0_1px_8px_rgba(0,0,0,0.04)] border-b border-surface-container">
        <div className="h-16 px-4 flex items-center justify-between">
          <NavLink to="/today" className="flex items-center gap-2">
            <span className="font-headline-sm text-headline-sm font-bold text-primary tracking-tight">
              {t.appName}
            </span>
          </NavLink>

          <div className="flex items-center gap-2">
            {/* Mobile Language Toggle */}
            <div className="flex items-center bg-surface-container-low rounded-full p-0.5 border border-surface-container text-[11px] font-bold">
              <button
                type="button"
                onClick={() => setLanguage('en')}
                className={`px-2 py-0.5 rounded-full transition-colors ${
                  language === 'en' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
                }`}
              >
                EN
              </button>
              <button
                type="button"
                onClick={() => setLanguage('hi')}
                className={`px-2 py-0.5 rounded-full transition-colors ${
                  language === 'hi' ? 'bg-primary text-on-primary' : 'text-on-surface-variant'
                }`}
              >
                हिं
              </button>
            </div>

            <NavLink
              to="/onboarding"
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-surface-container-low text-on-surface text-label-sm border border-surface-container"
            >
              <span className="material-symbols-outlined text-[14px] text-secondary">near_me</span>
              <span className="truncate max-w-[90px] font-semibold">{profile.location.name}</span>
            </NavLink>

            <NavLink
              to="/onboarding"
              aria-label="Profile"
              className="w-8 h-8 rounded-full bg-primary text-on-primary flex items-center justify-center font-bold text-label-sm"
            >
              {householdInitials}
            </NavLink>
          </div>
        </div>
      </header>

      {/* MAIN CONTENT AREA */}
      <main className="flex-1 lg:pl-[260px] pt-20 lg:pt-20 pb-24 lg:pb-12 px-4 lg:px-space-lg w-full relative">
        {/* Ambient atmospheric depth lighting */}
        <div className="pointer-events-none absolute -top-32 right-12 w-96 h-96 rounded-full bg-error/5 blur-3xl -z-10"></div>
        <div className="pointer-events-none absolute top-16 left-1/3 w-80 h-80 rounded-full bg-secondary-container/10 blur-3xl -z-10"></div>

        <div className="max-w-7xl mx-auto w-full">
          <Outlet />
        </div>
      </main>

      {/* MOBILE BOTTOM NAVIGATION BAR */}
      <nav className="lg:hidden fixed bottom-0 w-full z-50 pb-[env(safe-area-inset-bottom,0px)] bg-surface/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.05)] border-t border-surface-container">
        <div className="flex justify-around items-center h-16 px-1">
          {navItems
            .filter((item) => !item.desktopOnly)
            .map((item) => {
              const isActive = location.pathname === item.path;
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
                  className={`flex flex-col items-center justify-center min-w-[56px] min-h-[44px] transition-colors ${
                    isActive
                      ? 'text-primary font-bold'
                      : 'text-on-surface-variant hover:text-on-surface font-medium'
                  }`}
                >
                  <span
                    className={`material-symbols-outlined text-[22px] mb-0.5 ${
                      isActive ? 'text-primary' : 'text-outline'
                    }`}
                  >
                    {item.mobileIcon}
                  </span>
                  <span className="text-[11px] leading-tight">
                    {item.label}
                  </span>
                </NavLink>
              );
            })}
        </div>
      </nav>
    </div>
  );
};
