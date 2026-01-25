import type { AIGenerateRequest, AIGenerateResponse } from '@/types';
import type { AIServiceProvider } from '../interface';
import { getSystemPromptForType } from '../prompts';

export interface AnthropicConfig {
  apiKey: string;
  model?: string;
}

interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string;
}

interface AnthropicResponse {
  id: string;
  type: string;
  role: string;
  content: {
    type: string;
    text: string;
  }[];
  model: string;
  stop_reason: string;
  usage: {
    input_tokens: number;
    output_tokens: number;
  };
}

export class AnthropicProvider implements AIServiceProvider {
  name = 'Anthropic';
  private apiKey: string;
  private model: string;
  private baseUrl = 'https://api.anthropic.com/v1';

  constructor(config: AnthropicConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'claude-sonnet-4-20250514';
  }

  async isAvailable(): Promise<boolean> {
    try {
      // Anthropic doesn't have a simple health check endpoint,
      // so we make a minimal request to verify the API key
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: this.model,
          max_tokens: 1,
          messages: [{ role: 'user', content: 'Hi' }],
        }),
      });
      return response.ok;
    } catch {
      return false;
    }
  }

  async generateContent(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const systemPrompt = this.getSystemPrompt(request.type);
    const messages: AnthropicMessage[] = [];

    // Build user message with context if provided
    let userContent = '';
    if (request.context) {
      userContent += `Context:\n${request.context}\n\n`;
    }
    userContent += request.prompt;

    messages.push({ role: 'user', content: userContent });

    try {
      const response = await fetch(`${this.baseUrl}/messages`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-api-key': this.apiKey,
          'anthropic-version': '2023-06-01',
          'anthropic-dangerous-direct-browser-access': 'true',
        },
        body: JSON.stringify({
          model: request.model || this.model,
          max_tokens: this.getMaxTokens(request.type),
          system: systemPrompt,
          messages,
          temperature: this.getTemperature(request.type),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Anthropic API request failed');
      }

      const data: AnthropicResponse = await response.json();
      const content = data.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');

      return {
        content,
        tokens: data.usage.input_tokens + data.usage.output_tokens,
        provider: 'anthropic',
        model: data.model,
      };
    } catch (error) {
      console.error('Anthropic generation error:', error);
      throw error;
    }
  }

  private getSystemPrompt(type: AIGenerateRequest['type']): string {
    // Use centralized prompts from src/lib/ai/prompts/system-prompts.ts
    return getSystemPromptForType(type);
  }

  private getTemperature(type: AIGenerateRequest['type']): number {
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
