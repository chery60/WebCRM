/**
 * Feature Generator Service
 * 
 * Extracts and generates features from PRD content.
 * Creates structured feature data that can be directly used to create features in pipelines.
 */

import type { AIGenerateRequest, GeneratedFeature } from '@/types';
import { generateAIContent } from '../use-ai-service';
import { MASTER_PRD_SYSTEM_PROMPT, FEATURE_GENERATION_PROMPT } from '../prompts';
import type { AIProviderType } from '@/lib/stores/ai-settings-store';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TYPES
// ============================================================================

export interface FeatureGenerationOptions {
  /** PRD content to extract features from */
  prdContent: string;
  /** Product description for additional context */
  productDescription?: string;
  /** Maximum number of features to generate */
  maxFeatures?: number;
  /** Focus on specific phases */
  phases?: string[];
  /** Include only certain priorities */
  priorities?: ('low' | 'medium' | 'high' | 'urgent')[];
  /** AI provider to use */
  provider?: AIProviderType;
}

export interface FeatureEnhancementOptions {
  /** The feature to enhance */
  feature: Partial<GeneratedFeature>;
  /** PRD content for context */
  prdContent?: string;
  /** What aspects to enhance */
  enhanceAspects?: ('description' | 'acceptanceCriteria' | 'userStories' | 'effort')[];
  /** AI provider to use */
  provider?: AIProviderType;
}

export interface FeatureBreakdownOptions {
  /** Feature to break down into smaller features */
  feature: GeneratedFeature;
  /** PRD content for context */
  prdContent?: string;
  /** Number of sub-features to create */
  targetCount?: number;
  /** AI provider to use */
  provider?: AIProviderType;
}

// ============================================================================
// FEATURE GENERATOR SERVICE
// ============================================================================

export class FeatureGeneratorService {
  /**
   * Generate features from PRD content
   */
  async generateFromPRD(options: FeatureGenerationOptions): Promise<GeneratedFeature[]> {
    const {
      prdContent,
      productDescription,
      maxFeatures = 20,
      phases,
      priorities,
      provider,
    } = options;

    let prompt = FEATURE_GENERATION_PROMPT + '\n\n';

    prompt += `## PRD Content\n${prdContent}\n\n`;

    if (productDescription) {
      prompt += `## Product Overview\n${productDescription}\n\n`;
    }

    if (phases && phases.length > 0) {
      prompt += `## Phase Focus\nFocus on features for these phases: ${phases.join(', ')}\n\n`;
    }

    if (priorities && priorities.length > 0) {
      prompt += `## Priority Filter\nGenerate only features with these priorities: ${priorities.join(', ')}\n\n`;
    }

    prompt += `## Requirements\n`;
    prompt += `- Generate up to ${maxFeatures} features\n`;
    prompt += `- Prioritize features that deliver the most user value\n`;
    prompt += `- Ensure features are independent and well-scoped\n`;
    prompt += `- Include a good mix across phases\n\n`;

    prompt += `Extract and generate the features now.\n\n`;
    prompt += `CRITICAL OUTPUT RULES:\n`;
    prompt += `1. Return ONLY a valid JSON array.\n`;
    prompt += `2. Do not include markdown formatting (like \`\`\`json).\n`;
    prompt += `3. Escape all special characters in strings (especially quotes).\n`;
    prompt += `4. Ensure there are no trailing commas.`;

    const request: AIGenerateRequest = {
      type: 'generate-features',
      prompt,
      context: MASTER_PRD_SYSTEM_PROMPT,
      provider,
    };

    try {
      const response = await generateAIContent(request, provider);
      const features = this.parseFeatures(response.content);

      // Add unique IDs and isSelected flag
      return features.map(feature => ({
        ...feature,
        id: uuidv4(),
        isSelected: true,
      }));
    } catch (error) {
      console.error('Feature generation failed:', error);
      throw error;
    }
  }

