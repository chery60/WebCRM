# PRD Generation and Canvas Generation Flow - Complete Analysis

## Overview

This document outlines the complete flow for how PRD (Product Requirements Document) content triggers diagram generation on the canvas, how the canvas gets populated, and the current generation architecture.

---

## High-Level Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│  PRDEditorWithCanvas                                            │
│  (src/components/notes/prd-editor-with-canvas.tsx)            │
│  - Combines document editor + canvas in tabs/split view        │
│  - Extracts plain text from PRD content for AI context         │
│  - Manages canvas data persistence                             │
└────────────────┬──────────────────────────────────────────────┘
                 │
                 ├─ NoteEditor (document editing)
                 │
                 └─ PRDCanvas (diagram canvas)
                    └─ handleGenerateContent()
                       │
                       ├─> canvasGenerator.generateDiagram()
                       │   (src/lib/ai/services/canvas-generator.ts)
                       │
                       └─> AI API Call (with PRD context)
                           │
                           └─> Returns GeneratedCanvasContent
                               (elements, title, description)
                                   │
                                   ├─> normalizeElementsForExcalidraw()
                                   │   (fixes linear element issues)
                                   │
                                   └─> updateScene()
                                       (adds to Excalidraw canvas)
```

---

## 1. PRD Content → Canvas Generation Flow

### Entry Point: `PRDEditorWithCanvas`

**File:** `src/components/notes/prd-editor-with-canvas.tsx`

```typescript
interface PRDEditorWithCanvasProps {
  content: string;                    // TipTap JSON editor content
  onChange: (content: string) => void;
  productDescription?: string;        // Plain text product brief
  canvasData?: CanvasData;           // Excalidraw elements
  onCanvasChange?: (data: CanvasData) => void;
}
```

**Key State Management:**
```typescript
const [prdPlainText, setPrdPlainText] = useState('');  // Extracted from TipTap JSON

