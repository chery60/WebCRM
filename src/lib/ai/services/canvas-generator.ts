/**
 * Canvas Generator Service
 * 
 * Generates Excalidraw diagrams from PRD content using AI.
 * Optimized for minimal token usage while producing high-quality diagrams.
 */

import type { AIGenerateRequest } from '@/types';
import type { CanvasGenerationType, GeneratedCanvasContent } from '@/components/canvas/prd-canvas';
import { generateAIContent } from '../use-ai-service';
import {
  CANVAS_SYSTEM_PROMPT,
  CANVAS_GENERATION_PROMPTS,
  extractPRDContextForCanvas,
  parseCanvasResponse,
} from '../prompts/canvas-prompts';
import type { AIProviderType } from '@/lib/stores/ai-settings-store';

// ============================================================================
// TYPES
// ============================================================================

export interface CanvasGenerationOptions {
  /** Type of diagram to generate */
  type: CanvasGenerationType;
  /** PRD content for context */
  prdContent: string;
  /** Product description */
  productDescription: string;
  /** AI provider to use */
  provider?: AIProviderType;
  /** Existing canvas elements to consider (for additive generation) */
  existingElements?: any[];
}

export interface CanvasGenerationResult {
  success: boolean;
  content: GeneratedCanvasContent | null;
  error?: string;
  tokensUsed?: number;
}

// Diagram type metadata
const DIAGRAM_METADATA: Record<CanvasGenerationType, { title: string; description: string }> = {
  'information-architecture': {
    title: 'Information Architecture',
    description: 'Sitemap and content hierarchy visualization',
  },
  'user-flow': {
    title: 'User Flow',
    description: 'User journey and interaction flow diagram',
  },
  'edge-cases': {
    title: 'Edge Cases & Error States',
    description: 'Visual mapping of edge cases and error handling',
  },
  'competitive-analysis': {
    title: 'Competitive Analysis',
    description: 'Feature comparison matrix with competitors',
  },
  'data-model': {
    title: 'Data Model (ERD)',
    description: 'Entity relationship diagram for data structure',
  },
  'system-architecture': {
    title: 'System Architecture',
    description: 'Technical architecture and component diagram',
  },
  'journey-map': {
    title: 'User Journey Map',
    description: 'Timeline-based user experience visualization',
  },
  'wireframe': {
    title: 'Wireframe',
    description: 'Screen layout and UI structure diagram',
  },
  'feature-priority': {
    title: 'Feature Priority Matrix',
    description: 'Impact vs effort prioritization quadrant',
  },
  'stakeholder-map': {
    title: 'Stakeholder Map',
    description: 'Stakeholder relationships and influence diagram',
  },
  'risk-matrix': {
    title: 'Risk Matrix',
    description: 'Risk assessment and mitigation visualization',
  },
  'sprint-planning': {
    title: 'Sprint Planning',
    description: 'Sprint board and task allocation diagram',
  },
  'api-design': {
    title: 'API Design',
    description: 'API endpoint and data flow visualization',
  },
  'release-timeline': {
    title: 'Release Timeline',
    description: 'Product roadmap and milestone visualization',
  },
  'persona': {
    title: 'User Persona',
    description: 'User persona profile visualization',
  },
};

// ============================================================================
// CANVAS GENERATOR SERVICE
// ============================================================================

