import type { AIServiceProvider } from './interface';
import type { AIGenerateRequest, AIGenerateResponse } from '@/types';

// Mock canvas diagram generators for different diagram types
const mockCanvasDiagrams: Record<string, any[]> = {
  'information-architecture': [
    { type: 'text', x: 300, y: 30, text: 'Information Architecture', fontSize: 24, strokeColor: '#1e1e1e' },
    { type: 'rectangle', x: 100, y: 100, width: 180, height: 70, backgroundColor: '#e3f2fd', text: 'Home' },
    { type: 'rectangle', x: 320, y: 100, width: 180, height: 70, backgroundColor: '#e3f2fd', text: 'Products' },
    { type: 'rectangle', x: 540, y: 100, width: 180, height: 70, backgroundColor: '#e3f2fd', text: 'About' },
    { type: 'arrow', x: 190, y: 170, points: [[0, 0], [0, 50]] },
    { type: 'arrow', x: 410, y: 170, points: [[0, 0], [0, 50]] },
    { type: 'arrow', x: 630, y: 170, points: [[0, 0], [0, 50]] },
    { type: 'rectangle', x: 100, y: 240, width: 150, height: 55, backgroundColor: '#e8f5e9', text: 'Dashboard' },
    { type: 'rectangle', x: 320, y: 240, width: 150, height: 55, backgroundColor: '#e8f5e9', text: 'Product List' },
    { type: 'rectangle', x: 540, y: 240, width: 150, height: 55, backgroundColor: '#e8f5e9', text: 'Team' },
    { type: 'rectangle', x: 320, y: 320, width: 150, height: 55, backgroundColor: '#f3e5f5', text: 'Product Detail' },
  ],
  'user-flow': [
    { type: 'text', x: 100, y: 30, text: 'User Flow', fontSize: 24, strokeColor: '#1e1e1e' },
    { type: 'ellipse', x: 100, y: 100, width: 100, height: 60, backgroundColor: '#e8f5e9', text: 'Start' },
    { type: 'arrow', x: 200, y: 130, points: [[0, 0], [80, 0]] },
    { type: 'rectangle', x: 300, y: 100, width: 150, height: 60, backgroundColor: '#e3f2fd', text: 'Login' },
    { type: 'arrow', x: 450, y: 130, points: [[0, 0], [80, 0]] },
    { type: 'diamond', x: 550, y: 95, width: 110, height: 75, backgroundColor: '#fff3e0', text: 'Valid?' },
    { type: 'arrow', x: 660, y: 130, points: [[0, 0], [80, 0]] },
    { type: 'rectangle', x: 760, y: 100, width: 150, height: 60, backgroundColor: '#e3f2fd', text: 'Dashboard' },
    { type: 'arrow', x: 605, y: 170, points: [[0, 0], [0, 60]] },
    { type: 'rectangle', x: 550, y: 250, width: 120, height: 50, backgroundColor: '#fce4ec', text: 'Show Error' },
    { type: 'ellipse', x: 810, y: 200, width: 100, height: 60, backgroundColor: '#e8f5e9', text: 'Success' },
  ],
  'edge-cases': [
    { type: 'text', x: 250, y: 30, text: 'Edge Cases & Error Handling', fontSize: 24, strokeColor: '#1e1e1e' },
    { type: 'rectangle', x: 100, y: 100, width: 140, height: 50, backgroundColor: '#e8f5e9', text: 'Valid Input' },
    { type: 'rectangle', x: 260, y: 100, width: 140, height: 50, backgroundColor: '#fff3e0', text: 'Empty Input' },
    { type: 'rectangle', x: 420, y: 100, width: 140, height: 50, backgroundColor: '#fce4ec', text: 'Invalid Format' },
    { type: 'rectangle', x: 100, y: 180, width: 140, height: 50, backgroundColor: '#e8f5e9', text: 'Success' },
    { type: 'rectangle', x: 260, y: 180, width: 140, height: 50, backgroundColor: '#fff3e0', text: 'Show Warning' },
    { type: 'rectangle', x: 420, y: 180, width: 140, height: 50, backgroundColor: '#fce4ec', text: 'Show Error' },
    { type: 'arrow', x: 170, y: 150, points: [[0, 0], [0, 30]] },
    { type: 'arrow', x: 330, y: 150, points: [[0, 0], [0, 30]] },
    { type: 'arrow', x: 490, y: 150, points: [[0, 0], [0, 30]] },
  ],
  'system-architecture': [
    { type: 'text', x: 280, y: 30, text: 'System Architecture', fontSize: 24, strokeColor: '#1e1e1e' },
    { type: 'rectangle', x: 250, y: 80, width: 180, height: 60, backgroundColor: '#e0f7fa', text: 'Client App' },
    { type: 'arrow', x: 340, y: 140, points: [[0, 0], [0, 40]] },
    { type: 'rectangle', x: 250, y: 200, width: 180, height: 60, backgroundColor: '#e3f2fd', text: 'API Gateway' },
    { type: 'arrow', x: 340, y: 260, points: [[0, 0], [0, 40]] },
    { type: 'rectangle', x: 100, y: 320, width: 150, height: 55, backgroundColor: '#e8f5e9', text: 'Auth Service' },
    { type: 'rectangle', x: 270, y: 320, width: 150, height: 55, backgroundColor: '#e8f5e9', text: 'Core Service' },
    { type: 'rectangle', x: 440, y: 320, width: 150, height: 55, backgroundColor: '#e8f5e9', text: 'Data Service' },
    { type: 'rectangle', x: 270, y: 420, width: 150, height: 55, backgroundColor: '#f3e5f5', text: 'Database' },
  ],
  'feature-priority': [
    { type: 'text', x: 220, y: 30, text: 'Feature Priority Matrix', fontSize: 24, strokeColor: '#1e1e1e' },
    { type: 'rectangle', x: 100, y: 100, width: 200, height: 150, backgroundColor: '#e8f5e9', text: 'DO FIRST' },
    { type: 'rectangle', x: 320, y: 100, width: 200, height: 150, backgroundColor: '#e3f2fd', text: 'SCHEDULE' },
    { type: 'rectangle', x: 100, y: 270, width: 200, height: 150, backgroundColor: '#fff3e0', text: 'DELEGATE' },
    { type: 'rectangle', x: 320, y: 270, width: 200, height: 150, backgroundColor: '#fce4ec', text: 'ELIMINATE' },
    { type: 'text', x: 50, y: 220, text: 'Impact →', fontSize: 14, strokeColor: '#666' },
    { type: 'text', x: 280, y: 440, text: 'Effort →', fontSize: 14, strokeColor: '#666' },
  ],
  'data-model': [
    { type: 'text', x: 280, y: 30, text: 'Data Model', fontSize: 24, strokeColor: '#1e1e1e' },
    { type: 'rectangle', x: 250, y: 80, width: 180, height: 80, backgroundColor: '#e3f2fd', text: 'User' },
    { type: 'rectangle', x: 100, y: 220, width: 150, height: 70, backgroundColor: '#e8f5e9', text: 'Project' },
    { type: 'rectangle', x: 280, y: 220, width: 150, height: 70, backgroundColor: '#e8f5e9', text: 'Task' },
    { type: 'rectangle', x: 460, y: 220, width: 150, height: 70, backgroundColor: '#f3e5f5', text: 'Comment' },
    { type: 'arrow', x: 290, y: 160, points: [[0, 0], [-60, 60]] },
    { type: 'arrow', x: 340, y: 160, points: [[0, 0], [0, 60]] },
    { type: 'arrow', x: 390, y: 160, points: [[0, 0], [80, 60]] },
  ],
  'release-timeline': [
    { type: 'text', x: 280, y: 30, text: 'Release Roadmap', fontSize: 24, strokeColor: '#1e1e1e' },
    { type: 'arrow', x: 100, y: 100, points: [[0, 0], [550, 0]] },
    { type: 'text', x: 120, y: 70, text: 'Q1', fontSize: 16, strokeColor: '#1e1e1e' },
    { type: 'text', x: 270, y: 70, text: 'Q2', fontSize: 16, strokeColor: '#1e1e1e' },
    { type: 'text', x: 420, y: 70, text: 'Q3', fontSize: 16, strokeColor: '#1e1e1e' },
    { type: 'text', x: 570, y: 70, text: 'Q4', fontSize: 16, strokeColor: '#1e1e1e' },
    { type: 'rectangle', x: 100, y: 130, width: 140, height: 50, backgroundColor: '#e8f5e9', text: 'Phase 1: MVP' },
    { type: 'rectangle', x: 260, y: 130, width: 140, height: 50, backgroundColor: '#e3f2fd', text: 'Phase 2: Beta' },
    { type: 'rectangle', x: 420, y: 130, width: 180, height: 50, backgroundColor: '#f3e5f5', text: 'Phase 3: Launch' },
  ],
  'default': [
    { type: 'text', x: 250, y: 30, text: 'Diagram', fontSize: 24, strokeColor: '#1e1e1e' },
    { type: 'rectangle', x: 100, y: 100, width: 180, height: 70, backgroundColor: '#e3f2fd', text: 'Component A' },
    { type: 'rectangle', x: 350, y: 100, width: 180, height: 70, backgroundColor: '#e8f5e9', text: 'Component B' },
    { type: 'rectangle', x: 225, y: 220, width: 180, height: 70, backgroundColor: '#f3e5f5', text: 'Component C' },
    { type: 'arrow', x: 280, y: 170, points: [[0, 0], [135, 50]] },
    { type: 'arrow', x: 350, y: 170, points: [[0, 0], [-60, 50]] },
  ],
};

