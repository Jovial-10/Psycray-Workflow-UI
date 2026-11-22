---
version: 1
slug: "src-pages-icpstudiopage-tsx"
primary_target: "src/pages/IcpStudioPage.tsx"
related_targets: ["src/components/icp","src/lib/scoring"]
---

# ICP Studio

Scope: `/icp`, the configurable ICP editor, inside the established shell and
DESIGN.md. Visitor mode: **Operate**. Build path: code-led.

Audience and task: Psycray sales leads and admins tuning what "a good fit"
means. Adjust weights, baseline, criteria and hard requirements; see what the
change does to a real saved company before committing; publish a new
immutable version; then recalculate saved companies from stored evidence
(never re-running research). Anyone can view and preview; only a named admin
key can publish or recalculate everything.

Content: the published versions from `GET /icp/config`, saved companies with
evidence from `GET /companies`, scoring by the shared engine
(`src/lib/scoring/icpEngine.ts`), so the preview is the same math the server
runs. User decisions: editor + sticky live preview; own nav item; publishing
offers recalculation but never runs it on its own.

States: loading, load error, no admin key / signed in, unsaved changes, invalid
draft (publish blocked with reasons), publishing, publish conflict (409),
preview company without evidence (legacy), recalculation running and summary.

## Direction contract

THESIS: A calibration bench. The draft is an instrument being adjusted against
a known specimen (a real saved company), so every change shows its effect in
points before it can be published. It refuses the settings-form default of
fields and a Save button with no visible consequence.

OWN-WORLD: Inherits DESIGN.md: zinc ground, white or zinc-900 cards, 1px
hairlines, deep indigo only for Publish and focus, verdict badges for tiers,
Geist with tabular numerals, mono for domains and version labels.

STORY: The lead sees the live version and who published it, drags Digital
Opportunity up, watches the other unlocked weights rebalance with the change
spelled out, sees Basecamp's draft score move and which criterion caused it,
fixes a validation error, publishes with a note, then recalculates the saved
companies and reads the before/after summary.

FIRST VIEWPORT: Header row: active version label, published by/at, unsaved
badge, Versions, Reset, Publish. Left: Weights & baseline card (five slider
rows with number input, lock, contribution, total meter). Right, sticky:
Preview card with company select, Published → Draft score, tier badges and
cause list.

FORM: Shaped directly from the user's brief and answers (no roll; precisely
specified surface inside an established world); seed: none (pinned).
"Editor + live preview … Own nav item … Offer it right after publish".
Signature interaction: moving any weight or the baseline updates the preview
score and its configuration-vs-evidence breakdown on the same frame.

FINISH: unreviewed and undocumented is unfinished; this build ends with the
finish review, the verdict, and the DEVLOG.
