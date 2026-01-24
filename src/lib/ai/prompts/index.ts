/**
 * AI Prompts Index
 * Central export for all PRD-related prompts and templates
 */

export { 
  MASTER_PRD_SYSTEM_PROMPT, 
  PRD_SECTIONS,
  type PRDSectionDefinition 
} from './prd-prompts';

export { 
  PRD_TEMPLATES, 
  TEMPLATE_CONTEXT_PROMPTS,
  getTemplate,
  getTemplateContextPrompt,
  getAllTemplates 
} from './prd-templates';

export {
  PRD_GENERATION_PROMPT,
  FEATURE_GENERATION_PROMPT,
  TASK_GENERATION_PROMPT,
  PRD_IMPROVEMENT_PROMPT,
  SECTION_GENERATION_PROMPTS,
  getSectionPrompt,
} from './generation-prompts';

export {
  CANVAS_SYSTEM_PROMPT,
  CANVAS_GENERATION_PROMPTS,
  extractPRDContextForCanvas,
  parseCanvasResponse,
} from './canvas-prompts';
