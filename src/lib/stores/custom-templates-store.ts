'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type {
  CustomPRDTemplate,
  TemplateSection,
  TemplateCategory,
  TemplateVersion,
  TemplateExportFormat,
  TemplateImportResult,
} from '@/types';

import { validateTemplate, sanitizeTemplate, autoFixTemplate } from '@/lib/utils/template-validator';
import { isTemplateExportedTemplate, type TemplateExportedTemplate } from '@/lib/utils/template-export-types';
import { 
  getCustomTemplates,
  createCustomTemplate,
  updateCustomTemplate as updateCustomTemplateInSupabase,
  deleteCustomTemplate as deleteCustomTemplateFromSupabase,
} from '@/lib/db/repositories/supabase/custom-templates';
import { USE_SUPABASE } from '@/lib/db/database';

// ============================================================================
// TYPES
// ============================================================================

export interface CustomTemplatesState {
  // All templates (including seeded starter templates)
  templates: CustomPRDTemplate[];
  
  // Track if starter templates have been seeded
  hasSeededStarterTemplates: boolean;
  
  // Sync state
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  
  // Actions
  addTemplate: (template: Omit<CustomPRDTemplate, 'id' | 'createdAt' | 'updatedAt'>, userId?: string) => CustomPRDTemplate;
  updateTemplate: (id: string, updates: Partial<Omit<CustomPRDTemplate, 'id' | 'createdAt'>>, changeDescription?: string, userId?: string) => void;
  deleteTemplate: (id: string, userId?: string) => void;
  getTemplate: (id: string) => CustomPRDTemplate | undefined;
  getTemplateContextPrompt: (id: string) => string;
  duplicateTemplate: (id: string, newName: string, userId?: string) => CustomPRDTemplate | undefined;
  seedStarterTemplates: () => void;
  resetToStarterTemplates: () => void;
  
  // Category helpers
  getTemplatesByCategory: (category: TemplateCategory) => CustomPRDTemplate[];
  
  // Version history
  getTemplateVersionHistory: (id: string) => TemplateVersion[];
  restoreTemplateVersion: (templateId: string, versionId: string, userId?: string) => boolean;
  
  // Import/Export
  exportTemplates: (templateIds: string[]) => TemplateExportFormat;
  exportAllTemplates: () => TemplateExportFormat;
  importTemplates: (data: TemplateExportFormat, overwriteExisting?: boolean, userId?: string) => TemplateImportResult;
  
