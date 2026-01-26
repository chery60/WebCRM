/**
 * Generation Prompts for PRD, Features, and Tasks
 * 
 * Comprehensive prompts optimized for extracting structured data
 * that can be directly used to create features and tasks in the system.
 */

// ============================================================================
// PRD GENERATION PROMPT
// ============================================================================

export const PRD_GENERATION_PROMPT = `Generate a comprehensive Product Requirements Document (PRD) using the Linear-style format.

## Required Sections (USE ONLY THESE):
1. ## 📋 Overview - Executive summary: what we're building and why
2. ## 🎯 Problem - Clear problem statement from user perspective
3. ## 📍 Current Scenario - How things work today, pain points
4. ## ⚖️ Considerations - Trade-offs, constraints, dependencies
5. ## 💭 Assumptions - Explicit assumptions with confidence levels
6. ## 📊 Diagrams - 2-4 Mermaid diagrams illustrating the solution
7. ## ✨ Solution - Approach, Requirements (MoSCoW), Success Metrics

## Instructions:
1. Analyze the user's product idea thoroughly
2. Make reasonable assumptions and document them
3. Include 2-4 Mermaid diagrams (flowchart, sequence, ER, etc.)
4. Be specific and actionable - avoid vague statements
5. Use MoSCoW prioritization for requirements (Must/Should/Could/Won't Have)
6. **IMPORTANT for Mermaid syntax**: If node labels contain parentheses or special characters, wrap the label text in double quotes:
   - WRONG: A[User Login (OAuth)] 
   - CORRECT: A["User Login (OAuth)"]

## Important:
- Do NOT include sections like "User Personas", "Jobs to be Done", "Goals & Success Metrics" as separate sections
- User context goes in the Problem section
- Success metrics go in the Solution section
- Use the exact section headers with emojis as shown above

## Output Format:
Use clear Markdown with the 7 section headers above. Include valid Mermaid code blocks.`;

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

export const PRD_IMPROVEMENT_PROMPT = `You are a senior product manager reviewing and improving a PRD using the Linear-style format.

## Required Sections (USE ONLY THESE):
1. 📋 Overview - Executive summary
2. 🎯 Problem - Clear problem statement
3. 📍 Current Scenario - How things work today
4. ⚖️ Considerations - Trade-offs, constraints
5. 💭 Assumptions - Explicit assumptions
6. 📊 Diagrams - Mermaid diagrams
7. ✨ Solution - Approach, Requirements (MoSCoW), Metrics

## Review Criteria:
1. **Clarity**: Is every statement unambiguous?
2. **Completeness**: Are all 7 sections covered adequately?
3. **Specificity**: Are requirements specific and measurable?
4. **Diagrams**: Are there helpful Mermaid diagrams?
5. **User Focus**: Is the user's perspective central?

## Instructions:
1. Read the PRD thoroughly
2. Restructure to match the 7-section Linear format if needed
3. Add or improve Mermaid diagrams
4. Remove sections like "User Personas", "Jobs to be Done", "Goals & Success Metrics" as separate sections
5. Consolidate user context into Problem section
6. Consolidate success metrics into Solution section

## Output Format:
Return the improved PRD using ONLY the 7 Linear-style sections with emoji headers.`;

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
