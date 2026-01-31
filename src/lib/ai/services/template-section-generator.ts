/**
 * Template Section Generator Service
 * 
 * AI-powered service for generating, rearranging, and adding descriptions to template sections.
 */

import type { AIGenerateRequest, AIGenerateResponse, TemplateSection } from '@/types';
import { generateAIContent } from '../use-ai-service';

// ============================================================================
// JSON REPAIR UTILITIES
// ============================================================================

/**
 * Strips all markdown code fences from content, handling various formats.
 */
function stripMarkdownCodeFences(content: string): string {
  let result = content.trim();
  
  // Remove opening fence with language specifier (```json, ```javascript, etc.)
  result = result.replace(/^```(?:json|javascript|typescript|js|ts)?\s*\n?/i, '');
  
  // Remove closing fence (may or may not have trailing newline/whitespace)
  result = result.replace(/\n?\s*```\s*$/i, '');
  
  // Handle case where content might still have fences mid-stream
  // (e.g., if AI wrote something before the JSON)
  const jsonStartMatch = result.match(/```(?:json)?\s*\n?(\{[\s\S]*)/i);
  if (jsonStartMatch) {
    result = jsonStartMatch[1];
    result = result.replace(/\n?\s*```\s*$/i, '');
  }
  
  return result.trim();
}

/**
 * Extracts JSON object or array from text by finding balanced braces/brackets.
 */
function extractJsonFromText(content: string): string | null {
  // Find the first { or [
  const firstBrace = content.indexOf('{');
  const firstBracket = content.indexOf('[');
  
  let startChar: '{' | '[';
  let endChar: '}' | ']';
  let startIndex: number;
  
  if (firstBrace === -1 && firstBracket === -1) {
    return null;
  } else if (firstBrace === -1) {
    startChar = '[';
    endChar = ']';
    startIndex = firstBracket;
  } else if (firstBracket === -1) {
    startChar = '{';
    endChar = '}';
    startIndex = firstBrace;
  } else if (firstBrace < firstBracket) {
    startChar = '{';
    endChar = '}';
    startIndex = firstBrace;
  } else {
    startChar = '[';
    endChar = ']';
    startIndex = firstBracket;
  }
  
  // Find matching end bracket with proper nesting
  let depth = 0;
  let inString = false;
  let escaped = false;
  let endIndex = -1;
  
  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];
    
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }
    
    if (char === '"' && !escaped) {
      inString = !inString;
      continue;
    }
    
    if (!inString) {
      if (char === startChar) {
        depth++;
      } else if (char === endChar) {
        depth--;
        if (depth === 0) {
          endIndex = i;
          break;
        }
      }
    }
  }
  
  if (endIndex !== -1) {
    return content.substring(startIndex, endIndex + 1);
  }
  
  // Return partial content from start to end if no matching bracket found
  return content.substring(startIndex);
}

/**
 * Repairs truncated JSON by closing open strings and brackets.
 */