  // Supabase sync
  syncFromSupabase: (userId: string) => Promise<void>;
  syncToSupabase: (template: CustomPRDTemplate, userId: string, operation: 'create' | 'update' | 'delete') => Promise<void>;
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
      { id: 'executive-summary', title: 'Executive Summary', order: 1, description: 'High-level overview of the product, target market, and key benefits. Should be readable by executives in 2-3 minutes and include ROI expectations.' },
      { id: 'business-context', title: 'Business Context & Market Opportunity', order: 2, description: 'Market analysis including TAM/SAM/SOM, competitive landscape, differentiation strategy, and strategic alignment with company goals.' },
      { id: 'problem-statement', title: 'Problem Statement', order: 3, description: 'Clear articulation of the business problem from multiple stakeholder perspectives (end users, admins, buyers). Include quantified pain points and cost of inaction.' },
      { id: 'goals-success-metrics', title: 'Goals & Success Metrics', order: 4, description: 'Specific, measurable goals with target metrics. Include business KPIs (ARR, MRR, expansion revenue), user adoption metrics, and efficiency gains.' },
      { id: 'user-personas', title: 'User Personas & Buyer Personas', order: 5, description: 'Detailed profiles of end users AND economic buyers. Include roles, responsibilities, pain points, goals, and decision-making criteria for enterprise purchases.' },
      { id: 'user-stories', title: 'User Stories & Use Cases', order: 6, description: 'User stories for all personas using "As a [role], I want [feature] so that [benefit]" format. Include both individual user workflows and organizational use cases.' },
      { id: 'functional-requirements', title: 'Functional Requirements', order: 7, description: 'Detailed feature specifications prioritized using MoSCoW framework (Must have, Should have, Could have, Won\'t have). Include acceptance criteria for each requirement.' },
      { id: 'non-functional-requirements', title: 'Non-Functional Requirements', order: 8, description: 'Enterprise-grade performance requirements: uptime SLA (99.9%+), response times, scalability targets, data retention, backup/recovery, and compliance with enterprise standards.' },
      { id: 'integrations', title: 'Integrations & API Requirements', order: 9, description: 'Required integrations with enterprise systems (SSO, HRIS, CRM, etc.). Include API specifications, authentication methods, data sync requirements, and webhook support.' },
      { id: 'security-compliance', title: 'Security & Compliance', order: 10, description: 'Security requirements including data encryption (at rest and in transit), SOC2/ISO27001 compliance, GDPR/CCPA compliance, audit logs, and penetration testing requirements.' },
      { id: 'ux-considerations', title: 'UI/UX Considerations', order: 11, description: 'Design principles for enterprise users: intuitive workflows, role-based customization, accessibility (WCAG 2.1 AA), mobile responsiveness, and bulk operations support.' },
      { id: 'pricing-packaging', title: 'Pricing & Packaging Impact', order: 12, description: 'Impact on pricing tiers (Starter/Professional/Enterprise), feature gating strategy, usage-based pricing components, and upsell/cross-sell opportunities.' },
      { id: 'go-to-market', title: 'Go-to-Market Considerations', order: 13, description: 'Launch strategy including sales enablement materials, marketing messaging, customer communication plan, beta program, and competitive positioning.' },
      { id: 'timeline-milestones', title: 'Timeline & Milestones', order: 14, description: 'Development phases with key milestones: Alpha (internal), Beta (customers), GA (general availability). Include dependencies and critical path items.' },
      { id: 'risks-mitigations', title: 'Risks & Mitigations', order: 15, description: 'Technical, business, and operational risks with likelihood/impact assessment. Include specific mitigation strategies and contingency plans.' },
      { id: 'open-questions', title: 'Open Questions', order: 16, description: 'Unresolved questions that need stakeholder input. Specify decision owners, deadlines, and impact of not resolving.' },
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
      { id: 'executive-summary', title: 'Executive Summary', order: 1, description: 'Compelling overview of the app concept, target audience, and unique value proposition. Focus on the "why now" and market timing.' },
      { id: 'vision-opportunity', title: 'Vision & Market Opportunity', order: 2, description: 'Long-term vision for the product and market opportunity analysis. Include addressable market size, user behavior trends, and competitor analysis.' },
      { id: 'problem-statement', title: 'Problem Statement', order: 3, description: 'User-centric problem statement focusing on emotional pain points and daily frustrations. Support with user research, interviews, or surveys.' },
      { id: 'goals-success-metrics', title: 'Goals & Success Metrics', order: 4, description: 'Consumer app metrics: DAU/MAU ratio, retention curves (D1, D7, D30), session length, viral coefficient (K-factor), LTV/CAC ratio, and engagement scores.' },
      { id: 'user-personas', title: 'User Personas', order: 5, description: 'Rich user personas including demographics, psychographics, behavioral patterns, motivations, tech-savviness, and social media habits.' },
      { id: 'user-journey', title: 'User Journey & Experience', order: 6, description: 'End-to-end user journey from discovery to power user: awareness → acquisition → activation → retention → referral. Map emotional states at each stage.' },
      { id: 'user-stories', title: 'User Stories', order: 7, description: 'User stories focusing on emotional benefits and delight moments. Use "As a [user], I want to [action] so I can [emotional benefit]" format.' },
      { id: 'functional-requirements', title: 'Feature Requirements', order: 8, description: 'Core features for MVP and post-launch roadmap. Prioritize features that drive engagement and word-of-mouth. Include social features, personalization, and notification strategy.' },
      { id: 'engagement-retention', title: 'Engagement & Retention Strategy', order: 9, description: 'Specific tactics to drive daily/weekly habits: streaks, achievements, social proof, FOMO triggers, personalized content, and push notification strategy.' },
      { id: 'ux-considerations', title: 'UI/UX & Design', order: 10, description: 'Mobile-first design principles, intuitive navigation, delightful animations, accessibility, dark mode, and consistency with platform conventions (iOS/Android).' },
      { id: 'non-functional-requirements', title: 'Performance & Quality', order: 11, description: 'App performance targets: launch time (<2s), smooth scrolling (60fps), offline capabilities, minimal battery drain, and crash-free rate (>99.5%).' },
      { id: 'monetization', title: 'Monetization Strategy', order: 12, description: 'Revenue model: freemium, subscription tiers, in-app purchases, ads, or hybrid. Include pricing psychology, trial strategy, and conversion optimization tactics.' },
      { id: 'growth-virality', title: 'Growth & Virality Loops', order: 13, description: 'Organic growth mechanisms: referral programs, social sharing features, network effects, viral content creation, and word-of-mouth triggers.' },
      { id: 'timeline-milestones', title: 'Timeline & Milestones', order: 14, description: 'Launch timeline: MVP features, beta testing with early adopters, soft launch in select markets, full launch, and post-launch feature releases.' },
      { id: 'risks-mitigations', title: 'Risks & Mitigations', order: 15, description: 'Consumer app risks: app store rejection, poor initial reviews, slow viral growth, user churn, and competition. Include mitigation plans.' },
      { id: 'open-questions', title: 'Open Questions', order: 16, description: 'Outstanding questions requiring user research, A/B testing, or stakeholder decisions. Prioritize questions blocking MVP scope.' },
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
      { id: 'executive-summary', title: 'Executive Summary', order: 1, description: 'Overview of the platform, target markets (supply and demand sides), network effect strategy, and business model. Explain the chicken-and-egg solution.' },
      { id: 'platform-vision', title: 'Platform Vision & Strategy', order: 2, description: 'Long-term vision for the ecosystem, market dynamics, platform strategy (aggregation vs. facilitation), and competitive moat from network effects.' },
      { id: 'problem-statement', title: 'Problem Statement', order: 3, description: 'Problems on both sides of the marketplace. Explain current inefficiencies, transaction costs, lack of trust, or discovery challenges that the platform will solve.' },
      { id: 'goals-success-metrics', title: 'Goals & Success Metrics', order: 4, description: 'Platform-specific metrics: supply/demand balance, GMV (Gross Merchandise Value), take rate, liquidity score, time-to-match, retention on both sides, and NPS per segment.' },
      { id: 'stakeholder-personas', title: 'Multi-Sided Personas', order: 5, description: 'Detailed personas for ALL platform sides (supply, demand, and any third parties). Include motivations, pain points, success criteria, and behavioral patterns for each.' },
      { id: 'value-exchange', title: 'Value Exchange & Network Effects', order: 6, description: 'How value flows between sides. Explain direct/indirect network effects, cross-side subsidies, and strategies to achieve critical mass on both sides simultaneously.' },
      { id: 'user-stories', title: 'User Stories (All Sides)', order: 7, description: 'User stories for each side of the platform. Include discovery, matching, transaction, and post-transaction experiences. Address cold-start scenarios.' },
      { id: 'functional-requirements', title: 'Functional Requirements', order: 8, description: 'Core platform features: onboarding flows, matching algorithm, search/discovery, messaging, transaction handling, payment processing, and feedback systems.' },
      { id: 'platform-architecture', title: 'Platform Architecture', order: 9, description: 'Technical architecture supporting multi-tenancy, matching algorithms, real-time updates, scalability for both sides, and API-first design for extensibility.' },
      { id: 'api-developer-experience', title: 'API & Developer Experience', order: 10, description: 'APIs for third-party integrations, developer documentation, sandbox environment, and strategies for building an ecosystem of complementary services.' },
      { id: 'trust-safety', title: 'Trust & Safety', order: 11, description: 'Verification systems, fraud detection, dispute resolution, content moderation, rating/review integrity, and insurance or guarantees for transactions.' },
      { id: 'governance', title: 'Platform Governance & Policies', order: 12, description: 'Platform rules, terms of service, content policies, pricing policies, quality standards, and mechanisms for enforcing compliance on both sides.' },
      { id: 'non-functional-requirements', title: 'Scalability & Performance', order: 13, description: 'Scalability requirements for managing supply/demand imbalances, high-volume transactions, real-time matching, and geographic expansion strategies.' },
      { id: 'timeline-milestones', title: 'Timeline & Milestones', order: 14, description: 'Launch strategy addressing chicken-and-egg: which side first, initial market focus, expansion timeline, and metrics-driven go/no-go decisions.' },
      { id: 'risks-mitigations', title: 'Risks & Mitigations', order: 15, description: 'Platform-specific risks: supply/demand imbalance, disintermediation, regulatory challenges, trust issues, and competition from incumbents. Include mitigation plans.' },
      { id: 'open-questions', title: 'Open Questions', order: 16, description: 'Critical unknowns: optimal take rate, minimum liquidity thresholds, geographic rollout sequence, and whether to prioritize supply or demand first.' },
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
      { id: 'executive-summary', title: 'Executive Summary', order: 1, description: 'High-level overview of the API product, target developers, key capabilities, and differentiation from alternatives. Include developer adoption goals.' },
      { id: 'problem-statement', title: 'Problem Statement', order: 2, description: 'Developer pain points and integration challenges the API solves. Include current workarounds, time-to-integration, and cost of building in-house.' },
      { id: 'goals-success-metrics', title: 'Goals & Success Metrics', order: 3, description: 'Developer-focused metrics: time-to-first-hello-world, API calls/day, active integrations, SDK downloads, documentation page views, support ticket volume, and developer NPS.' },
      { id: 'developer-personas', title: 'Developer Personas', order: 4, description: 'Detailed developer personas: frontend/backend/mobile/DevOps, experience levels, preferred languages/frameworks, learning styles, and integration decision criteria.' },
      { id: 'user-stories', title: 'Developer Use Cases', order: 5, description: 'Common use cases and integration scenarios. Use "As a [developer type], I want to [integrate feature] so that [app capability]" format. Include code examples.' },
      { id: 'api-design', title: 'API Design & Specification', order: 6, description: 'RESTful/GraphQL API design: endpoints, request/response schemas, HTTP methods, status codes, pagination, filtering, sorting. Include OpenAPI/Swagger spec.' },
      { id: 'functional-requirements', title: 'Functional Requirements', order: 7, description: 'Core API capabilities, supported operations, data models, relationships, and business logic. Prioritize using MoSCoW framework.' },
      { id: 'sdk-libraries', title: 'SDKs & Client Libraries', order: 8, description: 'Official SDKs for priority languages (Python, JavaScript, Java, Go, Ruby, PHP). Include installation methods, IDE autocomplete, and type definitions.' },
      { id: 'documentation', title: 'Documentation Requirements', order: 9, description: 'Comprehensive docs: quickstart guide, API reference, tutorials, code samples, postman collections, interactive API explorer, migration guides, and changelog.' },
      { id: 'developer-experience', title: 'Developer Experience (DX)', order: 10, description: 'Developer onboarding: signup flow, API key generation, sandbox environment, test data, webhooks testing, and time-to-first-successful-call optimization.' },
      { id: 'non-functional-requirements', title: 'Performance & Reliability', order: 11, description: 'API SLAs: uptime (99.95%+), latency (p50, p95, p99), throughput, timeout policies, retry logic, circuit breakers, and status page.' },
      { id: 'security-authentication', title: 'Security & Authentication', order: 12, description: 'Authentication methods (API keys, OAuth 2.0, JWT), authorization (scopes/permissions), encryption (TLS 1.3), secret rotation, and security best practices for developers.' },
      { id: 'rate-limiting-quotas', title: 'Rate Limiting & Quotas', order: 13, description: 'Rate limiting strategy: requests per second/minute/day, quota tiers, burst allowances, 429 handling, rate limit headers, and upgrade paths.' },
      { id: 'versioning-deprecation', title: 'Versioning & Deprecation', order: 14, description: 'API versioning strategy (URL/header/parameter), backward compatibility guarantees, deprecation policy with timelines, migration guides, and sunset notifications.' },
      { id: 'timeline-milestones', title: 'Timeline & Milestones', order: 15, description: 'Development phases: Alpha (internal), Private Beta (select partners), Public Beta (open access), GA (production-ready), and post-launch API expansions.' },
      { id: 'risks-mitigations', title: 'Risks & Mitigations', order: 16, description: 'API-specific risks: breaking changes, poor documentation, integration complexity, performance issues, security vulnerabilities. Include developer feedback loops.' },
      { id: 'open-questions', title: 'Open Questions', order: 17, description: 'Unresolved design decisions: REST vs GraphQL, authentication method, pricing model (calls/features/seats), and which SDKs to prioritize.' },
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
      { id: 'executive-summary', title: 'Executive Summary', order: 1, description: 'Overview of the internal tool, target users, business problem being solved, and expected efficiency gains or cost savings. Include ROI estimates.' },
      { id: 'problem-statement', title: 'Problem Statement & Current State', order: 2, description: 'Current manual processes, inefficiencies, error rates, time waste, and frustrations. Include data on time spent, error frequency, and workaround complexity.' },
      { id: 'goals-success-metrics', title: 'Goals & Success Metrics', order: 3, description: 'Efficiency metrics: time saved per task, error reduction %, user adoption rate, daily active users, tasks completed per day, and employee satisfaction scores.' },
      { id: 'user-personas', title: 'Internal User Personas', order: 4, description: 'Internal user profiles: roles, responsibilities, technical proficiency, daily workflows, pain points, and success criteria. Include power users and casual users.' },
      { id: 'user-stories', title: 'User Stories & Workflows', order: 5, description: 'Detailed workflows showing before/after scenarios. Use "As a [role], I want to [action] so that [business benefit]" format. Include frequency of each workflow.' },
      { id: 'functional-requirements', title: 'Functional Requirements', order: 6, description: 'Core features prioritized by impact on efficiency. Focus on automation opportunities, batch operations, bulk imports/exports, and workflow optimization.' },
      { id: 'data-requirements', title: 'Data & Reporting Requirements', order: 7, description: 'Data sources, data models, dashboards, reports, exports, analytics needs, and audit trail requirements. Include refresh frequency and data retention policies.' },
      { id: 'integration-requirements', title: 'Integration Requirements', order: 8, description: 'Required integrations with internal systems: HR systems, databases, Slack/Teams, email, calendar, file storage, and other tools. Include SSO requirements.' },
      { id: 'ux-considerations', title: 'UI/UX Considerations', order: 9, description: 'Design for internal users: efficient data entry, keyboard shortcuts, bulk actions, error prevention, quick access patterns, and minimal training requirements.' },
      { id: 'access-permissions', title: 'Access Control & Permissions', order: 10, description: 'Role-based access control: user roles, permission levels, data visibility rules, department-based access, and admin capabilities. Include audit requirements.' },
      { id: 'non-functional-requirements', title: 'Non-Functional Requirements', order: 11, description: 'Performance needs: page load times, data processing speed, concurrent users support, and reliability targets. Can be less strict than external products.' },
      { id: 'training-adoption', title: 'Training & Adoption Plan', order: 12, description: 'Training strategy: documentation, video tutorials, office hours, champions program, rollout phases, and change management. Include success criteria for adoption.' },
      { id: 'timeline-milestones', title: 'Timeline & Milestones', order: 13, description: 'Development phases: MVP with core workflows, pilot with select team, company-wide rollout, and post-launch iterations. Include feedback collection points.' },
      { id: 'risks-mitigations', title: 'Risks & Mitigations', order: 14, description: 'Internal tool risks: low adoption, resistance to change, lack of training, competing priorities, and technical integration challenges. Include mitigation strategies.' },
      { id: 'open-questions', title: 'Open Questions', order: 15, description: 'Outstanding questions: which departments first, manual migration vs automated, timeline constraints, and whether to build vs buy vs customize existing tools.' },
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
      isSyncing: false,
      lastSyncedAt: null,