// Extract structured text from TipTap JSON (preserves heading markers)
useEffect(() => {
  const extractStructuredText = (node: any, depth: number = 0): string => {
    if (node.type === 'heading') {
      const level = node.attrs?.level || 1;
      const prefix = '#'.repeat(level);  // # ## ### for heading levels
      const text = extractStructuredText(child);
      return `${prefix} ${text}`;
    }
    // ... recursively extract text
  };
  setPrdPlainText(extractStructuredText(parsed));
}, [content]);
```

**Why this matters:** The canvas generator needs plain text with heading markers preserved so it can understand the document structure (sections, subsections, etc.) for generating contextually appropriate diagrams.

---

### Step 1: User Triggers Diagram Generation

**In `PRDCanvas` component:**

```typescript
// User clicks "AI Generate" dropdown → selects diagram type
const handleGenerate = async (type: CanvasGenerationType) => {
  // Get existing elements (for proper positioning of new diagrams)
  const existingElements = excalidrawAPIRef.current?.getSceneElements() || [];
  
  // Call parent's onGenerateContent callback
  const result = await onGenerateContent(type, existingElements);
  
  // Normalize and add to canvas
  const validElements = normalizeElementsForExcalidraw(result.elements);
  excalidrawAPIRef.current.updateScene({
    elements: [...currentElements, ...validElements],
    commitToHistory: true,
  });
};
```

**Available Diagram Types:**
- Planning & Design: Information Architecture, User Flow, Journey Map, Wireframe, Persona
- Technical: System Architecture, Data Model, API Design
- Analysis: Competitive Analysis, Edge Cases, Risk Matrix, Stakeholder Map, Feature Priority
- Agile & PM: Sprint Planning, Release Timeline

---

### Step 2: Canvas Generation Handler

**In `PRDEditorWithCanvas.handleGenerateContent()`:**

```typescript
const handleGenerateContent = useCallback(
  async (type: CanvasGenerationType, existingElements: any[] = []) => {
    // 1. Validate we have content
    const effectivePrdContent = prdPlainText.trim() || productDescription.trim();
    if (!effectivePrdContent) {
      toast.error('Please add some content to your PRD before generating diagrams');
      return null;
    }

    // 2. Collect existing elements for context
    const inlineElements = getInlineCanvasElements();  // From embedded canvases
    const bottomCanvasElements = existingElements.length > 0 
      ? existingElements 
      : (canvasData?.elements || []);
    const allExistingElements = [...inlineElements, ...bottomCanvasElements];

    // 3. Enhance context with existing diagram info
    let enhancedPrdContent = effectivePrdContent;
    if (allExistingElements.length > 0) {
      const existingContext = summarizeElements(allExistingElements);
      // e.g., "[Existing diagrams: 3 rectangles, 2 arrows, including: User Flow, System Design]"
      enhancedPrdContent = `${effectivePrdContent}\n\n[Existing diagrams: ${existingContext}]`;
    }

    // 4. Call canvas generator service
    const result = await canvasGenerator.generateDiagram({
      type,
      prdContent: enhancedPrdContent,
      productDescription: productDescription || effectivePrdContent.substring(0, 500),
      provider: activeProvider || undefined,
      existingElements: bottomCanvasElements,  // For offset calculation
    });

    // 5. Return generated content
    return result.content;  // { type, elements, title, description }
  },
  [prdPlainText, productDescription, activeProvider, canvasData, getInlineCanvasElements]
);
```

---

## 2. Canvas Generator Service

**File:** `src/lib/ai/services/canvas-generator.ts`

### Main Generation Method

```typescript
class CanvasGeneratorService {
  async generateDiagram(options: {
    type: CanvasGenerationType;
    prdContent: string;
    productDescription: string;
    provider?: AIProviderType;
    existingElements?: any[];
    onChunkReady?: (elements: any[], index: number, total: number) => void;
  }): Promise<GenerationResult> {
    // 1. Get appropriate prompt for diagram type
    const prompt = CANVAS_PROMPTS[type];  // From canvas-prompts.ts
    
    // 2. Build system and user prompts
    const systemPrompt = buildSystemPrompt(type);
    const userPrompt = buildUserPrompt(type, prdContent, productDescription, existingElements);

    // 3. Call AI to generate Excalidraw elements
    const response = await generateAIContent({
      type: 'generate-diagram',
      prompt: userPrompt,
      context: systemPrompt,
      provider,
    });

    // 4. Parse AI response into Excalidraw elements
    const elements = parseExcalidrawElements(response.content);

    // 5. Return with metadata
    return {
      success: true,
      content: {
        type,
        elements,
        title: extractTitle(response.content),
        description: extractDescription(response.content),
      },
      tokensUsed: response.tokens,
    };
  }
}
```

### Chunked Generation (for complex diagrams)

Some diagram types support progressive generation:

```typescript
// For diagram types in CHUNKED_DIAGRAM_TYPES:
// - Information Architecture
// - User Flow
// - System Architecture
// - Data Model
// - Wireframe

