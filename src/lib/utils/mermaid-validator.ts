/**
 * Mermaid Diagram Validator
 * 
 * Provides client-side validation for Mermaid diagram syntax
 * to catch errors before rendering.
 */

export interface MermaidValidationResult {
  valid: boolean;
  error?: string;
  warnings?: string[];
  sanitizedCode?: string;
}

/**
 * Validate Mermaid diagram syntax
 */
export function validateMermaidDiagram(code: string): MermaidValidationResult {
  const trimmed = code.trim();
  const warnings: string[] = [];

  // Check for empty code
  if (!trimmed) {
    return { valid: false, error: 'Diagram code is empty' };
  }

  // Check for valid diagram type
  const validTypes = [
    'flowchart',
    'graph',
    'sequenceDiagram',
    'erDiagram',
    'gantt',
    'stateDiagram',
    'stateDiagram-v2',
    'journey',
    'pie',
    'classDiagram',
    'gitGraph',
  ];

  const hasValidType = validTypes.some(type =>
    trimmed.toLowerCase().startsWith(type.toLowerCase())
  );

  if (!hasValidType) {
    return {
      valid: false,
      error: `Diagram must start with a valid type: ${validTypes.join(', ')}`,
    };
  }

  // Check for balanced brackets
  const openBrackets = (trimmed.match(/\[/g) || []).length;
  const closeBrackets = (trimmed.match(/\]/g) || []).length;
  if (openBrackets !== closeBrackets) {
    return {
      valid: false,
      error: `Mismatched square brackets: ${openBrackets} opening, ${closeBrackets} closing`,
    };
  }

  // Check for balanced parentheses
  const openParens = (trimmed.match(/\(/g) || []).length;
  const closeParens = (trimmed.match(/\)/g) || []).length;
  if (openParens !== closeParens) {
    return {
      valid: false,
      error: `Mismatched parentheses: ${openParens} opening, ${closeParens} closing`,
    };
  }

  // Check for balanced braces
  const openBraces = (trimmed.match(/\{/g) || []).length;
  const closeBraces = (trimmed.match(/\}/g) || []).length;
  if (openBraces !== closeBraces) {
    return {
      valid: false,
      error: `Mismatched curly braces: ${openBraces} opening, ${closeBraces} closing`,
    };
  }

  // Check for unquoted special characters in labels
  const lines = trimmed.split('\n');
  const problematicLines: number[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    
    // Skip diagram type declarations and comments
    if (
      line.startsWith('flowchart') ||
      line.startsWith('graph') ||
      line.startsWith('sequenceDiagram') ||
      line.startsWith('erDiagram') ||
      line.startsWith('gantt') ||
      line.startsWith('stateDiagram') ||
      line.startsWith('journey') ||
      line.startsWith('pie') ||
      line.startsWith('%%') ||
      line === ''
    ) {
      continue;
    }

    // Look for labels with special characters that aren't quoted
    // Pattern: ID[Label] or ID(Label) where Label contains special chars
    const labelPattern = /(\w+)[\[\({]([^\]\)}]+)[\]\)}]/g;
    let match;

    while ((match = labelPattern.exec(line)) !== null) {
      const label = match[2];
      
      // Skip if already quoted
      if ((label.startsWith('"') && label.endsWith('"')) ||
          (label.startsWith("'") && label.endsWith("'"))) {
        continue;
      }

      // Check for special characters that need quoting
      if (/[(){}[\]"'<>|\\]/.test(label)) {
        problematicLines.push(i + 1);
        break;
      }
    }
  }

  if (problematicLines.length > 0) {
    warnings.push(
      `Lines ${problematicLines.join(', ')} contain special characters in labels. ` +
      `Consider wrapping labels in quotes for better compatibility.`
    );
  }

  // Sanitize the code to auto-fix common issues
  const sanitizedCode = sanitizeMermaidCode(trimmed);

  return {
    valid: true,
    warnings: warnings.length > 0 ? warnings : undefined,
    sanitizedCode: sanitizedCode !== trimmed ? sanitizedCode : undefined,
  };
}

/**
 * Sanitize Mermaid code to fix common syntax issues
 * This is the same logic used in the renderer, extracted for reuse
 */
