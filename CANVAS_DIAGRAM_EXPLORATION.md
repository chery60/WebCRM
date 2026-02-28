# Canvas & Diagram Generation Architecture

## Overview

This workspace implements a **two-phase diagram generation system** with support for both **Mermaid diagrams** (text-based) and **Excalidraw canvases** (visual). The architecture separates content extraction from layout/rendering, ensuring AI generates semantic content while deterministic engines handle all positioning and styling.

---

## Key Files & Their Purposes

### 1. **Mermaid Diagram Generation** (`src/lib/ai/services/mermaid-generator.ts`)

**Purpose**: Generates Mermaid diagrams (flowcharts, sequence diagrams) for PRDs using AI.

**Key Functions**:
- `generateDiagram(options)` - Generates a single Mermaid diagram type
- `generatePRDDiagrams(prdContext)` - Batch generates multiple diagram types
- `suggestDiagramTypes(context)` - Intelligently suggests which diagram types are relevant
- `sanitizeMermaidCode(code)` - Fixes common syntax issues (unquoted special characters, mismatched brackets)
- `extractMermaidCode(response)` - Extracts valid Mermaid code from AI responses

**Supported Mermaid Types** (RESTRICTED for stability):
- `flowchart TD` - User flows, process flows, decision trees, system architecture
- `sequenceDiagram` - API interactions, system-to-system flows, auth flows

**Why Restricted?** Other types (erDiagram, gantt, stateDiagram, journey, pie) are prone to parsing errors and disabled to ensure reliability.

**System Prompt Features**:
- Enforces single ````mermaid code block output only
- Requires properly quoted labels with special characters
- Validates complete arrow syntax (no dangling arrows)
- Uses meaningful node IDs (not just A, B, C)
- Includes comprehensive self-validation checklist before output

**Key Output**:
```typescript
interface MermaidGenerationResult {
  success: boolean;
  diagram: string | null;  // Mermaid code (sanitized)
  title: string;
  description: string;
  error?: string;
}
```

---

### 2. **Canvas Generator Service** (`src/lib/ai/services/canvas-generator.ts`)

**Purpose**: Two-phase architecture for visual diagram generation using Excalidraw.

**Architecture**:
```
Phase 1: AI extracts structured graph data (nodes + edges) from PRD
         ↓
Phase 2: Deterministic layout engine converts graph to Excalidraw elements
```

**Key Functions**:
- `generateDiagram(options)` - Main generation pipeline
- `generateBatch(types, prdContent, productDescription)` - Batch generation with stacking
- `generateQuickOverview(productDescription)` - Fast information architecture generation
- `calculateElementOffset(existingElements)` - Prevents overlap with existing content

**Supported Canvas Types** (15 diagram types):
- **Planning & Design**: information-architecture, user-flow, journey-map, wireframe, persona
- **Technical**: system-architecture, data-model, api-design
- **Analysis & Strategy**: competitive-analysis, edge-cases, risk-matrix, stakeholder-map, feature-priority
- **Agile & PM**: sprint-planning, release-timeline

**Key Output**:
```typescript
interface CanvasGenerationResult {
  success: boolean;
  content: GeneratedCanvasContent | null;  // Type, elements, title, description
  error?: string;
  tokensUsed?: number;
}
```

---

### 3. **Diagram Layout Engine** (`src/lib/ai/services/diagram-layout-engine.ts`)

**Purpose**: Deterministic layout engine that converts graph data (nodes + edges) into fully valid Excalidraw elements with proper positioning, bindings, and styling.

**Key Responsibility**: The AI NEVER outputs pixel coordinates, arrow bindings, or Excalidraw JSON. It only outputs semantic graph data. This engine handles ALL layout concerns.

