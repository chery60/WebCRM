import type { AIGenerateRequest, AIGenerateResponse } from '@/types';
import type { AIServiceProvider } from '../interface';
import { getSystemPromptForType } from '../prompts';

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
}

interface OpenAIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

interface OpenAIResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  usage?: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
}

export class OpenAIProvider implements AIServiceProvider {
  name = 'OpenAI';
  private apiKey: string;
  private model: string;
  private baseUrl: string;

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4o';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
        },
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async generateContent(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const systemPrompt = this.getSystemPrompt(request.type);
    const messages: OpenAIMessage[] = [];

    // Add system prompt
    if (systemPrompt) {
      messages.push({ role: 'system', content: systemPrompt });
    }

    // Add context if provided
    if (request.context) {
      messages.push({ role: 'user', content: `Context:\n${request.context}` });
    }

    // Add main prompt
    messages.push({ role: 'user', content: request.prompt });

    try {
      const response = await fetch(`${this.baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model || this.model,
          messages,
          temperature: this.getTemperature(request.type),
          max_tokens: this.getMaxTokens(request.type),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'OpenAI API request failed');
      }

      const data: OpenAIResponse = await response.json();
      const content = data.choices[0]?.message?.content || '';

      return {
        content,
        tokens: data.usage?.total_tokens,
        provider: 'openai',
        model: data.model,
      };
    } catch (error) {
      console.error('OpenAI generation error:', error);
      throw error;
    }
  }

  private getSystemPrompt(type: AIGenerateRequest['type']): string {
    // Use centralized prompts from src/lib/ai/prompts/system-prompts.ts
    return getSystemPromptForType(type);
  }

  private getTemperature(type: AIGenerateRequest['type']): number {
    // Lower temperature for factual/structured outputs, higher for creative
    const temperatures: Record<string, number> = {
      'summarize': 0.3,
      'expand': 0.7,
      'rewrite': 0.6,
      'translate': 0.2,
      'continue': 0.8,
      'grammar': 0.1,
      'professional': 0.4,
      'ask': 0.7,
      'generate-prd': 0.5,
      'generate-prd-section': 0.5,
      'improve-prd': 0.4,
      'generate-features': 0.4,
      'generate-tasks': 0.3,
      'generate-canvas': 0.3,
    };
    return temperatures[type] ?? 0.7;
  }

  private getMaxTokens(type: AIGenerateRequest['type']): number {
    const tokens: Record<string, number> = {
      'summarize': 500,
      'expand': 2000,
      'rewrite': 1500,
      'translate': 2000,
      'continue': 1000,
      'grammar': 1500,
      'professional': 1500,
      'ask': 2000,
      'generate-prd': 8000,
      'generate-prd-section': 2000,
      'improve-prd': 4000,
      'generate-features': 4000,
      'generate-tasks': 4000,
      'generate-canvas': 8000,
    };
    return tokens[type] ?? 2000;
  }
}
