'use client';

import { useState, useMemo } from 'react';
import { Separator } from '@/components/ui/separator';
import { FileCode2 } from 'lucide-react';
import { MermaidThumbnail } from './mermaid-thumbnail';
import { MermaidPreviewDialog } from '../dialogs/mermaid-preview-dialog';

interface ResourcesCardProps {
  /** TipTap editor content (JSON string) to extract mermaid diagrams from */
  content: string;
}

interface MermaidBlock {
  id: string;
  code: string;
}

// TipTap node types for parsing
interface TipTapNode {
  type?: string;
  attrs?: { language?: string; code?: string };
  content?: TipTapNode[];
  text?: string;
}

/**
 * Extract mermaid diagram code blocks from TipTap JSON content
 */
function extractMermaidDiagrams(content: string): MermaidBlock[] {
  if (!content) return [];

  try {
    const parsed = JSON.parse(content) as TipTapNode;
    const diagrams: MermaidBlock[] = [];

    // Recursive function to traverse TipTap JSON structure
    function traverse(node: TipTapNode, index: number = 0): void {
      if (!node) return;

      // Check for custom mermaid node (used by MermaidExtension)
      if (node.type === 'mermaid' && node.attrs?.code) {
        const code = node.attrs.code;
        if (code.trim()) {
          diagrams.push({
            id: `mermaid-${diagrams.length}-${index}`,
            code: code.trim(),
          });
        }
      }

      // Also check for code blocks with mermaid language (fallback)
      if (node.type === 'codeBlock' && node.attrs?.language === 'mermaid') {
        const code = node.content
          ?.map((textNode: TipTapNode) => textNode.text || '')
          .join('') || '';
        if (code.trim()) {
          diagrams.push({
            id: `mermaid-${diagrams.length}-${index}`,
            code: code.trim(),
          });
        }
      }

      // Recurse into content array
      if (Array.isArray(node.content)) {
        node.content.forEach((child: TipTapNode, i: number) => traverse(child, i));
      }
    }

    traverse(parsed);
    return diagrams;
  } catch (e) {
    console.warn('Failed to parse content for mermaid extraction:', e);
    return [];
  }
}

export function ResourcesCard({ content }: ResourcesCardProps) {
  const [previewCode, setPreviewCode] = useState<string | null>(null);

  const mermaidDiagrams = useMemo(
    () => extractMermaidDiagrams(content),
    [content]
  );

  // Don't render the card if there are no resources
  if (mermaidDiagrams.length === 0) {
    return null;
  }

  return (
    <>
      <div className="rounded-2xl border bg-white shadow-sm">
        <div className="flex items-center justify-between px-6 pt-6 pb-4">
          <div className="flex items-center gap-2">
            <FileCode2 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-medium">Resources</h2>
          </div>
        </div>
        <Separator className="opacity-15" />
        <div className="px-6 py-4">
          <div className="grid grid-cols-4 gap-2">
            {mermaidDiagrams.map((diagram) => (
              <MermaidThumbnail
                key={diagram.id}
                code={diagram.code}
                onClick={() => setPreviewCode(diagram.code)}
              />
            ))}
          </div>
        </div>
      </div>

      <MermaidPreviewDialog
        open={previewCode !== null}
        onOpenChange={(open) => {
          if (!open) setPreviewCode(null);
        }}
        code={previewCode || ''}
      />
    </>
  );
}
