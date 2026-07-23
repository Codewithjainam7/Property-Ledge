---
name: Property Ledge
colors:
  surface: '#fbf9f9'
  surface-dim: '#dbd9da'
  surface-bright: '#fbf9f9'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f5f3f3'
  surface-container: '#efedee'
  surface-container-high: '#e9e8e8'
  surface-container-highest: '#e4e2e2'
  on-surface: '#1b1c1c'
  on-surface-variant: '#43474a'
  inverse-surface: '#303031'
  inverse-on-surface: '#f2f0f0'
  outline: '#73787b'
  outline-variant: '#c3c7ca'
  surface-tint: '#50616a'
  primary: '#0c1e26'
  on-primary: '#ffffff'
  primary-container: '#22333b'
  on-primary-container: '#899ba5'
  inverse-primary: '#b7c9d3'
  secondary: '#6e5b48'
  on-secondary: '#ffffff'
  secondary-container: '#f9dec6'
  on-secondary-container: '#75614e'
  tertiary: '#2a180a'
  on-tertiary: '#ffffff'
  tertiary-container: '#412c1d'
  on-tertiary-container: '#b1927e'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#d3e5f0'
  primary-fixed-dim: '#b7c9d3'
  on-primary-fixed: '#0c1e25'
  on-primary-fixed-variant: '#384952'
  secondary-fixed: '#f9dec6'
  secondary-fixed-dim: '#dcc2ab'
  on-secondary-fixed: '#26190a'
  on-secondary-fixed-variant: '#554332'
  tertiary-fixed: '#ffdcc5'
  tertiary-fixed-dim: '#e2c0aa'
  on-tertiary-fixed: '#29170a'
  on-tertiary-fixed-variant: '#594231'
  background: '#fbf9f9'
  on-background: '#1b1c1c'
  surface-variant: '#e4e2e2'
typography:
  display-lg:
    fontFamily: Space Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Space Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-md:
    fontFamily: Space Grotesk
    fontSize: 24px
    fontWeight: '500'
    lineHeight: 32px
  body-lg:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Outfit
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  body-sm:
    fontFamily: Outfit
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-md:
    fontFamily: Outfit
    fontSize: 12px
    fontWeight: '600'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 8px
  container-max-width: 1440px
  gutter: 24px
  margin-mobile: 16px
  margin-desktop: 48px
---

## Brand & Style
The design system for this enterprise property management platform is rooted in **Premium Minimalism**. It is designed to evoke a sense of architectural precision, clarity, and high-end exclusivity. The target audience—property owners, asset managers, and real estate professionals—requires a tool that feels more like a luxury boutique service than a utilitarian spreadsheet.

The aesthetic prioritizes intentionality over decoration. It uses generous whitespace to reduce cognitive load in complex data environments, ensuring that "Jet Black" accents and "Dusty Taupe" secondary elements act as sophisticated anchors. The result is an interface that feels quiet yet authoritative, allowing property data and high-value assets to take center stage.

## Colors
The palette is built on a foundation of neutral, earthy tones that mimic architectural materials. 

- **Background (#f2f4f3):** A warm, off-white "White Smoke" used to reduce the harshness of pure white while maintaining a high-end, gallery-like feel.
- **Primary (#22333b):** "Jet Black" is used exclusively for key structural elements, primary text, and high-priority actions.
- **Secondary (#a9927d):** "Dusty Taupe" provides a soft contrast for secondary actions, supporting icons, and decorative accents.
- **Borders (#c2b0a0):** A faint, refined taupe used to define spatial boundaries without interrupting the visual flow.

## Typography
The typography system pairs the technical, geometric character of **Space Grotesk** with the clean, approachable elegance of **Outfit**. 

- **Space Grotesk** is used for headlines and high-level metrics. Its distinctive terminals and geometric construction suggest innovation and architectural structure.
- **Outfit** serves as the primary workhorse for body copy and data entry. Its balanced proportions ensure legibility in dense property lists and financial reports.
- **Labels** utilize uppercase styling with increased letter spacing to provide a clear hierarchy for metadata and form titles.

## Layout & Spacing
The layout employs a **Fluid Grid** with an emphasis on "negative space as a feature." 

- **Desktop:** A 12-column grid with 48px outer margins creates a spacious, breathable canvas. Elements are often grouped in asymmetrical clusters to mimic editorial layouts.
- **Data Tables:** Tables utilize generous row heights (minimum 64px) and subtle 1px "Faint Taupe" dividers. 
- **Adaptation:** On mobile, margins tighten to 16px, and sidebars collapse into a minimalist bottom-drawer or hamburger menu to keep the focal point on essential asset data.

## Elevation & Depth
In keeping with the minimalist philosophy, this design system avoids heavy shadows. 

- **Tonal Layering:** Depth is achieved through color contrast. The background is "White Smoke," while active containers or cards use pure white (#ffffff). 
- **Outlines:** Low-contrast borders in "Faint Taupe" define interactive areas. 
- **Hover States:** When an element is focused, a subtle shift in background color (from white to a very light taupe tint) or a hairline 2px "Jet Black" border is used instead of a shadow to signify lift.

## Shapes
The shape language is primarily **Soft (0.25rem)**, providing just enough curvature to feel modern without losing the professional "edge" required for enterprise software. 

- **Standard Elements:** Buttons, input fields, and cards use a 4px corner radius.
- **Pill Badges:** Status indicators (e.g., "Occupied," "Maintenance") deviate from the standard radius to use a fully rounded "Pill" shape, making them instantly recognizable as distinct data points within a grid.

## Components
- **Buttons:** Primary buttons are "Jet Black" with white text. Secondary buttons are outlined in "Faint Taupe" with "Jet Black" text. All buttons use 12px vertical and 24px horizontal padding.
- **Status Badges:** Pill-shaped with a light tint of the status color (e.g., light sage for "Active") and dark text. They should never have borders.
- **Input Fields:** Minimalist design with only a bottom border in "Faint Taupe." On focus, the border transitions to "Jet Black" with a 1px thickness.
- **Data Tables:** Sleek, borderless on the sides. Headers are in "Outfit" Bold, uppercase, 12px. Rows have a subtle hover effect.
- **Cards:** Pure white background, 4px border radius, and a 1px "Faint Taupe" border. No shadow.
- **Property Hero:** Large-scale imagery framed with "Jet Black" borders, used in property detail views to ground the minimalist interface.