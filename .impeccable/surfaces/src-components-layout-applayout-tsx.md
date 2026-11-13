---
version: 1
slug: "src-components-layout-applayout-tsx"
primary_target: "src/components/layout/AppLayout.tsx"
related_targets: ["src/index.css","src/components/layout"]
---

# App shell

Scope: the application shell shared by every route (sidebar, mobile drawer,
header) and the design tokens and base components every page builds on.
Visitor mode: **Operate**. Build path: code-led.

Audience and task: Psycray's internal sales/BD team, at office desks during
working hours, moving between researching a company, reading briefs and
reviewing saved accounts. They need fast wayfinding, dense but calm screens,
and fit tiers they can read at a glance. They use it for long sessions, so the
app follows the OS theme and remembers the user's toggle.

Constraints: preserve the Phase 1 architecture (`config/navigation.ts` drives
both navs, `router.tsx`, pages, services). No full dashboard content yet. No
logo exists: the brand is the word "Psycray". The user in the footer is a
labelled placeholder until login is built.

## Direction contract

THESIS: A quiet instrument for judging fit. Chrome stays near-monochrome so the
only saturated color on screen means something: indigo for "act here", and
emerald / amber / red for fit verdicts. It refuses the category default of
gradient hero cards, glowing stat tiles and decorative charts.

OWN-WORLD: Zinc neutrals (light: zinc-50 ground, white cards, zinc-200 hairlines;
dark: zinc-950 ground, zinc-900 surfaces, zinc-800 hairlines). One deep-indigo
accent (light #3c45b1, dark #5462ca; lowered from indigo-600 after
finish review flagged it as electric violet). Semantic fit colors as tinted badges with a dot. Geist for UI, Geist
Mono for domains and IDs, tabular numerals for every metric. 1px borders,
rounded-xl containers, shadow only on overlays.

STORY: The user always knows where they are (active nav, page title in the
header), can hide the sidebar to get room, switch theme in one click, and on
a phone reach every section through a drawer.

FIRST VIEWPORT: Left, a 240px sidebar: "Psycray" wordmark on top, five Lucide
nav items, the placeholder user at the bottom. It collapses to a 48px icon
rail with tooltips (amended from 56px: 48px is the rail width at which
shadcn's 32px icon buttons center; accepted by the user 2026-11-12). Top, a 56px header strip: collapse toggle, page title and
one-line description, theme toggle on the right. The content column is capped
at 1120px, with the page's primary action top-right of its first section.

FORM: Pinned whole by the brief; seed: none (pinned). "Sophisticated, minimal,
premium enterprise SaaS aesthetic … Subtle 1px borders, restrained shadows,
rounded-xl containers … Dark mode: Near-black/charcoal backgrounds:
zinc-950 … Restrained deep indigo or slate-blue for primary actions … Geist
or Inter". Signature interaction: the sidebar collapses to a rail with a
150 ms ease-out width transition, and the choice is remembered.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
