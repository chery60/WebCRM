import { createUIMessageStream, createUIMessageStreamResponse, streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { NextRequest } from 'next/server';
import { z } from 'zod';
import {
  STRUCTURED_PRD_SYSTEM_PROMPT,
  getSectionSpecificPrompt
} from '@/lib/ai/prompts';

// ============================================================================
// AI SDK PROVIDER CONFIGURATION
// ============================================================================

const GEMINI_SAFETY_SETTINGS = [
  { category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_HATE_SPEECH', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT', threshold: 'BLOCK_NONE' },
  { category: 'HARM_CATEGORY_DANGEROUS_CONTENT', threshold: 'BLOCK_NONE' },
];

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

const strictSectionSchema = z.object({
  title: z.string(),
  order: z.number(),
  description: z.string().optional(),
});

type TemplateSection = z.infer<typeof strictSectionSchema>;

type SectionPlan = {
  systemPrompt: string;
  prompt: string;
  sections: TemplateSection[];
};

function buildTemplatePrompts(options: {
  templateName?: string;
  templateDescription?: string;
  templateContextPrompt?: string;
  templateSections: TemplateSection[];
}) {
  const { templateName, templateDescription, templateContextPrompt, templateSections } = options;
  const sectionList = templateSections
    .map((section, index) => {
      const description = section.description?.trim();
      const descriptionLine = description ? `\n   - Description: ${description}` : '';
      return `${index + 1}. **${section.title}**${descriptionLine}`;
    })
    .join('\n');

  let systemPrompt = `You are a senior product manager drafting a PRD using a STRICT custom template.\n\n`;
  if (templateName) {
    systemPrompt += `## Template Information\n**Template Name:** ${templateName}\n`;
    if (templateDescription) {
      systemPrompt += `**Template Description:** ${templateDescription}\n`;
    }
    if (templateContextPrompt) {
      systemPrompt += `**Additional Context:** ${templateContextPrompt}\n`;
    }
    systemPrompt += '\n';
  }

  systemPrompt += `## Template Sections (STRICT ORDER)\n${sectionList}\n\n`;
  systemPrompt += `## STRICT SECTION RULES\n`;
  systemPrompt += `1. Generate ONLY the sections listed above.\n`;
  systemPrompt += `2. Do NOT add, rename, merge, or reorder sections.\n`;
  systemPrompt += `3. If you are unsure, leave that content inside the closest matching section rather than creating a new one.\n`;
  systemPrompt += `4. Output MUST use \"##\" markdown headers matching the exact section titles.\n`;
  systemPrompt += `5. The response will be rejected if extra sections appear.\n\n`;
  systemPrompt += `## Content Requirements\n`;
  systemPrompt += `- Each section must be comprehensive and complete.\n`;
  systemPrompt += `- Use proper markdown tables with pipe separators for comparisons, requirements matrices, or structured info.\n`;
  systemPrompt += `- IMPORTANT: For tables, use this format:\n`;
  systemPrompt += `  | Header 1 | Header 2 | Header 3 |\n`;
  systemPrompt += `  |----------|----------|----------|\n`;
  systemPrompt += `  | Cell 1   | Cell 2   | Cell 3   |\n`;
  systemPrompt += `- Use bullet lists for user stories and acceptance criteria.\n`;
  systemPrompt += `- **MANDATORY: Include Mermaid diagrams** to visualize concepts:\n`;
  systemPrompt += `  * For sections about processes/flows: include flowchart diagrams\n`;
  systemPrompt += `  * For sections about system architecture: include flowchart or sequence diagrams\n`;
  systemPrompt += `  * For any section where visual representation helps understanding: add appropriate diagrams\n`;
  systemPrompt += `  * Use ONLY these diagram types: \`\`\`mermaid flowchart\`\`\` or \`\`\`mermaid sequenceDiagram\`\`\`\n`;
  systemPrompt += `  * Wrap all node labels with special characters in quotes: A["Label (with parens)"]\n`;
  systemPrompt += `- Generate substantial, detailed content for each section (aim for 150+ words per section).\n\n`;

  const prompt = `Create a PRD using ONLY the template sections above.\n`;

  return {
    systemPrompt,
    prompt,
    sections: templateSections,
  };
}

function buildStructuredPrompts(options: {
  templateName?: string;
  templateDescription?: string;
  templateContextPrompt?: string;
}) {
  const { templateName, templateDescription, templateContextPrompt } = options;
  let systemPrompt = STRUCTURED_PRD_SYSTEM_PROMPT;

  if (templateName) {
    systemPrompt += `\n\n## Template Information\n**Template Name:** ${templateName}`;
    if (templateDescription) {
      systemPrompt += `\n**Template Description:** ${templateDescription}`;
    }
    if (templateContextPrompt) {
      systemPrompt += `\n**Additional Context:** ${templateContextPrompt}`;
    }
  }

  const prompt = `Generate a complete structured PRD using the default section structure. Use the exact section headers provided in the system instructions.`;

  return {
    systemPrompt,
    prompt,
  };
}

function buildSectionPrompt(options: {
  section: TemplateSection;
  description?: string;
  templateContextPrompt?: string;
  previousSections?: Array<{ title: string; content: string }>;
}) {
  const { section, description, templateContextPrompt, previousSections } = options;
  let prompt = `Generate the section titled "${section.title}".\n\n`;

  if (description) {
    prompt += `Product Description:\n${description}\n\n`;
  }

  if (templateContextPrompt) {
    prompt += `Additional Context:\n${templateContextPrompt}\n\n`;
  }

  if (section.description) {
    prompt += `Section Requirements:\n${section.description}\n\n`;
  }

  if (previousSections && previousSections.length > 0) {
    const contextBlock = previousSections
      .map((entry) => `## ${entry.title}\n${entry.content}`)
      .join('\n\n');
    prompt += `Existing Sections (for context):\n${contextBlock}\n\n`;
  }

  prompt += `Generate ONLY the content for this section. Do not create new sections.\n`;
  prompt += `IMPORTANT:\n`;
  prompt += `- Do NOT include the section header "## ${section.title}" in your response (it will be added automatically)\n`;
  prompt += `- Do NOT include any <thinking> tags, internal reasoning, or "Here is the section" preambles\n`;
  prompt += `- Start directly with the section content (text, bullets, tables, etc.)\n`;
  prompt += `- Use proper markdown formatting (bullets, bold, tables, etc.)\n`;
  prompt += `- For markdown tables, use this exact format:\n`;
  prompt += `  | Column 1 | Column 2 | Column 3 |\n`;
  prompt += `  |----------|----------|----------|\n`;
  prompt += `  | Data 1   | Data 2   | Data 3   |\n`;
  prompt += `- **IMPORTANT: Include Mermaid diagrams where they add value:**\n`;
  prompt += `  * For flow/process sections: add \`\`\`mermaid flowchart TD\`\`\` diagrams\n`;
  prompt += `  * For system interaction sections: add \`\`\`mermaid sequenceDiagram\`\`\` diagrams\n`;
  prompt += `  * For architecture sections: add flowchart diagrams showing components and data flow\n`;
  prompt += `  * ONLY use flowchart or sequenceDiagram types (others are disabled)\n`;
  prompt += `  * Always wrap node labels with special characters in quotes: A["User Login (OAuth)"]\n`;
  prompt += `- Generate comprehensive, detailed content (aim for at least 100-200 words with specific examples)\n`;
  prompt += `- Avoid incomplete sentences or truncated content\n`;
  prompt += `- If you need to generate a table, ensure it's complete with all rows and columns\n`;

  return prompt;
}

function buildSectionPlan(options: {
  templateName?: string;
  templateDescription?: string;
  templateContextPrompt?: string;
  templateSections: TemplateSection[];
  productDescription?: string;
}): SectionPlan {
  const { templateName, templateDescription, templateContextPrompt, templateSections, productDescription } = options;
  const sortedSections = [...templateSections].sort((a, b) => a.order - b.order);
  const templatePrompt = buildTemplatePrompts({
    templateName,
    templateDescription,
    templateContextPrompt,
    templateSections: sortedSections,
  });

  return {
    systemPrompt: templatePrompt.systemPrompt,
    prompt: `${templatePrompt.prompt}\n\nProduct Description:\n${productDescription || 'No description provided.'}`,
    sections: sortedSections,
  };
}

function createTextDeltaChunks(id: string, text: string) {
  return text
    .split(/(\n)/)
    .filter((chunk) => chunk.length > 0)
    .map((chunk) => ({
      type: 'text-delta' as const,
      id,
      delta: chunk,
    }));
}

async function streamSectionBySection(options: {
  model: ReturnType<typeof getAIProvider>;
  systemPrompt: string;
  sectionPlan: SectionPlan;
  productDescription?: string;
  templateContextPrompt?: string;
  temperature?: number;
  provider: string;
  modelName: string;
}) {
  const { model, systemPrompt, sectionPlan, productDescription, templateContextPrompt, temperature, provider, modelName } = options;

  return createUIMessageStream({
    execute: async ({ writer }) => {
      const messageId = `prd-${Date.now()}`;
      const totalSections = sectionPlan.sections.length;

      console.log(`[PRD Stream] Starting stream execution. Message ID: ${messageId}, Total sections: ${totalSections}`);

      writer.write({ type: 'text-start', id: messageId });

      const previousSections: Array<{ title: string; content: string }> = [];
      let successfulSections = 0;
      let failedSections = 0;

      for (let i = 0; i < sectionPlan.sections.length; i++) {
        const section = sectionPlan.sections[i];
        const sectionNumber = i + 1;

        // 1. Start reasoning/thinking phase for this section
        const thinkingId = `thinking-${messageId}-${i}`;
        writer.write({
          type: 'reasoning-start',
          id: thinkingId,
        });

        // 2. Stream thinking message: "Generating: [Section Name]..."
        const thinkingMessage = `Generating: ${section.title}... (Section ${sectionNumber} of ${totalSections})`;
        for (const char of thinkingMessage) {
          writer.write({
            type: 'reasoning-delta',
            id: thinkingId,
            delta: char,
          });
          await new Promise(resolve => setTimeout(resolve, 10)); // Smooth animation
        }

        writer.write({
          type: 'reasoning-end',
          id: thinkingId,
        });

        // 3. Write section header FIRST (so it appears before content)
        const headerText = `## ${section.title}\n\n`;
        for (const chunk of createTextDeltaChunks(messageId, headerText)) {
          writer.write(chunk);
        }

        // 4. Generate the section content
        const sectionPrompt = buildSectionPrompt({
          section,
          description: productDescription,
          templateContextPrompt,
          previousSections,
        });

        console.log(`[PRD API] Generating section: ${section.title} (${sectionNumber}/${totalSections})`);

        const sectionResult = streamText({
          model,
          system: systemPrompt,
          prompt: sectionPrompt,
          temperature,
          // NOTE: Tools removed from section generation
          // When tools are present, AI may call tools instead of generating text,
          // causing textStream to be empty (tools calls are not in textStream).
          // Section generation should produce direct text content, not use tools.
          maxOutputTokens: 6000, // Increased to allow for more comprehensive sections
          providerOptions: {
            google: {
              safetySettings: GEMINI_SAFETY_SETTINGS,
            },
          },
        });

        // 5. Stream the actual content in real-time with proper error handling
        let accumulatedContent = '';
        let hasGeneratedContent = false;
        let chunkCount = 0;
        const startTime = Date.now();

        try {
          console.log(`[PRD API] Starting textStream consumption for: ${section.title}`);
          console.log(`[PRD API] Provider: ${provider}, Model: ${modelName}, Temperature: ${temperature}`);

          // Stream content directly without Promise.race wrapper
          // The AI SDK handles timeouts internally
          let isFirstChunk = true;
          let chunkIndex = 0;
          for await (const chunk of sectionResult.textStream) {
            chunkIndex++;
            console.log(`[PRD API] Chunk ${chunkIndex} received for ${section.title}:`, {
              chunkType: typeof chunk,
              chunkLength: chunk?.length || 0,
              chunkPreview: chunk?.substring(0, 50) || 'empty',
            });
            // Validate chunk has actual content
            if (chunk && typeof chunk === 'string' && chunk.length > 0) {

              // Skip thinking/reasoning blocks if they appear despite instructions
              if (chunk.includes('<thinking>') || chunk.includes('</thinking>')) {
                continue;
              }

              let processedChunk = chunk;

              // On first chunk, strip any header that AI might include despite instructions
              if (isFirstChunk) {
                // Remove variations of section headers that AI might add:
                // "## Section Title\n", "## Section Title\n\n", "# Section Title\n", etc.
                processedChunk = processedChunk
                  .replace(/^#{1,3}\s+[^\n]+\n+/, '') // Remove header at start
                  .replace(/^#{1,3}\s+[^\n]+$/, '');  // Remove header without newline
                isFirstChunk = false;
              }

              // Skip if chunk is now empty after processing
              if (processedChunk.length === 0) {
                continue;
              }

              hasGeneratedContent = true;
              chunkCount++;

              // Write each chunk immediately to the client
              writer.write({
                type: 'text-delta',
                id: messageId,
                delta: processedChunk,
              });

              // Accumulate for context in next sections
              accumulatedContent += processedChunk;
            }
          }

          const elapsedTime = Date.now() - startTime;
          console.log(`[PRD API] Section ${section.title} completed:`, {
            contentLength: accumulatedContent.length,
            chunkCount,
            totalChunksReceived: chunkIndex,
            elapsedMs: elapsedTime,
            hasContent: hasGeneratedContent,
            provider,
            model: modelName,
          });

          // Log warning if no chunks received
          if (chunkIndex === 0) {
            console.error(`[PRD API] ⚠️ WARNING: textStream produced ZERO chunks for ${section.title}`, {
              provider,
              model: modelName,
              sectionTitle: section.title,
              elapsedMs: elapsedTime,
            });
          }

          // Only add error message if AI genuinely produced no content OR content is too short
          const contentTooShort = accumulatedContent.trim().length < 20;
          if (!hasGeneratedContent || contentTooShort) {
            console.error(`[PRD API] ❌ CRITICAL: Insufficient content for section: ${section.title}`, {
              chunkCount,
              contentLength: accumulatedContent.length,
              elapsedMs: Date.now() - startTime,
              provider: provider,
              model: modelName,
              sectionNumber,
              totalSections,
              hasGeneratedContent,
              contentTooShort,
            });
            
            // Only show error if we got absolutely nothing or very little
            if (!hasGeneratedContent || accumulatedContent.trim().length < 10) {
              // Provide actionable error message instead of placeholder
              const errorContent = `**⚠️ Content Generation Failed**\n\nUnable to generate content for "${section.title}".\n\n**Possible causes:**\n- API key may be invalid or expired\n- AI provider may be experiencing issues\n- Rate limits may have been exceeded\n\n**Next steps:**\n1. Verify your API key in Settings > Features\n2. Try regenerating this section\n3. Try a different AI provider\n4. Provide more detailed context in your request\n\n`;
              
              writer.write({
                type: 'text-delta',
                id: messageId,
                delta: errorContent,
              });
              accumulatedContent = errorContent;
              failedSections++;
            }
          }

        } catch (streamError) {
          const elapsedTime = Date.now() - startTime;
          console.error(`[PRD API] ❌ CRITICAL ERROR streaming section ${section.title}:`, {
            error: streamError,
            errorMessage: streamError instanceof Error ? streamError.message : 'Unknown error',
            errorStack: streamError instanceof Error ? streamError.stack : undefined,
            errorName: streamError instanceof Error ? streamError.name : 'UnknownError',
            sectionNumber,
            totalSections,
            hasGeneratedContent,
            chunkCount,
            accumulatedLength: accumulatedContent.length,
            elapsedMs: elapsedTime,
            provider: provider,
            model: modelName,
          });

          // Provide detailed, actionable error message in the stream
          const errorName = streamError instanceof Error ? streamError.name : 'Error';
          const errorMsg = streamError instanceof Error ? streamError.message : 'Unknown error';
          
          // Check for common error patterns
          let troubleshooting = '';
          if (errorMsg.includes('API key') || errorMsg.includes('authentication') || errorMsg.includes('401')) {
            troubleshooting = '**Issue:** Invalid or missing API key\n**Solution:** Update your API key in Settings > Features\n\n';
          } else if (errorMsg.includes('rate limit') || errorMsg.includes('429')) {
            troubleshooting = '**Issue:** Rate limit exceeded\n**Solution:** Wait a few moments and try again, or upgrade your API plan\n\n';
          } else if (errorMsg.includes('timeout') || errorMsg.includes('ETIMEDOUT')) {
            troubleshooting = '**Issue:** Request timeout\n**Solution:** Try again with a shorter request or different provider\n\n';
          } else if (errorMsg.includes('quota') || errorMsg.includes('billing')) {
            troubleshooting = '**Issue:** API quota exceeded or billing issue\n**Solution:** Check your provider account and billing status\n\n';
          }

          const errorMessage = `**❌ Error: ${errorName}**\n\nFailed to generate "${section.title}".\n\n${troubleshooting}**Error details:** ${errorMsg}\n\n**Next steps:**\n1. Check the console for detailed error information\n2. Verify your API configuration in Settings\n3. Try regenerating or use a different AI provider\n\n`;
          
          writer.write({
            type: 'text-delta',
            id: messageId,
            delta: errorMessage,
          });

          // Store error message for context
          accumulatedContent = errorMessage;
          failedSections++;
        }

        // Remove header if AI included it (for context storage)
        // Also strip any rogue <thinking> tags from the stored context
        const contentWithoutHeader = accumulatedContent
          .replace(/<thinking>[\s\S]*?<\/thinking>/g, '') // Strip thinking tags
          .trim()
          .replace(/^##\s+[^\n]+\n?/i, '')
          .trim();

        // Track success/failure with better metrics
        const isSuccessful = hasGeneratedContent && contentWithoutHeader.length > 10;
        if (isSuccessful) {
          successfulSections++;
          console.log(`[PRD API] ✅ Section ${sectionNumber}/${totalSections} SUCCESS: ${section.title} (${contentWithoutHeader.length} chars)`);
        } else {
          // failedSections already incremented in error/no-content blocks above
          console.log(`[PRD API] ❌ Section ${sectionNumber}/${totalSections} FAILED: ${section.title} (${contentWithoutHeader.length} chars, hasContent: ${hasGeneratedContent})`);
        }

        // Add controlled spacing between sections (single line break)
        writer.write({
          type: 'text-delta',
          id: messageId,
          delta: '\n',
        });

        // Store for context
        previousSections.push({
          title: section.title,
          content: contentWithoutHeader,
        });
      }

      console.log(`[PRD Stream] Stream execution completed. Message ID: ${messageId}`);
      console.log(`[PRD Stream] Results: ${successfulSections} successful, ${failedSections} failed out of ${totalSections} sections`);

      // Add summary if there were failures
      if (failedSections > 0) {
        const summaryText = `\n\n---\n\n**⚠️ Generation Summary**\n\n- ✅ Successfully generated: ${successfulSections} section${successfulSections !== 1 ? 's' : ''}\n- ❌ Failed: ${failedSections} section${failedSections !== 1 ? 's' : ''}\n\n**Recommendation:** Review the failed sections above and try regenerating them individually, or check your API configuration in Settings > Features.\n`;
        
        for (const chunk of createTextDeltaChunks(messageId, summaryText)) {
          writer.write(chunk);
        }
      }

      writer.write({ type: 'text-end', id: messageId });
    },
  });
}

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

    console.log('[PRD API] POST request received:', {
      provider,
      model: model || 'default',
      hasApiKey: !!apiKey,
      apiKeyLength: apiKey?.length || 0,
      templateName,
      hasSections: templateSections.length > 0,
      sectionCount: templateSections.length,
      temperature,
      messageCount: messages?.length || 0,
    });

    // ============================================================================
    // CRITICAL: Validate API Key
    // ============================================================================
    if (!apiKey) {
      console.error('[PRD API] API key missing');
      return new Response(
        JSON.stringify({
          error: 'API key is required',
          code: 'MISSING_API_KEY',
          message: `Please configure your ${provider} API key in Settings > Features to use AI generation.`
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate API key format
    if (typeof apiKey !== 'string' || apiKey.trim().length === 0) {
      console.error('[PRD API] Invalid API key format');
      return new Response(
        JSON.stringify({
          error: 'Invalid API key format',
          code: 'INVALID_API_KEY',
          message: 'The provided API key is invalid. Please check your API key in Settings.'
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Validate messages
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      console.error('[PRD API] No messages provided');
      return new Response(
        JSON.stringify({
          error: 'No messages provided',
          code: 'MISSING_MESSAGES',
          message: 'Please provide a description of your product or feature.'
        }),
        { 
          status: 400,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    // Get the AI model based on provider with error handling
    let aiModel;
    try {
      aiModel = getAIProvider(provider, apiKey, model);
      console.log('[PRD API] AI provider initialized successfully:', { provider, model: model || 'default' });
    } catch (providerError) {
      console.error('[PRD API] Failed to initialize AI provider:', providerError);
      return new Response(
        JSON.stringify({
          error: 'Failed to initialize AI provider',
          code: 'PROVIDER_INIT_ERROR',
          message: providerError instanceof Error ? providerError.message : 'Unknown provider error',
          details: `Could not initialize ${provider}. Please verify your API key is correct.`
        }),
        { 
          status: 500,
          headers: { 'Content-Type': 'application/json' }
        }
      );
    }

    const sectionCandidates = Array.isArray(templateSections)
      ? templateSections.map((section: any) => strictSectionSchema.parse(section))
      : [];

    const productDescription = messages
      ?.filter((message: any) => message?.role === 'user')
      .map((message: any) => message?.content || message?.parts?.map((part: any) => part.text).join(''))
      .filter(Boolean)
      .join('\n\n');

    const normalizedDescription = productDescription
      ?.replace(/^Using template:[^\n]*\n\n/i, '')
      .trim();

    const hasCustomTemplate = sectionCandidates.length > 0;

    if (!hasCustomTemplate) {
      console.log('[PRD API] Using default template (non-section-by-section mode)');

      const structuredPrompt = buildStructuredPrompts({
        templateName,
        templateDescription,
        templateContextPrompt,
      });

      const result = streamText({
        model: aiModel,
        system: structuredPrompt.systemPrompt,
        messages: messages,
        temperature,
        tools: prdTools,
        maxOutputTokens: 8000,
        providerOptions: {
          google: {
            safetySettings: GEMINI_SAFETY_SETTINGS,
          },
        },
        onChunk: ({ chunk }) => {
          console.log('[PRD API] Chunk received:', chunk.type);
        },
        onFinish: ({ text, toolCalls, toolResults, usage }) => {
          console.log('[PRD API] Generation finished');
          console.log('[PRD API] Text length:', text?.length || 0);
          console.log('[PRD API] Tool calls:', toolCalls?.length || 0);
          console.log('[PRD API] Usage:', usage);

          // Validate that content was actually generated
          if (!text || text.length === 0) {
            console.error('[PRD API] ❌ CRITICAL: No text content generated in default mode', {
              provider,
              model,
              hasToolCalls: (toolCalls?.length || 0) > 0,
              messageCount: messages?.length || 0,
            });
          } else {
            console.log('[PRD API] ✅ Generation successful with', text.length, 'characters');
          }
        },
        onError: (error) => {
          console.error('[PRD API] Error in default generation:', error);
        },
      });

      return result.toUIMessageStreamResponse();
    }

    console.log('[PRD API] Using custom template (section-by-section mode)');
    console.log('[PRD API] Template sections:', sectionCandidates.map(s => s.title).join(', '));

    const sectionPlan = buildSectionPlan({
      templateName,
      templateDescription,
      templateContextPrompt,
      templateSections: sectionCandidates,
      productDescription: normalizedDescription,
    });

    console.log('[PRD API] Starting section-by-section streaming...');

    const stream = await streamSectionBySection({
      model: aiModel,
      systemPrompt: sectionPlan.systemPrompt,
      sectionPlan,
      productDescription: normalizedDescription,
      templateContextPrompt,
      temperature,
      provider,
      modelName: model || 'default',
    });

    return createUIMessageStreamResponse({ stream });
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
