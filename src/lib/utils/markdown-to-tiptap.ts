/**
 * Markdown to TipTap JSON Converter
 * 
 * Converts markdown text to TipTap's JSON document format for proper rendering
 * with headings, bold text, bullet lists, etc.
 */

interface TipTapNode {
  type: string;
  attrs?: Record<string, unknown>;
  content?: TipTapNode[];
  text?: string;
  marks?: TipTapMark[];
}

// Special marker for inline canvas/excalidraw nodes in markdown
// Format: <!--excalidraw:BASE64_ENCODED_DATA-->
const EXCALIDRAW_MARKER_START = '<!--excalidraw:';
const EXCALIDRAW_MARKER_END = '-->';
const EXCALIDRAW_MARKER_REGEX = /<!--excalidraw:([A-Za-z0-9+/=]+)-->/g;

interface TipTapMark {
  type: string;
  attrs?: Record<string, unknown>;
}

/**
 * Parses inline markdown (bold, italic, code) and returns TipTap text nodes with marks
 */
function parseInlineMarks(text: string): TipTapNode[] {
  const nodes: TipTapNode[] = [];
  let remaining = text;

  while (remaining.length > 0) {
    // Check for bold (**text** or __text__)
    const boldMatch = remaining.match(/^\*\*(.+?)\*\*|^__(.+?)__/);
    if (boldMatch) {
      const boldText = boldMatch[1] || boldMatch[2];
      // Recursively parse for nested marks
      const innerNodes = parseInlineMarks(boldText);
      innerNodes.forEach(node => {
        if (node.text) {
          nodes.push({
            type: 'text',
            text: node.text,
            marks: [...(node.marks || []), { type: 'bold' }],
          });
        }
      });
      remaining = remaining.slice(boldMatch[0].length);
      continue;
    }

    // Check for italic (*text* or _text_) - but not **
    const italicMatch = remaining.match(/^\*([^*]+?)\*|^_([^_]+?)_/);
    if (italicMatch && !remaining.startsWith('**')) {
      const italicText = italicMatch[1] || italicMatch[2];
      const innerNodes = parseInlineMarks(italicText);
      innerNodes.forEach(node => {
        if (node.text) {
          nodes.push({
            type: 'text',
            text: node.text,
            marks: [...(node.marks || []), { type: 'italic' }],
          });
        }
      });
      remaining = remaining.slice(italicMatch[0].length);
      continue;
    }

    // Check for inline code (`code`)
    const codeMatch = remaining.match(/^`([^`]+?)`/);
    if (codeMatch) {
      nodes.push({
        type: 'text',
        text: codeMatch[1],
        marks: [{ type: 'code' }],
      });
      remaining = remaining.slice(codeMatch[0].length);
      continue;
    }

    // Find the next special character or end of string
    const nextSpecial = remaining.search(/\*|_|`/);
    if (nextSpecial === -1) {
      // No more special characters, add remaining as plain text
      if (remaining.length > 0) {
        nodes.push({
          type: 'text',
          text: remaining,
        });
      }
      break;
    } else if (nextSpecial === 0) {
      // Special character at start but no match - treat as plain text
      nodes.push({
        type: 'text',
        text: remaining[0],
      });
      remaining = remaining.slice(1);
    } else {
      // Add text before the special character
      nodes.push({
        type: 'text',
        text: remaining.slice(0, nextSpecial),
      });
      remaining = remaining.slice(nextSpecial);
    }
  }

  return nodes;
}

/**
 * Creates a paragraph node with parsed inline content
 */
function createParagraph(text: string): TipTapNode {
  const content = parseInlineMarks(text.trim());
  return {
    type: 'paragraph',
    content: content.length > 0 ? content : undefined,
  };
}

/**
 * Creates a heading node
 */
function createHeading(level: number, text: string): TipTapNode {
  const content = parseInlineMarks(text.trim());
  return {
    type: 'heading',
    attrs: { level },
    content: content.length > 0 ? content : undefined,
  };
}