function repairTruncatedJson(content: string): string {
  let result = content;
  
  // Analyze the structure
  let openBraces = 0;
  let openBrackets = 0;
  let inString = false;
  let escaped = false;
  let lastValidIndex = -1;
  let lastCommaIndex = -1;
  let lastColonIndex = -1;
  
  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    
    if (escaped) {
      escaped = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      escaped = true;
      continue;
    }
    
    if (char === '"' && !escaped) {
      inString = !inString;
      if (!inString) {
        lastValidIndex = i;
      }
      continue;
    }
    
    if (!inString) {
      if (char === '{') {
        openBraces++;
        lastValidIndex = i;
      } else if (char === '}') {
        openBraces--;
        lastValidIndex = i;
      } else if (char === '[') {
        openBrackets++;
        lastValidIndex = i;
      } else if (char === ']') {
        openBrackets--;
        lastValidIndex = i;
      } else if (char === ',') {
        lastCommaIndex = i;
        lastValidIndex = i;
      } else if (char === ':') {
        lastColonIndex = i;
      }
    }
  }
  
  // If ended inside a string, we need to close it and possibly remove incomplete content
  if (inString) {
    // Find the last complete JSON value by looking for the last complete structure
    // Option 1: Cut at last comma and close
    // Option 2: Close the string and continue
    
    // Check if we're in the middle of a property value (after a colon)
    if (lastColonIndex > lastCommaIndex && lastColonIndex > -1) {
      // We're in a property value - try to close the string
      result = result + '"';
      console.log('[repairTruncatedJson] Closed unclosed string value');
    } else if (lastCommaIndex > 0) {
      // Cut at the last comma to remove incomplete property
      result = result.substring(0, lastCommaIndex);
      console.log('[repairTruncatedJson] Removed incomplete property (cut at comma)');
    } else {
      // Just close the string
      result = result + '"';
      console.log('[repairTruncatedJson] Closed unclosed string');
    }
    
    // Recount brackets after modification
    openBraces = 0;
    openBrackets = 0;
    inString = false;
    escaped = false;
    
    for (let i = 0; i < result.length; i++) {
      const char = result[i];
      
      if (escaped) {
        escaped = false;
        continue;
      }
      
      if (char === '\\' && inString) {
        escaped = true;
        continue;
      }
      
      if (char === '"' && !escaped) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') openBraces++;
        else if (char === '}') openBraces--;
        else if (char === '[') openBrackets++;
        else if (char === ']') openBrackets--;
      }
    }
  }
  
  // Remove trailing comma
  result = result.replace(/,\s*$/, '');
  
  // Close any open structures
  let closures = '';
  while (openBrackets > 0) {
    closures += ']';
    openBrackets--;
  }
  while (openBraces > 0) {
    closures += '}';
    openBraces--;
  }
  
  if (closures) {
    result += closures;
    console.log('[repairTruncatedJson] Added closing brackets:', closures);
  }
  
  return result;
}

/**
 * Fixes common JSON issues like literal newlines in strings.
 */
function fixJsonStringIssues(content: string): string {
  let result = '';
  let inString = false;
  let escapeNext = false;
  
  for (let i = 0; i < content.length; i++) {
    const char = content[i];
    const charCode = char.charCodeAt(0);
    
    if (escapeNext) {
      result += char;
      escapeNext = false;
      continue;
    }
    
    if (char === '\\' && inString) {
      result += char;
      escapeNext = true;
      continue;
    }
    
    if (char === '"' && !escapeNext) {
      inString = !inString;
      result += char;
      continue;
    }
    
    // If we're inside a string, escape control characters
    if (inString && charCode < 32) {
      switch (char) {
        case '\n':
          result += '\\n';
          break;
        case '\r':
          result += '\\r';
          break;
        case '\t':
          result += '\\t';
          break;
        case '\b':
          result += '\\b';
          break;
        case '\f':
          result += '\\f';
          break;
        default:
          // Escape other control characters as unicode
          result += '\\u' + charCode.toString(16).padStart(4, '0');
          break;
      }
    } else {
      result += char;
    }
  }
  
  // Remove trailing commas before } or ]
  result = result.replace(/,(\s*[}\]])/g, '$1');
  
  return result;
}

/**
 * Attempts to safely parse JSON with multiple fallback strategies.
 * Returns the parsed object or null if all strategies fail.
 */
