---
name: Aurora
description: Monitor de salud para astronautas — cada signo vital se lee como un parche de misión
colors:
  shell-bg: "#0a0e1a"
  shell-bg-raised: "#10172b"
  shell-bg-panel: "#151d35"
  shell-border: "#263252"
  shell-border-soft: "#1c2742"
  accent-900: "#06204f"
  accent-700: "#0b3d91"
  accent-500: "#3867c7"
  accent-300: "#7fa6ea"
  state-ok: "#3fb66f"
  state-warn: "#f2b134"
  state-crit: "#ff6267"
  text-primary: "#eef2fb"
  text-secondary: "#9fadcf"
  text-tertiary: "#6b7aa1"
typography:
  display:
    fontFamily: "Inter, -apple-system, system-ui, sans-serif"
    fontWeight: 800
    letterSpacing: "-0.01em"
  body:
    fontFamily: "Inter, -apple-system, system-ui, sans-serif"
    fontWeight: 400
  mono:
    fontFamily: "JetBrains Mono, ui-monospace, SFMono-Regular, monospace"
    fontWeight: 500
rounded:
  sm: "10px"
  md: "16px"
  lg: "24px"
  full: "999px"
spacing:
  1: "4px"
  2: "8px"
  3: "12px"
  4: "16px"
  5: "24px"
  6: "32px"
  7: "48px"
components:
  button-primary:
    backgroundColor: "{colors.accent-700}"
    textColor: "#f3f7ff"
    rounded: "{rounded.sm}"
    padding: "12px 24px"
  button-primary-hover:
    backgroundColor: "{colors.accent-500}"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.sm}"
---

# Design System: Aurora

## Overview

**Creative North Star: "The Mission Patch"**

Aurora is the on-board software an astronaut opens to self-assess their health during a long-duration mission — no doctor present, sometimes no quick line to Earth. The system reads every vital sign as a mission patch: a fixed circular badge that stays whole and brightly colored when the astronaut is cleared, and visibly changes into an alert color when something needs attention. It deliberately avoids both the generic SaaS "metric card + sparkline" template and the sci-fi spaceship-HUD cliché — the world is drawn from NASA's own graphic language and the idea of a badge you earn, not from a cockpit console.

The shell is dark by deliberate choice, not default: it models the controlled, artificial light of a spacecraft cabin, and it is what makes the reserved alert colors (green / amber / red) read unmistakably the moment something changes. Color is never decorative here — every saturated color on screen means something about a person's health or the ship's environment.

**Key Characteristics:**
- Every indicator shares one fixed circular frame, so status is comparable at a glance across the whole grid.
- Color is reserved for state (ok/warn/crit) and one structural accent (NASA blue) — never used decoratively.
- Each indicator's trend chart has its own honest motif (a heartbeat-like trace for heart rate, a smooth wave for skin response, stepped for discrete counts) rather than one generic chart type.
- A severity band rides beneath every trend line, so how long a reading stayed abnormal is visible, not just its current value.

## Colors

The palette is a dark operational navy carrying one committed structural blue, with three reserved state colors that never appear outside their meaning.

### Primary
- **NASA Blue** (`#0b3d91`, hover `#3867c7`): the shell's structural accent — primary buttons, the brand mark, focus rings, chart accents on indicators with no active alert. Carries the "this is NASA software" identity.

### Neutral
- **Deep Space** (`#0a0e1a`): page background.
- **Raised Navy** (`#10172b`): the sticky header and chart wells.
- **Panel Navy** (`#151d35`): the detail panel and patch fill base.
- **Border Navy** (`#263252` / soft `#1c2742`): hairline dividers and resting patch borders.
- **Ice** (`#eef2fb` / `#9fadcf` / `#6b7aa1`): primary / secondary / tertiary text, in descending emphasis.

### Named Rules
**The Reserved Color Rule.** Green, amber, and red exist only to mean "normal", "attention", or "critical" for a health or environmental reading. They are never used for branding, decoration, or anything without a status meaning.

## Typography

**Display Font:** Inter (bold/extrabold, with system-ui fallback)
**Body Font:** Inter (regular/medium)
**Label/Mono Font:** JetBrains Mono

**Character:** A confident, institutional sans for everything a person reads (labels, headings, explanations), paired with a monospace for everything that is a measurement — so a number always looks like data, not prose.

### Hierarchy
- **Display** (800, 1.15–1.4rem, tight): page and panel titles ("Aurora", "Frecuencia cardíaca").
- **Title** (700, 0.9–1rem): patch labels, section headings.
- **Body** (400–500, 0.85–0.95rem, 1.5 line-height): educational copy, explanations, guidance text.
- **Label** (700, 0.62–0.72rem, uppercase, 0.04em tracking): status words (NORMAL / ATENCIÓN / CRÍTICO).
- **Mono/data** (500–600, JetBrains Mono, tabular-nums): every numeric reading, unit, and timestamp.

### Named Rules
**The Measurement-Is-Mono Rule.** Any number that came from a sensor, a manual entry, or a timestamp renders in the mono face with `font-variant-numeric: tabular-nums`. Prose never does.

## Layout

A sticky top shell (brand + mission status + primary action) sits above a two-column work area: a flexible patch grid on the left (the astronaut's full set of vitals) and a sticky detail rail on the right (the selected indicator's trend, explanation, and guidance). Below 1080px the rail drops beneath the grid and stops being sticky; below 640px the patch grid centers and shrinks to its small frame size. Spacing follows an 4/8/12/16/24/32/48px rhythm (`--space-1` … `--space-7`), with generous separation between the grid and the section above it.

