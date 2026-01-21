/**
 * PRD Prompts Library
 * 
 * World-class PRD generation prompts researched from:
 * - Anthropic Claude's system prompts
 * - OpenAI ChatGPT best practices
 * - Notion AI product templates
 * - Linear's product management approach
 * - Amplitude's PRD framework
 * - Intercom's JTBD methodology
 * - Amazon's Working Backwards approach
 * - Google's PRD templates
 */

import type { PRDTemplateType } from '@/types';

// ============================================================================
// MASTER PRD GENERATION SYSTEM PROMPT
// ============================================================================

export const MASTER_PRD_SYSTEM_PROMPT = `You are a world-class Senior Product Manager with 15+ years of experience at top tech companies including Google, Apple, Amazon, Meta, and successful startups. You have shipped products used by billions of users and have deep expertise in:

- Product strategy and vision
- User research and customer development
- Jobs-to-be-Done (JTBD) framework
- Design thinking and user-centered design
- Agile/Scrum methodologies
- Data-driven decision making
- Technical architecture understanding
- Go-to-market strategy
- Stakeholder management

Your PRDs are legendary in the industry for being:
1. **Crystal Clear** - Anyone can understand the problem and solution
2. **Comprehensive** - Nothing important is left ambiguous
3. **Actionable** - Engineers can start building immediately
4. **Measurable** - Success criteria are specific and quantifiable
5. **User-Centric** - Every decision ties back to user value
6. **Strategic** - Aligned with business goals and market opportunity

When generating PRDs, you follow these principles:

## THINKING PROCESS
Before writing, you systematically consider:
1. Who are ALL the users affected by this product/feature?
2. What are their deepest pain points and unmet needs?
3. What is the job they're trying to accomplish?
4. Why hasn't this been solved before? What's changed?
5. What's the minimum viable solution that delivers value?
6. What could go wrong? What are the edge cases?
7. How will we know if this is successful?
8. What are the dependencies and risks?

## WRITING STYLE
- Use clear, concise language - no jargon unless necessary
- Be specific with examples - abstract concepts become concrete
- Include "why" for every major decision
- Anticipate questions and address them proactively
- Use visuals descriptions where helpful (user flows, diagrams)
- Write for multiple audiences (executives, engineers, designers)

## OUTPUT QUALITY
- Every requirement must be testable
- Acceptance criteria use Given/When/Then format where appropriate
- User stories follow: "As a [user], I want [capability] so that [benefit]"
- Metrics are SMART (Specific, Measurable, Achievable, Relevant, Time-bound)
- Edge cases and error states are documented
- Security and privacy implications are considered`;

// ============================================================================
// PRD SECTION DEFINITIONS
// ============================================================================

export interface PRDSectionDefinition {
  id: string;
  title: string;
  description: string;
  required: boolean;
  order: number;
  promptGuidance: string;
  exampleContent?: string;
}

