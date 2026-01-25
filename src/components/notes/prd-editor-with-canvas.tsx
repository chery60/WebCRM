'use client';

import { useState, useCallback, useRef, useEffect } from 'react';
import { NoteEditor } from './note-editor';
import { PRDCanvas, type PRDCanvasRef, type CanvasGenerationType, type CanvasData } from '@/components/canvas/prd-canvas';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { FileText, Layers } from 'lucide-react';
import type { GeneratedFeature, GeneratedTask } from '@/types';
import { canvasGenerator } from '@/lib/ai/services/canvas-generator';
import { useAISettingsStore } from '@/lib/stores/ai-settings-store';
import { toast } from 'sonner';
import type { GeneratedCanvasContent } from '@/components/canvas/excalidraw-embed';

// ============================================================================
// TYPES
// ============================================================================

interface PRDEditorWithCanvasProps {
  /** Note content (JSON string) */
  content: string;
  /** Callback when content changes */
  onChange: (content: string) => void;
  /** Product description for AI context */
  productDescription?: string;
  /** Canvas data (Excalidraw elements) */
  canvasData?: CanvasData;
  /** Callback when canvas changes */
  onCanvasChange?: (data: CanvasData) => void;
  /** Placeholder text */
  placeholder?: string;
  /** Auto focus on mount */
  autoFocus?: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Previously saved features */
  savedFeatures?: GeneratedFeature[];
  /** Callback when features are generated */
  onFeaturesGenerated?: (features: GeneratedFeature[]) => void;
  /** Callback when tasks are generated */
  onTasksGenerated?: (tasks: GeneratedTask[]) => void;
  /** Show canvas by default */
  showCanvasDefault?: boolean;
  /** Enable split view mode */
  enableSplitView?: boolean;
}