async generateDiagram(options: { onChunkReady? }) {
  // Generate in sections, calling onChunkReady after each chunk
  for (let i = 0; i < totalChunks; i++) {
    const chunkElements = await generateChunk(i);
    
    // Toast shows progress: "Generating diagram… (section 1 of 3)"
    if (onChunkReady) {
      onChunkReady(chunkElements, i, totalChunks);
    }
    
    // Live update canvas with partial results
    excalidrawAPI.updateScene({
      elements: [...existing, ...chunkElements],
    });
  }
}
```

---

## 3. Element Normalization

**File:** `src/components/canvas/prd-canvas.tsx`

The `normalizeElementsForExcalidraw()` function is **critical** - it fixes common AI generation issues:

### Issues Fixed:

1. **"Linear element is not normalized" Error**
   - Arrows/lines need: `lastCommittedPoint`, `startBinding`, `endBinding`, `elbowed`
   ```typescript
   if (el.type === 'arrow' || el.type === 'line') {
     result.push({
       ...base,
       type: el.type,
       points,
       lastCommittedPoint: points[points.length - 1] ?? [100, 0],
       startBinding: el.startBinding ?? null,
       endBinding: el.endBinding ?? null,
       startArrowhead: el.startArrowhead ?? null,
       endArrowhead: el.endArrowhead ?? (el.type === 'arrow' ? 'arrow' : null),
       elbowed: el.elbowed ?? false,
       boundElements: [],  // Preserve arrow bindings
       width: 0,
       height: 0,
     });
   }
   ```

2. **Text Truncation/Annotation Bug**
   - Shapes with text require a **separate bound text element**
   - AI generates text IN the shape; Excalidraw needs text AS A CHILD
   ```typescript
   // For shapes with text:
   const shapeElement = { ...base, text: undefined, boundElements: [{ type: 'text', id: textId }] };
   
   // Create bound text child element
   const boundTextEl = {
     id: textId,
     type: 'text',
     text: rawText,
     containerId: id,  // Link to parent shape
     ...otherFields
   };
   ```

3. **Missing Required Fields**
   - All elements need: `version`, `versionNonce`, `fillStyle`, `strokeWidth`, `roughness`, `opacity`, `seed`, etc.
   ```typescript
   const base = {
     version: el.version ?? 1,
     versionNonce: el.versionNonce ?? Math.floor(Math.random() * 1e9),
     isDeleted: false,
     fillStyle: el.fillStyle ?? 'solid',
     strokeWidth: el.strokeWidth ?? 1,
     // ... etc
   };
   ```

4. **Duplicate IDs**
   - Deduplicates by appending random suffix: `id-a4f2c`

---

## 4. Canvas Population and State Management

### Canvas State Flow

```typescript
export const PRDCanvas = forwardRef<PRDCanvasRef, PRDCanvasProps>(function PRDCanvas({
  initialData,
  onChange,
  prdContent,
  productDescription,
  defaultCollapsed = true,
  onGenerateContent,
  isGenerating = false,
  generatingType = null,
}) {
  // Refs to avoid infinite re-render loops
  const excalidrawAPIRef = useRef<any>(null);
  const pendingElementsRef = useRef<ExcalidrawElement[] | null>(null);
  const annotationsRef = useRef<CanvasAnnotation[]>(annotations);
  const isGeneratingRef = useRef(false);

  // Expose methods via imperative handle
  useImperativeHandle(ref, () => ({
    getCanvasData: () => ({
      elements: excalidrawAPIRef.current.getSceneElements(),
      appState: excalidrawAPIRef.current.getAppState(),
      files: excalidrawAPIRef.current.getFiles(),
    }),
    setCanvasData: (data: CanvasData) => {
      excalidrawAPIRef.current.updateScene({
        elements: data.elements,
        appState: data.appState,
      });
    },
    addElements: (elements: ExcalidrawElement[]) => {
      const currentElements = excalidrawAPIRef.current.getSceneElements();
      excalidrawAPIRef.current.updateScene({
        elements: [...currentElements, ...normalizeElementsForExcalidraw(elements)],
      });
    },
    clearCanvas: () => {
      excalidrawAPIRef.current.updateScene({ elements: [] });
    },
    exportToSVG: async () => { /* ... */ },
    exportToPNG: async () => { /* ... */ },
  }));
});
```

### Generation and Canvas Update

```typescript
const handleGenerate = async (type: CanvasGenerationType) => {
  isGeneratingRef.current = true;  // Prevent onChange during generation

  try {
    // Get existing elements for positioning
    const existingElements = excalidrawAPIRef.current?.getSceneElements() || [];
    
    // Call parent handler
    const result = await onGenerateContent(type, existingElements);
    
    if (!result) return;

    // Normalize elements
    const validElements = normalizeElementsForExcalidraw(result.elements);

    setHasContent(true);

    if (excalidrawAPIRef.current) {
      // Case 1: Excalidraw is mounted
      const currentElements = excalidrawAPIRef.current.getSceneElements();
      const newElements = [...currentElements, ...validElements];

      excalidrawAPIRef.current.updateScene({
        elements: newElements,
        commitToHistory: true,  // Enable undo
      });

      // Scroll to generated content
      setTimeout(() => {
        excalidrawAPIRef.current.scrollToContent();
      }, 100);

      setIsCollapsed(false);  // Expand to show content

      // Defer onChange to allow Excalidraw to settle
      setTimeout(() => {
        const finalElements = excalidrawAPIRef.current
          .getSceneElements()
          .filter((el: any) => !el.isDeleted);  // CRITICAL: Filter deleted

        isGeneratingRef.current = false;

        onChange?.({
          elements: finalElements,
          appState: excalidrawAPIRef.current.getAppState(),
          files: excalidrawAPIRef.current.getFiles(),
          annotations: annotationsRef.current,
        });
      }, 150);
    } else {
      // Case 2: Excalidraw collapsed - store as pending
      pendingElementsRef.current = validElements;
      setIsCollapsed(false);  // Will trigger mount
    }
  } finally {
    // ...
  }
};
```

### Handling Collapsed State

When the canvas is collapsed (not mounted), generated elements are stored pending:

```typescript
// In handleExcalidrawAPI (called when Excalidraw mounts)
const handleExcalidrawAPI = useCallback((api: any) => {
  excalidrawAPIRef.current = api;

  // If there are pending elements from generation while collapsed:
  if (api && pendingElementsRef.current?.length > 0) {
    const pendingCount = pendingElementsRef.current.length;

    setTimeout(() => {
      const currentElements = excalidrawAPIRef.current.getSceneElements();
      const newElements = [
        ...currentElements,
        ...normalizeElementsForExcalidraw(pendingElementsRef.current),
      ];

      excalidrawAPIRef.current.updateScene({
        elements: newElements,
        commitToHistory: true,
      });

      pendingElementsRef.current = null;  // Clear pending

      // Trigger onChange for persistence
      onChange?.({
        elements: newElements.filter((el: any) => !el.isDeleted),
        appState: excalidrawAPIRef.current.getAppState(),
        files: excalidrawAPIRef.current.getFiles(),
        annotations: annotationsRef.current,
      });
    }, 100);
  }
}, []);  // NO DEPENDENCIES - completely stable
```

---

## 5. AI Chat-Based PRD Generation

**File:** `src/components/notes/prd-chat-drawer-v2.tsx`

This is a separate flow for conversational PRD refinement:

```typescript
export function PRDChatDrawerV2({
  open,
  onOpenChange,
  noteContent,
  onApplyContent,  // Applies generated PRD back to note
  noteId,
}) {
  // Use specialized PRD chat hook
  const chat = useAIPRDChat({
    provider: selectedProvider || undefined,
    templateName: template?.name,
    templateDescription: template?.description,
    templateContextPrompt: template?.contextPrompt,
    templateSections: templateSections.map(s => ({
      id: s.id,
      title: s.title,
      order: s.order,
      description: s.description,
    })),
    onFinish: async (message) => {
      // Save to Supabase when done
      await saveChatToSupabase();
    },
  });

  // User sends message
  const handleSubmit = async (message: string) => {
    chat.sendMessage({ role: 'user', parts: [{ type: 'text', text: message }] });
  };

  // Assistant generates PRD content
  // User can "Add to Note" with overwrite/append choice
  const handleAddToNote = (messageId: string, content: string) => {
    const cleanedContent = cleanContentFromThinking(content);
    
    // If note has existing content, ask user:
    if (noteContent.trim().length > 0) {
      setShowApplyModeDialog(true);  // Overwrite or Append?
    } else {
      onApplyContent(cleanedContent, 'append');
    }
  };
}
```

---

## 6. AI Service Layer

### useAIChat Hook

**File:** `src/lib/ai/use-ai-chat.ts`

```typescript
export function useAIChat(options: UseAIChatOptions = {}) {
  const { provider: selectedProvider, type = 'ask', temperature } = options;
  const { providers, activeProvider } = useAISettingsStore();

  const provider = selectedProvider || activeProvider || 'openai';
  const providerConfig = providers[provider];

  // Create transport for AI SDK
  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/ai/chat',
    body: {
      provider,
      apiKey: providerConfig?.apiKey || '',
      model: providerConfig?.defaultModel || '',
      type,
      temperature,
    },
  }), [provider, providerConfig, type, temperature]);

  // Use AI SDK's useChat hook
  const chat = useAISDKChat({
    transport,
    onFinish,
    onError,
  });

  return {
    ...chat,
    error: validationError || chat.error,
    provider,
    model: providerConfig?.defaultModel,
  };
}
```

### useAIPRDChat Hook (Specialized)

```typescript
export function useAIPRDChat(options: UseAIPRDChatOptions = {}) {
  // Similar to useAIChat but passes full template context
  const transport = useMemo(() => new DefaultChatTransport({
    api: '/api/ai/prd',  // Different endpoint
    body: {
      provider,
      apiKey: providerConfig?.apiKey || '',
      model: providerConfig?.defaultModel || '',
      templateName,
      templateDescription,
      templateContextPrompt,
      templateSections,  // IMPORTANT: Full section details
      temperature,
    },
  }), [...dependencies]);

  return useAISDKChat({ transport, onFinish, onError });
}
```

### API Endpoint

**File:** `src/app/api/ai/chat/route.ts`

```typescript
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    messages,
    provider = 'openai',
    apiKey,
    model,
    type = 'ask',
    temperature,
  } = body;

  if (!apiKey) {
    return new Response('API key is required', { status: 400 });
  }

  // Get AI model based on provider
  const aiModel = getAIProvider(provider, apiKey, model);

  // Get system prompt based on generation type
  const systemPrompt = getSystemPromptForType(type);

  // Stream the response
  const result = streamText({
    model: aiModel,
    system: systemPrompt,
    messages: messages,
    temperature: temperature || 0.7,
  });

  return result.toUIMessageStreamResponse();
}