**Supported Layout Strategies**:
- `hierarchical` - Multi-level tree layouts (information-architecture, system-architecture, api-design)
- `flow` - Top-to-bottom flow with decision branching (user-flow)
- `grid` - Grid-based positioning (data-model, risk-matrix)
- `radial` - Circular/concentric layouts (stakeholder-map)
- `columns` - Kanban-style column layouts (sprint-planning)
- `swimlane` - Horizontal swim lanes (journey-map)
- `timeline` - Left-to-right timeline with milestones (release-timeline)
- `quadrant` - 2x2 quadrant matrix (feature-priority)
- `card` - Card-based layouts for UI mockups (wireframe)
- `table` - Table/matrix layouts (competitive-analysis)

**Group Configuration**:
Each diagram type maps groups to visual properties:
```typescript
interface GroupConfig {
  shape: 'rectangle' | 'ellipse' | 'diamond';
  color: string;        // Hex color code
  width: number;
  height: number;
  fontSize?: number;
}
```

**Key Functions**:
- `layoutDiagram(graphData, type, offsetX, offsetY)` - Main layout computation
- Various layout strategy implementations for each diagram type
- Arrow binding resolution (connects arrows to shape centers)
- Text element generation for node labels

**Output**: Array of Excalidraw elements with:
- Calculated x, y coordinates
- Proper shape, color, and sizing
- Arrow elements with correct bindings
- Text elements bound to shapes

---

### 4. **Canvas Prompts** (`src/lib/ai/prompts/canvas-prompts.ts`)

**Purpose**: Defines prompts for Phase 1 (AI content extraction) of the canvas generation pipeline.

**System Prompt** (`CANVAS_SYSTEM_PROMPT`):
- Tells AI to output ONLY a JSON object (no markdown, no explanations)
- Specifies exact format: `{ title, nodes: [...], edges: [...] }`
- Requires unique, descriptive node IDs (e.g., "nav-dashboard")
- Requires all labels to come from actual PRD content
- Specifies "group" field determines visual styling

**Diagram-Specific Prompts** (`CANVAS_GENERATION_PROMPTS`):
Each of the 15 diagram types has a detailed prompt specifying:
- REQUIRED NODE GROUPS (with quantities, e.g., "L1: 6-8 nodes", "L2: 15-25 total")
- REQUIRED EDGES (parent-child relationships, connections)
- Which field to use for hierarchical diagrams ("parent" field)
- Extraction instructions (use ACTUAL names from PRD, no placeholders)

**Example (information-architecture)**:
```
NODE GROUPS:
- "L1": Top-level navigation (6-8 nodes)
- "L2": Sub-pages under each L1 (3-5 per L1, 15-25 total)
- "L3": Features/components under L2 (2-3 per L2, 10-20 total)

EDGES: Connect every L1→L2 and L2→L3
Set "parent" on L2 to L1 parent id, on L3 to L2 parent id
```

**Graph Response Parser** (`parseGraphResponse`):
- Handles markdown code fences and JSON extraction
- Validates structure (title, nodes array required)
- Filters invalid nodes (missing id, label, or group)
- Validates edges (must reference valid node IDs)
- Auto-fixes trailing commas in JSON

**Key Output**:
```typescript
interface GraphData {
  title: string;
  nodes: GraphNode[];  // { id, label, group, parent? }
  edges: GraphEdge[];  // { from, to, label? }
}
```

---

### 5. **Mermaid Validator** (`src/lib/utils/mermaid-validator.ts`)

**Purpose**: Client-side validation for Mermaid diagram syntax to catch errors before rendering.

**Key Function**: `validateMermaidDiagram(code)`

**Validation Checks**:
1. **Type Validation**: Only allows `flowchart`, `graph`, `sequenceDiagram` (others disabled)
2. **Bracket Matching**: Balanced `[]`, `()`, `{}`
3. **Special Characters**: Warns about unquoted special chars in labels
4. **ERD Attributes**: Special handling for entity-relationship diagrams
5. **Automatic Sanitization**: Quotes special characters in labels to fix common issues

