/**
 * PRD Generator Service
 * 
 * Generates comprehensive Product Requirements Documents using AI.
 * Supports multiple templates, section-by-section generation, and iterative improvement.
 * 
 * Now includes Linear-style structured PRD generation with Mermaid diagram support.
 */

import type { 
  AIGenerateRequest, 
  AIGenerateResponse, 
  PRDTemplateType,
  PRDSection,
  PRDGenerationResult,
  CustomPRDTemplate 
} from '@/types';
import { generateAIContent } from '../use-ai-service';
import {
  PRD_SECTIONS,
  getTemplate,
  getTemplateContextPrompt,
  PRD_GENERATION_PROMPT,
  PRD_IMPROVEMENT_PROMPT,
  getSectionPrompt,
  // Linear-style structured prompts (used for all PRD generation)
  STRUCTURED_PRD_SYSTEM_PROMPT,
  STRUCTURED_PRD_SECTIONS,
  STRUCTURED_PRD_GENERATION_PROMPT,
  getSectionSpecificPrompt,
  QUICK_PRD_PROMPT,
} from '../prompts';
import type { AIProviderType } from '@/lib/stores/ai-settings-store';

// ============================================================================
// TYPES
// ============================================================================

export interface PRDGenerationOptions {
  /** Product description or brief */
  description: string;
  /** Template type to use (legacy support for hardcoded types or custom template ID) */
  templateType?: PRDTemplateType | string;
  /** Custom template object (takes precedence over templateType if provided) */
  customTemplate?: CustomPRDTemplate;
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
  /** Use the new structured (Linear-style) format */
  useStructuredFormat?: boolean;
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
      customTemplate,
      context,
      audience = 'mixed',
      detailLevel = 'standard',
      provider,
      projectInstructions,
      useStructuredFormat = true, // Default to new structured format
    } = options;

    // Use new structured format by default, unless custom template is provided
    if (useStructuredFormat && !customTemplate) {
      return this.generateStructuredPRD({
        description,
        context,
        provider,
        projectInstructions,
      });
    }

    // Use custom template if provided, otherwise fall back to legacy hardcoded templates
    let template: { name: string; description: string; sections: { id: string; title: string; order: number; description?: string }[] };
    let templateContext: string;
    
    if (customTemplate) {
      // CRITICAL: Use the custom template with ALL section details
      // Sort sections by order to ensure correct sequence
      const sortedSections = [...customTemplate.sections].sort((a, b) => a.order - b.order);
      
      template = {
        name: customTemplate.name,
        description: customTemplate.description,
        sections: sortedSections.map(s => ({
          id: s.id,
          title: s.title,
          order: s.order,
          description: s.description, // CRITICAL: Include section descriptions for AI guidance
        })),
      };
      
      // Build context prompt that emphasizes following the template structure
      templateContext = `You are an expert Product Manager creating a PRD using the "${customTemplate.name}" template.

## Template Overview
${customTemplate.description}

${customTemplate.contextPrompt || ''}

## Template Sections to Generate
The following sections MUST be generated in this exact order:

${sortedSections.map((section, index) => `${index + 1}. **${section.title}**${section.description ? `\n   - Description: ${section.description}` : ''}`).join('\n')}

## CRITICAL INSTRUCTIONS
1. You MUST generate ALL and ONLY the sections defined above
2. Follow the EXACT order specified in the template
3. Each section has a specific description that tells you what to include - follow it precisely
4. If a section description is empty, use your best judgment but stay within the section's scope
5. DO NOT add extra sections that are not in the template
6. DO NOT skip any sections from the template
7. Use the section descriptions as your primary guide for what content to include

## CONTENT REQUIREMENTS
For each section, generate rich, comprehensive content including:
- **Tables** for comparisons, feature matrices, and requirements
- **Mermaid diagrams** for flows, processes, and system interactions
- **Bullet lists** for user stories, acceptance criteria, and key points
- **Code blocks** for technical specifications where applicable

This is a custom template created by the user - respect their structure exactly.`;
    } else {
      // Fall back to legacy hardcoded templates for backward compatibility
      template = getTemplate(templateType as PRDTemplateType);
      templateContext = getTemplateContextPrompt(templateType as PRDTemplateType);
    }

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
   * Generate a PRD using the new structured (Linear-style) format
   * with Mermaid diagrams included where relevant
   */
  async generateStructuredPRD(options: {
    description: string;
    context?: string;
    provider?: AIProviderType;
    projectInstructions?: string;
  }): Promise<PRDGenerationResult> {
    const { description, context, provider, projectInstructions } = options;

    // Build system prompt
    let systemPrompt = STRUCTURED_PRD_SYSTEM_PROMPT;
    if (projectInstructions) {
      systemPrompt += `\n\n## PROJECT-SPECIFIC INSTRUCTIONS (MUST FOLLOW)\n${projectInstructions}`;
    }

    // Build user prompt
    let userPrompt = STRUCTURED_PRD_GENERATION_PROMPT + '\n\n';
    userPrompt += `## Product Description\n${description}\n\n`;
    
    if (context) {
      userPrompt += `## Additional Context\n${context}\n\n`;
    }

    userPrompt += `Generate the complete structured PRD now, including Mermaid diagrams where appropriate:`;

    const request: AIGenerateRequest = {
      type: 'generate-prd',
      prompt: userPrompt,
      context: systemPrompt,
      provider,
    };

    try {
      const response = await generateAIContent(request, provider);
      
      // Parse into structured sections
      const sections = this.parseStructuredSections(response.content);

      return {
        content: response.content,
        sections,
      };
    } catch (error) {
      console.error('Structured PRD generation failed:', error);
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
    // Use the Linear-style structured prompt for consistency
    let systemPrompt = STRUCTURED_PRD_SYSTEM_PROMPT;
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
    // Use the Linear-style structured prompt for consistency
    let systemPrompt = STRUCTURED_PRD_SYSTEM_PROMPT;
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
   * Now uses the new structured format with Mermaid diagrams
   */
  async quickGenerate(oneLiner: string, provider?: AIProviderType, projectInstructions?: string): Promise<PRDGenerationResult> {
    // Build system prompt with structured format
    let systemPrompt = STRUCTURED_PRD_SYSTEM_PROMPT;
    if (projectInstructions) {
      systemPrompt += `\n\n## PROJECT-SPECIFIC INSTRUCTIONS (MUST FOLLOW)\n${projectInstructions}`;
    }

    const prompt = `${QUICK_PRD_PROMPT}

## Product Idea
"${oneLiner}"

Generate a complete, structured PRD with Mermaid diagrams:`;

    const request: AIGenerateRequest = {
      type: 'generate-prd',
      prompt,
      context: systemPrompt,
      provider,
    };

    try {
      const response = await generateAIContent(request, provider);
      
      const sections = this.parseStructuredSections(response.content);

      return {
        content: response.content,
        sections,
      };
    } catch (error) {
      console.error('Quick PRD generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate a specific section of the structured PRD
   */
  async generateStructuredSection(
    sectionId: string,
    productContext: string,
    provider?: AIProviderType
  ): Promise<PRDSection> {
    const section = STRUCTURED_PRD_SECTIONS.find(s => s.id === sectionId);
    if (!section) {
      throw new Error(`Unknown structured section: ${sectionId}`);
    }

    const prompt = getSectionSpecificPrompt(sectionId, productContext);

    const request: AIGenerateRequest = {
      type: 'generate-prd-section',
      prompt,
      context: STRUCTURED_PRD_SYSTEM_PROMPT,
      provider,
    };

    try {
      const response = await generateAIContent(request, provider);

      return {
        id: sectionId,
        title: `${section.emoji} ${section.title}`,
        content: response.content,
        order: STRUCTURED_PRD_SECTIONS.findIndex(s => s.id === sectionId) + 1,
        isGenerated: true,
      };
    } catch (error) {
      console.error(`Structured section generation failed for ${sectionId}:`, error);
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
    // Use the Linear-style structured prompt for consistency
    let prompt = STRUCTURED_PRD_SYSTEM_PROMPT + '\n\n';
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
    template: { sections: { id: string; title: string; order: number; description?: string }[] },
    context?: string
  ): string {
    let prompt = PRD_GENERATION_PROMPT + '\n\n';
    
    prompt += `## Product Description\n${description}\n\n`;

    if (context) {
      prompt += `## Additional Context\n${context}\n\n`;
    }

    prompt += `## Required Sections Structure\n`;
    prompt += `You MUST generate EXACTLY these sections in this EXACT order. Each section has specific requirements that you MUST follow:\n\n`;
    
    template.sections.forEach((section, index) => {
      prompt += `### Section ${index + 1}: ${section.title}\n`;
      if (section.description && section.description.trim()) {
        prompt += `**REQUIRED CONTENT:** ${section.description}\n`;
        prompt += `**INSTRUCTION:** Generate content that specifically addresses the requirements above.\n`;
      } else {
        prompt += `**INSTRUCTION:** Generate appropriate content for this section based on the section title and overall PRD context.\n`;
      }
      prompt += '\n';
    });

    prompt += `## Generation Rules\n`;
    prompt += `1. Generate ALL ${template.sections.length} sections listed above\n`;
    prompt += `2. Generate ONLY these sections - do not add extra sections\n`;
    prompt += `3. Follow the EXACT order specified\n`;
    prompt += `4. For sections with "REQUIRED CONTENT", ensure you address all specified points\n`;
    prompt += `5. Use markdown formatting with ## for section headers\n`;
    prompt += `6. Make each section comprehensive and actionable\n\n`;

    prompt += `Generate the complete PRD now:`;

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

  /**
   * Parse structured PRD content into sections
   * Handles the new emoji-prefixed section format
   */
  private parseStructuredSections(content: string): PRDSection[] {
    const sections: PRDSection[] = [];
    
    // Match sections with emoji headers (e.g., "## 📋 Overview")
    const sectionRegex = /##\s*([\u{1F300}-\u{1F9FF}]|[\u{2600}-\u{26FF}]|[\u{2700}-\u{27BF}])\s*([^\n]+)\n([\s\S]*?)(?=##\s*[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]|$)/gu;
    
    let match;
    let order = 1;
    
    while ((match = sectionRegex.exec(content)) !== null) {
      const emoji = match[1];
      const title = match[2].trim();
      const sectionContent = match[3].trim();
      
      // Map to structured section ID
      const sectionId = this.mapTitleToSectionId(title);
      
      sections.push({
        id: sectionId,
        title: `${emoji} ${title}`,
        content: sectionContent,
        order: order++,
        isGenerated: true,
      });
    }

    // If regex didn't find sections, try simpler parsing
    if (sections.length === 0) {
      return this.parseIntoSections(content, STRUCTURED_PRD_SECTIONS.map((s, i) => ({
        id: s.id,
        title: s.title,
        order: i + 1,
      })));
    }

    return sections;
  }

  /**
   * Map section title to structured section ID
   */
  private mapTitleToSectionId(title: string): string {
    const lowerTitle = title.toLowerCase();
    
    if (lowerTitle.includes('overview')) return 'overview';
    if (lowerTitle.includes('problem')) return 'problem';
    if (lowerTitle.includes('current') || lowerTitle.includes('scenario')) return 'current-scenario';
    if (lowerTitle.includes('consideration')) return 'considerations';
    if (lowerTitle.includes('assumption')) return 'assumptions';
    if (lowerTitle.includes('diagram') || lowerTitle.includes('chart')) return 'diagrams';
    if (lowerTitle.includes('solution')) return 'solution';
    
    // Generate a slug from the title
    return title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
  }
}

// Export singleton instance
export const prdGenerator = new PRDGeneratorService();

export default prdGenerator;
