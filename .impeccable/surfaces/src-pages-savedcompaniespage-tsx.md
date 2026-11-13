---
version: 1
slug: "src-pages-savedcompaniespage-tsx"
primary_target: "src/pages/SavedCompaniesPage.tsx"
related_targets: ["src/pages/CompanyDetailPage.tsx","src/components/companies"]
---

# Saved Companies and Company page

Scope: `/companies` (searchable list of every saved research record) and
`/companies/:domain` (one company's saved research), inside the established
shell and DESIGN.md. Visitor mode: **Operate**. Build path: code-led.

Audience and task: Psycray sales/BD coming back to research they or a
colleague already ran. Find a company fast, see its fit and when it was last
researched, open the saved result without spending a new run, and refresh it
when it's stale. Phase 2.1 requires that saved research is read from the
database, not re-run.

Content: real rows from `GET /companies` in live mode (validated and
unreachable). The company page finds its record in that list (there is no
single-record endpoint yet). User decisions: dedicated page per company,
reached from both this list and Overview's table; search, fit-tier filter and
sort; unreachable domains listed with "Try again".

States: loading, error and retry, no research at all, a filter that matches
nothing (with clear filters), and a company that isn't found.

## Direction contract

THESIS: A ledger of decisions already paid for. Every row is research that
cost a run, so the list makes reopening cheap and obvious and keeps a re-run
deliberate. It refuses the CRM default of a dense grid with a dozen columns
and bulk actions nobody asked for.

OWN-WORLD: Inherits DESIGN.md: zinc ground, white or zinc-900 surfaces, 1px
hairlines, deep indigo only for the one primary action per screen,
emerald / amber / red / neutral fit badges, Geist with tabular numerals,
Geist Mono for domains.

STORY: The user types part of a name, narrows by fit tier, sorts by score or
date, and clicks a row to land on that company's saved result. There they see
how old it is and can Refresh. A failed domain sits in the list with Try again
instead of vanishing.

FIRST VIEWPORT: List: a one-line count summary, then a toolbar (search input,
tier filter chips, sort select), then a full-width table: Company (domain
under it when narrow), Industry, ICP, Fit or status, Researched. Whole rows
are links. Company page: a back link to Saved Companies, then the existing
research result layout (name, domain, saved date and Refresh top right,
profile beside scorecard, brief, sources).

FORM: Shaped directly from the user's answers and Phase 2.1's history
requirement (no roll; precisely specified surface inside an established
world); seed: none (pinned). "Search, Filter by fit tier, Sort … Its own page
… Listed with a 'Try again'". Signature interaction: the filter state lives in
the URL, so a filtered list is shareable and Back returns to it.

FINISH: unreviewed and undocumented is unfinished; this build ends with the finish review, the verdict, DESIGN.md, and every shipping raster carrying its provenance
