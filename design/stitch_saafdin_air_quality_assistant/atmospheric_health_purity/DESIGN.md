---
name: Atmospheric Health & Purity
colors:
  surface: '#faf8ff'
  surface-dim: '#d2d9f4'
  surface-bright: '#faf8ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f3ff'
  surface-container: '#eaedff'
  surface-container-high: '#e2e7ff'
  surface-container-highest: '#dae2fd'
  on-surface: '#131b2e'
  on-surface-variant: '#3f4947'
  inverse-surface: '#283044'
  inverse-on-surface: '#eef0ff'
  outline: '#6f7978'
  outline-variant: '#bec9c7'
  surface-tint: '#216964'
  primary: '#004340'
  on-primary: '#ffffff'
  primary-container: '#0d5c58'
  on-primary-container: '#8ed2cc'
  inverse-primary: '#8fd3cd'
  secondary: '#006b5f'
  on-secondary: '#ffffff'
  secondary-container: '#6df5e1'
  on-secondary-container: '#006f64'
  tertiary: '#313e3c'
  on-tertiary: '#ffffff'
  tertiary-container: '#485553'
  on-tertiary-container: '#bbc9c6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#abefe9'
  primary-fixed-dim: '#8fd3cd'
  on-primary-fixed: '#00201e'
  on-primary-fixed-variant: '#00504c'
  secondary-fixed: '#71f8e4'
  secondary-fixed-dim: '#4fdbc8'
  on-secondary-fixed: '#00201c'
  on-secondary-fixed-variant: '#005048'
  tertiary-fixed: '#d7e5e2'
  tertiary-fixed-dim: '#bcc9c7'
  on-tertiary-fixed: '#121e1c'
  on-tertiary-fixed-variant: '#3d4947'
  background: '#faf8ff'
  on-background: '#131b2e'
  surface-variant: '#dae2fd'
typography:
  display-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 56px
    fontWeight: '700'
    lineHeight: 64px
    letterSpacing: -0.03em
  display-lg-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 40px
    fontWeight: '700'
    lineHeight: 48px
    letterSpacing: -0.02em
  headline-xl:
    fontFamily: Plus Jakarta Sans
    fontSize: 36px
    fontWeight: '600'
    lineHeight: 44px
    letterSpacing: -0.02em
  headline-xl-mobile:
    fontFamily: Plus Jakarta Sans
    fontSize: 28px
    fontWeight: '600'
    lineHeight: 36px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 15px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
  label-lg:
    fontFamily: Plus Jakarta Sans
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-md:
    fontFamily: Plus Jakarta Sans
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: Plus Jakarta Sans
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 14px
    letterSpacing: 0.04em
rounded:
  sm: 0.25rem
  DEFAULT: 0.5rem
  md: 0.75rem
  lg: 1rem
  xl: 1.5rem
  full: 9999px
spacing:
  gutter: 1.5rem
  gutter-mobile: 1rem
  margin: 2rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 1rem
  space-lg: 1.5rem
  space-xl: 2.5rem
---

## Brand & Style

This design system establishes a clinical yet serene sanctuary for families navigating high-pollution urban centers. The brand balances urgent environmental awareness with an aura of restorative calm, avoiding anxiety-inducing visual alarms in favor of clear, actionable, and protective intelligence. 

The aesthetic marries **Refined Contemporary Minimalism** with subtle **Tactile Tonal Depth**. Visual priority is granted to breathing room, clean structural divisions, crisp editorial typographic hierarchies, and soft, air-like layering. Rather than overwhelming users with hazardous metrics, the UI frames air quality through family health, preventive routines, and domestic wellness.

## Colors

The core palette reflects purity, ventilation, and clinical authority:
- **Primary Deep Teal (`#0D5C58` / `#0F766E`)**: Grounded, authoritative, and evocative of deep oxygenation and medical trust. Used for primary interactive actions, key active navigation states, and focal metrics.
- **Secondary Mint/Sage (`#14B8A6`) & Tint (`#E6F4F1`)**: Symbolizes revitalization, indoor filtration, and calm. Applied to secondary interactions, metric progress fills, and subtle focus halos.
- **Canvas & Neutral Slate (`#F8FAFC`, `#F1F5F9` background; `#0F172A`, `#334155`, `#64748B` type)**: Creates a light, breathable, mist-free digital environment where data pops without visual fatigue.

### Environmental Indicator Scale
The AQI spectrum is isolated strictly to air telemetry indicators, status badges, and map overlays. It must never bleed into structural chrome or primary interface components:
- **Good (0–50)**: `#16A34A` (Fresh Green)
- **Moderate (51–100)**: `#EAB308` (Sunlit Amber)
- **Unhealthy for Sensitive Groups (101–150)**: `#F97316` (Cautious Orange)
- **Unhealthy (151–200)**: `#EF4444` (Vibrant Warning Red)
- **Very Unhealthy & Severe (201–300+)**: `#881337` to `#6B21A8` (Deep Maroon to Violet Hazard)

## Typography

The typographic hierarchy pairs **Plus Jakarta Sans** for expressive, humanistic numerical readouts, titles, and metrics with **Inter** for dense sensor telemetry and diagnostic health guidance.

