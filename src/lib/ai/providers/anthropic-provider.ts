import type { AIGenerateRequest, AIGenerateResponse } from '@/types';
import type { AIServiceProvider } from '../interface';

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
    const prompts: Record<string, string> = {
      'summarize': 'You are a helpful assistant that summarizes text concisely while preserving key information. Provide clear, well-structured summaries.',
      'expand': 'You are a helpful assistant that expands on ideas with relevant details, examples, and explanations. Be thorough but stay focused on the topic.',
      'rewrite': 'You are a helpful assistant that rewrites text to improve clarity, flow, and engagement while maintaining the original meaning.',
      'translate': 'You are a professional translator. Translate the text accurately while preserving tone, context, and cultural nuances.',
      'continue': 'You are a helpful writing assistant. Continue the text naturally, maintaining the same style, tone, and voice.',
      'grammar': 'You are a grammar expert. Fix any grammatical errors while preserving the original meaning and tone.',
      'professional': 'You are a professional editor. Rewrite the text to sound more professional, polished, and business-appropriate.',
      'ask': 'You are Claude, a helpful AI assistant created by Anthropic. Answer questions accurately, helpfully, and thoughtfully.',
      'generate-prd': `You are a world-class product manager with experience at top tech companies. Generate comprehensive, detailed Product Requirements Documents (PRDs) that include:
- Executive Summary
- Problem Statement & User Pain Points
- Goals & Success Metrics
- User Personas
- User Stories & Use Cases
- Functional Requirements
- Non-Functional Requirements
- Technical Considerations
- UI/UX Considerations
- Dependencies & Constraints
- Timeline & Milestones
- Risks & Mitigations
- Open Questions

Be thorough, specific, and actionable in your PRD.`,
      'generate-prd-section': 'You are a product management expert. Generate detailed, actionable content for the specified PRD section. Be specific and include concrete examples.',
      'improve-prd': 'You are a senior product manager reviewing a PRD. Identify gaps, suggest improvements, and enhance the document to be more comprehensive and actionable.',
      'generate-features': `You are a product strategist. Extract and define features from the PRD. For each feature, provide:
- Clear title and description
- Priority (low/medium/high/urgent)
- Phase assignment
- Estimated effort
- Acceptance criteria
- User stories

Return features in a structured format.`,
      'generate-tasks': `You are a technical project manager. Break down features into actionable development tasks. For each task, provide:
- Clear title and description
- Priority
- Estimated hours
- Assigned role (Frontend, Backend, Design, QA, DevOps, etc.)
- Dependencies
- Definition of done

Be specific and practical in task breakdown.`,
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

    return prompts[type] || 'You are Claude, a helpful AI assistant created by Anthropic. Be helpful, harmless, and honest.';
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
