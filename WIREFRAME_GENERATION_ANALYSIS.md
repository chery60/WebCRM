# Wireframe/Canvas Generation System Analysis

## Overview
The system uses a **two-phase architecture** to generate AI-powered diagrams and wireframes from PRD content:
1. **Phase 1 (AI)**: Extract structured graph data (nodes + edges) with minimal AI reasoning
2. **Phase 2 (Deterministic)**: Layout engine converts graph to valid Excalidraw elements with pixel positions

This separation ensures **predictable, reproducible diagrams** without relying on AI for layout/positioning.

---

## Current Architecture

### Phase 1: AI Content Extraction (`canvas-prompts.ts`)

**System Prompt:**
- AI outputs ONLY a JSON object: `{ title, nodes[], edges[] }`
- No markdown, no code fences, no explanations
- Node structure: `{ id, label, group, parent? }`
- Edge structure: `{ from, to, label? }`
- **Critical constraint**: Every node label must come from ACTUAL PRD content (no generic placeholders)

**Prompts by Diagram Type:**
Each diagram type has specific group names and generation rules. Examples:

| Diagram Type | Key Groups | Strategy |
|---|---|---|
| **Wireframe** | screen, topbar, sidebar, card, button, form, table, modal, etc. | Spatial UI layout |
| **Information Architecture** | L1, L2, L3 | Hierarchical (top-level nav → sub-pages → features) |
| **User Flow** | start, action, decision, success, error | Flow diagram |
| **System Architecture** | client, api, service, data, external | Hierarchical layers |
| **Data Model** | entity, junction | Grid layout |
| **Feature Priority** | do-first, schedule, delegate, eliminate | Quadrant matrix |
| **Journey Map** | stage, action, touchpoint, emotion, pain | Swimlane rows |
| **Competitive Analysis** | header, feature, cell-yes, cell-no, cell-partial | Table grid |

**Wireframe Prompt Specifics** (lines 195-238):
- Models screen as **spatial hierarchy** of real UI components
- Requires 12-20 nodes covering full screen layout
- Must extract ACTUAL content from PRD:
  - Real KPI names (Revenue, Users, etc.) for dashboards
  - Real column headers for tables
  - Real field names for forms
  - Real button labels (not "Button A")
  - Real role names in sidebars
- Uses `\n` for multi-line content inside components
- Container relationships via edges: screen→topbar/sidebar, card→badge, form→button, modal→button

---

### Phase 2: Deterministic Layout Engine (`diagram-layout-engine.ts`)

**Core Function**: `layoutDiagram(graph, diagramType, offsetX, offsetY) → ExcalidrawElement[]`

**Layout Strategies by Type:**

1. **Hierarchical** (Information Architecture, System Architecture, API Design)
   - Groups arranged as horizontal rows
   - Each group positioned at increasing Y offsets
   - Nodes within group centered and spaced horizontally

2. **Flow** (User Flow)
   - Max 5 nodes per row, then wraps
   - Left-to-right, top-to-bottom progression
   - Supports branching via edges

3. **Grid** (Data Model, Risk Matrix)
   - Nodes distributed in square grid
   - Columns computed as `sqrt(node_count)`
   - Even spacing

4. **Radial** (Stakeholder Map)
   - Center node at `(550, 350)`
   - Concentric rings: inner (180px), middle (320px), outer (460px)
   - Nodes distributed around circle by angle

5. **Columns** (Sprint Planning, Edge Cases)
   - Each group becomes a vertical column
   - Nodes stack vertically within column
   - Columns spaced horizontally

6. **Quadrant** (Feature Priority Matrix)
   - 4 quadrants: do-first (0,0), schedule (480,0), delegate (0,380), eliminate (480,380)
   - Nodes distributed within each quadrant

7. **Swimlane** (Journey Map)
   - Each group is a horizontal swimlane row
   - Nodes positioned left-to-right within lane
   - Used for cross-functional flow visualization

8. **Timeline** (Release Timeline)
   - Milestones on horizontal timeline
   - Phase items stacked below in grid

9. **Table** (Competitive Analysis)
   - Headers in first row
   - Features in first column
   - Cells in grid pattern

10. **Wireframe** (Screen Layouts) - **MOST COMPLEX**
    - Screen container at fixed position: `(60, 60)` with size 900×680
    - Topbar: full-width at top, 52px height
    - Sidebar: left column (180px wide) below topbar
    - Content zone: right of sidebar, below topbar, above footer
    - Running Y tracker to stack components vertically:
      - Breadcrumb row (36px)
      - Toolbar row (44px)
      - Metric cards row (wrapping)
      - Table/form section
      - Empty state
      - Modal (centered over screen)
    - Buttons positioned relative to their parent (toolbar buttons right-aligned, form buttons below form)
    - Badges positioned over parent cards
    - Fallback positioning for unpositioned nodes

