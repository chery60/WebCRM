/**
 * Template Variables & Placeholders System
 * 
 * Allows dynamic content in templates for personalized PRD generation
 */

export interface TemplateVariable {
  key: string;
  label: string;
  description: string;
  type: 'text' | 'number' | 'select' | 'date' | 'multiline';
  required?: boolean;
  defaultValue?: string | number;
  options?: string[]; // For select type
  placeholder?: string;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
}

export interface VariableValue {
  [key: string]: string | number;
}

// ============================================================================
// PREDEFINED VARIABLES
// ============================================================================

/**
 * Standard variables available in all templates
 */
export const STANDARD_VARIABLES: TemplateVariable[] = [
  {
    key: 'product_name',
    label: 'Product Name',
    description: 'Name of the product or feature',
    type: 'text',
    required: true,
    placeholder: 'e.g., User Dashboard',
  },
  {
    key: 'company_name',
    label: 'Company Name',
    description: 'Your company or organization name',
    type: 'text',
    required: false,
    placeholder: 'e.g., Acme Corp',
  },
  {
    key: 'target_market',
    label: 'Target Market',
    description: 'Primary target market or customer segment',
    type: 'text',
    required: false,
    placeholder: 'e.g., Enterprise SaaS companies',
  },
  {
    key: 'launch_quarter',
    label: 'Target Launch Quarter',
    description: 'Expected launch timeframe',
    type: 'select',
    required: false,
    options: ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025', 'Q1 2026', 'Q2 2026', 'TBD'],
  },
  {
    key: 'team_size',
    label: 'Team Size',
    description: 'Number of people working on this',
    type: 'number',
    required: false,
    validation: { min: 1, max: 100 },
  },
  {
    key: 'budget',
    label: 'Budget Range',
    description: 'Approximate budget allocation',
    type: 'select',
    required: false,
    options: ['< $50k', '$50k - $100k', '$100k - $250k', '$250k - $500k', '$500k+', 'Not specified'],
  },
];

/**
 * Domain-specific variables for B2B SaaS
 */
export const B2B_SAAS_VARIABLES: TemplateVariable[] = [
  {
    key: 'target_company_size',
    label: 'Target Company Size',
    description: 'Size of companies you are targeting',
    type: 'select',
    required: false,
    options: ['SMB (1-100)', 'Mid-Market (100-1000)', 'Enterprise (1000+)', 'All segments'],
  },
  {
    key: 'pricing_model',
    label: 'Pricing Model',
    description: 'How the product will be priced',
    type: 'select',
    required: false,
    options: ['Per user', 'Per feature', 'Tiered', 'Usage-based', 'Flat rate', 'Custom'],
  },
  {
    key: 'compliance_requirements',
    label: 'Compliance Requirements',
    description: 'Required compliance certifications',
    type: 'text',
    required: false,
    placeholder: 'e.g., SOC2, HIPAA, GDPR',
  },
];

/**
 * Domain-specific variables for Consumer Apps
 */
export const CONSUMER_APP_VARIABLES: TemplateVariable[] = [
  {
    key: 'target_age_group',
    label: 'Target Age Group',
    description: 'Primary age demographic',
    type: 'select',
    required: false,
    options: ['13-17', '18-24', '25-34', '35-44', '45-54', '55+', 'All ages'],
  },
  {
    key: 'platform_focus',
    label: 'Platform Focus',
    description: 'Primary platform for launch',
    type: 'select',
    required: false,
    options: ['iOS only', 'Android only', 'Both mobile', 'Web only', 'Web + Mobile'],
  },
  {
    key: 'monetization_strategy',
    label: 'Monetization Strategy',
    description: 'How the app will generate revenue',
    type: 'select',
    required: false,
    options: ['Freemium', 'Subscription', 'In-app purchases', 'Ads', 'Free (no monetization)'],
  },
];

/**
 * Domain-specific variables for Platform/Marketplace
 */
export const PLATFORM_VARIABLES: TemplateVariable[] = [
  {
    key: 'supply_side',
    label: 'Supply Side',
    description: 'Who provides the service/product',
    type: 'text',
    required: false,
    placeholder: 'e.g., Freelancers, Sellers',
  },
  {
    key: 'demand_side',
    label: 'Demand Side',
    description: 'Who consumes the service/product',
    type: 'text',
    required: false,
    placeholder: 'e.g., Businesses, Buyers',
  },
  {
    key: 'take_rate',
    label: 'Target Take Rate',
    description: 'Percentage commission on transactions',
    type: 'text',
    required: false,
    placeholder: 'e.g., 15%, 20%',
  },
];

/**
 * Domain-specific variables for API Products
 */
export const API_VARIABLES: TemplateVariable[] = [
  {
    key: 'api_type',
    label: 'API Type',
    description: 'Type of API being built',
    type: 'select',
    required: false,
    options: ['REST', 'GraphQL', 'gRPC', 'WebSocket', 'Hybrid'],
  },
  {
    key: 'target_developers',
    label: 'Target Developers',
    description: 'Primary developer audience',
    type: 'text',
    required: false,
    placeholder: 'e.g., Frontend developers, Mobile developers',
  },
  {
    key: 'rate_limit',
    label: 'Default Rate Limit',
    description: 'API calls allowed per minute',
    type: 'text',
    required: false,
    placeholder: 'e.g., 60/min, 1000/min',
  },
];

