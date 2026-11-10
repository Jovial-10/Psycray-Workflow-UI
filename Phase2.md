Phase 2 — Frontend, ICP Configuration & Historical Sales Intelligence
PROJECT OVERVIEW
With the core company research workflow in place, the next phase focuses on turning it into a usable application rather than a workflow that primarily operates inside n8n.
The goal is to build a frontend where someone can submit a company for research, review the findings, understand how the company was scored, and revisit previously researched companies.
We will also expand the ICP scoring system to support configurable criteria and explore how historical sales outcomes can help identify patterns associated with successful opportunities.
The immediate priority is Phase 2.1. Regardless of how far the remaining phases progress, the project should finish with a functional, hosted demo that can be accessed through a URL on Psycray's VPS.

PHASE 2.1 — FRONTEND / RESEARCH DASHBOARD
Goal: Build a functional React-based frontend that connects to the existing n8n research workflow and presents the results in a clean, usable interface.
React or Next.js would both be appropriate. Using AI-assisted development tools such as Antigravity is encouraged, particularly for frontend development, UI components, and testing.
The important part is that the interface works with the actual research workflow rather than simply displaying mock data.
Core Components
1. Company Research Input
Accept a company name or website domain.
Allow users to initiate a new research request.
Display research status, such as pending, researching, completed, or failed.
Provide useful feedback while research is running.
Prevent accidental duplicate submissions.
2. Account Brief / Company Profile
Display the research findings in a structured, readable format.
Include:
Company name, domain, description, and industry.
Company size, location, and other available business information.
Relevant technology/platform findings.
Recent news, hiring activity, growth indicators, and other research signals.
Potential business opportunities or reasons the company may be worth pursuing.
Suggested sales talking points or relevant decision-maker roles.
The interface should prioritize useful findings rather than simply displaying the entire AI-generated response.
3. ICP Scorecard
Display the company's overall qualification score along with an explanation of how it was calculated.
For example:
Criteria
Score
Maximum
Industry Fit
18
20
Company Size
12
15
Revenue Fit
8
15
Digital Opportunity
22
25
Growth Signals
15
25
Overall Fit
75
100

This is an illustrative example, not a required scoring model.
Users should be able to understand why a company received its score and which factors influenced it most.
Where information is missing, the interface should distinguish unavailable data from a company failing a criterion.
4. Research Sources & Evidence
Important findings should include supporting sources.
Where appropriate, display:
Source URL.
Research or publication date.
Confirmed vs. inferred findings.
Unknown or unavailable information.
Avoid presenting AI-generated assumptions as verified facts. Research claims should remain traceable to the evidence used to produce them.
5. Research History
Provide a way to view previously researched companies.
A sidebar, searchable company list, or dedicated history page would work.
Users should be able to:
Browse previous company research.
Open an existing Account Brief.
See when research was last performed.
Request updated research for an existing company.
Previously saved research should be retrieved from the database rather than triggering a new research request every time someone opens a company.
6. Basic Error Handling & Usability
Consider how the interface behaves when:
A company cannot be identified.
Research returns incomplete information.
An external API or MCP tool fails.
A research request takes longer than expected.
A company has already been researched.
The frontend should handle these scenarios gracefully rather than displaying an empty page or raw error response.
Integration & Hosting
The frontend should communicate with the existing n8n research workflow through an appropriate API/webhook integration.
The existing n8n workflow should remain responsible for research orchestration, MCP interactions, extraction, and other backend operations. The frontend should focus on initiating requests and presenting results.
Keep API keys, database credentials, and other sensitive information on the server side. Do not expose privileged n8n endpoints or third-party credentials directly through the browser.
The hosted application should also use appropriate access controls so internal company research and administrative functions are not publicly accessible without authorization.
The application will ultimately be deployed to Psycray's VPS, with access and deployment details provided separately.
Phase 2.1 Deliverable
A working, hosted application where someone can:
Enter a company name or domain.
Initiate a research request.
Review the resulting Account Brief.
See an explainable ICP scorecard.
Review supporting sources.
Browse previous research.
This is the primary milestone for Phase 2. The remaining enhancements should build on this interface without preventing it from becoming a usable demo.

PHASE 2.2 — CONFIGURABLE ICP METRICS & SCORING
Goal: Allow users to adjust the Ideal Customer Profile without manually modifying n8n workflows, scoring logic, or AI prompts.
Different sales teams may evaluate leads very differently.
For example, one team may only pursue companies with at least $1 million in annual revenue, while another might prioritize industry, company size, or evidence of an immediate technology need.
The scoring system should accommodate those differences.
Core Components
1. Editable ICP Criteria
Create a configuration interface where users can define or adjust qualification factors such as:
Industry.
Annual revenue.
Company size / employee count.
Geographic location.
Technology/platform signals.
Growth or hiring activity.
Digital maturity.
Potential need for specific services.
Not every factor needs to be included initially, but the system should support meaningful customization.
2. Adjustable Weights & Requirements
Allow users to change how much each criterion contributes to the overall score.
For example:
Criteria
Weight
Revenue
30%
Industry
25%
Digital Opportunity
25%
Growth Signals
20%
Total
100%

