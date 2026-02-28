/**
 * Canvas Generation Prompts — Two-Phase Architecture
 *
 * Phase 1 (this file): AI extracts structured graph data (nodes + edges) from PRD.
 * Phase 2 (diagram-layout-engine.ts): Deterministic layout engine creates Excalidraw elements.
 *
 * The AI NEVER outputs pixel coordinates, arrow bindings, or Excalidraw JSON.
 * It only outputs a simple { title, nodes, edges } object.
 */

import type { CanvasGenerationType } from '@/components/canvas/prd-canvas';
import type { GraphData } from '../services/diagram-layout-engine';

// ============================================================================
// SYSTEM PROMPT
// ============================================================================

export const CANVAS_SYSTEM_PROMPT = `You are a diagram content extractor. Given a PRD/note, you extract structured data for diagram generation.

## Output Format (STRICT)
Return a single JSON object:
{
  "title": "Diagram Title",
  "nodes": [
    { "id": "unique-id", "label": "Display Label", "group": "group-name", "parent": "parent-id-or-null" }
  ],
  "edges": [
    { "from": "source-node-id", "to": "target-node-id" }
  ]
}

## Rules
- Output ONLY the JSON object — no markdown, no code fences, no explanations
- Every node must have a unique, descriptive id (e.g. "nav-dashboard", not "node1")
- Every node label must come from the ACTUAL PRD content — no generic placeholders
- Every edge must reference valid node IDs
- The "group" field determines visual styling (shape, color, position) — use the exact group names specified in the prompt
- The "parent" field is optional — use it for hierarchical diagrams to specify parent-child relationships
- Generate comprehensive content: extract ALL relevant items from the PRD`;

// ============================================================================
// GENERATION PROMPTS BY TYPE (each specifies what groups/nodes/edges to extract)
// ============================================================================

