---
name: DiabCare WoundCam
colors:
  canvas: '#f2f8ff'
  canvas-mid: '#fafdfe'
  background: '#ffffff'
  ink: '#16345c'
  primary: '#0a4fbe'
  primary-strong: '#0a57c8'
  primary-bright: '#2fb9f6'
  primary-hover: '#1568e8'
  on-primary: '#ffffff'
  panel-surface: '#ffffffd9'
  panel-border: '#ffffff80'
  input-border: '#d8dde7'
  input-icon: '#5e7ea6'
  placeholder: '#a0b8d0'
  divider: '#f1f5f9'
  muted: '#94a3b8'
  role-active-background: '#eff6ff'
  role-active-border: '#93c5fd'
  nurse-background: '#f0f9ff'
  caregiver-background: '#ecfeff'
  error: '#e11d48'
  error-background: '#fff1f2'
typography:
  display-brand:
    fontFamily: Sarabun
    fontSize: 20px
    fontWeight: '800'
    lineHeight: 20px
    letterSpacing: -0.025em
  body-base:
    fontFamily: Sarabun
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: '0'
  label-sm:
    fontFamily: Sarabun
    fontSize: 11px
    fontWeight: '700'
    lineHeight: 16.5px
    letterSpacing: '0'
  role-label:
    fontFamily: Sarabun
    fontSize: 10px
    fontWeight: '800'
    lineHeight: 15px
    letterSpacing: '0'
  cta:
    fontFamily: Sarabun
    fontSize: 18px
    fontWeight: '700'
    lineHeight: 27px
    letterSpacing: 0.025em
  microcopy:
    fontFamily: Sarabun
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 15px
    letterSpacing: 0.14em
rounded:
  role: 0.75rem
  control: 1.125rem
  panel: 1.75rem
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 10px
  lg: 14px
  xl: 18px
  panel-x: 18px
  panel-y: 22px
  page-top: 32px
  page-bottom: 24px
---

# Design System: DiabCare WoundCam

**Source URL:** https://diab-care-wound-cam-mtn-inventor-pc.vercel.app/

**Extraction date:** 2026-10-08

**Scope:** Public login route rendered in a real browser, with the deployed HTML, CSS, JavaScript bundle, logo asset, and desktop/mobile screenshots preserved under `artifacts/`. No credentials were entered and no authenticated route was crawled.

## 1. Visual Theme & Atmosphere

DiabCare WoundCam opens with a calm, clinical login surface. The page uses a very pale blue-to-white vertical wash rather than a flat background, which makes the form feel clean and lightly elevated without looking like a traditional hospital portal. The visual mood is approachable and practical: cool blue accents communicate trust, while soft white surfaces keep the interface quiet and easy to scan.

The screen is deliberately sparse. There is no hero illustration, marketing copy, or dense navigation. A compact logo lockup, a three-way care-role selector, two large fields, and one strong call to action carry the whole experience. Rounded geometry, generous touch targets, and Thai-first labels make the sign-in flow feel designed for phone use even though the desktop version preserves the same centered composition.

The most distinctive effect is a restrained frosted-glass panel. The form sits on a translucent white surface with a faint white border, 28px corners, a light blur, and a barely visible cool-blue shadow. This is not dramatic glassmorphism; it is a soft separation layer over the page gradient.

### Repository alignment note

The deployed public page does not match the current `main` branch source tree exactly. The live bundle uses the blue-gradient Thai login system documented here. The checked-out source in `client/src/index.css` instead defines a navy/sage dashboard system with `#132238`, `#4f7463`, `#c86b52`, IBM Plex Sans Thai, Noto Sans Thai, and Kanit. Treat the live route as the source of truth for this document, and do not merge the two palettes without an explicit product decision.

## 2. Color Palette & Roles

### Primary Foundation

- **Clinical Ice Canvas — `#f2f8ff`**: The page and body base. It provides a cool, low-contrast starting point for the login surface.
- **White Fade — `#fafdfe`**: The middle stop in the page gradient. It gently lifts the center of the screen before fading to white.
- **Clean White — `#ffffff`**: Input backgrounds, logo tile, button text, and the main visual counterweight to the blue canvas.
- **Frosted Panel White — `#ffffffd9`**: A translucent white layer used by the form panel. It preserves a sense of depth without adding a heavy card shadow.
- **Frosted Edge — `#ffffff80`**: A 50% white border around the form panel.

### Accent & Interactive

- **Deep Clinical Blue — `#0a4fbe`**: Brand emphasis on “WoundCam”, the selected officer role, active iconography, and the main trust signal.
- **Action Blue — `#0a57c8`**: The left stop of the primary login button gradient.
- **Bright Medical Cyan — `#2fb9f6`**: The right stop of the primary login button gradient. It adds energy without turning the interface neon.
- **Focus Blue — `#1568e8`**: Focus border and focus ring for form controls.
- **Soft Focus Ring — `#1568e826`**: A 15% blue ring used to make keyboard and pointer focus visible.
- **Officer Active Wash — `#eff6ff`**: Selected role background.
- **Officer Active Border — `#93c5fd`**: Selected officer tab border.
- **Nurse Wash — `#f0f9ff`**: Nurse role state family.
- **Caregiver Wash — `#ecfeff`**: Caregiver role state family.

