/**
 * Generation Prompts for PRD, Features, and Tasks
 * 
 * Comprehensive prompts optimized for extracting structured data
 * that can be directly used to create features and tasks in the system.
 */

// ============================================================================
// PRD GENERATION PROMPT
// ============================================================================

export const PRD_GENERATION_PROMPT = `Generate a comprehensive Product Requirements Document (PRD) based on the user's input.

## Instructions:
1. Analyze the user's product idea/description thoroughly
2. Ask clarifying questions mentally and make reasonable assumptions
3. Generate a complete PRD with all relevant sections
4. Be specific and actionable - avoid vague statements
5. Include concrete examples and metrics where possible
6. Consider edge cases and potential issues
7. Make the PRD immediately useful for engineering and design teams

## Output Format:
Use clear Markdown formatting with:
- H2 (##) for main sections
- H3 (###) for subsections
- Bullet points for lists
- Tables for structured data
- Code blocks for technical specifications
- Bold for emphasis on key points

## Required Sections:
Generate content for each section that is relevant to the product. Skip sections that don't apply.

Remember: A great PRD answers every question an engineer or designer might have before they start working.`;

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

export const PRD_IMPROVEMENT_PROMPT = `You are a senior product manager reviewing a PRD for completeness and quality. Your goal is to identify gaps and suggest improvements.

## Review Criteria:
1. **Clarity**: Is every statement unambiguous?
2. **Completeness**: Are all necessary sections covered?
3. **Specificity**: Are requirements specific and measurable?
4. **Consistency**: Do all parts align with each other?
5. **Feasibility**: Are requirements realistic?
6. **User Focus**: Is the user's perspective central?
7. **Testability**: Can requirements be verified?
8. **Priority**: Is scope appropriately prioritized?

## Instructions:
1. Read the PRD thoroughly
2. Identify gaps, inconsistencies, and areas needing clarification
3. Provide specific, actionable suggestions
4. Rewrite weak sections to show what "good" looks like
5. Add missing information where you can reasonably infer it
6. Flag genuine open questions that need stakeholder input

## Output Format:
Return the improved PRD with:
- Clear section headings
- [ADDED] markers for new content
- [IMPROVED] markers for enhanced content
- [QUESTION] markers for items needing clarification
- Specific metrics and acceptance criteria throughout`;

// ============================================================================
// SECTION-SPECIFIC GENERATION PROMPTS
// ============================================================================

export const SECTION_GENERATION_PROMPTS: Record<string, string> = {
  'executive-summary': `Generate an executive summary that:
- Opens with a compelling hook about the problem's impact
- Summarizes problem, solution, and expected outcome in 3-5 sentences
- Includes 2-3 key success metrics
- Makes clear why this is the right time to build this
- Can stand alone for executives who only read this section

Format: 1-2 paragraphs, approximately 150-250 words.`,

  'problem-statement': `Generate a problem statement that:
- States the problem from the USER's perspective
- Quantifies the pain (frequency, severity, number affected)
- Includes a synthesized user quote that captures the frustration
- Explains current workarounds and why they're inadequate
- Connects to business impact (revenue, retention, acquisition)
- Gets to root causes, not just symptoms

Format: 2-3 paragraphs with supporting bullet points.`,

  'goals-success-metrics': `Generate goals and success metrics that:
- Define ONE primary goal that determines success
- List 2-3 secondary goals
- For each goal, provide SMART metrics:
  * Baseline (current state)
  * Target (future state)
  * Timeline for achievement
  * How it will be measured
- Include guardrail metrics (things that shouldn't get worse)
- Define short-term (launch), medium-term (30-60 days), and long-term (6 months) targets

Format: Structured with clear metric tables.`,

  'user-personas': `Generate user personas that:
- Create 2-3 distinct personas (primary and secondary)
- For each persona include:
  * Memorable name and title
  * Context and demographics
  * Goals and what success looks like
  * Specific pain points and frustrations
  * Current behavior and workarounds
  * A quote capturing their mindset
- Define anti-personas (who this is NOT for)
- Include the Job-to-be-Done for each persona

Format: Structured persona profiles.`,

  'user-stories': `Generate user stories that:
- Follow format: "As a [persona], I want [capability] so that [benefit]"
- Cover the complete user journey
- Include happy path AND edge cases
- Prioritize using MoSCoW (Must, Should, Could, Won't)
- Add acceptance criteria for each story
- Group by epic or theme

Format: Organized list with clear prioritization.`,

  'functional-requirements': `Generate functional requirements that:
- Use unique IDs (FR-001, FR-002, etc.)
- Include description, rationale, and acceptance criteria
- Assign priority (P0, P1, P2)
- Note dependencies
- Cover all user actions and system behaviors
- Include validation rules and error handling

Format: Structured requirements with IDs and clear acceptance criteria.`,

  'non-functional-requirements': `Generate non-functional requirements covering:
- Performance: Response times, throughput targets
- Scalability: Load expectations, growth projections
- Reliability: Uptime, failover requirements
- Security: Authentication, authorization, data protection
- Privacy: Data handling, compliance requirements
- Accessibility: WCAG compliance level
- Compatibility: Supported browsers/devices/platforms

Format: Organized by category with specific, measurable requirements.`,

  'technical-considerations': `Generate technical considerations including:
- Recommended architecture approach
- Integration points with existing systems
- Data model considerations
- API requirements
- Third-party dependencies
- Performance optimization opportunities
- Migration strategy if applicable

Format: Technical guidance that informs but doesn't constrain implementation.`,

  'ux-considerations': `Generate UX considerations including:
- Design principles for this feature
- Information architecture
- Key screens/views needed
- Interaction patterns to use
- Responsive/mobile requirements
- Loading, empty, and error states
- Accessibility requirements
- Descriptions of key user flows

Format: UX guidelines with flow descriptions.`,

  'timeline-milestones': `Generate a timeline with:
- Phase breakdown (MVP/Alpha/Beta/GA or custom phases)
- For each phase: scope, duration, deliverables, success criteria
- Major milestones with target dates
- Go/no-go decision points
- Buffer for unknowns
- Critical dependencies

Format: Phase-based timeline with milestone table.`,

  'risks-mitigations': `Generate a risk analysis with:
- 5-10 significant risks across categories (technical, business, user, operational)
- For each risk:
  * Clear description
  * Likelihood (High/Medium/Low)
  * Impact (High/Medium/Low)
  * Mitigation strategy
  * Contingency plan
  * Owner
- Prioritize by risk score (likelihood × impact)

Format: Risk register table with mitigation strategies.`,

  'open-questions': `Generate open questions that:
- Capture unresolved decisions
- For each question:
  * The question itself
  * Why it matters (impact of different answers)
  * Who should answer it
  * Default assumption if not resolved
  * Deadline for resolution
- Categorize: Design, Technical, Business, Legal
- Prioritize: Blocking vs. non-blocking

Format: Organized question list with context.`,
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