## Elevation & Depth

Flat by default — surfaces are distinguished by navy tone, not shadow. The only shadows are soft, offset, and small: a resting patch (`0 8px 20px -10px rgba(0,0,0,.55)`) and a raised panel (`0 12px 32px -16px rgba(0,0,0,.6)` plus a 1px inner highlight). Depth communicates "this is a physical badge sitting slightly off the page", never decoration.

### Named Rules
**The Flat-Shell Rule.** The page shell, header, and panels are flat navy. Only the circular patches and the manual-entry sheet lift off the surface.

## Shapes

- **Patches are always circles** at one fixed diameter per breakpoint (168px desktop / 132px mobile; the "featured"/selected patch scales to 1.18×). This is the signature silhouette of the whole system.
- **Panels and the entry sheet** use a generous 16–24px radius.
- **Buttons and inputs** use a tighter 10px radius, so the circle reads as the one deliberate geometric statement on the page.

## Components

### Patch Badge (signature component)
The core unit of the whole product. A fixed-size circle with a status-tinted radial fill, a 2px border tinted toward the current status color, an icon ring, a large mono value, a unit, a label, and an uppercase status word. On any status change it flares once — a soft ring pulse in the new status color — then settles; this is the system's one authored motion, and it respects `prefers-reduced-motion`.

### Buttons
- **Shape:** 10px radius.
- **Primary:** NASA-blue fill (`#0b3d91`), white text, soft blue glow shadow; hovers to the lighter `#3867c7`.
- **Ghost:** transparent fill, navy border, brightens to the accent on hover.
- **Small/inline:** same language, tighter padding, used inside the detail panel and entry forms.

### Detail Panel
A raised navy card: icon + title + source sensor on the left, the live mono value on the right, a status pill and "normal range" line below, then the trend chart, a status-tinted action callout (only shown when not normal), and a two-part educational list (what it measures / why it matters in flight).

### Body 3D (signature component)
The primary way to read the nine body-linked indicators: a real, lit, rotatable 3D astronaut in an EVA suit (WebGL via Three.js / react-three-fiber), not a flat illustration. The suit is built from simple shaded volumes — a capsule torso and limbs, a rounded helmet with a physically-shaded visor, a backpack, a chest panel with emissive switch details, a shoulder mission patch, a comm antenna — lit with a key + fill + accent rim light so it actually reads as dimensional. The astronaut can be dragged to orbit (mouse or touch), and auto-rotates slowly when idle; zoom and pan are disabled to keep it from getting lost. Each indicator is a small glowing marker sphere positioned directly on the body (status-colored, real hex values — CSS custom properties don't resolve inside Three.js materials, so 3D markers read from `STATUS_HEX` in `lib/status.js` while every 2D/DOM surface keeps using the CSS-variable `STATUS_META`), with its compact patch floating beside it as an HTML overlay anchored to that 3D point (`@react-three/drei`'s `Html`), so the patch moves and stays attached to its body part as the model turns. Clicking the marker or the patch both select the indicator. When the mission status is critical, a point light pulses the whole suit in the alert red, an ambient alarm tied to real state rather than decoration. Cabin pressure is deliberately excluded from the model and shown in its own small row above, labeled as environmental, not a body reading.

Known dev-only quirk: the dev console logs a harmless React warning ("Attempted to synchronously unmount a root...") tied to how `Html`'s portal interacts with React's unminified dev build; confirmed absent from the production build (`npm run build` + `vite preview`), so it does not ship.

### Trend Chart (signature component)
A custom SVG, not a library default: a severity band of small colored rectangles rides along the bottom (one per sample, colored by that sample's status) beneath a line drawn in one of four honest motifs — straight for most sensors, a smoothed curve for GSR, a stepped line for discrete counts (activity, respiration), and small tick "blips" riding the line for heart rate.

### Manual Entry Sheet
A right-anchored slide-over (not a full-screen modal) over a translucent scrim, listing the four self-reported indicators with inline inputs (or a 1–5 button scale for mood), each with its own small "Guardar" action and a brief confirmed state.

### Navigation
There is no traditional nav; wayfinding is the patch grid itself (tap any patch to make it the featured/detail one) plus the always-visible mission-status pill in the header.

## Do's and Don'ts

### Do:
- **Do** keep every patch the same fixed size within its breakpoint — comparability across indicators is the point.
- **Do** reserve green/amber/red exclusively for health or environmental status.
- **Do** give every chart a motif that is true to its data (a stepped line for discrete counts is accurate, not decorative).
- **Do** show the plain-language "what it measures" and "why it matters" text for every indicator — the astronaut is not assumed to be medically trained.
- **Do** make the body figure itself clickable at each anchor point, not just the floating patch — the figure is an input, not an illustration.

### Don't:
- **Don't** introduce a second accent color competing with NASA blue for structural attention.
- **Don't** use a generic card-with-shadow metric tile; the circular patch is the only container for a vital sign.
- **Don't** add decorative blur or glass effects — the sticky header shipped one and it caused scrolled content to bleed through it, which is why the shell is fully opaque navy now.
- **Don't** rely on color alone for status — every status also carries an icon, a text label, and (in the chart) a severity band.