**Sanitization Features**:
- Wraps labels with special chars `(){}[]<>|` in quotes
- Fixes double-bracket patterns `[[...]]`, `((...))`, `[(...)]`
- Handles mixed bracket patterns
- Preserves already-quoted content
- Converts backslash-escaped quotes to single quotes (avoiding double-escaping)
- Special handling for ERD relationship labels

**Output**:
```typescript
interface MermaidValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
  sanitizedCode?: string;  // Auto-fixed code if issues found
}
```

---

### 6. **Mermaid Diagram Component** (`src/components/charts/mermaid-diagram.tsx`)

**Purpose**: React component that renders Mermaid diagrams with theme support and error handling.

**Key Props**:
- `chart: string` - Mermaid diagram code
- `theme?: 'light' | 'dark' | 'auto'` - Theme mode
- `onRender?: () => void` - Callback when rendered successfully
- `onError?: (error: Error) => void` - Callback on render failure

**Features**:
1. **Theme Configuration**: Clean monochromatic style (white fill, black borders/text)
2. **Dark Mode Support**: Auto-detects dark mode from CSS class on `<html>`
3. **Sanitization**: Runs `sanitizeMermaidCode()` before rendering
4. **ERD Attribute Fixing**: Detects and fixes common ERD issues
5. **Error Display**: User-friendly error messages with line numbers
6. **Incomplete Arrow Detection**: Comments out dangling arrows

**Mermaid Theme Variables**:
```typescript
{
  primaryColor: '#ffffff',          // Node fill
  primaryTextColor: '#1a1a1a',      // Text color
  primaryBorderColor: '#1a1a1a',    // Border color
  lineColor: '#333333',             // Arrow/line color
  noteBkgColor: '#f5f5f5',         // Note background
  // ... 30+ color variables for all diagram types
}
```

**Error Handling**: Shows common fixes for:
- Unquoted labels with special characters
- Missing brackets or parentheses
- Invalid node IDs or connections
- Diagram type declaration issues

---

### 7. **Excalidraw Embed Component** (`src/components/canvas/excalidraw-embed.tsx`)

**Purpose**: Inline canvas embedding in notes with AI generation capabilities.

**Key Features**:
1. **AI Generation Menu**: Categorized dropdown with 15 diagram types
2. **Canvas Templates**: Quick-start templates for common diagrams
3. **Export Options**: PNG and SVG export
4. **Canvas Management**: Naming, fullscreen mode, clearing
5. **Keyboard Shortcuts**: Integrated shortcut system

**Generation Categories**:
- 📐 Planning & Design (5 types)
- ⚙️ Technical (3 types)
- 📊 Analysis & Strategy (5 types)
- 🚀 Agile & PM (2 types)

**Key Props**:
```typescript
interface ExcalidrawEmbedProps {
  data?: ExcalidrawEmbedData;                    // Initial canvas
  onChange?: (data: ExcalidrawEmbedData) => void;
  onGenerateContent?: (type: CanvasGenerationType) 
    => Promise<GeneratedCanvasContent | null>;
  isGenerating?: boolean;
  generatingType?: CanvasGenerationType | null;
  canvasId?: string;
  canvasName?: string;
  onCanvasNameChange?: (name: string) => void;
  onExpand?: () => void;
}
```

**ExcalidrawWrapper**:
- Lazy-loads Excalidraw to avoid SSR issues
- Defers mounting to avoid React flushSync conflicts with TipTap
- Handles CSS loading dynamically
- Ensures collaborators Map is always present (required by Excalidraw)

---

### 8. **PRD Canvas Component** (`src/components/canvas/prd-canvas.tsx`)

**Purpose**: Full-page canvas viewer with all features (generation, export, annotations, collaboration).

**Key Responsibilities**:
1. **Element Normalization**: Converts AI-generated elements to valid Excalidraw format
2. **Excalidraw Integration**: Full API wrapping with state management
3. **AI Generation Pipeline**: Handles generation with robust error recovery
4. **Annotations System**: Comments, replies, status tracking
5. **Collaboration**: Presence indicators, cursor tracking, activity feed
6. **Export**: SVG and PNG export with high-quality output

