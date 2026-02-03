'use client';

import { useChat as useAISDKChat } from '@ai-sdk/react';
import { DefaultChatTransport } from 'ai';
import { useAISettingsStore } from '@/lib/stores/ai-settings-store';
import type { AIProviderType } from '@/lib/stores/ai-settings-store';
import type { AIGenerationType } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

export interface UseAIChatOptions {
  provider?: AIProviderType;
  type?: AIGenerationType;
  temperature?: number;
  onFinish?: (message: any) => void;
  onError?: (error: Error) => void;
}

// ============================================================================
// HOOK - useAIChat (wrapper around AI SDK's useChat)
// ============================================================================

export function useAIChat(options: UseAIChatOptions = {}) {
  const { 
    provider: selectedProvider, 
    type = 'ask',
    temperature,
    onFinish,
    onError,
  } = options;

  const { providers, activeProvider } = useAISettingsStore();
  
  // Determine which provider to use
  const provider = selectedProvider || activeProvider || 'openai';
  const providerConfig = providers[provider];

  if (!providerConfig?.apiKey) {
    throw new Error(`No API key configured for ${provider}. Please add your API key in Settings > Features before using AI generation.`);
  }

  // Validate API key is not empty
  if (providerConfig.apiKey.trim().length === 0) {
    throw new Error(`Invalid API key for ${provider}. The API key cannot be empty.`);
  }

  // Create transport with proper configuration
  const transport = new DefaultChatTransport({
    api: '/api/ai/chat',
    body: {
      provider,
      apiKey: providerConfig.apiKey,
      model: providerConfig.defaultModel,
      type,
      temperature,
    },
  });

  // Use AI SDK's useChat hook with transport
  const chat = useAISDKChat({
    transport,
    onFinish,
    onError,
  });

  return {
    ...chat,
    provider,
    model: providerConfig.defaultModel,
  };
}

// ============================================================================
// HOOK - useAIPRDChat (specialized for PRD generation)
// ============================================================================

export interface UseAIPRDChatOptions extends UseAIChatOptions {
  templateName?: string;
  templateDescription?: string;
  templateContextPrompt?: string;
  templateSections?: Array<{
    id: string;
    title: string;
    order: number;
    description?: string;
  }>;
}

export function useAIPRDChat(options: UseAIPRDChatOptions = {}) {
  const { 
    provider: selectedProvider,
    templateName,
    templateDescription,
    templateContextPrompt,
    templateSections = [],
    temperature = 0.5,
    onFinish,
    onError,
  } = options;

  const { providers, activeProvider } = useAISettingsStore();
  
  // Determine which provider to use
  const provider = selectedProvider || activeProvider || 'openai';
  const providerConfig = providers[provider];

  if (!providerConfig?.apiKey) {
    throw new Error(`No API key configured for ${provider}. Please add your API key in Settings > Features before generating PRDs.`);
  }

  // Validate API key is not empty
  if (providerConfig.apiKey.trim().length === 0) {
    throw new Error(`Invalid API key for ${provider}. The API key cannot be empty.`);
  }

  // Create transport with proper configuration including full template context
  const transport = new DefaultChatTransport({
    api: '/api/ai/prd',
    body: {
      provider,
      apiKey: providerConfig.apiKey,
      model: providerConfig.defaultModel,
      templateName,
      templateDescription,
      templateContextPrompt,
      templateSections,
      temperature,
    },
  });

  // Use AI SDK's useChat hook with transport
  const chat = useAISDKChat({
    transport,
    onFinish,
    onError,
  });

  return {
    ...chat,
    provider,
    model: providerConfig.defaultModel,
  };
}

export default useAIChat;
