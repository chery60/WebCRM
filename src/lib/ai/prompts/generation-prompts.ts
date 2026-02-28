/**
 * Generation Prompts for PRD, Features, and Tasks
 * 
 * Comprehensive prompts optimized for extracting structured data
 * that can be directly used to create features and tasks in the system.
 */

// ============================================================================
// PRD GENERATION PROMPT
// ============================================================================

export const PRD_GENERATION_PROMPT = `Generate a production-quality Product Requirements Document (PRD) using the Linear-style format.

## Output Contract — follow this exactly:
1. Generate ALL 7 sections below in the exact order shown — do not skip or reorder
2. Every section must have real, specific content — NEVER use placeholders like "[Add content here]"
3. Include AT LEAST 2 Mermaid diagrams — one user flow, one system/sequence interaction
4. Every Must Have requirement must include a user story and acceptance criteria
5. Every assumption must have a confidence level (High/Medium/Low) and consequence if wrong
6. Success metrics must have actual numbers — no vague targets like "improve performance"
7. Complete ALL sections before stopping — a partial PRD is worse than no PRD

## Required Sections (USE ONLY THESE, in this exact order):
1. ## 📋 Overview — Concrete description of what's being built, why now, measurable success
2. ## 🎯 Problem — User pain with real scenario + quantified impact + why current solutions fail
3. ## 📍 Current Scenario — Step-by-step current workflow, friction points, current-state Mermaid flowchart
4. ## ⚖️ Considerations — Technical/business constraints, trade-offs WITH rationale, dependencies
5. ## 💭 Assumptions — Table: Assumption | Confidence (H/M/L) | If Wrong | How to Validate
6. ## 📊 Diagrams — 2-4 Mermaid diagrams: user flow (required) + system/sequence (required) + extras
7. ## ✨ Solution — Approach, MoSCoW requirements (Must Haves with user stories + ACs), Success Metrics table

## Mermaid Syntax Rules (STRICT — violations cause rendering failures):
- Use ONLY \`\`\`mermaid flowchart TD\`\`\` or \`\`\`mermaid sequenceDiagram\`\`\`
- Node labels with parentheses or special characters MUST use double quotes:
  - WRONG: \`A[User Login (OAuth)]\`
  - CORRECT: \`A["User Login (OAuth)"]\`
- Every arrow MUST have both a source node AND a target node — no dangling arrows
- Use meaningful node IDs (e.g., \`auth_check\`, \`send_email\`) not just \`A\`, \`B\`, \`C\`

## SELF-VALIDATION (Run before outputting):
□ All 7 sections present with real content
□ At least 2 valid Mermaid diagrams
□ Every Must Have has user story + acceptance criteria
□ Every assumption has confidence level + consequence
□ Success metrics have real numbers
□ No placeholders or filler content anywhere
If any criterion fails → fix it before outputting.`;

// ============================================================================
// FEATURE GENERATION PROMPT
// ============================================================================

export const FEATURE_GENERATION_PROMPT = `You are a senior product manager extracting features from a PRD. Analyze the document and generate a structured list of features.

## Instructions:
1. Read the PRD thoroughly and identify all distinct features
2. Group related functionality into cohesive features
3. Assign realistic priorities based on user impact and dependencies
4. Estimate effort considering complexity and unknowns
5. Write clear acceptance criteria that are testable
6. Create user stories that capture the "why" behind each feature

## For Each Feature, Provide:
1. **title**: Clear, descriptive feature name (5-10 words)
2. **description**: What it does and why it matters (2-4 sentences)
3. **priority**: One of: "low", "medium", "high", "urgent"
   - urgent: Critical for launch, blocking other work
   - high: Important for core value proposition
   - medium: Enhances experience, not critical
   - low: Nice to have, future consideration
4. **phase**: Which development phase (e.g., "Phase 1", "Phase 2", "MVP", "v1.1")
5. **estimatedEffort**: T-shirt size with explanation (e.g., "Medium (2-3 weeks) - Requires new API endpoints and UI components")
6. **acceptanceCriteria**: List of 3-7 testable criteria in Given/When/Then or checkbox format
7. **userStories**: 1-3 user stories in "As a [user], I want [capability] so that [benefit]" format

## Priority Guidelines:
- Phase 1 / MVP: Only "urgent" and "high" priority features
- Phase 2: Mix of "high" and "medium" priority
- Phase 3+: "medium" and "low" priority features

## Output Format:
Return a JSON array of features. Example:
\`\`\`json
[
  {
    "title": "User Authentication System",
    "description": "Secure login and registration system allowing users to create accounts and access personalized features. Essential for user data protection and personalization.",
    "priority": "urgent",
    "phase": "Phase 1",
    "estimatedEffort": "Large (3-4 weeks) - Requires OAuth integration, security review, and password recovery flow",
    "acceptanceCriteria": [
      "Users can register with email and password",
      "Users can log in with valid credentials",
      "Invalid login attempts show appropriate error messages",
      "Password reset email is sent within 30 seconds",
      "Session expires after 24 hours of inactivity",
      "All passwords are hashed using bcrypt"
    ],
    "userStories": [
      "As a new user, I want to create an account so that I can save my preferences",
      "As a returning user, I want to log in quickly so that I can access my data",
      "As a forgetful user, I want to reset my password so that I can regain access"
    ]
  }
]
\`\`\`

IMPORTANT: Return ONLY the JSON array, no additional text or markdown code fences in your response.`;