export const CANVAS_GENERATION_PROMPTS: Record<CanvasGenerationType, string> = {

  'information-architecture': `Extract a complete Information Architecture (sitemap) from the PRD.

REQUIRED NODE GROUPS:
- "L1": Top-level navigation items / main sections (6-8 nodes)
- "L2": Sub-pages under each L1 section (3-5 per L1, 15-25 total)
- "L3": Features/components under each L2 page (2-3 per L2, 10-20 total)

REQUIRED EDGES: Connect every L1→L2 and L2→L3 parent-child relationship.

Set "parent" on L2 nodes to their L1 parent id, and on L3 nodes to their L2 parent id.

Extract ALL pages, features, modules, and sections mentioned in the PRD. Use ACTUAL names from the content.`,

  'user-flow': `Extract a complete User Flow from the PRD showing the user journey.

REQUIRED NODE GROUPS:
- "start": Entry point (1 node, e.g. "Open App")
- "action": User action steps (8-12 nodes showing key user actions from the PRD)
- "decision": Decision/branching points (3-5 nodes, e.g. "Authenticated?", "Has Workspace?")
- "success": Success end states (2-3 nodes)
- "error": Error/failure states (2-3 nodes)

REQUIRED EDGES: Connect the flow: start → actions → decisions → success/error. Decision nodes should have edges to both the yes-path and no-path targets.

Extract ALL user actions, decision points, and outcomes from the PRD. Use ACTUAL step names.`,

  'system-architecture': `Extract the complete System Architecture from the PRD.

REQUIRED NODE GROUPS:
- "client": Client applications (Web App, Mobile, Admin, etc.) — 2-4 nodes
- "api": API layer components (Gateway, Auth, Load Balancer) — 2-4 nodes
- "service": Backend services/microservices — 4-8 nodes
- "data": Data stores (PostgreSQL, Redis, S3, etc.) — 3-5 nodes
- "external": External/third-party integrations — 2-5 nodes

REQUIRED EDGES: client→api, api→service, service→data, service→external connections.

Extract ALL technical components, services, and integrations mentioned in the PRD.`,

  'data-model': `Extract the Data Model (ERD) from the PRD.

REQUIRED NODE GROUPS:
- "entity": Main data entities (5-8 nodes, e.g. User, Workspace, Note, Pipeline)
- "junction": Junction/relationship tables if any (0-3 nodes)

REQUIRED EDGES: Connect related entities. Every foreign-key or relationship mentioned in the PRD should be an edge.

Use ACTUAL entity names and include key attributes in the label (e.g. "User\\nid, name, email").`,

  'feature-priority': `Extract features and categorize them into a Priority Matrix from the PRD.

REQUIRED NODE GROUPS:
- "do-first": High Impact / Low Effort features (3-5 nodes)
- "schedule": High Impact / High Effort features (3-5 nodes)
- "delegate": Low Impact / Low Effort features (2-4 nodes)
- "eliminate": Low Impact / High Effort features (1-3 nodes)

NO EDGES needed for this diagram type (set edges to empty array).

Analyze each feature from the PRD and assign it to the correct quadrant based on its described priority, complexity, and impact.`,

  'stakeholder-map': `Extract stakeholders from the PRD and arrange by influence.

REQUIRED NODE GROUPS:
- "center": The product itself (1 node)
- "inner": High-influence stakeholders (3-5 nodes)
- "middle": Medium-influence stakeholders (3-5 nodes)
- "outer": Low-influence/external stakeholders (2-4 nodes)

REQUIRED EDGES: Connect center to all stakeholders.

Use ACTUAL roles and stakeholder names from the PRD.`,

  'risk-matrix': `Extract risks from the PRD and categorize by severity.

REQUIRED NODE GROUPS:
- "critical": High likelihood + High impact risks (2-3 nodes)
- "high": High likelihood/impact risks (3-4 nodes)
- "medium": Medium risks (3-4 nodes)
- "low": Low risks (2-3 nodes)

NO EDGES needed (set edges to empty array).

Extract ALL risks, challenges, and potential issues mentioned or implied in the PRD.`,

  'sprint-planning': `Extract tasks/features from the PRD and organize into sprint columns.

REQUIRED NODE GROUPS:
- "backlog": Future/backlog items (3-4 nodes)
- "todo": Items ready for current sprint (3-4 nodes)  
- "in-progress": Items currently being built (2-3 nodes)
- "done": Completed items (2-3 nodes)

NO EDGES needed (set edges to empty array).

Use ACTUAL task/feature names from the PRD. Assign to columns based on described phase/priority.`,

  'journey-map': `Extract a User Journey Map from the PRD.

REQUIRED NODE GROUPS (each group is a swimlane row):
- "stage": Journey stages (5-6 nodes, e.g. "Discover", "Sign Up", "Onboard", "Use", "Share")
- "action": What user does at each stage (5-6 nodes matching stages)
- "touchpoint": Where interaction happens (5-6 nodes matching stages)
- "emotion": Emotional state at each stage (5-6 text nodes like "😊 Excited", "😐 Neutral")
- "pain": Pain points at each stage (5-6 nodes)

REQUIRED EDGES: Connect consecutive stages (stage1→stage2→stage3...).

Extract ALL journey details from the PRD. Each group should have the same number of nodes aligned to stages.`,

  'competitive-analysis': `Extract competitive analysis data from the PRD.

REQUIRED NODE GROUPS:
- "header": Column headers — first is "Features", rest are competitor names (3-5 nodes)
- "feature": Feature names for comparison — first column (4-6 nodes)
- "cell-yes": Cells where competitor HAS the feature (use ✓ as label)
- "cell-no": Cells where competitor LACKS the feature (use ✗ as label)
- "cell-partial": Cells where competitor partially has feature (use ~ as label)

NO EDGES needed (set edges to empty array).

Use ACTUAL competitor names and feature names from the PRD. If competitors aren't named, infer likely ones from the product domain.`,

  'release-timeline': `Extract release phases and milestones from the PRD.

REQUIRED NODE GROUPS:
- "milestone": Key milestone markers on timeline (3-5 nodes)
- "phase1": MVP/Phase 1 features (3-5 nodes)
- "phase2": Phase 2 features (3-5 nodes)  
- "phase3": Phase 3/future features (2-4 nodes)

REQUIRED EDGES: Connect milestones sequentially (m1→m2→m3). Connect features to their milestone.

Use ACTUAL phase names, milestone names, and feature names from the PRD.`,

  'api-design': `Extract API endpoints from the PRD.

REQUIRED NODE GROUPS:
- "gateway": API Gateway/entry point (1 node)
- "auth": Authentication layer (1 node)
- "get": GET endpoints (3-5 nodes, label: "GET /resource")
- "post": POST endpoints (2-4 nodes, label: "POST /resource")
- "put": PUT/PATCH endpoints (2-3 nodes, label: "PUT /resource")
- "delete": DELETE endpoints (1-2 nodes, label: "DELETE /resource")

REQUIRED EDGES: gateway→auth, auth→each endpoint group.

Use ACTUAL resource names from the PRD (e.g. /users, /workspaces, /notes).`,

  'wireframe': `You are a senior UI/UX designer. Your task is to produce a detailed, accurate low-fidelity wireframe from the PRD below, following the same spatial and content principles used by v0 (Vercel) and Lovable.

════════════════════════════════════════
SCREEN SELECTION
════════════════════════════════════════
Pick the single MOST IMPORTANT screen from the PRD (e.g. the main dashboard, the core workflow screen, or the primary feature screen). Wireframe it completely with ALL its visible UI components.

════════════════════════════════════════
NODE GROUPS — use EXACTLY these group names
════════════════════════════════════════
Include every group that applies to the chosen screen:

• "screen"     — The outer app chrome / browser frame. 1 node. Label = screen name (e.g. "Dashboard", "Kanban Board", "Settings — Billing").
• "topbar"     — Full-width top navigation bar. 1 node. Label = app logo + primary nav items + right-side icons, all on ONE line separated by spaces (e.g. "Acme  Dashboard  Projects  Team  Settings        🔔  👤 Admin").
• "sidebar"    — Left vertical navigation. 0–1 nodes. Label = each nav item on its own line with icon (e.g. "📊 Overview\\n📁 Projects\\n🗂 Pipelines\\n👥 Team\\n⚙️ Settings\\n─────\\n🆘 Help").
• "breadcrumb" — Page title / breadcrumb / section header. 0–1 nodes. Label = "Section > Sub-page" or just the H1 page title (e.g. "Projects > Alpha Launch > Settings").
• "toolbar"    — Secondary action bar: search field + filter/sort controls + primary CTA. 0–1 nodes. Label = "🔍 Search [___________]    [+ New Project]    [Filter ▼]    [Sort: Name ▼]".
• "card"       — KPI / metric / summary card. 2–5 nodes. EACH card label MUST use real metric names from the PRD + a plausible value, formatted with a divider (e.g. "Monthly Revenue\\n──────────\\n$48,200\\n▲ 12% vs last month"). Never use "Card 1".
• "table"      — Data table or list panel. 0–2 nodes. Label = real column headers pipe-separated (e.g. "Project Name  |  Status  |  Owner  |  Due Date  |  ⋮").
• "form"       — Input form / settings panel. 0–2 nodes. Label = each real field on its own line (e.g. "Full Name\\nWork Email\\nRole\\nDepartment\\nNotify by Email  [ ]"). Extract field names from the PRD.
• "modal"      — Dialog overlay. 0–1 nodes. Label = modal title + horizontal rule + key fields/actions (e.g. "Invite Team Member\\n──────────────\\nEmail Address: [__________]\\nRole: [Admin ▼]").
• "button"     — Action button. 1–5 nodes. Label = EXACT CTA text from the PRD (e.g. "+ Invite Member", "Save Changes", "Export CSV", "Delete Project"). Never use "Button".
• "badge"      — Status chip / tag. 0–4 nodes. Label = status with icon (e.g. "● Active", "⏸ Paused", "✓ Complete", "🔴 Overdue", "🟡 In Review").
• "empty"      — Empty / zero-state panel. 0–1 nodes. Label = headline + sub-action (e.g. "No projects yet\\nCreate your first project →").
• "footer"     — Bottom status bar or footer links. 0–1 nodes. Label = copyright + links (e.g. "© 2025 Acme Inc  ·  Privacy Policy  ·  Terms  ·  Help Center").

════════════════════════════════════════
SPATIAL HIERARCHY — edges encode containment
════════════════════════════════════════
Add edges for these containment relationships (add only those that exist in your output):
  screen → topbar          (topbar lives inside screen)
  screen → sidebar         (sidebar lives inside screen)
  screen → breadcrumb      (breadcrumb lives inside screen)
  screen → toolbar         (toolbar lives inside screen)
  screen → footer          (footer lives inside screen)
  toolbar → button         (action buttons live inside toolbar)
  card → badge             (status badges live inside their card)
  form → button            (submit/cancel buttons belong to form)
  modal → button           (dialog action buttons)

════════════════════════════════════════
CONTENT RULES (from v0 / Lovable best practices)
════════════════════════════════════════
1. REAL NAMES ONLY — every label must come from the PRD. Never write "Card 1", "Button A", "Label", "Content Area", "Item 1".
2. KPI cards → extract real metric names mentioned in the PRD (e.g. "Active Users", "Monthly Revenue", "Conversion Rate", "Open Tickets").
3. Tables → extract real column headers from the PRD data model or feature description.
4. Forms → extract real field names from the PRD (sign-up fields, settings fields, etc.).
5. Buttons → use exact CTA labels ("Save Changes", "Send Invite", "Run Report", "Connect Integration").
6. Sidebar → use actual feature/module names from the PRD navigation or IA section.
7. Use \\n inside a label for multi-line content (each \\n becomes a new line in the wireframe box).
8. Use ── or ═══ as divider lines inside card/modal labels for visual separation.
9. Generate between 12 and 22 nodes total for a comprehensive, realistic wireframe.

════════════════════════════════════════
OUTPUT — strict JSON only, no prose, no markdown fences
════════════════════════════════════════
{
  "title": "[Screen Name] Wireframe",
  "nodes": [
    { "id": "screen-main", "label": "Dashboard", "group": "screen" },
    { "id": "topbar-main", "label": "Acme  Dashboard  Projects  Team  Settings        🔔  👤 Admin", "group": "topbar" },
    ...
  ],
  "edges": [
    { "from": "screen-main", "to": "topbar-main" },
    ...
  ]
}`,

  'edge-cases': `Extract edge cases and error handling scenarios from the PRD.

REQUIRED NODE GROUPS:
- "category": Error categories (3-5 nodes, e.g. "Auth Errors", "Data Validation")
- "normal": Happy-path scenarios (3-5 nodes)
- "edge": Edge/boundary cases (3-5 nodes)
- "error": Error states (3-5 nodes)
- "recovery": Recovery actions (3-5 nodes)

REQUIRED EDGES: Connect error→recovery relationships.

Extract ALL error scenarios, edge cases, and recovery strategies from the PRD.`,

  'persona': `Extract a user persona from the PRD.

REQUIRED NODE GROUPS:
- "avatar": Avatar placeholder (1 node, label: persona name or "Target User")
- "name": Name/role (1 node, e.g. "Sarah, Product Manager")
- "demographics": Demographics info (1 node, e.g. "Age 28-35, Tech-savvy")
- "goals": User goals (1-2 nodes listing actual goals from PRD)
- "pains": Pain points (1-2 nodes listing actual pain points from PRD)
- "behaviors": Key behaviors (1-2 nodes listing behaviors from PRD)

NO EDGES needed (set edges to empty array).

ALL details must be grounded in the actual PRD content — no generic fillers.`,
};

