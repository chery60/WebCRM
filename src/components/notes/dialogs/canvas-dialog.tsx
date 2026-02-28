'use client';

import { useRef, useEffect, useCallback } from 'react';
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

  // Latest data seen — used for on-close save
  const pendingDataRef = useRef<CanvasData | null>(null);
  const hasChangesRef = useRef(false);

  // Track if we're in the initial mount phase to prevent spurious saves
  const isInitialMountRef = useRef(true);

  // Track the canvas ID to reset state when a different canvas opens
  const currentCanvasIdRef = useRef<string | null>(null);

  // Debounce timer for the auto-save
  const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Stable ref to onSave so the callback never goes stale
  const onSaveRef = useRef(onSave);
  useEffect(() => { onSaveRef.current = onSave; }, [onSave]);

  // Handle canvas changes — debounced auto-save + immediate inline sync
  const handleCanvasChange = useCallback((data: CanvasData) => {
    // Ignore changes fired during the initial render/mount window
    if (isInitialMountRef.current) return;

    // Keep latest data for on-close fallback
    pendingDataRef.current = data;
    hasChangesRef.current = true;

    // Immediately sync the inline excalidraw node (thumbnail update, etc.)
    if (canvas?.id) {
      notifyCanvasDataChange(canvas.id, {
        elements: data.elements || [],
        appState: data.appState,
        files: data.files,
        canvasName: canvas.name,
        canvasId: canvas.id,
      });
    }

    // Debounced save — fires 800 ms after the last change.
    // This covers both manual edits AND AI generation (which calls onChange
    // inside a setTimeout after updateScene, so it always arrives here).
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(() => {
      debounceTimerRef.current = null;
      onSaveRef.current(data);
    }, 800);
  }, [canvas?.id, canvas?.name]);

  // Save changes when dialog closes (catches any change not yet flushed by debounce)
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      // Flush any pending debounce immediately
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }
      if (hasChangesRef.current && pendingDataRef.current) {
        onSaveRef.current(pendingDataRef.current);
      }
      // Reset state for next open
      pendingDataRef.current = null;
      hasChangesRef.current = false;
    }
    onOpenChange(newOpen);
  };

  // Reset refs when a different canvas is opened
  useEffect(() => {
    if (currentCanvasIdRef.current !== canvas?.id) {
      currentCanvasIdRef.current = canvas?.id || null;

      // Clear any in-flight debounce from the previous canvas
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
        debounceTimerRef.current = null;
      }

      pendingDataRef.current = null;
      hasChangesRef.current = false;
      isInitialMountRef.current = true;

      // Allow changes after Excalidraw has finished its initial render
      const timer = setTimeout(() => {
        isInitialMountRef.current = false;
      }, 300);

      return () => clearTimeout(timer);
    }
  }, [canvas?.id]);

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
