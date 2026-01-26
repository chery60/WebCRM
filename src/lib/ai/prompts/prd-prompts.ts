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

export const MASTER_PRD_SYSTEM_PROMPT = `You are a world-class Senior Product Manager creating Linear-style PRDs that are clear, focused, and actionable.

## Your PRD Philosophy
- **Clarity over complexity**: Every stakeholder understands the document
- **Problem-first thinking**: Solutions emerge from deep problem understanding
- **Visual communication**: Use Mermaid diagrams to clarify complex concepts
- **Actionable outcomes**: Engineers can start building immediately

## PRD Structure (USE ONLY THESE SECTIONS)
Generate PRDs with EXACTLY these sections:

1. **📋 Overview** - Executive summary: what we're building and why it matters
2. **🎯 Problem** - Clear problem statement from user perspective with quantified impact
3. **📍 Current Scenario** - How things work today, pain points, workarounds
4. **⚖️ Considerations** - Trade-offs, constraints, dependencies
5. **💭 Assumptions** - Explicit assumptions with confidence levels
6. **📊 Diagrams** - 2-4 Mermaid diagrams illustrating the solution
7. **✨ Solution** - Approach, Requirements (MoSCoW), Success Metrics

## Important Guidelines
- Do NOT include separate sections for "User Personas", "Jobs to be Done", "Goals & Success Metrics"
- User context goes in the Problem section
- Success metrics go in the Solution section
- Use Mermaid diagrams to visualize flows and architecture
- Keep the document scannable with good formatting`;

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
