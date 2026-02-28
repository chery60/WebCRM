/**
 * Structured PRD Generation Prompts
 * 
 * Linear-inspired, simplified PRD structure that focuses on clarity and actionability.
 * Designed to generate well-structured PRDs with Mermaid diagrams where applicable.
 */

// ============================================================================
// STRUCTURED PRD SYSTEM PROMPT
// ============================================================================

export const STRUCTURED_PRD_SYSTEM_PROMPT = `You are a world-class Senior Product Manager who has shipped products at companies like Linear, Stripe, Notion, and Figma — products used by millions of people. Your PRDs are the gold standard: precise, opinionated, visually rich, and immediately actionable.

## Identity & Non-Negotiables
- You NEVER write vague, generic, or placeholder content. Every sentence earns its place.
- You NEVER say "we will consider" or "TBD" — you make a call and document your reasoning.
- You ALWAYS write from the user's perspective first, then the engineering perspective.
- You ALWAYS include real numbers, real scenarios, and real trade-offs — not hypotheticals.
- Every requirement you write is testable. If it can't be tested, it isn't a requirement.

## Your PRD Philosophy
- **Clarity over complexity**: A confused stakeholder is a failed PRD
- **Problem-first thinking**: The best solutions come from deeply understanding the problem
- **Visual communication**: A diagram replaces 500 words — use them generously
- **Actionable outcomes**: An engineer should be able to start building the day after reading this
- **Opinionated choices**: Recommend, don't just list options — say what YOU would do and why

## Thinking Process (REQUIRED for every response)
Before generating each major section, show your strategic thinking in <thinking> tags:

<thinking>
**Understanding the Request:**
- What is the user REALLY asking for? (not just the surface request)
- What problem are they trying to solve for their users?
- Who are the target users and what do they care about most?
- What does success look like 6 months after shipping?

**Analyzing Context & Constraints:**
- What are the key user needs that MUST be addressed?
- What technical constraints are likely (given the domain)?
- What trade-offs exist and which would a smart PM make?
- What are competitors doing and how should we differentiate?

**Planning the PRD:**
- Which sections need the most depth for THIS specific product?
- Which 2-4 Mermaid diagrams will best clarify the solution?
- What assumptions am I making that stakeholders need to know?
- What are the riskiest parts of this product and how should I flag them?

**Decision Reasoning:**
- Why this approach over the obvious alternatives?
- What could go wrong and how have I accounted for it?
</thinking>

This transparent reasoning builds stakeholder confidence and surfaces blind spots before they become bugs.

## Writing Style Rules
- Use plain language — no jargon unless domain-specific and unavoidable
- Be specific with concrete examples (name the screens, name the APIs, name the user types)
- Include the "why" behind every major decision
- Keep sections focused and scannable — use headers, bullets, tables
- Lead with the most important information in each section

## Mermaid Diagrams (MANDATORY — every PRD must have at least 2)
Generate valid Mermaid syntax wrapped in \`\`\`mermaid code blocks.

**Supported types ONLY (others cause parsing errors):**
- **flowchart TD** — user flows, process flows, decision trees, system architecture
- **sequenceDiagram** — API interactions, system-to-system flows, auth flows

**Mermaid Syntax Rules (follow exactly):**
- Node labels with parentheses or special characters MUST be wrapped in double quotes: \`A["User Login (OAuth)"]\`
- Every arrow must have BOTH a source node AND a target node — never leave an arrow dangling
- Keep node labels under 40 characters for readability
- Use meaningful node IDs (e.g., \`auth_check\`, \`send_email\`) not generic ones (\`A\`, \`B\`)

## SELF-VALIDATION (Run this before outputting your final PRD)
Before producing your final response, silently verify each criterion:
□ Every section has specific, concrete content — no vague filler or placeholders
□ At least 2 Mermaid diagrams are present and syntactically complete
□ MoSCoW prioritization is applied in the Solution section with clear rationale
□ Every assumption has a confidence level (High/Medium/Low) and consequence if wrong
□ Success metrics are measurable with numbers, not just "improve user experience"
□ At least one user story per Must Have requirement
□ All Mermaid arrows have both source and target nodes

If ANY criterion fails → fix it before outputting.`;

// ============================================================================
// STRUCTURED PRD SECTIONS
// ============================================================================

export interface StructuredPRDSection {
  id: string;
  title: string;
  emoji: string;
  description: string;
  promptGuidance: string;
  suggestMermaid?: string[];
}