// ============================================================================
// CHUNKED GENERATION — NO LONGER NEEDED
// The new graph-based output is small enough (~2KB) for a single AI request.
// These are kept as empty stubs for backward compatibility.
// ============================================================================

export const CHUNKED_DIAGRAM_TYPES = new Set<CanvasGenerationType>([
  // Empty — no diagram types need chunking anymore
]);

export interface CanvasChunkConfig {
  chunkIndex: number;
  totalChunks: number;
  label: string;
  prompt: string;
  yOffset: number;
}

export const CANVAS_CHUNK_CONFIGS: Partial<Record<CanvasGenerationType, CanvasChunkConfig[]>> = {};

// ============================================================================
// CONTEXT EXTRACTION (kept from original)
// ============================================================================

/**
 * Extract relevant context from PRD content for canvas generation.
 */
export function extractPRDContextForCanvas(
  prdContent: string,
  productDescription: string,
  type: CanvasGenerationType
): string {
  const maxContextLength = 4000;
  let context = '';

  // Product description
  if (productDescription) {
    context += `Product: ${productDescription.slice(0, 500)}\n\n`;
  }

  // PRD content
  if (prdContent) {
    const keywords = getKeywordsForType(type);
    const relevantSections = extractSections(prdContent, keywords);
    if (relevantSections) {
      context += `PRD Content:\n${relevantSections}\n\n`;
    }

    // If no sections matched, include full PRD up to limit
    if (!relevantSections && prdContent.trim()) {
      const maxPrdLength = maxContextLength - context.length - 200;
      if (maxPrdLength > 200) {
        context += `PRD Content:\n${prdContent.slice(0, maxPrdLength)}\n`;
      }
    }
  }

  if (context.length > maxContextLength) {
    context = context.slice(0, maxContextLength) + '\n...[content truncated]';
  }

  return context;
}

