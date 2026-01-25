/**
 * PRD Generator Service
 * 
 * Generates comprehensive Product Requirements Documents using AI.
 * Supports multiple templates, section-by-section generation, and iterative improvement.
 */

import type { 
  AIGenerateRequest, 
  AIGenerateResponse, 
  PRDTemplateType,
  PRDSection,
  PRDGenerationResult 
} from '@/types';
import { generateAIContent } from '../use-ai-service';
import { 
  MASTER_PRD_SYSTEM_PROMPT,
  PRD_SECTIONS,
  getTemplate,
  getTemplateContextPrompt,
  PRD_GENERATION_PROMPT,
  PRD_IMPROVEMENT_PROMPT,
  getSectionPrompt,
} from '../prompts';
import type { AIProviderType } from '@/lib/stores/ai-settings-store';

// ============================================================================
// TYPES
// ============================================================================

export interface PRDGenerationOptions {
  /** Product description or brief */
  description: string;
  /** Template type to use */
  templateType?: PRDTemplateType;
  /** Specific sections to generate (if not full PRD) */
  sections?: string[];
  /** Additional context to include */
  context?: string;
  /** Target audience for the PRD */
  audience?: 'technical' | 'business' | 'mixed';
  /** Depth of detail */
  detailLevel?: 'concise' | 'standard' | 'comprehensive';
  /** AI provider to use */
  provider?: AIProviderType;
  /** Project-specific instructions for PRD formatting and structure */
  projectInstructions?: string;
}

export interface SectionGenerationOptions {
  /** The section ID to generate */
  sectionId: string;
  /** Product description or brief */
  description: string;
  /** Existing PRD content for context */
  existingContent?: string;
  /** Additional guidance for this section */
  guidance?: string;
  /** AI provider to use */
  provider?: AIProviderType;
  /** Project-specific instructions for PRD formatting and structure */
  projectInstructions?: string;
}

export interface PRDImprovementOptions {
  /** Current PRD content */
  currentContent: string;
  /** Specific areas to focus improvement on */
  focusAreas?: string[];
  /** Additional guidance */
  guidance?: string;
  /** AI provider to use */
  provider?: AIProviderType;
  /** Project-specific instructions for PRD formatting and structure */
  projectInstructions?: string;
}

// ============================================================================
// PRD GENERATOR SERVICE
// ============================================================================

