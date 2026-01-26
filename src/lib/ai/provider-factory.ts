import type { AIServiceProvider } from './interface';
import { OpenAIProvider } from './providers/openai-provider';
import { AnthropicProvider } from './providers/anthropic-provider';
import { GeminiProvider } from './providers/gemini-provider';
import { MockAIProvider } from './mock-provider';
import { 
  useAISettingsStore, 
  type AIProviderType,
  type AIProviderConfig 
} from '@/lib/stores/ai-settings-store';

export interface ProviderFactoryConfig {
  provider: AIProviderType;
  apiKey: string;
  model?: string;
  webSearchEnabled?: boolean;
}

/**
 * Creates an AI provider instance based on the configuration
 */
export function createProvider(config: ProviderFactoryConfig): AIServiceProvider {
  const { provider, apiKey, model, webSearchEnabled } = config;

  switch (provider) {
    case 'openai':
      return new OpenAIProvider({ apiKey, model, webSearchEnabled });
    case 'anthropic':
      return new AnthropicProvider({ apiKey, model });
    case 'gemini':
      return new GeminiProvider({ apiKey, model, webSearchEnabled });
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

/**
 * Creates a provider from the stored settings for a specific provider type
 */
export function createProviderFromSettings(providerType: AIProviderType): AIServiceProvider | null {
  const state = useAISettingsStore.getState();
  const config = state.providers[providerType];

  if (!config.isEnabled || !config.apiKey) {
    return null;
  }

  return createProvider({
    provider: providerType,
    apiKey: config.apiKey,
    model: config.defaultModel,
    webSearchEnabled: config.webSearchEnabled,
  });
}

/**
 * Creates the currently active provider from settings
 */
export function createActiveProvider(): AIServiceProvider | null {
  const state = useAISettingsStore.getState();
  
  if (!state.activeProvider) {
    return null;
  }

  return createProviderFromSettings(state.activeProvider);
}

/**
 * Gets all available (configured and enabled) providers
 */
export function getAvailableProviders(): { type: AIProviderType; config: AIProviderConfig }[] {
  const state = useAISettingsStore.getState();
  const available: { type: AIProviderType; config: AIProviderConfig }[] = [];

  (Object.keys(state.providers) as AIProviderType[]).forEach((providerType) => {
    const config = state.providers[providerType];
    if (config.isEnabled && config.apiKey) {
      available.push({ type: providerType, config });
    }
  });

  return available;
}

/**
 * Checks if any AI provider is configured and available
 */
export function hasAvailableProvider(): boolean {
  return getAvailableProviders().length > 0;
}

/**
 * Gets a fallback provider (mock) for when no real providers are configured
 */
export function getFallbackProvider(): AIServiceProvider {
  return new MockAIProvider();
}

/**
 * Smart provider getter - returns active provider, or first available, or fallback
 */
export function getProvider(): AIServiceProvider {
  // Try to get active provider first
  const activeProvider = createActiveProvider();
  if (activeProvider) {
    return activeProvider;
  }

  // Try to get any available provider
  const available = getAvailableProviders();
  if (available.length > 0) {
    const first = available[0];
    return createProvider({
      provider: first.type,
      apiKey: first.config.apiKey,
      model: first.config.defaultModel,
      webSearchEnabled: first.config.webSearchEnabled,
    });
  }

  // Fall back to mock provider
  return getFallbackProvider();
}

/**
 * Provider metadata for UI display
 */
export const PROVIDER_METADATA: Record<AIProviderType, {
  name: string;
  description: string;
  icon: string;
  docsUrl: string;
}> = {
  openai: {
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4 Turbo, GPT-3.5 Turbo',
    icon: '🤖',
    docsUrl: 'https://platform.openai.com/docs',
  },
  anthropic: {
    name: 'Anthropic',
    description: 'Claude Sonnet 4, Claude 3.5, Claude 3 Opus',
    icon: '🧠',
    docsUrl: 'https://docs.anthropic.com',
  },
  gemini: {
    name: 'Google Gemini',
    description: 'Gemini 1.5 Pro, Gemini 1.5 Flash',
    icon: '✨',
    docsUrl: 'https://ai.google.dev/docs',
  },
};
