import type { AIServiceProvider } from './interface';
import type { AIGenerateRequest, AIGenerateResponse } from '@/types';

// Simulated responses for different AI actions
const mockResponses: Record<string, (prompt: string, context?: string) => string> = {
  summarize: (prompt) => {
    const words = prompt.split(' ').slice(0, 20).join(' ');
    return `**Summary:** ${words}... This text discusses key points about the topic and provides insights into the main ideas presented.`;
  },
  
  expand: (prompt) => {
    return `${prompt}\n\nTo elaborate further on this point, we can consider several additional aspects:\n\n1. **Context and Background:** Understanding the broader context helps frame this discussion appropriately.\n\n2. **Key Implications:** There are significant implications to consider when examining this topic in depth.\n\n3. **Future Considerations:** Looking ahead, this area presents opportunities for further exploration and development.`;
  },
  
  rewrite: (prompt) => {
    // Simple rewrite simulation - just rephrase slightly
    return prompt
      .replace(/\bis\b/g, 'appears to be')
      .replace(/\bwas\b/g, 'had been')
      .replace(/\bcan\b/g, 'is able to')
      .replace(/\bwill\b/g, 'shall')
      .replace(/\bgood\b/gi, 'excellent')
      .replace(/\bbad\b/gi, 'suboptimal');
  },
  
  translate: (prompt) => {
    // Mock translation - just add a note
    return `[Translated to Spanish]\n\n${prompt}\n\n---\n*Note: This is a mock translation. In production, this would be translated using a real translation service.*`;
  },
  
  continue: (prompt, context) => {
    return `\n\nContinuing from where we left off, it's important to note that this topic has several key dimensions worth exploring. The team has been making steady progress on these initiatives, and we anticipate significant developments in the coming weeks.\n\nNext steps include:\n- Reviewing the current implementation\n- Gathering feedback from stakeholders\n- Preparing the final recommendations`;
  },
  
  grammar: (prompt) => {
    // Simple grammar "fixes" for demonstration
    return prompt
      .replace(/\bi\b/g, 'I')
      .replace(/\bdont\b/gi, "don't")
      .replace(/\bcant\b/gi, "can't")
      .replace(/\bwont\b/gi, "won't")
      .replace(/\bits\b/g, "it's")
      .replace(/\bthier\b/gi, 'their')
      .replace(/\bteh\b/gi, 'the')
      .replace(/  +/g, ' ')
      .trim();
  },
  
  professional: (prompt) => {
    return `I would like to bring to your attention the following matter:\n\n${prompt}\n\nPlease do not hesitate to reach out should you require any additional information or clarification regarding this matter.\n\nBest regards`;
  },
  
  ask: (prompt) => {
    return `Based on your question, here's what I can help you with:\n\n${prompt}\n\nThis is a complex topic that requires careful consideration. I recommend breaking it down into smaller, manageable components and addressing each one systematically.\n\nWould you like me to elaborate on any specific aspect?`;
  },
};

// Simulate network delay
function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// Get random delay between min and max
function randomDelay(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1) + min);
}

export class MockAIProvider implements AIServiceProvider {
  name = 'Mock AI';

  async generateContent(request: AIGenerateRequest): Promise<AIGenerateResponse> {
    // Simulate realistic AI response time (500ms - 2s)
    await delay(randomDelay(500, 2000));

    const generator = mockResponses[request.type] || mockResponses.ask;
    const content = generator(request.prompt, request.context);

    return {
      content,
      tokens: Math.floor(content.length / 4), // Rough token estimate
    };
  }

  async isAvailable(): Promise<boolean> {
    // Mock provider is always available
    return true;
  }
}

// Create singleton instance
let mockProviderInstance: MockAIProvider | null = null;

export function getMockProvider(): MockAIProvider {
  if (!mockProviderInstance) {
    mockProviderInstance = new MockAIProvider();
  }
  return mockProviderInstance;
}