**Element Normalization** (`normalizeElementsForExcalidraw`):

Fixes several critical Excalidraw issues:
- **"Linear element is not normalized"** - Adds required fields on arrows/lines:
  - `lastCommittedPoint`, `startBinding`, `endBinding`, `elbowed`
- **Missing required shape fields** - Adds defaults for:
  - `strokeColor`, `fillStyle`, `roughness`, `opacity`, `seed`, `versionNonce`
- **Invalid points arrays** - Validates and repairs arrow point coordinates
- **Duplicate IDs** - De-duplicates by appending random suffixes
- **Text truncation bug** - Creates separate bound text elements for shape labels
  - Excalidraw requires shapes without `text` property + separate `text` element with `containerId`
  - This prevents the "double-click to edit" annotation bug

**Generation Pipeline**:
1. User selects diagram type from categorized menu
2. Calls `onGenerateContent(type, existingElements)` callback
3. Waits for result with type validation
4. Normalizes elements for Excalidraw compatibility
5. Either:
   - **If Excalidraw mounted**: Adds elements directly via `updateScene`
   - **If collapsed**: Stores as pending, expands canvas, applies on mount
6. Calls `onChange` callback with final persisted elements (filtering deleted)
7. Scrolls to new content and triggers history commit for undo support

**Annotation System**:
```typescript
interface CanvasAnnotation {
  id: string;
  content: string;
  author: string;
  priority: 'low' | 'medium' | 'high';
  status: 'open' | 'in-progress' | 'resolved';
  replies?: AnnotationReply[];
}
```

**Key Methods Exposed via Ref**:
```typescript
interface PRDCanvasRef {
  getCanvasData(): CanvasData | null;
  setCanvasData(data: CanvasData): void;
  addElements(elements: ExcalidrawElement[]): void;
  clearCanvas(): void;
  exportToSVG(): Promise<string | null>;
  exportToPNG(): Promise<Blob | null>;
}
```

---

### 9. **Mermaid TipTap Extension** (`src/components/notes/extensions/mermaid-extension.tsx`)

**Purpose**: Integrates Mermaid diagrams as inline blocks in rich text editor (TipTap).

**Features**:
1. **Inline Editing**: Edit Mermaid code directly in the editor
2. **Syntax Validation**: Real-time validation with error feedback
3. **Type Detection**: Auto-detects diagram type and shows appropriate icon
4. **Automatic Sanitization**: Fixes common syntax issues on save
5. **Collapsible View**: Toggle between preview and code view

**MermaidNodeView Component**:
- Renders diagram preview with edit mode toggle
- Shows validation warnings/errors
- Provides save/cancel buttons
- Detects diagram type for icon/title

**Key Attributes**:
```typescript
{
  code: string;           // Mermaid diagram code
  title?: string;         // Custom diagram title
}
```

---

### 10. **Excalidraw TipTap Extension** (`src/components/notes/extensions/excalidraw-extension.tsx`)

**Purpose**: Integrates Excalidraw canvases as inline blocks in rich text editor with sync between inline and expanded views.

**Sync Registries** (Event-based sync):
1. **Canvas Name Sync**: Keeps name synchronized between inline and expanded views
2. **Canvas Data Sync**: Bidirectional sync for canvas content changes
3. **Canvas Deletion Sync**: Handles deletion from either view (inline or widget)
4. **External Deletion**: Widget can request inline canvas deletion

**Global AI Context**:
```typescript
interface InlineCanvasAIContext {
  getPrdContent(): string;
  getProductDescription(): string;
  generateContent(type: CanvasGenerationType, existingElements: any[]): Promise<GeneratedCanvasContent | null>;
  isGenerating: boolean;
  generatingType: CanvasGenerationType | null;
}
```

The TipTap editor sets this context so inline canvases can generate AI content.

**ExcalidrawNodeView**:
- Manages canvas state (name, elements, id)
- Handles name changes with external sync
- Registers for deletion requests from widgets
- Syncs data changes back to note
- Auto-generates canvasId on mount if missing (for old canvases)