      // Sync from Supabase - fetches all templates for the user
      // Note: Fails silently if table doesn't exist or access is denied
      syncFromSupabase: async (userId: string) => {
        if (!USE_SUPABASE || !userId) return;
        
        set({ isSyncing: true });
        try {
          const supabaseTemplates = await getCustomTemplates(userId);
          
          if (supabaseTemplates && supabaseTemplates.length > 0) {
            // Merge with local templates - Supabase takes precedence for existing IDs
            const localTemplates = get().templates;
            const supabaseIds = new Set(supabaseTemplates.map(t => t.id));
            
            // Keep local templates that don't exist in Supabase (might be offline changes)
            const localOnlyTemplates = localTemplates.filter(t => !supabaseIds.has(t.id));
            
            set({
              templates: [...supabaseTemplates, ...localOnlyTemplates],
              lastSyncedAt: new Date(),
            });
            if (process.env.NODE_ENV === 'development') {
              console.log('[CustomTemplatesStore] Synced', supabaseTemplates.length, 'templates from Supabase');
            }
          }
        } catch (error) {
          // Silently fail - Supabase sync is optional, local storage is the primary store
          if (process.env.NODE_ENV === 'development') {
            console.log('[CustomTemplatesStore] Supabase sync unavailable (table may not exist)');
          }
        } finally {
          set({ isSyncing: false });
        }
      },

