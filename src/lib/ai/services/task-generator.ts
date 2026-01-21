/**
 * Task Generator Service
 * 
 * Generates actionable development tasks from features and PRD content.
 * Creates structured task data that can be directly used to create tasks.
 */

import type { AIGenerateRequest, GeneratedFeature, GeneratedTask } from '@/types';
import { generateAIContent } from '../use-ai-service';
import { MASTER_PRD_SYSTEM_PROMPT, TASK_GENERATION_PROMPT } from '../prompts';
import type { AIProviderType } from '@/lib/stores/ai-settings-store';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TYPES
// ============================================================================

export interface TaskGenerationOptions {
  /** Feature to generate tasks for */
  feature: GeneratedFeature;
  /** PRD content for additional context */
  prdContent?: string;
  /** Maximum number of tasks to generate */
  maxTasks?: number;
  /** Team size/structure context */
  teamContext?: string;
  /** Technical stack context */
  techStack?: string;
  /** AI provider to use */
  provider?: AIProviderType;
}

export interface BulkTaskGenerationOptions {
  /** Features to generate tasks for */
  features: GeneratedFeature[];
  /** PRD content for context */
  prdContent?: string;
  /** Maximum tasks per feature */
  maxTasksPerFeature?: number;
  /** Technical stack context */
  techStack?: string;
  /** AI provider to use */
  provider?: AIProviderType;
}

export interface TaskBreakdownOptions {
  /** Task to break down */
  task: GeneratedTask;
  /** Target number of sub-tasks */
  targetCount?: number;
  /** Additional context */
  context?: string;
  /** AI provider to use */
  provider?: AIProviderType;
}

export interface TaskEstimationOptions {
  /** Task to estimate */
  task: Partial<GeneratedTask>;
  /** Similar completed tasks for reference */
  similarTasks?: { title: string; actualHours: number }[];
  /** Team velocity context */
  teamContext?: string;
  /** AI provider to use */
  provider?: AIProviderType;
}

// ============================================================================
// TASK GENERATOR SERVICE
// ============================================================================

export class TaskGeneratorService {
  /**
   * Generate tasks for a single feature
   */
  async generateForFeature(options: TaskGenerationOptions): Promise<GeneratedTask[]> {
    const {
      feature,
      prdContent,
      maxTasks = 15,
      teamContext,
      techStack,
      provider,
    } = options;

    let prompt = TASK_GENERATION_PROMPT + '\n\n';

    prompt += `## Feature to Break Down\n`;
    prompt += `**Title:** ${feature.title}\n`;
    prompt += `**Description:** ${feature.description}\n`;
    prompt += `**Priority:** ${feature.priority}\n`;
    prompt += `**Phase:** ${feature.phase}\n`;
    prompt += `**Estimated Effort:** ${feature.estimatedEffort}\n\n`;

    if (feature.acceptanceCriteria?.length) {
      prompt += `**Acceptance Criteria:**\n`;
      feature.acceptanceCriteria.forEach((c, i) => {
        prompt += `${i + 1}. ${c}\n`;
      });
      prompt += `\n`;
    }

    if (feature.userStories?.length) {
      prompt += `**User Stories:**\n`;
      feature.userStories.forEach((s, i) => {
        prompt += `${i + 1}. ${s}\n`;
      });
      prompt += `\n`;
    }

    if (prdContent) {
      prompt += `## PRD Context (excerpt)\n${prdContent.substring(0, 2500)}...\n\n`;
    }

    if (techStack) {
      prompt += `## Technical Stack\n${techStack}\n\n`;
    }

    if (teamContext) {
      prompt += `## Team Context\n${teamContext}\n\n`;
    }

    prompt += `## Requirements\n`;
    prompt += `- Generate ${maxTasks} or fewer tasks\n`;
    prompt += `- Include tasks for all disciplines (Design, Frontend, Backend, QA, DevOps)\n`;
    prompt += `- Ensure tasks cover all acceptance criteria\n`;
    prompt += `- Order tasks by dependencies\n`;
    prompt += `- Keep individual tasks to 1-8 hours when possible\n\n`;

    prompt += `Generate the tasks now (return ONLY the JSON array):`;

    const request: AIGenerateRequest = {
      type: 'generate-tasks',
      prompt,
      context: MASTER_PRD_SYSTEM_PROMPT,
      provider,
    };

    try {
      const response = await generateAIContent(request, provider);
      const tasks = this.parseTasks(response.content);
      
      return tasks.map(task => ({
        ...task,
        id: uuidv4(),
        featureId: feature.id,
        isSelected: true,
      }));
    } catch (error) {
      console.error('Task generation failed:', error);
      throw error;
    }
  }

