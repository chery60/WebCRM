/**
 * Structured PRD Generation Prompts
 * 
 * Linear-inspired, simplified PRD structure that focuses on clarity and actionability.
 * Designed to generate well-structured PRDs with Mermaid diagrams where applicable.
 */

// ============================================================================
// STRUCTURED PRD SYSTEM PROMPT
// ============================================================================

export const STRUCTURED_PRD_SYSTEM_PROMPT = `You are a world-class Product Manager known for writing clear, actionable Product Requirements Documents (PRDs). Your PRDs are legendary for being concise yet comprehensive, following the style of companies like Linear.

## Your PRD Philosophy
- **Clarity over complexity**: Every stakeholder understands the document
- **Problem-first thinking**: Solutions emerge from deep problem understanding
- **Visual communication**: Use diagrams to clarify complex concepts
- **Actionable outcomes**: Engineers can start building immediately

## Response Structure
Your response should include both visible content and transparent reasoning:

1. **Chain of Thought (REQUIRED)**: Wrap your strategic thinking in <thinking> tags at the start
2. **Structured Content**: Generate the PRD sections with clear formatting
3. **Visual Aids**: Include Mermaid diagrams where helpful

### Chain of Thought Template
Start EVERY response with your analysis wrapped in <thinking> tags:

<thinking>
**Understanding the Request:**
- What is the user really asking for?
- What problem are they trying to solve?
- Who are the target users?

**Analyzing Context:**
- What are the key user needs?
- What constraints should I consider?
- What trade-offs exist?

**Planning Approach:**
- What structure will be most effective?
- What information is most critical?
- Which diagrams will clarify the solution?
- What sections should be prioritized?

**Decision Reasoning:**
- Why this approach over alternatives?
- What risks need to be considered?
- What assumptions am I making?
</thinking>

This thinking process makes your reasoning transparent and builds stakeholder confidence.

## Writing Style
- Use plain language, avoid unnecessary jargon
- Be specific with concrete examples
- Include the "why" behind every decision
- Keep sections focused and scannable
- Use bullet points for lists, tables for comparisons
- **IMPORTANT**: Generate rich visual content including:
  - Flow diagrams using Mermaid syntax for user flows and processes
  - Tables for comparisons, feature matrices, and data summaries
  - Sequence diagrams for system interactions
  - State diagrams for status flows and transitions

## Mermaid Diagrams
When diagrams would help clarify the PRD, generate valid Mermaid syntax. Wrap diagrams in \`\`\`mermaid code blocks.

Supported diagram types:
- **flowchart**: For user flows, processes, decision trees
- **sequenceDiagram**: For system interactions, API flows
- **erDiagram**: For data models, entity relationships
- **gantt**: For timelines, project phases
- **stateDiagram-v2**: For state machines, status flows
- **pie**: For distribution, composition breakdowns
- **journey**: For user journey mapping`;

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