type ViewMode = 'document' | 'canvas' | 'split';

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function PRDEditorWithCanvas({
  content,
  onChange,
  productDescription = '',
  canvasData,
  onCanvasChange,
  placeholder,
  autoFocus,
  className,
  savedFeatures,
  onFeaturesGenerated,
  onTasksGenerated,
  showCanvasDefault = true,
  enableSplitView = true,
}: PRDEditorWithCanvasProps) {
  const [viewMode, setViewMode] = useState<ViewMode>('document');
  const canvasRef = useRef<PRDCanvasRef>(null);
  const { activeProvider } = useAISettingsStore();
  
  // Canvas generation state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatingType, setGeneratingType] = useState<CanvasGenerationType | null>(null);
  const [tokensUsed, setTokensUsed] = useState(0);
  
  // Extract plain text from content for AI context
  const [prdPlainText, setPrdPlainText] = useState('');
  
  useEffect(() => {
    try {
      if (content) {
        const parsed = JSON.parse(content);
        // Extract text from TipTap JSON including inline canvas data
        const extractText = (node: any): string => {
          if (typeof node === 'string') return node;
          if (node.text) return node.text;
          if (node.content) {
            return node.content.map(extractText).join(' ');
          }
          return '';
        };
        setPrdPlainText(extractText(parsed));
      }
    } catch {
      setPrdPlainText('');
    }
  }, [content]);

  // Extract inline canvas elements from content for context
  const getInlineCanvasElements = useCallback((): any[] => {
    try {
      if (!content) return [];
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
    } catch {
      return [];
    }
  }, [content]);

  // Handle canvas generation for the bottom PRD canvas
  // Now receives existingElements from PRDCanvas for proper positioning
  const handleGenerateContent = useCallback(
    async (type: CanvasGenerationType, existingElements: any[] = []): Promise<GeneratedCanvasContent | null> => {
      if (!prdPlainText.trim()) {
        toast.error('Please add some PRD content before generating diagrams');
        return null;
      }

      setIsGenerating(true);
      setGeneratingType(type);

      try {
        // Get existing elements from both inline canvases and the passed elements
        const inlineElements = getInlineCanvasElements();
        // Use passed existingElements (from canvas) if available, otherwise fall back to canvasData
        const bottomCanvasElements = existingElements.length > 0 ? existingElements : (canvasData?.elements || []);
        const allExistingElements = [...inlineElements, ...bottomCanvasElements];

        // Build enhanced context
        let enhancedPrdContent = prdPlainText;
        
        if (allExistingElements.length > 0) {
          const existingContext = summarizeElements(allExistingElements);
          if (existingContext) {
            enhancedPrdContent = `${prdPlainText}\n\n[Existing diagrams: ${existingContext}]`;
          }
        }

        const result = await canvasGenerator.generateDiagram({
          type,
          prdContent: enhancedPrdContent,
          productDescription: productDescription || prdPlainText.substring(0, 500),
          provider: activeProvider || undefined,
          existingElements: bottomCanvasElements, // Pass actual canvas elements for offset calculation
        });

        if (result.tokensUsed) {
          setTokensUsed(prev => prev + result.tokensUsed!);
        }

        if (!result.success || !result.content) {
          toast.error(result.error || 'Failed to generate diagram');
          return null;
        }

        toast.success(`${result.content.title} generated successfully`);
        return result.content;
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        toast.error(`Generation failed: ${errorMessage}`);
        return null;
      } finally {
        setIsGenerating(false);
        setGeneratingType(null);
      }
    },
    [prdPlainText, productDescription, activeProvider, canvasData, getInlineCanvasElements]
  );

  // Handle canvas data changes
  const handleCanvasChange = useCallback(
    (data: CanvasData) => {
      onCanvasChange?.(data);
    },
    [onCanvasChange]
  );

  // Helper to summarize elements for context
  function summarizeElements(elements: any[]): string {
    if (!elements || elements.length === 0) return '';

    const validElements = elements.filter(el => !el.isDeleted);
    if (validElements.length === 0) return '';

    const typeCounts: Record<string, number> = {};
    const labels: string[] = [];

    for (const el of validElements) {
      const type = el.type || 'shape';
      typeCounts[type] = (typeCounts[type] || 0) + 1;
      if (el.text && typeof el.text === 'string' && el.text.trim()) {
        const label = el.text.trim().substring(0, 20);
        if (!labels.includes(label) && labels.length < 6) {
          labels.push(label);
        }
      }
    }

    const parts: string[] = [];
    const typeDesc = Object.entries(typeCounts)
      .map(([t, c]) => `${c} ${t}${c > 1 ? 's' : ''}`)
      .join(', ');
    if (typeDesc) parts.push(typeDesc);
    if (labels.length > 0) parts.push(`including: ${labels.join(', ')}`);

    return parts.join(' ');
  }

  return (
    <div className={className}>
      {/* View Mode Tabs */}
      {showCanvasDefault && (
        <div className="mb-4">
          <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as ViewMode)}>
            <div className="flex items-center justify-between">
              <TabsList>
                <TabsTrigger value="document" className="gap-2">
                  <FileText className="h-4 w-4" />
                  Document
                </TabsTrigger>
                <TabsTrigger value="canvas" className="gap-2">
                  <Layers className="h-4 w-4" />
                  Canvas
                </TabsTrigger>
                {enableSplitView && (
                  <TabsTrigger value="split" className="gap-2">
                    Split View
                  </TabsTrigger>
                )}
              </TabsList>
              
              {tokensUsed > 0 && (
                <Badge variant="outline" className="text-xs">
                  ~{tokensUsed} tokens used
                </Badge>
              )}
            </div>

            {/* Document Only View */}
            <TabsContent value="document" className="mt-4">
              <NoteEditor
                content={content}
                onChange={onChange}
                placeholder={placeholder}
                autoFocus={autoFocus}
                savedFeatures={savedFeatures}
                onFeaturesGenerated={onFeaturesGenerated}
                onTasksGenerated={onTasksGenerated}
              />
            </TabsContent>

            {/* Canvas Only View */}
            <TabsContent value="canvas" className="mt-4">
              <PRDCanvas
                ref={canvasRef}
                initialData={canvasData}
                onChange={handleCanvasChange}
                prdContent={prdPlainText}
                productDescription={productDescription}
                defaultCollapsed={false}
                onGenerateContent={handleGenerateContent}
                isGenerating={isGenerating}
                generatingType={generatingType}
              />
            </TabsContent>

            {/* Split View */}
            {enableSplitView && (
              <TabsContent value="split" className="mt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="min-h-[500px]">
                    <NoteEditor
                      content={content}
                      onChange={onChange}
                      placeholder={placeholder}
                      autoFocus={autoFocus}
                      savedFeatures={savedFeatures}
                      onFeaturesGenerated={onFeaturesGenerated}
                      onTasksGenerated={onTasksGenerated}
                    />
                  </div>
                  <div className="min-h-[500px]">
                    <PRDCanvas
                      ref={canvasRef}
                      initialData={canvasData}
                      onChange={handleCanvasChange}
                      prdContent={prdPlainText}
                      productDescription={productDescription}
                      defaultCollapsed={false}
                      onGenerateContent={handleGenerateContent}
                      isGenerating={isGenerating}
                      generatingType={generatingType}
                    />
                  </div>
                </div>
              </TabsContent>
            )}
          </Tabs>
        </div>
      )}

      {/* Without tabs - just document with collapsible canvas */}
      {!showCanvasDefault && (
        <div className="space-y-4">
          <NoteEditor
            content={content}
            onChange={onChange}
            placeholder={placeholder}
            autoFocus={autoFocus}
            savedFeatures={savedFeatures}
            onFeaturesGenerated={onFeaturesGenerated}
            onTasksGenerated={onTasksGenerated}
          />
          
          <PRDCanvas
            ref={canvasRef}
            initialData={canvasData}
            onChange={handleCanvasChange}
            prdContent={prdPlainText}
            productDescription={productDescription}
            defaultCollapsed={true}
            onGenerateContent={handleGenerateContent}
            isGenerating={isGenerating}
            generatingType={generatingType}
          />
        </div>
      )}
    </div>
  );
}

export default PRDEditorWithCanvas;
