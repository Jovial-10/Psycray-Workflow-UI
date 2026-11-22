/**
 * Evidence fixtures modelled on real research runs.
 * Basecamp: n8n execution 40814 (2026-11-22). Its growth search returned
 * articles about Basecamp Research (biotech) and Basecamp Fitness, which
 * must not count as Basecamp's own growth.
 */
import type { NormalizeContext } from "../../src/lib/scoring/icpEngine.ts"

export const BASECAMP_SEARCH_RESULTS = [
  "https://www.fiercebiotech.com/biotech/ramping-3-biotechs-growing-workforce",
  "https://www.businesswire.com/news/home/basecamp-research-correction",
  "https://basecamp.com/agents",
  "https://www.prnewswire.com/news-releases/extraordinary-brands-acquires-basecamp-fitness",
  "https://techcrunch.com/2026/10/anthropic-nvidia-back-basecamp-research-140m",
]

export const basecampContext: NormalizeContext = {
  domain: "basecamp.com",
  researched_at: "2026-11-22T02:34:40.000Z",
  external_urls: BASECAMP_SEARCH_RESULTS,
  unknowns: ["Annual revenue", "Exact employee count"],
}

/** What the evidence classifier returns for basecamp.com. */
export const basecampClassification = {
  industry: {
    category: "saas",
    label: "Project management software",
    evidence: "Basecamp is a project management and team communication app",
    source: "https://basecamp.com",
  },
  employee_count_evidence: [
    { min: 70, max: 80, evidence: "Our team of about 75 people", source: "https://basecamp.com/about" },
  ],
  digital_needs: [
    {
      type: "system_integration",
      basis: "stated",
      evidence: "Bring your AI agents to Basecamp via a command line interface and API",
      source: "https://basecamp.com/agents",
    },
  ],
  growth_signals: [
    {
      type: "product_launch",
      date: "2026-03-25",
      about_target: true,
      evidence: "Basecamp opens to AI agents through a CLI",
      source_url: "https://basecamp.com/agents",
    },
    {
      type: "funding",
      date: "2026-10-14",
      about_target: false, // Basecamp Research, a biotech
      evidence: "Anthropic and Nvidia back Basecamp Research in $140m round",
      source_url: "https://techcrunch.com/2026/10/anthropic-nvidia-back-basecamp-research-140m",
    },
    {
      type: "acquisition",
      date: "2026-06-02",
      about_target: false, // Basecamp Fitness
      evidence: "Extraordinary Brands acquires Basecamp Fitness",
      source_url: "https://www.prnewswire.com/news-releases/extraordinary-brands-acquires-basecamp-fitness",
    },
  ],
  project_owners: [
    { type: "technical_leader", basis: "stated", evidence: "David Heinemeier Hansson, CTO", source: "https://basecamp.com/about" },
  ],
  hq_country: "United States",
}

/** A verified hiring signal found on a later refresh. */
export const basecampHiringSignal = {
  type: "hiring",
  date: "2026-11-02",
  about_target: true,
  evidence: "Basecamp is hiring two senior programmers",
  source_url: "https://basecamp.com/jobs",
}

/**
 * A consulting firm that SELLS TO software companies. Its customer list
 * mentions SaaS, but its own industry is professional services.
 */
export const consultancyClassification = {
  industry: {
    category: "professional_services",
    label: "IT consulting",
    evidence: "We help SaaS and software companies scale their teams",
    source: "https://northwind-advisory.example",
  },
  employee_count_evidence: [],
  digital_needs: [],
  growth_signals: [],
  project_owners: [],
  hq_country: null,
}

export const consultancyContext: NormalizeContext = {
  domain: "northwind-advisory.example",
  researched_at: "2026-11-20T12:00:00.000Z",
  external_urls: ["https://news.example/northwind"],
  unknowns: [],
}