function getKeywordsForType(type: CanvasGenerationType): string[] {
  const keywordMap: Record<string, string[]> = {
    'information-architecture': ['feature', 'module', 'page', 'section', 'navigation', 'menu', 'dashboard', 'screen'],
    'user-flow': ['user', 'flow', 'step', 'onboarding', 'journey', 'sign up', 'login', 'action', 'workflow'],
    'system-architecture': ['architecture', 'service', 'api', 'database', 'backend', 'frontend', 'integration', 'infrastructure'],
    'data-model': ['data', 'model', 'entity', 'table', 'field', 'schema', 'database', 'relationship'],
    'feature-priority': ['feature', 'priority', 'mvp', 'phase', 'roadmap', 'backlog', 'requirement'],
    'stakeholder-map': ['stakeholder', 'user', 'role', 'team', 'customer', 'admin', 'manager'],
    'risk-matrix': ['risk', 'challenge', 'issue', 'blocker', 'concern', 'threat', 'mitigation'],
    'sprint-planning': ['sprint', 'task', 'story', 'backlog', 'iteration', 'milestone', 'deliverable'],
    'journey-map': ['journey', 'stage', 'touchpoint', 'experience', 'emotion', 'pain point'],
    'competitive-analysis': ['competitor', 'comparison', 'market', 'alternative', 'advantage'],
    'release-timeline': ['release', 'timeline', 'phase', 'milestone', 'roadmap', 'launch', 'deadline'],
    'api-design': ['api', 'endpoint', 'route', 'rest', 'request', 'response', 'method'],
    'wireframe': ['ui', 'screen', 'layout', 'dashboard', 'interface', 'button', 'form', 'navigation', 'sidebar', 'modal', 'table', 'card', 'filter', 'settings', 'page'],
    'edge-cases': ['edge case', 'error', 'validation', 'boundary', 'exception', 'failure'],
    'persona': ['persona', 'user', 'target audience', 'demographic', 'goal', 'pain point', 'behavior'],
  };
  return keywordMap[type] || ['feature', 'module', 'page'];
}

