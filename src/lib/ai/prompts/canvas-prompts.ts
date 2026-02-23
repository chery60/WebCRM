/**
 * Canvas Generation Prompts
 * 
 * Optimized prompts for generating Excalidraw diagrams from PRD content.
 * These prompts are designed to be token-efficient while producing high-quality output.
 * 
 * Key optimization strategies:
 * 1. Use structured JSON output for direct Excalidraw element creation
 * 2. Minimal but precise instructions
 * 3. Leverage PRD context efficiently
 * 4. Generate compact element specifications
 */

import type { CanvasGenerationType } from '@/components/canvas/prd-canvas';

// ============================================================================
// SYSTEM PROMPT - Optimized for token efficiency
// ============================================================================

export const CANVAS_SYSTEM_PROMPT = `You generate Excalidraw diagram elements as a JSON array. Your response must be ONLY a valid JSON array starting with [ and ending with ]. No markdown, no explanations, no code blocks, NO comments (// or /* */ are forbidden inside JSON).

RESPOND WITH THIS EXACT FORMAT - A JSON ARRAY:
[
  {"type":"text","x":300,"y":30,"text":"Title","fontSize":24,"strokeColor":"#1e1e1e","id":"title-1"},
  {"type":"rectangle","x":100,"y":100,"width":180,"height":70,"text":"Box 1","backgroundColor":"#e3f2fd","id":"shape-1"},
  {"type":"arrow","x":290,"y":135,"points":[[0,0],[60,0]],"startId":"shape-1","endId":"shape-2"}
]

ELEMENT TYPES:
- rectangle: x, y, width, height, text, backgroundColor, id (required for binding)
- ellipse: x, y, width, height, text, backgroundColor, id (required for binding)
- diamond: x, y, width, height, text, backgroundColor, id (required for binding)
- arrow: x, y, points (array of [x,y] pairs), startId, endId - x,y is the START position
- text: x, y, text, fontSize, strokeColor, id (optional)

ARROW BINDING (CRITICAL - CONNECT ARROWS TO SHAPES):
1. EVERY arrow MUST have startId and endId properties
2. startId = id of the shape where the arrow begins
3. endId = id of the shape where the arrow ends
4. Arrow points are RELATIVE to arrow's x,y position
5. Example: {"type":"arrow","x":280,"y":135,"points":[[0,0],[70,0]],"startId":"box-1","endId":"box-2"}
   This creates an arrow from box-1 to box-2, starting at (280,135) going right 70px

LAYOUT RULES (CRITICAL - PREVENT OVERLAPPING):
1. HORIZONTAL FLOW: Place shapes in rows with consistent spacing
   - Row 1: x:100, x:300, x:500, x:700, x:900 (200px apart)
   - Row 2: x:100, x:300, x:500, x:700, x:900 (same x positions)
   - Arrows connect shapes: calculate proper x,y based on shape positions
2. VERTICAL SECTIONS: Different diagram sections MUST have 400px+ vertical gap
   - Section 1 starts at y:50
   - Section 2 starts at y:500
   - Section 3 starts at y:950
3. WITHIN A SECTION:
   - Title at y:section_start
   - Row 1 shapes at y:section_start + 80
   - Row 2 shapes at y:section_start + 180 (100px gap between rows)
   - Row 3 shapes at y:section_start + 280
4. STANDARD SIZES:
   - Rectangles: width:160, height:70
   - Ellipses: width:120, height:60
   - Diamonds: width:140, height:90
5. NEVER place two shapes with overlapping x,y coordinates
6. Keep text CONCISE - max 25 characters per shape

ELEMENT IDs:
- Use descriptive IDs: "home-page", "user-flow-1", "api-gateway", etc.
- IDs must be unique within the diagram
- Arrows reference these IDs in startId/endId

COLORS: #e3f2fd (blue), #e8f5e9 (green), #fff3e0 (orange), #fce4ec (pink), #f3e5f5 (purple), #e0f2f1 (teal), #fff8e1 (amber)

QUALITY REQUIREMENTS:
- Generate DETAILED, COMPREHENSIVE diagrams
- Include ALL relevant information from the context
- Create proper visual hierarchy
- Connect all related elements with arrows

CRITICAL: Output ONLY the JSON array. No other text before or after.`;

// ============================================================================
// GENERATION PROMPTS BY TYPE
// ============================================================================

