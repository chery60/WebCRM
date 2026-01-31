import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { NextRequest } from 'next/server';
import { getSystemPromptForType } from '@/lib/ai/prompts';

// ============================================================================
// AI SDK PROVIDER CONFIGURATION
// ============================================================================

function getAIProvider(provider: string, apiKey: string, model?: string) {
  switch (provider) {
    case 'openai':
      const openai = createOpenAI({ apiKey });
      return openai(model || 'gpt-4o');
    
    case 'anthropic':
      const anthropic = createAnthropic({ apiKey });
      return anthropic(model || 'claude-sonnet-4-20250514');
    
    case 'gemini':
      const google = createGoogleGenerativeAI({ apiKey });
      return google(model || 'gemini-2.0-flash-exp');
    
    default:
      throw new Error(`Unknown provider: ${provider}`);
  }
}

// ============================================================================
// API ROUTE - POST /api/ai/chat
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      provider = 'openai',
      apiKey,
      model,
      type = 'ask',
      temperature,
    } = body;

    if (!apiKey) {
      return new Response('API key is required', { status: 400 });
    }

    // Get the AI model based on provider
    const aiModel = getAIProvider(provider, apiKey, model);

    // Get system prompt based on generation type
    const systemPrompt = getSystemPromptForType(type);

    // Stream the response
    const result = streamText({
      model: aiModel,
      system: systemPrompt,
      messages: messages,
      temperature: temperature || 0.7,
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('AI chat API error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to generate response' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ============================================================================
// RUNTIME CONFIG
// ============================================================================

export const runtime = 'edge';
