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

  // Check for valid diagram type (RESTRICTED to flowchart and sequenceDiagram only)
  const validTypes = [
    'flowchart',
    'graph',
    'sequenceDiagram',
  ];

  // Disabled types that are prone to parsing errors
  const disabledTypes = [
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

  const hasDisabledType = disabledTypes.some(type =>
    trimmed.toLowerCase().startsWith(type.toLowerCase())
  );

  if (hasDisabledType) {
    return {
      valid: false,
      error: `This diagram type is disabled due to frequent parsing errors. Only flowchart and sequenceDiagram are supported.`,
    };
  }

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
 * Sanitize ERD attribute definitions
 * Fixes common issues:
 * - Multiple attributes on same line
 * - Missing type or name
 * - Invalid attribute format
 * 
 * Valid ERD attribute format: type name [PK|FK|UK] ["comment"]
 * Example: string email PK "user email"
 */
function sanitizeERDAttributes(lines: string[]): string[] {
  const result: string[] = [];
  let insideEntityBlock = false;
  let entityIndent = '';
  let currentEntityName = '';

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // Detect start of entity block: ENTITY_NAME {
    const entityStartMatch = trimmed.match(/^(\w+)\s*\{$/);
    if (entityStartMatch) {
      insideEntityBlock = true;
      currentEntityName = entityStartMatch[1];
      entityIndent = line.match(/^(\s*)/)?.[1] || '';
      result.push(line);
      continue;
    }

    // Detect end of entity block
    if (insideEntityBlock && trimmed === '}') {
      insideEntityBlock = false;
      currentEntityName = '';
      result.push(line);
      continue;
    }

    // Process attribute lines inside entity block
    if (insideEntityBlock && trimmed !== '' && !trimmed.startsWith('%%')) {
      const leadingSpace = line.match(/^(\s*)/)?.[1] || '        ';
      
      // Try to parse and fix the attribute line
      const fixedAttributes = parseAndFixERDAttribute(trimmed, leadingSpace);
      result.push(...fixedAttributes);
      continue;
    }

    // Pass through all other lines unchanged
    result.push(line);
  }

  return result;
}

/**
 * Parse and fix ERD attribute line
 * Handles cases like:
 * - "string name PK string email" -> two separate attributes
 * - "attendance_code_id PK FK bool is_active" -> two separate attributes
 */
function parseAndFixERDAttribute(line: string, indent: string): string[] {
  // Common ERD types
  const erdTypes = ['string', 'int', 'integer', 'float', 'double', 'decimal', 'number', 
                    'bool', 'boolean', 'date', 'datetime', 'timestamp', 'time', 
                    'text', 'varchar', 'char', 'uuid', 'bigint', 'smallint',
                    'json', 'jsonb', 'array', 'enum', 'serial', 'bytea', 'blob'];
  
  // ERD constraint keywords
  const constraints = ['PK', 'FK', 'UK'];
  
  // Split by whitespace
  const tokens = line.split(/\s+/).filter(t => t.length > 0);
  
  if (tokens.length === 0) {
    return [indent + line];
  }

  // Check if first token looks like a type
  const firstTokenIsType = erdTypes.some(t => tokens[0].toLowerCase() === t.toLowerCase());
  
  // Valid attribute: type name [PK|FK|UK] ["comment"]
  // If line looks valid (type + name + optional constraints), return as-is
  if (firstTokenIsType && tokens.length >= 2 && tokens.length <= 4) {
    // Check if remaining tokens are valid (name + optional constraints)
    const hasValidStructure = tokens.slice(2).every(t => 
      constraints.includes(t.toUpperCase()) || 
      (t.startsWith('"') && t.endsWith('"'))
    );
    if (hasValidStructure || tokens.length === 2) {
      return [indent + line];
    }
  }

  // Try to detect multiple attributes on same line
  // Pattern: type1 name1 [PK|FK] type2 name2 [PK|FK] ...
  const attributes: string[] = [];
  let currentAttr: string[] = [];
  let expectingType = true;

  for (let i = 0; i < tokens.length; i++) {
    const token = tokens[i];
    const isType = erdTypes.some(t => token.toLowerCase() === t.toLowerCase());
    const isConstraint = constraints.includes(token.toUpperCase());
    const isComment = token.startsWith('"');

    if (expectingType && isType) {
      // If we have a pending attribute, save it
      if (currentAttr.length >= 2) {
        attributes.push(currentAttr.join(' '));
      }
      currentAttr = [token];
      expectingType = false;
    } else if (!expectingType && currentAttr.length === 1 && !isType && !isConstraint) {
      // This should be the attribute name
      currentAttr.push(token);
    } else if (!expectingType && currentAttr.length >= 2 && isConstraint) {
      // Add constraint to current attribute
      currentAttr.push(token);
    } else if (!expectingType && currentAttr.length >= 2 && isComment) {
      // Add comment to current attribute
      currentAttr.push(token);
    } else if (!expectingType && currentAttr.length >= 2 && isType) {
      // New type found - save current and start new
      attributes.push(currentAttr.join(' '));
      currentAttr = [token];
      expectingType = false;
    } else if (currentAttr.length === 1 && !isType) {
      // Name after type
      currentAttr.push(token);
    } else {
      // Unknown token - try to add to current attribute
      if (currentAttr.length > 0) {
        currentAttr.push(token);
      } else {
        // Start new attribute (might be name without type)
        currentAttr = [token];
        expectingType = false;
      }
    }
  }

  // Don't forget the last attribute
  if (currentAttr.length >= 1) {
    // If we only have a name without type, prepend a generic type
    if (currentAttr.length === 1 && !erdTypes.some(t => currentAttr[0].toLowerCase() === t.toLowerCase())) {
      // Check if it's just a constraint - skip it
      if (!constraints.includes(currentAttr[0].toUpperCase())) {
        currentAttr.unshift('string');
      }
    }
    if (currentAttr.length >= 2 || (currentAttr.length === 1 && erdTypes.some(t => currentAttr[0].toLowerCase() === t.toLowerCase()))) {
      attributes.push(currentAttr.join(' '));
    }
  }

  // If we found multiple attributes, return them on separate lines
  if (attributes.length > 1) {
    console.warn(`Fixed ERD attributes - split into ${attributes.length} separate lines:`, attributes);
    return attributes.map(attr => indent + attr);
  }

  // If we found exactly one attribute (or fixed one), return it
  if (attributes.length === 1) {
    return [indent + attributes[0]];
  }

  // Fallback: return original line (might cause error but at least it's visible)
  return [indent + line];
}

/**
 * Sanitize Mermaid code to fix common syntax issues
 * This is the same logic used in the renderer, extracted for reuse
 * - Special handling for ERD relationship labels with special characters
 * - Fixes ERD attribute definitions (ensures proper format)
 * - Prevents double-escaping of already-escaped quotes
 */
export function sanitizeMermaidCode(code: string): string {
  const lines = code.split('\n');

  // Detect diagram type for specialized handling
  const isERD = lines.some(line => line.trim().startsWith('erDiagram'));

  // For ERD diagrams, pre-process to fix attribute blocks
  let processedLines = lines;
  if (isERD) {
    processedLines = sanitizeERDAttributes(lines);
  }

  // First pass: detect and fix incomplete arrows (skip for ERD as they use different syntax)
  const fixedLines = processedLines.map((line, index) => {
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

    // Skip incomplete arrow detection for ERD diagrams (they use ||--o{ syntax)
    if (isERD) {
      return line;
    }

    // Check if line ends with an incomplete arrow (arrow without target)
    // Patterns: -->, ===>, -.->, etc. at end of line
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
    const trimmed = line.trim();

    // Skip lines that are just diagram type declarations or empty
    if (
      trimmed.startsWith('flowchart') ||
      trimmed.startsWith('graph') ||
      trimmed.startsWith('sequenceDiagram') ||
      trimmed.startsWith('erDiagram') ||
      trimmed.startsWith('gantt') ||
      trimmed.startsWith('stateDiagram') ||
      trimmed.startsWith('journey') ||
      trimmed.startsWith('pie') ||
      trimmed.startsWith('%%') || // Skip comments
      trimmed === ''
    ) {
      return line;
    }

    let processedLine = line;

    // ERD-specific handling: Quote relationship labels with special characters
    // ERD syntax: ENTITY1 ||--o{ ENTITY2 : "label" or ENTITY1 ||--o{ ENTITY2 : label
    if (isERD) {
      // Match ERD relationship pattern: ENTITY relationship ENTITY : label
      // Relationship patterns: ||--o{, }o--||, ||--|{, }|--||, ||--||, etc.
      const erdPattern = /^(\s*)(\w+)\s+([|}{o][-|}{o]+)\s+(\w+)\s*:\s*(.+)$/;
      const erdMatch = trimmed.match(erdPattern);

      if (erdMatch) {
        const [, , entity1, relationship, entity2, label] = erdMatch;
        const actualLeadingSpace = line.match(/^(\s*)/)?.[1] || '';

        // Check if label is already quoted
        const isAlreadyQuoted = (label.startsWith('"') && label.endsWith('"')) ||
          (label.startsWith("'") && label.endsWith("'"));

        if (!isAlreadyQuoted) {
          // Check if label contains special characters that need quoting
          // Forward slash, pipes, and other special chars need quoting in ERD labels
          const needsQuoting = /[\/|(){}\[\]<>"'\\]/.test(label);

          if (needsQuoting) {
            // Replace internal quotes with single quotes and wrap in quotes
            const escapedLabel = label.replace(/"/g, "'");
            return `${actualLeadingSpace}${entity1} ${relationship} ${entity2} : "${escapedLabel}"`;
          }
        }
      }

      // Attribute lines inside entity blocks are already handled by sanitizeERDAttributes
      return processedLine;
    }

    // Flowchart/other diagram handling:

    // Handle double brackets: [[label]], ((label))
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

    // Handle mixed brackets: [(label)], ([label])
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

      // Fix already-escaped quotes by converting to single quotes
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

    // Handle edge labels: -->|label| or -.->|label| etc.
    processedLine = processedLine.replace(
      /(-{1,2}>|={1,2}>|\.{1,2}>)\s*\|([^|]+)\|/g,
      (match, arrow, label) => {
        if ((label.startsWith('"') && label.endsWith('"')) ||
          (label.startsWith("'") && label.endsWith("'"))) {
          return match;
        }

        // Fix already-escaped quotes by converting to single quotes
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
