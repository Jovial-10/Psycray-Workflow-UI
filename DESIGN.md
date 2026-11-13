---
name: Psycray
description: Internal research instrument for judging how well a prospective company fits Psycray's ICP.
colors:
  deep-indigo: "oklch(0.45 0.17 274)"
  deep-indigo-dark: "oklch(0.54 0.16 274)"
  indigo-ring: "oklch(0.55 0.15 274)"
  indigo-ring-dark: "oklch(0.66 0.13 274)"
  on-primary: "oklch(1 0 0)"
  zinc-ground: "oklch(0.985 0 0)"
  card-white: "oklch(1 0 0)"
  zinc-wash: "oklch(0.967 0.001 286.375)"
  zinc-hairline: "oklch(0.92 0.004 286.32)"
  zinc-field-stroke: "oklch(0.871 0.006 286.286)"
  zinc-muted-ink: "oklch(0.552 0.016 285.938)"
  zinc-sidebar-ink: "oklch(0.37 0.013 285.805)"
  zinc-ink: "oklch(0.21 0.006 285.885)"
  zinc-night: "oklch(0.141 0.005 285.823)"
  zinc-night-surface: "oklch(0.21 0.006 285.885)"
  zinc-night-hairline: "oklch(0.274 0.006 286.033)"
  zinc-night-field-stroke: "oklch(0.37 0.013 285.805)"
  zinc-night-muted-ink: "oklch(0.705 0.015 286.067)"
  zinc-night-ink: "oklch(0.985 0 0)"
  fit-high: "oklch(0.596 0.145 163.225)"
  fit-high-ink: "oklch(0.432 0.095 166.913)"
  fit-high-soft: "oklch(0.979 0.021 166.113)"
  fit-high-border: "oklch(0.905 0.093 164.15)"
  fit-moderate: "oklch(0.666 0.179 58.318)"
  fit-moderate-ink: "oklch(0.473 0.137 46.201)"
  fit-moderate-soft: "oklch(0.987 0.022 95.277)"
  fit-moderate-border: "oklch(0.924 0.12 95.746)"
  fit-low: "oklch(0.577 0.245 27.325)"
  fit-low-ink: "oklch(0.444 0.177 26.899)"
  fit-low-soft: "oklch(0.971 0.013 17.38)"
  fit-low-border: "oklch(0.885 0.062 18.334)"
typography:
  headline:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.25rem"
    fontWeight: 600
    lineHeight: 1.4
    letterSpacing: "-0.025em"
  metric:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "2.25rem"
    fontWeight: 600
    lineHeight: 1.1
    fontFeature: "\"tnum\""
  metric-compact:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.5rem"
    fontWeight: 600
    lineHeight: 1.33
    letterSpacing: "-0.025em"
    fontFeature: "\"tnum\""
  title:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "15px"
    fontWeight: 600
    lineHeight: 1
    letterSpacing: "-0.025em"
  page-title:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 600
    lineHeight: 1.43
    letterSpacing: "-0.025em"
  body:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.43
    fontFeature: "\"cv11\", \"ss01\""
  nav:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "13.5px"
    fontWeight: 400
  label:
    fontFamily: "Geist Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.75rem"
    fontWeight: 500
    lineHeight: 1.33
  mono:
    fontFamily: "Geist Mono Variable, ui-monospace, SF Mono, Menlo, monospace"
    fontSize: "13px"
    fontWeight: 400
rounded:
  sm: "6px"
  md: "8px"
  lg: "10px"
  xl: "14px"
  full: "9999px"
spacing:
  xs: "4px"
  sm: "8px"
  md: "16px"
  card: "20px"
  section: "24px"
  gutter-desktop: "32px"
