'use client';

import type { TemplateCategory, TemplateSection } from '@/types';

/**
 * A safe representation of templates inside import/export payloads.
 * Note: Dates are serialized as strings in JSON exports; we treat them as unknown on import.
 */
export type TemplateExportedTemplate = {
  id?: string;
  name: string;
  description?: string;
  sections: TemplateSection[];
  contextPrompt?: string;
  icon?: string;
  color?: string;
  useCases?: string[];
  category?: TemplateCategory;
};

export function isTemplateExportedTemplate(value: unknown): value is TemplateExportedTemplate {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  if (typeof v.name !== 'string') return false;
  if (!Array.isArray(v.sections)) return false;
  return true;
}