      // Sync to Supabase - syncs a single template operation
      // Note: Fails silently if table doesn't exist or access is denied
      syncToSupabase: async (template: CustomPRDTemplate, userId: string, operation: 'create' | 'update' | 'delete') => {
        if (!USE_SUPABASE || !userId) {
          return; // Silently skip - no logging needed
        }
        
        try {
          switch (operation) {
            case 'create':
              const created = await createCustomTemplate({
                ...template,
              }, userId);
              if (created && process.env.NODE_ENV === 'development') {
                console.log('[CustomTemplatesStore] Created template in Supabase:', template.id);
              }
              break;
            case 'update':
              const updated = await updateCustomTemplateInSupabase(template.id, {
                name: template.name,
                description: template.description,
                sections: template.sections,
                contextPrompt: template.contextPrompt,
                icon: template.icon,
                color: template.color,
                useCases: template.useCases,
                category: template.category,
                version: template.version,
                versionHistory: template.versionHistory,
              }, userId);
              if (updated && process.env.NODE_ENV === 'development') {
                console.log('[CustomTemplatesStore] Updated template in Supabase:', template.id);
              }
              break;
            case 'delete':
              const deleted = await deleteCustomTemplateFromSupabase(template.id, userId);
              if (deleted && process.env.NODE_ENV === 'development') {
                console.log('[CustomTemplatesStore] Deleted template from Supabase:', template.id);
              }
              break;
          }
        } catch (error) {
          // Silently fail - local state is already updated, Supabase is just for persistence
          if (process.env.NODE_ENV === 'development') {
            console.log('[CustomTemplatesStore] Supabase sync failed (table may not exist)');
          }
        }
      },