- **Numerics & Readings**: AQI numbers leverage tabular figures in Plus Jakarta Sans Bold to avoid layout shifting during live sensor updates.
- **Hierarchy of Guidance**: Body text remains anchored in `#334155` for high-clarity readability without the harsh contrast of pitch black, while secondary metadata rests in `#64748B`.
- **Labels & Micro-data**: All sensory abbreviations (PM2.5, PM10, AQI, CO2) utilize `label-md` or `label-sm` with subtle positive letter spacing for instant recognition.

## Layout & Spacing

The layout is built around a structured **12-column fluid grid** for desktop and tablet displays, collapsing to a **4-column responsive layout** on mobile devices.

- **Generous Canvas Margins**: Desktop layouts use `margin: 2rem` with a constrained maximum central canvas of `1280px` to maintain focused readability. Mobile surfaces use `margin-mobile: 1rem`.
- **Rhythmic Stacking**: Card interiors conform strictly to internal padding using `space-lg` (24px) for prominent dashboards and `space-md` (16px) for compact modular widgets.
- **Widget Density**: Data points, pollutant gauges, and member cards are separated by uniform gutters (`space-md` on mobile, `space-lg` on desktop) ensuring data clusters never feel suffocated.

## Elevation & Depth

Visual separation relies on delicate ambient light, pure white card surfaces, and ultra-low-opacity depth rather than sharp dividers or heavy shadows:

- **Surface Baseline (`#F8FAFC` to `#F1F5F9`)**: The ambient background provides an airy, matte canvas.
- **Card Surfaces (`#FFFFFF`)**: Pure white containers lift above the cool canvas through an ultra-soft dual shadow:
  - `box-shadow: 0 1px 3px 0 rgba(15, 23, 42, 0.03), 0 10px 25px -5px rgba(15, 23, 42, 0.05);`
  - Subtle perimeter containment: `1px solid rgba(226, 232, 240, 0.6)`.
- **Elevated Modals & Floating Shelves**: Active flyouts and sensor selector drawers utilize a higher dispersal shadow with a whisper of teal tint:
  - `box-shadow: 0 20px 35px -10px rgba(13, 92, 88, 0.08), 0 1px 3px 0 rgba(15, 23, 42, 0.04);`
- **Tonal Insets**: Sensor historical sparklines and sub-metric groups sit recessed on subtle `rgba(241, 245, 249, 0.7)` rounded backdrops.

## Shapes

The interface embraces a gentle, organic architectural language emphasizing rounded softness without feeling infantile:

- **Cards & Primary Modules**: Utilize `rounded-2xl` (1rem / 16px to 1.5rem / 24px) corners, evoking modern, smooth home-air purifier consumer tech.
- **Micro-pills & Badges**: Fully pill-shaped (`border-radius: 9999px`) for AQI status, filter life levels, and family member status tags.
- **Interactive Buttons & Input Controls**: Standardized to `0.75rem` (12px) curvature to maintain structural composure adjacent to softer cards.

## Components

### Metric Badges & Status Micro-Pills
- Pill-shaped status indicators with a 10% opacity background of the corresponding AQI metric color and a solid text fill (e.g., Unhealthy uses `#EF4444` text on `rgba(239, 68, 68, 0.1)` background).
- Accompanied by a 6px circular pulse dot indicating live transmission status.

### Primary & Secondary Buttons
- **Primary**: Solid Deep Teal (`#0D5C58`) fill, `#FFFFFF` text, subtle hover lift with darkening to `#0B4A47`.
- **Secondary / Actionable**: Soft Mint wash (`#E6F4F1`) with primary teal text (`#0D5C58`), transitioning on hover to `rgba(20, 184, 166, 0.2)`.

### Cards & Dash Containers
- Pure white (`#FFFFFF`) background, `rounded-2xl` corners, micro-hairline border (`#E2E8F0`), and soft ambient shadow.
- Divided cleanly with ample internal breathing room (`space-lg`) between headline headers, central numeric gauges, and recommendation footers.

### Input Fields & Search Bars
- Clean `#FFFFFF` fill flanked by an `#E2E8F0` border, shifting to a crisp teal accent border (`#14B8A6`) with an outer soft mint glow (`box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.15)`) on focus.

### Checkboxes & Toggle Controls
- Pill switches for toggling room purifiers and smart schedules.
- Selected state fills with primary teal (`#0D5C58`) with a pure white circular thumb; unselected state is neutral slate tint (`#CBD5E1`).

### Specialized Family & Air Telemetry Widgets
- **Vulnerable Member Cards**: Compact cards grouping children, elderly members, or asthmatic family profiles with custom sensitivity thresholds and tailored recommendations.
- **Pollutant Breakdown Chips**: Compact cards showcasing individual metrics (PM2.5, PM10, NO2, VOC) featuring subtle horizontal bar micro-meters.
- **Window Safety Gauge**: A dual-state visual component displaying "Keep Closed" or "Safe to Ventilate" using intuitive iconography and clear color-coded reassurance.