/**
 * Creates a bullet list from multiple list items
 */
function createBulletList(items: string[]): TipTapNode {
  return {
    type: 'bulletList',
    content: items.map(item => ({
      type: 'listItem',
      content: [createParagraph(item)],
    })),
  };
}

/**
 * Creates an ordered list from multiple list items
 */
function createOrderedList(items: string[]): TipTapNode {
  return {
    type: 'orderedList',
    content: items.map(item => ({
      type: 'listItem',
      content: [createParagraph(item)],
    })),
  };
}

/**
 * Creates a blockquote node
 */
function createBlockquote(text: string): TipTapNode {
  return {
    type: 'blockquote',
    content: [createParagraph(text)],
  };
}

/**
 * Creates a horizontal rule node
 */
function createHorizontalRule(): TipTapNode {
  return {
    type: 'horizontalRule',
  };
}

/**
 * Creates a code block node
 */
function createCodeBlock(code: string, language?: string): TipTapNode {
  return {
    type: 'codeBlock',
    attrs: language ? { language } : undefined,
    content: [{
      type: 'text',
      text: code,
    }],
  };
}

/**
 * Creates a mermaid diagram node
 */
function createMermaid(code: string): TipTapNode {
  return {
    type: 'mermaid',
    attrs: {
      code,
      title: null,
    },
  };
}

/**
 * Creates an excalidraw node from stored data
 */
function createExcalidraw(data: unknown, minHeight: number = 400): TipTapNode {
  return {
    type: 'excalidraw',
    attrs: {
      data,
      minHeight,
    },
  };
}

/**
 * Creates a task list from multiple task items
 */
function createTaskList(items: { text: string; checked: boolean }[]): TipTapNode {
  return {
    type: 'taskList',
    content: items.map(item => ({
      type: 'taskItem',
      attrs: { checked: item.checked },
      content: [createParagraph(item.text)],
    })),
  };
}

/**
 * Creates an image node
 */
function createImage(src: string, alt: string = '', title: string = ''): TipTapNode {
  return {
    type: 'image',
    attrs: {
      src,
      alt,
      title: title || null,
    },
  };
}

/**
 * Creates a table node from rows of cells
 */
function createTable(rows: string[][], hasHeader: boolean = true): TipTapNode {
  return {
    type: 'table',
    content: rows.map((row, rowIndex) => ({
      type: 'tableRow',
      content: row.map(cellText => ({
        type: rowIndex === 0 && hasHeader ? 'tableHeader' : 'tableCell',
        content: [createParagraph(cellText.replace(/\\\|/g, '|'))], // Unescape pipes
      })),
    })),
  };
}

/**
 * Converts markdown string to TipTap JSON document format
 * Preserves excalidraw canvas nodes using special markers
 */
