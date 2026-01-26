import type { AIGenerateRequest, AIGenerateResponse } from '@/types';
import type { AIServiceProvider } from '../interface';
import { getSystemPromptForType } from '../prompts';

export interface GeminiConfig {
  apiKey: string;
  model?: string;
  webSearchEnabled?: boolean;
}

interface GeminiContent {
  role: 'user' | 'model';
  parts: { text: string }[];
}

interface GeminiResponse {
  candidates: {
    content: {
      parts: { text: string }[];
      role: string;
    };
    finishReason: string;
    safetyRatings?: unknown[];
  }[];
  usageMetadata?: {
    promptTokenCount: number;
    candidatesTokenCount: number;
    totalTokenCount: number;
  };
  modelVersion?: string;
}

// Generation types that benefit from web search (market research, competitor analysis, etc.)
const WEB_SEARCH_ENABLED_TYPES: AIGenerateRequest['type'][] = [
  'generate-prd',
  'generate-prd-section',
  'improve-prd',
  'generate-features',
];

export class GeminiProvider implements AIServiceProvider {
  name = 'Google Gemini';
  private apiKey: string;
  private model: string;
  private webSearchEnabled: boolean;
  // Use v1beta API as confirmed working by availability check
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey;
    // Map standard names to latest versions to ensure availability
    let model = config.model || 'gemini-1.5-flash';

    this.model = model;
    this.webSearchEnabled = config.webSearchEnabled ?? true; // Default to enabled for Gemini
  }

  async isAvailable(): Promise<boolean> {
    try {
      const response = await fetch(
        `${this.baseUrl}/models?key=${this.apiKey}`,
        { method: 'GET' }
      );
      return response.ok;
    } catch {
      return false;
    }
  }

  async generateContent(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    const systemInstruction = this.getSystemPrompt(request.type);
    const contents: GeminiContent[] = [];

    // Build user message with context if provided
    let userContent = '';
    if (request.context) {
      userContent += `Context:\n${request.context}\n\n`;
    }
    userContent += request.prompt;

    contents.push({
      role: 'user',
      parts: [{ text: userContent }],
    });

    // Use standard model IDs
    let modelToUse = request.model || this.model;



    // Fallback model as requested
    const fallbackModel = 'gemini-2.5-flash-preview-09-2025';

    // Build the user content with system instruction prepended (since systemInstruction field is not always supported)
    let fullUserContent = '';
    if (systemInstruction) {
      fullUserContent += `Instructions: ${systemInstruction}\n\n`;
    }
    fullUserContent += userContent;

    // Update contents with the combined prompt
    const finalContents: GeminiContent[] = [
      {
        role: 'user',
        parts: [{ text: fullUserContent }],
      },
    ];

    // Determine if web search should be used for this request
    const shouldUseWebSearch = this.shouldEnableWebSearch(request);
    
    const generate = async (model: string) => {
      // Build the request body
      const requestBody: Record<string, unknown> = {
        contents: finalContents,
        generationConfig: {
          temperature: this.getTemperature(request.type),
          maxOutputTokens: this.getMaxTokens(request.type),
          topP: 0.95,
          topK: 40,
        },
        safetySettings: [
          { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
          { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' },
        ],
      };

      // Add Google Search Grounding tool when enabled for PRD-related generation
      if (shouldUseWebSearch) {
        requestBody.tools = [{
          googleSearchRetrieval: {}
        }];
      }

      const response = await fetch(
        `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestBody),
        }
      );

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error?.message || 'Gemini API request failed');
      }

      return await response.json();
    };

    try {
      try {
        const data = await generate(modelToUse);
        return this.parseResponse(data, modelToUse);
      } catch (error: any) {
        // If the primary model fails (and it wasn't already the fallback), try the fallback
        if (modelToUse !== fallbackModel && (
          error.message.includes('not found') ||
          error.message.includes('Quota exceeded') ||
          error.message.includes('overloaded') ||
          error.message.includes('503')
        )) {
          console.warn(`Gemini model ${modelToUse} failed (${error.message}), retrying with ${fallbackModel}...`);
          const data = await generate(fallbackModel);
          return this.parseResponse(data, fallbackModel);
        }
        throw error;
      }
    } catch (error) {
      console.error('Gemini generation error:', error);
      throw error;
    }
  }

  private parseResponse(data: GeminiResponse, model: string): AIGenerateResponse {
    // Extract text from response
    const content = data.candidates?.[0]?.content?.parts
      ?.map((part) => part.text)
      .join('') || '';

    return {
      content,
      tokens: data.usageMetadata?.totalTokenCount,
      provider: 'gemini',
      model: model,
    };
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
      'generate-prd': 4096,
      'generate-prd-section': 2000,
      'improve-prd': 4000,
      'generate-features': 8192,
      'generate-tasks': 4000,
      'generate-canvas': 8192,
    };
    return tokens[type] ?? 2000;
  }

  /**
   * Determines if web search (Google Search Grounding) should be enabled for this request.
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