11. **Card** (User Persona)
    - Vertical stack of sections
    - Each section horizontally distributed

**Color Scheme by Type:**
- Wireframe: light grays/blues for structural components
- Information Architecture: blue (L1) → green (L2) → purple (L3)
- User Flow: green (start/success) → blue (action) → orange (decision) → pink (error)
- System Architecture: mixed colors per layer

**Element Generation:**
1. Title text element (24px, centered top)
2. Shape elements (rectangles/ellipses/diamonds) with color from group config
3. Bound text elements (auto-generated child elements for labels)
4. Arrow elements with proper Excalidraw bindings

---

### Phase 3: Completeness Validation (`diagram-validator.ts`)

**Validation Rules per Diagram Type:**

Example for Wireframe:
```
minTotalNodes: 12
requiresEdges: true (minimum 2 edges for containment relationships)
groups:
  screen: required×1, exactly 1 node
  topbar: required×1, exactly 1 node
  sidebar: optional, 0-1 nodes
  card: required, 2-6 nodes
  button: required, 1-5 nodes
  badge: optional, 0-5 nodes
  table: optional, 0-2 nodes
  form: optional, 0-2 nodes
  modal: optional, 0-1 nodes
```

**Validation Output:**
- `complete: boolean` - meets all requirements
- `score: number` - higher = more complete
- `issues: string[]` - what's missing (e.g., "Missing required button group")
- `fixHint: string` - guidance for retry prompt

**Retry Logic:**
- Initial attempt checks for completeness
- If incomplete, retry up to 3 times total
- Each retry uses the previous validation's `fixHint` prepended to the prompt
- Returns best result (highest score) even if never fully complete

---

## Canvas Generation Flow

```
CanvasGeneratorService.generateDiagram()
  ↓
1. Extract PRD context (4000 char limit, keyword-filtered)
2. Get generation prompt for diagram type
  ↓
RETRY LOOP (up to 3 attempts):
  ↓
  3a. Build user prompt: [uniqueSeed] + [fixHint if retry] + [context] + [typePrompt]
  3b. Call AI generateContent() → JSON response
  3c. parseGraphResponse() → GraphData
       - Validates JSON structure
       - Filters nodes (requires id, label, group)
       - Filters edges (requires valid from/to node IDs)
  3d. scoreGraphData() → numeric score
  3e. validateCanvasDiagram() → { complete, issues, fixHint }
  3f. If complete → return immediately with layout
      Else if attempts remain → retry with fixHint
  ↓
4. Return best attempt with layoutDiagram()
5. normalizeElementsForExcalidraw() fixes:
   - Linear element normalization (arrows/lines need lastCommittedPoint, startBinding, endBinding, elbowed)
   - Missing required shape fields (strokeColor, fillStyle, roughness, opacity, etc.)
   - Invalid points arrays
   - Duplicate IDs (de-duplicated with suffix)
   - Bound text elements (auto-generates text child for shapes)
```

---

## Known Issues & Problems

### 1. **Wireframe Generation Challenges**

**Problem**: Wireframe prompt is extremely long and complex (lines 195-238), with many detailed requirements that AI may struggle to follow consistently.

**Issues**:
- Prompt specifies 12-20 nodes minimum → AI may over-generate generic components
- Naming rules ("Use ACTUAL names from PRD, not 'Card 1'") → AI often generates placeholders despite instruction
- Multi-line content with `\n` → Inconsistently escaped/formatted in JSON responses
- Button/badge grouping → AI doesn't reliably create parent-child relationships via edges
- Content extraction → PRD may lack specific UI component details (field names, button labels)

**Example Problem**:
```
PRD says: "Dashboard with key metrics"
AI generates: { id: "card-1", label: "Card 1", group: "card" } ❌ Generic label
Expected:     { id: "card-revenue", label: "Revenue\n━━━━━━━\n$2.5M YTD", group: "card" } ✓ Real content
```

### 2. **Text Truncation in Bound Text**

**Problem** (line 1135-1137, diagram-layout-engine.ts):
```typescript
const maxChars = Math.floor((opts.width - 10) / (opts.fontSize * 0.55));
const displayText = opts.text.length > maxChars
    ? opts.text.substring(0, maxChars - 1) + '…'
    : opts.text;
```

- Formula `fontSize * 0.55` is an approximation → may truncate prematurely or incorrectly
- No line-wrapping logic → long labels get ellipsized instead of flowing to next line
- "Double-click to edit" annotation issue (prd-canvas.tsx lines 87-90) → requires bound text elements

### 3. **Edge Case: Missing Parent Node**

If AI generates an edge `{ from: "button-1", to: "form-x" }` but only "button-1" exists:
- parseGraphResponse filters out the edge (line 482)
- Silently skipped → no warning to user
- Button won't render with parent relationship

### 4. **Wireframe Layout Complexity**

