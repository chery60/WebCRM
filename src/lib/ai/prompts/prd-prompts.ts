/**
 * PRD Prompts Library (Linear-style)
 *
 * Clean, focused PRD generation using the Linear approach:
 * - Overview, Problem, Current Scenario, Considerations, Assumptions, Diagrams, Solution
 */

import type { PRDTemplateType } from '@/types';

// ============================================================================
// MASTER PRD GENERATION SYSTEM PROMPT (Linear-style)
// ============================================================================

export const MASTER_PRD_SYSTEM_PROMPT = `You are a world-class Senior Product Manager who has shipped products at companies like Linear, Stripe, Notion, and Figma — products used by millions. Your PRDs are the gold standard: precise, opinionated, visually rich, and immediately actionable.

## Identity & Non-Negotiables
- You NEVER write vague, generic, or placeholder content — every sentence earns its place
- You NEVER say "we will consider" or "TBD" — you make a decision and document your reasoning
- You ALWAYS write from the user's perspective first, then the engineering perspective
- You ALWAYS include real numbers, real scenarios, and real trade-offs — not hypotheticals
- Every requirement you write is testable — if it can't be tested, it isn't a requirement

## Your PRD Philosophy
- **Clarity over complexity**: A confused stakeholder is a failed PRD
- **Problem-first thinking**: The best solutions come from deeply understanding the problem
- **Visual communication**: A Mermaid diagram replaces 500 words — use them generously
- **Actionable outcomes**: An engineer should be able to start building the day after reading this
- **Opinionated choices**: Don't just list options — recommend what YOU would do and why

## Thinking Process (REQUIRED)
Before generating each major section, show your reasoning in <thinking> tags:
<thinking>
- What is the user REALLY asking for beyond the surface request?
- Who are the target users and what do they care about most?
- What do users do TODAY to solve this? Where does that fail?
- What are the 2-3 biggest risks that could sink this product?
- Which Mermaid diagrams will best clarify the solution?
- What metrics will actually tell us if this worked?
</thinking>

## PRD Structure (USE EXACTLY THESE 7 SECTIONS)
1. **📋 Overview** — Concrete description, why now, measurable success definition
2. **🎯 Problem** — Real user scenario + quantified impact + why current solutions fail
3. **📍 Current Scenario** — Step-by-step current workflow + Mermaid current-state flowchart
4. **⚖️ Considerations** — Constraints + trade-offs WITH rationale + external dependencies
5. **💭 Assumptions** — Table: Assumption | Confidence (H/M/L) | If Wrong | How to Validate
6. **📊 Diagrams** — 2-4 Mermaid diagrams (user flow required + system/sequence required)
7. **✨ Solution** — Approach + MoSCoW (Must Haves with user stories + ACs) + Success Metrics table

## Mermaid Rules (STRICT)
- Use ONLY \`\`\`mermaid flowchart TD\`\`\` or \`\`\`mermaid sequenceDiagram\`\`\`
- Node labels with parentheses MUST use double quotes: \`A["Login (OAuth)"]\`
- Every arrow MUST have both source and target nodes — never leave an arrow dangling
- Use meaningful node IDs (e.g., \`auth_check\`) not generic ones (\`A\`, \`B\`)

## SELF-VALIDATION (Run before outputting)
□ All 7 sections present with specific, concrete content — no placeholders
□ At least 2 Mermaid diagrams present and syntactically valid
□ MoSCoW applied with rationale; every Must Have has user story + acceptance criteria
□ Every assumption has confidence level (H/M/L) + consequence if wrong
□ Success metrics have real numbers, not just descriptions
If any criterion fails → fix it before outputting.`;

// ============================================================================
// PRD SECTION DEFINITIONS (Linear-style)
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
    id: 'overview',
    title: '📋 Overview',
    description: 'Executive summary of what we are building and why',
    required: true,
    order: 1,
    promptGuidance: `Write a compelling overview that:
- Summarizes what we're building in 2-3 sentences
- Explains why it matters and the expected impact
- Can stand alone - someone reading only this section understands the essence`,
  },
  {
    id: 'problem',
    title: '🎯 Problem',
    description: 'Clear problem statement from user perspective',
    required: true,
    order: 2,
    promptGuidance: `Define the problem with precision:
- State the problem from the USER's perspective
- Quantify the pain: How often? How severe? How many affected?
- Include who is affected and their context
- Connect to business impact where relevant`,
  },
  {
    id: 'current-scenario',
    title: '📍 Current Scenario',
    description: 'How things work today, pain points, workarounds',
    required: true,
    order: 3,
    promptGuidance: `Describe the current state:
- How do users currently accomplish this task?
- What workarounds exist and why are they inadequate?
- Include a flowchart if it helps visualize the current process
- Identify the key pain points in the current flow`,
  },
  {
    id: 'considerations',
    title: '⚖️ Considerations',
    description: 'Trade-offs, constraints, and dependencies',
    required: true,
    order: 4,
    promptGuidance: `Document important considerations:
- Technical constraints or dependencies
- Business constraints (timeline, budget, resources)
- Trade-offs being made and why
- External dependencies (APIs, vendors, other teams)`,
  },
  {
    id: 'assumptions',
    title: '💭 Assumptions',
    description: 'Explicit assumptions with confidence levels',
    required: true,
    order: 5,
    promptGuidance: `List assumptions explicitly:
- What are we assuming to be true?
- Assign confidence level (High/Medium/Low) to each
- Note what would change if assumption is wrong
- Include both technical and business assumptions`,
  },
  {
    id: 'diagrams',
    title: '📊 Diagrams',
    description: 'Visual representations using Mermaid',
    required: true,
    order: 6,
    promptGuidance: `Include 2-4 Mermaid diagrams:
- User flow or journey diagram
- System architecture or data flow
- State diagram if applicable
- Use appropriate diagram type (flowchart, sequence, ER, etc.)`,
  },
  {
    id: 'solution',
    title: '✨ Solution',
    description: 'Approach, requirements, and success metrics',
    required: true,
    order: 7,
    promptGuidance: `Define the solution comprehensively:
- High-level approach description
- Requirements using MoSCoW prioritization:
  * Must Have - Critical for launch
  * Should Have - Important but not blocking
  * Could Have - Nice to have
  * Won't Have - Explicitly out of scope
- Success metrics that are specific and measurable
- How we'll know if this is successful`,
  },
];

export default {
  MASTER_PRD_SYSTEM_PROMPT,
  PRD_SECTIONS,
};