export function sanitizeMermaidCode(code: string): string {
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
    if (
      line.trim().startsWith('flowchart') ||
      line.trim().startsWith('graph') ||
      line.trim().startsWith('sequenceDiagram') ||
      line.trim().startsWith('erDiagram') ||
      line.trim().startsWith('gantt') ||
      line.trim().startsWith('stateDiagram') ||
      line.trim().startsWith('journey') ||
      line.trim().startsWith('pie') ||
      line.trim().startsWith('%%') || // Skip comments
      line.trim() === ''
    ) {
      return line;
    }
    
    let processedLine = line;
    
    // Handle double brackets: [[label]], ((label))
    const doubleBracketPattern = /(\w+)(\[\[|\(\()([^[\]()]*?)(\]\]|\)\))/g;
    processedLine = processedLine.replace(doubleBracketPattern, (match, id, openBracket, content, closeBracket) => {
      if ((content.startsWith('"') && content.endsWith('"')) || 
          (content.startsWith("'") && content.endsWith("'"))) {
        return match;
      }
      const hasSpecialChars = /[(){}[\]"'<>|\\-]/.test(content);
      if (hasSpecialChars) {
        const escapedContent = content.replace(/"/g, '\\"');
        return `${id}${openBracket}"${escapedContent}"${closeBracket}`;
      }
      return match;
    });
    
    // Handle mixed brackets: [(label)], ([label])
    const mixedBracketPattern = /(\w+)(\[\(|\(\[)([^[\]()]*?)(\]\)|\)\])/g;
    processedLine = processedLine.replace(mixedBracketPattern, (match, id, openBracket, content, closeBracket) => {
      if ((content.startsWith('"') && content.endsWith('"')) || 
          (content.startsWith("'") && content.endsWith("'"))) {
        return match;
      }
      const hasSpecialChars = /[(){}[\]"'<>|\\-]/.test(content);
      if (hasSpecialChars) {
        const escapedContent = content.replace(/"/g, '\\"');
        return `${id}${openBracket}"${escapedContent}"${closeBracket}`;
      }
      return match;
    });
    
    // Handle single brackets/parens/braces: [label], (label), {label}
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
      
      const hasSpecialChars = /[(){}[\]"'<>|\\-]/.test(content);
      if (hasSpecialChars) {
        const escapedContent = content.replace(/"/g, '\\"');
        return `${id}${openBracket}"${escapedContent}"${closeBracket}`;
      }
      return match;
    });
    
    // Handle edge labels: -->|label| or -.->|label| etc.
    processedLine = processedLine.replace(
      /(-{1,2}>|={1,2}>|\.{1,2}>)\s*\|([^|]+)\|/g,
      (match, arrow, label) => {
        if ((label.startsWith('"') && label.endsWith('"')) || 
            (label.startsWith("'") && label.endsWith("'"))) {
          return match;
        }
        
        const hasSpecialChars = /[(){}[\]"'<>|\\-]/.test(label);
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

/**
 * Get helpful suggestions based on error message
 */
export function getMermaidErrorSuggestions(errorMessage: string): string[] {
  const suggestions: string[] = [];
  const lowerError = errorMessage.toLowerCase();

  if (lowerError.includes('expecting') && lowerError.includes('got')) {
    suggestions.push('Check for missing node IDs or incomplete syntax');
    suggestions.push('Ensure all connections use proper arrow syntax (-->, -.>, etc.)');
  }

  if (lowerError.includes('bracket') || lowerError.includes('parenthes')) {
    suggestions.push('Verify all brackets and parentheses are properly matched');
    suggestions.push('Wrap labels containing special characters in double quotes');
  }

  if (lowerError.includes('line')) {
    suggestions.push('Check the syntax on the specified line number');
    suggestions.push('Look for incomplete node definitions or missing arrows');
  }

  if (lowerError.includes('parse')) {
    suggestions.push('Validate the diagram structure matches Mermaid syntax');
    suggestions.push('Remove any unsupported characters or syntax');
  }

  // Default suggestions if no specific match
  if (suggestions.length === 0) {
    suggestions.push('Review the Mermaid documentation for correct syntax');
    suggestions.push('Try simplifying the diagram to isolate the issue');
  }

  return suggestions;
}
