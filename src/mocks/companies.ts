import type {
  CompanyResearchRecord,
  CustomerType,
  IcpCriterionScore,
  IcpTier,
} from "@/types/research"
import { ago } from "./time"

/**
 * Centralized mock data. Every record mirrors a row in `company_research`.
 * Companies and domains are fictional (`.example` TLD) — do not treat any
 * of this as real research.
 *
 * Dates are relative to page load so "recent" metrics stay realistic.
 * Scores are built from the same criteria and points as the n8n
 * "ICP Scoring Logic" node, so score, tier and breakdown always agree.
 */


interface Criteria {
  /** 35 = SaaS/technology, 30 = manufacturing/industrial/logistics, 0 = other */
  industry: 35 | 30 | 0
  digital: boolean
  growth: boolean
}

/** Mirrors the n8n scoring node: baseline 20 + criteria, tiers at 80 / 55. */
function score({ industry, digital, growth }: Criteria) {
  const breakdown: IcpCriterionScore[] = [
    { criterion: "Baseline", score: 20, max: 20, status: "met", reason: "Starting score for every researched company" },
    {
      criterion: "Industry Fit",
      score: industry,
      max: 35,
      status: industry ? "met" : "not_met",
      reason:
        industry === 35
          ? "Core vertical: SaaS/Technology"
          : industry === 30
            ? "Target vertical: Manufacturing/Industrial/Logistics"
            : "Not in a core or target vertical",
    },
    {
      criterion: "Digital Opportunity",
      score: digital ? 25 : 0,
      max: 25,
      status: digital ? "met" : "not_met",
      reason: digital ? "Workflow, automation, portal or integration need found" : "No workflow or integration need found",
    },
    {
      criterion: "Growth Signals",
      score: growth ? 20 : 0,
      max: 20,
      status: growth ? "met" : "not_met",
      reason: growth ? "Growth, hiring, funding or partnership signals found" : "No growth signals found",
    },
  ]
  const total = breakdown.reduce((sum, c) => sum + c.score, 0)
  const tier: IcpTier = total >= 80 ? "High Fit" : total >= 55 ? "Moderate Fit" : "Low Fit"
  return { icp_score: total, icp_tier: tier, icp_breakdown: breakdown }
}

interface MockCompany {
  id: number
  name: string
  domain: string
  daysAgo: number
  summary: string
  industries: string[]
  products: string[]
  hq: string
  customers?: CustomerType[]
  technologies?: string[]
  /** Omit for "Needs Review" (synthesis was not valid JSON). */
  criteria?: Criteria
}

/** Compact builder for the bulk of the mock set. */
function company(c: MockCompany): CompanyResearchRecord {
  const site = `https://${c.domain}`
  const scoring = c.criteria
    ? score(c.criteria)
    : { icp_score: null, icp_tier: "Needs Review" as const, icp_breakdown: [] }
  return {
    id: c.id,
    domain: c.domain,
    status: "validated",
    updated_at: ago(c.daysAgo),
    company_facts: {
      company_name: c.name,
      value_proposition: c.summary,
      products_and_services: c.products,
      target_industries: c.industries,
      customer_types: c.customers ?? ["B2B"],
      headquarters_locations: [c.hq],
      detected_technologies: c.technologies ?? [],
    },
    research_signals: { results: [] },
    synthesized_research: {
      company_name: c.name,
      domain: c.domain,
      summary: c.summary,
      confirmed_facts: [{ fact: c.summary, source: site }],
      reasonable_inferences: [],
      unknowns: ["Employee count", "Annual revenue"],
      recent_signals: [],
    },
    sources: { urls: [site] },
    ...scoring,
    account_brief: `Company Summary\n${c.summary}`,
  }
}

/** A domain the workflow could not reach. */
function unreachable(id: number, domain: string, daysAgo: number): CompanyResearchRecord {
  return {
    id,
    domain,
    status: "error/unreachable",
    updated_at: ago(daysAgo),
    company_facts: null,
    research_signals: null,
    synthesized_research: null,
    sources: null,
    icp_score: null,
    icp_tier: null,
    icp_breakdown: null,
    account_brief: null,
  }
}