// ============================================================================
// TASK GENERATION PROMPT
// ============================================================================

export const TASK_GENERATION_PROMPT = `You are a technical lead breaking down features into actionable development tasks. Create tasks that are specific, estimable, and assignable.

## Instructions:
1. Analyze each feature and break it into discrete, completable tasks
2. Consider all disciplines: Frontend, Backend, Design, QA, DevOps
3. Order tasks logically based on dependencies
4. Keep tasks small enough to complete in 1-8 hours ideally
5. Include setup, implementation, testing, and documentation tasks
6. Think about edge cases, error handling, and polish

## For Each Task, Provide:
1. **title**: Clear action-oriented title starting with a verb (e.g., "Create user registration API endpoint")
2. **description**: What needs to be done, including technical details (2-4 sentences)
3. **priority**: One of: "low", "medium", "high"
   - high: Blocking other tasks, critical path
   - medium: Important but not blocking
   - low: Polish, optimization, nice-to-have
4. **estimatedHours**: Realistic estimate (1-40 hours)
   - Simple tasks: 1-4 hours
   - Medium tasks: 4-8 hours
   - Complex tasks: 8-16 hours
   - Very complex: 16-40 hours (consider breaking down further)
5. **role**: Primary responsible party:
   - "Frontend" - UI components, client-side logic
   - "Backend" - APIs, database, server logic
   - "Design" - UI/UX design, prototypes
   - "QA" - Testing, test cases, automation
   - "DevOps" - Infrastructure, deployment, monitoring
   - "Product" - Documentation, stakeholder communication
   - "Full Stack" - Tasks spanning frontend and backend
6. **dependencies**: Array of other task titles this depends on (empty if none)
7. **featureId**: Reference to the parent feature (will be provided)

## Task Categories to Consider:
- **Design**: Wireframes, mockups, prototypes, design review
- **Backend**: API endpoints, database schema, business logic, integrations
- **Frontend**: Components, pages, state management, API integration
- **Testing**: Unit tests, integration tests, E2E tests, manual testing
- **DevOps**: Environment setup, CI/CD, monitoring, deployment
- **Documentation**: Technical docs, API docs, user guides

## Output Format:
Return a JSON array of tasks. Example:
\`\`\`json
[
  {
    "title": "Design user registration flow wireframes",
    "description": "Create wireframes for the registration flow including form fields, validation states, and success/error screens. Consider mobile and desktop layouts.",
    "priority": "high",
    "estimatedHours": 4,
    "role": "Design",
    "dependencies": []
  },
  {
    "title": "Create user database schema and migrations",
    "description": "Design and implement the users table with fields for email, hashed password, profile data, and timestamps. Include proper indexes for query performance.",
    "priority": "high",
    "estimatedHours": 3,
    "role": "Backend",
    "dependencies": []
  },
  {
    "title": "Implement user registration API endpoint",
    "description": "Create POST /api/auth/register endpoint with email validation, password hashing, duplicate checking, and proper error responses. Include rate limiting.",
    "priority": "high",
    "estimatedHours": 6,
    "role": "Backend",
    "dependencies": ["Create user database schema and migrations"]
  },
  {
    "title": "Build registration form component",
    "description": "Create React component with email and password fields, client-side validation, loading states, and error display. Follow design wireframes.",
    "priority": "high",
    "estimatedHours": 5,
    "role": "Frontend",
    "dependencies": ["Design user registration flow wireframes", "Implement user registration API endpoint"]
  },
  {
    "title": "Write unit tests for registration API",
    "description": "Test cases for successful registration, duplicate email, invalid email format, weak password, and rate limiting. Achieve >90% coverage.",
    "priority": "medium",
    "estimatedHours": 4,
    "role": "QA",
    "dependencies": ["Implement user registration API endpoint"]
  }
]
\`\`\`

IMPORTANT: Return ONLY the JSON array, no additional text or markdown code fences in your response.`;

// ============================================================================
// PRD IMPROVEMENT PROMPT
// ============================================================================

