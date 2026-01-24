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

export const CANVAS_SYSTEM_PROMPT = `You generate Excalidraw diagram elements as a JSON array. Your response must be ONLY a valid JSON array starting with [ and ending with ]. No markdown, no explanations, no code blocks.

RESPOND WITH THIS EXACT FORMAT - A JSON ARRAY:
[
  {"type":"text","x":300,"y":30,"text":"Title","fontSize":24,"strokeColor":"#1e1e1e"},
  {"type":"rectangle","x":100,"y":100,"width":180,"height":70,"text":"Box 1","backgroundColor":"#e3f2fd"},
  {"type":"arrow","x":290,"y":135,"points":[[0,0],[60,0]]}
]

ELEMENT TYPES:
- rectangle: x, y, width, height, text, backgroundColor
- ellipse: x, y, width, height, text, backgroundColor  
- diamond: x, y, width, height, text, backgroundColor
- arrow: x, y, points (array of [x,y] pairs) - x,y is the START position of the arrow
- text: x, y, text, fontSize, strokeColor

LAYOUT RULES (CRITICAL - PREVENT OVERLAPPING):
1. HORIZONTAL FLOW: Place shapes in a single row with consistent spacing
   - Shape 1 at x:100, Shape 2 at x:350, Shape 3 at x:600, Shape 4 at x:850 (250px apart)
   - Arrow between shapes: x = previous_shape_x + previous_shape_width + 10, points:[[0,0],[50,0]]
2. VERTICAL SECTIONS: Different diagram sections MUST have 600px+ vertical gap
   - Section 1 starts at y:50
   - Section 2 starts at y:650
   - Section 3 starts at y:1250
3. WITHIN A SECTION:
   - Title at y:section_start
   - Row 1 shapes at y:section_start + 80
   - Row 2 shapes at y:section_start + 200 (120px gap between rows)
   - Row 3 shapes at y:section_start + 320
4. STANDARD SIZES:
   - Rectangles: width:160, height:70
   - Ellipses: width:120, height:60
   - Diamonds: width:140, height:90
5. NEVER place two shapes with overlapping x,y coordinates
6. Keep text SHORT - max 20 characters per shape

COLORS: #e3f2fd (blue), #e8f5e9 (green), #fff3e0 (orange), #fce4ec (pink), #f3e5f5 (purple), #e0f2f1 (teal), #fff8e1 (amber)

CRITICAL: Output ONLY the JSON array. No other text before or after.`;

// ============================================================================
// GENERATION PROMPTS BY TYPE
// ============================================================================