function extractSections(content: string, keywords: string[]): string {
  const lines = content.split('\n');
  const relevantLines: string[] = [];
  let inRelevantSection = false;
  let sectionDepth = 0;
  let hasAnyHeaders = false;

  for (const line of lines) {
    const lowerLine = line.toLowerCase();

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

  if (!hasAnyHeaders || relevantLines.length === 0) {
    const nonEmptyLines = lines.filter(l => l.trim());
    return nonEmptyLines.slice(0, 150).join('\n');
  }

  return relevantLines.slice(0, 150).join('\n');
}

// ============================================================================
// GRAPH RESPONSE PARSER
// ============================================================================

/**
 * Parse AI response into a GraphData object.
 * The AI should return a JSON object with { title, nodes, edges }.
 */
export function parseGraphResponse(response: string): GraphData | null {
  if (!response || typeof response !== 'string') {
    console.warn('[GraphParser] Empty or invalid response');
    return null;
  }

  let jsonString = response.trim();

  // Remove markdown code fences if present
  if (jsonString.includes('```')) {
    const openFence = jsonString.match(/```(?:json|JSON)?\s*\n?/);
    if (openFence && openFence.index !== undefined) {
      const startIdx = openFence.index + openFence[0].length;
      const closeFence = jsonString.indexOf('```', startIdx);
      if (closeFence > startIdx) {
        jsonString = jsonString.substring(startIdx, closeFence).trim();
      } else {
        jsonString = jsonString.substring(startIdx).trim();
      }
    }
  }

  // Find the JSON object
  const objStart = jsonString.indexOf('{');
  if (objStart === -1) {
    console.error('[GraphParser] No JSON object found in response');
    return null;
  }

  // Find matching closing brace
  let depth = 0;
  let inStr = false;
  let escape = false;
  let objEnd = -1;

  for (let i = objStart; i < jsonString.length; i++) {
    const ch = jsonString[i];
    if (escape) { escape = false; continue; }
    if (ch === '\\' && inStr) { escape = true; continue; }
    if (ch === '"') { inStr = !inStr; continue; }
    if (inStr) continue;
    if (ch === '{') depth++;
    else if (ch === '}') {
      depth--;
      if (depth === 0) { objEnd = i; break; }
    }
  }

  if (objEnd === -1) {
    console.error('[GraphParser] No matching closing brace');
    return null;
  }

  jsonString = jsonString.substring(objStart, objEnd + 1);

  // Remove trailing commas
  jsonString = jsonString.replace(/,(\s*[}\]])/g, '$1');

  try {
    const parsed = JSON.parse(jsonString);

    // Validate structure
    if (!parsed.title || !Array.isArray(parsed.nodes)) {
      console.error('[GraphParser] Invalid graph structure: missing title or nodes');
      return null;
    }

    // Ensure edges array exists
    if (!Array.isArray(parsed.edges)) {
      parsed.edges = [];
    }

    // Validate nodes
    const validNodes = parsed.nodes.filter((n: any) => {
      if (!n.id || !n.label || !n.group) {
        console.warn('[GraphParser] Skipping invalid node:', n);
        return false;
      }
      return true;
    });

    // Validate edges — only keep edges referencing valid node IDs
    const nodeIds = new Set(validNodes.map((n: any) => n.id));
    const validEdges = (parsed.edges || []).filter((e: any) => {
      if (!e.from || !e.to) return false;
      if (!nodeIds.has(e.from) || !nodeIds.has(e.to)) {
        console.warn(`[GraphParser] Skipping edge with invalid IDs: ${e.from} → ${e.to}`);
        return false;
      }
      return true;
    });

    console.log(`[GraphParser] Parsed graph: ${validNodes.length} nodes, ${validEdges.length} edges`);

    return {
      title: String(parsed.title),
      nodes: validNodes,
      edges: validEdges,
    };
  } catch (err) {
    console.error('[GraphParser] JSON parse failed:', err);
    console.error('[GraphParser] JSON excerpt:', jsonString.substring(0, 500));
    return null;
  }
}

