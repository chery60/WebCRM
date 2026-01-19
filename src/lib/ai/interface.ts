import type { AIGenerateRequest, AIGenerateResponse } from '@/types';

// AI Service Interface - implement this to add new AI providers
export interface AIServiceProvider {
  name: string;
  generateContent(request: AIGenerateRequest): Promise<AIGenerateResponse>;
  isAvailable(): Promise<boolean>;
}

// Factory to create AI services
export type AIProviderType = 'mock' | 'openai' | 'anthropic' | 'ollama';

export interface AIServiceConfig {
  provider: AIProviderType;
  apiKey?: string;
  endpoint?: string;
  model?: string;
}

// AI Service manager
export class AIServiceManager {
  private provider: AIServiceProvider;

  constructor(provider: AIServiceProvider) {
    this.provider = provider;
  }

  async generateContent(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    return this.provider.generateContent(request);
  }

  async isAvailable(): Promise<boolean> {
    return this.provider.isAvailable();
  }

  getProviderName(): string {
    return this.provider.name;
  }

  setProvider(provider: AIServiceProvider) {
    this.provider = provider;
  }
}