Consider supporting both weighted preferences and hard requirements.
For example:
Weighted preference: Companies with higher revenue receive more points.
Hard requirement: Companies must have at least $1M in annual revenue to qualify.
These should not behave identically.
Also consider how the system handles unavailable data. A company with undisclosed revenue should not automatically be treated as having revenue below the required threshold.
3. Explainable Scoring
The score should be calculated using the configured criteria and the company's research findings.
The LLM can help interpret evidence or determine which criteria apply, but the actual scoring calculation should remain consistent and explainable.
Avoid simply asking the LLM to generate a score without defined criteria.
4. Persistent ICP Configuration
Store ICP settings in the database so they can be reused across research sessions.
Ideally, users should be able to:
View and edit the current ICP.
Adjust criteria and weights.
Save configuration changes.
Recalculate previously researched companies using the updated ICP.
Changing ICP criteria should not require repeating external company research when the existing findings contain the necessary information.
Preserve enough information about the scoring configuration to explain why a company received a particular score, even if the ICP is modified later.
Phase 2.2 Deliverable
A configurable ICP scoring interface where users can modify qualification criteria and weights, save those settings, and see how changes affect company scores.
The result should be a qualification system that different sales teams could adapt to their own priorities rather than one permanently tied to Psycray's initial assumptions.

PHASE 2.3 — HISTORICAL ICP ANALYSIS & SCORING RECOMMENDATIONS (OPTIONAL)
Goal: Explore how historical won/lost sales opportunities can help identify characteristics associated with successful deals and inform improvements to the ICP.
Most ICP scoring starts with assumptions about what makes a good prospective customer.
However, historical sales outcomes can reveal patterns that are not immediately obvious.
For example, a company might discover that it has historically won a higher percentage of opportunities with mid-sized manufacturers than with larger retail organizations, even though its current ICP gives both industries similar priority.
This phase will prototype a simplified version of historical account-fit analysis used in commercial sales intelligence and CRM platforms.
The objective is not to predict future sales with certainty or train a machine learning model. Instead, the system should identify potentially useful patterns, explain the evidence behind them, and suggest improvements to the existing ICP.
1. Sample Historical Sales Data
Generate a synthetic dataset representing historical sales opportunities.
At minimum, include:
Company name.
Industry.
Annual revenue or revenue range.
Company size / employee count.
Opportunity outcome (Won / Lost).
Additional fields such as geography, service requested, estimated deal value, and opportunity date would make the analysis more useful.
Example:
Company
Industry
Revenue
Outcome
Acme Manufacturing
Manufacturing
$8M
Won
Northstar Logistics
Logistics
$3M
Lost
Valley Industrial
Manufacturing
$12M
Won
Apex Retail
Retail
$2M
Lost
Summit Equipment
Manufacturing
$6M
Won

These are illustrative records only.
For the actual analysis, create a larger dataset with meaningful variation across industries, revenue ranges, company sizes, and outcomes.
A synthetic dataset of approximately 100–200 opportunities should be sufficient to demonstrate the workflow, provided there are enough records in the relevant categories to make comparisons meaningful.
The dataset should contain realistic variation rather than artificially making every manufacturing opportunity successful and every retail opportunity unsuccessful.
Important: Synthetic data demonstrates how the system works. It does not establish that the resulting patterns are representative of Psycray's actual customers or sales performance.
2. Historical Pattern Analysis
Analyze the stored opportunities to identify potentially useful relationships between company characteristics and sales outcomes.
Examples include:
Industries with higher historical win rates.
Revenue ranges associated with stronger conversion rates.
Company sizes associated with successful opportunities.
Geographic trends.
Service categories associated with higher win rates.
Characteristics shared by groups of won opportunities.
The underlying calculations should be performed using SQL, Python, or another deterministic approach.
The LLM can help interpret or explain the results, but should not be responsible for inventing the underlying statistics.
For example:
Industry
Opportunities
Won
Win Rate
Manufacturing
60
36
60%
Logistics
40
12
30%
Professional Services
50
20
40%
Retail
50
10
20%