export const PRD_SECTIONS: PRDSectionDefinition[] = [
  {
    id: 'executive-summary',
    title: 'Executive Summary',
    description: 'High-level overview for stakeholders',
    required: true,
    order: 1,
    promptGuidance: `Write a compelling executive summary that:
- Hooks the reader in the first sentence with the problem's impact
- Summarizes the problem, solution, and expected outcome in 3-5 sentences
- Includes key metrics that will define success
- Makes clear why NOW is the right time to build this
- Can stand alone - someone reading only this section understands the essence`,
  },
  {
    id: 'problem-statement',
    title: 'Problem Statement',
    description: 'Clear articulation of the problem being solved',
    required: true,
    order: 2,
    promptGuidance: `Define the problem with surgical precision:
- State the problem from the USER's perspective, not the company's
- Quantify the pain: How often? How severe? How many affected?
- Include real user quotes or synthesized voice-of-customer
- Explain the current workarounds and why they're inadequate
- Connect to business impact (revenue, retention, acquisition)
- Use the "5 Whys" technique to get to root causes
- Distinguish symptoms from underlying problems`,
  },
  {
    id: 'goals-success-metrics',
    title: 'Goals & Success Metrics',
    description: 'Measurable objectives and KPIs',
    required: true,
    order: 3,
    promptGuidance: `Define success with measurable precision:
- Primary goal: The ONE thing that must be true for this to succeed
- Secondary goals: 2-3 additional objectives
- Each goal has SMART metrics (Specific, Measurable, Achievable, Relevant, Time-bound)
- Include leading indicators (predictive) and lagging indicators (outcome)
- Define baseline (current state) and target (future state)
- Specify measurement methodology and data sources
- Include guardrail metrics (things that shouldn't get worse)
- Set short-term (launch), medium-term (30-60 days), and long-term (6 months) targets`,
  },
  {
    id: 'user-personas',
    title: 'User Personas',
    description: 'Target user profiles and segments',
    required: true,
    order: 4,
    promptGuidance: `Create vivid, actionable user personas:
- Primary persona: The #1 user this is built for
- Secondary personas: Other important users
- For each persona include:
  * Name and role (make them memorable)
  * Demographics and context
  * Goals and motivations (what success looks like for them)
  * Pain points and frustrations (specific, not generic)
  * Current behavior and workarounds
  * Tech savviness and constraints
  * Quote that captures their mindset
- Anti-personas: Who is this explicitly NOT for?
- Jobs-to-be-Done: The progress they're trying to make in their lives`,
  },
  {
    id: 'user-stories',
    title: 'User Stories & Use Cases',
    description: 'Detailed user scenarios and journeys',
    required: true,
    order: 5,
    promptGuidance: `Map the complete user experience:
- Write user stories in standard format: "As a [persona], I want [capability] so that [benefit]"
- Prioritize using MoSCoW (Must have, Should have, Could have, Won't have)
- Include acceptance criteria for each story
- Document the end-to-end user journey with key touchpoints
- Cover the happy path AND edge cases
- Include error scenarios and recovery paths
- Map emotional states throughout the journey
- Identify moments of delight and potential frustration`,
  },
  {
    id: 'functional-requirements',
    title: 'Functional Requirements',
    description: 'Core features and capabilities',
    required: true,
    order: 6,
    promptGuidance: `Specify functionality with engineering precision:
- List each feature with unique ID (FR-001, FR-002, etc.)
- Description: What it does in plain language
- Rationale: Why it's needed (link to user story/goal)
- Acceptance criteria: Specific, testable conditions
- Priority: P0 (launch blocker), P1 (important), P2 (nice to have)
- Dependencies: What must exist first
- Include data requirements (inputs, outputs, storage)
- Specify behavior for all user actions
- Document state transitions
- Include validation rules`,
  },
  {
    id: 'non-functional-requirements',
    title: 'Non-Functional Requirements',
    description: 'Performance, security, scalability',
    required: true,
    order: 7,
    promptGuidance: `Define quality attributes:
- Performance: Response times, throughput, latency targets
- Scalability: Expected load, growth projections, scaling strategy
- Reliability: Uptime requirements, failover, disaster recovery
- Security: Authentication, authorization, data protection, compliance
- Privacy: Data handling, consent, GDPR/CCPA considerations
- Accessibility: WCAG compliance level, assistive technology support
- Internationalization: Languages, locales, RTL support
- Compatibility: Browsers, devices, OS versions
- Maintainability: Code standards, documentation, monitoring`,
  },
  {
    id: 'technical-considerations',
    title: 'Technical Considerations',
    description: 'Architecture and implementation notes',
    required: false,
    order: 8,
    promptGuidance: `Guide technical implementation:
- Proposed architecture approach (not prescriptive, but directional)
- Integration points with existing systems
- Data model considerations
- API requirements (endpoints, contracts)
- Third-party services or dependencies
- Technical debt implications
- Migration strategy if replacing existing functionality
- Performance optimization opportunities
- Caching strategy
- Background job requirements`,
  },
  {
    id: 'ux-considerations',
    title: 'UI/UX Considerations',
    description: 'Design principles and user experience',
    required: true,
    order: 9,
    promptGuidance: `Shape the user experience:
- Design principles specific to this feature
- Information architecture
- Key screens/views needed
- Interaction patterns (familiar patterns to leverage)
- Responsive/mobile considerations
- Loading states and skeleton screens
- Empty states
- Error states and messaging
- Micro-interactions and feedback
- Accessibility requirements
- Design system components to use/create
- Include rough wireframe descriptions if helpful`,
  },
  {
    id: 'dependencies-constraints',
    title: 'Dependencies & Constraints',
    description: 'External factors and limitations',
    required: true,
    order: 10,
    promptGuidance: `Identify blockers and boundaries:
- Technical dependencies (APIs, services, infrastructure)
- Team dependencies (other teams' work needed)
- External dependencies (vendors, partners, legal)
- Resource constraints (budget, time, people)
- Technical constraints (legacy systems, tech stack)
- Business constraints (contracts, regulations)
- Timeline dependencies (events, deadlines)
- Assumptions being made
- Prerequisites that must be true`,
  },
  {
    id: 'timeline-milestones',
    title: 'Timeline & Milestones',
    description: 'Phased delivery plan',
    required: true,
    order: 11,
    promptGuidance: `Create a realistic delivery plan:
- Phase breakdown (Alpha, Beta, GA or custom phases)
- For each phase:
  * Scope (features included)
  * Duration estimate
  * Key deliverables
  * Success criteria to move to next phase
- Major milestones with dates
- Dependencies that affect timeline
- Buffer for unknowns
- Go/no-go decision points
- Launch checklist items`,
  },
  {
    id: 'risks-mitigations',
    title: 'Risks & Mitigations',
    description: 'Potential issues and solutions',
    required: true,
    order: 12,
    promptGuidance: `Anticipate and address risks:
- List all significant risks (technical, business, user, operational)
- For each risk:
  * Description of the risk
  * Likelihood (High/Medium/Low)
  * Impact (High/Medium/Low)
  * Mitigation strategy
  * Contingency plan if risk materializes
  * Owner responsible for monitoring
- Include both known risks and potential unknown-unknowns areas
- Security and privacy risks
- Competitive risks
- Dependency risks`,
  },
  {
    id: 'open-questions',
    title: 'Open Questions',
    description: 'Items requiring further discussion',
    required: false,
    order: 13,
    promptGuidance: `Track unresolved items:
- Questions that need answers before/during development
- For each question:
  * The question itself
  * Why it matters (impact of different answers)
  * Who can answer it
  * Deadline for resolution
  * Default assumption if not resolved
- Categorize: Design, Technical, Business, Legal
- Prioritize: Blocking vs. non-blocking`,
  },
  {
    id: 'appendix',
    title: 'Appendix',
    description: 'Supporting materials and references',
    required: false,
    order: 14,
    promptGuidance: `Include supporting materials:
- Research findings and data
- Competitive analysis
- User interview summaries
- Technical spikes results
- Design explorations
- Related documents and links
- Glossary of terms
- Revision history`,
  },
];

export default {
  MASTER_PRD_SYSTEM_PROMPT,
  PRD_SECTIONS,
};
