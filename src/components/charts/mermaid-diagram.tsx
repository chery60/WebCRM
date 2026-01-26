'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import mermaid from 'mermaid';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export interface MermaidDiagramProps {
  /** Mermaid diagram definition string */
  chart: string;
  /** Additional CSS classes */
  className?: string;
  /** Theme mode - auto detects from CSS if not specified */
  theme?: 'light' | 'dark' | 'auto';
  /** Callback when diagram renders successfully */
  onRender?: () => void;
  /** Callback when diagram fails to render */
  onError?: (error: Error) => void;
}

// ============================================================================
// MERMAID THEME CONFIGURATION
// ============================================================================

/**
 * Build Mermaid theme configuration - Clean monochromatic style
 * White fill, black borders, black text for maximum readability
 */
function buildMermaidTheme(isDark: boolean): Record<string, string> {
  // Simple monochromatic colors
  const white = '#ffffff';
  const black = '#1a1a1a';
  const lightGray = '#f5f5f5';
  const mediumGray = '#e0e0e0';
  const darkGray = '#333333';
  
  // For dark mode, invert the scheme
  const nodeFill = isDark ? darkGray : white;
  const nodeText = isDark ? white : black;
  const nodeBorder = isDark ? '#666666' : black;
  const background = isDark ? '#1a1a1a' : white;
  const lineColor = isDark ? '#888888' : '#333333';
  const noteFill = isDark ? '#2a2a2a' : lightGray;

  return {
    // Main colors - white fill, black border, black text
    primaryColor: nodeFill,
    primaryTextColor: nodeText,
    primaryBorderColor: nodeBorder,
    
    // Secondary colors - same monochromatic style
    secondaryColor: nodeFill,
    secondaryTextColor: nodeText,
    secondaryBorderColor: nodeBorder,
    
    // Tertiary colors - same monochromatic style
    tertiaryColor: nodeFill,
    tertiaryTextColor: nodeText,
    tertiaryBorderColor: nodeBorder,
    
    // Background and text
    background: background,
    mainBkg: nodeFill,
    textColor: nodeText,
    
    // Lines - dark for visibility
    lineColor: lineColor,
    
    // Note styling (for sequence diagrams)
    noteBkgColor: noteFill,
    noteTextColor: nodeText,
    noteBorderColor: nodeBorder,
    
    // Flowchart specific
    nodeBkg: nodeFill,
    nodeTextColor: nodeText,
    clusterBkg: isDark ? '#252525' : mediumGray,
    clusterBorder: nodeBorder,
    
    // All node types use same monochromatic style
    fillType0: nodeFill,
    fillType1: nodeFill,
    fillType2: nodeFill,
    fillType3: nodeFill,
    fillType4: nodeFill,
    fillType5: nodeFill,
    fillType6: nodeFill,
    fillType7: nodeFill,
    
    // Ensure text is always readable
    labelTextColor: nodeText,
    signalTextColor: nodeText,
    actorTextColor: nodeText,
    actorLineColor: lineColor,
    
    // Sequence diagram specific
    actorBkg: nodeFill,
    actorBorder: nodeBorder,
    signalColor: lineColor,
    
    // State diagram specific
    labelColor: nodeText,
    altBackground: noteFill,
    
    // ER diagram specific  
    attributeBackgroundColorOdd: nodeFill,
    attributeBackgroundColorEven: noteFill,
    
    // Gantt specific
    sectionBkgColor: nodeFill,
    taskBkgColor: nodeFill,
    taskTextColor: nodeText,
    taskBorderColor: nodeBorder,
    gridColor: lineColor,
    todayLineColor: lineColor,
  };
}

/**
 * Sanitize Mermaid code to fix common syntax issues
 * - Escapes parentheses in node labels by wrapping text in quotes
 * - Handles other special characters that break parsing
 */
