import type { CompanyResearchRecord } from "@/types/research"

/**
 * Centralized mock data. Every record mirrors a row in `company_research`.
 * Companies and domains are fictional (`.example` TLD) — do not treat any
 * of this as real research.
 */
export const mockCompanies: CompanyResearchRecord[] = [
  {
    id: 1,
    domain: "brightline-fabrication.example",
    status: "validated",
    updated_at: "2026-10-28T14:12:00.000Z",
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
    updated_at: "2026-10-21T09:40:00.000Z",
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
  {
    id: 3,
    domain: "harborview-association.example",
    status: "error/unreachable",
    updated_at: "2026-10-30T18:05:00.000Z",
    company_facts: null,
    research_signals: null,
    synthesized_research: null,
    sources: null,
    icp_score: null,
    icp_tier: null,
    icp_breakdown: null,
    account_brief: null,
  },
]
