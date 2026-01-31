/**
 * Template Validation Utility
 * 
 * Ensures template quality and consistency for the world's best AI PM platform
 */

import type { CustomPRDTemplate, TemplateSection } from '@/types';

export interface TemplateValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  suggestions: string[];
  score: number; // Quality score 0-100
}

export interface SectionValidationResult {
  valid: boolean;
  issues: string[];
  suggestions: string[];
}

// ============================================================================
// TEMPLATE VALIDATION
// ============================================================================

/**
 * Comprehensive template validation
 */
export function validateTemplate(template: Partial<CustomPRDTemplate>): TemplateValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let score = 100;

  // Required fields validation
  if (!template.name || template.name.trim() === '') {
    errors.push('Template name is required');
    score -= 20;
  } else if (template.name.length < 3) {
    warnings.push('Template name is too short (minimum 3 characters recommended)');
    score -= 5;
  } else if (template.name.length > 50) {
    warnings.push('Template name is too long (maximum 50 characters recommended)');
    score -= 5;
  }

  if (!template.description || template.description.trim() === '') {
    errors.push('Template description is required');
    score -= 15;
  } else if (template.description.length < 20) {
    warnings.push('Template description is too brief (minimum 20 characters recommended)');
    score -= 5;
  } else if (template.description.length > 200) {
    warnings.push('Template description is too long (maximum 200 characters recommended)');
    score -= 3;
  }

  if (!template.sections || template.sections.length === 0) {
    errors.push('Template must have at least one section');
    score -= 30;
  } else {
    // Validate sections
    const sectionValidation = validateSections(template.sections);
    errors.push(...sectionValidation.errors);
    warnings.push(...sectionValidation.warnings);
    suggestions.push(...sectionValidation.suggestions);
    score -= sectionValidation.deduction;
  }

  // Category validation
  if (!template.category) {
    warnings.push('Template category not set - helps with organization');
    score -= 3;
  }

  // Context prompt validation
  if (template.contextPrompt) {
    if (template.contextPrompt.length < 50) {
      suggestions.push('Context prompt could be more detailed to guide AI better');
      score -= 2;
    }
    if (template.contextPrompt.length > 1000) {
      warnings.push('Context prompt is very long - consider being more concise');
      score -= 3;
    }
  } else {
    suggestions.push('Consider adding a context prompt to guide AI generation');
    score -= 5;
  }

  // Quality suggestions
  if (template.sections && template.sections.length < 5) {
    suggestions.push('Consider adding more sections for comprehensive PRDs (8-15 recommended)');
  }

  if (template.sections && template.sections.length > 20) {
    suggestions.push('Template has many sections - ensure they are all necessary');
  }

  // Ensure score stays within bounds
  score = Math.max(0, Math.min(100, score));

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    suggestions,
    score,
  };
}

/**
 * Validate template sections
 */
