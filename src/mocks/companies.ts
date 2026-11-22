import {
  evaluate,
  normalizeEvidence,
  toSummary,
  type Basis,
  type DigitalNeedType,
  type GrowthSignalType,
  type IcpEvidence,
  type IndustryCategory,
  type OwnerType,
} from "@/lib/scoring/icpEngine"
import { parseStoredBreakdown } from "@/services/api/schemas"
import type { CompanyResearchRecord, CustomerType, IcpTier } from "@/types/research"
import { ago } from "./time"

/**
 * Centralized mock data. Every record mirrors a row in `company_research`.
 * Companies and domains are fictional (`.example` TLD) — do not treat any
 * of this as real research.
 *
 * Dates are relative to page load so "recent" metrics stay realistic.
 * Scores come from the same engine n8n runs (src/lib/scoring/icpEngine.ts),
 * fed with fictional evidence, so score, tier and breakdown always agree.
 */


/** Fictional evidence for one mock company, in the classifier's terms. */
interface EvidenceSpec {
  category: IndustryCategory | null
  employees?: number
  digital?: { type: DigitalNeedType; basis: Basis; text: string }
  growth?: { type: GrowthSignalType; text: string; daysAgo: number | null }[]
  owner?: { type: OwnerType; basis: Basis; text: string }
}

/** Normalised evidence per mock domain, for the mock "Recalculate score". */
export const mockEvidence = new Map<string, IcpEvidence>()

function buildEvidence(domain: string, daysAgo: number, spec: EvidenceSpec): IcpEvidence {
  const site = `https://${domain}`
  const growth = (spec.growth ?? []).map((g, i) => ({
    type: g.type,
    date: g.daysAgo === null ? null : ago(g.daysAgo).slice(0, 10),
    about_target: true,
    evidence: g.text,
    source_url: `https://news.example/${domain.split(".")[0]}-${g.type}-${i}`,
  }))
  return normalizeEvidence(
    {
      industry: spec.category && { category: spec.category, label: "", evidence: "From the company website", source: site },
      employee_count_evidence: spec.employees
        ? [{ value: spec.employees, evidence: `About ${spec.employees} employees`, source: `${site}/about` }]
        : [],
      digital_needs: spec.digital ? [{ ...spec.digital, evidence: spec.digital.text, source: site }] : [],
      growth_signals: growth,
      project_owners: spec.owner ? [{ ...spec.owner, evidence: spec.owner.text, source: `${site}/about` }] : [],
    },
    {
      domain,
      researched_at: ago(daysAgo),
      external_urls: growth.map((g) => g.source_url),
      unknowns: ["Annual revenue"],
    },
  )
}

/**
 * Scores mock evidence with the real engine. `previous` simulates an earlier
 * research run, so the scorecard can show a before/after change.
 */
function scored(id: number, domain: string, daysAgo: number, spec: EvidenceSpec, previous?: EvidenceSpec) {
  const prior = previous
    ? evaluate(buildEvidence(domain, daysAgo + 14, previous), {
        snapshot_id: `mock-${id}-a`,
        calculated_at: ago(daysAgo + 14),
      })
    : null
  const evidence = buildEvidence(domain, daysAgo, spec)
  mockEvidence.set(domain, evidence)
  const result = evaluate(evidence, {
    snapshot_id: `mock-${id}`,
    calculated_at: ago(daysAgo),
    previous: prior && toSummary(prior),
  })
  const { criteria, scoring } = parseStoredBreakdown(result)
  return { icp_score: result.score, icp_tier: result.tier as IcpTier, icp_breakdown: criteria, icp_scoring: scoring }
}

interface MockCompany {
  id: number
  name: string
  domain: string
  /** The company's own industry. */
  industry: string
  daysAgo: number
  summary: string
  industries: string[]
  products: string[]
  hq: string
  customers?: CustomerType[]
  technologies?: string[]
  evidence: EvidenceSpec
}

