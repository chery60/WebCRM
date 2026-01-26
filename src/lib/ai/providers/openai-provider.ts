import type { AIGenerateRequest, AIGenerateResponse } from '@/types';
import type { AIServiceProvider } from '../interface';
import { getSystemPromptForType } from '../prompts';

export interface OpenAIConfig {
  apiKey: string;
  model?: string;
  baseUrl?: string;
  webSearchEnabled?: boolean;
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

// Response API format (used for web search)
interface OpenAIResponsesAPIResponse {
  id: string;
  object: string;
  created_at: number;
  model: string;
  output: {
    type: string;
    id: string;
    status: string;
    role: string;
    content: {
      type: string;
      text?: string;
      annotations?: unknown[];
    }[];
  }[];
  usage?: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
  };
}

// Generation types that benefit from web search (market research, competitor analysis, etc.)
const WEB_SEARCH_ENABLED_TYPES: AIGenerateRequest['type'][] = [
  'generate-prd',
  'generate-prd-section',
  'improve-prd',
  'generate-features',
];

export class OpenAIProvider implements AIServiceProvider {
  name = 'OpenAI';
  private apiKey: string;
  private model: string;
  private baseUrl: string;
  private webSearchEnabled: boolean;

  constructor(config: OpenAIConfig) {
    this.apiKey = config.apiKey;
    this.model = config.model || 'gpt-4o';
    this.baseUrl = config.baseUrl || 'https://api.openai.com/v1';
    this.webSearchEnabled = config.webSearchEnabled ?? false; // Default to disabled for OpenAI (requires Responses API)
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
    const shouldUseWebSearch = this.shouldEnableWebSearch(request);
    
    // Use Responses API with web search if enabled, otherwise use standard chat completions
    if (shouldUseWebSearch) {
      return this.generateWithWebSearch(request);
    }
    
    return this.generateStandard(request);
  }

  /**
   * Standard generation using Chat Completions API
   */
  private async generateStandard(request: AIGenerateRequest): Promise<AIGenerateResponse> {
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

  /**
   * Generation using Responses API with web search tool
   * This enables the AI to search the web for current information
   */
  private async generateWithWebSearch(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const systemPrompt = this.getSystemPrompt(request.type);
    
    // Build the input text with context
    let inputText = '';
    if (systemPrompt) {
      inputText += `Instructions: ${systemPrompt}\n\n`;
    }
    if (request.context) {
      inputText += `Context:\n${request.context}\n\n`;
    }
    inputText += request.prompt;

    try {
      const response = await fetch(`${this.baseUrl}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`,
        },
        body: JSON.stringify({
          model: request.model || this.model,
          input: inputText,
          tools: [{ type: 'web_search_preview' }],
          temperature: this.getTemperature(request.type),
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        // If Responses API fails, fall back to standard generation
        console.warn('OpenAI Responses API failed, falling back to standard generation:', error.error?.message);
        return this.generateStandard(request);
      }

      const data: OpenAIResponsesAPIResponse = await response.json();
      
      // Extract text content from the response
      let content = '';
      for (const output of data.output || []) {
        if (output.role === 'assistant' && output.content) {
          for (const block of output.content) {
            if (block.type === 'text' && block.text) {
              content += block.text;
            }
          }
        }
      }

      return {
        content,
        tokens: data.usage?.total_tokens,
        provider: 'openai',
        model: data.model,
      };
    } catch (error) {
      console.error('OpenAI web search generation error:', error);
      // Fall back to standard generation on error
      console.warn('Falling back to standard generation');
      return this.generateStandard(request);
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

  /**
   * Determines if web search should be enabled for this request.
   * Web search is enabled when:
   * 1. The provider has web search enabled (this.webSearchEnabled)
   * 2. The request type is one that benefits from web search (PRD generation, features, etc.)
   * 3. The request doesn't explicitly disable web search (request.useWebSearch !== false)
   */
  private shouldEnableWebSearch(request: AIGenerateRequest): boolean {
    // Check if web search is explicitly disabled in the request
    if (request.useWebSearch === false) {
      return false;
    }

    // Check if web search is enabled for this provider
    if (!this.webSearchEnabled) {
      return false;
    }

    // Check if web search is explicitly enabled in the request (overrides type check)
    if (request.useWebSearch === true) {
      return true;
    }

    // Enable web search for PRD-related generation types
    return WEB_SEARCH_ENABLED_TYPES.includes(request.type);
  }
}