// Helper to detect diagram type from prompt
function detectDiagramType(prompt: string): string {
  const lowerPrompt = prompt.toLowerCase();
  if (lowerPrompt.includes('information architecture') || lowerPrompt.includes('sitemap')) {
    return 'information-architecture';
  }
  if (lowerPrompt.includes('user flow')) {
    return 'user-flow';
  }
  if (lowerPrompt.includes('edge case') || lowerPrompt.includes('error state')) {
    return 'edge-cases';
  }
  if (lowerPrompt.includes('competitive') || lowerPrompt.includes('competitor')) {
    return 'competitive-analysis';
  }
  if (lowerPrompt.includes('data model') || lowerPrompt.includes('erd')) {
    return 'data-model';
  }
  if (lowerPrompt.includes('system architecture') || lowerPrompt.includes('technical architecture')) {
    return 'system-architecture';
  }
  if (lowerPrompt.includes('journey map')) {
    return 'journey-map';
  }
  if (lowerPrompt.includes('wireframe')) {
    return 'wireframe';
  }
  if (lowerPrompt.includes('feature priority') || lowerPrompt.includes('priority matrix')) {
    return 'feature-priority';
  }
  if (lowerPrompt.includes('stakeholder')) {
    return 'stakeholder-map';
  }
  if (lowerPrompt.includes('risk')) {
    return 'risk-matrix';
  }
  if (lowerPrompt.includes('sprint') || lowerPrompt.includes('planning board')) {
    return 'sprint-planning';
  }
  if (lowerPrompt.includes('api')) {
    return 'api-design';
  }
  if (lowerPrompt.includes('release') || lowerPrompt.includes('roadmap') || lowerPrompt.includes('timeline')) {
    return 'release-timeline';
  }
  if (lowerPrompt.includes('persona')) {
    return 'persona';
  }
  return 'default';
}