---

### 11. **Supporting Components**

#### Canvas Annotations (`src/components/canvas/canvas-annotations.tsx`)
- Threaded commenting system with priority/status
- Filter by status (open, resolved, all)
- Priority badges (low, medium, high)
- Reply functionality
- Edit/delete annotations

#### Canvas Presence (`src/components/canvas/canvas-presence.tsx`)
- Real-time collaborator display
- Online/offline status indicators
- Cursor position tracking
- Activity feed (joins, edits, comments)
- Color-coded collaborator identification

---

## Diagram Generation Workflow

### Mermaid Flow
```
User Input (PRD Content)
     ↓
AI with strict system prompt extracts diagram content
     ↓
Extract mermaid code block from response
     ↓
Validate with mermaid-validator
     ↓
Sanitize special characters and syntax
     ↓
Render with MermaidDiagram component (monochromatic theme)
     ↓
Show in TipTap editor as inline mermaid-extension block
```

### Canvas Flow
```
User selects diagram type from menu
     ↓
[Phase 1] AI extracts graph data (nodes, edges, groups) from PRD
          - parseGraphResponse validates JSON structure
          - Filters invalid nodes/edges
     ↓
[Phase 2] Layout engine positions nodes based on diagram type
          - Applies appropriate layout strategy (hierarchical, flow, etc.)
          - Assigns colors, shapes from group configs
          - Creates arrows with bindings
          - Generates text elements
     ↓
normalizeElementsForExcalidraw validates for Excalidraw compatibility
     ↓
Add to Excalidraw scene (or store as pending if collapsed)
     ↓
Show in PRDCanvas component or expanded fullscreen
```

---

## Supported Diagram Types Summary

| Type | Mermaid | Canvas | Layout Strategy | Use Case |
|------|---------|--------|-----------------|----------|
| Information Architecture | ❌ | ✅ | Hierarchical (3-level tree) | Sitemap, content hierarchy |
| User Flow | ✅ | ✅ | Flow (top-to-bottom) | User journeys, decision trees |
| System Architecture | ❌ | ✅ | Hierarchical | Technical components, services |
| Data Model (ERD) | ❌ | ✅ | Grid | Entity relationships, database schema |
| Sequence Diagram | ✅ | ❌ | N/A (text-based) | API interactions, system flows |
| Flowchart | ✅ | ❌ | N/A (text-based) | Processes, workflows |
| User Journey Map | ❌ | ✅ | Swimlane | Timeline-based experience |
| Wireframe | ❌ | ✅ | Card | UI/screen layout |
| Feature Priority Matrix | ❌ | ✅ | Quadrant | Impact vs. effort |
| Competitive Analysis | ❌ | ✅ | Table | Feature comparison |
| Stakeholder Map | ❌ | ✅ | Radial | Influence relationships |
| Risk Matrix | ❌ | ✅ | Grid | Risk assessment |
| Sprint Planning | ❌ | ✅ | Columns | Kanban-style tasks |
| Release Timeline | ❌ | ✅ | Timeline | Roadmap, milestones |
| API Design | ❌ | ✅ | Hierarchical | Endpoint visualization |
| User Persona | ❌ | ✅ | Card | User profile |
| Edge Cases | ❌ | ✅ | Hierarchical | Error handling |

---

## Key Design Decisions

### 1. Two-Phase Canvas Architecture
**Why**: Separates concerns between content extraction (AI) and layout (deterministic).
- **Benefits**: Reproducible layouts, easier debugging, no pixel-coordinate hallucination by AI
- **Alternative**: Single-phase direct Excalidraw JSON generation (abandoned due to AI errors)

### 2. Mermaid Type Restriction
**Why**: Only flowchart and sequenceDiagram supported.
- **Reason**: Other types (ERD, Gantt, State) produce frequent parsing errors
- **Trade-off**: Users lose diagram variety but gain reliability

