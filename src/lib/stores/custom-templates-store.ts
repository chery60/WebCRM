'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { CustomPRDTemplate } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomTemplatesState {
  // Custom templates created by user
  templates: CustomPRDTemplate[];
  
  // Actions
  addTemplate: (template: Omit<CustomPRDTemplate, 'id' | 'createdAt' | 'updatedAt'>) => CustomPRDTemplate;
  updateTemplate: (id: string, updates: Partial<Omit<CustomPRDTemplate, 'id' | 'createdAt'>>) => void;
  deleteTemplate: (id: string) => void;
  getTemplate: (id: string) => CustomPRDTemplate | undefined;
  duplicateTemplate: (id: string, newName: string) => CustomPRDTemplate | undefined;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return `custom_template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// DEFAULT SECTIONS FOR NEW TEMPLATES
// ============================================================================

export const DEFAULT_TEMPLATE_SECTIONS = [
  { id: 'executive-summary', title: 'Executive Summary', order: 1 },
  { id: 'problem-statement', title: 'Problem Statement', order: 2 },
  { id: 'goals-success-metrics', title: 'Goals & Success Metrics', order: 3 },
  { id: 'user-personas', title: 'User Personas', order: 4 },
  { id: 'user-stories', title: 'User Stories', order: 5 },
  { id: 'functional-requirements', title: 'Functional Requirements', order: 6 },
  { id: 'non-functional-requirements', title: 'Non-Functional Requirements', order: 7 },
  { id: 'timeline-milestones', title: 'Timeline & Milestones', order: 8 },
  { id: 'risks-mitigations', title: 'Risks & Mitigations', order: 9 },
  { id: 'open-questions', title: 'Open Questions', order: 10 },
];

// Additional sections users can add
export const AVAILABLE_SECTIONS = [
  { id: 'executive-summary', title: 'Executive Summary' },
  { id: 'problem-statement', title: 'Problem Statement' },
  { id: 'goals-success-metrics', title: 'Goals & Success Metrics' },
  { id: 'user-personas', title: 'User Personas' },
  { id: 'user-stories', title: 'User Stories' },
  { id: 'functional-requirements', title: 'Functional Requirements' },
  { id: 'non-functional-requirements', title: 'Non-Functional Requirements' },
  { id: 'ux-considerations', title: 'UI/UX Considerations' },
  { id: 'timeline-milestones', title: 'Timeline & Milestones' },
  { id: 'risks-mitigations', title: 'Risks & Mitigations' },
  { id: 'open-questions', title: 'Open Questions' },
  { id: 'business-context', title: 'Business Context & Market Opportunity' },
  { id: 'integrations', title: 'Integrations & API Requirements' },
  { id: 'security-compliance', title: 'Security & Compliance' },
  { id: 'pricing-packaging', title: 'Pricing & Packaging Impact' },
  { id: 'go-to-market', title: 'Go-to-Market Considerations' },
  { id: 'engagement-retention', title: 'Engagement & Retention Strategy' },
  { id: 'monetization', title: 'Monetization Strategy' },
  { id: 'growth-virality', title: 'Growth & Virality Loops' },
  { id: 'platform-architecture', title: 'Platform Architecture' },
  { id: 'api-design', title: 'API Design & Specification' },
  { id: 'documentation', title: 'Documentation Requirements' },
  { id: 'developer-experience', title: 'Developer Experience (DX)' },
  { id: 'training-adoption', title: 'Training & Adoption Plan' },
  { id: 'data-requirements', title: 'Data & Reporting Requirements' },
  { id: 'access-permissions', title: 'Access Control & Permissions' },
  { id: 'technical-notes', title: 'Technical Notes' },
  { id: 'dependencies', title: 'Dependencies' },
  { id: 'assumptions', title: 'Assumptions' },
  { id: 'constraints', title: 'Constraints' },
  { id: 'out-of-scope', title: 'Out of Scope' },
  { id: 'appendix', title: 'Appendix' },
];

// ============================================================================
// STORE
// ============================================================================

export const useCustomTemplatesStore = create<CustomTemplatesState>()(
  persist(
    (set, get) => ({
      templates: [],

      addTemplate: (templateData) => {
        const newTemplate: CustomPRDTemplate = {
          id: generateId(),
          name: templateData.name,
          description: templateData.description,
          sections: templateData.sections,
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          templates: [...state.templates, newTemplate],
        }));

        return newTemplate;
      },

      updateTemplate: (id, updates) => {
        set((state) => ({
          templates: state.templates.map((template) =>
            template.id === id
              ? { ...template, ...updates, updatedAt: new Date() }
              : template
          ),
        }));
      },

      deleteTemplate: (id) => {
        set((state) => ({
          templates: state.templates.filter((template) => template.id !== id),
        }));
      },

      getTemplate: (id) => {
        return get().templates.find((template) => template.id === id);
      },

      duplicateTemplate: (id, newName) => {
        const original = get().templates.find((template) => template.id === id);
        if (!original) return undefined;

        const duplicated: CustomPRDTemplate = {
          id: generateId(),
          name: newName,
          description: original.description,
          sections: [...original.sections],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          templates: [...state.templates, duplicated],
        }));

        return duplicated;
      },
    }),
    {
      name: 'venture-custom-prd-templates',
      partialize: (state) => ({
        templates: state.templates,
      }),
    }
  )
);

export default useCustomTemplatesStore;
