'use client';

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Supported AI Providers
export type AIProviderType = 'openai' | 'anthropic' | 'gemini';

// Available models per provider
export const AI_MODELS = {
  openai: [
    { id: 'gpt-4o', name: 'GPT-4o', description: 'Most capable model, great for complex tasks' },
    { id: 'gpt-4o-mini', name: 'GPT-4o Mini', description: 'Fast and cost-effective' },
    { id: 'gpt-4-turbo', name: 'GPT-4 Turbo', description: 'GPT-4 with improved performance' },
    { id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo', description: 'Fast and economical' },
  ],
  anthropic: [
    { id: 'claude-sonnet-4-20250514', name: 'Claude Sonnet 4', description: 'Latest and most capable' },
    { id: 'claude-3-5-sonnet-20241022', name: 'Claude 3.5 Sonnet', description: 'Best balance of speed and capability' },
    { id: 'claude-3-5-haiku-20241022', name: 'Claude 3.5 Haiku', description: 'Fastest responses' },
    { id: 'claude-3-opus-20240229', name: 'Claude 3 Opus', description: 'Most powerful for complex tasks' },
  ],
  gemini: [
    { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', description: 'Best price-performance, thinking support (Stable)' },
    { id: 'gemini-3-flash-preview', name: 'Gemini 3 Flash Preview', description: 'Newest model, fast and intelligent (Preview)' },
    { id: 'gemini-2.5-flash-preview-09-2025', name: 'Gemini 2.5 Flash Preview', description: 'Preview version with latest features' },
    { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', description: 'Most capable for complex tasks' },
  ],
} as const;

// Provider configuration
export interface AIProviderConfig {
  apiKey: string;
  defaultModel: string;
  isEnabled: boolean;
  lastTested: string | null;
  testStatus: 'untested' | 'success' | 'failed';
  webSearchEnabled: boolean; // Enable web search/grounding for this provider
}

// Full AI Settings State
export interface AISettingsState {
  // Provider configurations
  providers: Record<AIProviderType, AIProviderConfig>;

  // Active provider for generation
  activeProvider: AIProviderType | null;

  // Actions
  setApiKey: (provider: AIProviderType, apiKey: string) => void;
  setDefaultModel: (provider: AIProviderType, model: string) => void;
  setEnabled: (provider: AIProviderType, enabled: boolean) => void;
  setActiveProvider: (provider: AIProviderType | null) => void;
  setTestStatus: (provider: AIProviderType, status: 'untested' | 'success' | 'failed') => void;
  setWebSearchEnabled: (provider: AIProviderType, enabled: boolean) => void;
  getActiveProviderConfig: () => AIProviderConfig | null;
  getAvailableProviders: () => AIProviderType[];
  hasConfiguredProvider: () => boolean;
  isWebSearchEnabled: (provider?: AIProviderType) => boolean;
  clearApiKey: (provider: AIProviderType) => void;
  resetSettings: () => void;
}

// Default provider configuration
const defaultProviderConfig: AIProviderConfig = {
  apiKey: '',
  defaultModel: '',
  isEnabled: false,
  lastTested: null,
  testStatus: 'untested',
  webSearchEnabled: false,
};

// Initial state - Gemini has web search enabled by default (Google Search Grounding)
const initialState = {
  providers: {
    openai: { ...defaultProviderConfig, defaultModel: 'gpt-4o', webSearchEnabled: false },
    anthropic: { ...defaultProviderConfig, defaultModel: 'claude-sonnet-4-20250514', webSearchEnabled: false },
    gemini: { ...defaultProviderConfig, defaultModel: 'gemini-2.5-flash', webSearchEnabled: true }, // Gemini has native Google Search
  },
  activeProvider: null as AIProviderType | null,
};

export const useAISettingsStore = create<AISettingsState>()(
  persist(
    (set, get) => ({
      ...initialState,

      setApiKey: (provider, apiKey) => {
        set((state) => ({
          providers: {
            ...state.providers,
            [provider]: {
              ...state.providers[provider],
              apiKey,
              testStatus: 'untested' as const,
            },
          },
        }));
      },

      setDefaultModel: (provider, model) => {
        set((state) => ({
          providers: {
            ...state.providers,
            [provider]: {
              ...state.providers[provider],
              defaultModel: model,
            },
          },
        }));
      },

      setEnabled: (provider, enabled) => {
        set((state) => {
          const newProviders = {
            ...state.providers,
            [provider]: {
              ...state.providers[provider],
              isEnabled: enabled,
            },
          };

          // If enabling a provider and no active provider, set this as active
          let newActiveProvider = state.activeProvider;
          if (enabled && !state.activeProvider) {
            newActiveProvider = provider;
          }
          // If disabling the active provider, find another enabled one or set to null
          if (!enabled && state.activeProvider === provider) {
            const enabledProviders = (Object.keys(newProviders) as AIProviderType[])
              .filter((p) => newProviders[p].isEnabled);
            newActiveProvider = enabledProviders.length > 0 ? enabledProviders[0] : null;
          }

          return {
            providers: newProviders,
            activeProvider: newActiveProvider,
          };
        });
      },

      setActiveProvider: (provider) => {
        set({ activeProvider: provider });
      },

      setTestStatus: (provider, status) => {
        set((state) => ({
          providers: {
            ...state.providers,
            [provider]: {
              ...state.providers[provider],
              testStatus: status,
              lastTested: new Date().toISOString(),
            },
          },
        }));
      },

      setWebSearchEnabled: (provider, enabled) => {
        set((state) => ({
          providers: {
            ...state.providers,
            [provider]: {
              ...state.providers[provider],
              webSearchEnabled: enabled,
            },
          },
        }));
      },

      getActiveProviderConfig: () => {
        const state = get();
        if (!state.activeProvider) return null;
        return state.providers[state.activeProvider];
      },

      getAvailableProviders: () => {
        const state = get();
        return (Object.keys(state.providers) as AIProviderType[])
          .filter((provider) => {
            const config = state.providers[provider];
            return config.isEnabled && config.apiKey.length > 0;
          });
      },

      hasConfiguredProvider: () => {
        const state = get();
        return (Object.keys(state.providers) as AIProviderType[]).some((provider) => {
          const config = state.providers[provider];
          return config.isEnabled && config.apiKey.length > 0;
        });
      },

      isWebSearchEnabled: (provider) => {
        const state = get();
        // If no provider specified, check the active provider
        const targetProvider = provider || state.activeProvider;
        if (!targetProvider) return false;
        return state.providers[targetProvider]?.webSearchEnabled ?? false;
      },

      clearApiKey: (provider) => {
        set((state) => ({
          providers: {
            ...state.providers,
            [provider]: {
              ...state.providers[provider],
              apiKey: '',
              isEnabled: false,
              testStatus: 'untested' as const,
            },
          },
        }));
      },

      resetSettings: () => {
        set(initialState);
      },
    }),
    {
      name: 'venture-ai-settings',
      version: 3, // Increment version to trigger migration
      // Only persist provider configs, not methods
      partialize: (state) => ({
        providers: state.providers,
        activeProvider: state.activeProvider,
      }),
      // Migration to fix deprecated models
      migrate: (persistedState: any, version: number) => {
        const geminiModel = persistedState?.providers?.gemini?.defaultModel;
        // Migrate old/deprecated models to gemini-2.5-flash (stable)
        const deprecatedModels = [
          'gemini-1.5-flash',
          'gemini-2.0-flash',
          'gemini-2.0-flash-lite',
          'gemini-pro',
        ];
        if (geminiModel && deprecatedModels.includes(geminiModel)) {
          persistedState.providers.gemini.defaultModel = 'gemini-2.5-flash';
        }
        return persistedState;
      },
    }
  )
);

// Helper function to get provider display name
export function getProviderDisplayName(provider: AIProviderType): string {
  const names: Record<AIProviderType, string> = {
    openai: 'OpenAI',
    anthropic: 'Anthropic',
    gemini: 'Google Gemini',
  };
  return names[provider];
}

// Helper function to get provider icon (for UI)
export function getProviderIcon(provider: AIProviderType): string {
  const icons: Record<AIProviderType, string> = {
    openai: '🤖',
    anthropic: '🧠',
    gemini: '✨',
  };
  return icons[provider];
}

// Helper to mask API key for display
export function maskApiKey(apiKey: string): string {
  if (!apiKey || apiKey.length < 8) return '••••••••';
  return `${apiKey.slice(0, 4)}••••••••${apiKey.slice(-4)}`;
}