**Problem** (diagram-layout-engine.ts, layoutWireframe function, ~250 lines):
- Extremely long function with many nested conditionals
- Hardcoded positioning (SCREEN_X, SCREEN_Y, SIDEBAR_W, etc.)
- Fragile: small changes to spacing can break layout
- Card badge positioning (lines 854-894) uses complex parent-child lookup
- Modal buttons (lines 971-986) have special positioning logic
- Fallback positioning (lines 988-1000) catches unmapped nodes but positioning may be wrong

### 5. **Validation Not Preventing Bad Generation**

**Problem** (canvas-generator.ts, lines 247-256):
- Even if diagram never reaches "complete" status, best result is returned
- User gets a "successful" generation with incomplete diagram
- No indication that diagram is suboptimal

### 6. **AI Respects Group Names Inconsistently**

**Problem**: Prompt specifies exact group names (e.g., "do-first", "in-progress"), but AI may use:
- Variations: "InProgress", "in progress", "in_progress"
- Synonyms: "completed" instead of "done"
- Abbreviations: "ip" instead of "in-progress"

Result: Nodes end up in "default group" → wrong colors/styling

### 7. **No Semantic Validation of Content**

**Problem**: Validator checks node COUNT and GROUP presence, but not semantic correctness:
- User could generate wireframe with card labels that make no sense
- Journey map could have emotional states that don't match stages
- Competitive analysis could have feature names that don't match PRD

### 8. **Wireframe Doesn't Handle All UI Patterns**

Unsupported patterns:
- Tabs / tab navigation
- Dropdowns / select menus
- Nested modals
- Collapsible sections
- Multi-column card layouts (complex grids)
- Responsive breakpoints

---

## Data Flow Summary

```
PRD Content
    ↓
[Canvas Generation Service]
    ├─ Extract context (keywords filtered)
    ├─ Get diagram-specific prompt
    └─ Call AI with structured instruction
        ↓
    [AI Response - JSON Graph]
        ├─ title: string
        ├─ nodes: { id, label, group, parent? }[]
        └─ edges: { from, to, label? }[]
        ↓
    [Graph Parser]
        ├─ Validate JSON structure
        ├─ Filter invalid nodes/edges
        └─ Return GraphData
        ↓
    [Completeness Validator]
        ├─ Check node count per group
        ├─ Check required edges
        └─ Score result (0-100)
        ↓
    [Layout Engine - Strategy-Specific]
        ├─ Compute node positions (x, y)
        └─ Build Excalidraw elements
        ↓
    [Element Normalizer]
        ├─ Fix arrow/line fields
        ├─ Create bound text elements
        ├─ De-duplicate IDs
        └─ Add required Excalidraw fields
        ↓
    [Excalidraw Canvas]
        └─ Render with proper styling & interactions
```

---

## Key Configuration Files

- **canvas-templates.ts**: Pre-built templates with Excalidraw elements
- **canvas-generator.ts**: Orchestrates generation, retry logic, validation
- **canvas-prompts.ts**: System prompt + type-specific generation prompts
- **diagram-layout-engine.ts**: All 11 layout strategies + element factories
- **diagram-validator.ts**: Completeness rules + scoring per diagram type
- **prd-canvas.tsx**: React component, Excalidraw wrapper, element normalization
- **excalidraw-embed.tsx**: Embedded canvas variant (for rich text editors)

---

## Summary of Wireframe Generation Approach

**Strengths**:
✓ Structured graph output is reliable and parseable
✓ Deterministic layout engine ensures consistent results
✓ Retry logic improves completeness on subsequent attempts
✓ Wireframe layout handles complex spatial relationships
✓ Element normalization prevents Excalidraw errors

**Weaknesses**:
✗ AI often fails to extract REAL content from PRD (uses placeholders)
✗ Complex wireframe prompt (~40 lines) hard for AI to follow consistently
✗ Text truncation formula is approximate
✗ Layout engine is 250+ lines, fragile to changes
✗ Validation doesn't ensure semantic correctness
✗ No indication when diagram is suboptimal (just "best effort")
✗ Doesn't handle all UI patterns (tabs, nested modals, responsive)
✗ Group name inconsistencies cause styling mismatches

---

## Recommendations for Improvement

1. **Simplify wireframe prompt** → Split into focused sub-prompts (screen structure, components, content)
2. **Enforce content extraction** → Use PRD section filtering to force AI to cite actual values
3. **Add semantic validation** → Check that labels match expected patterns (e.g., KPI names for metrics)
4. **Improve text truncation** → Use actual canvas measurement or line-wrapping algorithm
5. **Refactor layout engine** → Extract wireframe logic to separate module, add unit tests
6. **Better group name handling** → Accept variations, normalize to canonical group names
7. **Add UI feedback** → Show users when diagram is incomplete or used "best effort"
8. **Support more patterns** → Tabs, nested containers, responsive layouts