  /**
   * Enhance a feature with more detail
   */
  async enhanceFeature(options: FeatureEnhancementOptions): Promise<GeneratedFeature> {
    const {
      feature,
      prdContent,
      enhanceAspects = ['description', 'acceptanceCriteria', 'userStories'],
      provider,
    } = options;

    let prompt = `You are enhancing a feature with more detail. Improve the specified aspects while maintaining consistency.\n\n`;

    prompt += `## Current Feature\n`;
    prompt += `Title: ${feature.title || 'Untitled'}\n`;
    prompt += `Description: ${feature.description || 'No description'}\n`;
    prompt += `Priority: ${feature.priority || 'medium'}\n`;
    prompt += `Phase: ${feature.phase || 'TBD'}\n`;

    if (feature.acceptanceCriteria?.length) {
      prompt += `Acceptance Criteria:\n${feature.acceptanceCriteria.map(c => `- ${c}`).join('\n')}\n`;
    }

    if (feature.userStories?.length) {
      prompt += `User Stories:\n${feature.userStories.map(s => `- ${s}`).join('\n')}\n`;
    }

    prompt += `\n`;

    if (prdContent) {
      prompt += `## PRD Context\n${prdContent.substring(0, 3000)}...\n\n`;
    }

    prompt += `## Aspects to Enhance\n${enhanceAspects.join(', ')}\n\n`;

    prompt += `## Output Format\nReturn a single JSON object with the enhanced feature. Include all fields:\n`;
    prompt += `- title, description, priority, phase, estimatedEffort\n`;
    prompt += `- acceptanceCriteria (array of 5-8 detailed criteria)\n`;
    prompt += `- userStories (array of 2-4 user stories)\n\n`;

    prompt += `IMPORTANT: Return ONLY the JSON object, no markdown or additional text.`;

    const request: AIGenerateRequest = {
      type: 'generate-features',
      prompt,
      context: MASTER_PRD_SYSTEM_PROMPT,
      provider,
    };

    try {
      const response = await generateAIContent(request, provider);
      const enhanced = this.parseSingleFeature(response.content);

      return {
        ...enhanced,
        id: feature.id || uuidv4(),
        isSelected: feature.isSelected ?? true,
      };
    } catch (error) {
      console.error('Feature enhancement failed:', error);
      throw error;
    }
  }

  /**
   * Break down a large feature into smaller features
   */
  async breakdownFeature(options: FeatureBreakdownOptions): Promise<GeneratedFeature[]> {
    const {
      feature,
      prdContent,
      targetCount = 3,
      provider,
    } = options;

    let prompt = `You are breaking down a large feature into smaller, more manageable features.\n\n`;

    prompt += `## Feature to Break Down\n`;
    prompt += `Title: ${feature.title}\n`;
    prompt += `Description: ${feature.description}\n`;
    prompt += `Priority: ${feature.priority}\n`;
    prompt += `Phase: ${feature.phase}\n`;
    prompt += `Estimated Effort: ${feature.estimatedEffort}\n`;

    if (feature.acceptanceCriteria?.length) {
      prompt += `Acceptance Criteria:\n${feature.acceptanceCriteria.map(c => `- ${c}`).join('\n')}\n`;
    }

    prompt += `\n`;

    if (prdContent) {
      prompt += `## PRD Context\n${prdContent.substring(0, 2000)}...\n\n`;
    }

    prompt += `## Requirements\n`;
    prompt += `- Break this into ${targetCount} smaller, independent features\n`;
    prompt += `- Each sub-feature should be completable in 1-2 weeks\n`;
    prompt += `- Maintain the original priority level\n`;
    prompt += `- Preserve all acceptance criteria across sub-features\n`;
    prompt += `- Add "[Part X]" suffix to titles to show relationship\n\n`;

    prompt += `Return a JSON array of ${targetCount} features. ONLY return the JSON array.`;

    const request: AIGenerateRequest = {
      type: 'generate-features',
      prompt,
      context: MASTER_PRD_SYSTEM_PROMPT,
      provider,
    };

    try {
      const response = await generateAIContent(request, provider);
      const subFeatures = this.parseFeatures(response.content);

      return subFeatures.map(f => ({
        ...f,
        id: uuidv4(),
        isSelected: true,
      }));
    } catch (error) {
      console.error('Feature breakdown failed:', error);
      throw error;
    }
  }

