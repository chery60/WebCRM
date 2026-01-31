'use client';

import { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Plus, Layers } from 'lucide-react';
import { CanvasListItem } from './canvas-list-item';
import { CanvasDialog } from '../dialogs/canvas-dialog';
import type { CanvasItem } from '@/types';
import type { CanvasData, CanvasGenerationType, GeneratedCanvasContent } from '@/components/canvas/prd-canvas';

interface CanvasCardProps {
  canvases: CanvasItem[];
  onCanvasesChange: (canvases: CanvasItem[]) => void;
  prdContent?: string;
  productDescription?: string;
  onGenerateContent?: (type: CanvasGenerationType, existingElements: unknown[]) => Promise<GeneratedCanvasContent | null>;
  isGenerating?: boolean;
  generatingType?: CanvasGenerationType | null;
}

export function CanvasCard({
  canvases,
  onCanvasesChange,
  prdContent,
  productDescription,
  onGenerateContent,
  isGenerating = false,
  generatingType = null,
}: CanvasCardProps) {
  // Track which canvas is open in the dialog
  const [openCanvasId, setOpenCanvasId] = useState<string | null>(null);

  const openCanvas = canvases.find(c => c.id === openCanvasId) || null;

  const handleAddCanvas = useCallback(() => {
    const newCanvas: CanvasItem = {
      id: `canvas-${Date.now()}`,
      name: `Canvas ${canvases.length + 1}`,
      data: {
        elements: [],
        appState: { viewBackgroundColor: '#ffffff' },
        files: {},
      },
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    onCanvasesChange([...canvases, newCanvas]);
    // Open the new canvas in the dialog
    setOpenCanvasId(newCanvas.id);
  }, [canvases, onCanvasesChange]);

  const handleDeleteCanvas = useCallback((id: string) => {
    const filtered = canvases.filter(c => c.id !== id);
    onCanvasesChange(filtered);
    if (openCanvasId === id) {
      setOpenCanvasId(null);
    }
  }, [canvases, openCanvasId, onCanvasesChange]);

  const handleRenameCanvas = useCallback((id: string, newName: string) => {
    onCanvasesChange(
      canvases.map(c =>
        c.id === id
          ? { ...c, name: newName, updatedAt: new Date().toISOString() }
          : c
      )
    );
  }, [canvases, onCanvasesChange]);

  const handleCanvasDataChange = useCallback((id: string, data: CanvasData) => {
    onCanvasesChange(
      canvases.map(c =>
        c.id === id
          ? { ...c, data, updatedAt: new Date().toISOString() }
          : c
      )
    );
  }, [canvases, onCanvasesChange]);

  return (
    <>
      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Canvas</h2>
          </div>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6"
            onClick={handleAddCanvas}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        <Separator className="opacity-15" />
        <div className="py-2">
          {canvases.length === 0 ? (
            <div className="px-6 py-8 text-center">
              <Layers className="h-8 w-8 mx-auto mb-2 text-muted-foreground opacity-50" />
              <p className="text-sm text-muted-foreground">No canvases yet</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleAddCanvas}
                className="mt-2"
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Canvas
              </Button>
            </div>
          ) : (
            canvases.map((canvas) => (
              <CanvasListItem
                key={canvas.id}
                canvas={canvas}
                onExpand={() => setOpenCanvasId(canvas.id)}
                onRename={(name) => handleRenameCanvas(canvas.id, name)}
                onDelete={() => handleDeleteCanvas(canvas.id)}
              />
            ))
          )}
        </div>
      </div>

      {/* Canvas Dialog - saves only when closed */}
      <CanvasDialog
        open={openCanvasId !== null}
        onOpenChange={(open) => {
          if (!open) setOpenCanvasId(null);
        }}
        canvas={openCanvas}
        onSave={(data) => {
          if (openCanvasId) {
            handleCanvasDataChange(openCanvasId, data);
          }
        }}
        onCanvasNameChange={(canvasId, name) => {
          handleRenameCanvas(canvasId, name);
        }}
        prdContent={prdContent}
        productDescription={productDescription}
        onGenerateContent={onGenerateContent}
        isGenerating={isGenerating}
        generatingType={generatingType}
      />
    </>
  );
}