function validateSections(sections: TemplateSection[]): {
  errors: string[];
  warnings: string[];
  suggestions: string[];
  deduction: number;
} {
  const errors: string[] = [];
  const warnings: string[] = [];
  const suggestions: string[] = [];
  let deduction = 0;

  // Check for duplicate IDs
  const ids = sections.map(s => s.id);
  const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
  if (duplicateIds.length > 0) {
    errors.push(`Duplicate section IDs found: ${duplicateIds.join(', ')}`);
    deduction += 15;
  }

  // Check for duplicate titles
  const titles = sections.map(s => s.title.toLowerCase());
  const duplicateTitles = titles.filter((title, index) => titles.indexOf(title) !== index);
  if (duplicateTitles.length > 0) {
    warnings.push(`Duplicate section titles found: ${duplicateTitles.join(', ')}`);
    deduction += 5;
  }

  // Validate order sequence
  const orders = sections.map(s => s.order);
  const sortedOrders = [...orders].sort((a, b) => a - b);
  const isSequential = sortedOrders.every((order, index) => order === index + 1);
  
  if (!isSequential) {
    warnings.push('Section orders are not sequential (1, 2, 3, ...). This may cause display issues.');
    deduction += 3;
  }

  // Validate each section
  sections.forEach((section, index) => {
    const sectionNum = index + 1;
    
    // ID validation
    if (!section.id || section.id.trim() === '') {
      errors.push(`Section ${sectionNum}: ID is required`);
      deduction += 5;
    } else if (!/^[a-z0-9-]+$/.test(section.id)) {
      warnings.push(`Section ${sectionNum} (${section.id}): ID should use lowercase letters, numbers, and hyphens only`);
      deduction += 2;
    }

    // Title validation
    if (!section.title || section.title.trim() === '') {
      errors.push(`Section ${sectionNum}: Title is required`);
      deduction += 5;
    } else if (section.title.length < 3) {
      warnings.push(`Section ${sectionNum} (${section.title}): Title is too short`);
      deduction += 2;
    } else if (section.title.length > 50) {
      warnings.push(`Section ${sectionNum} (${section.title}): Title is too long`);
      deduction += 2;
    }

    // Order validation
    if (section.order < 1) {
      errors.push(`Section ${sectionNum} (${section.title}): Order must be >= 1`);
      deduction += 3;
    }

    // Description validation
    if (!section.description || section.description.trim() === '') {
      suggestions.push(`Section ${sectionNum} (${section.title}): Add a description to guide AI generation`);
      deduction += 1;
    } else if (section.description.length < 20) {
      suggestions.push(`Section ${sectionNum} (${section.title}): Description is brief - more detail helps AI`);
      deduction += 1;
    } else if (section.description.length > 500) {
      warnings.push(`Section ${sectionNum} (${section.title}): Description is very long - consider being more concise`);
      deduction += 2;
    }
  });

  return { errors, warnings, suggestions, deduction };
}

/**
 * Validate a single section
 */
export function validateSection(section: TemplateSection): SectionValidationResult {
  const issues: string[] = [];
  const suggestions: string[] = [];

  if (!section.id || section.id.trim() === '') {
    issues.push('Section ID is required');
  } else if (!/^[a-z0-9-]+$/.test(section.id)) {
    issues.push('Section ID should use lowercase letters, numbers, and hyphens only');
  }

  if (!section.title || section.title.trim() === '') {
    issues.push('Section title is required');
  } else if (section.title.length < 3) {
    issues.push('Section title is too short (minimum 3 characters)');
  }

  if (section.order < 1) {
    issues.push('Section order must be at least 1');
  }

  if (!section.description || section.description.trim() === '') {
    suggestions.push('Add a description to guide AI content generation');
  } else if (section.description.length < 20) {
    suggestions.push('Description is brief - more detail helps produce better content');
  }

  return {
    valid: issues.length === 0,
    issues,
    suggestions,
  };
}

// ============================================================================
// TEMPLATE QUALITY CHECKS
// ============================================================================

/**
 * Check if template follows best practices
 */