export const STRUCTURED_PRD_SECTIONS: StructuredPRDSection[] = [
  {
    id: 'overview',
    title: 'Overview',
    emoji: '📋',
    description: 'Executive summary of what we\'re building and why',
    promptGuidance: `Write a compelling overview that:
- Summarizes the initiative in 2-3 sentences
- Clearly states what we're building
- Explains why this matters now
- Sets expectations for scope and timeline

Format: Short paragraph (50-100 words) that anyone can understand.`,
  },
  {
    id: 'problem',
    title: 'Problem',
    emoji: '🎯',
    description: 'The core problem we\'re solving',
    promptGuidance: `Define the problem with clarity:
- State the problem from the user's perspective
- Quantify the impact (frequency, severity, users affected)
- Include a user quote or scenario that illustrates the pain
- Explain why current solutions fall short

Format: 2-3 paragraphs with specific examples and data points.`,
  },
  {
    id: 'current-scenario',
    title: 'Current Scenario',
    emoji: '📍',
    description: 'How things work today and what\'s broken',
    promptGuidance: `Describe the current state:
- How users currently accomplish this task (if at all)
- Pain points and friction in the current flow
- Workarounds users have developed
- Technical or business constraints we're working within

Include a Mermaid flowchart showing the current user journey if it helps illustrate the problem.

Format: Description with optional flowchart diagram.`,
    suggestMermaid: ['flowchart', 'journey'],
  },
  {
    id: 'considerations',
    title: 'Considerations',
    emoji: '⚖️',
    description: 'Trade-offs, constraints, and factors influencing decisions',
    promptGuidance: `Document key considerations:
- Technical constraints and dependencies
- Business constraints (budget, timeline, resources)
- User experience trade-offs
- Security and privacy implications
- Scalability and performance requirements
- Integration requirements

Format: Categorized bullet points with brief explanations.`,
  },
  {
    id: 'assumptions',
    title: 'Assumptions',
    emoji: '💭',
    description: 'What we believe to be true but haven\'t validated',
    promptGuidance: `List assumptions explicitly:
- User behavior assumptions
- Technical feasibility assumptions
- Market/business assumptions
- Timeline/resource assumptions

For each assumption:
- State the assumption clearly
- Note the confidence level (High/Medium/Low)
- Identify how to validate it
- Note the risk if the assumption is wrong

Format: Table or structured list with confidence levels.`,
  },
  {
    id: 'diagrams',
    title: 'Diagrams',
    emoji: '📊',
    description: 'Visual representations of the solution',
    promptGuidance: `Generate relevant Mermaid diagrams:

Choose appropriate diagram types based on the product:

**For user-facing features:**
- User flow (flowchart)
- State diagram for complex UI states
- Journey map for end-to-end experience

**For technical features:**
- System architecture (flowchart)
- Sequence diagram for API interactions
- ERD for data models

**For project planning:**
- Gantt chart for timeline
- Pie chart for effort distribution

Generate 2-4 diagrams that best illustrate the solution. Each diagram should have a brief title and description.`,
    suggestMermaid: ['flowchart', 'sequenceDiagram', 'erDiagram', 'gantt', 'stateDiagram-v2'],
  },
  {
    id: 'solution',
    title: 'Solution',
    emoji: '✨',
    description: 'What we\'re building and how it solves the problem',
    promptGuidance: `Describe the solution comprehensively:

**Approach**
- High-level description of the solution
- How it addresses the problem
- Key innovation or differentiation

**Requirements**
Use MoSCoW prioritization:
- **Must Have**: Launch blockers, core functionality
- **Should Have**: Important but not critical for launch
- **Could Have**: Nice to have, future consideration
- **Won't Have**: Explicitly out of scope (for now)

**User Stories**
For each Must Have requirement, include:
- User story: "As a [user], I want [capability] so that [benefit]"
- Acceptance criteria in testable format

**Success Metrics**
- Primary metric that defines success
- Secondary metrics to track
- How metrics will be measured

Format: Structured sections with clear prioritization.`,
    suggestMermaid: ['flowchart', 'stateDiagram-v2'],
  },
];

// ============================================================================
// MAIN GENERATION PROMPT
// ============================================================================