// ============================================================================
// LEGACY EXPORTS (kept for backward compatibility with existing code)
// ============================================================================

/**
 * Build a prompt for a specific chunk.
 * In the new architecture this is rarely needed since we don't chunk,
 * but kept for backward compatibility.
 */
export function buildChunkPrompt(
  _type: CanvasGenerationType,
  chunk: CanvasChunkConfig,
  context: string,
  _priorChunkIdContext: string
): string {
  return `${context}\n\n${chunk.prompt}`;
}

/**
 * Legacy parseCanvasResponse — now redirects through the graph parser + layout engine.
 * This is kept so any old code paths still work.
 */
export function parseCanvasResponse(response: string): any[] {
  // Try to parse as graph data first
  const graphData = parseGraphResponse(response);
  if (graphData) {
    // Layout engine import is handled by the canvas-generator.ts caller
    // This legacy function just returns empty — callers should use the generator service
    console.warn('[parseCanvasResponse] Legacy function called. Use canvasGenerator.generateDiagram() instead.');
    return [];
  }
  return [];
}

export function parseCanvasResponseWithoutBindings(response: string): any[] {
  return parseCanvasResponse(response);
}

export function resolveArrowBindings(elements: any[]): any[] {
  return elements; // No-op — layout engine handles bindings
}

// ============================================================================
// DEFAULT EXPORT
// ============================================================================

export default {
  CANVAS_SYSTEM_PROMPT,
  CANVAS_GENERATION_PROMPTS,
  CHUNKED_DIAGRAM_TYPES,
  CANVAS_CHUNK_CONFIGS,
  buildChunkPrompt,
  extractPRDContextForCanvas,
  parseCanvasResponse,
  parseCanvasResponseWithoutBindings,
  resolveArrowBindings,
  parseGraphResponse,
};
