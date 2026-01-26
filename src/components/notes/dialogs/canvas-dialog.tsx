'use client';

import { useRef, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { PRDCanvas, type CanvasData, type CanvasGenerationType, type GeneratedCanvasContent, type PRDCanvasRef } from '@/components/canvas/prd-canvas';
import type { CanvasItem } from '@/types';

interface CanvasDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canvas: CanvasItem | null;
  onSave: (data: CanvasData) => void;
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

  // Handle canvas changes - just store in ref, don't trigger parent update
  const handleCanvasChange = (data: CanvasData) => {
    pendingDataRef.current = data;
    hasChangesRef.current = true;
  };

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

  // Reset refs when canvas changes
  useEffect(() => {
    pendingDataRef.current = null;
    hasChangesRef.current = false;
  }, [canvas?.id]);

  if (!canvas) return null;

  // Normalize canvas data for PRDCanvas
  const initialCanvasData: CanvasData | undefined = canvas.data ? {
    elements: (canvas.data.elements || []) as CanvasData['elements'],
    appState: canvas.data.appState as CanvasData['appState'],
    files: canvas.data.files as CanvasData['files'],
  } : undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="max-w-[95vw] w-[95vw] max-h-[95vh] h-[95vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <DialogTitle>{canvas.name}</DialogTitle>
        </DialogHeader>
        <div className="flex-1 overflow-hidden">
          {open && (
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
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
