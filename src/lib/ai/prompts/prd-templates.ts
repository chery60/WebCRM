/**
 * PRD Templates for Different Product Types
 *
 * All templates use the Linear-style structured format with:
 * - Overview, Problem, Current Scenario, Considerations, Assumptions, Diagrams, Solution
 * - Domain-specific context prompts for each product type
 */

import type { PRDTemplateType, PRDTemplate } from '@/types';

// ============================================================================
// LINEAR-STYLE SECTIONS (Used by all templates)
// ============================================================================

const LINEAR_SECTIONS = [
  { id: 'overview', title: '📋 Overview', order: 1 },
  { id: 'problem', title: '🎯 Problem', order: 2 },
  { id: 'current-scenario', title: '📍 Current Scenario', order: 3 },
  { id: 'considerations', title: '⚖️ Considerations', order: 4 },
  { id: 'assumptions', title: '💭 Assumptions', order: 5 },
  { id: 'diagrams', title: '📊 Diagrams', order: 6 },
  { id: 'solution', title: '✨ Solution', order: 7 },
];

// ============================================================================
// PRD TEMPLATES BY PRODUCT TYPE
// ============================================================================

export const PRD_TEMPLATES: Record<PRDTemplateType, PRDTemplate> = {
  'b2b-saas': {
    id: 'b2b-saas',
    name: 'B2B SaaS Product',
    description: 'For business software, enterprise tools, and professional services platforms',
    sections: LINEAR_SECTIONS,
  },

  'consumer-app': {
    id: 'consumer-app',
    name: 'Consumer Mobile/Web App',
    description: 'For consumer-facing applications, social platforms, and lifestyle apps',
    sections: LINEAR_SECTIONS,
  },

  'platform': {
    id: 'platform',
    name: 'Platform / Marketplace',
    description: 'For two-sided marketplaces, developer platforms, and ecosystem products',
    sections: LINEAR_SECTIONS,
  },

  'api-product': {
    id: 'api-product',
    name: 'API / Developer Product',
    description: 'For APIs, SDKs, developer tools, and infrastructure products',
    sections: LINEAR_SECTIONS,
  },

  'internal-tool': {
    id: 'internal-tool',
    name: 'Internal Tool',
    description: 'For internal productivity tools, admin systems, and operational software',
    sections: LINEAR_SECTIONS,
  },

  'custom': {
    id: 'custom',
    name: 'Custom Template',
    description: 'Linear-style PRD with Overview, Problem, Solution structure',
    sections: LINEAR_SECTIONS,
  },
};

// ============================================================================
// TEMPLATE-SPECIFIC CONTEXT PROMPTS
// ============================================================================

export const TEMPLATE_CONTEXT_PROMPTS: Record<PRDTemplateType, string> = {
  'b2b-saas': `You are writing a PRD for a B2B SaaS product. Consider these aspects in your analysis:
- Multiple stakeholders: End users, buyers, admins, IT
- Integration requirements with existing enterprise tools
- Security, compliance, and audit requirements (SOC2, GDPR, etc.)
- Multi-tenant architecture considerations
- SSO, RBAC, and enterprise authentication needs

Structure your PRD using ONLY these sections: Overview, Problem, Current Scenario, Considerations, Assumptions, Diagrams, Solution.`,

  'consumer-app': `You are writing a PRD for a consumer application. Consider these aspects in your analysis:
- User acquisition and activation flows
- Engagement loops and retention mechanics
- Onboarding experience (first-time user experience)
- Mobile-first design considerations
- Privacy and data minimization

Structure your PRD using ONLY these sections: Overview, Problem, Current Scenario, Considerations, Assumptions, Diagrams, Solution.`,

  'platform': `You are writing a PRD for a platform/marketplace. Consider these aspects in your analysis:
- Multiple user types (supply side, demand side)
- Network effects and value creation
- Trust and safety mechanisms
- Matching/discovery algorithms
- Platform policies and governance

Structure your PRD using ONLY these sections: Overview, Problem, Current Scenario, Considerations, Assumptions, Diagrams, Solution.`,

  'api-product': `You are writing a PRD for an API/developer product. Consider these aspects in your analysis:
- Developer experience (DX) is paramount
- Clear API design following REST/GraphQL best practices
- Authentication (API keys, OAuth, JWT)
- Rate limiting and versioning
- Error handling and documentation

Structure your PRD using ONLY these sections: Overview, Problem, Current Scenario, Considerations, Assumptions, Diagrams, Solution.`,

  'internal-tool': `You are writing a PRD for an internal tool. Consider these aspects in your analysis:
- Known user base with direct access for feedback
- Integration with existing internal systems
- Training and change management needs
- Role-based access control
- Cost savings and efficiency metrics

Structure your PRD using ONLY these sections: Overview, Problem, Current Scenario, Considerations, Assumptions, Diagrams, Solution.`,

  'custom': `You are writing a PRD using the Linear-style structured format.
Focus on clarity, problem-first thinking, and actionable outcomes.

Structure your PRD using ONLY these sections: Overview, Problem, Current Scenario, Considerations, Assumptions, Diagrams, Solution.`,
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function getTemplate(type: PRDTemplateType): PRDTemplate {
  return PRD_TEMPLATES[type] || PRD_TEMPLATES.custom;
}

export function getTemplateContextPrompt(type: PRDTemplateType): string {
  return TEMPLATE_CONTEXT_PROMPTS[type] || TEMPLATE_CONTEXT_PROMPTS.custom;
}

export function getAllTemplates(): PRDTemplate[] {
  return Object.values(PRD_TEMPLATES);
}

export default {
  PRD_TEMPLATES,
  TEMPLATE_CONTEXT_PROMPTS,
  getTemplate,
  getTemplateContextPrompt,
  getAllTemplates,
};
