/**
 * Canvas Generator Service — Two-Phase Architecture
 *
 * Phase 1: AI extracts structured graph data (nodes + edges) from PRD content.
 * Phase 2: Deterministic layout engine converts graph data to Excalidraw elements.
 *
 * After generation, a completeness validator checks the diagram against the PRD.
 * If incomplete, the generator retries (up to MAX_RETRIES total attempts) with a
 * targeted fix prompt. The best result across all attempts is returned.
 */

import type { AIGenerateRequest } from '@/types';
import type { CanvasGenerationType, GeneratedCanvasContent } from '@/components/canvas/prd-canvas';
import { generateAIContent } from '../use-ai-service';
import {
  CANVAS_SYSTEM_PROMPT,
  CANVAS_GENERATION_PROMPTS,
  extractPRDContextForCanvas,
  parseGraphResponse,
} from '../prompts/canvas-prompts';
import { layoutDiagram } from './diagram-layout-engine';
import type { AIProviderType } from '@/lib/stores/ai-settings-store';
import {
  validateCanvasDiagram,
  scoreGraphData,
  pickBestCanvasResult,
} from './diagram-validator';

// ============================================================================
// TYPES
// ============================================================================

// Max total attempts (1 initial + up to 2 retries)
const MAX_ATTEMPTS = 3;

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
  /**
   * Optional callback invoked after each chunk completes during chunked generation.
   * Kept for backward compatibility — no longer used since chunking is removed.
   */
  onChunkReady?: (chunkElements: any[], chunkIndex: number, totalChunks: number) => void;
  /**
   * Optional callback invoked when a retry is triggered due to incomplete diagram.
   * Useful for surfacing retry status in the UI.
   */
  onRetry?: (attempt: number, maxAttempts: number, issues: string[]) => void;
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
   * Generate a canvas diagram from PRD content.
   *
   * Two-phase approach with completeness validation and auto-retry:
   * 1. AI extracts structured graph data (nodes + edges) — single request
   * 2. Layout engine converts to Excalidraw elements with proper positions and bindings
   * 3. Completeness validator checks against PRD & diagram spec
   * 4. If incomplete, retry with a targeted fix prompt (up to MAX_ATTEMPTS total)
   * 5. Best result across all attempts is returned
   */
  async generateDiagram(options: CanvasGenerationOptions): Promise<CanvasGenerationResult> {
    const {
      type,
      prdContent,
      productDescription,
      provider,
      existingElements = [],
      onRetry,
    } = options;

    const context = extractPRDContextForCanvas(prdContent, productDescription, type);
    const typePrompt = CANVAS_GENERATION_PROMPTS[type];
    const metadata = DIAGRAM_METADATA[type];

    // Track all attempts so we can return the best one even if never fully complete
    const attempts: Array<{ graphData: ReturnType<typeof parseGraphResponse>; score: number }> = [];
    let totalTokens = 0;
    let lastError: string | undefined;

    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        console.log(`[CanvasGenerator] Attempt ${attempt}/${MAX_ATTEMPTS} for "${type}" diagram`);

        // Build prompt — on retries, prepend the fix hint from the previous validation
        const uniqueSeed = `[Generation ID: ${Date.now()}-${Math.random().toString(36).slice(2, 8)}]`;
        let userPrompt: string;

        if (attempt === 1) {
          userPrompt = `${uniqueSeed}\n\n${context}\n\n${typePrompt}`;
        } else {
          // Use the fix hint from the most recent failed attempt
          const lastAttempt = attempts[attempts.length - 1];
          const lastGraphData = lastAttempt?.graphData;
          const validation = lastGraphData
            ? validateCanvasDiagram(lastGraphData, prdContent, type)
            : null;
          const fixHint = validation?.fixHint || '## The previous diagram was incomplete. Generate a more comprehensive version.';

          userPrompt = `${uniqueSeed}\n\n${fixHint}\n\n${context}\n\n${typePrompt}`;
        }

        const request: AIGenerateRequest = {
          type: 'generate-canvas',
          prompt: userPrompt,
          provider,
        };

        const response = await generateAIContent(request, provider);
        if (response.tokens) totalTokens += response.tokens;

        console.log(`[CanvasGenerator] Attempt ${attempt} response length: ${response.content?.length || 0}`);

        // Parse graph data
        const graphData = parseGraphResponse(response.content);

        if (!graphData || graphData.nodes.length === 0) {
          console.warn(`[CanvasGenerator] Attempt ${attempt}: failed to parse graph data`);
          lastError = 'Failed to extract diagram data from AI response.';
          attempts.push({ graphData: null, score: 0 });
          continue;
        }

        console.log(`[CanvasGenerator] Attempt ${attempt}: ${graphData.nodes.length} nodes, ${graphData.edges.length} edges`);

        // Score this attempt
        const score = scoreGraphData(graphData, type);
        attempts.push({ graphData, score });

        // Validate completeness
        const validation = validateCanvasDiagram(graphData, prdContent, type);
        console.log(`[CanvasGenerator] Attempt ${attempt} complete: ${validation.complete}, issues: ${validation.issues.length}`);

        if (validation.complete) {
          // Perfect — use this result immediately
          console.log(`[CanvasGenerator] Diagram complete on attempt ${attempt}`);
          const offset = this.calculateElementOffset(existingElements);
          const elements = layoutDiagram(graphData, type, offset.x, offset.y);

          return {
            success: true,
            content: {
              type,
              elements,
              title: metadata.title,
              description: metadata.description,
            },
            tokensUsed: totalTokens,
          };
        }

        // Incomplete — notify caller and retry if attempts remain
        if (attempt < MAX_ATTEMPTS) {
          console.log(`[CanvasGenerator] Incomplete on attempt ${attempt}, retrying…`);
          onRetry?.(attempt, MAX_ATTEMPTS, validation.issues);
        }

      } catch (error) {
        console.error(`[CanvasGenerator] Attempt ${attempt} error:`, error);
        lastError = error instanceof Error ? error.message : 'Unknown error occurred';
        attempts.push({ graphData: null, score: 0 });
      }
    }

    // All attempts exhausted — return the best result found, even if incomplete
    const bestGraphData = pickBestCanvasResult(attempts);

    if (!bestGraphData) {
      return {
        success: false,
        content: null,
        error: lastError || 'Failed to generate diagram after multiple attempts. Please try again.',
      };
    }

    console.log(`[CanvasGenerator] Using best result with ${bestGraphData.nodes.length} nodes after ${MAX_ATTEMPTS} attempts`);

    const offset = this.calculateElementOffset(existingElements);
    const elements = layoutDiagram(bestGraphData, type, offset.x, offset.y);

    if (elements.length === 0) {
      return {
        success: false,
        content: null,
        error: 'Layout engine produced no elements. Please try again.',
      };
    }

    return {
      success: true,
      content: {
        type,
        elements,
        title: metadata.title,
        description: metadata.description,
      },
      tokensUsed: totalTokens,
    };
  }

  /**
   * Calculate offset for positioning new elements away from existing ones.
   */
  private calculateElementOffset(existingElements: any[]): { x: number; y: number } {
    if (!existingElements || existingElements.length === 0) {
      return { x: 0, y: 0 };
    }

    let maxY = 0;
    for (const el of existingElements) {
      if (el.isDeleted) continue;
      const elBottom = (el.y || 0) + (el.height || 60);
      if (elBottom > maxY) maxY = elBottom;
    }

    return { x: 0, y: maxY + 100 };
  }

  /**
   * Generate multiple diagram types at once (semi-parallel batch generation).
   *
   * All diagram types are fired concurrently via Promise.allSettled so they
   * run in parallel rather than sequentially. Each individual diagram still
   * uses the retry loop internally. Results are stacked vertically by yOffset.
   */
  async generateBatch(
    types: CanvasGenerationType[],
    prdContent: string,
    productDescription: string,
    provider?: AIProviderType,
    onRetry?: (type: CanvasGenerationType, attempt: number, maxAttempts: number, issues: string[]) => void
  ): Promise<Map<CanvasGenerationType, CanvasGenerationResult>> {
    const results = new Map<CanvasGenerationType, CanvasGenerationResult>();

    console.log(`[CanvasGenerator] Starting parallel batch for ${types.length} diagram type(s)`);

    // Fire all diagram generations in parallel
    const settled = await Promise.allSettled(
      types.map(type =>
        this.generateDiagram({
          type,
          prdContent,
          productDescription,
          provider,
          existingElements: [],
          onRetry: onRetry
            ? (attempt, maxAttempts, issues) => onRetry(type, attempt, maxAttempts, issues)
            : undefined,
        })
      )
    );

    // Stack results vertically — each diagram positioned below the previous
    let yOffset = 0;
    for (let i = 0; i < types.length; i++) {
      const type = types[i];
      const outcome = settled[i];

      if (outcome.status === 'fulfilled') {
        const result = outcome.value;
        if (result.success && result.content) {
          result.content.elements = result.content.elements.map((el: any) => ({
            ...el,
            y: (el.y || 0) + yOffset,
          }));
          yOffset += 700;
        }
        results.set(type, result);
      } else {
        // Promise rejected — treat as failure
        console.error(`[CanvasGenerator] Batch: "${type}" rejected:`, outcome.reason);
        results.set(type, {
          success: false,
          content: null,
          error: outcome.reason instanceof Error ? outcome.reason.message : 'Unknown error',
        });
      }
    }

    return results;
  }

  /**
   * Generate a quick overview diagram from PRD summary.
   */
  async generateQuickOverview(
    productDescription: string,
    provider?: AIProviderType
  ): Promise<CanvasGenerationResult> {
    return this.generateDiagram({
      type: 'information-architecture',
      prdContent: productDescription,
      productDescription,
      provider,
    });
  }
}

// Export singleton
export const canvasGenerator = new CanvasGeneratorService();
