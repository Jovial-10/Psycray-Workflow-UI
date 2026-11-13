---
version: 1
slug: "src-pages-overviewpage-tsx"
primary_target: "src/pages/OverviewPage.tsx"
related_targets: ["src/lib/overview.ts","src/mocks/companies.ts"]
---

# Overview

Scope: the Overview route (`src/pages/OverviewPage.tsx`) inside the
established shell and design system (DESIGN.md). Visitor mode: **Operate**.
Build path: code-led.

Audience and task: Psycray sales/BD, opening the app at the start of a
session. They want to start a new lookup in one step and see, at a glance,
how many researched accounts are worth pursuing and what changed recently.

Content: every number is derived from the company records served by the API
layer, never hardcoded. Until the history endpoint exists, the records are the
fictional mock set, shown with a visible "Sample data" notice in both modes
(user decision). "Recently researched" means the last 7 days, with mock dates
generated relative to today. The research input hands off to Company Research
and starts the run immediately.

States: loading (skeleton metrics and rows), error (message and retry), empty
(no companies: one empty state with the research input still on top), and
populated.

## Direction contract

THESIS: A morning check-in, not a wall of charts. One action (research) and
four honest counts, then the evidence underneath them. It refuses the
analytics-template default of sparkline tiles, donut charts and gradient
hero numbers.

OWN-WORLD: Inherits DESIGN.md: zinc ground, white or zinc-900 cards, 1px
hairlines, deep-indigo only on the primary action, emerald / amber / red /
neutral fit badges, Geist with tabular numerals, Geist Mono for domains.

STORY: The user reads the platform in one line, researches a company from
right here, sees how many accounts are high-fit and their average score,
then scans the recent companies table and activity to pick one up.

FIRST VIEWPORT: A short welcome line, then a full-width research bar with the
input and the indigo "Research Company" button. Below it, the sample-data
notice, then four compact metric cards in one row (2×2 on tablet and phones).
Then the full-width Recent Companies table, and Recent Activity below it as
a one-line-per-event log of research requests and outcomes.
Amended 2026-11-12: the table and activity are stacked instead of side by
side, because the six columns the user required (request item 4) don't fit
beside activity with the sidebar open. Accepted by the user. Phones keep a
2×2 metric grid instead of a single column, since the numbers fit.

FORM: Shaped directly from the user's section list (no roll; precisely
specified surface inside an established world); seed: none (pinned). "Welcome
header … Prominent company research input … Compact metric cards … Recent
Companies table … Recent research activity … Helpful empty states". Signature
interaction: research hand-off, where typing a company and pressing Enter
lands on Company Research already running.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