/** Compact builder for the bulk of the mock set. */
function company(c: MockCompany): CompanyResearchRecord {
  const site = `https://${c.domain}`
  const scoring = scored(c.id, c.domain, c.daysAgo, c.evidence)
  return {
    id: c.id,
    domain: c.domain,
    status: "validated",
    updated_at: ago(c.daysAgo),
    company_facts: {
      company_name: c.name,
      industry: c.industry,
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
    icp_scoring: null,
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
      industry: "Metal fabrication",
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
    ...scored(
      1,
      "brightline-fabrication.example",
      0.2,
      {
        category: "manufacturing",
        employees: 85,
        digital: { type: "customer_portal", basis: "stated", text: "Quote requests are submitted as a downloadable PDF form" },
        growth: [
          { type: "expansion", text: "Opened a second production facility", daysAgo: 68 },
          { type: "hiring", text: "Hiring an ERP integration specialist", daysAgo: 12 },
        ],
        owner: { type: "operations_leader", basis: "stated", text: "Dana Ruiz, VP of Operations" },
      },
      {
        // The earlier run had not found the hiring signal yet
        category: "manufacturing",
        employees: 85,
        digital: { type: "customer_portal", basis: "stated", text: "Quote requests are submitted as a downloadable PDF form" },
        growth: [{ type: "expansion", text: "Opened a second production facility", daysAgo: 68 }],
        owner: { type: "operations_leader", basis: "stated", text: "Dana Ruiz, VP of Operations" },
      },
    ),
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
      industry: "Financial software",
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
    ...scored(2, "ledgerloop.example", 1.1, {
      category: "saas",
      employees: 30,
      growth: [{ type: "partnership", text: "Partnership with a core banking provider", daysAgo: 50 }],
      owner: { type: "in_house_engineering", basis: "stated", text: "In-house engineering team" },
    }),
    account_brief: `Account Brief: LedgerLoop

Company Summary
SaaS platform automating accounts payable for credit unions. A new core-banking partnership points to near-term integration work.`,
  },
  unreachable(3, "harborview-association.example", 2.4),
  company({
    id: 4,
    name: "Cobalt Ridge Software",
    industry: "Field-service software",
    domain: "cobaltridge.example",
    daysAgo: 0.08,
    summary: "Field-service scheduling SaaS for HVAC contractors; recently raised a Series A and is hiring integration engineers.",
    industries: ["Software", "HVAC services"],
    products: ["Dispatch scheduling", "Technician mobile app"],
    hq: "Madison, WI",
    technologies: ["React", "Twilio", "QuickBooks API"],
    evidence: {
      category: "saas",
      employees: 42,
      digital: { type: "system_integration", basis: "stated", text: "Hiring integration engineers" },
      growth: [
        { type: "funding", text: "Raised a Series A", daysAgo: 40 },
        { type: "hiring", text: "Hiring integration engineers", daysAgo: 9 },
      ],
      owner: { type: "technical_leader", basis: "stated", text: "Priya Shah, CTO" },
    },
  }),
  company({
    id: 5,
    name: "Northgate Logistics",
    industry: "Third-party logistics",
    domain: "northgate-logistics.example",
    daysAgo: 3.2,
    summary: "Regional 3PL running warehouse intake on spreadsheets and email; customer portal requests mentioned on site.",
    industries: ["Logistics", "Warehousing"],
    products: ["Contract warehousing", "Last-mile delivery"],
    hq: "Indianapolis, IN",
    technologies: ["WordPress"],
    evidence: {
      category: "logistics",
      employees: 120,
      digital: { type: "customer_portal", basis: "stated", text: "Customers ask for a shipment-tracking portal" },
    },
  }),
  company({
    id: 6,
    name: "Saltmarsh Creative",
    industry: "Creative agency",
    domain: "saltmarsh.example",
    daysAgo: 2.1,
    summary: "Brand and web agency adding a development practice; partnering with a headless CMS vendor.",
    industries: ["Marketing agencies"],
    products: ["Brand strategy", "Website design"],
    hq: "Charleston, SC",
    technologies: ["Webflow", "HubSpot"],
    evidence: {
      category: "agency",
      employees: 18,
      digital: { type: "custom_software", basis: "inferred", text: "Adding a development practice" },
      growth: [{ type: "partnership", text: "Partnering with a headless CMS vendor", daysAgo: 30 }],
    },
  }),
  company({
    id: 7,
    name: "Pinecrest Dental Group",
    industry: "Dental care",
    domain: "pinecrestdental.example",
    daysAgo: 4.5,
    summary: "Multi-location dental practice opening two new offices this year.",
    industries: ["Healthcare"],
    products: ["General dentistry", "Orthodontics"],
    hq: "Boise, ID",
    customers: ["B2C"],
    evidence: {
      category: "healthcare",
      employees: 140,
      growth: [{ type: "expansion", text: "Opening two new offices", daysAgo: 21 }],
    },
  }),
  company({
    id: 8,
    name: "Quarry Lane Outfitters",
    industry: "Outdoor retail",
    domain: "quarrylane.example",
    daysAgo: 5.7,
    summary: "Outdoor gear retailer with a small wholesale program.",
    industries: ["Retail"],
    products: ["Outdoor apparel", "Camping gear"],
    hq: "Bend, OR",
    customers: ["B2C", "B2B"],
    evidence: { category: "retail_consumer" },
  }),
  unreachable(9, "bluewater-events.example", 8.3),
  company({
    id: 10,
    name: "Meridian Valve & Supply",
    industry: "Industrial distribution",
    domain: "meridianvalve.example",
    daysAgo: 9.4,
    summary: "Industrial valve distributor whose distributor ordering still runs through fax and PDF forms.",
    industries: ["Industrial supply", "Oil & gas"],
    products: ["Industrial valves", "Actuation"],
    hq: "Tulsa, OK",
    technologies: ["Epicor"],
    evidence: {
      category: "industrial_supplier",
      employees: 60,
      digital: { type: "workflow_automation", basis: "stated", text: "Distributor orders arrive by fax and PDF" },
      owner: { type: "operations_leader", basis: "inferred", text: "Operations manager listed on the contact page" },
    },
  }),
  company({
    id: 11,
    name: "Tallgrass Analytics",
    industry: "Agricultural analytics software",
    domain: "tallgrass.example",
    daysAgo: 12.2,
    summary: "Agronomy analytics SaaS that needs integrations with farm-equipment telemetry platforms.",
    industries: ["Software", "Agriculture"],
    products: ["Yield analytics", "Field reporting"],
    hq: "Ames, IA",
    technologies: ["Python", "AWS"],
    evidence: {
      category: "saas",
      digital: { type: "system_integration", basis: "inferred", text: "Integrations with equipment telemetry platforms" },
    },
  }),
  company({
    id: 12,
    name: "Ironwood Packaging",
    industry: "Packaging manufacturing",
    domain: "ironwoodpack.example",
    daysAgo: 15.6,
    summary: "Corrugated packaging manufacturer with a modern ERP and an in-house IT team.",
    industries: ["Manufacturing", "Packaging"],
    products: ["Corrugated boxes", "Custom displays"],
    hq: "Dayton, OH",
    technologies: ["SAP Business One"],
    evidence: {
      category: "manufacturing",
      employees: 400,
      owner: { type: "in_house_engineering", basis: "stated", text: "In-house IT team" },
    },
  }),
  company({
    id: 13,
    name: "Fieldstone Credit Union",
    industry: "Credit union",
    domain: "fieldstonecu.example",
    daysAgo: 20.3,
    summary: "Community credit union with core-banking vendor tooling and no visible custom software needs.",
    industries: ["Financial services"],
    products: ["Consumer banking", "Auto loans"],
    hq: "Lansing, MI",
    customers: ["B2C"],
    evidence: { category: "financial_services", employees: 220 },
  }),
  company({
    id: 14,
    name: "Copperline Robotics",
    industry: "Industrial robotics",
    domain: "copperline.example",
    daysAgo: 26.8,
    summary: "Builds palletizing robots and software; expanding into Mexico and hiring for systems integration.",
    industries: ["Industrial automation", "Robotics"],
    products: ["Palletizing cells", "Fleet software"],
    hq: "Grand Rapids, MI",
    technologies: ["ROS", "Azure IoT"],
    evidence: {
      category: "manufacturing",
      employees: 210,
      digital: { type: "system_integration", basis: "stated", text: "Hiring for systems integration" },
      growth: [
        { type: "expansion", text: "Expanding into Mexico", daysAgo: 35 },
        { type: "hiring", text: "Hiring for systems integration", daysAgo: null },
      ],
      owner: { type: "technical_leader", basis: "stated", text: "VP of Engineering" },
    },
  }),
]

// Keep each mock company's scoring evidence with its research, as n8n saves it
for (const record of mockCompanies) {
  if (record.synthesized_research) record.synthesized_research.icp_evidence = mockEvidence.get(record.domain) ?? null
}
