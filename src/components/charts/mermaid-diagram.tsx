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
 * - Detects and removes incomplete arrows
 * - Escapes special characters in node labels by wrapping text in quotes
 * - Handles parentheses, quotes, arrows, and other problematic characters
 */
function sanitizeMermaidCode(code: string): string {
  const lines = code.split('\n');
  
  // First pass: detect and fix incomplete arrows
  const fixedLines = lines.map((line, index) => {
    const trimmed = line.trim();
    
    // Skip diagram declarations and comments
    if (
      trimmed.startsWith('flowchart') ||
      trimmed.startsWith('graph') ||
      trimmed.startsWith('sequenceDiagram') ||
      trimmed.startsWith('erDiagram') ||
      trimmed.startsWith('gantt') ||
      trimmed.startsWith('stateDiagram') ||
      trimmed.startsWith('journey') ||
      trimmed.startsWith('pie') ||
      trimmed.startsWith('%%') ||
      trimmed === ''
    ) {
      return line;
    }
    
    // Check if line ends with an incomplete arrow (arrow without target)
    // Patterns: -->, ===>, -.-> etc. at end of line
    const incompleteArrowPattern = /(-{1,3}>|={1,3}>|\.{1,3}>)\s*$/;
    if (incompleteArrowPattern.test(trimmed)) {
      // Comment out this line or remove the incomplete arrow
      console.warn(`Line ${index + 1} has incomplete arrow, commenting out:`, trimmed);
      return `%% ${line} %% (Incomplete arrow removed)`;
    }
    
    return line;
  });
  
  // Second pass: quote special characters in labels
  return fixedLines.map(line => {
    // Skip lines that are just diagram type declarations or empty
    if (line.trim().startsWith('flowchart') || 
        line.trim().startsWith('graph') ||
        line.trim().startsWith('sequenceDiagram') ||
        line.trim().startsWith('erDiagram') ||
        line.trim().startsWith('gantt') ||
        line.trim().startsWith('stateDiagram') ||
        line.trim().startsWith('journey') ||
        line.trim().startsWith('pie') ||
        line.trim().startsWith('%%') || // Skip comments
        line.trim() === '') {
      return line;
    }
    
    // Pattern to match node definitions: ID[text], ID(text), ID{text}, ID([text]), etc.
    // We need to handle multiple bracket types and ensure special characters are quoted
    let processedLine = line;
    
    // Match all node label patterns with various bracket types
    // First, handle double brackets (must come before single brackets): [[label]], ((label))
    const doubleBracketPattern = /(\w+)(\[\[|\(\()([^[\]()]*?)(\]\]|\)\))/g;
    processedLine = processedLine.replace(doubleBracketPattern, (match, id, openBracket, content, closeBracket) => {
      if ((content.startsWith('"') && content.endsWith('"')) || 
          (content.startsWith("'") && content.endsWith("'"))) {
        return match;
      }
      const hasSpecialChars = /[(){}\[\]"'<>|\\-]/.test(content);
      if (hasSpecialChars) {
        const escapedContent = content.replace(/"/g, '\\"');
        return `${id}${openBracket}"${escapedContent}"${closeBracket}`;
      }
      return match;
    });
    
    // Then handle mixed brackets: [(label)], ([label])
    const mixedBracketPattern = /(\w+)(\[\(|\(\[)([^[\]()]*?)(\]\)|\)\])/g;
    processedLine = processedLine.replace(mixedBracketPattern, (match, id, openBracket, content, closeBracket) => {
      if ((content.startsWith('"') && content.endsWith('"')) || 
          (content.startsWith("'") && content.endsWith("'"))) {
        return match;
      }
      const hasSpecialChars = /[(){}\[\]"'<>|\\-]/.test(content);
      if (hasSpecialChars) {
        const escapedContent = content.replace(/"/g, '\\"');
        return `${id}${openBracket}"${escapedContent}"${closeBracket}`;
      }
      return match;
    });
    
    // Finally handle single brackets/parens/braces: [label], (label), {label}
    // Match content that may include parentheses, but ensure proper bracket/brace matching
    const singleBracketPattern = /(\w+)\[([^\[\]]*)\]|(\w+)\{([^\{\}]*)\}|(\w+)\(([^\(\)]*)\)/g;
    processedLine = processedLine.replace(singleBracketPattern, (match, id1, content1, id2, content2, id3, content3) => {
      const id = id1 || id2 || id3;
      const content = content1 !== undefined ? content1 : (content2 !== undefined ? content2 : content3);
      const openBracket = id1 ? '[' : (id2 ? '{' : '(');
      const closeBracket = id1 ? ']' : (id2 ? '}' : ')');
      
      if (!content) return match;
      
      if ((content.startsWith('"') && content.endsWith('"')) || 
          (content.startsWith("'") && content.endsWith("'"))) {
        return match;
      }
      
      const hasSpecialChars = /[(){}\[\]"'<>|\\-]/.test(content);
      if (hasSpecialChars) {
        const escapedContent = content.replace(/"/g, '\\"');
        return `${id}${openBracket}"${escapedContent}"${closeBracket}`;
      }
      return match;
    });
    
    // Also handle edge labels that might have special characters
    // Pattern: -->|label| or -.->|label| etc.
    processedLine = processedLine.replace(
      /(-{1,2}>|={1,2}>|\.{1,2}>)\s*\|([^|]+)\|/g,
      (match, arrow, label) => {
        // Skip if already quoted
        if ((label.startsWith('"') && label.endsWith('"')) || 
            (label.startsWith("'") && label.endsWith("'"))) {
          return match;
        }
        
        const hasSpecialChars = /[(){}\[\]"'<>|\\-]/.test(label);
        if (hasSpecialChars) {
          const escapedLabel = label.replace(/"/g, '\\"');
          return `${arrow}|"${escapedLabel}"|`;
        }
        
        return match;
      }
    );
    
    return processedLine;
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
    // Remove onRender and onError from dependencies to prevent re-renders
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chart, isDark]);

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
    // Extract more user-friendly error information
    const errorMessage = error.message || 'Unknown error';
    const isParseError = errorMessage.toLowerCase().includes('parse');
    const isSyntaxError = errorMessage.toLowerCase().includes('syntax');
    
    // Try to extract line number from error message
    const lineMatch = errorMessage.match(/line (\d+)/i);
    const lineNumber = lineMatch ? parseInt(lineMatch[1], 10) : null;
    
    return (
      <div className={cn('p-4 rounded-lg bg-destructive/10 border border-destructive/20', className)}>
        <div className="flex items-start gap-2">
          <svg className="h-5 w-5 text-destructive mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm text-destructive font-medium">
              {isParseError || isSyntaxError ? 'Diagram Syntax Error' : 'Failed to Render Diagram'}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {lineNumber ? `Error on line ${lineNumber}: ` : ''}
              {errorMessage}
            </p>
            
            {(isParseError || isSyntaxError) && (
              <div className="mt-3 p-2 bg-muted/50 rounded text-xs space-y-1">
                <p className="font-medium text-foreground">Common fixes:</p>
                <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                  <li>Wrap labels with special characters in quotes: <code className="bg-background px-1 rounded">A["Label (text)"]</code></li>
                  <li>Ensure all brackets are properly closed</li>
                  <li>Check for missing node IDs or connection syntax</li>
                  <li>Verify the diagram type declaration (e.g., <code className="bg-background px-1 rounded">flowchart TD</code>)</li>
                </ul>
              </div>
            )}
            
            <details className="mt-3">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground font-medium">
                Show diagram code
              </summary>
              <pre className="mt-2 p-2 bg-muted rounded text-xs overflow-auto max-h-[200px] whitespace-pre-wrap break-words">
                {chart}
              </pre>
            </details>
          </div>
        </div>
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