export const mockCompanies: CompanyResearchRecord[] = [
  {
    id: 1,
    domain: "brightline-fabrication.example",
    status: "validated",
    updated_at: ago(0.2),
    company_facts: {
      company_name: "Brightline Fabrication",
      value_proposition:
        "Precision sheet-metal fabrication and assembly for OEMs with short lead times.",
      products_and_services: ["Laser cutting", "CNC bending", "Powder coating", "Kitting"],
      target_industries: ["Industrial equipment", "HVAC", "Agriculture"],
      customer_types: ["B2B"],
      headquarters_locations: ["Fort Wayne, IN"],
      detected_technologies: ["WordPress", "HubSpot"],
    },
    research_signals: {
      results: [
        {
          title: "Brightline Fabrication opens second production facility",
          url: "https://news.example/brightline-second-facility",
        },
        {
          title: "Brightline hiring ERP integration specialist",
          url: "https://jobs.example/brightline-erp-specialist",
        },
      ],
    },
    synthesized_research: {
      company_name: "Brightline Fabrication",
      domain: "brightline-fabrication.example",
      summary:
        "Mid-sized industrial supplier expanding capacity; quoting and order intake appear manual.",
      confirmed_facts: [
        {
          fact: "Offers laser cutting, CNC bending and powder coating.",
          source: "https://brightline-fabrication.example",
        },
        {
          fact: "Opened a second production facility in 2026.",
          source: "https://news.example/brightline-second-facility",
        },
      ],
      reasonable_inferences: [
        {
          inference: "Quote requests are handled through email and PDF forms.",
          basis: "Website 'Request a Quote' page links to a downloadable PDF.",
        },
      ],
      unknowns: ["Employee count", "Annual revenue", "Current ERP vendor"],
      recent_signals: [
        {
          signal: "Expansion to a second facility",
          source_url: "https://news.example/brightline-second-facility",
          date: "2026-09-14",
        },
        {
          signal: "Hiring for ERP integration",
          source_url: "https://jobs.example/brightline-erp-specialist",
          date: null,
        },
      ],
    },
    sources: {
      urls: [
        "https://brightline-fabrication.example",
        "https://news.example/brightline-second-facility",
        "https://jobs.example/brightline-erp-specialist",
      ],
    },
    icp_score: 95,
    icp_tier: "High Fit",
    icp_breakdown: [
      { criterion: "Baseline", score: 20, max: 20, status: "met", reason: "Starting score for every researched company" },
      { criterion: "Industry Fit", score: 30, max: 35, status: "met", reason: "Target vertical: Manufacturing/Industrial/Logistics" },
      { criterion: "Digital Opportunity", score: 25, max: 25, status: "met", reason: "Workflow, automation, portal or integration need found" },
      { criterion: "Growth Signals", score: 20, max: 20, status: "met", reason: "Growth, hiring, funding or partnership signals found" },
    ],
    account_brief: `Account Brief: Brightline Fabrication

Company Summary
Precision sheet-metal fabricator serving OEMs. Recently opened a second facility and is hiring for ERP integration.

Potential Psycray Service Opportunities
- Customer quote portal replacing PDF request forms
- ERP ↔ CRM integration to support multi-site operations`,
  },
  {
    id: 2,
    domain: "ledgerloop.example",
    status: "validated",
    updated_at: ago(1.1),
    company_facts: {
      company_name: "LedgerLoop",
      value_proposition: "Accounts-payable automation for regional credit unions.",
      products_and_services: ["AP automation platform", "Vendor onboarding"],
      target_industries: ["Financial services"],
      customer_types: ["B2B", "Enterprise"],
      headquarters_locations: ["Columbus, OH"],
      detected_technologies: ["React", "Stripe", "Intercom"],
    },
    research_signals: {
      results: [
        {
          title: "LedgerLoop announces partnership with core banking provider",
          url: "https://news.example/ledgerloop-partnership",
        },
      ],
    },
    synthesized_research: {
      company_name: "LedgerLoop",
      domain: "ledgerloop.example",
      summary:
        "Early-stage SaaS company with an in-house engineering team; partnership suggests integration work ahead.",
      confirmed_facts: [
        {
          fact: "Sells an AP automation platform to credit unions.",
          source: "https://ledgerloop.example",
        },
      ],
      reasonable_inferences: [
        {
          inference: "May need extra capacity for partner integrations.",
          basis: "New core-banking partnership announced in October 2026.",
        },
      ],
      unknowns: ["Engineering headcount", "Funding stage"],
      recent_signals: [
        {
          signal: "Core banking partnership",
          source_url: "https://news.example/ledgerloop-partnership",
          date: "2026-10-02",
        },
      ],
    },
    sources: {
      urls: ["https://ledgerloop.example", "https://news.example/ledgerloop-partnership"],
    },
    icp_score: 75,
    icp_tier: "Moderate Fit",
    icp_breakdown: [
      { criterion: "Baseline", score: 20, max: 20, status: "met", reason: "Starting score for every researched company" },
      { criterion: "Industry Fit", score: 35, max: 35, status: "met", reason: "Core vertical: SaaS/Technology" },
      { criterion: "Digital Opportunity", score: 0, max: 25, status: "not_met", reason: "No workflow or integration need found" },
      { criterion: "Growth Signals", score: 20, max: 20, status: "met", reason: "Growth, hiring, funding or partnership signals found" },
    ],
    account_brief: `Account Brief: LedgerLoop

Company Summary
SaaS platform automating accounts payable for credit unions. A new core-banking partnership points to near-term integration work.`,
  },
  unreachable(3, "harborview-association.example", 2.4),
  company({
    id: 4,
    name: "Cobalt Ridge Software",
    domain: "cobaltridge.example",
    daysAgo: 0.08,
    summary: "Field-service scheduling SaaS for HVAC contractors; recently raised a Series A and is hiring integration engineers.",
    industries: ["Software", "HVAC services"],
    products: ["Dispatch scheduling", "Technician mobile app"],
    hq: "Madison, WI",
    technologies: ["React", "Twilio", "QuickBooks API"],
    criteria: { industry: 35, digital: true, growth: true },
  }),
  company({
    id: 5,
    name: "Northgate Logistics",
    domain: "northgate-logistics.example",
    daysAgo: 3.2,
    summary: "Regional 3PL running warehouse intake on spreadsheets and email; customer portal requests mentioned on site.",
    industries: ["Logistics", "Warehousing"],
    products: ["Contract warehousing", "Last-mile delivery"],
    hq: "Indianapolis, IN",
    technologies: ["WordPress"],
    criteria: { industry: 30, digital: true, growth: false },
  }),
  company({
    id: 6,
    name: "Saltmarsh Creative",
    domain: "saltmarsh.example",
    daysAgo: 2.1,
    summary: "Brand and web agency adding a development practice; partnering with a headless CMS vendor.",
    industries: ["Marketing agencies"],
    products: ["Brand strategy", "Website design"],
    hq: "Charleston, SC",
    technologies: ["Webflow", "HubSpot"],
    criteria: { industry: 0, digital: true, growth: true },
  }),
  company({
    id: 7,
    name: "Pinecrest Dental Group",
    domain: "pinecrestdental.example",
    daysAgo: 4.5,
    summary: "Multi-location dental practice opening two new offices this year.",
    industries: ["Healthcare"],
    products: ["General dentistry", "Orthodontics"],
    hq: "Boise, ID",
    customers: ["B2C"],
    criteria: { industry: 0, digital: false, growth: true },
  }),
  company({
    id: 8,
    name: "Quarry Lane Outfitters",
    domain: "quarrylane.example",
    daysAgo: 5.7,
    summary: "Outdoor gear retailer with a small wholesale program.",
    industries: ["Retail"],
    products: ["Outdoor apparel", "Camping gear"],
    hq: "Bend, OR",
    customers: ["B2C", "B2B"],
  }),
  unreachable(9, "bluewater-events.example", 8.3),
  company({
    id: 10,
    name: "Meridian Valve & Supply",
    domain: "meridianvalve.example",
    daysAgo: 9.4,
    summary: "Industrial valve distributor whose distributor ordering still runs through fax and PDF forms.",
    industries: ["Industrial supply", "Oil & gas"],
    products: ["Industrial valves", "Actuation"],
    hq: "Tulsa, OK",
    technologies: ["Epicor"],
    criteria: { industry: 30, digital: true, growth: false },
  }),
  company({
    id: 11,
    name: "Tallgrass Analytics",
    domain: "tallgrass.example",
    daysAgo: 12.2,
    summary: "Agronomy analytics SaaS that needs integrations with farm-equipment telemetry platforms.",
    industries: ["Software", "Agriculture"],
    products: ["Yield analytics", "Field reporting"],
    hq: "Ames, IA",
    technologies: ["Python", "AWS"],
    criteria: { industry: 35, digital: true, growth: false },
  }),
  company({
    id: 12,
    name: "Ironwood Packaging",
    domain: "ironwoodpack.example",
    daysAgo: 15.6,
    summary: "Corrugated packaging manufacturer with a modern ERP and an in-house IT team.",
    industries: ["Manufacturing", "Packaging"],
    products: ["Corrugated boxes", "Custom displays"],
    hq: "Dayton, OH",
    technologies: ["SAP Business One"],
    criteria: { industry: 30, digital: false, growth: false },
  }),
  company({
    id: 13,
    name: "Fieldstone Credit Union",
    domain: "fieldstonecu.example",
    daysAgo: 20.3,
    summary: "Community credit union with core-banking vendor tooling and no visible custom software needs.",
    industries: ["Financial services"],
    products: ["Consumer banking", "Auto loans"],
    hq: "Lansing, MI",
    customers: ["B2C"],
    criteria: { industry: 0, digital: false, growth: false },
  }),
  company({
    id: 14,
    name: "Copperline Robotics",
    domain: "copperline.example",
    daysAgo: 26.8,
    summary: "Builds palletizing robots and software; expanding into Mexico and hiring for systems integration.",
    industries: ["Industrial automation", "Robotics"],
    products: ["Palletizing cells", "Fleet software"],
    hq: "Grand Rapids, MI",
    technologies: ["ROS", "Azure IoT"],
    criteria: { industry: 35, digital: true, growth: true },
  }),
]
