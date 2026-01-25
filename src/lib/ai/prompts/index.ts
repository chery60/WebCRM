/**
 * AI Prompts Index
 * Central export for all AI prompts and templates
 * 
 * This is the main entry point for all prompt-related exports.
 * Import from this file rather than individual prompt files.
 */

// ============================================================================
// SYSTEM PROMPTS - Used by AI providers for different request types
// ============================================================================
export {
  SYSTEM_PROMPTS,
  DEFAULT_SYSTEM_PROMPT,
  getSystemPromptForType,
  getAvailablePromptTypes,
  hasSystemPrompt,
  type AIRequestType,
} from './system-prompts';

// ============================================================================
// PRD PROMPTS - Master prompts for PRD generation
// ============================================================================
export { 
  MASTER_PRD_SYSTEM_PROMPT, 
  PRD_SECTIONS,
  type PRDSectionDefinition 
} from './prd-prompts';

// ============================================================================
// PRD TEMPLATES - Template definitions for different product types
// ============================================================================
export { 
  PRD_TEMPLATES, 
  TEMPLATE_CONTEXT_PROMPTS,
  getTemplate,
  getTemplateContextPrompt,
  getAllTemplates 
} from './prd-templates';

// ============================================================================
// GENERATION PROMPTS - Specific prompts for generating content
// ============================================================================
export {
  PRD_GENERATION_PROMPT,
  FEATURE_GENERATION_PROMPT,
  TASK_GENERATION_PROMPT,
  PRD_IMPROVEMENT_PROMPT,
  SECTION_GENERATION_PROMPTS,
  getSectionPrompt,
} from './generation-prompts';

// ============================================================================
// CANVAS PROMPTS - Prompts for Excalidraw diagram generation
// ============================================================================
export {
  CANVAS_SYSTEM_PROMPT,
  CANVAS_GENERATION_PROMPTS,
  extractPRDContextForCanvas,
  parseCanvasResponse,
} from './canvas-prompts';