function safeJsonParse(content: string): any | null {
  console.log('[safeJsonParse] Starting parse. Content length:', content.length);
  console.log('[safeJsonParse] Content preview:', content.substring(0, 200));
  
  // Strategy 1: Direct parse
  try {
    const result = JSON.parse(content);
    console.log('[safeJsonParse] ✅ Strategy 1 (direct parse) succeeded');
    return result;
  } catch (e) {
    console.log('[safeJsonParse] Strategy 1 failed, trying next...');
  }

  // Strategy 2: Strip markdown code fences and parse
  let cleanContent = stripMarkdownCodeFences(content);
  console.log('[safeJsonParse] After stripping markdown fences, length:', cleanContent.length);
  
  try {
    const result = JSON.parse(cleanContent);
    console.log('[safeJsonParse] ✅ Strategy 2 (markdown removal) succeeded');
    return result;
  } catch (e) {
    console.log('[safeJsonParse] Strategy 2 failed, trying next...');
  }

  // Strategy 3: Extract JSON from text using balanced brackets
  const extracted = extractJsonFromText(cleanContent);
  if (extracted) {
    console.log('[safeJsonParse] Extracted JSON, length:', extracted.length);
    
    try {
      const result = JSON.parse(extracted);
      console.log('[safeJsonParse] ✅ Strategy 3 (JSON extraction) succeeded');
      return result;
    } catch (e) {
      console.log('[safeJsonParse] Strategy 3 failed, trying next...');
    }
    
    // Strategy 4: Fix string issues in extracted JSON
    const fixed = fixJsonStringIssues(extracted);
    try {
      const result = JSON.parse(fixed);
      console.log('[safeJsonParse] ✅ Strategy 4 (string fix) succeeded');
      return result;
    } catch (e) {
      console.log('[safeJsonParse] Strategy 4 failed, trying next...');
    }
    
    // Strategy 5: Repair truncated JSON
    const repaired = repairTruncatedJson(fixed);
    console.log('[safeJsonParse] After repair, length:', repaired.length);
    console.log('[safeJsonParse] Repaired content preview:', repaired.substring(0, 300));
    
    try {
      const result = JSON.parse(repaired);
      console.log('[safeJsonParse] ✅ Strategy 5 (truncation repair) succeeded');
      return result;
    } catch (e) {
      console.log('[safeJsonParse] Strategy 5 failed:', e instanceof Error ? e.message : 'unknown error');
    }
    
    // Strategy 6: More aggressive repair - remove last incomplete object from array
    // Works for both "sections" and "descriptions" arrays
    const arrayPatterns = [
      { name: 'sections', pattern: /"sections"\s*:\s*\[/ },
      { name: 'descriptions', pattern: /"descriptions"\s*:\s*\[/ },
    ];
    
    for (const { name, pattern } of arrayPatterns) {
      if (!repaired.includes(`"${name}"`)) continue;
      
      try {
        const arrayMatch = repaired.match(pattern);
        if (arrayMatch && arrayMatch.index !== undefined) {
          const arrayStart = arrayMatch.index + arrayMatch[0].length;
          let depth = 1;
          let lastCompleteObject = arrayStart;
          let inStr = false;
          let esc = false;
          
          for (let i = arrayStart; i < repaired.length && depth > 0; i++) {
            const char = repaired[i];
            
            if (esc) {
              esc = false;
              continue;
            }
            
            if (char === '\\' && inStr) {
              esc = true;
              continue;
            }
            
            if (char === '"' && !esc) {
              inStr = !inStr;
              continue;
            }
            
            if (!inStr) {
              if (char === '{') depth++;
              else if (char === '}') {
                depth--;
                if (depth === 1) {
                  // We just closed an object in the array
                  lastCompleteObject = i + 1;
                }
              } else if (char === '[') depth++;
              else if (char === ']') depth--;
            }
          }
          
          // Reconstruct with only complete objects
          if (lastCompleteObject > arrayStart) {
            const reconstructed = repaired.substring(0, lastCompleteObject) + ']}';
            try {
              const result = JSON.parse(reconstructed);
              console.log(`[safeJsonParse] ✅ Strategy 6 (${name} array truncation) succeeded`);
              return result;
            } catch (e) {
              console.log(`[safeJsonParse] Strategy 6 (${name}) failed, trying next pattern...`);
            }
          }
        }
      } catch (e) {
        console.log(`[safeJsonParse] Strategy 6 (${name}) error:`, e);
      }
    }
  }

  // All strategies failed
  console.error('[safeJsonParse] ❌ All JSON parsing strategies failed');
  return null;
}

/**
 * Parse AI response with comprehensive error handling.
 * Throws an error with details if parsing fails completely.
 */
function parseAIJsonResponse(content: string, context: string): any {
  const parsed = safeJsonParse(content);

  if (parsed === null) {
    console.error(`Failed to parse AI response for ${context}. Raw content:`, content.substring(0, 500));
    throw new Error(`Failed to parse AI response for ${context}. Raw content: ${content.substring(0, 200)}`);
  }

  return parsed;
}

// ============================================================================
// TYPES
// ============================================================================

export interface GenerateNewSectionsOptions {
  templateName: string;
  templateDescription: string;
  existingSections: TemplateSection[];
  count?: number; // How many new sections to generate
}

export interface RearrangeSectionsOptions {
  templateName: string;
  templateDescription: string;
  sections: TemplateSection[];
}

export interface AddDescriptionsOptions {
  templateName: string;
  templateDescription: string;
  sections: TemplateSection[];
}

export interface GeneratedSections {
  sections: TemplateSection[];
  reasoning?: string;
}

export interface RearrangedSections {
  sections: TemplateSection[];
  reasoning?: string;
}

export interface SectionsWithDescriptions {
  sections: TemplateSection[];
  reasoning?: string;
}

// ============================================================================
// GENERATE NEW SECTIONS
// ============================================================================

export async function generateNewSections(
  options: GenerateNewSectionsOptions
): Promise<GeneratedSections> {
  const { templateName, templateDescription, existingSections, count = 3 } = options;

  const existingSectionsList = existingSections
    .sort((a, b) => a.order - b.order)
    .map((s) => `- ${s.title}${s.description ? `: ${s.description}` : ''}`)
    .join('\n');

  const prompt = `You are a product management expert helping to enhance a PRD template.

Template Name: ${templateName}
Template Description: ${templateDescription}

Current Sections:
${existingSectionsList}

Task: Generate ${count} new, relevant sections that would complement this template. These sections should:
1. Be commonly useful for this type of PRD
2. Not duplicate existing sections
3. Add value to the template
4. Be appropriate for the template's purpose

For each new section, provide:
- A clear, descriptive title (3-6 words)
- A brief description (1-2 sentences) explaining what should go in this section

IMPORTANT: Return ONLY raw JSON, no markdown code fences or other text.
Return a JSON object with this structure:
{"sections":[{"title":"Section Title","description":"What this section should contain..."}],"reasoning":"Brief explanation"}`;

  const request: AIGenerateRequest = {
    prompt,
    context: `You are an expert product manager. Return ONLY valid JSON without any markdown formatting, code fences, or explanatory text. The response must start with { and end with }.`,
    type: 'ask',
    options: {
      temperature: 0.7,
      maxTokens: 1500,
    }
  };

  const response = await generateAIContent(request);

  if (!response.content) {
    throw new Error('Failed to generate new sections');
  }

  try {
    const parsed = parseAIJsonResponse(response.content, 'section generation');

    // Generate IDs for new sections
    const sectionsWithIds: TemplateSection[] = parsed.sections.map((s: any, idx: number) => ({
      id: s.title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
      title: s.title,
      description: s.description || '',
      order: existingSections.length + idx + 1,
    }));

    return {
      sections: sectionsWithIds,
      reasoning: parsed.reasoning,
    };
  } catch (error) {
    console.error('Failed to parse AI response:', error);
    throw new Error('Failed to parse AI response for section generation');
  }
}

// ============================================================================
// REARRANGE SECTIONS
// ============================================================================

export async function rearrangeSections(
  options: RearrangeSectionsOptions
): Promise<RearrangedSections> {
  const { templateName, templateDescription, sections } = options;

  // Create a detailed list with all section information
  const sectionsJson = JSON.stringify(sections.map(s => ({
    id: s.id,
    title: s.title,
    description: s.description || '',
    order: s.order
  })), null, 2);

  const prompt = `You are a product management expert helping to organize a PRD template.

Template Name: ${templateName}
Template Description: ${templateDescription}

Current Sections (as JSON array):
${sectionsJson}

Task: Rearrange these sections in a logical order that follows PRD best practices. Consider:
1. Executive summary and high-level context should come first
2. Problem definition before solution details
3. User research before requirements
4. Functional requirements before technical details
5. Implementation details (timeline, risks) toward the end
6. Open questions and appendix at the very end

CRITICAL REQUIREMENTS:
- You MUST include ALL ${sections.length} sections from the input
- Keep the exact same "id", "title", and "description" for each section
- Only change the "order" field to reflect the new logical sequence
- Do not add, remove, or skip any sections
- Return ONLY raw JSON, no markdown code fences or other text
- Keep descriptions SHORT - max 100 characters each to ensure response fits

Return a JSON object with this structure (NO markdown, NO code fences):
{"sections":[{"id":"section-id","title":"Section Title","description":"Brief desc","order":1}],"reasoning":"Brief note"}`;

  const request: AIGenerateRequest = {
    prompt,
    context: `You are an expert product manager. Return ONLY valid JSON without any markdown formatting, code fences, or explanatory text. The response must start with { and end with }. Keep descriptions concise.`,
    type: 'ask',
    options: {
      temperature: 0.3,
      maxTokens: 4000, // Increased for larger section lists
    }
  };

  console.log('[rearrangeSections] Starting rearrangement for', sections.length, 'sections');

  const response = await generateAIContent(request);

  if (!response.content) {
    throw new Error('Failed to rearrange sections');
  }

  console.log('[rearrangeSections] Received AI response');

  try {
    const parsed = parseAIJsonResponse(response.content, 'section rearrangement');

    if (!parsed.sections || !Array.isArray(parsed.sections)) {
      console.error('[rearrangeSections] Invalid response structure:', parsed);
      throw new Error('AI response does not contain a valid sections array');
    }

    console.log('[rearrangeSections] Parsed', parsed.sections.length, 'sections from AI response');

    // Create a map of returned sections by ID for efficient lookup
    const returnedSectionsMap = new Map<string, any>(
      parsed.sections.map((s: any) => [s.id, s])
    );

    // Build the final sections array ensuring ALL original sections are present
    const rearrangedSections: TemplateSection[] = [];
    const missingIds: string[] = [];

    for (const originalSection of sections) {
      const returnedSection = returnedSectionsMap.get(originalSection.id);
      
      if (returnedSection) {
        // Use the returned section with its new order
        rearrangedSections.push({
          id: originalSection.id,
          title: (returnedSection.title as string) || originalSection.title,
          description: (returnedSection.description as string | undefined) ?? originalSection.description,
          order: (returnedSection.order as number) || rearrangedSections.length + 1,
        });
      } else {
        // Section is missing from AI response - keep original
        console.warn('[rearrangeSections] Section missing from AI response:', originalSection.id);
        missingIds.push(originalSection.id);
        rearrangedSections.push({
          ...originalSection,
          order: rearrangedSections.length + 1, // Place at end
        });
      }
    }

    if (missingIds.length > 0) {
      console.warn('[rearrangeSections] AI missed sections:', missingIds);
      // Don't throw error, just log warning and continue with what we have
    }

    // Re-normalize orders to be sequential from 1
    const finalSections = rearrangedSections
      .sort((a, b) => a.order - b.order)
      .map((s, idx) => ({
        ...s,
        order: idx + 1,
      }));

    console.log('[rearrangeSections] Successfully rearranged sections');

    return {
      sections: finalSections,
      reasoning: parsed.reasoning || 'Sections organized according to PRD best practices',
    };
  } catch (error) {
    console.error('[rearrangeSections] Failed to parse AI response:', error);
    console.error('[rearrangeSections] Response content:', response.content.substring(0, 500));
    throw new Error(`Failed to parse AI response for section rearrangement: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

// ============================================================================
// ADD DESCRIPTIONS
// ============================================================================

export async function addDescriptionsToSections(
  options: AddDescriptionsOptions
): Promise<SectionsWithDescriptions> {
  const { templateName, templateDescription, sections } = options;

  // Filter sections that need descriptions
  const sectionsNeedingDescriptions = sections.filter(s => !s.description || s.description.trim() === '');

  if (sectionsNeedingDescriptions.length === 0) {
    return {
      sections,
      reasoning: 'All sections already have descriptions',
    };
  }

  const sectionsList = sectionsNeedingDescriptions
    .map((s) => `- ${s.title}`)
    .join('\n');

  const prompt = `You are a product management expert helping to document a PRD template.

Template Name: ${templateName}
Template Description: ${templateDescription}

Sections Needing Descriptions:
${sectionsList}

Task: Write clear, concise descriptions for each section that explain what content should be included. Each description should:
1. Be 1-2 sentences long (max 100 characters)
2. Clearly explain the purpose of the section
3. Give guidance on what information belongs there
4. Be appropriate for the template's purpose and context

IMPORTANT: Return ONLY raw JSON, no markdown code fences or other text.
Return a JSON object with this structure:
{"descriptions":[{"title":"Section Title","description":"What this section should contain..."}],"reasoning":"Brief note"}`;

  const request: AIGenerateRequest = {
    prompt,
    context: `You are an expert product manager. Return ONLY valid JSON without any markdown formatting, code fences, or explanatory text. The response must start with { and end with }.`,
    type: 'ask',
    options: {
      temperature: 0.5,
      maxTokens: 4000, // Increased to handle many sections
    }
  };

  console.log('[addDescriptionsToSections] Generating descriptions for', sectionsNeedingDescriptions.length, 'sections');

  const response = await generateAIContent(request);

  if (!response.content) {
    throw new Error('Failed to generate descriptions');
  }

  console.log('[addDescriptionsToSections] Got response, length:', response.content.length);

  try {
    const parsed = parseAIJsonResponse(response.content, 'description generation');

    // Validate we have a descriptions array
    if (!parsed.descriptions || !Array.isArray(parsed.descriptions)) {
      console.warn('[addDescriptionsToSections] No descriptions array found in response');
      throw new Error('Response missing descriptions array');
    }

    console.log('[addDescriptionsToSections] Parsed', parsed.descriptions.length, 'descriptions');

    // Merge descriptions back into sections (apply what we have, even if partial)
    let descriptionsApplied = 0;
    const updatedSections = sections.map(section => {
      if (section.description && section.description.trim() !== '') {
        return section; // Keep existing description
      }

      const newDesc = parsed.descriptions.find((d: any) => 
        d.title === section.title || 
        d.title?.toLowerCase() === section.title?.toLowerCase()
      );
      
      if (newDesc?.description) {
        descriptionsApplied++;
        return {
          ...section,
          description: newDesc.description,
        };
      }
      
      return section;
    });

    console.log('[addDescriptionsToSections] Applied', descriptionsApplied, 'descriptions');

    // If we got some but not all, still return success with partial results
    if (descriptionsApplied === 0 && sectionsNeedingDescriptions.length > 0) {
      throw new Error('No descriptions could be matched to sections');
    }

    return {
      sections: updatedSections,
      reasoning: parsed.reasoning || `Generated descriptions for ${descriptionsApplied} sections`,
    };
  } catch (error) {
    console.error('[addDescriptionsToSections] Failed to parse AI response:', error);
    console.error('[addDescriptionsToSections] Response preview:', response.content.substring(0, 500));
    throw new Error(`Failed to parse AI response for description generation: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}