### Typography & Text Hierarchy

- **Deep Ink Blue — `#16345c`**: Default body text and input text. It is softer than black and carries the clinical tone through the page.
- **Slate Label — `#475569`**: Field labels and supporting UI text.
- **Icon Blue Gray — `#5e7ea6`**: Leading input icons and subdued interactive icon states.
- **Placeholder Blue Gray — `#a0b8d0`**: Placeholder copy. It is intentionally low contrast so entered values will dominate.
- **Muted Slate — `#94a3b8`**: Footer microcopy, inactive text, and low-priority supporting information.
- **Divider Slate — `#f1f5f9`**: The fine rule above the footer.

### Functional States

- **Validation Rose — `#e11d48`**: Error copy and error emphasis in the deployed bundle.
- **Validation Rose Wash — `#fff1f2`**: Error message background in the deployed bundle.
- **Disabled Surface**: The primary button uses reduced opacity rather than a separate disabled color, preserving the blue identity while signaling unavailable interaction.

## 3. Typography Rules

### Font Families

- **Sarabun** is the primary UI face. It is loaded at 400, 500, 600, 700, and 800 weights and handles Thai labels, controls, and the brand lockup cleanly.
- **Inter** is the Latin fallback and supports the English parenthetical labels such as “Username” and “Password”.
- **JetBrains Mono** is loaded by the bundle for technical or diagnostic surfaces outside the public login route. It should not be introduced into the login form unless a technical value needs explicit monospace treatment.

### Hierarchy & Weights

- **Brand lockup:** 20px, 800 weight, 20px line-height, tight `-0.025em` tracking. “DiabCare” uses deep ink; “WoundCam” uses deep clinical blue.
- **Field labels:** 11px, 700 weight, 16.5px line-height. Labels remain visible above the control and use Thai-first wording with English in parentheses.
- **Role labels:** 10px, 800 weight, 15px line-height. Small but legible because each role also has a familiar icon.
- **Primary CTA:** 18px, 700 weight, 27px line-height, slightly positive tracking. It is the largest text in the form and sits on the strongest color field.
- **Placeholder text:** 16px, regular weight. The large size supports mobile scanning and touch-oriented entry.
- **Footer microcopy:** 10px, bold, uppercase, wide tracking around `0.14em`. It acts as a quiet signature rather than content.

### Spacing Principles

The login screen follows a compact 4px/8px rhythm with a few explicit touch-oriented values: 10px role-grid gaps, 14px vertical form spacing, 18px horizontal panel padding, 60px controls, and a 58px CTA. Labels sit 6px above their control group. The composition feels generous because the page itself contains very few elements, not because it uses large section spacing.

## 4. Component Stylings

### Brand Lockup

The logo appears in a 72px square tile (`w-18 h-18`) with a white background, a 16px rounded corner, a thin slate border, and a small shadow. The source image is contained with 4px internal padding so the supplied logo stays crisp and avoids cropping. The lockup sits centered above the form, followed by a 20px wordmark.

The visual order is logo, wordmark, then the form panel. Keep this vertical sequence. It gives the page an immediate identity without adding a separate header bar.

### Role Selector

The selector uses a three-column equal-width grid with a 10px gap. Each role is a compact vertical button with a 12px radius, 8px vertical padding, 4px horizontal padding, and a 53px rendered height. Icons sit above the label.

The officer role is selected by default and uses a blue-50 background, blue-300 border, deep clinical blue text, and a subtle shadow. Nurse and caregiver use their own cool-blue wash families while unselected buttons stay near-white with slate borders. The selector is not a tab strip with an underline; it behaves more like three tactile cards.

### Inputs & Forms

Each field uses a persistent 11px label above a 60px white input shell. The shell has a 1.5px `#d8dde7` border, an 18px radius, and a small default shadow. A 52px icon rail on the left centers the user and lock icons. The password field reserves a matching right-side action rail for the eye toggle.

On focus, the field border shifts to `#1568e8` and receives a 3px translucent blue ring. The focus treatment is visible without changing the control’s height or layout. Keep the field height stable during focus and validation.

### Primary Button

The sign-in action is a full-width 58px control with an 18px radius. Its fill is a horizontal gradient from `#0a57c8` to `#2fb9f6`, with white 18px text. It carries a restrained blue shadow and a `.95` active scale for tactile feedback. The button sits 14px below the password group and is the only saturated large surface on the page.

