---
name: Clinical High-Assurance Cockpit
colors:
  surface: "#f8f9ff"
  surface-dim: "#ccdbf3"
  surface-bright: "#f8f9ff"
  surface-container-lowest: "#ffffff"
  surface-container-low: "#eff4ff"
  surface-container: "#e6eeff"
  surface-container-high: "#dce9ff"
  surface-container-highest: "#d5e3fc"
  on-surface: "#0d1c2e"
  on-surface-variant: "#3f4850"
  inverse-surface: "#233144"
  inverse-on-surface: "#eaf1ff"
  outline: "#707881"
  outline-variant: "#bfc7d2"
  surface-tint: "#006398"
  primary: "#006194"
  on-primary: "#ffffff"
  primary-container: "#007bb9"
  on-primary-container: "#fdfcff"
  inverse-primary: "#93ccff"
  secondary: "#006399"
  on-secondary: "#ffffff"
  secondary-container: "#7bc2ff"
  on-secondary-container: "#004f7b"
  tertiary: "#894d00"
  on-tertiary: "#ffffff"
  tertiary-container: "#ac6200"
  on-tertiary-container: "#fffbff"
  error: "#ba1a1a"
  on-error: "#ffffff"
  error-container: "#ffdad6"
  on-error-container: "#93000a"
  primary-fixed: "#cce5ff"
  primary-fixed-dim: "#93ccff"
  on-primary-fixed: "#001d31"
  on-primary-fixed-variant: "#004b73"
  secondary-fixed: "#cde5ff"
  secondary-fixed-dim: "#94ccff"
  on-secondary-fixed: "#001d32"
  on-secondary-fixed-variant: "#004b74"
  tertiary-fixed: "#ffdcc0"
  tertiary-fixed-dim: "#ffb875"
  on-tertiary-fixed: "#2d1600"
  on-tertiary-fixed-variant: "#6b3b00"
  background: "#f8f9ff"
  on-background: "#0d1c2e"
  surface-variant: "#d5e3fc"
  canvas-root: "#F8FAFC"
  surface-pure: "#FFFFFF"
  slate-ink: "#0F172A"
  perimeter-muted: "#CBD5E1"
  partition-subtle: "#F1F5F9"
  safety-emerald: "#059669"
  clinical-amber: "#D97706"
  viewfinder-dark: "#0B1926"
typography:
  headline-lg:
    fontFamily: Geist
    fontSize: 28px
    fontWeight: "700"
    lineHeight: 36px
    letterSpacing: -0.02em
  headline-lg-mobile:
    fontFamily: Geist
    fontSize: 22px
    fontWeight: "700"
    lineHeight: 28px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Geist
    fontSize: 20px
    fontWeight: "600"
    lineHeight: 28px
    letterSpacing: -0.02em
  headline-sm:
    fontFamily: Geist
    fontSize: 16px
    fontWeight: "600"
    lineHeight: 24px
    letterSpacing: -0.01em
  body-lg:
    fontFamily: Geist
    fontSize: 15px
    fontWeight: "400"
    lineHeight: 24px
  body-md:
    fontFamily: Geist
    fontSize: 14px
    fontWeight: "400"
    lineHeight: 21px
  body-sm:
    fontFamily: Geist
    fontSize: 12px
    fontWeight: "400"
    lineHeight: 18px
  label-lg:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: "500"
    lineHeight: 20px
  label-md:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: "500"
    lineHeight: 16px
    letterSpacing: 0.02em
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 11px
    fontWeight: "500"
    lineHeight: 14px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  gutter: 1rem
  margin: 1.5rem
  margin-mobile: 1rem
  space-xs: 0.25rem
  space-sm: 0.5rem
  space-md: 0.75rem
  space-lg: 1.5rem
  space-xl: 2rem
---

# Design System: DiabCare Clinical Decision & Wound Documentation

## 1. Visual Theme & Atmosphere