export const CANVAS_GENERATION_PROMPTS: Record<CanvasGenerationType, string> = {
  'information-architecture': `Generate a COMPREHENSIVE and DETAILED Information Architecture (IA) diagram as JSON array. This must be a COMPLETE sitemap derived EXCLUSIVELY from the PRD/note content provided above.

CRITICAL REQUIREMENTS:
1. Generate 50-80 total elements (shapes + arrows) for a comprehensive diagram
2. EVERY shape MUST have a unique "id" property (e.g., "nav-home", "page-settings")
3. EVERY arrow MUST have "startId" and "endId" properties to connect shapes
4. READ the PRD content carefully and extract EVERY feature, page, module, and section mentioned
5. Output the COMPLETE JSON array — do NOT stop or truncate mid-generation
6. DO NOT use generic placeholder names like "Feature A" or "Page 1" — use the ACTUAL names from the PRD
7. Each generation must reflect the EXACT content of THIS specific PRD, not a generic app

STRUCTURE - MULTI-LEVEL HIERARCHY:
1. Title: "Information Architecture" (text, fontSize:24, x:450, y:30, id:"ia-title")

2. Level 1 - Main Navigation (y:100): 6-8 primary sections extracted from the PRD
   - Use ACTUAL module/section names from the PRD content
   - Rectangle: width:160, height:70, backgroundColor:"#e3f2fd"
   - Position: x:100, x:300, x:500, x:700, x:900, x:1100, x:1300 (200px apart)
   - IDs: use descriptive IDs matching the actual content (e.g., "nav-crm", "nav-analytics")

3. Level 2 - Sub-pages (y:230): 4-6 pages under EACH Level 1 section
   - Extract DIRECTLY from PRD features, user stories, and requirements
   - Rectangle: width:140, height:60, backgroundColor:"#e8f5e9"
   - Align under parent section, space 150px apart horizontally

4. Level 3 - Features/Components (y:360): 2-4 key features per Level 2 page
   - Detailed functionality and components from the PRD
   - Rectangle: width:120, height:50, backgroundColor:"#f3e5f5"

5. Arrows - Connect ALL relationships with startId/endId

ARROW POSITIONING (CRITICAL):
- arrow.x = parent.x + parent.width/2, arrow.y = parent.y + parent.height
- points: [[0,0],[0, child.y - (parent.y + parent.height)]]

MANDATORY:
- Minimum 50 elements total (25+ shapes, 25+ arrows)
- ALL node labels must come from the ACTUAL PRD content provided
- Every parent-child relationship MUST have a connecting arrow with startId/endId
- Generate the COMPLETE array - do not stop early`,

  'user-flow': `Generate a COMPREHENSIVE User Flow diagram showing the complete user journey as JSON array. Base this ENTIRELY on the PRD/note content provided above.

STRUCTURE - MAP THE ENTIRE USER EXPERIENCE FROM THE PRD:
1. Title: "User Flow: [product name from PRD]" (text, fontSize:24, x:400, y:30, id:"flow-title")
2. Start: Entry point (green ellipse, id:"start")
3. Actions: 8-12 user action steps (blue rectangles)
   - Extract EVERY key user action from the PRD — use ACTUAL feature names, not generic ones
   - Include: all onboarding steps, primary workflows, key interactions mentioned in PRD
4. Decisions: 3-5 decision points (orange diamonds)
   - Show REAL branching logic from the PRD (e.g., "Authenticated?", "Has Workspace?")
5. End states: Multiple outcomes relevant to THIS product
   - Success states (green ellipses) — name them after actual PRD outcomes
   - Error states (pink rectangles) — use actual error scenarios from PRD
6. Arrows: Connect ALL steps with startId/endId

LAYOUT - MULTI-ROW FLOW:
Row 1 (y:100): Start → Action 1 → Action 2 → Action 3
Row 2 (y:220): Action 4 → Decision 1 → Action 5 → Action 6
Row 3 (y:340): Decision 2 → Success / Error paths
Row 4 (y:460): Alternative outcomes

Horizontal spacing: x:100, x:280, x:460, x:640, x:820, x:1000 (180px apart)

QUALITY TARGETS:
- Minimum 30-40 elements for a complete flow
- ALL labels must use ACTUAL feature/step names from the PRD — NO generic placeholders
- Show ALL major user paths described in the PRD
- Include every decision point, error state, and success outcome from the PRD
- Connect every element with arrows (use startId/endId)`,

  'edge-cases': `Generate an Edge Cases & Error States diagram as JSON array. Extract ALL edge cases DIRECTLY from the PRD/note content provided above.

STRUCTURE:
1. Title: "Edge Cases & Error Handling" (text, fontSize 24, id:"title")
2. Categories (left column, blue rectangles): Extract actual categories from the PRD (e.g., auth errors, data validation, network failures, permission issues)
3. Normal states (green rectangles): Expected/happy-path behaviors from PRD
4. Edge cases (orange rectangles): Boundary conditions specific to THIS product
5. Error states (pink rectangles): Failure scenarios mentioned or implied in PRD
6. Recovery actions (blue rectangles): How to handle each — use actual PRD guidance

LAYOUT: Categories in left column (x:50), states in columns (x:250, x:450, x:650).
Rows spaced 90px apart. Use arrows to show error→recovery relationships with startId/endId.
Generate 20-30 elements covering ALL edge cases from the PRD. Use ACTUAL error names from the PRD.`,

  'competitive-analysis': `Generate a Competitive Analysis Matrix as JSON array. Extract competitors and features DIRECTLY from the PRD/note content provided above.

STRUCTURE:
1. Title: "Competitive Analysis" (text, fontSize 24, top, id:"title")
2. Header row: "Features" label + competitor names extracted from PRD (rectangles, y:100)
   - Use ACTUAL competitor names mentioned in the PRD (e.g., "Salesforce", "HubSpot")
   - If no competitors named, infer likely ones from the product domain in the PRD
3. Feature rows: Key feature categories extracted from the PRD (left column, y:170+)
   - Use ACTUAL features from the PRD, not generic ones
4. Comparison cells: ✓ (green #e8f5e9), ~ (orange #fff3e0), ✗ (pink #fce4ec) for each competitor
5. Our product column highlighted (blue #e3f2fd background) — named after the PRD product

LAYOUT: Grid format, header at y:100, rows spaced 70px apart.
Columns spaced 200px apart. Cell sizes 180x55. 
Generate 20-28 elements. ALL labels from the actual PRD content.`,

  'data-model': `Generate a Data Model (ERD) diagram as JSON array. Extract ALL entities DIRECTLY from the PRD/note content provided above.

STRUCTURE:
1. Title: "Data Model" (text, fontSize 24, id:"title")
2. Entities: 5-8 main entities extracted from the PRD (rectangles with entity name as id)
   - Use ACTUAL entity names from the PRD (e.g., "User", "Workspace", "Pipeline", "Note")
   - Show key attributes as text inside each entity rectangle
3. Relationships: Arrows between related entities with startId/endId
4. Cardinality labels: text elements showing 1:1, 1:N, N:N on relationships

LAYOUT: Arrange entities to minimize crossing arrows. Primary entities in center row.
Use #e3f2fd (blue) for core entities, #e8f5e9 (green) for reference data, #f3e5f5 (purple) for junction tables.
Generate 18-28 elements. ALL entity and field names must come from the actual PRD.`,

  'system-architecture': `Generate a COMPREHENSIVE System Architecture diagram as JSON array. Base this ENTIRELY on the technical requirements from the PRD/note content provided above.

STRUCTURE - SHOW COMPLETE TECHNICAL STACK FROM PRD:
1. Title: "System Architecture" (text, fontSize 24, x:400, y:30, id:"arch-title")
2. Client Layer (y:100): All client applications mentioned in the PRD
   - Use ACTUAL client types from PRD (web app, mobile, admin, etc.)
3. API Layer (y:230): API infrastructure relevant to the PRD
   - Include auth, gateway, load balancing as described in PRD
4. Service Layer (y:360): ALL microservices/modules from the PRD
   - Extract EVERY service mentioned (e.g., user service, messaging, analytics, AI service)
   - Use ACTUAL service names from the PRD
5. Data Layer (y:490): Data storage solutions from the PRD
   - Use ACTUAL database/cache/queue technologies mentioned
6. External Services (right column, x:1000): Third-party integrations from PRD
   - Use ACTUAL integration names mentioned (Stripe, SendGrid, OpenAI, Supabase, etc.)
7. Arrows: Show ALL data flows using startId/endId

LAYOUT: Horizontal spacing 200px, vertical layers 130px apart.
QUALITY TARGETS:
- Minimum 30-40 elements — ALL names from the actual PRD
- Show EVERY technical component, integration, and data flow from the PRD
- Every connection must have arrows with startId/endId`,

  'journey-map': `Generate a User Journey Map as JSON array. Extract ALL journey details DIRECTLY from the PRD/note content provided above.

STRUCTURE:
1. Title: "User Journey Map" (text, fontSize:24, id:"title")
2. Stages row (y:120): 5-6 journey stages from the PRD (blue rectangles, width:140, height:50)
   - Use ACTUAL journey stages relevant to THIS product (e.g., "Sign Up", "Onboard", "Create PRD", "Collaborate", "Export")
3. Actions row (y:200): What user does at each stage — from PRD user stories (green rectangles)
4. Touchpoints row (y:280): Where interaction happens — use actual PRD screens/features
5. Emotions row (y:350): 😊 😐 😟 indicators as text elements
6. Pain points row (y:420): Issues at each stage — extracted from PRD pain points/risks (pink rectangles)

Stage spacing: x:100, x:290, x:480, x:670, x:860 (190px apart)
Connect stages with horizontal arrows (startId/endId).
Generate 25-35 elements. ALL text must reference ACTUAL PRD content — no generic placeholders.`,

  'wireframe': `Generate a Wireframe layout diagram as JSON array. Base this on the UI/screen descriptions in the PRD/note content provided above.

STRUCTURE — show the PRIMARY screen of the product described in the PRD:
1. Title: "[Screen Name from PRD] Wireframe" (text, fontSize 20, id:"title")
2. Container: Main screen frame (large rectangle 500x700, strokeColor:"#795548", id:"screen")
3. Header: Top bar with the product's actual navigation items from PRD (rectangle, #efebe9)
4. Sidebar/Nav: Navigation items matching the actual PRD features (brown rectangles)
5. Main Content: Primary content area — represent the key feature from PRD (large #efebe9 rectangle)
6. Content Blocks: Actual feature cards/sections from the PRD (brown rectangles with real labels)
7. CTAs: Action buttons matching the PRD (small #e3f2fd rectangles with real button names)
8. Status/Footer: Bottom section relevant to the PRD product

ALL labels must use ACTUAL feature names, button names, and section names from the PRD.
Generate 16-22 elements. Use the PRD to determine what the primary screen should show.`,

  'feature-priority': `Generate a Feature Priority Matrix as JSON array. Extract ALL features DIRECTLY from the PRD/note content provided above and place them in the correct quadrants.

STRUCTURE:
1. Title: "Feature Priority Matrix" (text, fontSize 24, x:300, y:30, id:"title")
2. Quadrant backgrounds (large rectangles, 220x180px each):
   - Top-left (x:80, y:100, id:"q-do-first"): "DO FIRST" — High Impact/Low Effort (#e8f5e9)
   - Top-right (x:320, y:100, id:"q-schedule"): "SCHEDULE" — High Impact/High Effort (#e3f2fd)
   - Bottom-left (x:80, y:300, id:"q-delegate"): "DELEGATE" — Low Impact/Low Effort (#fff3e0)
   - Bottom-right (x:320, y:300, id:"q-eliminate"): "ELIMINATE" — Low Impact/High Effort (#fce4ec)
3. Axis labels: "↑ Impact" (left side text), "Effort →" (bottom text)
4. Features: Place EVERY feature from the PRD in appropriate quadrants (small rectangles 160x45)
   - Analyze each PRD feature and assign it based on described priority, phase, and complexity
   - Use ACTUAL feature names from the PRD — no generic "Feature A/B/C"

Generate 18-28 elements. Base ALL placements on the actual PRD priorities and requirements.`,

  'stakeholder-map': `Generate a Stakeholder Map diagram as JSON array. Extract ALL stakeholders DIRECTLY from the PRD/note content provided above.

STRUCTURE:
1. Title: "Stakeholder Map" (text, fontSize 24, id:"title")
2. Center: The product name from PRD (large green ellipse, x:450, y:300, width:160, height:80, id:"center-product")
3. Inner ring (high influence, y:~150-450, close to center): Core stakeholders from PRD
   - Use ACTUAL roles/people mentioned in the PRD
4. Middle ring (medium influence, further from center): Key stakeholders from PRD
5. Outer ring (low influence, outermost): External parties relevant to the PRD
6. Connections: Arrows from center to all stakeholders using startId/endId

LAYOUT: Radial arrangement. Inner ring ~180px from center, middle ~320px, outer ~480px.
Use ACTUAL stakeholder names/roles from the PRD. 
Generate 18-26 elements with proper arrow bindings connecting all stakeholders to center.`,

  'risk-matrix': `Generate a Risk Assessment Matrix as JSON array. Extract ALL risks DIRECTLY from the PRD/note content provided above.

STRUCTURE:
1. Title: "Risk Assessment Matrix" (text, fontSize 24, id:"title")
2. Grid: 3x3 matrix of rectangles (140x100px each, starting x:200, y:150)
   - High/High (x:480,y:150): Critical — #fce4ec
   - High/Med (x:340,y:150): High — #fce4ec  
   - High/Low (x:200,y:150): Medium — #fff3e0
   - Med/High (x:480,y:250): High — #fff3e0
   - Med/Med (x:340,y:250): Medium — #fff3e0
   - Med/Low (x:200,y:250): Low — #e8f5e9
   - Low/High (x:480,y:350): Medium — #e8f5e9
   - Low/Med (x:340,y:350): Low — #e8f5e9
   - Low/Low (x:200,y:350): Minimal — #e8f5e9
3. Row labels: "High", "Med", "Low" Likelihood (left, x:80)
4. Col labels: "Low", "Med", "High" Impact (top, y:120)
5. Risk items: Place ACTUAL risks from the PRD as small text elements in appropriate cells

Generate 22-32 elements. ALL risk names must come from the actual PRD content.`,

  'sprint-planning': `Generate a Sprint Planning Board as JSON array. Extract ALL tasks/features DIRECTLY from the PRD/note content provided above.

STRUCTURE:
1. Title: "Sprint Planning Board" (text, fontSize 24, id:"title")
2. Column headers (y:80, gray rectangles, width:180, height:45):
   - "Backlog" (x:50), "To Do" (x:250), "In Progress" (x:450), "Done" (x:650)
3. Column backgrounds (y:130, light #f5f5f5 rectangles, 180x400):
   - x:50, x:250, x:450, x:650
4. Task cards — use ACTUAL feature/task names from the PRD:
   - Backlog (x:60, orange #fff3e0): 3-4 items from PRD backlog/future phases
   - To Do (x:260, blue #e3f2fd): 2-3 items from PRD current sprint
   - In Progress (x:460, amber #fff8e1): 1-2 items currently being built per PRD
   - Done (x:660, green #e8f5e9): 1-2 items completed per PRD
5. Each card (width:160, height:65) shows: ACTUAL task name + story point estimate

Generate 20-28 elements. ALL task names from the actual PRD — no generic "Task 1/2/3".`,

  'api-design': `Generate an API Design diagram as JSON array. Extract ALL API endpoints DIRECTLY from the PRD/note content provided above.

STRUCTURE:
1. Title: "API Endpoints" (text, fontSize 24, id:"title")
2. API Gateway: Main entry point (large #e3f2fd rectangle, x:350, y:50, width:200, height:60, id:"gateway")
3. Auth Layer: Authentication middleware (#e0f2f1 rectangle, below gateway, id:"auth")
4. Resource groups organized by the ACTUAL entities in the PRD:
   - GET endpoints (green #e8f5e9): List and detail endpoints for PRD entities
   - POST endpoints (blue #e3f2fd): Create endpoints
   - PUT/PATCH endpoints (orange #fff3e0): Update endpoints
   - DELETE endpoints (pink #fce4ec): Delete endpoints
5. Arrows: Request flow from gateway → auth → resource groups, using startId/endId

Use ACTUAL resource names from the PRD (e.g., /workspaces, /notes, /pipelines, /employees).
Each endpoint label: "METHOD /actual-path" using real PRD entity names.
Generate 22-32 elements with ALL names from the PRD.`,

  'release-timeline': `Generate a Release Timeline/Roadmap as JSON array. Extract ALL phases, milestones and features DIRECTLY from the PRD/note content provided above.

STRUCTURE:
1. Title: "Release Roadmap" (text, fontSize 24, top, id:"title")
2. Timeline: Horizontal line/arrow spanning full width (y:150, id:"timeline")
3. Time markers: Use ACTUAL phases/quarters from the PRD (text above timeline)
   - If PRD mentions phases, use those names exactly
4. Milestones: Diamond shapes at key dates (on timeline, id:"milestone-X")
   - Use ACTUAL milestone names from the PRD
5. Feature blocks below timeline grouped by phase:
   - Phase 1/MVP (green #e8f5e9): ACTUAL MVP features from PRD
   - Phase 2 (blue #e3f2fd): ACTUAL Phase 2 features from PRD
   - Phase 3 (purple #f3e5f5): ACTUAL Phase 3 features from PRD
6. Dependency arrows between related features (startId/endId)

Generate 22-32 elements. ALL feature names and phase names must come from the actual PRD.`,

  'persona': `Generate a User Persona Card as JSON array. Extract ALL persona details DIRECTLY from the PRD/note content provided above.

STRUCTURE:
1. Card background: Large rectangle (500x550, strokeColor:"#e0e0e0", id:"card-bg")
2. Avatar: Ellipse placeholder (top center, #e0f2f1 fill, id:"avatar")
3. Name & Role: Use ACTUAL target user name/role from PRD (text elements)
   - If PRD names a persona, use that name; otherwise derive from target audience
4. Demographics: Age range, location, tech-savviness from PRD target audience description
5. Goals section (green #e8f5e9 rectangle, id:"goals"): 
   - List ACTUAL user goals from the PRD (what does the target user want to achieve?)
6. Pain Points section (pink #fce4ec rectangle, id:"pains"):
   - List ACTUAL frustrations/pain points from the PRD problem statement
7. Key Behaviors section (blue #e3f2fd rectangle, id:"behaviors"):
   - List ACTUAL behaviors described in the PRD for this user type
8. Quote: A realistic quote this persona would say, derived from PRD pain points

Generate 14-18 elements. ALL details must be grounded in the actual PRD content — no generic "Sarah Johnson".`,
};