export const CANVAS_GENERATION_PROMPTS: Record<CanvasGenerationType, string> = {
  'information-architecture': `Generate a professional Information Architecture (IA) diagram as JSON array.

STRUCTURE:
1. Title: "Information Architecture" (text, fontSize 24, top center)
2. Level 1 - Main sections: 3-5 primary navigation items (blue rectangles, top row at y:100)
3. Level 2 - Sub-pages: 2-3 pages under each main section (green rectangles, y:220)
4. Level 3 - Features: Key features/components (purple rectangles, y:340)
5. Arrows: Connect parent to children (vertical arrows)

LAYOUT: Start at x:100, space sections 220px apart horizontally.
Use consistent rectangle sizes: Level 1 (180x70), Level 2 (150x55), Level 3 (130x50).
Max 18 elements total. Extract actual page names from the PRD context.`,

  'user-flow': `Generate a professional User Flow diagram as JSON array.

STRUCTURE:
1. Title: "User Flow" (text, fontSize:24, x:100, y:50)
2. Start: Entry point (green ellipse)
3. Actions: 3-4 user action steps (blue rectangles)
4. Decision: 1 decision point (orange diamond)
5. End points: Success (green ellipse) and Error (pink rectangle)
6. Arrows: Connect steps horizontally

EXACT COORDINATES (follow precisely - DO NOT DEVIATE):
Row 1 (y:130):
- Start ellipse: x:100, y:130, width:120, height:60, text:"Start"
- Arrow: x:230, y:160, points:[[0,0],[50,0]]
- Action 1: x:290, y:130, width:160, height:70, text:"[Action 1]"
- Arrow: x:460, y:165, points:[[0,0],[50,0]]
- Action 2: x:520, y:130, width:160, height:70, text:"[Action 2]"

Row 2 (y:280):
- Action 3: x:100, y:280, width:160, height:70, text:"[Action 3]"
- Arrow: x:270, y:315, points:[[0,0],[50,0]]
- Decision: x:330, y:270, width:140, height:90, text:"Decision?"
- Arrow (right): x:480, y:315, points:[[0,0],[50,0]]
- Success: x:540, y:280, width:120, height:60, text:"Success"

Row 3 (y:430):
- Arrow (down from decision): x:400, y:360, points:[[0,0],[0,50]]
- Error: x:330, y:420, width:140, height:60, text:"Error"

Replace [Action 1], [Action 2], [Action 3] with actual user actions from PRD context.
Max 14 elements total.`,

  'edge-cases': `Generate an Edge Cases & Error States diagram as JSON array.

STRUCTURE:
1. Title: "Edge Cases & Error Handling" (text, fontSize 24)
2. Categories (left column): Input Validation, Network/API, User Actions, Data States
3. Normal states (green rectangles): Expected behaviors
4. Edge cases (orange rectangles): Boundary conditions
5. Error states (pink rectangles): Failure scenarios
6. Recovery actions (blue rectangles): How to handle each

LAYOUT: 4 rows for categories, 3-4 columns for state types.
Group related items. Use arrows to show error→recovery relationships.
Max 16 elements. Focus on critical edge cases from PRD.`,

  'competitive-analysis': `Generate a Competitive Analysis Matrix as JSON array.

STRUCTURE:
1. Title: "Competitive Analysis" (text, fontSize 24, top)
2. Header row: "Features" label + 3-4 competitor names (rectangles)
3. Feature rows: 4-5 key feature categories (left column)
4. Comparison cells: ✓ (green), ~ (orange), ✗ (pink) for each competitor
5. Our product column highlighted (blue background)

LAYOUT: Grid format, header at y:100, rows spaced 70px apart.
Columns spaced 180px apart. Use consistent cell sizes (160x55).
Max 20 elements. Extract competitors and features from PRD context.`,

  'data-model': `Generate a Data Model (ERD) diagram as JSON array.

STRUCTURE:
1. Title: "Data Model" (text, fontSize 24)
2. Entities: 4-6 main entities (rectangles with entity name)
3. Attributes: Key fields listed in text below entity name
4. Relationships: Arrows between related entities
5. Cardinality: Labels on arrows (1:1, 1:N, N:N)

LAYOUT: Arrange entities to minimize crossing arrows.
Primary entities in center, related entities around them.
Use blue for main entities, green for reference data, purple for junction tables.
Max 14 elements. Extract entities from PRD technical requirements.`,

  'system-architecture': `Generate a System Architecture diagram as JSON array.

STRUCTURE:
1. Title: "System Architecture" (text, fontSize 24)
2. Client Layer (top, y:100): Web App, Mobile App (cyan rectangles)
3. API Layer (y:220): API Gateway, Auth Service (blue rectangles)
4. Service Layer (y:340): Core services (green rectangles)
5. Data Layer (bottom, y:460): Databases, Cache (purple rectangles)
6. External Services (right side): Third-party integrations (orange rectangles)
7. Arrows: Data flow between layers

LAYOUT: Horizontal layers, services spread across each layer.
Show request flow with downward arrows, response flow with upward.
Max 16 elements. Use actual services mentioned in PRD.`,

  'journey-map': `Generate a User Journey Map as JSON array.

STRUCTURE:
1. Title: "User Journey Map" (text, fontSize:24)
2. Stages row: 5 journey stages (blue rectangles)
3. Actions row: What user does at each stage (small text)
4. Touchpoints row: Where interaction happens (green rectangles)
5. Emotions row: 😊 😐 😟 indicators (text)
6. Pain points row: Issues at each stage (pink rectangles)

EXACT COORDINATES (follow precisely):
Title: x:350, y:50, text:"User Journey Map", fontSize:24

Stage Row (y:120) - Blue rectangles, width:140, height:50:
- Stage 1: x:100, y:120, text:"Awareness"
- Arrow: x:250, y:145, points:[[0,0],[30,0]]
- Stage 2: x:290, y:120, text:"Consideration"
- Arrow: x:440, y:145, points:[[0,0],[30,0]]
- Stage 3: x:480, y:120, text:"Decision"
- Arrow: x:630, y:145, points:[[0,0],[30,0]]
- Stage 4: x:670, y:120, text:"Use"
- Arrow: x:820, y:145, points:[[0,0],[30,0]]
- Stage 5: x:860, y:120, text:"Advocacy"

Touchpoints Row (y:220) - Green rectangles, width:140, height:45:
- x:100, y:220, text:"[Touchpoint 1]"
- x:290, y:220, text:"[Touchpoint 2]"
- x:480, y:220, text:"[Touchpoint 3]"
- x:670, y:220, text:"[Touchpoint 4]"
- x:860, y:220, text:"[Touchpoint 5]"

Pain Points Row (y:310) - Pink rectangles, width:140, height:45:
- x:100, y:310, text:"[Pain 1]"
- x:480, y:310, text:"[Pain 2]"
- x:860, y:310, text:"[Pain 3]"

Customize text based on PRD context. Max 22 elements.`,

  'wireframe': `Generate a Wireframe layout diagram as JSON array.

STRUCTURE:
1. Title: "Screen Wireframe" (text, fontSize 20)
2. Container: Main screen frame (large rectangle, 400x600, brown stroke)
3. Header: Top bar with logo and nav (rectangle, brown fill, y:inside top)
4. Navigation: Side nav or bottom tabs (brown rectangles)
5. Hero/Main content: Primary content area (large brown rectangle)
6. Cards/Sections: Content blocks (brown rectangles with text)
7. CTAs: Action buttons (small blue rectangles)
8. Footer: Bottom section (brown rectangle)

LAYOUT: All elements inside the main container.
Use #efebe9 (brown) for placeholder content, #e3f2fd (blue) for interactive elements.
Max 14 elements. Create wireframe based on PRD UI requirements.`,

  'feature-priority': `Generate a Feature Priority Matrix (Eisenhower Matrix) as JSON array.

STRUCTURE:
1. Title: "Feature Priority Matrix" (text, fontSize 24, center top)
2. Quadrant backgrounds (large rectangles):
   - Top-left (x:100, y:120): "DO FIRST" - High Impact/Low Effort (green, #e8f5e9)
   - Top-right (x:320, y:120): "SCHEDULE" - High Impact/High Effort (blue, #e3f2fd)
   - Bottom-left (x:100, y:300): "DELEGATE" - Low Impact/Low Effort (orange, #fff3e0)
   - Bottom-right (x:320, y:300): "ELIMINATE" - Low Impact/High Effort (pink, #fce4ec)
3. Axis labels: "Impact →" (left), "Effort →" (bottom)
4. Features: 4-6 feature items placed in appropriate quadrants (small rectangles)

LAYOUT: 2x2 grid, each quadrant 200x160px.
Place actual features from PRD in correct quadrants based on analysis.
Max 16 elements.`,

  'stakeholder-map': `Generate a Stakeholder Map diagram as JSON array.

STRUCTURE:
1. Title: "Stakeholder Map" (text, fontSize 24)
2. Center: Product/Project (large green ellipse, center)
3. Inner ring (high influence): Core team members (blue rectangles, close to center)
4. Middle ring (medium influence): Key stakeholders (purple rectangles)
5. Outer ring (low influence): External parties (orange rectangles)
6. Connections: Arrows showing relationships and communication flows

LAYOUT: Radial arrangement around center.
Inner ring at ~150px from center, middle at ~280px, outer at ~400px.
Label each stakeholder with role. Show key relationship arrows.
Max 14 elements. Use stakeholders from PRD context.`,

  'risk-matrix': `Generate a Risk Assessment Matrix as JSON array.

STRUCTURE:
1. Title: "Risk Assessment Matrix" (text, fontSize 24)
2. Grid background: 3x3 matrix of rectangles
   - High Likelihood/High Impact: #fce4ec (pink) - Critical
   - Medium combinations: #fff3e0 (orange) - Moderate
   - Low combinations: #e8f5e9 (green) - Low priority
3. Axis labels: "Likelihood →" (left), "Impact →" (bottom)
4. Row labels: High, Medium, Low (left side)
5. Column labels: Low, Medium, High (bottom)
6. Risks: Place identified risks as small rectangles in appropriate cells

LAYOUT: Grid starting at x:150, y:120. Cells 140x100px each.
Color-code risks by severity. Add risk names as text.
Max 18 elements. Extract risks from PRD context.`,

  'sprint-planning': `Generate a Sprint Planning Board as JSON array.

STRUCTURE:
1. Title: "Sprint Planning Board" (text, fontSize 24)
2. Column headers: Backlog, To Do, In Progress, Done (gray rectangles, y:100)
3. Column backgrounds: Vertical lanes (light gray rectangles)
4. Task cards in each column:
   - Backlog: 2-3 items (orange rectangles)
   - To Do: 2-3 items (blue rectangles)
   - In Progress: 1-2 items (amber rectangles)
   - Done: 1-2 items (green rectangles)
5. Each card shows: Task name + Story points (e.g., "3 SP")

LAYOUT: Columns 160px wide, spaced 20px apart.
Cards 140x60px, stacked vertically in each column.
Max 18 elements. Use task names from PRD if available.`,

  'api-design': `Generate an API Design diagram as JSON array.

STRUCTURE:
1. Title: "API Endpoints" (text, fontSize 24)
2. API Gateway: Main entry point (large blue rectangle, top center)
3. Authentication: Auth layer (cyan rectangle, below gateway)
4. Resource groups: Organized by entity
   - GET endpoints (green rectangles): List, Get by ID
   - POST endpoints (blue rectangles): Create
   - PUT/PATCH endpoints (orange rectangles): Update
   - DELETE endpoints (pink rectangles): Delete
5. Arrows: Request flow from gateway to endpoints

LAYOUT: Gateway at top, auth below, endpoints grouped by resource.
Each endpoint shows: METHOD /path (e.g., "GET /users")
Max 16 elements. Design endpoints based on PRD data model.`,

  'release-timeline': `Generate a Release Timeline/Roadmap as JSON array.

STRUCTURE:
1. Title: "Release Roadmap" (text, fontSize 24, top)
2. Timeline: Horizontal arrow or line (y:120)
3. Time markers: Q1, Q2, Q3, Q4 or Month names (text above timeline)
4. Milestones: Diamond shapes at key dates (on timeline)
5. Releases: Feature blocks below timeline
   - Phase 1 features (green rectangles)
   - Phase 2 features (blue rectangles)
   - Phase 3 features (purple rectangles)
6. Dependencies: Arrows between dependent features

LAYOUT: Timeline spans full width at y:120.
Features positioned below their target quarter.
Use swim lanes for different teams/themes if needed.
Max 18 elements. Use phases from PRD timeline.`,

  'persona': `Generate a User Persona Card as JSON array.

STRUCTURE:
1. Card background: Large rectangle (400x500, light gray stroke)
2. Avatar: Ellipse placeholder (top center, cyan fill)
3. Name & Title: "Sarah Johnson" + "Product Manager" (text, below avatar)
4. Demographics: Age, Location, etc. (small text)
5. Goals section: "Goals" header + 2-3 goals (green rectangle)
6. Pain Points section: "Frustrations" header + 2-3 pains (pink rectangle)
7. Behaviors section: "Key Behaviors" header + traits (blue rectangle)
8. Quote: Memorable user quote in italics (text, bottom)

LAYOUT: Card-style vertical layout.
Sections stacked vertically with clear spacing.
Use consistent padding (20px) inside card.
Max 12 elements. Create persona based on PRD target users.`,
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
  // Limit total context to ~500 tokens
  const maxContextLength = 1500;
  
  let relevantSections = '';
  
  // Extract relevant sections based on generation type
  switch (generationType) {
    case 'information-architecture':
      relevantSections = extractSections(prdContent, [
        'functional requirements',
        'features',
        'user stories',
        'ui/ux',
      ]);
      break;
    case 'user-flow':
      relevantSections = extractSections(prdContent, [
        'user stories',
        'user journey',
        'use cases',
        'functional requirements',
      ]);
      break;
    case 'edge-cases':
      relevantSections = extractSections(prdContent, [
        'edge cases',
        'error',
        'risks',
        'non-functional',
      ]);
      break;
    case 'competitive-analysis':
      relevantSections = extractSections(prdContent, [
        'competitive',
        'market',
        'problem statement',
        'goals',
      ]);
      break;
    case 'data-model':
      relevantSections = extractSections(prdContent, [
        'technical',
        'data',
        'requirements',
        'architecture',
      ]);
      break;
    case 'system-architecture':
      relevantSections = extractSections(prdContent, [
        'technical',
        'architecture',
        'integration',
        'non-functional',
      ]);
      break;
    case 'journey-map':
      relevantSections = extractSections(prdContent, [
        'user journey',
        'user stories',
        'personas',
        'experience',
      ]);
      break;
    case 'wireframe':
      relevantSections = extractSections(prdContent, [
        'ui/ux',
        'features',
        'user stories',
        'screens',
      ]);
      break;
    case 'feature-priority':
      relevantSections = extractSections(prdContent, [
        'features',
        'requirements',
        'goals',
        'priorities',
      ]);
      break;
    case 'stakeholder-map':
      relevantSections = extractSections(prdContent, [
        'stakeholders',
        'users',
        'personas',
        'team',
      ]);
      break;
    case 'risk-matrix':
      relevantSections = extractSections(prdContent, [
        'risks',
        'constraints',
        'assumptions',
        'dependencies',
      ]);
      break;
    case 'sprint-planning':
      relevantSections = extractSections(prdContent, [
        'tasks',
        'features',
        'milestones',
        'timeline',
      ]);
      break;
    case 'api-design':
      relevantSections = extractSections(prdContent, [
        'api',
        'technical',
        'integration',
        'endpoints',
      ]);
      break;
    case 'release-timeline':
      relevantSections = extractSections(prdContent, [
        'timeline',
        'milestones',
        'phases',
        'roadmap',
      ]);
      break;
    case 'persona':
      relevantSections = extractSections(prdContent, [
        'personas',
        'users',
        'target audience',
        'stakeholders',
      ]);
      break;
  }
  
  // Combine and truncate
  let context = `Product: ${productDescription.slice(0, 200)}\n\n`;
  
  if (relevantSections) {
    context += `Context:\n${relevantSections}`;
  }
  
  // Truncate to max length
  if (context.length > maxContextLength) {
    context = context.slice(0, maxContextLength) + '...';
  }
  
  return context;
}

