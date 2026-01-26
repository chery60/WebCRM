'use client';

import { cn } from '@/lib/utils';
import { MermaidDiagram } from '@/components/charts/mermaid-diagram';

interface MermaidThumbnailProps {
  code: string;
  onClick?: () => void;
  className?: string;
}

export function MermaidThumbnail({ code, onClick, className }: MermaidThumbnailProps) {
  return (
    <div
      className={cn(
        'w-20 h-14 overflow-hidden border rounded cursor-pointer hover:ring-2 hover:ring-primary/50 transition-all bg-white',
        className
      )}
      onClick={onClick}
    >
      <div
        className="transform scale-[0.12] origin-top-left pointer-events-none"
        style={{ width: '600%', height: '600%' }}
      >
        <MermaidDiagram chart={code} />
      </div>
    </div>
  );
}