export const PRD_IMPROVEMENT_PROMPT = `You are a world-class Senior Product Manager doing a rigorous PRD review. Your job is to make this PRD excellent, not just better. Rewrite it fully — don't just add comments.

## Review Process
First, identify the top weaknesses:
- Where is content vague, generic, or missing specificity?
- Are there missing sections or sections with placeholder content?
- Are Mermaid diagrams absent, incomplete, or syntactically broken?
- Are requirements not testable? Do Must Haves lack user stories?
- Are success metrics missing real numbers?

## Output Contract
1. Return the COMPLETE improved PRD — all 7 sections in full
2. Use these inline markers to show your changes:
   - **[ADDED]** — new content that was missing
   - **[IMPROVED]** — content rewritten to be more specific/actionable
   - **[QUESTION]** — genuine ambiguity needing stakeholder input
3. Restructure to the 7 Linear-style sections if needed
4. Remove any non-standard sections (User Personas, Goals & Success Metrics as standalone sections, etc.)

## Required Output Sections (USE ONLY THESE):
1. ## 📋 Overview — Concrete, specific, measurable
2. ## 🎯 Problem — Real scenario + quantified impact + why current solutions fail
3. ## 📍 Current Scenario — Step-by-step workflow + current-state Mermaid flowchart
4. ## ⚖️ Considerations — Constraints + trade-offs WITH rationale
5. ## 💭 Assumptions — Table with Confidence (H/M/L) + consequence if wrong
6. ## 📊 Diagrams — At least 2 Mermaid diagrams
7. ## ✨ Solution — MoSCoW requirements (Must Haves with user stories + ACs) + Success Metrics table with numbers

## Mermaid Rules
- ONLY \`\`\`mermaid flowchart TD\`\`\` or \`\`\`mermaid sequenceDiagram\`\`\`
- Node labels with parentheses MUST use double quotes: \`A["Login (OAuth)"]\`
- Every arrow must have both source and target — fix any broken arrows

## SELF-VALIDATION (Before outputting)
□ All 7 sections present with real, specific content
□ At least 2 valid Mermaid diagrams
□ Every Must Have has user story + acceptance criteria
□ Every assumption has confidence level
□ All metrics have real numbers
If any criterion fails → fix it before outputting.`;

// ============================================================================
// SECTION-SPECIFIC GENERATION PROMPTS (Linear-style)
// ============================================================================

export const SECTION_GENERATION_PROMPTS: Record<string, string> = {
  'overview': `Generate an overview section that:
- Summarizes what we're building in 2-3 sentences
- Explains why it matters and the expected impact
- Can stand alone - someone reading only this section understands the essence

Format: 1-2 paragraphs, approximately 100-200 words.`,

  'problem': `Generate a problem section that:
- States the problem from the USER's perspective
- Quantifies the pain: How often? How severe? How many affected?
- Includes who is affected and their context
- Connects to business impact where relevant

Format: 2-3 paragraphs with clear problem articulation.`,

  'current-scenario': `Generate a current scenario section that:
- Describes how users currently accomplish this task
- Identifies workarounds that exist and why they're inadequate
- Includes a flowchart if it helps visualize the current process
- Highlights key pain points in the current flow

Format: Description with optional Mermaid flowchart.`,

  'considerations': `Generate a considerations section that:
- Lists technical constraints or dependencies
- Notes business constraints (timeline, budget, resources)
- Documents trade-offs being made and why
- Identifies external dependencies (APIs, vendors, other teams)

Format: Organized bullet points by category.`,

  'assumptions': `Generate an assumptions section that:
- Lists what we're assuming to be true
- Assigns confidence level (High/Medium/Low) to each
- Notes what would change if assumption is wrong
- Includes both technical and business assumptions

Format: Table or list with confidence levels.`,

  'diagrams': `Generate 2-4 Mermaid diagrams that:
- Include a user flow or journey diagram
- Show system architecture or data flow
- Add a state diagram if applicable
- Use appropriate diagram types (flowchart, sequence, ER, etc.)

Format: Valid Mermaid code blocks with brief descriptions.`,

  'solution': `Generate a solution section that:
- Describes the high-level approach
- Lists requirements using MoSCoW prioritization:
  * Must Have - Critical for launch
  * Should Have - Important but not blocking
  * Could Have - Nice to have
  * Won't Have - Explicitly out of scope
- Defines success metrics that are specific and measurable
- Explains how we'll know if this is successful

Format: Structured with clear subsections for approach, requirements, and metrics.`,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getSectionPrompt(sectionId: string): string {
  return SECTION_GENERATION_PROMPTS[sectionId] || 
    `Generate detailed, actionable content for the ${sectionId} section of the PRD. Be specific and include concrete examples.`;
}

export default {
  PRD_GENERATION_PROMPT,
  FEATURE_GENERATION_PROMPT,
  TASK_GENERATION_PROMPT,
  PRD_IMPROVEMENT_PROMPT,
  SECTION_GENERATION_PROMPTS,
  getSectionPrompt,
};
