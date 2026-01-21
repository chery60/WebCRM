'use client';

import { useCallback, useState, useMemo } from 'react';
import type { AIGenerateRequest, AIGenerateResponse, AIProviderType } from '@/types';
import { useAISettingsStore, getProviderDisplayName } from '@/lib/stores/ai-settings-store';
import { 
  createProvider, 
  createActiveProvider, 
  getAvailableProviders,
  hasAvailableProvider,
  getFallbackProvider,
  PROVIDER_METADATA 
} from './provider-factory';
import type { AIServiceProvider } from './interface';

export interface UseAIServiceOptions {
  /** Override the default provider for this instance */
  provider?: AIProviderType;
  /** Override the model for this instance */
  model?: string;
}

export interface UseAIServiceReturn {
  /** Generate content using the AI provider */
  generateContent: (request: AIGenerateRequest) => Promise<AIGenerateResponse>;
  /** Generate content with a specific provider */
  generateWithProvider: (provider: AIProviderType, request: AIGenerateRequest) => Promise<AIGenerateResponse>;
  /** Check if AI service is available */
  isAvailable: () => Promise<boolean>;
  /** Whether a generation is currently in progress */
  isLoading: boolean;
  /** Last error that occurred */
  error: Error | null;
  /** Clear the current error */
  clearError: () => void;
  /** Name of the current provider */
  providerName: string;
  /** Current active provider type */
  activeProvider: AIProviderType | null;
  /** List of available configured providers */
  availableProviders: { type: AIProviderType; name: string }[];
  /** Whether any provider is configured */
  hasProvider: boolean;
  /** Switch to a different provider */
  switchProvider: (provider: AIProviderType) => void;
}

export function useAIService(options?: UseAIServiceOptions): UseAIServiceReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  
  const { 
    activeProvider, 
    providers, 
    setActiveProvider,
    hasConfiguredProvider 
  } = useAISettingsStore();

  // Get the current provider instance
  const getProviderInstance = useCallback((overrideProvider?: AIProviderType): AIServiceProvider => {
    // If override provider specified, use that
    if (overrideProvider) {
      const config = providers[overrideProvider];
      if (config.isEnabled && config.apiKey) {
        return createProvider({
          provider: overrideProvider,
          apiKey: config.apiKey,
          model: options?.model || config.defaultModel,
        });
      }
    }

    // If options specify a provider, use that
    if (options?.provider) {
      const config = providers[options.provider];
      if (config.isEnabled && config.apiKey) {
        return createProvider({
          provider: options.provider,
          apiKey: config.apiKey,
          model: options.model || config.defaultModel,
        });
      }
    }

    // Otherwise use the active provider
    const provider = createActiveProvider();
    if (provider) {
      return provider;
    }

    // Fall back to mock provider
    return getFallbackProvider();
  }, [providers, options?.provider, options?.model]);

  // Generate content with the default/active provider
  const generateContent = useCallback(
    async (request: AIGenerateRequest): Promise<AIGenerateResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const provider = getProviderInstance();
        const response = await provider.generateContent({
          ...request,
          model: options?.model || request.model,
        });
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('AI generation failed');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [getProviderInstance, options?.model]
  );

  // Generate content with a specific provider
  const generateWithProvider = useCallback(
    async (providerType: AIProviderType, request: AIGenerateRequest): Promise<AIGenerateResponse> => {
      setIsLoading(true);
      setError(null);

      try {
        const provider = getProviderInstance(providerType);
        const response = await provider.generateContent(request);
        return response;
      } catch (err) {
        const error = err instanceof Error ? err : new Error('AI generation failed');
        setError(error);
        throw error;
      } finally {
        setIsLoading(false);
      }
    },
    [getProviderInstance]
  );

  // Check if AI is available
  const isAvailable = useCallback(async (): Promise<boolean> => {
    try {
      const provider = getProviderInstance();
      return await provider.isAvailable();
    } catch {
      return false;
    }
  }, [getProviderInstance]);

  // Clear error
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Switch provider
  const switchProvider = useCallback((provider: AIProviderType) => {
    setActiveProvider(provider);
  }, [setActiveProvider]);

  // Get available providers for UI
  const availableProviders = useMemo(() => {
    return getAvailableProviders().map(({ type }) => ({
      type,
      name: getProviderDisplayName(type),
    }));
  }, [providers]);

  // Get current provider name
  const providerName = useMemo(() => {
    if (options?.provider && providers[options.provider]?.isEnabled) {
      return getProviderDisplayName(options.provider);
    }
    if (activeProvider) {
      return getProviderDisplayName(activeProvider);
    }
    return 'Mock AI (No provider configured)';
  }, [activeProvider, options?.provider, providers]);

  return {
    generateContent,
    generateWithProvider,
    isAvailable,
    isLoading,
    error,
    clearError,
    providerName,
    activeProvider,
    availableProviders,
    hasProvider: hasConfiguredProvider(),
    switchProvider,
  };
}

// Standalone function to generate content (for non-hook contexts)
export async function generateAIContent(
  request: AIGenerateRequest,
  providerType?: AIProviderType
): Promise<AIGenerateResponse> {
  const state = useAISettingsStore.getState();
  
  let provider: AIServiceProvider;
  
  if (providerType) {
    const config = state.providers[providerType];
    if (config.isEnabled && config.apiKey) {
      provider = createProvider({
        provider: providerType,
        apiKey: config.apiKey,
        model: config.defaultModel,
      });
    } else {
      provider = getFallbackProvider();
    }
  } else {
    provider = createActiveProvider() || getFallbackProvider();
  }

  return provider.generateContent(request);
}

// Export provider metadata for UI
export { PROVIDER_METADATA } from './provider-factory';