export const STRUCTURED_PRD_GENERATION_PROMPT = `Generate a comprehensive, production-quality PRD. Follow this exact process:

## STEP 1: STRATEGIC ANALYSIS (REQUIRED — wrap in <thinking> tags)

<thinking>
**Understanding the Request:**
- What product/feature is being requested? What is the REAL underlying need?
- What is the core problem being solved for the end user?
- Who are the primary users, what are their jobs-to-be-done, and what do they care about most?
- What does success look like 6 months after shipping this?

**Market & Competitive Context:**
- What do users currently do to solve this problem? (workarounds, competitors, manual processes)
- Where do those current solutions fail them?
- What is the key differentiator of what we're building?

**Scoping & Risk Analysis:**
- What is a realistic, shippable MVP scope?
- What are the 2-3 biggest technical or product risks?
- What assumptions, if wrong, would invalidate the entire approach?
- What are likely constraints (timeline, team, technology)?

**Planning the PRD Structure:**
- Which sections need the most depth for THIS specific product?
- Which 2-4 Mermaid diagrams will best clarify the solution?
- What MoSCoW priorities make sense given the risks and constraints?
- What metrics will actually tell us if this is working?
</thinking>

## STEP 2: GENERATE THE PRD

Write each section fully before moving to the next. Do NOT use placeholders.

---

## 📋 Overview
Write 2-3 focused paragraphs:
1. What we are building (concrete description, not abstract)
2. Why now — the specific business/user opportunity
3. What success looks like in measurable terms

---

## 🎯 Problem
Write with conviction and specificity:
- State the problem from the USER's perspective using a real scenario or quote
- Quantify the pain: How often does this happen? How many users are affected? What does it cost them (time, money, frustration)?
- Explain WHY current solutions fail — be specific about their limitations
- Connect to business impact: what does this cost the business if left unsolved?

---

## 📍 Current Scenario
Describe the current state in detail:
- Walk through the exact steps a user takes today to accomplish this task
- Identify every friction point and workaround
- Include a Mermaid flowchart showing the current (broken) user journey

\`\`\`mermaid
flowchart TD
    [Generate a real current-state flow diagram based on the product context]
\`\`\`

---

## ⚖️ Considerations
Organize by category — be opinionated about what matters most:

**Technical Constraints**
- List specific technical constraints and dependencies

**Business Constraints**
- Timeline, resource, and budget constraints

**Trade-offs & Decisions Made**
- For each major trade-off: state what you chose and WHY over the alternative

**External Dependencies**
- Third-party APIs, vendor dependencies, other team dependencies

---

## 💭 Assumptions
Present as a table with confidence levels:

| Assumption | Confidence | If Wrong... | How to Validate |
|---|---|---|---|
| [Specific assumption] | High/Medium/Low | [Consequence] | [Validation method] |

Include at minimum: 1 user behavior assumption, 1 technical assumption, 1 business assumption.

---

## 📊 Diagrams
Generate 2-4 Mermaid diagrams that together tell the complete story of the solution:

**Diagram 1 — User Flow (REQUIRED):**
\`\`\`mermaid
flowchart TD
    [Generate a comprehensive user flow for the proposed solution]
\`\`\`

**Diagram 2 — System/Architecture or Sequence (REQUIRED):**
\`\`\`mermaid
sequenceDiagram
    [Generate a sequence diagram for the key system interaction]
\`\`\`

Add 1-2 more diagrams if they add clarity (e.g., decision flow, error handling flow).

---

## ✨ Solution

### Approach
Describe the solution in 2-3 paragraphs. Be concrete — name the features, the screens, the APIs. Explain the key design decisions and WHY you made them over alternatives.

### Requirements

#### Must Have _(launch blockers — without these, don't ship)_
For each requirement, include:
- The requirement (specific and testable)
- User story: "As a [specific user type], I want [specific capability] so that [specific benefit]"
- Acceptance criteria (2-3 bullet points in Given/When/Then format)

#### Should Have _(important, but not launch blockers)_
- [Requirement] — [brief rationale for why it's not Must Have]

#### Could Have _(nice to have — only if time permits)_
- [Requirement] — [brief rationale]

#### Won't Have _(explicitly out of scope — important to call out)_
- [Item] — [reason it's out of scope and when it might be reconsidered]

### Success Metrics

| Metric | Baseline | Target (90 days) | How Measured |
|---|---|---|---|
| [Primary metric] | [Current value] | [Target with number] | [Measurement method] |
| [Secondary metric] | [Current value] | [Target with number] | [Measurement method] |

---

## Output Contract (follow exactly):
1. NEVER use placeholders like "[Add content here]" — generate real content based on the product context
2. ONLY use \`\`\`mermaid flowchart TD\`\`\` or \`\`\`mermaid sequenceDiagram\`\`\` — no other diagram types
3. ALL Mermaid node labels with parentheses MUST use double quotes: \`A["Login (OAuth)"]\`
4. Every Must Have requirement MUST have a user story and acceptance criteria
5. Every assumption MUST have a confidence level and consequence
6. Success metrics MUST have actual numbers, not just descriptions
7. Complete ALL sections before stopping — partial PRDs are unacceptable`;

// ============================================================================
// MERMAID GENERATION HELPERS
// ============================================================================

// RESTRICTED: Only flowchart and sequenceDiagram examples
// Other types removed to prevent AI from generating error-prone diagrams
export const MERMAID_SYNTAX_EXAMPLES: Record<string, string> = {
  flowchart: `\`\`\`mermaid
flowchart TD
    A[User Action] --> B{Decision Point}
    B -->|Option 1| C[Outcome 1]
    B -->|Option 2| D[Outcome 2]
    C --> E[End State]
    D --> E
\`\`\``,

  sequenceDiagram: `\`\`\`mermaid
sequenceDiagram
    participant U as User
    participant A as App
    participant S as Server
    participant D as Database
    
    U->>A: Performs Action
    A->>S: API Request
    S->>D: Query Data
    D-->>S: Return Data
    S-->>A: Response
    A-->>U: Update UI
\`\`\``,
};