// ============================================================================
// VARIABLE RESOLUTION
// ============================================================================

/**
 * Get variables for a specific template category
 */
export function getVariablesForCategory(category?: string): TemplateVariable[] {
  const standardVars = [...STANDARD_VARIABLES];

  switch (category) {
    case 'saas':
      return [...standardVars, ...B2B_SAAS_VARIABLES];
    case 'consumer':
      return [...standardVars, ...CONSUMER_APP_VARIABLES];
    case 'platform':
      return [...standardVars, ...PLATFORM_VARIABLES];
    case 'api':
      return [...standardVars, ...API_VARIABLES];
    default:
      return standardVars;
  }
}

/**
 * Replace variables in text with actual values
 * Supports: {{variable_name}}, {variable_name}, ${variable_name}
 */
export function replaceVariables(text: string, values: VariableValue): string {
  let result = text;

  // Replace {{variable}} format
  result = result.replace(/\{\{(\w+)\}\}/g, (match, key) => {
    return values[key]?.toString() || match;
  });

  // Replace {variable} format
  result = result.replace(/\{(\w+)\}/g, (match, key) => {
    return values[key]?.toString() || match;
  });

  // Replace ${variable} format
  result = result.replace(/\$\{(\w+)\}/g, (match, key) => {
    return values[key]?.toString() || match;
  });

  return result;
}

/**
 * Extract variables used in text
 */
export function extractVariables(text: string): string[] {
  const variables = new Set<string>();

  // Extract {{variable}}
  const doubleBraceMatches = text.matchAll(/\{\{(\w+)\}\}/g);
  for (const match of doubleBraceMatches) {
    variables.add(match[1]);
  }

  // Extract {variable}
  const singleBraceMatches = text.matchAll(/\{(\w+)\}/g);
  for (const match of singleBraceMatches) {
    variables.add(match[1]);
  }

  // Extract ${variable}
  const dollarBraceMatches = text.matchAll(/\$\{(\w+)\}/g);
  for (const match of dollarBraceMatches) {
    variables.add(match[1]);
  }

  return Array.from(variables);
}

/**
 * Validate that all required variables have values
 */
export function validateVariableValues(
  variables: TemplateVariable[],
  values: VariableValue
): { valid: boolean; missing: string[] } {
  const missing: string[] = [];

  variables.forEach(variable => {
    if (variable.required && !values[variable.key]) {
      missing.push(variable.label);
    }
  });

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get example values for testing
 */
export function getExampleVariableValues(category?: string): VariableValue {
  const baseValues: VariableValue = {
    product_name: 'Task Management Pro',
    company_name: 'Acme Corp',
    target_market: 'Remote teams and distributed organizations',
    launch_quarter: 'Q2 2025',
    team_size: 5,
    budget: '$100k - $250k',
  };

  switch (category) {
    case 'saas':
      return {
        ...baseValues,
        target_company_size: 'Mid-Market (100-1000)',
        pricing_model: 'Per user',
        compliance_requirements: 'SOC2, GDPR',
      };
    case 'consumer':
      return {
        ...baseValues,
        target_age_group: '25-34',
        platform_focus: 'Both mobile',
        monetization_strategy: 'Freemium',
      };
    case 'platform':
      return {
        ...baseValues,
        supply_side: 'Freelance professionals',
        demand_side: 'Small businesses',
        take_rate: '15%',
      };
    case 'api':
      return {
        ...baseValues,
        api_type: 'REST',
        target_developers: 'Frontend and mobile developers',
        rate_limit: '1000/min',
      };
    default:
      return baseValues;
  }
}

/**
 * Create variable prompt for AI
 * Adds context about variables to help AI generate relevant content
 */
export function createVariableContext(values: VariableValue): string {
  const entries = Object.entries(values).filter(([_, value]) => value);
  
  if (entries.length === 0) {
    return '';
  }

  let context = '\n## Product Context\n';
  context += 'Use the following information throughout the PRD:\n\n';

  entries.forEach(([key, value]) => {
    const label = key
      .split('_')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
    context += `- **${label}**: ${value}\n`;
  });

  context += '\nReference these details naturally throughout the document.\n';

  return context;
}

// ============================================================================
// TEMPLATE PREPROCESSING
// ============================================================================

/**
 * Preprocess template sections with variable substitution
 */
export function preprocessTemplateWithVariables(
  sections: Array<{ title: string; description?: string }>,
  values: VariableValue
): Array<{ title: string; description?: string }> {
  return sections.map(section => ({
    title: replaceVariables(section.title, values),
    description: section.description ? replaceVariables(section.description, values) : undefined,
  }));
}

export default {
  STANDARD_VARIABLES,
  B2B_SAAS_VARIABLES,
  CONSUMER_APP_VARIABLES,
  PLATFORM_VARIABLES,
  API_VARIABLES,
  getVariablesForCategory,
  replaceVariables,
  extractVariables,
  validateVariableValues,
  getExampleVariableValues,
  createVariableContext,
  preprocessTemplateWithVariables,
};
