/**
 * Canvas Generation Hook
 * 
 * Custom hook for managing canvas AI generation state and operations.
 * Provides a clean interface for components to interact with the canvas generator.
 */

import { useState, useCallback, useRef } from 'react';
import { canvasGenerator } from '@/lib/ai/services/canvas-generator';
import type { CanvasGenerationType, GeneratedCanvasContent } from '@/components/canvas/prd-canvas';
import type { AIProviderType } from '@/lib/stores/ai-settings-store';
import { useAISettingsStore } from '@/lib/stores/ai-settings-store';
import { CHUNKED_DIAGRAM_TYPES } from '@/lib/ai/prompts/canvas-prompts';
import { toast } from 'sonner';

export interface UseCanvasGenerationOptions {
  /** PRD content for context */
  prdContent?: string;
  /** Product description */
  productDescription?: string;
  /** Override AI provider */
  provider?: AIProviderType;
  /**
   * Called after each chunk is ready during chunked generation.
   * Use this to progressively add elements to the canvas without waiting for the full diagram.
   */
  onChunkReady?: (chunkElements: any[], chunkIndex: number, totalChunks: number) => void;
}

export interface UseCanvasGenerationReturn {
  /** Whether generation is in progress */
  isGenerating: boolean;
  /** Current generation type being processed */
  generatingType: CanvasGenerationType | null;
  /** Generate a specific diagram type - optionally pass existing elements for positioning */
  generateDiagram: (type: CanvasGenerationType, existingElements?: any[]) => Promise<GeneratedCanvasContent | null>;
  /** Generate multiple diagram types */
  generateBatch: (types: CanvasGenerationType[]) => Promise<Map<CanvasGenerationType, GeneratedCanvasContent | null>>;
  /** Generate a quick product overview */
  generateOverview: () => Promise<GeneratedCanvasContent | null>;
  /** Total tokens used in this session */
  tokensUsed: number;
  /** Last error message */
  error: string | null;
  /** Clear error */
  clearError: () => void;
}