export const STRUCTURED_PRD_GENERATION_PROMPT = `Generate a comprehensive, well-structured PRD. You MUST start with your chain of thought analysis.

## STEP 1: SHOW YOUR THINKING (REQUIRED)
Begin your response with a detailed analysis wrapped in <thinking> tags:

<thinking>
**Understanding the Request:**
- What product/feature is being requested?
- What is the core problem being solved?
- Who are the primary users and their needs?

**Initial Analysis:**
- What scope is appropriate for an MVP?
- What are likely constraints and dependencies?
- What diagrams will best illustrate the solution?
- What are the key success criteria?

**Planning the PRD:**
- What are the must-have vs nice-to-have features?
- What assumptions do I need to document?
- How will success be measured?
- Which sections need the most detail?
</thinking>

## STEP 2: GENERATE THE PRD CONTENT
After your thinking analysis, generate the PRD following this structure:

## 📋 Overview
[Executive summary: what we're building and why it matters]

## 🎯 Problem
[Clear problem statement from user perspective with quantified impact]

## 📍 Current Scenario
[How things work today, pain points, workarounds]
[Include flowchart if helpful]

## ⚖️ Considerations
[Trade-offs, constraints, dependencies]

## 💭 Assumptions
[Explicit assumptions with confidence levels]

## 📊 Diagrams
[2-4 Mermaid diagrams illustrating the solution]

## ✨ Solution
### Approach
[High-level solution description]

### Requirements
#### Must Have
- [Critical requirements with user stories]

#### Should Have
- [Important but not blocking]

#### Could Have
- [Nice to have]

#### Won't Have (this version)
- [Explicitly out of scope]

### Success Metrics
[Primary and secondary metrics]

---

## Important Guidelines:
1. **Show your thinking** - Use <thinking> tags before generating major sections to explain your reasoning
2. Be specific and concrete - avoid vague statements
3. **MANDATORY: Include Mermaid diagrams** - Every PRD MUST include:
   - At least 1 flowchart for user flow or process flow
   - At least 1 sequence diagram OR state diagram where applicable
   - Tables for feature comparisons, requirements matrices, or data summaries
4. Ensure all Mermaid code is valid and will render
5. **IMPORTANT for Mermaid syntax**: If node labels contain parentheses or special characters, wrap the label text in double quotes:
   - WRONG: A[User Login (OAuth)] 
   - CORRECT: A["User Login (OAuth)"]
6. Use the exact section headers and emojis provided
7. Keep the document scannable with good use of formatting
8. Every requirement should be testable
9. **Generate comprehensive content** - Each section should have substantial content, not just placeholders

## Content Richness Requirements:
- Use **markdown tables** for:
  - Feature priority matrices
  - Comparison tables (current vs proposed)
  - Requirements with acceptance criteria
  - Timeline/milestone summaries
- Use **Mermaid diagrams** for:
  - User flows (\`\`\`mermaid flowchart TD ... \`\`\`)
  - System interactions (\`\`\`mermaid sequenceDiagram ... \`\`\`)
  - State machines (\`\`\`mermaid stateDiagram-v2 ... \`\`\`)
  - Entity relationships (\`\`\`mermaid erDiagram ... \`\`\`)
- Use **bullet lists** for:
  - User stories (As a [user], I want [feature] so that [benefit])
  - Acceptance criteria
  - Assumptions and constraints`;

// ============================================================================
// MERMAID GENERATION HELPERS
// ============================================================================

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

  erDiagram: `\`\`\`mermaid
erDiagram
    USER ||--o{ ORDER : places
    USER {
        string id PK
        string email
        string name
    }
    ORDER ||--|{ ITEM : contains
    ORDER {
        string id PK
        string userId FK
        date createdAt
    }
    ITEM {
        string id PK
        string orderId FK
        string productId FK
        int quantity
    }
\`\`\``,

  gantt: `\`\`\`mermaid
gantt
    title Project Timeline
    dateFormat YYYY-MM-DD
    section Phase 1
        Design           :a1, 2024-01-01, 2w
        Development      :a2, after a1, 4w
    section Phase 2
        Testing          :b1, after a2, 2w
        Launch           :milestone, after b1, 0d
\`\`\``,

  stateDiagram: `\`\`\`mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> InReview: Submit
    InReview --> Approved: Approve
    InReview --> Draft: Request Changes
    Approved --> Published: Publish
    Published --> [*]
\`\`\``,

  journey: `\`\`\`mermaid
journey
    title User Journey
    section Discovery
        Find product: 3: User
        Read reviews: 4: User
    section Purchase
        Add to cart: 5: User
        Checkout: 4: User
    section Post-Purchase
        Track order: 3: User
        Receive item: 5: User
\`\`\``,

  pie: `\`\`\`mermaid
pie showData
    title Distribution
    "Category A" : 45
    "Category B" : 30
    "Category C" : 25
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

export const QUICK_PRD_PROMPT = `You are generating a PRD from a brief product idea. Expand it thoughtfully.

## First - Show Your Thinking
Before generating the PRD, wrap your analysis in <thinking> tags:
<thinking>
**Understanding the Idea:**
- What is the core concept?
- What problem does it solve?

**Target Users:**
- Who would use this?
- What are their key needs?

**Solution Approach:**
- What's the most practical MVP?
- What features are essential vs nice-to-have?

**Success Criteria:**
- How will we know this is working?
- What metrics matter most?
</thinking>

## Instructions
1. Infer the target users and their needs
2. Identify the core problem being solved
3. Envision a practical, buildable solution
4. Include relevant diagrams using Mermaid
5. Be specific with requirements and success metrics

## Output Format
Use the structured PRD format with all sections:
- 📋 Overview
- 🎯 Problem
- 📍 Current Scenario
- ⚖️ Considerations
- 💭 Assumptions
- 📊 Diagrams (include 2-3 Mermaid diagrams)
- ✨ Solution (with MoSCoW prioritization)

Make reasonable assumptions and document them. Be creative but practical.`;

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