      addTemplate: (templateData, userId) => {
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

        // Sync to Supabase in background
        if (userId) {
          get().syncToSupabase(newTemplate, userId, 'create');
        }

        return newTemplate;
      },

      updateTemplate: (id, updates, changeDescription, userId) => {
        let updatedTemplate: CustomPRDTemplate | null = null;
        
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
            
            updatedTemplate = { 
              ...template, 
              ...updates, 
              version: currentVersion + 1,
              versionHistory: updatedHistory,
              updatedAt: new Date() 
            };
            
            return updatedTemplate;
          }),
        }));

        // Sync to Supabase in background
        if (userId && updatedTemplate) {
          get().syncToSupabase(updatedTemplate, userId, 'update');
        }
      },

      deleteTemplate: (id, userId) => {
        const templateToDelete = get().templates.find(t => t.id === id);
        
        set((state) => ({
          templates: state.templates.filter((template) => template.id !== id),
        }));

        // Sync to Supabase in background
        if (userId && templateToDelete) {
          get().syncToSupabase(templateToDelete, userId, 'delete');
        }
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

      duplicateTemplate: (id, newName, userId) => {
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

        // Sync to Supabase in background
        if (userId) {
          get().syncToSupabase(duplicated, userId, 'create');
        }

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

      restoreTemplateVersion: (templateId, versionId, userId) => {
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
        }, `Restored from version ${version.version}`, userId);

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

      importTemplates: (data, overwriteExisting = false, userId) => {
        const result: TemplateImportResult = {
          success: true,
          imported: 0,
          skipped: 0,
          errors: [],
        };

        // Validate format version
        if (data?.formatVersion !== '1.0') {
          result.success = false;
          result.errors.push(`Unsupported format version: ${String((data as unknown as { formatVersion?: unknown })?.formatVersion)}`);
          return result;
        }

        if (!Array.isArray(data.templates) || data.templates.length === 0) {
          result.success = false;
          result.errors.push('No templates found in import data');
          return result;
        }

        const now = new Date();
        const existingTemplates = [...get().templates];
        const newTemplates: CustomPRDTemplate[] = [];

        for (const rawImported of data.templates as unknown[]) {
          try {
            // Normalize + validate
            if (!isTemplateExportedTemplate(rawImported)) {
              result.errors.push('Skipped template: invalid template shape');
              result.skipped++;
              continue;
            }

            const raw = rawImported as TemplateExportedTemplate;
            const sanitized = sanitizeTemplate(raw);
            const validation = validateTemplate(sanitized);
            if (!validation.valid) {
              result.errors.push(`Skipped template "${raw.name ?? 'Unnamed'}": ${validation.errors.join('; ')}`);
              result.skipped++;
              continue;
            }

            // Build a proper template object
            const base: CustomPRDTemplate = autoFixTemplate({
              id: raw.id || generateId(),
              name: sanitized.name || 'Untitled Template',
              description: sanitized.description || '',
              sections: (sanitized.sections || []) as TemplateSection[],
              contextPrompt: sanitized.contextPrompt,
              icon: raw.icon,
              color: raw.color,
              useCases: raw.useCases,
              category: raw.category || 'custom',
              isStarterTemplate: false,
              version: 1,
              versionHistory: [],
              createdAt: now,
              updatedAt: now,
            });

            const existingIndex = existingTemplates.findIndex((t) => t.id === base.id);

            if (existingIndex >= 0) {
              const existing = existingTemplates[existingIndex];

              if (overwriteExisting) {
                // Use updateTemplate to preserve version history behavior
                get().updateTemplate(
                  existing.id,
                  {
                    name: base.name,
                    description: base.description,
                    sections: base.sections,
                    contextPrompt: base.contextPrompt,
                    icon: base.icon,
                    color: base.color,
                    useCases: base.useCases,
                    category: base.category,
                    isStarterTemplate: false,
                  },
                  'Imported (overwrite)'
                );

                result.imported++;
              } else {
                newTemplates.push({
                  ...base,
                  id: generateId(),
                  name: `${base.name} (Imported)`,
                  createdAt: now,
                  updatedAt: now,
                });
                result.imported++;
              }
            } else {
              newTemplates.push(base);
              result.imported++;
            }
          } catch (error) {
            const name = isTemplateExportedTemplate(rawImported) ? rawImported.name : 'Unnamed';
            result.errors.push(`Failed to import template "${name}": ${error instanceof Error ? error.message : String(error)}`);
            result.skipped++;
          }
        }

        // If overwriteExisting was true, updateTemplate already updated the store; we only need to append new templates.
        if (newTemplates.length > 0) {
          set((state) => ({
            templates: [...state.templates, ...newTemplates],
          }));
        }

        // If we had any skips/errors, surface them but still return success if at least one template imported.
        if (result.imported === 0) {
          result.success = false;
          if (result.errors.length === 0) {
            result.errors.push('No templates were imported');
          }
        }

        return result;
      },
    }),
    {
      name: 'venture-custom-prd-templates',
      partialize: (state) => ({
        templates: state.templates,
        hasSeededStarterTemplates: state.hasSeededStarterTemplates,
        lastSyncedAt: state.lastSyncedAt,
        // Exclude isSyncing from persistence
      }),
    }
  )
);

export default useCustomTemplatesStore;