/**
 * Extract sections from PRD content that match keywords
 */
function extractSections(content: string, keywords: string[]): string {
  const lines = content.split('\n');
  const relevantLines: string[] = [];
  let inRelevantSection = false;
  let sectionDepth = 0;
  
  for (const line of lines) {
    const lowerLine = line.toLowerCase();
    
    // Check for section headers
    if (line.startsWith('#')) {
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
  
  // Limit to ~300 tokens worth of content
  return relevantLines.slice(0, 20).join('\n');
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
  // This regex finds string values and escapes unescaped newlines/tabs within them
  let result = '';
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < jsonString.length; i++) {
    const char = jsonString[i];
    
    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }
    
    if (char === '\\') {
      result += char;
      if (inString) {
        escapeNext = true;
      }
      continue;
    }
    
    if (char === '"') {
      result += char;
      inString = !inString;
      continue;
    }
    
    if (inString) {
      // Replace unescaped special characters inside strings
      if (char === '\n') {
        result += '\\n';
      } else if (char === '\r') {
        result += '\\r';
      } else if (char === '\t') {
        result += '\\t';
      } else {
        result += char;
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
    // Remove trailing commas (common AI mistake)
    jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');
    
    // Step 4: Parse the JSON with multiple recovery strategies
    let elements: any[];
    const parseStrategies = [
      // Strategy 1: Direct parse
      () => JSON.parse(jsonString),
      
      // Strategy 2: Fix newlines inside strings
      () => JSON.parse(fixJsonStringValues(jsonString)),
      
      // Strategy 3: Remove all newlines and extra spaces (compact JSON)
      () => {
        let compacted = jsonString;
        // First, replace newlines inside strings with escaped versions
        compacted = fixJsonStringValues(compacted);
        // Then collapse all whitespace outside strings
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
          } else if (result.length > 0 && !/[\[{,:]/.test(result[result.length - 1])) {
            // Keep single space after values for readability, but it's not strictly needed
          }
        }
        return JSON.parse(result);
      },
      
      // Strategy 4: Fix unquoted keys and single quotes
      () => {
        let fixed = fixJsonStringValues(jsonString);
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
      
      // Strategy 5: Try to repair truncated JSON
      () => {
        const repaired = repairTruncatedJson(fixJsonStringValues(jsonString));
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
    
    // Step 6: Filter, validate, sanitize, and convert to Excalidraw format
    const validElements = elements!.filter((el, idx) => {
      const valid = isValidElement(el);
      if (!valid) {
        debugWarn(`Skipping invalid element at index ${idx}:`, el);
      }
      return valid;
    });
    
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
    return excalidrawElements;
    
  } catch (error) {
    debugError('Unexpected error parsing canvas response:', error);
    return [];
  }
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
      const arrow = {
        ...baseElement,
        type: 'arrow',
        x: el.x || 100,
        y: el.y || 100,
        width: el.points ? Math.abs(el.points[el.points.length - 1][0] - el.points[0][0]) : 100,
        height: el.points ? Math.abs(el.points[el.points.length - 1][1] - el.points[0][1]) : 0,
        angle: 0,
        strokeColor: el.strokeColor || '#1e1e1e',
        backgroundColor: 'transparent',
        points: el.points || [[0, 0], [100, 0]],
        startBinding: null,
        endBinding: null,
        startArrowhead: null,
        endArrowhead: 'arrow',
        roundness: { type: 2 },
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