Use sentence-case Thai copy or the product’s localized equivalent. The live label is `เข้าสู่ระบบการทำงาน`. Loading changes the label to a progress message, while disabled state uses reduced opacity rather than a new color.

### Footer Signature

A fine divider separates the form controls from the footer. The footer has 14px top padding and uses centered, uppercase, widely tracked microcopy: `POWER BY MTN INVENTOR`. Keep this low contrast and subordinate to the form.

### Validation & Feedback

The deployed bundle includes a compact rose error treatment using a rose-tinted background, rose border, and rose text. Place it near the top of the form so the user sees it before re-entering credentials. Avoid shifting the logo or page framing when an error appears; let the form panel expand vertically.

## 5. Layout Principles

### Grid & Structure

- **Desktop wrapper:** The login card is capped at 440px and centered inside the full viewport.
- **Desktop page:** `.desktop-preview` centers the full-height app shell against the `#f2f8ff` canvas.
- **Form panel:** The live panel measures 396px wide inside the 440px card, with 22px vertical and 18px horizontal padding.
- **Role grid:** Three equal columns, 10px gap.
- **Form controls:** Full-width within the 358px panel content width.

The composition intentionally avoids a two-column desktop layout. Desktop adds breathing room around the same mobile-first form instead of introducing extra navigation or marketing content.

### Whitespace Strategy

The card uses 32px top, 22px side, and 24px bottom padding. The logo sits above the wordmark with a small 10px-ish visual gap; the wordmark sits about 20px above the frosted form panel. Inside the panel, the role selector starts immediately, fields follow with compact label-to-control spacing, and the CTA gets a clear 14px separation.

### Alignment & Visual Balance

All major elements are centered. Text aligns center in the brand and footer areas; labels and controls align left for efficient scanning. The gradient button is the visual anchor at the bottom of the form. The role selector distributes equal weight across three care personas, so no role reads as secondary because of column width.

### Responsive Behavior & Touch

At widths up to 768px, the app shell, login page, and login card become full viewport width and height. Desktop max-width and any outer centering treatment disappear. The form remains full width with 22px side padding, which produces comfortable 358px controls on a 390px phone screenshot.

Keep the 60px input height and 58px CTA height on mobile. Do not collapse the role selector into a dropdown; the three role choices are part of the sign-in model and remain visible. Respect `100dvh` and safe-area behavior for modern phones.

## 6. Design System Notes for Stitch Generation

### Language to Use

Describe the interface as **calm clinical blue**, **airy white**, **soft glass panel**, **Thai-first healthcare login**, and **touch-friendly role selection**. Avoid language such as “dark hospital dashboard” or “medical neon”; the deployed login is bright, quiet, and approachable.

### Color References

Use these references when generating a screen:

- Cool ice canvas: `#f2f8ff` fading through `#fafdfe` into `#ffffff`.
- Deep ink text: `#16345c`.
- Deep clinical blue: `#0a4fbe`.
- CTA gradient: `#0a57c8` to `#2fb9f6`.
- Input border: `#d8dde7`.
- Placeholder: `#a0b8d0`.
- Frosted panel: translucent white `#ffffffd9` with `#ffffff80` edge.
- Officer active state: `#eff6ff` fill with `#93c5fd` border.

### Component Prompts

1. **Login screen:** “Create a Thai-first healthcare login screen for DiabCare WoundCam. Use a full-height pale ice-blue-to-white vertical gradient, a centered 440px desktop composition, a contained 72px logo tile, a compact Sarabun wordmark, and a translucent white frosted form panel with 28px corners. Include three equal care-role cards, two 60px rounded inputs with leading icons, and one full-width 58px blue-to-cyan gradient CTA.”
2. **Mobile login:** “Adapt the DiabCare WoundCam login to a 390px mobile viewport. Keep the form full-width with 22px side padding, preserve the three role cards, keep 60px inputs and a 58px CTA, use Thai-first labels with English in parentheses, and avoid introducing a mobile header or bottom navigation.”
3. **Validation state:** “Show the same DiabCare WoundCam login with an inline rose validation message near the top of the frosted form. Keep the logo and page framing fixed, use `#fff1f2` with `#e11d48`, and preserve the blue focus and CTA treatment.”

### Incremental Iteration

- Preserve the vertical hierarchy before changing decoration: logo, wordmark, role cards, fields, CTA, footer.
- Keep the form width capped at 440px on desktop and full-width on mobile.
- Keep the panel translucent and lightly blurred; do not replace it with an opaque heavy card.
- Keep blue as the only strong large-area accent. Use role-specific pale washes for secondary states.
- Keep labels visible above inputs. Do not rely on placeholders as the only field labels.
- Validate the 390px mobile layout first, then verify the centered 1440px desktop composition.
- If extending the system to authenticated dashboard screens, make a conscious choice between the live blue login palette and the current repository’s navy/sage source palette. They are not currently one coherent token set.