export class CanvasGeneratorService {
  /**
   * Generate a canvas diagram from PRD content
   */
  async generateDiagram(options: CanvasGenerationOptions): Promise<CanvasGenerationResult> {
    const {
      type,
      prdContent,
      productDescription,
      provider,
      existingElements = [],
    } = options;

    try {
      // Extract minimal context for token efficiency
      const context = extractPRDContextForCanvas(prdContent, productDescription, type);

      // Build the prompt
      const typePrompt = CANVAS_GENERATION_PROMPTS[type];

      // Calculate offset if adding to existing elements
      const offset = this.calculateElementOffset(existingElements);
      const hasExistingContent = existingElements.length > 0 && (offset.x > 0 || offset.y > 0);

      let userPrompt = `${context}\n\n${typePrompt}`;

      // Note: We don't ask AI to offset - we apply offset after parsing
      // This produces more reliable results as AI sometimes ignores positioning instructions
      if (hasExistingContent) {
        // Add context about existing elements to help AI understand what's already drawn
        const existingSummary = this.summarizeExistingElements(existingElements);
        if (existingSummary) {
          userPrompt += `\n\nNote: Canvas already contains: ${existingSummary}. Generate complementary content.`;
        }
      }

      const request: AIGenerateRequest = {
        type: 'generate-canvas', // Use dedicated canvas generation type
        prompt: userPrompt,
        // Don't pass CANVAS_SYSTEM_PROMPT in context - providers handle system prompts via getSystemPrompt()
        provider,
      };

      console.log('CanvasGenerator: Making AI request for type:', type);
      console.log('CanvasGenerator: Request object:', JSON.stringify(request, null, 2).substring(0, 500));
      
      const response = await generateAIContent(request, provider);

      console.log('CanvasGenerator: Response received:', response);
      console.log('CanvasGenerator: Response content type:', typeof response.content);
      console.log('CanvasGenerator: Response content length:', response.content?.length || 0);
      console.log('CanvasGenerator: Response first 500 chars:', response.content?.substring(0, 500));

      // Parse the response into Excalidraw elements
      let elements = parseCanvasResponse(response.content);

      if (elements.length === 0) {
        return {
          success: false,
          content: null,
          error: 'Failed to generate diagram elements. Please try again.',
        };
      }

      // Apply offset to position new elements away from existing ones
      if (hasExistingContent) {
        elements = this.applyOffsetToElements(elements, offset);
        console.log(`CanvasGenerator: Applied offset (${offset.x}, ${offset.y}) to ${elements.length} elements`);
      }

      const metadata = DIAGRAM_METADATA[type];

      return {
        success: true,
        content: {
          type,
          elements,
          title: metadata.title,
          description: metadata.description,
        },
        tokensUsed: response.tokens,
      };
    } catch (error) {
      console.error('Canvas generation failed:', error);
      return {
        success: false,
        content: null,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  }

  /**
   * Summarize existing canvas elements for AI context.
   */
  private summarizeExistingElements(elements: any[]): string {
    if (!elements || elements.length === 0) return '';

    const validElements = elements.filter(el => !el.isDeleted);
    if (validElements.length === 0) return '';

    const typeCounts: Record<string, number> = {};
    const textLabels: string[] = [];

    for (const el of validElements) {
      const type = el.type || 'shape';
      typeCounts[type] = (typeCounts[type] || 0) + 1;

      // Collect text labels
      if (el.text && typeof el.text === 'string' && el.text.trim()) {
        const label = el.text.trim().substring(0, 25);
        if (!textLabels.includes(label)) {
          textLabels.push(label);
        }
      }
    }

    const parts: string[] = [];

    // Count summary
    const typeDesc = Object.entries(typeCounts)
      .map(([t, c]) => `${c} ${t}${c > 1 ? 's' : ''}`)
      .join(', ');
    if (typeDesc) parts.push(typeDesc);

    // Sample labels
    if (textLabels.length > 0) {
      const sampleLabels = textLabels.slice(0, 4).join(', ');
      parts.push(`labeled "${sampleLabels}${textLabels.length > 4 ? '...' : ''}"`);
    }

    return parts.join(' ');
  }

  /**
   * Generate multiple diagram types at once (batch generation)
   * Optimized to reduce overall token usage by sharing context
   */
  async generateBatch(
    types: CanvasGenerationType[],
    prdContent: string,
    productDescription: string,
    provider?: AIProviderType
  ): Promise<Map<CanvasGenerationType, CanvasGenerationResult>> {
    const results = new Map<CanvasGenerationType, CanvasGenerationResult>();

    // Generate in sequence to avoid rate limiting and manage token usage
    let yOffset = 0;

    for (const type of types) {
      const result = await this.generateDiagram({
        type,
        prdContent,
        productDescription,
        provider,
        existingElements: [], // Start fresh for batch
      });

      // Offset elements vertically for batch generation
      if (result.success && result.content) {
        result.content.elements = result.content.elements.map((el: any) => ({
          ...el,
          y: (el.y || 0) + yOffset,
        }));
        yOffset += 500; // Space between diagrams
      }

      results.set(type, result);
    }

    return results;
  }

  /**
   * Generate a quick overview diagram from PRD summary
   * Uses minimal tokens for fast generation
   */
  async generateQuickOverview(
    productDescription: string,
    provider?: AIProviderType
  ): Promise<CanvasGenerationResult> {
    const quickPrompt = `Create a simple product overview diagram as JSON array.

Product: ${productDescription.slice(0, 300)}

Generate 6-8 elements showing:
- Product name (center, large rectangle)
- 3-4 key features (surrounding rectangles)
- Arrows connecting features to product

Keep it simple and visual.`;

    const request: AIGenerateRequest = {
      type: 'generate-canvas',
      prompt: quickPrompt,
      // Don't pass CANVAS_SYSTEM_PROMPT in context - providers handle system prompts via getSystemPrompt()
      provider,
    };

    try {
      const response = await generateAIContent(request, provider);
      const elements = parseCanvasResponse(response.content);

      return {
        success: elements.length > 0,
        content: elements.length > 0 ? {
          type: 'information-architecture',
          elements,
          title: 'Product Overview',
          description: 'Quick visual overview of the product',
        } : null,
        tokensUsed: response.tokens,
      };
    } catch (error) {
      return {
        success: false,
        content: null,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Calculate offset to avoid overlapping with existing elements.
   * Returns the best position for new content based on existing layout.
   */
  private calculateElementOffset(elements: any[]): { x: number; y: number } {
    if (!elements || elements.length === 0) {
      return { x: 0, y: 0 };
    }

    // Filter out deleted elements and elements without position
    const validElements = elements.filter(el => 
      !el.isDeleted && 
      typeof el.x === 'number' && 
      typeof el.y === 'number'
    );

    if (validElements.length === 0) {
      return { x: 0, y: 0 };
    }

    let maxX = 0;
    let maxY = 0;
    let minX = Infinity;
    let minY = Infinity;

    for (const el of validElements) {
      const elX = el.x || 0;
      const elY = el.y || 0;
      const elWidth = el.width || 100;
      const elHeight = el.height || 60;
      
      const elRight = elX + elWidth;
      const elBottom = elY + elHeight;
      
      minX = Math.min(minX, elX);
      minY = Math.min(minY, elY);
      maxX = Math.max(maxX, elRight);
      maxY = Math.max(maxY, elBottom);
    }

    // Calculate the dimensions of existing content
    const existingWidth = maxX - minX;
    const existingHeight = maxY - minY;

    // Determine best placement strategy:
    // - If content is wider than tall, place new content below
    // - If content is taller than wide, place new content to the right
    // - Default to placing below with generous vertical spacing
    
    const VERTICAL_GAP = 150;   // Gap when placing below
    const HORIZONTAL_GAP = 200; // Gap when placing to the right

    if (existingWidth > existingHeight * 1.5) {
      // Wide content - place below, aligned to left edge
      return { 
        x: Math.max(0, minX), 
        y: maxY + VERTICAL_GAP 
      };
    } else if (existingHeight > existingWidth * 1.5) {
      // Tall content - place to the right, aligned to top
      return { 
        x: maxX + HORIZONTAL_GAP, 
        y: Math.max(0, minY) 
      };
    } else {
      // Square-ish content - default to placing below
      return { 
        x: Math.max(0, minX), 
        y: maxY + VERTICAL_GAP 
      };
    }
  }

  /**
   * Apply offset to generated elements to position them correctly.
   */
  applyOffsetToElements(elements: any[], offset: { x: number; y: number }): any[] {
    if (offset.x === 0 && offset.y === 0) {
      return elements;
    }

    return elements.map(el => ({
      ...el,
      x: (el.x || 0) + offset.x,
      y: (el.y || 0) + offset.y,
      // Also update points for arrows
      ...(el.type === 'arrow' && el.points ? {
        // Arrow points are relative to x,y, so they don't need offset
      } : {}),
    }));
  }
}

// Export singleton instance
export const canvasGenerator = new CanvasGeneratorService();

export default canvasGenerator;