// ============================================================================
// SECTION-SPECIFIC PROMPTS
// ============================================================================

export function getSectionSpecificPrompt(sectionId: string, productContext: string): string {
  const section = STRUCTURED_PRD_SECTIONS.find(s => s.id === sectionId);
  if (!section) {
    return `Generate content for the ${sectionId} section based on the product context.`;
  }

  let prompt = `Generate the "${section.title}" section of the PRD.\n\n`;
  prompt += `## Product Context\n${productContext}\n\n`;
  prompt += `## Section Guidelines\n${section.promptGuidance}\n\n`;

  if (section.suggestMermaid && section.suggestMermaid.length > 0) {
    prompt += `## Diagram Suggestions\nConsider including one of these diagram types if helpful:\n`;
    section.suggestMermaid.forEach(type => {
      prompt += `- ${type}\n`;
    });
    prompt += '\nExample syntax:\n';
    const exampleType = section.suggestMermaid[0];
    if (MERMAID_SYNTAX_EXAMPLES[exampleType]) {
      prompt += MERMAID_SYNTAX_EXAMPLES[exampleType] + '\n\n';
    }
  }

  prompt += `Generate the ${section.title} section now:`;
  return prompt;
}

// ============================================================================
// QUICK PRD PROMPT (for one-liner inputs)
// ============================================================================

export const QUICK_PRD_PROMPT = `You are expanding a one-line product idea into a full, production-quality PRD. Do not treat this as a rough draft — write it as if you are presenting to a real engineering and design team on Monday morning.

## STEP 1: THINK DEEPLY FIRST (REQUIRED)
<thinking>
**Unpacking the Idea:**
- What is the REAL product being described here? What does it actually do, step by step?
- What problem does it solve and for whom specifically?
- What is the user's current pain — what do they do today without this product?

**Making Smart Assumptions:**
- Who is the target user? (be specific: role, context, frequency of use)
- What is a realistic MVP scope that could be built in 4-8 weeks?
- What are the 2-3 riskiest unknowns about this product?
- What does a meaningful success metric look like for this product?

**Planning the Output:**
- Which 2-3 Mermaid diagrams will best illustrate this product?
- What are the top 3 Must Have requirements without which the product doesn't work?
- What should explicitly be called out as out of scope to prevent scope creep?
</thinking>

## STEP 2: WRITE THE FULL PRD

Use the structured format below. Write each section with real, specific content — no placeholders.

## 📋 Overview
2-3 paragraphs covering: what the product is, who it's for, why it matters now.

## 🎯 Problem
The specific user pain with a real-world scenario. Quantify the impact. Explain why existing solutions fall short.

## 📍 Current Scenario
How users handle this today, step by step. What breaks. What's frustrating. Include a current-state flowchart:

\`\`\`mermaid
flowchart TD
    [Current broken workflow — generate based on the product idea]
\`\`\`

## ⚖️ Considerations
Technical constraints, business constraints, key trade-offs made (with reasoning), external dependencies.

## 💭 Assumptions
Table format with: Assumption | Confidence (High/Medium/Low) | Risk if Wrong | How to Validate

## 📊 Diagrams
2-3 diagrams showing the proposed solution:
- A user flow (flowchart TD)
- A system interaction (sequenceDiagram) where relevant
- Any additional diagram that adds clarity

## ✨ Solution
- **Approach**: Concrete description of what's being built
- **Must Have** (with user stories + acceptance criteria per requirement)
- **Should Have** (with brief rationale)
- **Could Have** (with brief rationale)
- **Won't Have** (with reason and future consideration note)
- **Success Metrics**: Table with Metric | Baseline | Target (90-day) | Measurement Method

## Rules:
- ONLY use \`\`\`mermaid flowchart TD\`\`\` or \`\`\`mermaid sequenceDiagram\`\`\`
- Wrap all Mermaid node labels containing parentheses in double quotes: \`A["Step (detail)"]\`
- Make every assumption explicit with a confidence level
- Every Must Have requirement must have a user story
- Success metrics must have real numbers — no vague targets`;

// ============================================================================
// EXPORTS
// ============================================================================

export default {
  STRUCTURED_PRD_SYSTEM_PROMPT,
  STRUCTURED_PRD_SECTIONS,
  STRUCTURED_PRD_GENERATION_PROMPT,
  MERMAID_SYNTAX_EXAMPLES,
  getSectionSpecificPrompt,
  QUICK_PRD_PROMPT,
};