export function markdownToTipTap(markdown: string): TipTapNode {
  const lines = markdown.split('\n');
  const content: TipTapNode[] = [];
  
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Skip empty lines
    if (trimmedLine === '') {
      i++;
      continue;
    }

    // Check for excalidraw marker (<!--excalidraw:BASE64_DATA-->)
    const excalidrawMatch = trimmedLine.match(/^<!--excalidraw:([A-Za-z0-9+/=]+)-->$/);
    if (excalidrawMatch) {
      try {
        // Use safe base64 decode that handles unicode characters
        const jsonString = safeBase64Decode(excalidrawMatch[1]);
        if (jsonString) {
          const excalidrawData = JSON.parse(jsonString);
          content.push(createExcalidraw(excalidrawData.data, excalidrawData.minHeight || 400));
        }
      } catch (e) {
        console.warn('Failed to parse excalidraw marker:', e);
      }
      i++;
      continue;
    }

    // Check for code block (```)
    if (trimmedLine.startsWith('```')) {
      const language = trimmedLine.slice(3).trim() || undefined;
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // Skip closing ```

      // Convert mermaid code blocks to mermaid nodes for proper rendering
      if (language?.toLowerCase() === 'mermaid') {
        content.push(createMermaid(codeLines.join('\n')));
      } else {
        content.push(createCodeBlock(codeLines.join('\n'), language));
      }
      continue;
    }

    // Check for headings (# ## ###)
    const headingMatch = trimmedLine.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = Math.min(headingMatch[1].length, 3) as 1 | 2 | 3;
      content.push(createHeading(level, headingMatch[2]));
      i++;
      continue;
    }

    // Check for horizontal rule (--- or ***) - but not table separator
    // Table separator has pipes, so we check for that
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(trimmedLine) && !trimmedLine.includes('|')) {
      content.push(createHorizontalRule());
      i++;
      continue;
    }

    // Check for image (![alt](src "title") or ![alt](src))
    const imageMatch = trimmedLine.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/);
    if (imageMatch) {
      content.push(createImage(imageMatch[2], imageMatch[1], imageMatch[3] || ''));
      i++;
      continue;
    }

    // Check for table (| cell | cell |)
    if (trimmedLine.startsWith('|') && trimmedLine.endsWith('|')) {
      const tableRows: string[][] = [];
      let hasSeparator = false;
      
      while (i < lines.length && lines[i].trim().startsWith('|') && lines[i].trim().endsWith('|')) {
        const rowLine = lines[i].trim();
        // Check if this is a separator row (| --- | --- |)
        if (/^\|[\s\-:|]+\|$/.test(rowLine)) {
          hasSeparator = true;
          i++;
          continue; // Skip separator row
        }
        // Parse cells - split by | and trim, ignoring first and last empty strings
        const cells = rowLine.split('|').slice(1, -1).map(cell => cell.trim());
        tableRows.push(cells);
        i++;
      }
      
      if (tableRows.length > 0) {
        content.push(createTable(tableRows, hasSeparator));
      }
      continue;
    }

    // Check for blockquote (>)
    if (trimmedLine.startsWith('>')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].trim().startsWith('>')) {
        quoteLines.push(lines[i].trim().replace(/^>\s*/, ''));
        i++;
      }
      content.push(createBlockquote(quoteLines.join(' ')));
      continue;
    }

    // Check for task list (- [ ] or - [x])
    const taskMatch = trimmedLine.match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/);
    if (taskMatch) {
      const taskItems: { text: string; checked: boolean }[] = [];
      while (i < lines.length) {
        const taskItemMatch = lines[i].trim().match(/^[-*+]\s+\[([ xX])\]\s+(.*)$/);
        if (taskItemMatch) {
          taskItems.push({
            checked: taskItemMatch[1].toLowerCase() === 'x',
            text: taskItemMatch[2],
          });
          i++;
        } else {
          break;
        }
      }
      content.push(createTaskList(taskItems));
      continue;
    }

    // Check for unordered list (- or * or +) - but not task list
    if (/^[-*+]\s+(?!\[[ xX]\])/.test(trimmedLine)) {
      const items: string[] = [];
      while (i < lines.length && /^[-*+]\s+(?!\[[ xX]\])/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^[-*+]\s+/, ''));
        i++;
      }
      content.push(createBulletList(items));
      continue;
    }

    // Check for ordered list (1. 2. etc)
    if (/^\d+\.\s+/.test(trimmedLine)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i].trim())) {
        items.push(lines[i].trim().replace(/^\d+\.\s+/, ''));
        i++;
      }
      content.push(createOrderedList(items));
      continue;
    }

    // Default: paragraph
    // Collect consecutive non-empty, non-special lines into a single paragraph
    const paragraphLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('>') &&
      !lines[i].trim().startsWith('```') &&
      !lines[i].trim().startsWith('<!--excalidraw:') &&
      !lines[i].trim().startsWith('|') &&
      !/^!\[/.test(lines[i].trim()) &&
      !/^[-*+]\s+/.test(lines[i].trim()) &&
      !/^\d+\.\s+/.test(lines[i].trim()) &&
      !/^(-{3,}|\*{3,}|_{3,})$/.test(lines[i].trim())
    ) {
      paragraphLines.push(lines[i].trim());
      i++;
    }
    
    if (paragraphLines.length > 0) {
      content.push(createParagraph(paragraphLines.join(' ')));
    }
  }

  return {
    type: 'doc',
    content: content.length > 0 ? content : [{ type: 'paragraph' }],
  };
}