  /**
   * Generate tasks for multiple features
   */
  async generateForMultipleFeatures(options: BulkTaskGenerationOptions): Promise<Map<string, GeneratedTask[]>> {
    const {
      features,
      prdContent,
      maxTasksPerFeature = 10,
      techStack,
      provider,
    } = options;

    const results = new Map<string, GeneratedTask[]>();

    // Process features in parallel, but limit concurrency
    const concurrencyLimit = 3;
    const chunks = this.chunkArray(features, concurrencyLimit);

    for (const chunk of chunks) {
      const promises = chunk.map(feature =>
        this.generateForFeature({
          feature,
          prdContent,
          maxTasks: maxTasksPerFeature,
          techStack,
          provider,
        }).then(tasks => ({ featureId: feature.id, tasks }))
      );

      const chunkResults = await Promise.all(promises);
      
      for (const { featureId, tasks } of chunkResults) {
        results.set(featureId, tasks);
      }
    }

    return results;
  }

  /**
   * Break down a task into smaller sub-tasks
   */
  async breakdownTask(options: TaskBreakdownOptions): Promise<GeneratedTask[]> {
    const {
      task,
      targetCount = 3,
      context,
      provider,
    } = options;

    let prompt = `You are breaking down a development task into smaller, more manageable sub-tasks.\n\n`;

    prompt += `## Task to Break Down\n`;
    prompt += `**Title:** ${task.title}\n`;
    prompt += `**Description:** ${task.description}\n`;
    prompt += `**Role:** ${task.role}\n`;
    prompt += `**Estimated Hours:** ${task.estimatedHours}\n`;
    prompt += `**Priority:** ${task.priority}\n\n`;

    if (context) {
      prompt += `## Additional Context\n${context}\n\n`;
    }

    prompt += `## Requirements\n`;
    prompt += `- Break this into ${targetCount} smaller tasks\n`;
    prompt += `- Each sub-task should be 1-4 hours\n`;
    prompt += `- Maintain the same role assignment\n`;
    prompt += `- Include clear dependencies between sub-tasks\n`;
    prompt += `- Add "[Part X]" suffix to titles\n\n`;

    prompt += `Return a JSON array of ${targetCount} tasks. ONLY return the JSON array.`;

    const request: AIGenerateRequest = {
      type: 'generate-tasks',
      prompt,
      context: MASTER_PRD_SYSTEM_PROMPT,
      provider,
    };

    try {
      const response = await generateAIContent(request, provider);
      const subTasks = this.parseTasks(response.content);
      
      return subTasks.map(t => ({
        ...t,
        id: uuidv4(),
        featureId: task.featureId,
        isSelected: true,
      }));
    } catch (error) {
      console.error('Task breakdown failed:', error);
      throw error;
    }
  }

  /**
   * Estimate hours for a task
   */
  async estimateTask(options: TaskEstimationOptions): Promise<number> {
    const {
      task,
      similarTasks,
      teamContext,
      provider,
    } = options;

    let prompt = `Estimate the hours needed to complete this development task.\n\n`;

    prompt += `## Task\n`;
    prompt += `**Title:** ${task.title}\n`;
    prompt += `**Description:** ${task.description || 'No description provided'}\n`;
    prompt += `**Role:** ${task.role || 'Full Stack'}\n\n`;

    if (similarTasks && similarTasks.length > 0) {
      prompt += `## Reference: Similar Completed Tasks\n`;
      similarTasks.forEach(t => {
        prompt += `- "${t.title}": ${t.actualHours} hours\n`;
      });
      prompt += `\n`;
    }

    if (teamContext) {
      prompt += `## Team Context\n${teamContext}\n\n`;
    }

    prompt += `## Guidelines\n`;
    prompt += `- Consider setup, implementation, testing, and code review time\n`;
    prompt += `- Add buffer for unknowns and debugging\n`;
    prompt += `- Be realistic, not optimistic\n\n`;

    prompt += `Return ONLY a single number representing the estimated hours (e.g., "6" or "12"):`;

    const request: AIGenerateRequest = {
      type: 'generate-tasks',
      prompt,
      provider,
    };

    try {
      const response = await generateAIContent(request, provider);
      const hours = parseFloat(response.content.trim());
      
      if (!isNaN(hours) && hours > 0) {
        return Math.round(hours * 2) / 2; // Round to nearest 0.5
      }
      return 4; // Default estimate
    } catch {
      return 4;
    }
  }