components:
  button-primary:
    backgroundColor: "{colors.deep-indigo}"
    textColor: "{colors.on-primary}"
    rounded: "{rounded.md}"
    padding: "8px 16px"
    height: "36px"
  button-outline:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.zinc-ink}"
    rounded: "{rounded.md}"
    padding: "0 12px"
    height: "32px"
  button-ghost-icon:
    textColor: "{colors.zinc-ink}"
    rounded: "{rounded.md}"
    size: "32px"
  input:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.zinc-ink}"
    rounded: "{rounded.md}"
    padding: "4px 12px"
    height: "36px"
  card:
    backgroundColor: "{colors.card-white}"
    textColor: "{colors.zinc-ink}"
    rounded: "{rounded.xl}"
    padding: "20px"
  badge-fit-high:
    backgroundColor: "{colors.fit-high-soft}"
    textColor: "{colors.fit-high-ink}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-fit-moderate:
    backgroundColor: "{colors.fit-moderate-soft}"
    textColor: "{colors.fit-moderate-ink}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-fit-low:
    backgroundColor: "{colors.fit-low-soft}"
    textColor: "{colors.fit-low-ink}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  badge-needs-review:
    backgroundColor: "{colors.zinc-wash}"
    textColor: "{colors.zinc-muted-ink}"
    rounded: "{rounded.full}"
    padding: "2px 8px"
  nav-item:
    textColor: "{colors.zinc-sidebar-ink}"
    rounded: "{rounded.md}"
    padding: "8px"
    height: "32px"
  nav-item-active:
    backgroundColor: "{colors.zinc-hairline}"
    textColor: "{colors.zinc-night}"
    rounded: "{rounded.md}"
  sidebar:
    backgroundColor: "{colors.zinc-ground}"
    width: "240px"
  sidebar-rail:
    width: "48px"
  header:
    backgroundColor: "{colors.zinc-ground}"
    height: "56px"
---

# Design System: Psycray

## Overview

**Creative North Star: "The Quiet Instrument"**

Psycray is an internal tool for operators: sales and business-development people who sit with it for long sessions, research a company, read the evidence and decide whether to pursue it. The interface behaves like a well-made measuring instrument. The chrome is near-monochrome zinc, so the few saturated marks on screen carry meaning: deep indigo says "act here", and emerald, amber and red give the fit verdict. Everything else stays out of the way.

Density is moderate and calm. Screens use dense type (14px body, 13px mono) on a generous container, with 1px hairlines rather than shadows separating surfaces. The system rejects the category default of gradient hero cards, glowing stat tiles and decorative charts; a number appears only when it was measured, and it is set in tabular figures.

The brand is the word "Psycray" in Geist semibold. No logo, wordmark or brand color exists, so none is invented.

**Key Characteristics:**
- Zinc neutrals in both themes; one deep-indigo accent reserved for primary actions, focus and the active nav icon.
- Fit tiers in semantic color: emerald High, amber Moderate, red Low, slate Needs Review, always as a tinted badge with a dot.
- Flat surfaces separated by a single 1px border; shadows only on overlays.
- Geist for UI, Geist Mono for domains and URLs, tabular numerals for every metric.
- Theme follows the OS, remembers an explicit choice, and is applied before first paint.

## Colors

A cool zinc grayscale carrying one restrained indigo and three verdict hues. Every color comes from CSS custom properties in `src/index.css`; components use the semantic Tailwind names (`bg-card`, `text-muted-foreground`, `bg-success-soft`), never raw palette classes.