/**
 * Converts markdown string to TipTap JSON string
 */
export function markdownToTipTapJson(markdown: string): string {
  return JSON.stringify(markdownToTipTap(markdown));
}

/**
 * Safely encode a string to base64, handling unicode characters
 * Standard btoa() fails on unicode, so we need to encode to UTF-8 first
 */
function safeBase64Encode(str: string): string {
  try {
    // First, encode the string to UTF-8 bytes, then to base64
    const utf8Bytes = new TextEncoder().encode(str);
    const binaryString = Array.from(utf8Bytes, byte => String.fromCharCode(byte)).join('');
    return btoa(binaryString);
  } catch (e) {
    console.warn('Failed to encode string to base64:', e);
    return '';
  }
}

/**
 * Safely decode a base64 string, handling unicode characters
 */
function safeBase64Decode(base64: string): string {
  try {
    const binaryString = atob(base64);
    const utf8Bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      utf8Bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder().decode(utf8Bytes);
  } catch (e) {
    console.warn('Failed to decode base64 string:', e);
    return '';
  }
}

/**
 * Converts TipTap JSON back to markdown string
 * Preserves excalidraw canvas nodes using special markers
 */
export function tipTapToMarkdown(doc: TipTapNode): string {
  const lines: string[] = [];

  function processNode(node: TipTapNode, depth: number = 0): void {
    switch (node.type) {
      case 'doc':
        node.content?.forEach(child => processNode(child, depth));
        break;

      case 'heading':
        const level = (node.attrs?.level as number) || 1;
        const headingText = extractText(node);
        lines.push('#'.repeat(level) + ' ' + headingText);
        lines.push('');
        break;

      case 'paragraph':
        const paraText = extractText(node);
        if (paraText) {
          lines.push(paraText);
          lines.push('');
        }
        break;

      case 'bulletList':
        node.content?.forEach(item => {
          const itemText = extractText(item);
          lines.push('* ' + itemText);
        });
        lines.push('');
        break;

      case 'orderedList':
        node.content?.forEach((item, index) => {
          const itemText = extractText(item);
          lines.push(`${index + 1}. ` + itemText);
        });
        lines.push('');
        break;

      case 'taskList':
        // Task lists with checkboxes
        node.content?.forEach(item => {
          const checked = item.attrs?.checked ? 'x' : ' ';
          const itemText = extractText(item);
          lines.push(`- [${checked}] ${itemText}`);
        });
        lines.push('');
        break;

      case 'taskItem':
        // Individual task item (when processed outside of taskList context)
        const taskChecked = node.attrs?.checked ? 'x' : ' ';
        const taskText = extractText(node);
        lines.push(`- [${taskChecked}] ${taskText}`);
        break;

      case 'listItem':
        // Individual list item (when processed outside of list context)
        const listItemText = extractText(node);
        lines.push('* ' + listItemText);
        break;

      case 'blockquote':
        const quoteText = extractText(node);
        lines.push('> ' + quoteText);
        lines.push('');
        break;

      case 'codeBlock':
        const lang = node.attrs?.language || '';
        lines.push('```' + lang);
        lines.push(extractText(node));
        lines.push('```');
        lines.push('');
        break;

      case 'mermaid':
        // Preserve mermaid diagrams as mermaid code blocks
        const mermaidCode = node.attrs?.code || '';
        lines.push('```mermaid');
        lines.push(String(mermaidCode));
        lines.push('```');
        lines.push('');
        break;

      case 'horizontalRule':
        lines.push('---');
        lines.push('');
        break;

      case 'image':
        // Preserve images with markdown syntax
        const src = node.attrs?.src || '';
        const alt = node.attrs?.alt || '';
        const title = node.attrs?.title || '';
        if (src) {
          if (title) {
            lines.push(`![${alt}](${src} "${title}")`);
          } else {
            lines.push(`![${alt}](${src})`);
          }
          lines.push('');
        }
        break;

      case 'table':
        // Convert table to markdown table format
        if (node.content && node.content.length > 0) {
          const rows: string[][] = [];
          let hasHeader = false;
          
          node.content.forEach((row, rowIndex) => {
            if (row.type === 'tableRow') {
              const cells: string[] = [];
              row.content?.forEach(cell => {
                const cellText = extractText(cell).replace(/\|/g, '\\|'); // Escape pipes
                cells.push(cellText);
                if (cell.type === 'tableHeader') {
                  hasHeader = true;
                }
              });
              rows.push(cells);
            }
          });
          
          if (rows.length > 0) {
            // Output first row
            lines.push('| ' + rows[0].join(' | ') + ' |');
            
            // Output separator row after header (or first row if no explicit header)
            if (rows[0].length > 0) {
              const separator = rows[0].map(() => '---').join(' | ');
              lines.push('| ' + separator + ' |');
            }
            
            // Output remaining rows
            for (let i = 1; i < rows.length; i++) {
              lines.push('| ' + rows[i].join(' | ') + ' |');
            }
            lines.push('');
          }
        }
        break;

      case 'tableRow':
      case 'tableCell':
      case 'tableHeader':
        // These are handled within 'table' case, but if encountered standalone,
        // just extract text content
        const cellContent = extractText(node);
        if (cellContent) {
          lines.push(cellContent);
          lines.push('');
        }
        break;

      case 'excalidraw':
        // Preserve excalidraw canvas data as a special marker
        // Store both the data and minHeight in the marker
        try {
          const excalidrawPayload = {
            data: node.attrs?.data || null,
            minHeight: node.attrs?.minHeight || 400,
          };
          const jsonString = JSON.stringify(excalidrawPayload);
          // Use safe base64 encoding that handles unicode characters
          const base64Data = safeBase64Encode(jsonString);
          if (base64Data) {
            lines.push(`${EXCALIDRAW_MARKER_START}${base64Data}${EXCALIDRAW_MARKER_END}`);
            lines.push('');
          }
        } catch (e) {
          console.warn('Failed to serialize excalidraw data:', e);
        }
        break;

      default:
        // For any unknown node types, try to preserve their content
        // by recursively processing children or extracting text
        if (node.content && node.content.length > 0) {
          // If the node has children, process them recursively
          node.content.forEach(child => processNode(child, depth));
        } else {
          // If no children, try to extract any text content
          const unknownText = extractText(node);
          if (unknownText) {
            lines.push(unknownText);
            lines.push('');
          }
        }
        break;
    }
  }

  function extractText(node: TipTapNode): string {
    if (node.text) {
      let text = node.text;
      if (node.marks) {
        node.marks.forEach(mark => {
          if (mark.type === 'bold') {
            text = `**${text}**`;
          } else if (mark.type === 'italic') {
            text = `*${text}*`;
          } else if (mark.type === 'code') {
            text = `\`${text}\``;
          }
        });
      }
      return text;
    }
    if (node.content) {
      return node.content.map(child => extractText(child)).join('');
    }
    return '';
  }

  processNode(doc);
  
  // Remove trailing empty lines and join
  while (lines.length > 0 && lines[lines.length - 1] === '') {
    lines.pop();
  }
  
  return lines.join('\n');
}

export default markdownToTipTap;
