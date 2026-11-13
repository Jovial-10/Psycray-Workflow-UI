# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

Psycray Corp's internal sales and business-development team. They research
prospective client companies before outreach: they submit a company, read
the findings, check how well it fits Psycray's ideal customer profile, and
decide whether to pursue it. The tool is internal, not customer-facing, and is
also demoed to Psycray stakeholders as the Phase 2 deliverable.

## Product Purpose

Turns the n8n "Psycray Research Agent" workflow into a usable application.
Users can research a company by name or domain, review an account brief, see
an explainable ICP score, check supporting sources, and revisit past research.
Success: someone opens a URL, researches a company, and makes a better-informed
decision about whether it is worth pursuing.

## Positioning

The research is evidence-backed and explainable. Every finding can be traced
to a source. Confirmed facts are kept separate from inferences, and unknown
data is shown as unknown, not as a failed criterion. The ICP score shows how
it was calculated instead of being a number an LLM made up.

## Operating Context

- Research is orchestrated by a self-hosted n8n instance (Elestio), using Exa
  and OpenAI. Results are cached in Neon Postgres for 30 days.
- A research run takes about 25 s fresh, or about 4 s from cache. It runs as an
  asynchronous job that the app checks on.
- Outcomes are: completed, cached, unreachable, not found, failed.
- The app will be hosted on Psycray's VPS behind an nginx reverse proxy.
  Secrets stay on the server.

## Capabilities and Constraints

- Live today: Company Research (submit, progress, results: profile, ICP
  scorecard, account brief, sources).
- Planned (Phase 2.1b): research history / saved companies, opening past
  briefs, access control, VPS deployment.
- Planned (Phase 2.2): configurable ICP criteria, weights and hard
  requirements, with recalculation. Different sales teams may adapt it.
- Optional (Phase 2.3): historical won/lost analysis suggesting ICP changes,
  always with human approval.
- Terminology: ICP tiers are High Fit (≥ 80), Moderate Fit (≥ 55), Low Fit,
  and Needs Review. Criteria are scored met / not met / unknown.
- Login is not built yet. The user shown in the shell is a placeholder.

## Brand Commitments

- Name: Psycray (Psycray Corp). No logo, wordmark or brand color exists yet.
  Use the name as a plain wordmark and do not invent a logo.

## Evidence on Hand

- Real research results produced through n8n for basecamp.com and zapier.com
  (in Neon). Use them for verification, not as marketing proof.
- Mock data in `src/mocks/` is fictional (`.example` domains) and must not be
  presented as real research.
- No testimonials, customers, metrics or case studies exist. Do not fabricate
  any.

## Product Principles

1. Evidence over assertion: show where every claim comes from.
2. Explain the score: the reasons matter as much as the number.
3. Unknown is not failure: missing data is labelled, never penalised silently.
4. Useful findings first: surface what helps a sales decision instead of
   dumping the full AI response.
5. Calm under failure: slow, failed or partial research gets a clear,
   recoverable state, never a blank page or a raw error.