  /**
   * Generate features from a simple description (quick mode)
   */
  async quickGenerate(description: string, provider?: AIProviderType): Promise<GeneratedFeature[]> {
    const prompt = `Based on this product description, generate a list of key features:

"${description}"

Generate 5-10 well-defined features that would be needed to build this product.
Focus on MVP features first, then nice-to-haves.

${FEATURE_GENERATION_PROMPT}

Return ONLY the JSON array of features.`;

    const request: AIGenerateRequest = {
      type: 'generate-features',
      prompt,
      context: MASTER_PRD_SYSTEM_PROMPT,
      provider,
    };

    try {
      const response = await generateAIContent(request, provider);
      const features = this.parseFeatures(response.content);

      return features.map(feature => ({
        ...feature,
        id: uuidv4(),
        isSelected: true,
      }));
    } catch (error) {
      console.error('Quick feature generation failed:', error);
      throw error;
    }
  }

  /**
   * Suggest priority for a feature based on context
   */
  async suggestPriority(
    feature: Partial<GeneratedFeature>,
    prdContent?: string,
    provider?: AIProviderType
  ): Promise<'low' | 'medium' | 'high' | 'urgent'> {
    const prompt = `Analyze this feature and suggest its priority level.

Feature: ${feature.title}
Description: ${feature.description}

${prdContent ? `PRD Context (excerpt):\n${prdContent.substring(0, 1500)}` : ''}

Consider:
- Impact on core user value
- Dependencies (does other work depend on this?)
- Technical risk
- Time sensitivity
- Resource requirements

Return ONLY one word: "low", "medium", "high", or "urgent"`;

    const request: AIGenerateRequest = {
      type: 'generate-features',
      prompt,
      provider,
    };

    try {
      const response = await generateAIContent(request, provider);
      const priority = response.content.toLowerCase().trim();

      if (['low', 'medium', 'high', 'urgent'].includes(priority)) {
        return priority as 'low' | 'medium' | 'high' | 'urgent';
      }
      return 'medium';
    } catch {
      return 'medium';
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  /**
   * Sanitize control characters within JSON string values.
   * This handles cases where AI returns JSON with unescaped newlines, tabs, etc. inside strings.
   */
  private sanitizeJsonString(jsonStr: string): string {
    let result = '';
    let inString = false;
    let escapeNext = false;
    
    for (let i = 0; i < jsonStr.length; i++) {
      const char = jsonStr[i];
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
            result += '\\u' + charCode.toString(16).padStart(4, '0');
            break;
        }
      } else {
        result += char;
      }
    }
    
    return result;
  }

