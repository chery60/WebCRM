/**
 * PRD Templates for Different Product Types
 * 
 * Each template is optimized for its specific domain with:
 * - Domain-specific sections
 * - Industry best practices
 * - Relevant examples and guidance
 */

import type { PRDTemplateType, PRDTemplate } from '@/types';

// ============================================================================
// PRD TEMPLATES BY PRODUCT TYPE
// ============================================================================

export const PRD_TEMPLATES: Record<PRDTemplateType, PRDTemplate> = {
  'b2b-saas': {
    id: 'b2b-saas',
    name: 'B2B SaaS Product',
    description: 'For business software, enterprise tools, and professional services platforms',
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

  'consumer-app': {
    id: 'consumer-app',
    name: 'Consumer Mobile/Web App',
    description: 'For consumer-facing applications, social platforms, and lifestyle apps',
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

  'platform': {
    id: 'platform',
    name: 'Platform / Marketplace',
    description: 'For two-sided marketplaces, developer platforms, and ecosystem products',
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

  'api-product': {
    id: 'api-product',
    name: 'API / Developer Product',
    description: 'For APIs, SDKs, developer tools, and infrastructure products',
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

  'internal-tool': {
    id: 'internal-tool',
    name: 'Internal Tool',
    description: 'For internal productivity tools, admin systems, and operational software',
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

  'custom': {
    id: 'custom',
    name: 'Custom Template',
    description: 'Start with essential sections and customize as needed',
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
};

// ============================================================================
// TEMPLATE-SPECIFIC CONTEXT PROMPTS
// ============================================================================

export const TEMPLATE_CONTEXT_PROMPTS: Record<PRDTemplateType, string> = {
  'b2b-saas': `You are writing a PRD for a B2B SaaS product. Keep in mind:
- Multiple stakeholders: End users, buyers, admins, IT
- Long sales cycles and evaluation processes
- Integration requirements with existing enterprise tools
- Security, compliance, and audit requirements (SOC2, GDPR, etc.)
- Pricing and packaging implications
- Customer success and support considerations
- Multi-tenant architecture considerations
- SSO, RBAC, and enterprise authentication needs`,

  'consumer-app': `You are writing a PRD for a consumer application. Keep in mind:
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

  'platform': `You are writing a PRD for a platform/marketplace. Keep in mind:
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

  'api-product': `You are writing a PRD for an API/developer product. Keep in mind:
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

  'internal-tool': `You are writing a PRD for an internal tool. Keep in mind:
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

  'custom': `You are writing a PRD with a custom structure. 
Adapt the format and depth to the specific needs of this product.
Focus on the most relevant sections and be flexible with the structure.`,
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