export const runtime = 'edge';
```

---

## 7. PRD Generator Service

**File:** `src/lib/ai/services/prd-generator.ts`

### Full PRD Generation

```typescript
class PRDGeneratorService {
  async generateFullPRD(options: PRDGenerationOptions): Promise<PRDGenerationResult> {
    const {
      description,
      templateType = 'custom',
      customTemplate,
      context,
      audience = 'mixed',
      detailLevel = 'standard',
      provider,
      projectInstructions,
      useStructuredFormat = true,
    } = options;

    // Use new structured format by default
    if (useStructuredFormat && !customTemplate) {
      return this.generateStructuredPRD({
        description,
        context,
        provider,
        projectInstructions,
      });
    }

    // Otherwise use custom or legacy template
    let template: { sections: [] };
    let templateContext: string;
    
    if (customTemplate) {
      template = buildTemplateFromCustom(customTemplate);
      templateContext = buildContextPrompt(customTemplate);
    } else {
      template = getTemplate(templateType as PRDTemplateType);
      templateContext = getTemplateContextPrompt(templateType as PRDTemplateType);
    }

    // Build prompts
    const systemPrompt = this.buildSystemPrompt(templateContext, audience, detailLevel, projectInstructions);
    const userPrompt = this.buildUserPrompt(description, template, context);

    // Call AI
    const response = await generateAIContent({
      type: 'generate-prd',
      prompt: userPrompt,
      context: systemPrompt,
      provider,
    });

    // Parse into sections
    const sections = this.parseIntoSections(response.content, template.sections);

    return {
      content: response.content,
      sections,
    };
  }
}
```

---

## 8. Data Flow Summary

### Canvas Generation Trigger Points

1. **User clicks "AI Generate" in Canvas** → `PRDCanvas.handleGenerate()`
2. **Calls** → `PRDEditorWithCanvas.handleGenerateContent()`
3. **Which calls** → `canvasGenerator.generateDiagram()`
4. **Which calls** → `generateAIContent()` (AI API)
5. **AI returns** → Excalidraw elements as JSON
6. **Normalize** → `normalizeElementsForExcalidraw()`
7. **Update Scene** → `excalidrawAPI.updateScene()`
8. **Persist** → `onChange()` callback

### Context Flow

```
PRD Content (TipTap JSON)
    ↓