export function useCanvasGeneration(options: UseCanvasGenerationOptions = {}): UseCanvasGenerationReturn {
  const { prdContent = '', productDescription = '', onChunkReady } = options;
  const { activeProvider: storeProvider } = useAISettingsStore();
  const provider = options.provider || storeProvider || undefined;

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState<CanvasGenerationType | null>(null);
  const [tokensUsed, setTokensUsed] = useState(0);
  const [error, setError] = useState<string | null>(null);

  // Keep a stable ref to onChunkReady so it can be used inside callbacks without stale closure issues
  const onChunkReadyRef = useRef(onChunkReady);
  onChunkReadyRef.current = onChunkReady;

  const generateDiagram = useCallback(
    async (type: CanvasGenerationType, existingElements: any[] = []): Promise<GeneratedCanvasContent | null> => {
      if (!prdContent && !productDescription) {
        setError('Please provide PRD content or product description');
        toast.error('No content to generate from');
        return null;
      }

      setIsGenerating(true);
      setGeneratingType(type);
      setError(null);

      // Show a persistent progress toast that we'll update during retries
      const progressToastId = toast.loading('Generating diagram…', { duration: Infinity });

      try {
        const result = await canvasGenerator.generateDiagram({
          type,
          prdContent,
          productDescription,
          provider,
          existingElements,
          onChunkReady: (chunkElements, chunkIndex, totalChunks) => {
            // Propagate chunk to parent (enables live canvas updates)
            onChunkReadyRef.current?.(chunkElements, chunkIndex, totalChunks);
          },
          onRetry: (attempt, maxAttempts, issues) => {
            // Update toast to show retry progress with a summary of why
            const issueCount = issues.length;
            toast.loading(
              `Diagram incomplete — improving… (attempt ${attempt + 1} of ${maxAttempts}, fixing ${issueCount} issue${issueCount !== 1 ? 's' : ''})`,
              { id: progressToastId, duration: Infinity }
            );
          },
        });

        // Dismiss progress toast
        toast.dismiss(progressToastId);

        if (result.tokensUsed) {
          setTokensUsed((prev) => prev + result.tokensUsed!);
        }

        if (!result.success || !result.content) {
          setError(result.error || 'Generation failed');
          toast.error(result.error || 'Failed to generate diagram');
          return null;
        }

        toast.success(`${result.content.title} generated successfully`);
        return result.content;
      } catch (err) {
        toast.dismiss(progressToastId);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        toast.error(`Generation failed: ${errorMessage}`);
        return null;
      } finally {
        setIsGenerating(false);
        setGeneratingType(null);
      }
    },
    [prdContent, productDescription, provider]
  );

  const generateBatch = useCallback(
    async (types: CanvasGenerationType[]): Promise<Map<CanvasGenerationType, GeneratedCanvasContent | null>> => {
      if (!prdContent && !productDescription) {
        setError('Please provide PRD content or product description');
        toast.error('No content to generate from');
        return new Map();
      }

      setIsGenerating(true);
      setError(null);

      const results = new Map<CanvasGenerationType, GeneratedCanvasContent | null>();

      // Show a persistent progress toast for the whole batch
      const batchToastId = toast.loading(
        `Generating ${types.length} diagram${types.length !== 1 ? 's' : ''} in parallel…`,
        { duration: Infinity }
      );

      try {
        const batchResults = await canvasGenerator.generateBatch(
          types,
          prdContent,
          productDescription,
          provider,
          (type, attempt, maxAttempts, issues) => {
            toast.loading(
              `Improving ${type} diagram… (attempt ${attempt + 1}/${maxAttempts}, fixing ${issues.length} issue${issues.length !== 1 ? 's' : ''})`,
              { id: batchToastId, duration: Infinity }
            );
          }
        );

        let totalTokens = 0;
        let successCount = 0;

        for (const [type, result] of batchResults) {
          if (result.tokensUsed) {
            totalTokens += result.tokensUsed;
          }
          if (result.success && result.content) {
            results.set(type, result.content);
            successCount++;
          } else {
            results.set(type, null);
          }
        }

        setTokensUsed((prev) => prev + totalTokens);

        toast.dismiss(batchToastId);

        if (successCount > 0) {
          toast.success(`Generated ${successCount} of ${types.length} diagram${types.length !== 1 ? 's' : ''}`);
        } else {
          toast.error('Failed to generate diagrams');
        }

        return results;
      } catch (err) {
        toast.dismiss(batchToastId);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(errorMessage);
        toast.error(`Batch generation failed: ${errorMessage}`);
        return results;
      } finally {
        setIsGenerating(false);
        setGeneratingType(null);
      }
    },
    [prdContent, productDescription, provider]
  );

  const generateOverview = useCallback(async (): Promise<GeneratedCanvasContent | null> => {
    if (!productDescription) {
      setError('Please provide a product description');
      toast.error('No product description provided');
      return null;
    }

    setIsGenerating(true);
    setGeneratingType('information-architecture');
    setError(null);

    try {
      const result = await canvasGenerator.generateQuickOverview(productDescription, provider);

      if (result.tokensUsed) {
        setTokensUsed((prev) => prev + result.tokensUsed!);
      }

      if (!result.success || !result.content) {
        setError(result.error || 'Generation failed');
        toast.error(result.error || 'Failed to generate overview');
        return null;
      }

      toast.success('Product overview generated');
      return result.content;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      toast.error(`Generation failed: ${errorMessage}`);
      return null;
    } finally {
      setIsGenerating(false);
      setGeneratingType(null);
    }
  }, [productDescription, provider]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  return {
    isGenerating,
    generatingType,
    generateDiagram,
    generateBatch,
    generateOverview,
    tokensUsed,
    error,
    clearError,
  };
}

export default useCanvasGeneration;
