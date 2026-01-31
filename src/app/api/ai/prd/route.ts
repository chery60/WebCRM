import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import { 
  STRUCTURED_PRD_SYSTEM_PROMPT,
  STRUCTURED_PRD_GENERATION_PROMPT,
  getSectionSpecificPrompt 
} from '@/lib/ai/prompts';

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
// PRD GENERATION TOOLS
// ============================================================================

const prdTools = {
  generateSection: {
    description: 'Generate a specific section of the PRD with detailed content. Use this to structure your response into clear sections.',
    inputSchema: z.object({
      sectionTitle: z.string().describe('The title of the section being generated'),
      content: z.string().describe('The detailed content for this section'),
      reasoning: z.string().optional().describe('Internal reasoning about this section'),
    }),
    execute: async ({ sectionTitle, content, reasoning }: { sectionTitle: string; content: string; reasoning?: string }) => {
      console.log(`[Tool] generateSection called for: ${sectionTitle}`);
      return {
        success: true,
        sectionTitle,
        contentLength: content.length,
        hasReasoning: !!reasoning,
      };
    },
  },
  defineStructure: {
    description: 'Define the overall structure and sections of the PRD before generating content. Use this to plan the document structure.',
    inputSchema: z.object({
      sections: z.array(z.object({
        title: z.string(),
        order: z.number(),
        description: z.string().optional(),
      })),
      reasoning: z.string().optional().describe('Why this structure was chosen'),
    }),
    execute: async ({ sections, reasoning }: { sections: Array<{ title: string; order: number; description?: string }>; reasoning?: string }) => {
      console.log(`[Tool] defineStructure called with ${sections.length} sections`);
      return {
        success: true,
        totalSections: sections.length,
        structureDefined: true,
      };
    },
  },
};

// ============================================================================
// API ROUTE - POST /api/ai/prd
// ============================================================================

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      messages,
      provider = 'openai',
      apiKey,
      model,
      templateName,
      templateDescription,
      templateContextPrompt,
      templateSections = [],
      temperature = 0.5,
    } = body;

    if (!apiKey) {
      return new Response('API key is required', { status: 400 });
    }

    // Get the AI model based on provider
    const aiModel = getAIProvider(provider, apiKey, model);

    // Build system prompt with comprehensive template context
    let systemPrompt = STRUCTURED_PRD_SYSTEM_PROMPT;
    
    // Add template overview if available
    if (templateName) {
      systemPrompt += `\n\n## Template Information
**Template Name:** ${templateName}`;
      if (templateDescription) {
        systemPrompt += `\n**Template Description:** ${templateDescription}`;
      }
      if (templateContextPrompt) {
        systemPrompt += `\n**Additional Context:** ${templateContextPrompt}`;
      }
    }
    
    // Add section details
    if (templateSections.length > 0) {
      const sectionsList = templateSections
        .map((s: any) => {
          let sectionEntry = `${s.order}. **${s.title}**`;
          if (s.description) {
            sectionEntry += `\n   - Description: ${s.description}`;
          }
          return sectionEntry;
        })
        .join('\n');
      
      systemPrompt += `\n\n## Template Sections to Generate
You MUST generate ALL of the following sections in this exact order:

${sectionsList}

## Content Requirements for Each Section
- Generate **comprehensive, detailed content** for each section
- Include **tables** for comparisons, requirements matrices, and feature lists
- Include **Mermaid diagrams** (flowcharts, sequence diagrams, state diagrams) where they add clarity
- Use **bullet lists** for user stories, acceptance criteria, and key points
- Each section should have substantial content based on its description
- Do NOT output "Generating content..." or placeholder text - generate actual content`;
    }

    // Stream the response with tools for structured generation
    const result = streamText({
      model: aiModel,
      system: systemPrompt,
      messages: messages,
      temperature,
      tools: prdTools,
      onChunk: ({ chunk }) => {
        console.log('[PRD API] Chunk received:', chunk.type);
      },
      onFinish: ({ text, toolCalls, toolResults, usage }) => {
        console.log('[PRD API] Generation finished');
        console.log('[PRD API] Text length:', text?.length || 0);
        console.log('[PRD API] Tool calls:', toolCalls?.length || 0);
        console.log('[PRD API] Usage:', usage);
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error('PRD generation API error:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Failed to generate PRD' 
      }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}

// ============================================================================
// RUNTIME CONFIG
// ============================================================================

export const runtime = 'edge';