  /**
   * Suggest dependencies for a task based on other tasks
   */
  async suggestDependencies(
    task: GeneratedTask,
    allTasks: GeneratedTask[],
    provider?: AIProviderType
  ): Promise<string[]> {
    const otherTasks = allTasks.filter(t => t.id !== task.id);
    
    if (otherTasks.length === 0) return [];

    let prompt = `Analyze this task and identify which other tasks it depends on (must be completed first).\n\n`;

    prompt += `## Task to Analyze\n`;
    prompt += `**Title:** ${task.title}\n`;
    prompt += `**Description:** ${task.description}\n`;
    prompt += `**Role:** ${task.role}\n\n`;

    prompt += `## Available Tasks\n`;
    otherTasks.forEach((t, i) => {
      prompt += `${i + 1}. "${t.title}" (${t.role}): ${t.description}\n`;
    });
    prompt += `\n`;

    prompt += `Return ONLY a JSON array of task titles that this task depends on. `;
    prompt += `If no dependencies, return an empty array [].`;

    const request: AIGenerateRequest = {
      type: 'generate-tasks',
      prompt,
      provider,
    };

    try {
      const response = await generateAIContent(request, provider);
      const deps = JSON.parse(response.content);
      
      if (Array.isArray(deps)) {
        return deps.map(String);
      }
      return [];
    } catch {
      return [];
    }
  }

  /**
   * Generate tasks from a description (quick mode)
   */
  async quickGenerate(description: string, provider?: AIProviderType): Promise<GeneratedTask[]> {
    const prompt = `Based on this work description, generate a list of development tasks:

"${description}"

Generate 5-10 actionable tasks that cover all aspects of this work.
Include tasks for different roles (Design, Frontend, Backend, QA).

${TASK_GENERATION_PROMPT}

Return ONLY the JSON array of tasks.`;

    const request: AIGenerateRequest = {
      type: 'generate-tasks',
      prompt,
      context: MASTER_PRD_SYSTEM_PROMPT,
      provider,
    };

    try {
      const response = await generateAIContent(request, provider);
      const tasks = this.parseTasks(response.content);
      
      return tasks.map(task => ({
        ...task,
        id: uuidv4(),
        isSelected: true,
      }));
    } catch (error) {
      console.error('Quick task generation failed:', error);
      throw error;
    }
  }

  /**
   * Calculate total hours for a set of tasks
   */
  calculateTotalHours(tasks: GeneratedTask[]): {
    total: number;
    byRole: Record<string, number>;
    byPriority: Record<string, number>;
  } {
    const total = tasks.reduce((sum, t) => sum + t.estimatedHours, 0);
    
    const byRole: Record<string, number> = {};
    const byPriority: Record<string, number> = {};

    tasks.forEach(task => {
      byRole[task.role] = (byRole[task.role] || 0) + task.estimatedHours;
      byPriority[task.priority] = (byPriority[task.priority] || 0) + task.estimatedHours;
    });

    return { total, byRole, byPriority };
  }