Extract Plain Text with Headings
    ↓
PRD Chat (conversational refinement)
    ↓
Canvas Generation (AI generates diagrams)
    ↓
Excalidraw Elements (normalized)
    ↓
Canvas State (persisted to database)
```

### Critical State Management

- **`isGeneratingRef`**: Prevents intermediate onChange calls from overwriting
- **`pendingElementsRef`**: Stores elements when canvas is collapsed
- **`excalidrawAPIRef`**: Stable reference to Excalidraw instance
- **`annotationsRef`**: Tracks annotations without triggering re-renders
- **Filter `isDeleted`**: Always filter before persisting (Excalidraw marks deleted, doesn't remove)

---

## 9. Diagram Generation Configuration

### System Prompts by Type

Each diagram type has a specialized system prompt in `src/lib/ai/prompts/canvas-prompts.ts`:

```typescript
// System prompt for User Flow diagrams includes:
// - Use rectangles for screens/pages
// - Use arrows for transitions
// - Use diamonds for decision points
// - Label all flows
// - Keep layout logical

// System prompt for Data Model includes:
// - Use rectangles for entities
// - Use text for field names
// - Use arrows for relationships
// - Include cardinality (1:1, 1:N)
// - Follow ER diagram conventions
```

### Chunked Diagram Generation

For complex types, generation happens in multiple steps:

```typescript
const CHUNKED_DIAGRAM_TYPES = new Set([
  'information-architecture',
  'user-flow',
  'system-architecture',
  'data-model',
  'wireframe',
]);