  /**
   * Repair truncated JSON by closing open strings, objects, and arrays.
   * This handles cases where AI response is cut off mid-JSON.
   */
  private repairTruncatedJson(jsonStr: string): string {
    let repaired = jsonStr.trim();
    
    // Remove trailing commas before attempting repair
    repaired = repaired.replace(/,\s*$/, '');
    
    // Track state through the JSON
    let inString = false;
    let escapeNext = false;
    const bracketStack: string[] = [];
    
    for (let i = 0; i < repaired.length; i++) {
      const char = repaired[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\' && inString) {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '[' || char === '{') {
          bracketStack.push(char);
        } else if (char === ']') {
          if (bracketStack.length > 0 && bracketStack[bracketStack.length - 1] === '[') {
            bracketStack.pop();
          }
        } else if (char === '}') {
          if (bracketStack.length > 0 && bracketStack[bracketStack.length - 1] === '{') {
            bracketStack.pop();
          }
        }
      }
    }
    
    // If we're still inside a string, close it
    if (inString) {
      // Try to find a good cutoff point (last complete word or sentence)
      const lastGoodCutoff = Math.max(
        repaired.lastIndexOf('. '),
        repaired.lastIndexOf(', '),
        repaired.lastIndexOf(' ')
      );
      
      if (lastGoodCutoff > repaired.length - 100 && lastGoodCutoff > 0) {
        repaired = repaired.substring(0, lastGoodCutoff);
      }
      
      // Remove any trailing incomplete escape sequences
      repaired = repaired.replace(/\\+$/, '');
      repaired += '"';
    }
    
    // Remove any trailing commas after closing the string
    repaired = repaired.replace(/,\s*$/, '');
    
    // Close any unclosed brackets/braces in reverse order
    while (bracketStack.length > 0) {
      const openBracket = bracketStack.pop();
      if (openBracket === '[') {
        repaired += ']';
      } else if (openBracket === '{') {
        repaired += '}';
      }
    }
    
    return repaired;
  }

  /**
   * Extract complete JSON objects from a potentially truncated array.
   * Returns as many complete objects as possible.
   */
  private extractCompleteObjects(jsonStr: string): string {
    const arrayStart = jsonStr.indexOf('[');
    if (arrayStart === -1) return jsonStr;
    
    let result = '[';
    let depth = 0;
    let inString = false;
    let escapeNext = false;
    let objectStart = -1;
    const completeObjects: string[] = [];
    
    for (let i = arrayStart + 1; i < jsonStr.length; i++) {
      const char = jsonStr[i];
      
      if (escapeNext) {
        escapeNext = false;
        continue;
      }
      
      if (char === '\\' && inString) {
        escapeNext = true;
        continue;
      }
      
      if (char === '"' && !escapeNext) {
        inString = !inString;
        continue;
      }
      
      if (!inString) {
        if (char === '{') {
          if (depth === 0) {
            objectStart = i;
          }
          depth++;
        } else if (char === '}') {
          depth--;
          if (depth === 0 && objectStart !== -1) {
            // Found a complete object
            const objectStr = jsonStr.substring(objectStart, i + 1);
            completeObjects.push(objectStr);
            objectStart = -1;
          }
        }
      }
    }
    
    if (completeObjects.length > 0) {
      result += completeObjects.join(',') + ']';
      return result;
    }
    
    return jsonStr;
  }

  private parseFeatures(content: string): Omit<GeneratedFeature, 'id' | 'isSelected'>[] {
    try {
      // Handle empty or whitespace-only content
      if (!content || !content.trim()) {
        console.warn('Empty content received for feature parsing');
        return [];
      }

      let jsonContent = content.trim();

      // Remove markdown code fences if present (captures content between ```json and ```)
      const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim();
      }

      // Try to find JSON array in the content
      const arrayStart = jsonContent.indexOf('[');
      if (arrayStart !== -1) {
        jsonContent = jsonContent.substring(arrayStart);
      }

      // Handle case where content might be a JSON object with a features array
      if (jsonContent.startsWith('{')) {
        try {
          const sanitized = this.sanitizeJsonString(jsonContent);
          const repaired = this.repairTruncatedJson(sanitized);
          const obj = JSON.parse(repaired);
          if (obj.features && Array.isArray(obj.features)) {
            jsonContent = JSON.stringify(obj.features);
          }
        } catch {
          // Not a valid object, continue with original content
        }
      }

      // Remove trailing commas
      jsonContent = jsonContent.replace(/,\s*}/g, '}').replace(/,\s*]/g, ']');

      // Sanitize control characters
      jsonContent = this.sanitizeJsonString(jsonContent);