// ============================================================================
// CONTEXT BUILDER - Extracts minimal context from PRD
// ============================================================================

/**
 * Extracts the most relevant context from PRD content for canvas generation.
 * Optimized to reduce tokens while maintaining quality.
 */
export function extractPRDContextForCanvas(
  prdContent: string,
  productDescription: string,
  generationType: CanvasGenerationType
): string {
  // Generous context limit — we want the AI to have the full PRD
  const maxContextLength = 12000;

  // Keywords that are most relevant for each diagram type (used to boost relevant sections)
  const keywordMap: Record<CanvasGenerationType, string[]> = {
    'information-architecture': ['features', 'pages', 'navigation', 'screens', 'ui', 'functional requirements', 'user stories', 'modules', 'sections'],
    'user-flow':                ['user journey', 'user stories', 'use cases', 'onboarding', 'workflow', 'steps', 'actions', 'flow', 'functional requirements'],
    'edge-cases':               ['edge cases', 'error', 'validation', 'failure', 'exception', 'risk', 'constraint', 'non-functional'],
    'competitive-analysis':     ['competitive', 'competitors', 'market', 'comparison', 'positioning', 'differentiator', 'problem'],
    'data-model':               ['entity', 'data', 'schema', 'database', 'model', 'fields', 'relationships', 'tables', 'technical'],
    'system-architecture':      ['architecture', 'system', 'services', 'infrastructure', 'api', 'integration', 'backend', 'technical', 'non-functional'],
    'journey-map':              ['journey', 'experience', 'touchpoint', 'emotion', 'stage', 'persona', 'user story', 'pain point'],
    'wireframe':                ['screen', 'layout', 'ui', 'component', 'page', 'button', 'form', 'navigation', 'design'],
    'feature-priority':         ['feature', 'priority', 'mvp', 'phase', 'effort', 'impact', 'requirement', 'must have', 'nice to have'],
    'stakeholder-map':          ['stakeholder', 'team', 'user', 'persona', 'role', 'responsibility', 'owner', 'department'],
    'risk-matrix':              ['risk', 'constraint', 'assumption', 'dependency', 'mitigation', 'impact', 'likelihood'],
    'sprint-planning':          ['task', 'sprint', 'story point', 'backlog', 'milestone', 'timeline', 'feature', 'deliverable'],
    'api-design':               ['api', 'endpoint', 'rest', 'request', 'response', 'authentication', 'integration', 'technical'],
    'release-timeline':         ['timeline', 'milestone', 'release', 'phase', 'roadmap', 'quarter', 'launch', 'deadline'],
    'persona':                  ['persona', 'user', 'target audience', 'demographic', 'goal', 'pain point', 'behavior', 'motivation'],
  };

  const keywords = keywordMap[generationType] || [];

  // Always start with the product description (full, not truncated)
  let context = `PRODUCT DESCRIPTION:\n${productDescription}\n\n`;

  // If we have PRD content, extract the most relevant sections first, then append the rest
  if (prdContent && prdContent.trim()) {
    const relevantSections = extractSections(prdContent, keywords);

    if (relevantSections && relevantSections !== prdContent.slice(0, 150 * 5)) {
      // We got targeted sections — include them prominently, then append rest of PRD
      context += `MOST RELEVANT PRD SECTIONS FOR THIS DIAGRAM:\n${relevantSections}\n\n`;

      // Also include the full PRD as additional context
      const fullPRD = prdContent.trim();
      const remainingBudget = maxContextLength - context.length - 200;
      if (remainingBudget > 500) {
        context += `FULL PRD CONTENT:\n${fullPRD.slice(0, remainingBudget)}`;
      }
    } else {
      // No targeted sections found — use the full PRD content directly
      const fullPRD = prdContent.trim();
      const remainingBudget = maxContextLength - context.length - 200;
      context += `PRD CONTENT:\n${fullPRD.slice(0, remainingBudget)}`;
    }
  }

  // Final truncation safety
  if (context.length > maxContextLength) {
    context = context.slice(0, maxContextLength) + '\n...[content truncated]';
  }

  return context;
}