// Helper to check if this is a canvas generation request
function isCanvasRequest(context?: string): boolean {
  if (!context) return false;
  return context.includes('JSON arrays') ||
    context.includes('Excalidraw') ||
    context.includes('ELEMENT FORMAT') ||
    context.includes('diagram elements');
}

// Simulated responses for different AI actions
const mockResponses: Record<string, (prompt: string, context?: string) => string> = {
  'generate-canvas': (prompt) => {
    // Direct canvas generation handler
    const diagramType = detectDiagramType(prompt);
    const elements = mockCanvasDiagrams[diagramType] || mockCanvasDiagrams['default'];
    return JSON.stringify(elements, null, 2);
  },
  'generate-prd': (prompt, context) => {
    // Check if this is a canvas/diagram generation request (legacy compatibility)
    if (isCanvasRequest(context)) {
      const diagramType = detectDiagramType(prompt);
      const elements = mockCanvasDiagrams[diagramType] || mockCanvasDiagrams['default'];
      // Return as JSON array string
      return JSON.stringify(elements, null, 2);
    }
    // Regular PRD generation (Linear-style)
    return `# Product Requirements Document

## 📋 Overview
${prompt}

Building this feature to improve user experience and productivity.

## 🎯 Problem
Users currently face challenges with the existing workflow. This causes friction and reduces efficiency.

## 📍 Current Scenario
Today, users must manually perform these tasks which is time-consuming and error-prone.

## ⚖️ Considerations
- Technical: Integration with existing systems required
- Timeline: Target completion within current quarter
- Resources: Requires frontend and backend work

## 💭 Assumptions
- Users have basic technical proficiency (High confidence)
- Existing API infrastructure can support new features (Medium confidence)

## 📊 Diagrams
\`\`\`mermaid
flowchart TD
    A[User Request] --> B[Process]
    B --> C[Result]
\`\`\`

## ✨ Solution
### Approach
Implement a streamlined solution that addresses the core user needs.

### Requirements
#### Must Have
- Core functionality implementation
- Basic error handling

#### Should Have
- Enhanced user feedback
- Performance optimization

#### Won't Have (this version)
- Advanced analytics
- Third-party integrations

### Success Metrics
- User task completion rate > 90%
- Response time < 200ms`;
  },

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

  ask: (prompt, context) => {
    // Check if this is a structured JSON request based on the context
    if (context && context.includes('Always respond with valid JSON only')) {
      console.log('[MockAIProvider] Generating structured JSON response');
      console.log('[MockAIProvider] Prompt preview:', prompt.substring(0, 200));
      
      // Try to detect what type of JSON structure is expected
      if (prompt.includes('Add Descriptions') || prompt.includes('Sections Needing Descriptions')) {
        // Template section descriptions request
        console.log('[MockAIProvider] Detected: Description generation request');
        const sectionMatches = prompt.match(/- (.+?)(?=\n|$)/g) || [];
        const sections = sectionMatches.map(match => match.replace(/^- /, '').trim());
        
        console.log('[MockAIProvider] Extracted sections:', sections);
        
        // Generate clean descriptions without newlines
        const descriptions = sections.map(title => ({
          title,
          description: `Provide detailed information about ${title.toLowerCase()}, including key considerations, requirements, and implementation guidelines.`
        }));
        
        const response = {
          descriptions,
          reasoning: 'Generated descriptions based on section titles and template context.'
        };
        
        // Return compact JSON to avoid parsing issues
        const jsonString = JSON.stringify(response);
        console.log('[MockAIProvider] Generated JSON length:', jsonString.length);
        return jsonString;
      }
      
      if (prompt.includes('Generate') && prompt.includes('new, relevant sections')) {
        // New sections generation request
        console.log('[MockAIProvider] Detected: New sections generation request');
        const response = {
          sections: [
            {
              title: 'Security & Compliance',
              description: 'Document security requirements, data protection measures, and compliance considerations.'
            },
            {
              title: 'Performance Requirements',
              description: 'Define performance benchmarks, load capacity, and response time expectations.'
            },
            {
              title: 'Integration Points',
              description: 'Identify third-party integrations, APIs, and external system dependencies.'
            }
          ],
          reasoning: 'These sections complement the template by covering critical technical and operational aspects.'
        };
        
        return JSON.stringify(response);
      }
      
      if (prompt.includes('Rearrange') && prompt.includes('logical order')) {
        // Section rearrangement request - extract sections from prompt
        console.log('[MockAIProvider] Detected: Section rearrangement request');
        const sectionMatches = prompt.match(/\d+\.\s+(.+?)(?:\s+-\s+(.+?))?(?=\n|$)/g) || [];
        const sections = sectionMatches.map((match, idx) => {
          const titleMatch = match.match(/\d+\.\s+(.+?)(?:\s+-\s+(.+?))?$/);
          const title = titleMatch ? titleMatch[1].trim() : `Section ${idx + 1}`;
          const description = titleMatch && titleMatch[2] ? titleMatch[2].trim() : '';
          const id = title.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
          
          return {
            id,
            title,
            description,
            order: idx + 1
          };
        });
        
        const response = {
          sections,
          reasoning: 'Sections arranged in logical order following PRD best practices.'
        };
        
        console.log('[MockAIProvider] Generated sections:', sections.length);
        return JSON.stringify(response);
      }
      
      // Generic JSON response for other structured requests
      console.log('[MockAIProvider] Generating generic JSON response');
      const response = {
        result: 'success',
        data: prompt.substring(0, 100),
        message: 'This is a mock response for a structured JSON request.'
      };
      
      return JSON.stringify(response);
    }
    
    // Default text response for non-JSON requests
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

    console.log('[MockAIProvider] Request type:', request.type);
    console.log('[MockAIProvider] Available generators:', Object.keys(mockResponses));
    
    const hasGenerator = request.type in mockResponses;
    const generator = mockResponses[request.type] || mockResponses.ask;
    console.log('[MockAIProvider] Using generator:', hasGenerator ? `found for ${request.type}` : 'fallback to ask');
    
    const content = generator(request.prompt, request.context);
    console.log('[MockAIProvider] Generated content length:', content?.length || 0);
    console.log('[MockAIProvider] Content preview:', content?.substring(0, 200));

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