export class PRDGeneratorService {
  /**
   * Generate a complete PRD from a product description
   */
  async generateFullPRD(options: PRDGenerationOptions): Promise<PRDGenerationResult> {
    const {
      description,
      templateType = 'custom',
      context,
      audience = 'mixed',
      detailLevel = 'standard',
      provider,
      projectInstructions,
    } = options;

    const template = getTemplate(templateType);
    const templateContext = getTemplateContextPrompt(templateType);

    // Build the comprehensive prompt
    const systemPrompt = this.buildSystemPrompt(templateContext, audience, detailLevel, projectInstructions);
    const userPrompt = this.buildUserPrompt(description, template, context);

    const request: AIGenerateRequest = {
      type: 'generate-prd',
      prompt: userPrompt,
      context: systemPrompt,
      provider,
    };

    try {
      const response = await generateAIContent(request, provider);
      
      // Parse the response into sections
      const sections = this.parseIntoSections(response.content, template.sections);

      return {
        content: response.content,
        sections,
      };
    } catch (error) {
      console.error('PRD generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate a specific section of the PRD
   */
  async generateSection(options: SectionGenerationOptions): Promise<PRDSection> {
    const {
      sectionId,
      description,
      existingContent,
      guidance,
      provider,
      projectInstructions,
    } = options;

    const sectionDef = PRD_SECTIONS.find(s => s.id === sectionId);
    if (!sectionDef) {
      throw new Error(`Unknown section: ${sectionId}`);
    }

    const sectionPrompt = getSectionPrompt(sectionId);

    let prompt = `Generate the "${sectionDef.title}" section for this product:\n\n`;
    prompt += `Product Description:\n${description}\n\n`;

    if (existingContent) {
      prompt += `Existing PRD Content (for context):\n${existingContent}\n\n`;
    }

    prompt += `Section Guidelines:\n${sectionPrompt}\n\n`;

    if (guidance) {
      prompt += `Additional Guidance:\n${guidance}\n\n`;
    }

    prompt += `Generate the ${sectionDef.title} section now:`;

    // Build system prompt with project instructions if provided
    let systemPrompt = MASTER_PRD_SYSTEM_PROMPT;
    if (projectInstructions) {
      systemPrompt += `\n\n## PROJECT-SPECIFIC INSTRUCTIONS (MUST FOLLOW)\nThe user has specified the following instructions for this project. You MUST follow these instructions exactly when generating the PRD:\n\n${projectInstructions}\n\nThese project instructions take precedence over default formatting.`;
    }

    const request: AIGenerateRequest = {
      type: 'generate-prd-section',
      prompt,
      context: systemPrompt,
      provider,
    };

    try {
      const response = await generateAIContent(request, provider);

      return {
        id: sectionId,
        title: sectionDef.title,
        content: response.content,
        order: sectionDef.order,
        isGenerated: true,
      };
    } catch (error) {
      console.error(`Section generation failed for ${sectionId}:`, error);
      throw error;
    }
  }

  /**
   * Improve an existing PRD
   */
  async improvePRD(options: PRDImprovementOptions): Promise<PRDGenerationResult> {
    const {
      currentContent,
      focusAreas,
      guidance,
      provider,
      projectInstructions,
    } = options;

    let prompt = PRD_IMPROVEMENT_PROMPT + '\n\n';
    prompt += `## Current PRD:\n${currentContent}\n\n`;

    if (focusAreas && focusAreas.length > 0) {
      prompt += `## Focus Areas for Improvement:\n`;
      focusAreas.forEach(area => {
        prompt += `- ${area}\n`;
      });
      prompt += '\n';
    }

    if (guidance) {
      prompt += `## Additional Guidance:\n${guidance}\n\n`;
    }

    prompt += `Please provide an improved version of this PRD:`;

    // Build system prompt with project instructions if provided
    let systemPrompt = MASTER_PRD_SYSTEM_PROMPT;
    if (projectInstructions) {
      systemPrompt += `\n\n## PROJECT-SPECIFIC INSTRUCTIONS (MUST FOLLOW)\nThe user has specified the following instructions for this project. You MUST follow these instructions exactly when improving the PRD:\n\n${projectInstructions}\n\nThese project instructions take precedence over default formatting.`;
    }

    const request: AIGenerateRequest = {
      type: 'improve-prd',
      prompt,
      context: systemPrompt,
      provider,
    };

    try {
      const response = await generateAIContent(request, provider);
      
      // Parse improved content into sections
      const sections = this.parseIntoSections(response.content, PRD_SECTIONS.map(s => ({
        id: s.id,
        title: s.title,
        order: s.order,
      })));

      return {
        content: response.content,
        sections,
      };
    } catch (error) {
      console.error('PRD improvement failed:', error);
      throw error;
    }
  }

  /**
   * Generate PRD from a brief one-liner (quick start)
   */
  async quickGenerate(oneLiner: string, provider?: AIProviderType, projectInstructions?: string): Promise<PRDGenerationResult> {
    const prompt = `Generate a comprehensive PRD for the following product idea:

"${oneLiner}"

Expand this into a full product vision and create a detailed PRD that covers:
1. What problem this solves and for whom
2. The core solution and key features
3. How success will be measured
4. What needs to be built and in what order

Be creative but practical. Make assumptions where needed and document them.`;

    // Build system prompt with project instructions if provided
    let systemPrompt = MASTER_PRD_SYSTEM_PROMPT;
    if (projectInstructions) {
      systemPrompt += `\n\n## PROJECT-SPECIFIC INSTRUCTIONS (MUST FOLLOW)\nThe user has specified the following instructions for this project. You MUST follow these instructions exactly when generating the PRD:\n\n${projectInstructions}\n\nThese project instructions take precedence over default formatting. Structure your PRD according to the user's specifications above.`;
    }

    const request: AIGenerateRequest = {
      type: 'generate-prd',
      prompt,
      context: systemPrompt,
      provider,
    };

    try {
      const response = await generateAIContent(request, provider);
      
      const sections = this.parseIntoSections(response.content, PRD_SECTIONS.map(s => ({
        id: s.id,
        title: s.title,
        order: s.order,
      })));

      return {
        content: response.content,
        sections,
      };
    } catch (error) {
      console.error('Quick PRD generation failed:', error);
      throw error;
    }
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private buildSystemPrompt(
    templateContext: string,
    audience: 'technical' | 'business' | 'mixed',
    detailLevel: 'concise' | 'standard' | 'comprehensive',
    projectInstructions?: string
  ): string {
    let prompt = MASTER_PRD_SYSTEM_PROMPT + '\n\n';
    prompt += templateContext + '\n\n';

    // Audience-specific guidance
    const audienceGuidance: Record<string, string> = {
      technical: 'Focus on technical specifications, architecture decisions, and implementation details. Include API contracts and data models where relevant.',
      business: 'Focus on business value, market opportunity, and ROI. Keep technical details high-level.',
      mixed: 'Balance business context with technical specifications. Make it accessible to all stakeholders.',
    };
    prompt += `## Target Audience\n${audienceGuidance[audience]}\n\n`;

    // Detail level guidance
    const detailGuidance: Record<string, string> = {
      concise: 'Be concise but complete. Aim for the minimum detail needed to make decisions and start work.',
      standard: 'Provide thorough coverage of all sections with appropriate detail for each.',
      comprehensive: 'Provide exhaustive detail. Include edge cases, multiple examples, and deep analysis.',
    };
    prompt += `## Detail Level\n${detailGuidance[detailLevel]}\n\n`;

    // Add project-specific instructions if provided
    if (projectInstructions) {
      prompt += `## PROJECT-SPECIFIC INSTRUCTIONS (MUST FOLLOW)\nThe user has specified the following instructions for this project. You MUST follow these instructions exactly when generating the PRD:\n\n${projectInstructions}\n\nThese project instructions take precedence over default formatting. Structure your PRD according to the user's specifications above.\n\n`;
    }

    return prompt;
  }

  private buildUserPrompt(
    description: string,
    template: { sections: { id: string; title: string; order: number }[] },
    context?: string
  ): string {
    let prompt = PRD_GENERATION_PROMPT + '\n\n';
    
    prompt += `## Product Description\n${description}\n\n`;

    if (context) {
      prompt += `## Additional Context\n${context}\n\n`;
    }

    prompt += `## Sections to Generate\n`;
    prompt += `Generate the following sections:\n`;
    template.sections.forEach((section, index) => {
      prompt += `${index + 1}. ${section.title}\n`;
    });

    prompt += `\nGenerate the complete PRD now:`;

    return prompt;
  }

  private parseIntoSections(
    content: string,
    templateSections: { id: string; title: string; order: number }[]
  ): PRDSection[] {
    const sections: PRDSection[] = [];
    
    // Try to parse content by section headers
    for (let i = 0; i < templateSections.length; i++) {
      const currentSection = templateSections[i];
      const nextSection = templateSections[i + 1];

      // Create regex to find this section
      const sectionRegex = new RegExp(
        `##\\s*(?:\\d+\\.?\\s*)?${this.escapeRegex(currentSection.title)}[^#]*`,
        'i'
      );

      let sectionContent = '';
      const match = content.match(sectionRegex);
      
      if (match) {
        sectionContent = match[0];
        // Remove the header from content
        sectionContent = sectionContent.replace(/^##\s*(?:\d+\.?\s*)?[^\n]+\n/, '').trim();
      }

      sections.push({
        id: currentSection.id,
        title: currentSection.title,
        content: sectionContent,
        order: currentSection.order,
        isGenerated: true,
      });
    }

    return sections;
  }

  private escapeRegex(string: string): string {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Export singleton instance
export const prdGenerator = new PRDGeneratorService();

export default prdGenerator;
