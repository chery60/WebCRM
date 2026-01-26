'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { 
  CustomPRDTemplate, 
  TemplateSection, 
  TemplateCategory,
  TemplateVersion,
  TemplateExportFormat,
  TemplateImportResult 
} from '@/types';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomTemplatesState {
  // All templates (including seeded starter templates)
  templates: CustomPRDTemplate[];
  
  // Track if starter templates have been seeded
  hasSeededStarterTemplates: boolean;
  
  // Actions
  addTemplate: (template: Omit<CustomPRDTemplate, 'id' | 'createdAt' | 'updatedAt'>) => CustomPRDTemplate;
  updateTemplate: (id: string, updates: Partial<Omit<CustomPRDTemplate, 'id' | 'createdAt'>>, changeDescription?: string) => void;
  deleteTemplate: (id: string) => void;
  getTemplate: (id: string) => CustomPRDTemplate | undefined;
  getTemplateContextPrompt: (id: string) => string;
  duplicateTemplate: (id: string, newName: string) => CustomPRDTemplate | undefined;
  seedStarterTemplates: () => void;
  resetToStarterTemplates: () => void;
  
  // Category helpers
  getTemplatesByCategory: (category: TemplateCategory) => CustomPRDTemplate[];
  
  // Version history
  getTemplateVersionHistory: (id: string) => TemplateVersion[];
  restoreTemplateVersion: (templateId: string, versionId: string) => boolean;
  
  // Import/Export
  exportTemplates: (templateIds: string[]) => TemplateExportFormat;
  exportAllTemplates: () => TemplateExportFormat;
  importTemplates: (data: TemplateExportFormat, overwriteExisting?: boolean) => TemplateImportResult;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function generateId(): string {
  return `custom_template_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// STARTER TEMPLATES (Seeded on first load, fully editable by users)
// ============================================================================

export const STARTER_TEMPLATES: Omit<CustomPRDTemplate, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'starter-b2b-saas',
    name: 'B2B SaaS Product',
    description: 'For business software, enterprise tools, and professional services platforms',
    isStarterTemplate: true,
    icon: 'building2',
    color: 'bg-blue-500/10 text-blue-600 border-blue-200 dark:border-blue-800',
    useCases: ['CRM software', 'Project management tools', 'HR platforms', 'Analytics dashboards'],
    category: 'saas',
    version: 1,
    contextPrompt: `You are writing a PRD for a B2B SaaS product. Keep in mind:
- Multiple stakeholders: End users, buyers, admins, IT
- Long sales cycles and evaluation processes
- Integration requirements with existing enterprise tools
- Security, compliance, and audit requirements (SOC2, GDPR, etc.)
- Pricing and packaging implications
- Customer success and support considerations
- Multi-tenant architecture considerations
- SSO, RBAC, and enterprise authentication needs`,
    sections: [
      { id: 'executive-summary', title: 'Executive Summary', order: 1 },
      { id: 'business-context', title: 'Business Context & Market Opportunity', order: 2 },
      { id: 'problem-statement', title: 'Problem Statement', order: 3 },
      { id: 'goals-success-metrics', title: 'Goals & Success Metrics', order: 4 },
      { id: 'user-personas', title: 'User Personas & Buyer Personas', order: 5 },
      { id: 'user-stories', title: 'User Stories & Use Cases', order: 6 },
      { id: 'functional-requirements', title: 'Functional Requirements', order: 7 },
      { id: 'non-functional-requirements', title: 'Non-Functional Requirements', order: 8 },
      { id: 'integrations', title: 'Integrations & API Requirements', order: 9 },
      { id: 'security-compliance', title: 'Security & Compliance', order: 10 },
      { id: 'ux-considerations', title: 'UI/UX Considerations', order: 11 },
      { id: 'pricing-packaging', title: 'Pricing & Packaging Impact', order: 12 },
      { id: 'go-to-market', title: 'Go-to-Market Considerations', order: 13 },
      { id: 'timeline-milestones', title: 'Timeline & Milestones', order: 14 },
      { id: 'risks-mitigations', title: 'Risks & Mitigations', order: 15 },
      { id: 'open-questions', title: 'Open Questions', order: 16 },
    ],
  },
  {
    id: 'starter-consumer-app',
    name: 'Consumer Mobile/Web App',
    description: 'For consumer-facing applications, social platforms, and lifestyle apps',
    isStarterTemplate: true,
    icon: 'smartphone',
    color: 'bg-purple-500/10 text-purple-600 border-purple-200 dark:border-purple-800',
    useCases: ['Social media apps', 'Fitness trackers', 'Food delivery', 'Entertainment apps'],
    category: 'consumer',
    version: 1,
    contextPrompt: `You are writing a PRD for a consumer application. Keep in mind:
- User acquisition and activation flows
- Engagement loops and retention mechanics
- Viral/sharing capabilities
- Onboarding experience (first-time user experience)
- Push notifications and re-engagement
- In-app purchases or subscription models
- Social features and community aspects
- Mobile-first design considerations
- App store optimization (ASO)
- Privacy and data minimization`,
    sections: [
      { id: 'executive-summary', title: 'Executive Summary', order: 1 },
      { id: 'vision-opportunity', title: 'Vision & Market Opportunity', order: 2 },
      { id: 'problem-statement', title: 'Problem Statement', order: 3 },
      { id: 'goals-success-metrics', title: 'Goals & Success Metrics', order: 4 },
      { id: 'user-personas', title: 'User Personas', order: 5 },
      { id: 'user-journey', title: 'User Journey & Experience', order: 6 },
      { id: 'user-stories', title: 'User Stories', order: 7 },
      { id: 'functional-requirements', title: 'Feature Requirements', order: 8 },
      { id: 'engagement-retention', title: 'Engagement & Retention Strategy', order: 9 },
      { id: 'ux-considerations', title: 'UI/UX & Design', order: 10 },
      { id: 'non-functional-requirements', title: 'Performance & Quality', order: 11 },
      { id: 'monetization', title: 'Monetization Strategy', order: 12 },
      { id: 'growth-virality', title: 'Growth & Virality Loops', order: 13 },
      { id: 'timeline-milestones', title: 'Timeline & Milestones', order: 14 },
      { id: 'risks-mitigations', title: 'Risks & Mitigations', order: 15 },
      { id: 'open-questions', title: 'Open Questions', order: 16 },
    ],
  },
  {
    id: 'starter-platform',
    name: 'Platform / Marketplace',
    description: 'For two-sided marketplaces, developer platforms, and ecosystem products',
    isStarterTemplate: true,
    icon: 'network',
    color: 'bg-green-500/10 text-green-600 border-green-200 dark:border-green-800',
    useCases: ['E-commerce marketplaces', 'Freelance platforms', 'Developer ecosystems', 'Content platforms'],
    category: 'platform',
    version: 1,
    contextPrompt: `You are writing a PRD for a platform/marketplace. Keep in mind:
- Multiple user types (supply side, demand side, possibly more)
- Chicken-and-egg problem and bootstrap strategy
- Network effects and value creation
- Trust and safety mechanisms
- Matching/discovery algorithms
- Transaction flow and payment handling
- Rating and review systems
- Platform policies and governance
- Take rate and monetization strategy
- Liquidity and marketplace dynamics`,
    sections: [
      { id: 'executive-summary', title: 'Executive Summary', order: 1 },
      { id: 'platform-vision', title: 'Platform Vision & Strategy', order: 2 },
      { id: 'problem-statement', title: 'Problem Statement', order: 3 },
      { id: 'goals-success-metrics', title: 'Goals & Success Metrics', order: 4 },
      { id: 'stakeholder-personas', title: 'Multi-Sided Personas', order: 5 },
      { id: 'value-exchange', title: 'Value Exchange & Network Effects', order: 6 },
      { id: 'user-stories', title: 'User Stories (All Sides)', order: 7 },
      { id: 'functional-requirements', title: 'Functional Requirements', order: 8 },
      { id: 'platform-architecture', title: 'Platform Architecture', order: 9 },
      { id: 'api-developer-experience', title: 'API & Developer Experience', order: 10 },
      { id: 'trust-safety', title: 'Trust & Safety', order: 11 },
      { id: 'governance', title: 'Platform Governance & Policies', order: 12 },
      { id: 'non-functional-requirements', title: 'Scalability & Performance', order: 13 },
      { id: 'timeline-milestones', title: 'Timeline & Milestones', order: 14 },
      { id: 'risks-mitigations', title: 'Risks & Mitigations', order: 15 },
      { id: 'open-questions', title: 'Open Questions', order: 16 },
    ],
  },
  {
    id: 'starter-api-product',
    name: 'API / Developer Product',
    description: 'For APIs, SDKs, developer tools, and infrastructure products',
    isStarterTemplate: true,
    icon: 'code',
    color: 'bg-orange-500/10 text-orange-600 border-orange-200 dark:border-orange-800',
    useCases: ['Payment APIs', 'Communication SDKs', 'AI/ML services', 'Data integration tools'],
    category: 'api',
    version: 1,
    contextPrompt: `You are writing a PRD for an API/developer product. Keep in mind:
- Developer experience (DX) is paramount
- Clear, comprehensive documentation
- Intuitive API design following REST/GraphQL best practices
- SDK availability for popular languages
- Authentication (API keys, OAuth, JWT)
- Rate limiting and quota management
- Versioning and backward compatibility
- Error handling and status codes
- Webhooks and event-driven architecture
- Sandbox/testing environment
- Code samples and quickstart guides
- Developer community and support`,
    sections: [
      { id: 'executive-summary', title: 'Executive Summary', order: 1 },
      { id: 'problem-statement', title: 'Problem Statement', order: 2 },
      { id: 'goals-success-metrics', title: 'Goals & Success Metrics', order: 3 },
      { id: 'developer-personas', title: 'Developer Personas', order: 4 },
      { id: 'user-stories', title: 'Developer Use Cases', order: 5 },
      { id: 'api-design', title: 'API Design & Specification', order: 6 },
      { id: 'functional-requirements', title: 'Functional Requirements', order: 7 },
      { id: 'sdk-libraries', title: 'SDKs & Client Libraries', order: 8 },
      { id: 'documentation', title: 'Documentation Requirements', order: 9 },
      { id: 'developer-experience', title: 'Developer Experience (DX)', order: 10 },
      { id: 'non-functional-requirements', title: 'Performance & Reliability', order: 11 },
      { id: 'security-authentication', title: 'Security & Authentication', order: 12 },
      { id: 'rate-limiting-quotas', title: 'Rate Limiting & Quotas', order: 13 },
      { id: 'versioning-deprecation', title: 'Versioning & Deprecation', order: 14 },
      { id: 'timeline-milestones', title: 'Timeline & Milestones', order: 15 },
      { id: 'risks-mitigations', title: 'Risks & Mitigations', order: 16 },
      { id: 'open-questions', title: 'Open Questions', order: 17 },
    ],
  },
  {
    id: 'starter-internal-tool',
    name: 'Internal Tool',
    description: 'For internal productivity tools, admin systems, and operational software',
    isStarterTemplate: true,
    icon: 'wrench',
    color: 'bg-gray-500/10 text-gray-600 border-gray-200 dark:border-gray-700',
    useCases: ['Admin dashboards', 'Reporting tools', 'Workflow automation', 'Data management'],
    category: 'internal',
    version: 1,
    contextPrompt: `You are writing a PRD for an internal tool. Keep in mind:
- Known user base with direct access for feedback
- Integration with existing internal systems
- Training and change management needs
- Can iterate faster with less polish
- Data access and security within organization
- Audit trails and compliance requirements
- Role-based access control
- Reporting and analytics for stakeholders
- Cost savings and efficiency metrics
- Adoption and usage tracking`,
    sections: [
      { id: 'executive-summary', title: 'Executive Summary', order: 1 },
      { id: 'problem-statement', title: 'Problem Statement & Current State', order: 2 },
      { id: 'goals-success-metrics', title: 'Goals & Success Metrics', order: 3 },
      { id: 'user-personas', title: 'Internal User Personas', order: 4 },
      { id: 'user-stories', title: 'User Stories & Workflows', order: 5 },
      { id: 'functional-requirements', title: 'Functional Requirements', order: 6 },
      { id: 'data-requirements', title: 'Data & Reporting Requirements', order: 7 },
      { id: 'integration-requirements', title: 'Integration Requirements', order: 8 },
      { id: 'ux-considerations', title: 'UI/UX Considerations', order: 9 },
      { id: 'access-permissions', title: 'Access Control & Permissions', order: 10 },
      { id: 'non-functional-requirements', title: 'Non-Functional Requirements', order: 11 },
      { id: 'training-adoption', title: 'Training & Adoption Plan', order: 12 },
      { id: 'timeline-milestones', title: 'Timeline & Milestones', order: 13 },
      { id: 'risks-mitigations', title: 'Risks & Mitigations', order: 14 },
      { id: 'open-questions', title: 'Open Questions', order: 15 },
    ],
  },
  {
    id: 'starter-custom',
    name: 'Blank Template',
    description: 'Start with essential sections and customize as needed',
    isStarterTemplate: true,
    icon: 'file-text',
    color: 'bg-primary/10 text-primary border-primary/20',
    useCases: ['Unique products', 'Hybrid solutions', 'Experimental features', 'Quick prototypes'],
    category: 'custom',
    version: 1,
    contextPrompt: `You are writing a PRD with a custom structure. 
Adapt the format and depth to the specific needs of this product.
Focus on the most relevant sections and be flexible with the structure.`,
    sections: [
      { id: 'executive-summary', title: 'Executive Summary', order: 1 },
      { id: 'problem-statement', title: 'Problem Statement', order: 2 },
      { id: 'goals-success-metrics', title: 'Goals & Success Metrics', order: 3 },
      { id: 'user-personas', title: 'User Personas', order: 4 },
      { id: 'user-stories', title: 'User Stories', order: 5 },
      { id: 'functional-requirements', title: 'Functional Requirements', order: 6 },
      { id: 'non-functional-requirements', title: 'Non-Functional Requirements', order: 7 },
      { id: 'ux-considerations', title: 'UI/UX Considerations', order: 8 },
      { id: 'timeline-milestones', title: 'Timeline & Milestones', order: 9 },
      { id: 'risks-mitigations', title: 'Risks & Mitigations', order: 10 },
      { id: 'open-questions', title: 'Open Questions', order: 11 },
    ],
  },
];

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

// Additional sections users can add with default descriptions
export const AVAILABLE_SECTIONS: { id: string; title: string; description: string }[] = [
  { id: 'executive-summary', title: 'Executive Summary', description: 'A brief overview of the product, its purpose, key features, and expected outcomes. Should be concise enough for stakeholders to understand the product at a glance.' },
  { id: 'problem-statement', title: 'Problem Statement', description: 'Clearly define the problem being solved, who experiences it, and the impact of not solving it. Include data or evidence where possible.' },
  { id: 'goals-success-metrics', title: 'Goals & Success Metrics', description: 'Define measurable objectives and KPIs that will indicate success. Include both leading and lagging indicators.' },
  { id: 'user-personas', title: 'User Personas', description: 'Detailed profiles of target users including demographics, behaviors, needs, pain points, and goals.' },
  { id: 'user-stories', title: 'User Stories', description: 'Describe features from the user perspective using the format: "As a [user type], I want [action] so that [benefit]."' },
  { id: 'functional-requirements', title: 'Functional Requirements', description: 'Specific features and capabilities the product must have. Be detailed and prioritize using MoSCoW or similar framework.' },
  { id: 'non-functional-requirements', title: 'Non-Functional Requirements', description: 'Performance, scalability, reliability, security, and other quality attributes the product must meet.' },
  { id: 'ux-considerations', title: 'UI/UX Considerations', description: 'Design principles, interaction patterns, accessibility requirements, and user experience guidelines.' },
  { id: 'timeline-milestones', title: 'Timeline & Milestones', description: 'Key phases, deliverables, and target dates. Include dependencies and critical path items.' },
  { id: 'risks-mitigations', title: 'Risks & Mitigations', description: 'Potential risks to the project and strategies to prevent or minimize their impact.' },
  { id: 'open-questions', title: 'Open Questions', description: 'Unresolved questions that need answers before or during development. Include who needs to answer each.' },
  { id: 'business-context', title: 'Business Context & Market Opportunity', description: 'Market analysis, competitive landscape, business case, and strategic alignment.' },
  { id: 'integrations', title: 'Integrations & API Requirements', description: 'Third-party services, APIs, and systems the product needs to integrate with.' },
  { id: 'security-compliance', title: 'Security & Compliance', description: 'Security requirements, data protection, privacy considerations, and regulatory compliance needs.' },
  { id: 'pricing-packaging', title: 'Pricing & Packaging Impact', description: 'How this feature affects pricing tiers, packaging, and monetization strategy.' },
  { id: 'go-to-market', title: 'Go-to-Market Considerations', description: 'Launch strategy, marketing requirements, sales enablement, and customer communication plans.' },
  { id: 'engagement-retention', title: 'Engagement & Retention Strategy', description: 'Features and mechanics designed to increase user engagement and reduce churn.' },
  { id: 'monetization', title: 'Monetization Strategy', description: 'Revenue model, pricing strategy, and paths to profitability.' },
  { id: 'growth-virality', title: 'Growth & Virality Loops', description: 'Mechanisms for organic growth, referral programs, and network effects.' },
  { id: 'platform-architecture', title: 'Platform Architecture', description: 'High-level technical architecture, system design, and infrastructure requirements.' },
  { id: 'api-design', title: 'API Design & Specification', description: 'API endpoints, request/response formats, authentication, and versioning strategy.' },
  { id: 'documentation', title: 'Documentation Requirements', description: 'User guides, API docs, help content, and training materials needed.' },
  { id: 'developer-experience', title: 'Developer Experience (DX)', description: 'SDK design, documentation quality, onboarding flow, and developer support strategy.' },
  { id: 'training-adoption', title: 'Training & Adoption Plan', description: 'User training, change management, and adoption strategy for internal tools.' },
  { id: 'data-requirements', title: 'Data & Reporting Requirements', description: 'Data collection, storage, analytics, and reporting capabilities needed.' },
  { id: 'access-permissions', title: 'Access Control & Permissions', description: 'Role-based access control, permission levels, and authorization requirements.' },
  { id: 'technical-notes', title: 'Technical Notes', description: 'Implementation details, technical constraints, and architecture decisions.' },
  { id: 'dependencies', title: 'Dependencies', description: 'External dependencies, team dependencies, and blockers that could impact delivery.' },
  { id: 'assumptions', title: 'Assumptions', description: 'Key assumptions made during planning that should be validated.' },
  { id: 'constraints', title: 'Constraints', description: 'Technical, business, or resource constraints that limit solution options.' },
  { id: 'out-of-scope', title: 'Out of Scope', description: 'Explicitly state what is NOT included in this release to manage expectations.' },
  { id: 'appendix', title: 'Appendix', description: 'Supporting materials, research data, wireframes, and additional references.' },
];

// ============================================================================
// HELPER: Create seeded templates with timestamps
// ============================================================================

function createSeededTemplates(): CustomPRDTemplate[] {
  const now = new Date();
  return STARTER_TEMPLATES.map((template) => ({
    ...template,
    createdAt: now,
    updatedAt: now,
  }));
}

// ============================================================================
// HELPER: Generate version ID
// ============================================================================

function generateVersionId(): string {
  return `version_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================================================
// STORE
// ============================================================================

export const useCustomTemplatesStore = create<CustomTemplatesState>()(
  persist(
    (set, get) => ({
      templates: [],
      hasSeededStarterTemplates: false,

      addTemplate: (templateData) => {
        const newTemplate: CustomPRDTemplate = {
          id: generateId(),
          name: templateData.name,
          description: templateData.description,
          sections: templateData.sections,
          isStarterTemplate: false,
          contextPrompt: templateData.contextPrompt,
          icon: templateData.icon,
          color: templateData.color,
          useCases: templateData.useCases,
          category: templateData.category || 'custom',
          version: 1,
          versionHistory: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          templates: [...state.templates, newTemplate],
        }));

        return newTemplate;
      },

      updateTemplate: (id, updates, changeDescription) => {
        set((state) => ({
          templates: state.templates.map((template) => {
            if (template.id !== id) return template;
            
            // Create a version snapshot before updating
            const currentVersion = template.version || 1;
            const newVersion: TemplateVersion = {
              id: generateVersionId(),
              version: currentVersion,
              name: template.name,
              description: template.description,
              sections: template.sections.map(s => ({ ...s })),
              contextPrompt: template.contextPrompt,
              category: template.category, // Save category in version history
              changeDescription: changeDescription || `Updated template`,
              createdAt: new Date(),
            };
            
            // Keep only last 10 versions to prevent storage bloat
            const existingHistory = template.versionHistory || [];
            const updatedHistory = [...existingHistory, newVersion].slice(-10);
            
            return { 
              ...template, 
              ...updates, 
              version: currentVersion + 1,
              versionHistory: updatedHistory,
              updatedAt: new Date() 
            };
          }),
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

      getTemplateContextPrompt: (id) => {
        const template = get().templates.find((t) => t.id === id);
        if (template?.contextPrompt) {
          return template.contextPrompt;
        }
        // Default context prompt for templates without one
        return `You are writing a PRD with a custom structure. 
Adapt the format and depth to the specific needs of this product.
Focus on the most relevant sections and be flexible with the structure.`;
      },

      duplicateTemplate: (id, newName) => {
        const original = get().templates.find((template) => template.id === id);
        if (!original) return undefined;

        const duplicated: CustomPRDTemplate = {
          id: generateId(),
          name: newName,
          description: original.description,
          sections: original.sections.map(s => ({ ...s })), // Deep copy sections with descriptions
          isStarterTemplate: false,
          contextPrompt: original.contextPrompt,
          icon: original.icon,
          color: original.color,
          useCases: original.useCases ? [...original.useCases] : undefined,
          category: original.category,
          version: 1,
          versionHistory: [],
          createdAt: new Date(),
          updatedAt: new Date(),
        };

        set((state) => ({
          templates: [...state.templates, duplicated],
        }));

        return duplicated;
      },

      seedStarterTemplates: () => {
        const state = get();
        if (state.hasSeededStarterTemplates) return;

        set({
          templates: [...createSeededTemplates(), ...state.templates],
          hasSeededStarterTemplates: true,
        });
      },

      resetToStarterTemplates: () => {
        set({
          templates: createSeededTemplates(),
          hasSeededStarterTemplates: true,
        });
      },

      // Category helpers
      getTemplatesByCategory: (category) => {
        return get().templates.filter((t) => t.category === category);
      },

      // Version history
      getTemplateVersionHistory: (id) => {
        const template = get().templates.find((t) => t.id === id);
        return template?.versionHistory || [];
      },

      restoreTemplateVersion: (templateId, versionId) => {
        const template = get().templates.find((t) => t.id === templateId);
        if (!template) return false;

        const version = template.versionHistory?.find((v) => v.id === versionId);
        if (!version) return false;

        // Restore the version (this will also create a new version entry)
        get().updateTemplate(templateId, {
          name: version.name,
          description: version.description,
          sections: version.sections.map(s => ({ ...s })),
          contextPrompt: version.contextPrompt,
          category: version.category, // Restore category from version history
        }, `Restored from version ${version.version}`);

        return true;
      },

      // Import/Export
      exportTemplates: (templateIds) => {
        const templates = get().templates.filter((t) => templateIds.includes(t.id));
        
        return {
          formatVersion: '1.0',
          exportedAt: new Date(),
          templates: templates.map(({ createdAt, updatedAt, versionHistory, ...rest }) => rest),
        };
      },

      exportAllTemplates: () => {
        const templates = get().templates;
        
        return {
          formatVersion: '1.0',
          exportedAt: new Date(),
          templates: templates.map(({ createdAt, updatedAt, versionHistory, ...rest }) => rest),
        };
      },

      importTemplates: (data, overwriteExisting = false) => {
        const result: TemplateImportResult = {
          success: true,
          imported: 0,
          skipped: 0,
          errors: [],
        };

        // Validate format version
        if (data.formatVersion !== '1.0') {
          result.success = false;
          result.errors.push(`Unsupported format version: ${data.formatVersion}`);
          return result;
        }

        if (!Array.isArray(data.templates) || data.templates.length === 0) {
          result.success = false;
          result.errors.push('No templates found in import data');
          return result;
        }

        const existingTemplates = get().templates;
        const newTemplates: CustomPRDTemplate[] = [];

        for (const importedTemplate of data.templates) {
          try {
            // Validate required fields
            if (!importedTemplate.name || !importedTemplate.sections) {
              result.errors.push(`Skipped template: missing required fields`);
              result.skipped++;
              continue;
            }

            // Check if template with same ID exists
            const existingIndex = existingTemplates.findIndex((t) => t.id === importedTemplate.id);
            
            if (existingIndex >= 0) {
              if (overwriteExisting) {
                // Update existing template
                const existing = existingTemplates[existingIndex];
                existingTemplates[existingIndex] = {
                  ...existing,
                  ...importedTemplate,
                  isStarterTemplate: false, // Imported templates are never starter templates
                  version: (existing.version || 1) + 1,
                  updatedAt: new Date(),
                };
                result.imported++;
              } else {
                // Create as new with different ID
                newTemplates.push({
                  ...importedTemplate,
                  id: generateId(),
                  name: `${importedTemplate.name} (Imported)`,
                  isStarterTemplate: false,
                  version: 1,
                  versionHistory: [],
                  createdAt: new Date(),
                  updatedAt: new Date(),
                });
                result.imported++;
              }
            } else {
              // Add as new template
              newTemplates.push({
                ...importedTemplate,
                id: importedTemplate.id || generateId(),
                isStarterTemplate: false,
                version: 1,
                versionHistory: [],
                createdAt: new Date(),
                updatedAt: new Date(),
              });
              result.imported++;
            }
          } catch (error) {
            result.errors.push(`Failed to import template "${importedTemplate.name}": ${error}`);
            result.skipped++;
          }
        }

        // Update store
        set({
          templates: [...existingTemplates, ...newTemplates],
        });

        return result;
      },
    }),
    {
      name: 'venture-custom-prd-templates',
      partialize: (state) => ({
        templates: state.templates,
        hasSeededStarterTemplates: state.hasSeededStarterTemplates,
      }),
    }
  )
);

export default useCustomTemplatesStore;
