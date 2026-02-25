import { streamText, tool } from 'ai';
import { openai } from '@ai-sdk/openai';

export const maxDuration = 60; // Allow enough time for code generation

export async function POST(req: Request) {
  try {
    const { messages, libraryContext, prdContext } = await req.json();

    const systemPrompt = `You are an expert Frontend React Developer. Your job is to generate a fully functioning, beautiful UI component based on the user's request.
    
    You must use Tailwind CSS for styling.
    
    If the user has provided a component library, use the provided examples and documentation to build your response. 
    If the user provided a PRD (Product Requirement Document), adhere to the requirements in the PRD.

    Library Context:
    ${libraryContext || 'None'}
    
    PRD Context:
    ${prdContext || 'None'}
    
    Respond primarily with the code block of the generated React component \`export default function App() { ... }\`. Keep conversational chatter to a minimum.
    `;

    const result = streamText({
      model: openai('gpt-4o'),
      messages,
      system: systemPrompt,
    });

    return result.toTextStreamResponse();
  } catch (error) {
    console.error('Error generating prototype:', error);
    return new Response(JSON.stringify({ error: 'Failed to stream response' }), {
      status: 500,
    });
  }
}