A clinical high-assurance workspace engineered for diabetic wound care specialists, triage nurses, and endocrinologists. The atmosphere balances institutional trustworthiness with tactile, modern clarity — "Cockpit Dense" (Density: 8/10), "Offset Asymmetric" (Variance: 6/10), and "Fluid Restrained" (Motion: 4/10). The spatial rhythm prioritizes zero-friction data verification, instant optical capture review, and clear distinction between AI diagnostic proposals and human clinical sign-off. High contrast, glare-free, and immaculately organized without cold austerity or superficial SaaS flash.

## 2. Color Palette & Roles

- **Sterile Canvas** (#F8FAFC) — Slate-50 root canvas; clean, glare-resistant clinical backdrop.
- **Surface Pure** (#FFFFFF) — Primary card containers, patient queue rows, modal surfaces, and data sheet backgrounds.
- **Deep Slate Ink** (#0F172A) — Slate-900 primary typography, clinical labels, case titles, and diagnostic headers. Zero pure black (#000000).
- **Clinical Steel** (#475569) — Slate-600 secondary body, patient age/type metadata, secondary instructions, and timestamps.
- **Muted Perimeter** (#CBD5E1) — Slate-300 structural borders, tab active borders, input outlines, and camera targeting brackets (1px crisp stroke).
- **Subtle Partition** (#F1F5F9) — Slate-100 table row alternating fills, inactive badge containers, and disabled states.
- **Clinical Cyan Accent** (#0284C7) — Sky-600 primary action fill, confirmed state badges, camera trigger CTA, and focus rings (Saturation: 76%, non-neon).
- **Deep Navy Command** (#0369A1) — Sky-700 active button states and high-priority case tags.
- **Safety Emerald** (#059669) — Emerald-600 calibrated readiness indicator ("Ready for capture", "Safe boundary calibrated").
- **Clinical Amber Warning** (#D97706) — Amber-600 alert for unconfirmed model predictions, missing patient baseline, or retake warnings.
- **Banned Colors:** Neon purple glows (#8B5CF6 / #A855F7), electric magenta, pure #000000, high-saturation (>80%) blue washes.

## 3. Typography Rules

- **Display / Primary Titles:** Geist or Satoshi — Track-tight (-0.02em), semi-bold to bold (600/700). High hierarchy through slate contrast and structured weights rather than oversized point sizes (max 28px/1.75rem in desktop viewport).
- **Clinical Body & UI:** Geist or Satoshi — Relaxed line-height (1.5), 14px to 15px base size, line length strictly constrained to 65 characters maximum.
- **High-Density Monospace:** Geist Mono or JetBrains Mono — Mandatory for all patient IDs (e.g., `IMPORTED-093`, `5165`), timestamps (`12 ต.ค. 2569 14:50`), clinical calibration metrics, RGB coordinate metadata, and wound perimeter dimensions.
- **Thai & International Script:** Prompt or Noto Sans Thai looped modern sans paired seamlessly with Geist, matching baseline x-height and letter-spacing.
- **Banned Typography:** Inter, generic serifs (Times New Roman, Georgia, Garamond), decorative display serifs on dashboards, all script or playful handwritten fonts.

## 4. Component Stylings

- **Buttons & Triggers:** Flat architectural buttons with 6px border-radius (rounded-md), 1px subtle matching border, and tactile -1px downward translate (`transform: translateY(1px)`) on `:active`. Primary buttons use Clinical Cyan (`#0284C7`) with white crisp lettering. Secondary actions use pure white surface with Slate-300 stroke. Outer neon glows and animated gradient buttons are strictly forbidden.
- **Camera Viewport Gate:** Matte deep-navy viewfinder container (`#0B1926` / `#0F2132`) with calibrated perimeter boundary brackets, high-contrast corner reticles, centered iconography, and non-distracting live status pill (`#059669` dot indicator).
- **Patient Queue Cards & Lists:** Strict structured rows with left-aligned medical avatar badges (`#E2E8F0` circle or rounded square), tabular layout with radio check-indicators on right. Monospace patient code display. Elevation is communicated strictly via 1px `#E2E8F0` border dividers and hover state `#F8FAFC`, avoiding fuzzy drop shadows.
- **Clinical Inputs & Filters:** Top-anchored micro-labels in Clinical Steel (`#475569`, 12px uppercase / 0.05em tracking), 40px input height, 1px `#CBD5E1` border, 0px shadow, with `#0284C7` 2px focus ring. Error messages rendered inline immediately below inputs in Amber-600 (`#D97706`).
- **Skeletal Loaders:** Geometric pulsating grey-100 shimmer plates matching the exact bounding box of the patient card and photo canvas. No generic spinning circular wheels.
- **Empty & Awaiting States:** Clean bordered container with a minimalist vector placeholder graphic (camera aperture or document outline), accompanied by concrete procedural next-step copy.

## 5. Layout Principles

- **Grid Architecture:** 12-column desktop grid constrained to a 1440px maximum viewport container. Left panel: Patient triage & active case selector (380px fixed width). Right panel: Clinical inspection / viewfinder viewport (fluid remaining 1fr).
- **Hero & Case Gate:** Split asymmetric structure. Case Gate header with categorical metadata tags (`CASE GATE / 01`, `CAPTURE / 02`, `REVIEW / 03`) providing continuous procedural orientation.
- **No Overlapping Elements:** Strict zero-overlap rule. Floating pill badges, camera frames, and diagnostic text tags maintain dedicated spatial bounds with minimum 16px gutter spacing.
- **Vertical Rhythm:** 24px (1.5rem) card padding, 32px (2rem) major section gap, 12px (0.75rem) component row gap.
- **Viewport Height Containment:** Full-height viewport containers strictly enforce `min-h-[100dvh]` to eliminate mobile/tablet iOS browser bar displacement.

## 6. Motion & Interaction

- **Physics Calibration:** Spring physics easing curves (`stiffness: 120, damping: 22`) for state switching, tab transitions, and modal appearances. No linear or robotic easing curves.
- **Camera State Transitions:** Instantaneous 150ms opacity crossfade between standby viewfinder and active RGB frame buffer.
- **Status Micro-Loops:** Calibrated readiness indicators feature an ambient 3-second breathing pulse (`scale: 1.0 to 1.04`, opacity: 0.85 to 1.0) on the indicator dot.
- **Performance Protocol:** Transitions strictly leverage `transform` and `opacity` properties. `width`, `height`, `top`, and `left` alterations during animations are banned.

## 7. Anti-Patterns (Banned AI Tells)

- **No Emojis:** Medical software requires standard SVG iconography; emojis are strictly banned across all labels, alerts, and tooltips.
- **No Inter Font:** Inter is banned in favor of Geist / Geist Mono.
- **No Neon Purple/Cyan Gradients:** Glow effects, cyberpunk lighting, and colorful gradient text are strictly forbidden in this clinical workflow.
- **No Pure Black (#000000):** All deep surfaces and dark typography use Deep Slate Ink (`#0F172A`).
- **No Centered Hero Layouts:** Centered marketing hero banners are banned. Split clinical gating is required.
- **No Marketing AI Clichés:** Banned phrases include "Elevate your diagnostic power", "Seamless AI experience", "Unleash clinical accuracy", and "Next-Gen healthtech". All copy must be factual, regulatory-compliant clinical Thai or English.
- **No Fake Metric Placeholders:** Real clinical sample IDs (`IMPORTED-093`, `5165`), verified date-time stamps, and clear confidence disclaimer text (`รูปภาพและผลจากโมเดลใช้เพื่อช่วยทบทวนทางคลินิก ไม่ใช่การวินิจฉัย`).