### 3. Element Normalization Pipeline
**Why**: Excalidraw has strict element requirements that AI outputs often violate.
- **Fixes**: 
  - Adds required fields (versionNonce, seed, binding arrays)
  - De-duplicates IDs
  - Separates text from shapes (bound text elements)
  - Validates arrow point arrays
- **Result**: Eliminates "Linear element is not normalized" errors

### 4. Context Extraction for Canvas Prompts
**Why**: PRD content is often large; AI needs focused context.
- **Strategy**: Keywords and section extraction per diagram type
- **Result**: Smaller prompt tokens, better AI focus

### 5. Pending Elements Pattern
**Why**: Users can generate diagrams while canvas is collapsed (in notes).
- **Solution**: Store elements as pending, apply on expansion
- **Benefits**: Seamless UX without forcing expansion

### 6. Deleted Element Filtering
**Why**: Excalidraw marks deleted elements with `isDeleted: true` instead of removing them.
- **Issue**: Without filtering, deleted diagrams reappear after reload
- **Solution**: Filter `isDeleted: true` before persisting to database

---

## Validation & Error Handling

### Mermaid Validation Pipeline
1. **Service Level** (`mermaid-generator.ts`):
   - Extract code from response
   - Run `validateMermaidDiagram()`
   - Return validation error if invalid
   
2. **Component Level** (`mermaid-diagram.tsx`):
   - Sanitize code before Mermaid library
   - Catch render errors
   - Show user-friendly error UI with suggested fixes

3. **Extension Level** (`mermaid-extension.tsx`):
   - Validate on save
   - Use sanitized version if available
   - Show warnings for problematic patterns

### Canvas Validation Pipeline
1. **Graph Response** (`canvas-prompts.ts`):
   - Parse JSON with error recovery (trailing commas, code fences)
   - Validate nodes have id, label, group
   - Validate edges reference valid nodes
   - Warn and skip invalid entries

2. **Element Normalization** (`prd-canvas.tsx`):
   - De-duplicate IDs
   - Ensure all required Excalidraw fields present
   - Validate arrow point arrays
   - Create bound text elements

3. **Scene Update**:
   - Validate before `updateScene()` call
   - Commit to history for undo
   - Scroll to content for visibility

---

## Performance Considerations

1. **Lazy Loading**: Excalidraw loaded dynamically on demand (SSR-safe)
2. **Deferred Mounting**: Canvas mounts in next frame to avoid TipTap conflicts
3. **Ref-Based State**: Uses refs to avoid re-renders in generation callbacks
4. **Pending Elements**: Defers layout until canvas is visible
5. **Context Polling**: Canvas context checked every 500ms for updates (could be optimized with events)

---

## Future Enhancement Opportunities

1. **Additional Mermaid Types**: Enable stateDiagram, erDiagram with improved prompting
2. **Custom Themes**: User-selectable color schemes for diagrams
3. **Real-time Collaboration**: WebSocket sync for multi-user canvas editing
4. **Advanced Templates**: More built-in diagram templates with variations
5. **Batch Generation**: Generate all relevant diagrams in one request
6. **Improved Context**: ML-based context summarization for large PRDs
7. **Export Formats**: PDF, interactive HTML, PowerPoint
8. **Accessibility**: Better ARIA labels, keyboard navigation for Excalidraw
9. **Version History**: Canvas snapshot and rollback functionality
10. **AI Training**: Store successful diagrams to improve future generations

---

## Summary

This is a **sophisticated diagram generation system** that balances:
- **AI Reliability**: Strict prompts, semantic output, no hallucinations
- **Visual Quality**: Deterministic layout engines, consistent styling
- **User Experience**: Multiple diagram types, inline editing, full-page view, collaboration
- **Developer Experience**: Clear separation of concerns, reusable components, comprehensive error handling

The **two-phase architecture** (content extraction → layout computation) is the key insight—it eliminates AI hallucinations about positioning while leveraging AI's strength in content understanding.
