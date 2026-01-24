import type { AIGenerateRequest, AIGenerateResponse } from '@/types';
import type { AIServiceProvider } from '../interface';

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
    const prompts: Record<string, string> = {
      'summarize': 'You are a helpful assistant that summarizes text concisely while preserving key information.',
      'expand': 'You are a helpful assistant that expands on ideas with relevant details, examples, and explanations.',
      'rewrite': 'You are a helpful assistant that rewrites text to improve clarity, flow, and engagement while maintaining the original meaning.',
      'translate': 'You are a professional translator. Translate the text accurately while preserving tone and context.',
      'continue': 'You are a helpful writing assistant. Continue the text naturally, maintaining the same style and tone.',
      'grammar': 'You are a grammar expert. Fix any grammatical errors while preserving the original meaning.',
      'professional': 'You are a professional editor. Rewrite the text to sound more professional and polished.',
      'ask': 'You are a helpful AI assistant. Answer questions accurately and helpfully.',
      'generate-prd': 'You are a world-class product manager and PRD expert. Generate comprehensive, detailed PRDs that cover all aspects of product development.',
      'generate-prd-section': 'You are a product management expert. Generate detailed content for the specified PRD section.',
      'improve-prd': 'You are a senior product manager. Review and improve the PRD to make it more comprehensive and actionable.',
      'generate-features': 'You are a product strategist. Extract and define features from the PRD with clear acceptance criteria.',
      'generate-tasks': 'You are a technical project manager. Break down features into actionable tasks with estimates.',
      'generate-canvas': `You generate Excalidraw diagram elements as a JSON array. Your response must be ONLY a valid JSON array starting with [ and ending with ]. No markdown, no explanations, no code blocks.

RESPOND WITH THIS EXACT FORMAT - A JSON ARRAY:
[
  {"type":"text","x":300,"y":30,"text":"Title","fontSize":24,"strokeColor":"#1e1e1e"},
  {"type":"rectangle","x":100,"y":100,"width":180,"height":70,"text":"Box 1","backgroundColor":"#e3f2fd"},
  {"type":"arrow","x":190,"y":170,"points":[[0,0],[0,50]]}
]

ELEMENT TYPES:
- rectangle: x, y, width, height, text, backgroundColor
- ellipse: x, y, width, height, text, backgroundColor  
- diamond: x, y, width, height, text, backgroundColor
- arrow: x, y, points (array of [x,y] pairs)
- text: x, y, text, fontSize, strokeColor

COLORS: #e3f2fd (blue), #e8f5e9 (green), #fff3e0 (orange), #fce4ec (pink), #f3e5f5 (purple)

CRITICAL: Output ONLY the JSON array. No other text before or after.`,
    };

    return prompts[type] || 'You are a helpful AI assistant.';
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