  /**
   * Order tasks by dependencies (topological sort)
   */
  orderByDependencies(tasks: GeneratedTask[]): GeneratedTask[] {
    const taskMap = new Map(tasks.map(t => [t.title, t]));
    const visited = new Set<string>();
    const result: GeneratedTask[] = [];

    const visit = (task: GeneratedTask) => {
      if (visited.has(task.id)) return;
      visited.add(task.id);

      // Visit dependencies first
      task.dependencies.forEach(depTitle => {
        const depTask = taskMap.get(depTitle);
        if (depTask) {
          visit(depTask);
        }
      });

      result.push(task);
    };

    tasks.forEach(task => visit(task));
    
    return result;
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private parseTasks(content: string): Omit<GeneratedTask, 'id' | 'featureId' | 'isSelected'>[] {
    try {
      // Handle empty or whitespace-only content
      if (!content || !content.trim()) {
        console.warn('Empty content received for task parsing');
        return [];
      }

      let jsonContent = content.trim();
      
      // Remove markdown code fences if present (non-greedy match)
      const jsonMatch = jsonContent.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        jsonContent = jsonMatch[1].trim();
      }

      // Try to find JSON array in the content - use balanced bracket matching
      const arrayStart = jsonContent.indexOf('[');
      if (arrayStart !== -1) {
        // Find the matching closing bracket
        let depth = 0;
        let arrayEnd = -1;
        for (let i = arrayStart; i < jsonContent.length; i++) {
          if (jsonContent[i] === '[') depth++;
          if (jsonContent[i] === ']') {
            depth--;
            if (depth === 0) {
              arrayEnd = i;
              break;
            }
          }
        }
        
        if (arrayEnd !== -1) {
          jsonContent = jsonContent.substring(arrayStart, arrayEnd + 1);
        }
      }

      // Handle case where content might be a JSON object with a tasks array
      if (jsonContent.startsWith('{')) {
        try {
          const obj = JSON.parse(jsonContent);
          if (obj.tasks && Array.isArray(obj.tasks)) {
            jsonContent = JSON.stringify(obj.tasks);
          }
        } catch {
          // Not a valid object, continue with original content
        }
      }

      const parsed = JSON.parse(jsonContent);
      
      if (Array.isArray(parsed)) {
        // Filter out null/undefined items and normalize each task
        return parsed
          .filter(item => item != null && typeof item === 'object')
          .map(item => this.normalizeTask(item));
      }
      
      if (typeof parsed === 'object' && parsed !== null) {
        return [this.normalizeTask(parsed)];
      }

      return [];
    } catch (error) {
      console.error('Failed to parse tasks:', error);
      console.error('Content was:', content);
      return [];
    }
  }

  private normalizeTask(data: unknown): Omit<GeneratedTask, 'id' | 'featureId' | 'isSelected'> {
    // Handle null/undefined/non-object data
    if (!data || typeof data !== 'object') {
      return {
        title: 'Untitled Task',
        description: '',
        priority: 'medium',
        estimatedHours: 4,
        role: 'Full Stack',
        dependencies: [],
      };
    }

    const taskData = data as Record<string, unknown>;
    
    return {
      title: String(taskData.title || 'Untitled Task'),
      description: String(taskData.description || ''),
      priority: this.normalizePriority(taskData.priority),
      estimatedHours: this.normalizeHours(taskData.estimatedHours || taskData.estimated_hours || taskData.hours),
      role: this.normalizeRole(taskData.role),
      dependencies: this.normalizeStringArray(taskData.dependencies),
    };
  }

  private normalizePriority(priority: unknown): 'low' | 'medium' | 'high' {
    const p = String(priority).toLowerCase();
    if (['low', 'medium', 'high'].includes(p)) {
      return p as 'low' | 'medium' | 'high';
    }
    return 'medium';
  }

  private normalizeHours(hours: unknown): number {
    const h = Number(hours);
    if (!isNaN(h) && h > 0) {
      return Math.min(h, 100); // Cap at 100 hours
    }
    return 4; // Default estimate
  }

  private normalizeRole(role: unknown): string {
    const validRoles = ['Frontend', 'Backend', 'Design', 'QA', 'DevOps', 'Product', 'Full Stack'];
    const r = String(role);
    
    // Try to match to a valid role
    const matched = validRoles.find(vr => 
      vr.toLowerCase() === r.toLowerCase() ||
      r.toLowerCase().includes(vr.toLowerCase())
    );
    
    return matched || 'Full Stack';
  }

  private normalizeStringArray(data: unknown): string[] {
    if (Array.isArray(data)) {
      return data.map(item => String(item));
    }
    if (typeof data === 'string' && data.length > 0) {
      return [data];
    }
    return [];
  }

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }
}

// Export singleton instance
export const taskGenerator = new TaskGeneratorService();

export default taskGenerator;