// Progress toast shows: "Generating diagram… (section 1 of 3)"
// Canvas updates live with each chunk
// Final result merges all chunks
```

---

## 10. Canvas Feature Integration

### Using Canvas in PRDEditorWithCanvas

Three view modes:

```typescript
type ViewMode = 'document' | 'canvas' | 'split';

// Document Only - Canvas collapsed by default
<PRDCanvas defaultCollapsed={true} />

// Canvas Only - Canvas always visible
<PRDCanvas defaultCollapsed={false} />

// Split View - Side-by-side editing and diagramming
<div className="grid grid-cols-2">
  <NoteEditor />
  <PRDCanvas />
</div>
```

### Canvas Generation from Inline Embeds

Extracts existing canvas elements from embedded Excalidraw in the document:

```typescript
const getInlineCanvasElements = useCallback((): any[] => {
  const parsed = JSON.parse(content);
  const elements: any[] = [];

  const extractCanvasData = (node: any) => {
    if (node.type === 'excalidraw' && node.attrs?.data?.elements) {
      elements.push(...node.attrs.data.elements);
    }
    if (node.content) {
      node.content.forEach(extractCanvasData);
    }
  };

  extractCanvasData(parsed);
  return elements;
}, [content]);
```

This allows the AI to see all existing diagrams when generating new ones.

---

## Key Insights

1. **Element Normalization is Critical**: AI-generated elements lack many required Excalidraw fields. Normalization fixes this.

2. **Text Binding**: Shapes with text require separate bound text elements in Excalidraw.

3. **Context Enrichment**: Canvas generator receives:
   - Plain text PRD with heading structure
   - Product description
   - Existing elements (for awareness)
   - Diagram type (for specialized prompts)

4. **State Management via Refs**: Uses refs to avoid dependency loops and unnecessary re-renders.

5. **Chunked Generation**: Large diagrams generate progressively with live canvas updates.

6. **Pending Elements Pattern**: Handles generation while canvas is collapsed by storing pending and applying when mounted.

7. **Dual Generation Paths**:
   - **Diagram Generation**: Quick, specialized AI calls for specific diagram types
   - **PRD Chat**: Conversational refinement of entire documents with full template context

8. **Persistence Strategy**: 
   - Canvas data saved to database
   - Chat sessions saved to Supabase
   - Always filters `isDeleted` elements before persisting

---

## Related Files Reference

- **Canvas Types**: `src/types/canvas.ts`
- **Canvas Prompts**: `src/lib/ai/prompts/canvas-prompts.ts`
- **Canvas Generator**: `src/lib/ai/services/canvas-generator.ts`
- **Excalidraw Integration**: `src/lib/excalidraw/`
- **AI Settings Store**: `src/lib/stores/ai-settings-store.ts`
- **PRD Chat Store**: `src/lib/stores/prd-chat-store.ts`
- **Custom Templates Store**: `src/lib/stores/custom-templates-store.ts`