This example might suggest that manufacturing deserves additional consideration when evaluating prospective accounts.
However, win rates should always be presented alongside the number of opportunities analyzed.
A 75% win rate from four opportunities is much weaker evidence than a similar rate across hundreds of opportunities.
3. ICP Improvement Recommendations
Compare the historical findings against the current configurable ICP.
The system should identify situations where historical sales outcomes suggest that the existing criteria or weights may deserve review.
For example:
Historical ICP Insight
Manufacturing companies have a 60% historical win rate, compared with 39% overall across the dataset.
Your current ICP gives manufacturing the same industry-fit weighting as other target industries.
Suggested action: Review whether manufacturing companies should receive greater weight when qualifying future opportunities.
Based on 60 manufacturing opportunities, including 36 wins.
The recommendation should explain:
What pattern was identified.
Which historical records support it.
How many opportunities were analyzed.
How the finding compares with the overall dataset.
Which ICP criterion might deserve adjustment.
Avoid presenting recommendations as definitive conclusions when the supporting data is limited.
4. Human Review & Approval
The application should present historical findings and suggested changes for user review.
Users should be able to:
Review the identified pattern.
Inspect the supporting statistics.
Understand which ICP criterion would be affected.
Decide whether to accept, modify, or disregard a recommendation.
Do not automatically change ICP weights based on historical sales analysis.
The system should assist with improving the ICP rather than independently deciding what the ideal customer looks like.
5. Keep ICP Fit Separate From Opportunity Predictions
There are three related but distinct concepts in sales qualification:
ICP Fit: How closely a company matches the characteristics of an ideal customer.
Historical Account-Fit Analysis: Which characteristics are associated with historically successful opportunities.
Opportunity / Intent Scoring: How likely a specific prospect is to purchase, based on signals such as engagement, buying activity, and sales pipeline information.
For this phase, focus on the first two.
The historical analysis should provide evidence that can help refine ICP criteria. It should not attempt to build a full predictive opportunity-scoring system.
Important Design Considerations
Historical relationships are not necessarily causal.
A higher win rate among manufacturing companies does not prove that being a manufacturer causes a company to be a better prospect.
Other factors, such as the types of services sold, deal sizes, sales activity, or which companies the sales team chose to pursue, may influence the results.
Account for sample sizes and limited evidence.
The system should distinguish patterns supported by meaningful amounts of data from observations based on only a handful of opportunities.
Avoid data leakage.
When possible, base the analysis on information that would have been available when the company was originally evaluated.
For example, information only discovered after winning a deal should not be treated as if it were available during initial lead qualification.
Do not equate win rate with overall customer value.
A company may close a high percentage of opportunities in a particular industry while generating relatively small or unprofitable projects.
For the initial prototype, win/loss outcomes are sufficient. A future version could also consider deal value, profitability, customer retention, and lifetime value.
Machine learning is not required.
A combination of database queries, straightforward statistical comparisons, and LLM-generated explanations is sufficient to demonstrate the concept.
Building and validating an actual predictive model would be a separate, significantly larger project.
Phase 2.3 Deliverable
A historical sales analysis feature that:
Stores a synthetic dataset of won/lost opportunities.
Calculates historical performance across relevant company characteristics.
Identifies potentially meaningful patterns.
Compares those findings against the current ICP.
Suggests evidence-backed adjustments to criteria or weights.
Allows users to review recommendations before applying changes.
The final demonstration should show how historical sales information can help inform better qualification decisions, without claiming that synthetic data or basic statistical comparisons can reliably predict future sales.

DEVELOPMENT PRIORITIES & CHECKPOINTS
Priority 1 — Phase 2.1: Frontend & Hosting
Complete the application interface and connect it to the existing research workflow.
Checkpoint: Demonstrate a working company research request through the frontend, including the Account Brief, supporting sources, and ICP scorecard.
The application should be usable through its hosted URL before moving too far into additional features.
Priority 2 — Phase 2.2: Configurable ICP
Implement editable qualification criteria, weights, requirements, and score recalculation.
Checkpoint: Demonstrate how changing the ICP configuration affects the score of an existing researched company without requiring a complete research rerun.
Priority 3 — Phase 2.3: Historical Sales Analysis (Optional)
Generate the historical opportunity dataset and implement basic pattern identification and scoring recommendations.
Checkpoint: Demonstrate a historical sales insight, the statistics supporting it, and a suggested ICP adjustment that the user can accept or reject.
Progress updates are encouraged throughout development, particularly when major components become functional or architectural decisions need review.

FINAL PROJECT GOAL
By the end of Phase 2, this should feel like a usable sales intelligence application rather than an isolated AI workflow.
A user should be able to open a URL, research a company, review supporting evidence, understand the qualification score, and make a more informed decision about whether the company is worth pursuing.
The configurable ICP should make the application useful to different sales teams, while the optional historical analysis demonstrates how actual sales outcomes could eventually help improve qualification criteria.
The hosted frontend is the most important deliverable. Even if later features are incomplete at the end of the semester, the project should stand on its own as a functioning application that can be demonstrated, shared, and discussed as a complete piece of work.

