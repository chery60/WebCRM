'use client';

import { useRef, useEffect, useCallback } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PRDCanvas, type CanvasData, type CanvasGenerationType, type GeneratedCanvasContent, type PRDCanvasRef } from '@/components/canvas/prd-canvas';
import { notifyCanvasNameChange, notifyCanvasDataChange } from '@/components/notes/extensions/excalidraw-extension';
import type { CanvasItem } from '@/types';

interface CanvasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvas: CanvasItem | null;
  onSave: (data: CanvasData) => void;
  onCanvasNameChange?: (canvasId: string, name: string) => void;
  prdContent?: string;
  productDescription?: string;
  onGenerateContent?: (type: CanvasGenerationType, existingElements: unknown[]) => Promise<GeneratedCanvasContent | null>;
  isGenerating?: boolean;
  generatingType?: CanvasGenerationType | null;
}

export function CanvasDialog({
  open,
  onOpenChange,
  canvas,
  onSave,
  onCanvasNameChange,
  prdContent,
  productDescription,
  onGenerateContent,
  isGenerating = false,
  generatingType = null,
}: CanvasDialogProps) {
  const canvasRef = useRef<PRDCanvasRef>(null);
  // Store pending changes - only save when dialog closes
  const pendingDataRef = useRef<CanvasData | null>(null);
  const hasChangesRef = useRef(false);
  // Track the last synced element count to detect significant changes
  const lastSyncedElementCountRef = useRef<number>(0);
  // Track if we're in the initial mount phase to prevent change loops
  const isInitialMountRef = useRef(true);
  // Track the canvas ID to detect canvas changes
  const currentCanvasIdRef = useRef<string | null>(null);

  // Handle canvas changes - store in ref AND immediately notify inline canvas for sync
  const handleCanvasChange = useCallback((data: CanvasData) => {
    // Skip processing during initial mount to prevent infinite loops
    if (isInitialMountRef.current) {
      return;
    }
    
    pendingDataRef.current = data;
    hasChangesRef.current = true;
    
    // Always notify the inline canvas of data changes for immediate sync
    // This ensures AI-generated content appears in inline canvas immediately
    if (canvas?.id) {
      notifyCanvasDataChange(canvas.id, {
        elements: data.elements || [],
        appState: data.appState,
        files: data.files,
        canvasName: canvas.name,
        canvasId: canvas.id,
      });

      // For significant changes (like AI generation adding many new elements),
      // also call onSave immediately to persist to the page's canvas state
      // But debounce this to avoid render loops
      const currentElementCount = data.elements?.length || 0;
      const previousCount = lastSyncedElementCountRef.current;
      const isSignificantChange = currentElementCount > previousCount + 5; // Increase threshold
      
      if (isSignificantChange) {
        // Update ref BEFORE calling onSave to prevent re-triggering
        lastSyncedElementCountRef.current = currentElementCount;
        // Use setTimeout to break the synchronous update cycle
        setTimeout(() => {
          onSave(data);
        }, 0);
      }
    }
  }, [canvas?.id, canvas?.name, onSave]);

  // Save changes when dialog closes
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen && hasChangesRef.current && pendingDataRef.current) {
      // Dialog is closing and we have changes - save them
      onSave(pendingDataRef.current);
    }
    // Reset refs
    pendingDataRef.current = null;
    hasChangesRef.current = false;
    onOpenChange(newOpen);
  };

  // Reset refs when canvas ID changes (new canvas opened)
  useEffect(() => {
    // Check if canvas actually changed
    if (currentCanvasIdRef.current !== canvas?.id) {
      currentCanvasIdRef.current = canvas?.id || null;
      pendingDataRef.current = null;
      hasChangesRef.current = false;
      // Reset element count tracking for new canvas
      lastSyncedElementCountRef.current = canvas?.data?.elements?.length || 0;
      // Mark as initial mount for this canvas
      isInitialMountRef.current = true;
      
      // Allow changes after a short delay (after initial render)
      const timer = setTimeout(() => {
        isInitialMountRef.current = false;
      }, 500);
      
      return () => clearTimeout(timer);
    }
  }, [canvas?.id, canvas?.data?.elements?.length]);

  if (!canvas) return null;

  // Normalize canvas data for PRDCanvas
  const initialCanvasData: CanvasData | undefined = canvas.data ? {
    elements: (canvas.data.elements || []) as CanvasData['elements'],
    appState: canvas.data.appState as CanvasData['appState'],
    files: canvas.data.files as CanvasData['files'],
  } : undefined;

  // Handle minimize (close full-page view)
  const handleMinimize = () => {
    handleOpenChange(false);
  };

  // Handle canvas name change
  const handleCanvasNameChange = (name: string) => {
    if (canvas?.id && onCanvasNameChange) {
      onCanvasNameChange(canvas.id, name);
      // Notify inline canvas of the name change
      notifyCanvasNameChange(canvas.id, name);
    }
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 bg-background">
      {/* Full-page canvas */}
      {canvas && (
        <PRDCanvas
          ref={canvasRef}
          initialData={initialCanvasData}
          onChange={handleCanvasChange}
          prdContent={prdContent}
          productDescription={productDescription}
          defaultCollapsed={false}
          onGenerateContent={onGenerateContent}
          isGenerating={isGenerating}
          generatingType={generatingType}
          canvasName={canvas.name}
          onCanvasNameChange={handleCanvasNameChange}
          onMinimize={handleMinimize}
          isFullPage={true}
        />
      )}
    </div>
  );
}