/**
 * Extract sections from PRD content that match keywords.
 * Falls back to returning full content if no markdown headers are found.
 */
function extractSections(content: string, keywords: string[]): string {
  const lines = content.split('\n');
  const relevantLines: string[] = [];
  let inRelevantSection = false;
  let sectionDepth = 0;
  let hasAnyHeaders = false;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

    // Check for section headers (markdown-style)
    if (line.startsWith('#')) {
      hasAnyHeaders = true;
      const isRelevant = keywords.some(kw => lowerLine.includes(kw));
      if (isRelevant) {
        inRelevantSection = true;
        sectionDepth = (line.match(/^#+/) || [''])[0].length;
        relevantLines.push(line);
      } else if (inRelevantSection) {
        const currentDepth = (line.match(/^#+/) || [''])[0].length;
        if (currentDepth <= sectionDepth) {
          inRelevantSection = false;
        }
      }
    } else if (inRelevantSection && line.trim()) {
      relevantLines.push(line);
    }
  }

  // If no headers were found at all (plain text input), or if no relevant
  // sections matched, fall back to returning the full content.
  // This handles the case where editor.state.doc.textContent is passed
  // without markdown formatting.
  if (!hasAnyHeaders || relevantLines.length === 0) {
    const nonEmptyLines = lines.filter(l => l.trim());
    return nonEmptyLines.slice(0, 150).join('\n');
  }

  // Increased limit for more comprehensive diagrams (~2000 tokens worth of content)
  return relevantLines.slice(0, 150).join('\n');
}

// ============================================================================
// OUTPUT PARSER
// ============================================================================

// Enable debug logging via environment variable or localStorage
const isDebugEnabled = (): boolean => {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('CANVAS_DEBUG') === 'true';
  }
  return process.env.NODE_ENV === 'development';
};

const debugLog = (...args: any[]) => {
  if (isDebugEnabled()) {
    console.log('[CanvasParser]', ...args);
  }
};

const debugWarn = (...args: any[]) => {
  if (isDebugEnabled()) {
    console.warn('[CanvasParser]', ...args);
  }
};

const debugError = (...args: any[]) => {
  // Always log errors, but with context
  console.error('[CanvasParser]', ...args);
};

/**
 * Find the matching closing bracket for a JSON array, handling nested arrays properly.
 * This is critical for parsing AI responses that contain nested structures like:
 * {"type":"arrow","points":[[0,0],[60,0]]}
 * 
 * @param str - The string to search in
 * @param startIndex - The index of the opening bracket '['
 * @returns The index of the matching closing bracket, or -1 if not found
 */
function findMatchingBracket(str: string, startIndex: number): number {
  if (startIndex < 0 || startIndex >= str.length || str[startIndex] !== '[') {
    return -1;
  }

  let depth = 0;
  let inString = false;
  let escapeNext = false;

  for (let i = startIndex; i < str.length; i++) {
    const char = str[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '[') {
      depth++;
    } else if (char === ']') {
      depth--;
      if (depth === 0) {
        return i;
      }
    }
  }

  return -1; // No matching bracket found
}

/**
 * Validates that a parsed element has the minimum required properties
 */
function isValidElement(el: any): boolean {
  if (!el || typeof el !== 'object') return false;
  if (!el.type || typeof el.type !== 'string') return false;

  // Type-specific validation
  switch (el.type) {
    case 'arrow':
      // Arrow must have points array
      if (el.points && !Array.isArray(el.points)) return false;
      break;
    case 'text':
      // Text should have text content
      if (el.text !== undefined && typeof el.text !== 'string') return false;
      break;
  }

  // Coordinates should be numbers if present
  if (el.x !== undefined && typeof el.x !== 'number') return false;
  if (el.y !== undefined && typeof el.y !== 'number') return false;
  if (el.width !== undefined && typeof el.width !== 'number') return false;
  if (el.height !== undefined && typeof el.height !== 'number') return false;

  return true;
}

/**
 * Sanitizes element values to prevent rendering issues
 */
function sanitizeElement(el: any): any {
  const sanitized = { ...el };

  // Ensure coordinates are valid numbers
  if (typeof sanitized.x !== 'number' || !isFinite(sanitized.x)) sanitized.x = 100;
  if (typeof sanitized.y !== 'number' || !isFinite(sanitized.y)) sanitized.y = 100;

  // Ensure dimensions are positive
  if (typeof sanitized.width === 'number' && sanitized.width <= 0) sanitized.width = 100;
  if (typeof sanitized.height === 'number' && sanitized.height <= 0) sanitized.height = 60;

  // Sanitize points array for arrows
  if (sanitized.type === 'arrow' && sanitized.points) {
    if (!Array.isArray(sanitized.points) || sanitized.points.length < 2) {
      sanitized.points = [[0, 0], [100, 0]];
    } else {
      // Ensure each point is a valid [x, y] array
      sanitized.points = sanitized.points.map((point: any) => {
        if (Array.isArray(point) && point.length >= 2) {
          return [
            typeof point[0] === 'number' && isFinite(point[0]) ? point[0] : 0,
            typeof point[1] === 'number' && isFinite(point[1]) ? point[1] : 0
          ];
        }
        return [0, 0];
      });
    }
  }

  // Sanitize text content
  if (sanitized.text !== undefined) {
    sanitized.text = String(sanitized.text).slice(0, 500); // Limit text length
  }

  // Sanitize colors - ensure they're valid hex or named colors
  const colorProps = ['strokeColor', 'backgroundColor'];
  for (const prop of colorProps) {
    if (sanitized[prop] && typeof sanitized[prop] === 'string') {
      // Basic validation: should start with # or be a known color
      if (!sanitized[prop].match(/^#[0-9A-Fa-f]{3,8}$/) &&
        !['transparent', 'white', 'black'].includes(sanitized[prop])) {
        delete sanitized[prop]; // Let defaults apply
      }
    }
  }

  return sanitized;
}

/**
 * Strip JavaScript-style comments (// and /* *\/) from outside JSON string values.
 * This handles the case where AI inserts comment lines between JSON elements.
 * e.g.: {"type":"rectangle",...},\n// Level 1: Entry\n{"type":"ellipse",...}
 */
function stripJsonComments(jsonString: string): string {
  let result = '';
  let inString = false;
  let escapeNext = false;
  let i = 0;

  while (i < jsonString.length) {
    const char = jsonString[i];
    const nextChar = jsonString[i + 1];

    if (escapeNext) {
      result += char;
      escapeNext = false;
      i++;
      continue;
    }

    if (char === '\\' && inString) {
      result += char;
      escapeNext = true;
      i++;
      continue;
    }

    if (char === '"') {
      inString = !inString;
      result += char;
      i++;
      continue;
    }

    if (inString) {
      result += char;
      i++;
      continue;
    }

    // Outside a string — check for comments
    if (char === '/' && nextChar === '/') {
      // Line comment — skip until end of line
      i += 2;
      while (i < jsonString.length && jsonString[i] !== '\n') {
        i++;
      }
      continue;
    }

    if (char === '/' && nextChar === '*') {
      // Block comment — skip until */
      i += 2;
      while (i < jsonString.length - 1) {
        if (jsonString[i] === '*' && jsonString[i + 1] === '/') {
          i += 2;
          break;
        }
        i++;
      }
      continue;
    }

    result += char;
    i++;
  }

  return result;
}

/**
 * Attempts to extract JSON from a response that may contain extra text
 */
function extractJsonFromResponse(response: string): string {
  let jsonString = response.trim();

  // Handle escaped JSON (double-encoded)
  if (jsonString.includes('\\"') || (jsonString.includes('\\n') && !jsonString.startsWith('['))) {
    try {
      const unescaped = JSON.parse(jsonString);
      if (typeof unescaped === 'string') {
        jsonString = unescaped;
      }
    } catch {
      // Manual unescaping
      jsonString = jsonString
        .replace(/\\n/g, '\n')
        .replace(/\\r/g, '\r')
        .replace(/\\t/g, '\t')
        .replace(/\\"/g, '"')
        .replace(/\\\\/g, '\\');
    }
  }

  // Remove markdown code blocks
  if (jsonString.includes('```')) {
    const openFenceMatch = jsonString.match(/```(?:json|JSON)?\s*\n?/);
    if (openFenceMatch && openFenceMatch.index !== undefined) {
      const startIdx = openFenceMatch.index + openFenceMatch[0].length;
      const closeFenceIdx = jsonString.indexOf('```', startIdx);
      if (closeFenceIdx > startIdx) {
        jsonString = jsonString.substring(startIdx, closeFenceIdx).trim();
      } else {
        jsonString = jsonString.substring(startIdx).trim();
      }
    }
  }

  return jsonString;
}

/**
 * Fix newlines and special characters inside JSON string values.
 * This handles cases where AI generates unescaped newlines in text.
 */
function fixJsonStringValues(jsonString: string): string {
  // Escape unescaped control characters within JSON string values
  let result = '';
  let inString = false;
  let escapeNext = false;

  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];
    const charCode = char.charCodeAt(0);

    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      result += char;
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      result += char;
      inString = !inString;
      continue;
    }

    // If we're inside a string, escape control characters
    if (inString && charCode < 32) {
      switch (char) {
        case '\n':
          result += '\\n';
          break;
        case '\r':
          result += '\\r';
          break;
        case '\t':
          result += '\\t';
          break;
        case '\b':
          result += '\\b';
          break;
        case '\f':
          result += '\\f';
          break;
        default:
          // Escape other control characters as unicode
          result += '\\u' + charCode.toString(16).padStart(4, '0');
          break;
      }
    } else {
      result += char;
    }
  }

  return result;
}

/**
 * Attempt to repair truncated or malformed JSON arrays.
 * Tries to salvage as many complete elements as possible.
 */
function repairTruncatedJson(jsonString: string): string {
  // Try to find the last complete object in the array
  let depth = 0;
  let inString = false;
  let escapeNext = false;
  let lastCompleteObjectEnd = -1;

  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];

    if (escapeNext) {
      escapeNext = false;
      continue;
    }

    if (char === '\\' && inString) {
      escapeNext = true;
      continue;
    }

    if (char === '"' && !escapeNext) {
      inString = !inString;
      continue;
    }

    if (inString) continue;

    if (char === '{' || char === '[') {
      depth++;
    } else if (char === '}' || char === ']') {
      depth--;
      if (depth === 1 && char === '}') {
        // Found end of a complete object at array level
        lastCompleteObjectEnd = i;
      }
    }
  }

  // If we found complete objects but the array isn't closed, close it
  if (lastCompleteObjectEnd > 0 && depth > 0) {
    debugLog('Repairing truncated JSON, cutting at position:', lastCompleteObjectEnd);
    return jsonString.substring(0, lastCompleteObjectEnd + 1) + ']';
  }

  return jsonString;
}

