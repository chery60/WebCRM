'use client';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MermaidDiagram } from '@/components/charts/mermaid-diagram';
import { Copy, Image } from 'lucide-react';
import { toast } from 'sonner';
import { useCallback, useState, useEffect } from 'react';

interface MermaidPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  code: string;
}

export function MermaidPreviewDialog({
  open,
  onOpenChange,
  code,
}: MermaidPreviewDialogProps) {
  const [isCopying, setIsCopying] = useState(false);
  // Track if dialog is mounted to ensure mermaid renders after portal is ready
  const [isMounted, setIsMounted] = useState(false);

  // Set mounted after a tick to ensure Dialog portal is ready
  useEffect(() => {
    if (open) {
      const timer = setTimeout(() => setIsMounted(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsMounted(false);
    }
  }, [open]);

  const handleCopyCode = useCallback(() => {
    navigator.clipboard.writeText(code);
    toast.success('Mermaid code copied to clipboard');
  }, [code]);

  const handleCopyAsPNG = useCallback(async () => {
    setIsCopying(true);
    try {
      // Get the rendered SVG from the DOM
      const container = document.querySelector('.mermaid-preview-content .mermaid-diagram');
      if (!container) {
        toast.error('Could not find diagram to export');
        setIsCopying(false);
        return;
      }

      const svg = container.querySelector('svg');
      if (!svg) {
        toast.error('Could not find SVG to export');
        setIsCopying(false);
        return;
      }

      // Clone the SVG to avoid modifying the original
      const clonedSvg = svg.cloneNode(true) as SVGSVGElement;

      // Ensure the SVG has proper dimensions set as attributes
      const bbox = svg.getBoundingClientRect();
      const width = bbox.width || 800;
      const height = bbox.height || 600;
      
      clonedSvg.setAttribute('width', String(width));
      clonedSvg.setAttribute('height', String(height));
      
      // Add xmlns if missing (required for standalone SVG)
      if (!clonedSvg.getAttribute('xmlns')) {
        clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
      }
      if (!clonedSvg.getAttribute('xmlns:xlink')) {
        clonedSvg.setAttribute('xmlns:xlink', 'http://www.w3.org/1999/xlink');
      }

      // Create a canvas
      const canvas = document.createElement('canvas');
      const scale = 2; // Higher resolution
      canvas.width = width * scale;
      canvas.height = height * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        toast.error('Could not create canvas');
        setIsCopying(false);
        return;
      }

      // Fill with white background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.scale(scale, scale);

      // Convert SVG to base64 data URL (avoids tainted canvas issue with blob URLs)
      const svgData = new XMLSerializer().serializeToString(clonedSvg);
      // Encode the SVG data properly to handle special characters
      const base64Svg = btoa(unescape(encodeURIComponent(svgData)));
      const dataUrl = `data:image/svg+xml;base64,${base64Svg}`;

      // Draw SVG on canvas
      const img = new window.Image();
      img.onload = async () => {
        ctx.drawImage(img, 0, 0);

        // Convert to PNG blob and copy to clipboard
        canvas.toBlob(async (blob) => {
          if (blob) {
            try {
              await navigator.clipboard.write([
                new ClipboardItem({ 'image/png': blob })
              ]);
              toast.success('PNG copied to clipboard');
            } catch {
              // Fallback: download the PNG
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = 'mermaid-diagram.png';
              a.click();
              URL.revokeObjectURL(url);
              toast.success('PNG downloaded (clipboard not supported)');
            }
          }
          setIsCopying(false);
        }, 'image/png');
      };
      img.onerror = () => {
        toast.error('Failed to render diagram');
        setIsCopying(false);
      };
      img.src = dataUrl;
    } catch {
      toast.error('Failed to copy as PNG');
      setIsCopying(false);
    }
  }, []);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[85vw] w-[85vw] max-h-[90vh] h-[85vh] p-0 flex flex-col">
        <DialogHeader className="px-6 py-4 border-b shrink-0">
          <div className="flex items-center justify-between">
            <DialogTitle>Mermaid Diagram</DialogTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyCode}
              >
                <Copy className="h-4 w-4 mr-1" />
                Copy Code
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleCopyAsPNG}
                disabled={isCopying || !isMounted}
              >
                <Image className="h-4 w-4 mr-1" />
                {isCopying ? 'Copying...' : 'Copy as PNG'}
              </Button>
            </div>
          </div>
        </DialogHeader>
        <div className="flex-1 overflow-auto p-6 mermaid-preview-content">
          <div className="bg-white rounded-lg border min-h-[400px] p-6 flex items-center justify-center">
            {isMounted && code ? (
              <MermaidDiagram
                key={`preview-${Date.now()}`}
                chart={code}
              />
            ) : (
              <div className="text-muted-foreground text-sm">Loading diagram...</div>
            )}
          </div>
          <details className="mt-4">
            <summary className="text-sm text-muted-foreground cursor-pointer hover:text-foreground">
              Show code
            </summary>
            <pre className="mt-2 p-4 bg-muted rounded-lg text-xs overflow-auto max-h-[200px]">
              {code}
            </pre>
          </details>
        </div>
      </DialogContent>
    </Dialog>
  );
}
