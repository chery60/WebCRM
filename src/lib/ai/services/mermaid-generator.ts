/**
 * Mermaid Diagram Generator Service
 * 
 * Generates Mermaid diagrams for PRDs using AI.
 * Supports various diagram types optimized for product documentation.
 */

import type { AIGenerateRequest } from '@/types';
import { generateAIContent } from '../use-ai-service';
import type { AIProviderType } from '@/lib/stores/ai-settings-store';
import { MERMAID_SYNTAX_EXAMPLES } from '../prompts/prd-structured-prompts';

// ============================================================================
// TYPES
// ============================================================================

// RESTRICTED: Only flowchart and sequenceDiagram are supported
// Other diagram types (erDiagram, gantt, stateDiagram, journey, pie) 
// are prone to parsing errors and have been disabled
export type MermaidDiagramType =
  | 'flowchart'
  | 'sequenceDiagram';

export interface MermaidGenerationOptions {
  /** Type of diagram to generate */
  type: MermaidDiagramType;
  /** PRD content or context */
  context: string;
  /** Specific focus for the diagram */
  focus?: string;
  /** AI provider to use */
  provider?: AIProviderType;
}

export interface MermaidGenerationResult {
  success: boolean;
  diagram: string | null;
  title: string;
  description: string;
  error?: string;
}

// ============================================================================
// DIAGRAM TYPE METADATA
// ============================================================================

// RESTRICTED: Only flowchart and sequenceDiagram metadata
// Other types removed to prevent parsing errors
const DIAGRAM_METADATA: Record<MermaidDiagramType, { title: string; description: string; useCase: string }> = {
  flowchart: {
    title: 'Flow Diagram',
    description: 'User flows, processes, and decision trees',
    useCase: 'Best for illustrating user journeys, feature flows, and decision logic',
  },
  sequenceDiagram: {
    title: 'Sequence Diagram',
    description: 'System interactions and API flows',
    useCase: 'Best for showing communication between systems, API calls, and data flow',
  },
};

// ============================================================================
// GENERATION PROMPTS
// ============================================================================

const MERMAID_SYSTEM_PROMPT = `You are an expert at creating clear, informative Mermaid diagrams for product documentation.

## Critical Syntax Rules
1. Generate ONLY valid Mermaid syntax that will render correctly
2. Keep diagrams focused and readable (not too many nodes)
3. Use clear, concise labels
4. **ALWAYS complete all arrow connections** - NEVER leave an arrow without a target node
   - WRONG: \`A --> B -->\` (incomplete arrow)
   - CORRECT: \`A --> B --> C\` (complete connection)
5. **IMPORTANT**: If node labels contain parentheses, brackets, or special characters, wrap the entire label in double quotes
   - WRONG: \`A[User Login (OAuth)]\`
   - CORRECT: \`A["User Login (OAuth)"]\`
   - WRONG: \`B(Process Data)\`
   - CORRECT: \`B["Process Data"]\`
6. Avoid using these characters in labels unless quoted: ( ) [ ] { } | < > #
7. Ensure all brackets, parentheses, and braces are properly matched
8. Always provide a valid diagram type declaration (flowchart TD, sequenceDiagram, etc.)
9. Test your syntax mentally before outputting - check every line for completeness

## Common Errors to Avoid
- Incomplete arrows: Every arrow must have both source and target
- Unmatched brackets: Every opening bracket must have a closing bracket
- Missing node IDs: Every node must have an identifier
- Unquoted special characters in labels

## Output Format
Return ONLY the Mermaid code block, no explanation needed.
Start with \`\`\`mermaid and end with \`\`\`
Do not include any text before or after the code block.`;

function getDiagramPrompt(type: MermaidDiagramType, context: string, focus?: string): string {
  const metadata = DIAGRAM_METADATA[type];
  const example = MERMAID_SYNTAX_EXAMPLES[type] || MERMAID_SYNTAX_EXAMPLES.flowchart;

  let prompt = `Generate a ${metadata.title} (${type}) diagram.\n\n`;
  prompt += `## Use Case\n${metadata.useCase}\n\n`;
  prompt += `## Context\n${context}\n\n`;

  if (focus) {
    prompt += `## Focus Area\n${focus}\n\n`;
  }

  prompt += `## Syntax Example\n${example}\n\n`;
  prompt += `Generate a clear, focused diagram based on the context. Output ONLY the mermaid code block:`;

  return prompt;
}

