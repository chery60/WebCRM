import type { AIGenerateRequest, AIGenerateResponse } from '@/types';
import type { AIServiceProvider } from '../interface';

export interface GeminiConfig {
  apiKey: string;
  model?: string;
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

export class GeminiProvider implements AIServiceProvider {
  name = 'Google Gemini';
  private apiKey: string;
  private model: string;
  // Use v1beta API as confirmed working by availability check
  private baseUrl = 'https://generativelanguage.googleapis.com/v1beta';

  constructor(config: GeminiConfig) {
    this.apiKey = config.apiKey;
    // Map standard names to latest versions to ensure availability
    let model = config.model || 'gemini-1.5-flash';

    this.model = model;
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

    const generate = async (model: string) => {
      const response = await fetch(
        `${this.baseUrl}/models/${model}:generateContent?key=${this.apiKey}`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
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
          }),
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
    const prompts: Record<string, string> = {
      'summarize': 'You are a helpful assistant that summarizes text concisely while preserving key information. Create clear, well-organized summaries.',
      'expand': 'You are a helpful assistant that expands on ideas with relevant details, examples, and explanations. Provide comprehensive expansions while staying focused.',
      'rewrite': 'You are a helpful assistant that rewrites text to improve clarity, flow, and engagement while maintaining the original meaning.',
      'translate': 'You are a professional translator. Translate text accurately while preserving tone, context, and cultural nuances.',
      'continue': 'You are a helpful writing assistant. Continue the text naturally, maintaining the same style, tone, and voice.',
      'grammar': 'You are a grammar expert. Fix grammatical errors while preserving the original meaning and tone.',
      'professional': 'You are a professional editor. Rewrite text to sound more professional, polished, and business-appropriate.',
      'ask': 'You are a helpful AI assistant powered by Google Gemini. Answer questions accurately and helpfully.',
      'generate-prd': `You are a world-class product manager with experience at leading tech companies. Generate comprehensive, detailed Product Requirements Documents (PRDs) that include:

1. **Executive Summary** - Brief overview of the product/feature
2. **Problem Statement** - Clear articulation of the problem and user pain points
3. **Goals & Success Metrics** - Measurable objectives and KPIs
4. **User Personas** - Target user profiles with needs and behaviors
5. **User Stories & Use Cases** - Detailed user scenarios
6. **Functional Requirements** - Core features and capabilities
7. **Non-Functional Requirements** - Performance, security, scalability
8. **Technical Considerations** - Architecture and integration notes
9. **UI/UX Considerations** - Design principles and user experience
10. **Dependencies & Constraints** - External factors and limitations
11. **Timeline & Milestones** - Phased delivery plan
12. **Risks & Mitigations** - Potential issues and solutions
13. **Open Questions** - Items requiring further discussion

Be thorough, specific, and actionable. Use concrete examples and clear acceptance criteria.`,
      'generate-prd-section': 'You are a product management expert. Generate detailed, actionable content for the specified PRD section. Be specific, use examples, and ensure the content is implementable.',
      'improve-prd': 'You are a senior product manager reviewing a PRD. Analyze for gaps, inconsistencies, and areas of improvement. Provide specific suggestions to make the PRD more comprehensive and actionable.',
      'generate-features': `You are a product strategist. Extract and define features from the PRD. For each feature provide:
- **Title**: Clear, descriptive name
- **Description**: What the feature does and why it matters
- **Priority**: low | medium | high | urgent
- **Phase**: Which release phase (Phase 1, Phase 2, etc.)
- **Estimated Effort**: Time/complexity estimate
- **Acceptance Criteria**: Clear conditions for completion
- **User Stories**: As a [user], I want [feature] so that [benefit]

Format the output as structured data that can be parsed.`,
      'generate-tasks': `You are a technical project manager. Break down features into actionable development tasks. For each task provide:
- **Title**: Clear task name
- **Description**: What needs to be done
- **Priority**: low | medium | high
- **Estimated Hours**: Time estimate
- **Role**: Frontend | Backend | Design | QA | DevOps | Product
- **Dependencies**: Other tasks that must be completed first
- **Definition of Done**: Clear completion criteria

Be practical and specific. Tasks should be completable in 1-8 hours ideally.`,
    };

    return prompts[type] || 'You are a helpful AI assistant powered by Google Gemini. Be helpful and accurate.';
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
    };
    return tokens[type] ?? 2000;
  }
}