### Primary
- **Deep Indigo** (`deep-indigo`, about #3c45b1; dark theme `deep-indigo-dark`, about #5462ca): the primary button fill, the active nav item's icon, text-selection tint (22% mix), the input caret, and chart series 1. It was lowered from indigo-600 after review flagged that as electric violet; the dark variant is lifted in lightness and slightly desaturated so it holds contrast on zinc-950.
- **Indigo Ring** (`indigo-ring` / `indigo-ring-dark`): focus rings, drawn at 50% opacity, 3px.

### Tertiary (verdict hues)
Each verdict hue has four roles: solid (dots and icons), ink (badge text), soft (badge fill), and border. In dark mode, soft and border become 12% and 28% alpha of the solid, and ink moves to the 300 step.
- **Verdict Emerald** (`fit-high`, emerald-600): High Fit (score of 80 or more), success.
- **Verdict Amber** (`fit-moderate`, amber-600): Moderate Fit (55 or more), warnings, the "Mock data" environment badge.
- **Verdict Red** (`fit-low`, red-600): Low Fit, errors, destructive actions.
- **Needs Review** uses the neutral muted pair (`zinc-wash` fill, `zinc-muted-ink` text and dot), never a hue.

### Neutral
- **Zinc Ground** (`zinc-ground`, #fafafa): the light page and sidebar background.
- **Card White** (`card-white`): cards, inputs and outline buttons in light mode.
- **Zinc Wash** (`zinc-wash`, zinc-100): muted, secondary and hover fills; score-bar tracks; segmented-control track.
- **Zinc Hairline** (`zinc-hairline`, zinc-200): every border and divider. At 60% alpha it is the light active nav fill.
- **Zinc Field Stroke** (`zinc-field-stroke`, zinc-300): input borders and the scrollbar thumb.
- **Zinc Muted Ink** (`zinc-muted-ink`, zinc-500): descriptions, metadata, placeholders, inactive header icons.
- **Zinc Ink** (`zinc-ink`, zinc-900): primary text in light mode; dark card surface.
- **Dark theme**: `zinc-night` ground (zinc-950), `zinc-night-surface` cards (zinc-900), `zinc-night-hairline` borders (zinc-800), `zinc-night-field-stroke` inputs (zinc-700), `zinc-night-muted-ink` (zinc-400), `zinc-night-ink` text (zinc-50).

### Named Rules
**The Meaningful Saturation Rule.** Chrome is monochrome. A saturated color on screen is either indigo (act here, focus, where you are) or a verdict hue. Nothing decorative is colored.

**The Verdict Palette Rule.** Emerald, amber and red mean High, Moderate and Low Fit (and success, warning, error). Never use them for decoration, and never show Needs Review or "unknown" in a verdict hue; unknown is not failure.

**The Semantic Token Rule.** Components reference semantic tokens only, so light and dark stay in step. A raw `bg-indigo-600` or `text-zinc-500` in a component is a bug.

## Typography

**Display Font:** none; the system has no display tier.
**Body Font:** Geist Variable (with ui-sans-serif, system-ui)
**Label/Mono Font:** Geist Mono Variable (with ui-monospace, SF Mono, Menlo)

**Character:** Geist is neutral and engineered, at home in dense operating screens; Geist Mono marks machine identifiers so a domain never reads as prose. The body enables character variants `cv11` and `ss01`.

### Hierarchy
- **Metric** (600, 2.25rem, tabular figures): the ICP score on a research result. The only large type in the product.
- **Compact metric** (600, 1.5rem, tabular figures): Overview metric cards, with a 13px muted label above and a 12px muted context line below.
- **Headline** (600, 1.25rem, tracking-tight): the researched company's name above its result.
- **Title** (600, 15px, line-height 1, tracking-tight): card titles; the "Psycray" wordmark uses the same size.
- **Page title** (600, 0.875rem): the page name in the 56px header, followed by the page's one-line description at 13px in muted ink (hidden below 768px).
- **Body** (400, 0.875rem): card content, definition lists, descriptions. Inputs use 1rem on mobile and 0.875rem from 768px.
- **Nav** (400, 13.5px; 500 when active): sidebar items.
- **Label** (500, 0.75rem): badges, captions, timestamps, criterion reasons.
- **Mono** (400, 13px): domains and source URLs.

Headings h1 to h3 balance their wrapping and track at -0.015em by default.

### Named Rules
**The Tabular Metric Rule.** Every number that is compared or scored (score, `20 / 20`, counts) uses `tabular-nums`, so columns of figures align.

**The Machine Identifier Rule.** Domains, URLs and IDs are set in Geist Mono; human language never is.

## Layout

The shell is a fixed sidebar plus a sticky header around a capped content column.

- **Sidebar:** 240px wide, collapsing to a 48px icon rail with a 150 ms ease-out width transition. The 48px width is where the 32px icon buttons center. It toggles with the header button or ⌘/Ctrl+B, and its state persists in the `sidebar_state` cookie for 7 days. Main nav sits at the top; Settings sits at the bottom above the user footer. Collapsed items show their label as a right-side tooltip.
- **Mobile (below 768px):** the sidebar becomes a 288px drawer with an explicit close button; choosing an item closes it.
- **Header:** 56px, sticky, with a bottom hairline on the page ground. It holds the sidebar toggle, a 16px vertical separator, the page title and description (both from `src/config/navigation.ts`, which drives nav and titles together), and the environment badge and theme toggle on the right.
- **Content:** capped at 1120px and centered, with 16px side padding and 24px top padding on mobile, 32px and 32px from 768px.
- **Rhythm:** 24px between page sections; 20px card padding and 20px between card header and content; 16px and 12px stacks inside cards; 4px and 8px for inline gaps.
- **Result grid:** from 1024px, a fluid main column plus a 20rem side column (profile beside score) with items aligned to the top, so a short card never stretches to match a tall one.
- A skip link ("Skip to content") is the first focusable element.

## Elevation & Depth

Flat. Depth comes from tone and a single 1px border: cards are white (light) or zinc-900 (dark) on a zinc-50 or zinc-950 ground, outlined in the hairline token. Cards carry no shadow. Shadows belong to overlays: the mobile drawer sheet (`shadow-lg`) and floating menus. The only other shadow is the hairline `shadow-xs` that shadcn puts on outline buttons, inputs and the selected segment of a segmented control, which reads as a lip rather than lift.

### Shadow Vocabulary
- **Control lip** (`box-shadow: 0 1px 2px 0 rgb(0 0 0 / 0.05)`): outline buttons, inputs, the selected segment.
- **Overlay** (`box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)`): the mobile navigation drawer.

### Named Rules
**The One Hairline Rule.** Containers are separated by exactly one 1px border in the hairline token. No card shadows, no double borders, no colored side stripes.

## Shapes

Radii derive from one base (`--radius`, 10px). Containers get the gently rounded 14px (`rounded-xl`) corner; controls (buttons, inputs, nav items, skeletons) get 8px (`rounded-md`); the avatar and empty-state icon tile get 10px; badges and score bars are fully rounded pills. Empty states reuse the container corner with a dashed border. The form language is soft rectangles throughout; nothing is sharp, nothing is circular except dots and bars.

## Components

### Buttons
Restrained and compact.
- **Shape:** 8px radius; 14px medium text; 16px icons with an 8px gap.
- **Primary:** deep indigo fill with white text; 36px tall (40px for the page's lead action, as on Research); hover drops to 90% opacity. One per view: the page's primary action, placed top-right of its first section.
- **Outline:** card-colored fill, 1px border, control lip; hover fills with the wash. Used for secondary actions such as "Refresh research".
- **Ghost icon:** 32px square, no fill until hover. Used for the theme toggle, sidebar toggle and drawer close; each has a tooltip and an aria-label.
- **Focus:** a 3px ring in indigo at 50%, with the border shifting to the ring color. **Disabled:** 50% opacity, no pointer events.

### Chips (badges)
- **Style:** a 12px medium pill with 2px by 8px padding and a 1px border.
- **Fit badge:** the soft verdict fill, verdict ink text and verdict border, led by a 6px solid dot (emerald, amber, red, or muted gray for Needs Review). The tier name is always written; color is never the only signal.
- **Outline neutral:** hairline border and muted text, for listing unknown or unavailable fields.
- **Environment:** the amber "Mock data" badge in the header is focusable and explains itself in a tooltip.

### Cards / Containers
- **Corner Style:** 14px.
- **Background:** card token (white, or zinc-900 in dark mode).
- **Shadow Strategy:** none; see Elevation & Depth.
- **Border:** 1px hairline.
- **Internal Padding:** 20px on all sides; 20px between header and content; the title is 15px semibold, with the description under it in muted 14px.

### Inputs / Fields
- **Style:** 36px tall, 8px radius, a 1px border in the field-stroke token, card fill (20% of the input token in dark mode), control lip, muted placeholder, indigo caret.
- **Focus:** the border becomes the ring color plus a 3px ring at 50%.
- **Error / Disabled:** `aria-invalid` turns the border red with a 20% red ring; disabled is 50% opacity with a not-allowed cursor.

### Navigation
- **Items:** 32px rows, 8px radius, 13.5px text with 16px Lucide icons and a 2px gap between rows. Inactive items use the sidebar ink (zinc-700, or zinc-400 in dark mode).
- **Hover / Active:** a soft accent fill (zinc-200 at 60% in light mode, zinc-900 in dark mode) with near-black text; the active item also goes medium weight and its icon turns indigo. Active is the only indigo in the sidebar.
- **Brand:** the "Psycray" word at 15px semibold, in a 56px header row that lines up with the app header. (The build also shows a "P" initial tile as a stand-in until Psycray supplies a logo; it is a placeholder, not a mark to reuse.)
- **Footer:** the placeholder user ("Psycray Team · Placeholder account") with a 32px initials avatar; when collapsed, the avatar is focusable and shows a tooltip.
- **Mobile:** a drawer (see Layout).

### Theme control
The header toggle switches light and dark in one click (sun and moon icons). Settings > Appearance offers a three-way segmented control (Light, Dark, System): a wash track with a 2px inset, 32px segments, and the selected segment raised to card fill with the control lip. "System" clears the stored choice. The preference lives in localStorage under `psycray-theme`, and a pre-paint script in `index.html` applies the `dark` class before React mounts.

### ICP Scorecard (signature)
The score sits in 36px tabular semibold, then "/ 100" in muted ink, with the fit badge right-aligned on the same line. Each criterion row shows its name, then `score / max` right-aligned in tabular muted figures; a 6px pill bar on the wash track, filled at 80% foreground (never a verdict hue); and a 12px caption of status and reason. An unknown criterion shows "—", leaves an empty bar, and italicizes "Unknown".

### Empty state
A dashed-border 14px container on a 50% card fill, with 56px vertical padding: a 40px bordered icon tile, a 16px semibold one-line title, a muted explanation, and at most one action button.

### Loading skeleton
Pulse blocks in the accent wash with an 8px radius, laid out in the same grid as the result they stand in for.

## Do's and Don'ts

### Do:
- **Do** reference semantic tokens (`bg-card`, `text-muted-foreground`, `border-success-border`) so both themes stay correct.
- **Do** keep indigo to the primary action, focus rings and the active nav icon.
- **Do** show fit tiers with `FitBadge`: soft verdict fill, a dot, and the tier written out.
- **Do** separate surfaces with one 1px hairline and 14px corners; keep controls at 8px.
- **Do** set domains and URLs in Geist Mono at 13px, and every compared number in tabular figures.
- **Do** add new pages to `src/config/navigation.ts` with a one-line description; the header reads its title from there.
- **Do** give every icon-only control an aria-label and a tooltip.
- **Do** honor reduced motion; the global rule already shortens transitions and animations to 0.01 ms.

### Don't:
- **Don't** put shadows on cards or other in-flow surfaces; shadows are for overlays.
- **Don't** use emerald, amber or red for anything except verdicts and status, and don't color Needs Review or unknown data as failure.
- **Don't** use gradient hero cards, glowing stat tiles or decorative charts.
- **Don't** invent a logo or a brand color for Psycray; the brand is the word.
- **Don't** use raw Tailwind palette classes (`bg-indigo-600`, `text-zinc-500`) inside components.
- **Don't** present mock data as real; keep the amber "Mock data" badge visible whenever the API runs in mock mode.