// ============================================================================
// MERMAID GENERATOR SERVICE
// ============================================================================

export class MermaidGeneratorService {
  /**
   * Generate a specific type of Mermaid diagram
   */
  async generateDiagram(options: MermaidGenerationOptions): Promise<MermaidGenerationResult> {
    const { type, context, focus, provider } = options;
    const metadata = DIAGRAM_METADATA[type];

    try {
      const request: AIGenerateRequest = {
        type: 'custom' as any,
        prompt: getDiagramPrompt(type, context, focus),
        context: MERMAID_SYSTEM_PROMPT,
        provider,
      };

      const response = await generateAIContent(request, provider);
      const diagram = this.extractMermaidCode(response.content);

      if (!diagram) {
        return {
          success: false,
          diagram: null,
          title: metadata.title,
          description: metadata.description,
          error: 'Failed to extract valid Mermaid code from response',
        };
      }

      // Validate the diagram syntax using the shared validator
      const { validateMermaidDiagram } = await import('@/lib/utils/mermaid-validator');
      const validation = validateMermaidDiagram(diagram);

      if (!validation.valid) {
        return {
          success: false,
          diagram: null,
          title: metadata.title,
          description: metadata.description,
          error: validation.error,
        };
      }

      // Use sanitized version if available
      const finalDiagram = validation.sanitizedCode || diagram;

      return {
        success: true,
        diagram: finalDiagram,
        title: metadata.title,
        description: metadata.description,
      };
    } catch (error) {
      console.error('Mermaid generation failed:', error);
      return {
        success: false,
        diagram: null,
        title: metadata.title,
        description: metadata.description,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Generate multiple diagrams for a PRD
   */
  async generatePRDDiagrams(
    prdContext: string,
    provider?: AIProviderType
  ): Promise<Map<MermaidDiagramType, MermaidGenerationResult>> {
    const results = new Map<MermaidDiagramType, MermaidGenerationResult>();

    // Determine which diagram types are most relevant
    const relevantTypes = this.suggestDiagramTypes(prdContext);

    for (const type of relevantTypes) {
      const result = await this.generateDiagram({
        type,
        context: prdContext,
        provider,
      });
      results.set(type, result);
    }

    return results;
  }

  /**
   * Suggest appropriate diagram types based on PRD content
   */
  suggestDiagramTypes(context: string): MermaidDiagramType[] {
    const suggestions: MermaidDiagramType[] = [];
    const lowerContext = context.toLowerCase();

    // Always include a flowchart for user flow
    suggestions.push('flowchart');

    // Check for API/system-related content
    if (
      lowerContext.includes('api') ||
      lowerContext.includes('endpoint') ||
      lowerContext.includes('request') ||
      lowerContext.includes('server')
    ) {
      suggestions.push('sequenceDiagram');
    }

    // REMOVED: erDiagram, gantt, stateDiagram suggestions (disabled types)
    // Only flowchart and sequenceDiagram are supported to prevent parsing errors

    // Limit to max 4 diagrams
    return suggestions.slice(0, 4);
  }

  /**
   * Sanitize Mermaid code to fix common syntax issues
   * - Escapes special characters in node labels by wrapping text in quotes
   * - Handles parentheses, quotes, arrows, and other problematic characters
   * - Special handling for ERD relationship labels with special characters
   * - Prevents double-escaping of already-escaped quotes
   */
  private sanitizeMermaidCode(code: string): string {
    const lines = code.split('\n');

    // Detect diagram type for specialized handling
    // Note: ERD handling kept for backward compatibility with existing diagrams
    const isERD = lines.some(line => line.trim().startsWith('erDiagram'));

    return lines.map(line => {
      const trimmed = line.trim();

      // Skip lines that are just diagram type declarations or empty
      if (trimmed.startsWith('flowchart') ||
        trimmed.startsWith('graph') ||
        trimmed.startsWith('sequenceDiagram') ||
        trimmed.startsWith('erDiagram') ||
        trimmed.startsWith('gantt') ||
        trimmed.startsWith('stateDiagram') ||
        trimmed.startsWith('journey') ||
        trimmed.startsWith('pie') ||
        trimmed.startsWith('%%') || // Skip comments
        trimmed === '') {
        return line;
      }

      let processedLine = line;

      // ERD-specific handling: Quote relationship labels with special characters
      // ERD syntax: ENTITY1 ||--o{ ENTITY2 : "label" or ENTITY1 ||--o{ ENTITY2 : label
      if (isERD) {
        // Match ERD relationship pattern: ENTITY relationship ENTITY : label
        const erdPattern = /^(\s*)(\w+)\s+(\|[|o{}]--[|o{}]\||\}[|o{}]--[|o{}]\{|\|[|o{}]--[|o{}]\{|\}[|o{}]--[|o{}]\|)\s+(\w+)\s*:\s*(.+)$/;
        const erdMatch = trimmed.match(erdPattern);

        if (erdMatch) {
          const [, , entity1, relationship, entity2, label] = erdMatch;
          const actualLeadingSpace = line.match(/^(\s*)/)?.[1] || '';

          // Check if label is already quoted
          const isAlreadyQuoted = (label.startsWith('"') && label.endsWith('"')) ||
            (label.startsWith("'") && label.endsWith("'"));

          if (!isAlreadyQuoted) {
            // Check if label contains special characters that need quoting
            const needsQuoting = /[\/|(){}\[\]<>"'\\]/.test(label);

            if (needsQuoting) {
              const escapedLabel = label.replace(/"/g, "'");
              return `${actualLeadingSpace}${entity1} ${relationship} ${entity2} : "${escapedLabel}"`;
            }
          }
        }

        return processedLine;
      }

      // Match all node label patterns with various bracket types
      // First, handle double brackets (must come before single brackets): [[label]], ((label))
      const doubleBracketPattern = /(\w+)(\[\[|\(\()([^[\]()]*?)(\]\]|\)\))/g;
      processedLine = processedLine.replace(doubleBracketPattern, (match, id, openBracket, content, closeBracket) => {
        if ((content.startsWith('"') && content.endsWith('"')) ||
          (content.startsWith("'") && content.endsWith("'"))) {
          return match;
        }
        // Convert already-escaped quotes to single quotes
        if (content.includes('\\"') || content.includes("\\'")) {
          const fixedContent = content.replace(/\\"/g, "'").replace(/\\'/g, "'");
          return `${id}${openBracket}"${fixedContent}"${closeBracket}`;
        }
        const hasSpecialChars = /[(){}[\]"'<>|\\-]/.test(content);
        if (hasSpecialChars) {
          const escapedContent = content.replace(/"/g, "'");
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
        if (content.includes('\\"') || content.includes("\\'")) {
          const fixedContent = content.replace(/\\"/g, "'").replace(/\\'/g, "'");
          return `${id}${openBracket}"${fixedContent}"${closeBracket}`;
        }
        const hasSpecialChars = /[(){}[\]"'<>|\\-]/.test(content);
        if (hasSpecialChars) {
          const escapedContent = content.replace(/"/g, "'");
          return `${id}${openBracket}"${escapedContent}"${closeBracket}`;
        }
        return match;
      });

      // Finally handle single brackets/parens/braces: [label], (label), {label}
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

        if (content.includes('\\"') || content.includes("\\'")) {
          const fixedContent = content.replace(/\\"/g, "'").replace(/\\'/g, "'");
          return `${id}${openBracket}"${fixedContent}"${closeBracket}`;
        }

        const hasSpecialChars = /[(){}[\]"'<>|\\-]/.test(content);
        if (hasSpecialChars) {
          const escapedContent = content.replace(/"/g, "'");
          return `${id}${openBracket}"${escapedContent}"${closeBracket}`;
        }
        return match;
      });

      // Also handle edge labels that might have special characters
      // Pattern: -->|label| or -.->, etc.
      processedLine = processedLine.replace(
        /(-{1,2}>|={1,2}>|\.{1,2}>)\s*\|([^|]+)\|/g,
        (match, arrow, label) => {
          // Skip if already quoted
          if ((label.startsWith('"') && label.endsWith('"')) ||
            (label.startsWith("'") && label.endsWith("'"))) {
            return match;
          }

          if (label.includes('\\"') || label.includes("\\'")) {
            const fixedLabel = label.replace(/\\"/g, "'").replace(/\\'/g, "'");
            return `${arrow}|"${fixedLabel}"|`;
          }

          const hasSpecialChars = /[(){}[\]"'<>|\\-]/.test(label);
          if (hasSpecialChars) {
            const escapedLabel = label.replace(/"/g, "'");
            return `${arrow}|"${escapedLabel}"|`;
          }

          return match;
        }
      );

      return processedLine;
    }).join('\n');
  }

  /**
   * Extract Mermaid code from AI response
   */
  private extractMermaidCode(content: string): string | null {
    let code: string | null = null;

    // Try to find mermaid code block
    const mermaidMatch = content.match(/```mermaid\s*([\s\S]*?)```/i);
    if (mermaidMatch && mermaidMatch[1]) {
      code = mermaidMatch[1].trim();
    }

    // Try generic code block
    if (!code) {
      const codeMatch = content.match(/```\s*([\s\S]*?)```/);
      if (codeMatch && codeMatch[1]) {
        const extracted = codeMatch[1].trim();
        // Validate it looks like mermaid (allow all types for backward compatibility)
        if (
          extracted.startsWith('flowchart') ||
          extracted.startsWith('graph') ||
          extracted.startsWith('sequenceDiagram') ||
          extracted.startsWith('erDiagram') ||
          extracted.startsWith('gantt') ||
          extracted.startsWith('stateDiagram') ||
          extracted.startsWith('journey') ||
          extracted.startsWith('pie')
        ) {
          code = extracted;
        }
      }
    }

    // Check if the entire content is mermaid code (no code fences - allow all for backward compatibility)
    if (!code) {
      const trimmed = content.trim();
      if (
        trimmed.startsWith('flowchart') ||
        trimmed.startsWith('graph') ||
        trimmed.startsWith('sequenceDiagram') ||
        trimmed.startsWith('erDiagram') ||
        trimmed.startsWith('gantt') ||
        trimmed.startsWith('stateDiagram') ||
        trimmed.startsWith('journey') ||
        trimmed.startsWith('pie')
      ) {
        code = trimmed;
      }
    }

    // Sanitize the code to fix common issues like unquoted parentheses
    if (code) {
      return this.sanitizeMermaidCode(code);
    }

    return null;
  }

  /**
   * Validate Mermaid syntax (basic validation)
   */
  private validateMermaidSyntax(
    code: string,
    expectedType: MermaidDiagramType
  ): { valid: boolean; error?: string } {
    const trimmed = code.trim();

    // Check for basic structure
    if (!trimmed) {
      return { valid: false, error: 'Empty diagram code' };
    }

    // Type-specific validation (only flowchart and sequenceDiagram supported)
    const typeChecks: Record<MermaidDiagramType, string[]> = {
      flowchart: ['flowchart', 'graph'],
      sequenceDiagram: ['sequenceDiagram'],
    };

    const validPrefixes = typeChecks[expectedType];
    const hasValidPrefix = validPrefixes.some(prefix =>
      trimmed.toLowerCase().startsWith(prefix.toLowerCase())
    );

    if (!hasValidPrefix) {
      return {
        valid: false,
        error: `Expected ${expectedType} but got different diagram type`,
      };
    }

    // Check for common syntax errors
    const openBrackets = (trimmed.match(/\[/g) || []).length;
    const closeBrackets = (trimmed.match(/\]/g) || []).length;
    if (openBrackets !== closeBrackets) {
      return { valid: false, error: 'Mismatched brackets in diagram' };
    }

    const openParens = (trimmed.match(/\(/g) || []).length;
    const closeParens = (trimmed.match(/\)/g) || []).length;
    if (openParens !== closeParens) {
      return { valid: false, error: 'Mismatched parentheses in diagram' };
    }

    return { valid: true };
  }
}

// Export singleton instance
export const mermaidGenerator = new MermaidGeneratorService();

export default mermaidGenerator;