function sanitizeMermaidCode(code: string): string {
  // Pattern to match node labels like A[text], A(text), A{text}, etc.
  // and wrap them in quotes if they contain problematic characters
  const lines = code.split('\n');
  
  return lines.map(line => {
    // Skip lines that are just diagram type declarations or empty
    if (line.trim().startsWith('flowchart') || 
        line.trim().startsWith('graph') ||
        line.trim().startsWith('sequenceDiagram') ||
        line.trim().startsWith('erDiagram') ||
        line.trim().startsWith('gantt') ||
        line.trim().startsWith('stateDiagram') ||
        line.trim().startsWith('journey') ||
        line.trim().startsWith('pie') ||
        line.trim() === '') {
      return line;
    }
    
    // Match node definitions with brackets: ID[text], ID(text), ID{text}, ID([text]), etc.
    // Look for unquoted text containing parentheses inside shape brackets
    return line.replace(
      /(\w+)(\[|\(|\{|\(\[|\[\(|\[\[|\(\()([^\]}\)]*\([^\]}\)]*\)[^\]}\)]*)(\]|\)|\}|\]\)|\)\]|\]\]|\)\))/g,
      (match, id, openBracket, content, closeBracket) => {
        // If content contains parentheses and isn't already quoted, add quotes
        if (content.includes('(') && !content.startsWith('"') && !content.startsWith("'")) {
          return `${id}${openBracket}"${content}"${closeBracket}`;
        }
        return match;
      }
    );
  }).join('\n');
}

// ============================================================================
// MERMAID DIAGRAM COMPONENT
// ============================================================================

/**
 * Mermaid diagram component that renders diagrams with app theme colors.
 * Supports flowcharts, sequence diagrams, ERD, and more.
 */
export function MermaidDiagram({
  chart,
  className,
  theme = 'auto',
  onRender,
  onError,
}: MermaidDiagramProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [svg, setSvg] = useState<string>('');
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const idRef = useRef(`mermaid-${Math.random().toString(36).substr(2, 9)}`);

  // Detect dark mode
  const isDark = useCallback(() => {
    if (theme === 'light') return false;
    if (theme === 'dark') return true;
    if (typeof window === 'undefined') return false;
    return document.documentElement.classList.contains('dark');
  }, [theme]);

  // Initialize and render mermaid diagram
  useEffect(() => {
    const renderDiagram = async () => {
      if (!chart || typeof window === 'undefined') return;

      setIsLoading(true);
      setError(null);

      try {
        // Build clean monochromatic theme (white fill, black borders/text)
        const themeVariables = buildMermaidTheme(isDark());

        // Initialize mermaid with our custom theme
        mermaid.initialize({
          startOnLoad: false,
          theme: 'base',
          themeVariables,
          securityLevel: 'loose',
          fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI Variable Display", "Segoe UI", Helvetica, Arial, sans-serif',
          flowchart: {
            useMaxWidth: true,
            htmlLabels: true,
            curve: 'basis',
          },
          sequence: {
            useMaxWidth: true,
            wrap: true,
          },
          er: {
            useMaxWidth: true,
          },
          gantt: {
            useMaxWidth: true,
          },
        });

        // Sanitize the chart code to fix common syntax issues (like unquoted parentheses)
        const sanitizedChart = sanitizeMermaidCode(chart);

        // Render the diagram
        const { svg: renderedSvg } = await mermaid.render(idRef.current, sanitizedChart);
        setSvg(renderedSvg);
        onRender?.();
      } catch (err) {
        const error = err instanceof Error ? err : new Error('Failed to render diagram');
        setError(error);
        onError?.(error);
        console.error('Mermaid rendering error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    renderDiagram();
  }, [chart, isDark, onRender, onError]);

  // Re-render on theme change
  useEffect(() => {
    if (theme !== 'auto') return;

    const observer = new MutationObserver((mutations) => {
      mutations.forEach((mutation) => {
        if (mutation.attributeName === 'class') {
          // Theme changed, force re-render by updating id
          idRef.current = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
          setSvg(''); // Clear to trigger re-render
        }
      });
    });

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, [theme]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center justify-center p-8', className)}>
        <div className="flex items-center gap-2 text-muted-foreground text-sm">
          <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
              fill="none"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          Rendering diagram...
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={cn('p-4 rounded-lg bg-destructive/10 border border-destructive/20', className)}>
        <p className="text-sm text-destructive font-medium">Failed to render diagram</p>
        <p className="text-xs text-muted-foreground mt-1">{error.message}</p>
        <details className="mt-2">
          <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
            Show diagram code
          </summary>
          <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto">
            {chart}
          </pre>
        </details>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={cn('mermaid-diagram overflow-auto', className)}
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}

export default MermaidDiagram;