/**
 * Parse AI response into valid Excalidraw elements.
 * 
 * This function handles various AI response formats including:
 * - Raw JSON arrays
 * - Markdown code blocks (```json ... ```)
 * - Double-encoded JSON strings
 * - JSON with trailing commas
 * - Nested arrays (e.g., arrow points)
 * - Unescaped newlines in string values
 * - Truncated/incomplete JSON
 * 
 * @param response - The raw AI response string
 * @returns Array of Excalidraw-compatible elements, or empty array on failure
 */
export function parseCanvasResponse(response: string): any[] {
  if (!response || typeof response !== 'string') {
    // Log warning instead of error - empty response is handled gracefully
    debugWarn('Empty or invalid response received, returning empty array');
    return [];
  }

  // Trim and check for empty string after trimming
  const trimmedResponse = response.trim();
  if (!trimmedResponse) {
    debugWarn('Response is empty after trimming, returning empty array');
    return [];
  }

  try {
    debugLog('Parsing canvas response, length:', trimmedResponse.length);

    // Step 1: Extract and clean the JSON string
    let jsonString = extractJsonFromResponse(trimmedResponse);

    // Step 2: Find the JSON array with proper bracket matching
    const arrayStart = jsonString.indexOf('[');

    if (arrayStart === -1) {
      debugError('No JSON array found in response');
      return [];
    }

    // Use proper bracket matching to find the end (handles nested arrays)
    let arrayEnd = findMatchingBracket(jsonString, arrayStart);

    if (arrayEnd === -1) {
      // Fallback to lastIndexOf if bracket matching fails
      debugWarn('Bracket matching failed, using fallback');
      arrayEnd = jsonString.lastIndexOf(']');
      if (arrayEnd <= arrayStart) {
        debugError('No matching closing bracket found');
        return [];
      }
    }

    jsonString = jsonString.substring(arrayStart, arrayEnd + 1);
    debugLog('Extracted JSON array, length:', jsonString.length);

    // Step 3: Clean up common JSON issues
    // CRITICAL: Strip // and /* */ comments FIRST — AI often inserts these between elements
    jsonString = stripJsonComments(jsonString);
    // Remove trailing commas (common AI mistake)
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');

    // Step 4: Parse the JSON with multiple recovery strategies
    let elements: any[];
    const parseStrategies = [
      // Strategy 1: Direct parse (after comment stripping)
      () => JSON.parse(jsonString),

      // Strategy 2: Fix newlines inside strings
      () => JSON.parse(fixJsonStringValues(jsonString)),

      // Strategy 3: Strip comments + fix string values
      () => JSON.parse(fixJsonStringValues(stripJsonComments(jsonString))),

      // Strategy 4: Remove all newlines and extra spaces (compact JSON)
      () => {
        let compacted = stripJsonComments(jsonString);
        compacted = fixJsonStringValues(compacted);
        // Collapse all whitespace outside strings
        let result = '';
        let inStr = false;
        let escape = false;
        for (const char of compacted) {
          if (escape) {
            result += char;
            escape = false;
            continue;
          }
          if (char === '\\' && inStr) {
            result += char;
            escape = true;
            continue;
          }
          if (char === '"') {
            inStr = !inStr;
            result += char;
            continue;
          }
          if (inStr) {
            result += char;
          } else if (!/\s/.test(char)) {
            result += char;
          }
        }
        return JSON.parse(result);
      },

      // Strategy 5: Fix unquoted keys and single quotes
      () => {
        let fixed = fixJsonStringValues(stripJsonComments(jsonString));
        // Fix unquoted property names
        fixed = fixed.replace(/([{,]\s*)([a-zA-Z_][a-zA-Z0-9_]*)(\s*:)/g, '$1"$2"$3');
        // Replace single quotes with double quotes (carefully)
        const singleQuotes = (fixed.match(/'/g) || []).length;
        const doubleQuotes = (fixed.match(/"/g) || []).length;
        if (singleQuotes > doubleQuotes * 0.5) {
          fixed = fixed.replace(/'/g, '"');
        }
        return JSON.parse(fixed);
      },

      // Strategy 6: Try to repair truncated JSON
      () => {
        const repaired = repairTruncatedJson(fixJsonStringValues(stripJsonComments(jsonString)));
        return JSON.parse(repaired);
      },
    ];

    let parseSuccess = false;
    let lastError: any = null;

    for (let i = 0; i < parseStrategies.length; i++) {
      try {
        elements = parseStrategies[i]();
        parseSuccess = true;
        if (i > 0) {
          debugLog(`Parse succeeded with strategy ${i + 1}`);
        }
        break;
      } catch (err) {
        lastError = err;
        if (i === 0) {
          debugWarn('Initial parse failed, trying recovery strategies...');
        }
      }
    }

    if (!parseSuccess) {
      debugError('All parse strategies failed. Last error:', lastError);
      debugError('JSON excerpt (first 500 chars):', jsonString.substring(0, 500));
      return [];
    }

    // Step 5: Validate result
    if (!Array.isArray(elements!)) {
      debugError('Parsed result is not an array');
      return [];
    }

    if (elements!.length === 0) {
      debugWarn('Parsed array is empty');
      return [];
    }

    debugLog(`Parsed ${elements!.length} source elements`);
    console.log('🎨 [CanvasParser] RAW AI RESPONSE ELEMENT COUNT:', elements!.length);
    console.log('🎨 [CanvasParser] First 5 elements:', elements!.slice(0, 5));
    console.log('🎨 [CanvasParser] Last 5 elements:', elements!.slice(-5));

    // Step 6: Filter, validate, sanitize, and convert to Excalidraw format
    const validElements = elements!.filter((el, idx) => {
      const valid = isValidElement(el);
      if (!valid) {
        debugWarn(`Skipping invalid element at index ${idx}:`, el);
        console.log('❌ [CanvasParser] INVALID ELEMENT:', el);
      }
      return valid;
    });

    console.log('✅ [CanvasParser] VALID ELEMENTS COUNT:', validElements.length, '/', elements!.length);

    if (validElements.length === 0) {
      debugError('No valid elements found after validation');
      return [];
    }

    const excalidrawElements = validElements
      .map(el => sanitizeElement(el))
      .flatMap((el, index) => {
        try {
          return convertToExcalidrawElement(el, index);
        } catch (convError) {
          debugError(`Failed to convert element at index ${index}:`, convError);
          return [];
        }
      });

    debugLog(`Successfully converted to ${excalidrawElements.length} Excalidraw elements`);

    // Count element types
    const typeCounts: Record<string, number> = {};
    excalidrawElements.forEach(el => {
      typeCounts[el.type] = (typeCounts[el.type] || 0) + 1;
    });
    debugLog('Element type counts:', typeCounts);

    // Post-process to resolve arrow bindings
    const elementsWithBindings = resolveArrowBindings(excalidrawElements);

    return elementsWithBindings;

  } catch (error) {
    debugError('Unexpected error parsing canvas response:', error);
    return [];
  }
}

/**
 * Resolve arrow bindings by connecting arrows to shapes based on IDs from AI response.
 * This processes _tempStartId and _tempEndId to create proper Excalidraw bindings.
 * 
 * @param elements - Array of Excalidraw elements with potential temporary binding IDs
 * @returns Array of elements with resolved bindings
 */
function resolveArrowBindings(elements: any[]): any[] {
  // Build a map of element IDs to their array indices for quick lookup
  const idToIndexMap = new Map<string, number>();

  // First pass: Build ID to index map
  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];
    // Check if element has a user-provided ID stored during conversion
    if (el._originalId) {
      idToIndexMap.set(el._originalId, i);
    }
  }

  debugLog(`Resolving arrow bindings. Found ${idToIndexMap.size} elements with IDs`);

  // Second pass: Process arrows and create bindings
  let arrowsProcessed = 0;
  let bindingsCreated = 0;

  for (let i = 0; i < elements.length; i++) {
    const el = elements[i];

    if (el.type !== 'arrow') {
      continue;
    }

    arrowsProcessed++;

    let startShape: any = null;
    let endShape: any = null;

    // Resolve start binding
    if (el._tempStartId) {
      const targetIndex = idToIndexMap.get(el._tempStartId);
      if (targetIndex !== undefined) {
        const targetElement = elements[targetIndex];
        startShape = targetElement;
        const binding = calculateBinding(el, targetElement, 'start');
        if (binding) {
          el.startBinding = binding;
          bindingsCreated++;

          // Add this arrow to the target element's boundElements
          if (!targetElement.boundElements) {
            targetElement.boundElements = [];
          }
          // Avoid duplicate entries
          if (!targetElement.boundElements.some((b: any) => b.id === el.id)) {
            targetElement.boundElements.push({ type: 'arrow', id: el.id });
          }

          debugLog(`✓ Start binding: arrow ${el.id.substring(0, 20)}... -> ${el._tempStartId}`);
        }
      } else {
        debugWarn(`✗ Start binding target not found: "${el._tempStartId}"`);
      }
      delete el._tempStartId;
    }

    // Resolve end binding
    if (el._tempEndId) {
      const targetIndex = idToIndexMap.get(el._tempEndId);
      if (targetIndex !== undefined) {
        const targetElement = elements[targetIndex];
        endShape = targetElement;
        const binding = calculateBinding(el, targetElement, 'end');
        if (binding) {
          el.endBinding = binding;
          bindingsCreated++;

          // Add this arrow to the target element's boundElements
          if (!targetElement.boundElements) {
            targetElement.boundElements = [];
          }
          // Avoid duplicate entries
          if (!targetElement.boundElements.some((b: any) => b.id === el.id)) {
            targetElement.boundElements.push({ type: 'arrow', id: el.id });
          }

          debugLog(`✓ End binding: arrow ${el.id.substring(0, 20)}... -> ${el._tempEndId}`);
        }
      } else {
        debugWarn(`✗ End binding target not found: "${el._tempEndId}"`);
      }
      delete el._tempEndId;
    }

    // CRITICAL FIX: Recalculate arrow x,y and points to snap precisely to shape edges.
    // The AI generates approximate positions, but we need exact positions for the arrows
    // to visually connect to the shapes.
    if (startShape && endShape) {
      recalculateArrowPosition(el, startShape, endShape);
    } else if (startShape) {
      // Only start shape found — fix the start position, keep endpoint relative
      const startCenter = getShapeEdgePoint(startShape, endShape || { x: el.x + (el.points?.[1]?.[0] || 100), y: el.y + (el.points?.[1]?.[1] || 0) });
      const endAbsX = el.x + (el.points?.[el.points.length - 1]?.[0] || 100);
      const endAbsY = el.y + (el.points?.[el.points.length - 1]?.[1] || 0);
      el.x = startCenter.x;
      el.y = startCenter.y;
      el.points = [[0, 0], [endAbsX - startCenter.x, endAbsY - startCenter.y]];
      el.lastCommittedPoint = el.points[el.points.length - 1];
      el.width = Math.max(Math.abs(el.points[1][0]), 1);
      el.height = Math.max(Math.abs(el.points[1][1]), 1);
    } else if (endShape) {
      // Only end shape found — fix the endpoint
      const endCenter = getShapeEdgePoint(endShape, { x: el.x, y: el.y });
      const startAbsX = el.x;
      const startAbsY = el.y;
      el.points = [[0, 0], [endCenter.x - startAbsX, endCenter.y - startAbsY]];
      el.lastCommittedPoint = el.points[el.points.length - 1];
      el.width = Math.max(Math.abs(el.points[1][0]), 1);
      el.height = Math.max(Math.abs(el.points[1][1]), 1);
    }
  }

  debugLog(`Arrow binding resolution complete: ${arrowsProcessed} arrows processed, ${bindingsCreated} bindings created`);
  return elements;
}

/**
 * Recalculate arrow position and points to snap precisely between two shapes.
 * Computes edges of source and target shapes and sets arrow start/end to those edges.
 */
function recalculateArrowPosition(arrow: any, startShape: any, endShape: any): void {
  const startCenter = {
    x: (startShape.x || 0) + (startShape.width || 100) / 2,
    y: (startShape.y || 0) + (startShape.height || 60) / 2,
  };
  const endCenter = {
    x: (endShape.x || 0) + (endShape.width || 100) / 2,
    y: (endShape.y || 0) + (endShape.height || 60) / 2,
  };

  // Determine the exit point on the start shape and entry point on the end shape
  const startEdge = getShapeEdgePoint(startShape, endCenter);
  const endEdge = getShapeEdgePoint(endShape, startCenter);

  // Set arrow origin to the start edge point
  arrow.x = startEdge.x;
  arrow.y = startEdge.y;

  // Points are relative to arrow's x,y
  const dx = endEdge.x - startEdge.x;
  const dy = endEdge.y - startEdge.y;

  arrow.points = [[0, 0], [dx, dy]];
  arrow.lastCommittedPoint = [dx, dy];
  arrow.width = Math.max(Math.abs(dx), 1);
  arrow.height = Math.max(Math.abs(dy), 1);
}

/**
 * Calculate the edge point of a shape closest to a target point.
 * Returns the point on the shape's boundary that faces toward the target.
 */
function getShapeEdgePoint(
  shape: any,
  target: { x: number; y: number }
): { x: number; y: number } {
  const sx = shape.x || 0;
  const sy = shape.y || 0;
  const sw = shape.width || 100;
  const sh = shape.height || 60;
  const cx = sx + sw / 2;
  const cy = sy + sh / 2;

  const dx = target.x - cx;
  const dy = target.y - cy;

  // Avoid division by zero
  if (dx === 0 && dy === 0) {
    return { x: cx, y: sy + sh }; // Default to bottom center
  }

  // For ellipses, use parametric edge calculation
  if (shape.type === 'ellipse') {
    const rx = sw / 2;
    const ry = sh / 2;
    const angle = Math.atan2(dy, dx);
    return {
      x: cx + rx * Math.cos(angle),
      y: cy + ry * Math.sin(angle),
    };
  }

  // For rectangles and diamonds, find the intersection with the shape boundary
  const absDx = Math.abs(dx);
  const absDy = Math.abs(dy);

  // Determine which edge the line exits through
  // Compare the slope of the line to center with the diagonal of the rectangle
  const aspectRatio = (sh / 2) / (sw / 2);
  const lineSlope = absDy / (absDx || 0.001);

  if (lineSlope > aspectRatio) {
    // Exits through top or bottom edge
    const signY = dy > 0 ? 1 : -1;
    const edgeY = cy + signY * sh / 2;
    const edgeX = cx + (dx / (absDy || 1)) * (sh / 2);
    return { x: edgeX, y: edgeY };
  } else {
    // Exits through left or right edge
    const signX = dx > 0 ? 1 : -1;
    const edgeX = cx + signX * sw / 2;
    const edgeY = cy + (dy / (absDx || 1)) * (sw / 2);
    return { x: edgeX, y: edgeY };
  }
}

/**
 * Calculate the binding point for an arrow to a shape.
 * Determines which edge of the shape the arrow should connect to and the focus point.
 * 
 * @param arrow - The arrow element
 * @param target - The target shape element
 * @param side - Whether this is the 'start' or 'end' of the arrow
 * @returns Binding object with elementId, focus, and gap
 */
function calculateBinding(arrow: any, target: any, side: 'start' | 'end'): any {
  if (!target || !arrow.points || arrow.points.length < 2) {
    return null;
  }

  // Get arrow position (absolute)
  const arrowX = arrow.x || 0;
  const arrowY = arrow.y || 0;

  // Get the arrow point we're binding (relative to arrow.x, arrow.y)
  const pointIndex = side === 'start' ? 0 : arrow.points.length - 1;
  const [relativeX, relativeY] = arrow.points[pointIndex];
  const absoluteX = arrowX + relativeX;
  const absoluteY = arrowY + relativeY;

  // Get target shape bounds
  const targetX = target.x || 0;
  const targetY = target.y || 0;
  const targetWidth = target.width || 100;
  const targetHeight = target.height || 60;
  const targetCenterX = targetX + targetWidth / 2;
  const targetCenterY = targetY + targetHeight / 2;

  // Calculate which edge of the target shape is closest to the arrow point
  const dx = absoluteX - targetCenterX;
  const dy = absoluteY - targetCenterY;

  // Determine primary direction (which edge)
  const isHorizontal = Math.abs(dx) > Math.abs(dy);

  let focus = 0; // Center of edge by default

  if (isHorizontal) {
    // Connecting to left or right edge
    // Focus ranges from -1 (top) to 1 (bottom)
    const edgeY = targetCenterY;
    const relativePosition = (absoluteY - targetY) / targetHeight;
    focus = (relativePosition - 0.5) * 2; // Convert 0-1 to -1 to 1
  } else {
    // Connecting to top or bottom edge
    // Focus ranges from -1 (left) to 1 (right)
    const edgeX = targetCenterX;
    const relativePosition = (absoluteX - targetX) / targetWidth;
    focus = (relativePosition - 0.5) * 2; // Convert 0-1 to -1 to 1
  }

  // Clamp focus to valid range
  focus = Math.max(-1, Math.min(1, focus));

  return {
    elementId: target.id,
    focus: Number(focus.toFixed(3)),
    gap: 8, // Standard gap between arrow and shape
  };
}

/**
 * Convert simplified element format to full Excalidraw elements
 * Returns an array because shapes with text need a separate text element
 * 
 * IMPORTANT: For Excalidraw bound text elements:
 * - Text with containerId should NOT have boundElements on the text itself
 * - The container shape should have boundElements referencing the text
 * - Text x,y should be at the center of the container for proper positioning
 * - Text needs angle: 0 property
 * 
 * ARROW BINDING:
 * - Arrows can have startId/endId from AI response
 * - These will be processed in a second pass to create proper bindings
 * - Bindings connect arrows to shapes with elementId and focus point
 */
function convertToExcalidrawElement(el: any, index: number): any[] {
  const timestamp = Date.now();
  const id = `gen-${timestamp}-${index}`;
  const baseElement = {
    id,
    version: 1,
    versionNonce: Math.random() * 1000000 | 0,
    isDeleted: false,
    fillStyle: 'solid',
    strokeWidth: 2,
    strokeStyle: 'solid',
    roughness: 1,
    opacity: 100,
    seed: Math.random() * 1000000 | 0,
    groupIds: [],
    frameId: null,
    roundness: { type: 3 },
    boundElements: [],
    updated: timestamp,
    link: null,
    locked: false,
    // Store the original ID from AI response for binding resolution
    ...(el.id ? { _originalId: el.id } : {}),
  };

  const elements: any[] = [];

  // Helper to create bound text element
  const createBoundTextElement = (
    textId: string,
    containerId: string,
    containerX: number,
    containerY: number,
    containerWidth: number,
    containerHeight: number,
    text: string,
    fontSize: number = 14,
    strokeColor: string = '#1e1e1e'
  ) => {
    // For bound text in Excalidraw:
    // - The text element's x,y should be at the CENTER of the container
    // - textAlign: 'center' and verticalAlign: 'middle' tell Excalidraw to center the text
    // - The width should accommodate the text, height is based on fontSize
    const textWidth = Math.min(containerWidth - 16, text.length * fontSize * 0.6);
    const textHeight = fontSize * 1.25;

    return {
      id: textId,
      type: 'text',
      // Position text at the exact center of the container
      x: containerX + (containerWidth - textWidth) / 2,
      y: containerY + (containerHeight - textHeight) / 2,
      width: textWidth,
      height: textHeight,
      angle: 0,
      strokeColor,
      backgroundColor: 'transparent',
      fillStyle: 'solid',
      strokeWidth: 2,
      strokeStyle: 'solid',
      roughness: 1,
      opacity: 100,
      seed: Math.random() * 1000000 | 0,
      groupIds: [],
      frameId: null,
      roundness: null,
      boundElements: [],
      updated: timestamp,
      link: null,
      locked: false,
      text,
      fontSize,
      fontFamily: 1,
      textAlign: 'center',
      verticalAlign: 'middle',
      containerId,
      originalText: text,
      lineHeight: 1.25,
      version: 1,
      versionNonce: Math.random() * 1000000 | 0,
      isDeleted: false,
    };
  };

  switch (el.type) {
    case 'rectangle': {
      const width = el.width || 160;
      const height = el.height || 60;
      const x = el.x || 100;
      const y = el.y || 100;

      const textId = el.text ? `gen-${timestamp}-${index}-text` : null;

      const rect = {
        ...baseElement,
        type: 'rectangle',
        x,
        y,
        width,
        height,
        angle: 0,
        strokeColor: el.strokeColor || '#1e1e1e',
        backgroundColor: el.backgroundColor || '#e3f2fd',
        boundElements: textId ? [{ type: 'text', id: textId }] : [],
      };
      elements.push(rect);

      // Add text label if present
      if (el.text && textId) {
        elements.push(createBoundTextElement(
          textId,
          id,
          x, y, width, height,
          el.text,
          el.fontSize || 14,
          el.strokeColor || '#1e1e1e'
        ));
      }
      break;
    }

    case 'ellipse': {
      const width = el.width || 100;
      const height = el.height || 60;
      const x = el.x || 100;
      const y = el.y || 100;

      const textId = el.text ? `gen-${timestamp}-${index}-text` : null;

      const ellipse = {
        ...baseElement,
        type: 'ellipse',
        x,
        y,
        width,
        height,
        angle: 0,
        strokeColor: el.strokeColor || '#1e1e1e',
        backgroundColor: el.backgroundColor || '#e8f5e9',
        boundElements: textId ? [{ type: 'text', id: textId }] : [],
      };
      elements.push(ellipse);

      // Add text label if present
      if (el.text && textId) {
        elements.push(createBoundTextElement(
          textId,
          id,
          x, y, width, height,
          el.text,
          el.fontSize || 14,
          el.strokeColor || '#1e1e1e'
        ));
      }
      break;
    }

    case 'diamond': {
      const width = el.width || 120;
      const height = el.height || 80;
      const x = el.x || 100;
      const y = el.y || 100;

      const textId = el.text ? `gen-${timestamp}-${index}-text` : null;

      const diamond = {
        ...baseElement,
        type: 'diamond',
        x,
        y,
        width,
        height,
        angle: 0,
        strokeColor: el.strokeColor || '#1e1e1e',
        backgroundColor: el.backgroundColor || '#fff3e0',
        boundElements: textId ? [{ type: 'text', id: textId }] : [],
      };
      elements.push(diamond);

      // Add text label if present
      if (el.text && textId) {
        elements.push(createBoundTextElement(
          textId,
          id,
          x, y, width, height,
          el.text,
          el.fontSize || 14,
          el.strokeColor || '#1e1e1e'
        ));
      }
      break;
    }

    case 'arrow': {
      // Ensure points array is valid and properly formatted
      let points: [number, number][] = [[0, 0], [100, 0]];
      if (el.points && Array.isArray(el.points) && el.points.length >= 2) {
        points = el.points.map((p: any) => {
          if (Array.isArray(p) && p.length >= 2) {
            return [Number(p[0]) || 0, Number(p[1]) || 0] as [number, number];
          }
          return [0, 0] as [number, number];
        });
      }

      // Calculate width and height from points
      const minX = Math.min(...points.map(p => p[0]));
      const maxX = Math.max(...points.map(p => p[0]));
      const minY = Math.min(...points.map(p => p[1]));
      const maxY = Math.max(...points.map(p => p[1]));
      const width = Math.max(Math.abs(maxX - minX), 1);
      const height = Math.max(Math.abs(maxY - minY), 1);

      // lastCommittedPoint is required for Excalidraw to consider the element "normalized"
      const lastCommittedPoint = points[points.length - 1];

      // Store startId and endId temporarily for binding processing
      // These will be converted to proper bindings in post-processing
      const arrow = {
        ...baseElement,
        type: 'arrow',
        x: Number(el.x) || 100,
        y: Number(el.y) || 100,
        width,
        height,
        angle: 0,
        strokeColor: el.strokeColor || '#1e1e1e',
        backgroundColor: 'transparent',
        points,
        lastCommittedPoint,
        startBinding: null,
        endBinding: null,
        startArrowhead: null,
        endArrowhead: 'arrow',
        roundness: { type: 2 },
        // Temporary properties for binding resolution
        ...(el.startId ? { _tempStartId: el.startId } : {}),
        ...(el.endId ? { _tempEndId: el.endId } : {}),
      };
      elements.push(arrow);
      break;
    }

    case 'text': {
      const textEl = {
        ...baseElement,
        type: 'text',
        x: el.x || 100,
        y: el.y || 100,
        width: el.width || 150,
        height: el.height || 25,
        angle: 0,
        strokeColor: el.strokeColor || '#1e1e1e',
        backgroundColor: 'transparent',
        text: el.text || '',
        fontSize: el.fontSize || 16,
        fontFamily: 1,
        textAlign: el.textAlign || 'left',
        verticalAlign: 'top',
        containerId: null,
        originalText: el.text || '',
        lineHeight: 1.25,
        roundness: null,
      };
      elements.push(textEl);
      break;
    }

    default: {
      // Default to rectangle for unknown types
      const width = el.width || 160;
      const height = el.height || 60;
      const x = el.x || 100;
      const y = el.y || 100;

      const textId = el.text ? `gen-${timestamp}-${index}-text` : null;

      const rect = {
        ...baseElement,
        type: 'rectangle',
        x,
        y,
        width,
        height,
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: '#e3f2fd',
        boundElements: textId ? [{ type: 'text', id: textId }] : [],
      };
      elements.push(rect);

      // Add text label if present
      if (el.text && textId) {
        elements.push(createBoundTextElement(
          textId,
          id,
          x, y, width, height,
          el.text,
          14,
          '#1e1e1e'
        ));
      }
      break;
    }
  }

  return elements;
}

export default {
  CANVAS_SYSTEM_PROMPT,
  CANVAS_GENERATION_PROMPTS,
  extractPRDContextForCanvas,
  parseCanvasResponse,
};