      // Try parsing strategies in order of complexity
      const parseStrategies = [
        // Strategy 1: Direct parse after sanitization
        () => JSON.parse(jsonContent),
        
        // Strategy 2: Repair truncated JSON then parse
        () => JSON.parse(this.repairTruncatedJson(jsonContent)),
        
        // Strategy 3: Extract only complete objects from truncated array
        () => JSON.parse(this.extractCompleteObjects(jsonContent)),
        
        // Strategy 4: Repair after extracting complete objects
        () => JSON.parse(this.repairTruncatedJson(this.extractCompleteObjects(jsonContent))),
      ];

      let parsed: unknown = null;
      let lastError: Error | null = null;

      for (let i = 0; i < parseStrategies.length; i++) {
        try {
          parsed = parseStrategies[i]();
          console.log(`[FeatureGenerator] Parse strategy ${i + 1} succeeded`);
          break;
        } catch (e) {
          lastError = e as Error;
          console.log(`[FeatureGenerator] Parse strategy ${i + 1} failed:`, (e as Error).message);
        }
      }

      if (parsed === null) {
        console.error('[FeatureGenerator] All parse strategies failed:', lastError?.message);
        console.error('[FeatureGenerator] Content preview:', content.substring(0, 500));
        return [];
      }

      if (Array.isArray(parsed)) {
        // Filter out null/undefined items and normalize each feature
        const features = parsed
          .filter(item => item != null && typeof item === 'object')
          .map(item => this.normalizeFeature(item));
        
        console.log(`[FeatureGenerator] Successfully parsed ${features.length} features`);
        return features;
      }

      // If single object, wrap in array
      if (typeof parsed === 'object' && parsed !== null) {
        return [this.normalizeFeature(parsed)];
      }

      return [];
    } catch (error) {
      console.error('[FeatureGenerator] Unexpected error in parseFeatures:', error);
      console.error('[FeatureGenerator] Content preview:', content.substring(0, 500));
      return [];
    }
  }

  private parseSingleFeature(content: string): Omit<GeneratedFeature, 'id' | 'isSelected'> {
    const features = this.parseFeatures(content);
    if (features.length > 0) {
      return features[0];
    }
    throw new Error('Failed to parse feature from response');
  }

  private normalizeFeature(data: unknown): Omit<GeneratedFeature, 'id' | 'isSelected'> {
    // Handle null/undefined/non-object data
    if (!data || typeof data !== 'object') {
      return {
        title: 'Untitled Feature',
        description: '',
        priority: 'medium',
        phase: 'Phase 1',
        estimatedEffort: 'Medium',
        acceptanceCriteria: [],
        userStories: [],
      };
    }

    const featureData = data as Record<string, unknown>;
    
    return {
      title: String(featureData.title || 'Untitled Feature'),
      description: String(featureData.description || ''),
      priority: this.normalizePriority(featureData.priority),
      phase: String(featureData.phase || 'Phase 1'),
      estimatedEffort: String(featureData.estimatedEffort || featureData.estimated_effort || 'Medium'),
      acceptanceCriteria: this.normalizeStringArray(featureData.acceptanceCriteria || featureData.acceptance_criteria),
      userStories: this.normalizeStringArray(featureData.userStories || featureData.user_stories),
    };
  }

  private normalizePriority(priority: unknown): 'low' | 'medium' | 'high' | 'urgent' {
    const p = String(priority).toLowerCase();
    if (['low', 'medium', 'high', 'urgent'].includes(p)) {
      return p as 'low' | 'medium' | 'high' | 'urgent';
    }
    return 'medium';
  }

  private normalizeStringArray(data: unknown): string[] {
    if (Array.isArray(data)) {
      return data.map(item => String(item));
    }
    if (typeof data === 'string') {
      return [data];
    }
    return [];
  }
}

// Export singleton instance
export const featureGenerator = new FeatureGeneratorService();

export default featureGenerator;