export function checkTemplateBestPractices(template: CustomPRDTemplate): {
  passed: string[];
  failed: string[];
  score: number;
} {
  const passed: string[] = [];
  const failed: string[] = [];

  // Best practice 1: Has 8-15 sections
  if (template.sections.length >= 8 && template.sections.length <= 15) {
    passed.push('✓ Optimal number of sections (8-15)');
  } else {
    failed.push(`✗ Section count (${template.sections.length}) outside recommended range (8-15)`);
  }

  // Best practice 2: All sections have descriptions
  const sectionsWithDesc = template.sections.filter(s => s.description && s.description.trim().length >= 20);
  if (sectionsWithDesc.length === template.sections.length) {
    passed.push('✓ All sections have meaningful descriptions');
  } else {
    failed.push(`✗ ${template.sections.length - sectionsWithDesc.length} sections missing descriptions`);
  }

  // Best practice 3: Has context prompt
  if (template.contextPrompt && template.contextPrompt.length >= 50) {
    passed.push('✓ Has detailed context prompt for AI');
  } else {
    failed.push('✗ Missing or insufficient context prompt');
  }

  // Best practice 4: Has use cases
  if (template.useCases && template.useCases.length > 0) {
    passed.push('✓ Has example use cases');
  } else {
    failed.push('✗ No example use cases defined');
  }

  // Best practice 5: Proper categorization
  if (template.category && template.category !== 'custom') {
    passed.push('✓ Properly categorized');
  } else {
    failed.push('✗ Not categorized or using generic category');
  }

  // Best practice 6: Sequential ordering
  const isSequential = template.sections
    .sort((a, b) => a.order - b.order)
    .every((section, index) => section.order === index + 1);
  
  if (isSequential) {
    passed.push('✓ Sections have sequential ordering');
  } else {
    failed.push('✗ Section ordering has gaps or duplicates');
  }

  // Best practice 7: Unique section IDs
  const uniqueIds = new Set(template.sections.map(s => s.id)).size;
  if (uniqueIds === template.sections.length) {
    passed.push('✓ All section IDs are unique');
  } else {
    failed.push('✗ Duplicate section IDs found');
  }

  // Best practice 8: Template name follows conventions
  if (template.name.length >= 3 && template.name.length <= 50) {
    passed.push('✓ Template name length is appropriate');
  } else {
    failed.push('✗ Template name too short or too long');
  }

  // Calculate score
  const score = Math.round((passed.length / (passed.length + failed.length)) * 100);

  return { passed, failed, score };
}

/**
 * Get template quality grade
 */
export function getTemplateGrade(score: number): {
  grade: 'A+' | 'A' | 'B' | 'C' | 'D' | 'F';
  description: string;
  color: string;
} {
  if (score >= 95) return { grade: 'A+', description: 'Excellent', color: 'green' };
  if (score >= 85) return { grade: 'A', description: 'Very Good', color: 'green' };
  if (score >= 75) return { grade: 'B', description: 'Good', color: 'blue' };
  if (score >= 65) return { grade: 'C', description: 'Fair', color: 'yellow' };
  if (score >= 50) return { grade: 'D', description: 'Needs Improvement', color: 'orange' };
  return { grade: 'F', description: 'Poor Quality', color: 'red' };
}

// ============================================================================
// TEMPLATE SANITIZATION
// ============================================================================

/**
 * Sanitize template data before saving
 */
export function sanitizeTemplate(template: Partial<CustomPRDTemplate>): Partial<CustomPRDTemplate> {
  return {
    ...template,
    name: template.name?.trim(),
    description: template.description?.trim(),
    contextPrompt: template.contextPrompt?.trim(),
    sections: template.sections?.map(section => ({
      ...section,
      id: section.id.toLowerCase().replace(/[^a-z0-9-]/g, '-').replace(/-+/g, '-'),
      title: section.title.trim(),
      description: section.description?.trim() || '',
    })),
  };
}

/**
 * Fix common template issues automatically
 */
export function autoFixTemplate(template: CustomPRDTemplate): CustomPRDTemplate {
  // Fix section ordering
  const sortedSections = [...template.sections].sort((a, b) => a.order - b.order);
  const reorderedSections = sortedSections.map((section, index) => ({
    ...section,
    order: index + 1,
  }));

  // Remove duplicate IDs (keep first occurrence)
  const seenIds = new Set<string>();
  const uniqueSections = reorderedSections.filter(section => {
    if (seenIds.has(section.id)) {
      return false;
    }
    seenIds.add(section.id);
    return true;
  });

  return {
    ...template,
    sections: uniqueSections,
  };
}

export default {
  validateTemplate,
  validateSection,
  checkTemplateBestPractices,
  getTemplateGrade,
  sanitizeTemplate,
  autoFixTemplate,
};
