/**
 * Bulk Creation Service
 * 
 * Handles the creation of features and tasks from AI-generated data.
 * Converts GeneratedFeature and GeneratedTask into the proper format
 * for the existing repositories.
 */

import { featureRequestsRepository } from '@/lib/db/repositories/feature-requests';
import { createTask } from '@/lib/db/repositories/tasks';
import type { 
  GeneratedFeature, 
  GeneratedTask, 
  FeatureRequest, 
  Task,
  TaskFormData,
  FeatureRequestStatus,
  FeatureRequestPriority,
  TaskStatus,
} from '@/types';
import { v4 as uuidv4 } from 'uuid';

// ============================================================================
// TYPES
// ============================================================================

export interface CreateFeatureOptions {
  /** The roadmap ID to create features in */
  roadmapId: string;
  /** Optional: Link to the source note/PRD */
  sourceNoteId?: string;
  /** Default status for new features */
  defaultStatus?: FeatureRequestStatus;
}

export interface CreateTaskOptions {
  /** Default status for new tasks */
  defaultStatus?: TaskStatus;
  /** Optional: Link to the source note/PRD */
  sourceNoteId?: string;
  /** Optional: Link to the parent feature */
  featureId?: string;
}

export interface BulkCreateResult<T> {
  success: boolean;
  created: T[];
  failed: { item: GeneratedFeature | GeneratedTask; error: string }[];
  totalCreated: number;
  totalFailed: number;
}

// ============================================================================
// FEATURE CREATION
// ============================================================================

/**
 * Convert a GeneratedFeature to FeatureRequest create data
 */
function generatedFeatureToCreateData(
  feature: GeneratedFeature,
  options: CreateFeatureOptions
): Omit<FeatureRequest, 'id' | 'createdAt' | 'updatedAt' | 'isDeleted' | 'activities' | 'attachments' | 'order'> {
  // Map priority
  const priorityMap: Record<string, FeatureRequestPriority> = {
    low: 'low',
    medium: 'medium',
    high: 'high',
    urgent: 'urgent',
  };

  // Build description with user stories and acceptance criteria
  let fullDescription = feature.description || '';
  
  if (feature.userStories && feature.userStories.length > 0) {
    fullDescription += '\n\n## User Stories\n';
    feature.userStories.forEach((story, i) => {
      fullDescription += `${i + 1}. ${story}\n`;
    });
  }

  // Build acceptance criteria as a structured list
  const acceptanceCriteria = feature.acceptanceCriteria || [];

  return {
    roadmapId: options.roadmapId,
    title: feature.title,
    description: fullDescription,
    status: options.defaultStatus || 'considering',
    priority: priorityMap[feature.priority] || 'medium',
    phase: feature.phase || 'Phase 1',
    estimatedEffort: feature.estimatedEffort,
    acceptanceCriteria,
    userStories: feature.userStories || [],
    dependencies: [], // Empty initially, can be populated later
    tags: [],
    assignees: [],
    // Additional fields for tracking AI generation
    problemStatement: `Generated from AI based on PRD content.`,
    proposedSolution: feature.description,
    // Creator info - will be set by the current user context
    createdBy: 'ai-generated',
    createdByName: 'AI Assistant',
    createdByAvatar: undefined,
  };
}

/**
 * Create a single feature from generated data
 */
export async function createFeatureFromGenerated(
  feature: GeneratedFeature,
  options: CreateFeatureOptions
): Promise<FeatureRequest> {
  const createData = generatedFeatureToCreateData(feature, options);
  return featureRequestsRepository.create(createData);
}

/**
 * Create multiple features from generated data
 */
export async function createFeaturesFromGenerated(
  features: GeneratedFeature[],
  options: CreateFeatureOptions
): Promise<BulkCreateResult<FeatureRequest>> {
  const result: BulkCreateResult<FeatureRequest> = {
    success: true,
    created: [],
    failed: [],
    totalCreated: 0,
    totalFailed: 0,
  };

  for (const feature of features) {
    try {
      const created = await createFeatureFromGenerated(feature, options);
      result.created.push(created);
      result.totalCreated++;
    } catch (error) {
      result.failed.push({
        item: feature,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      result.totalFailed++;
      result.success = false;
    }
  }

  return result;
}

// ============================================================================
// TASK CREATION
// ============================================================================

/**
 * Convert a GeneratedTask to TaskFormData
 */
function generatedTaskToFormData(
  task: GeneratedTask,
  options: CreateTaskOptions
): TaskFormData {
  // Map priority to labels
  const priorityLabel = `priority:${task.priority}`;
  const roleLabel = `role:${task.role}`;
  
  // Build description with dependencies
  let fullDescription = task.description || '';
  
  if (task.dependencies && task.dependencies.length > 0) {
    fullDescription += '\n\n**Dependencies:**\n';
    task.dependencies.forEach((dep) => {
      fullDescription += `- ${dep}\n`;
    });
  }

  // Add estimated hours to description
  if (task.estimatedHours) {
    fullDescription += `\n\n**Estimated Hours:** ${task.estimatedHours}h`;
  }

  return {
    title: task.title,
    description: fullDescription,
    status: options.defaultStatus || 'planned',
    dueDate: null,
    labels: [priorityLabel, roleLabel],
    assignees: [],
    checklists: [],
  };
}

/**
 * Create a single task from generated data
 */
export async function createTaskFromGenerated(
  task: GeneratedTask,
  options: CreateTaskOptions = {}
): Promise<Task> {
  const formData = generatedTaskToFormData(task, options);
  return createTask(formData);
}

/**
 * Create multiple tasks from generated data
 */
export async function createTasksFromGenerated(
  tasks: GeneratedTask[],
  options: CreateTaskOptions = {}
): Promise<BulkCreateResult<Task>> {
  const result: BulkCreateResult<Task> = {
    success: true,
    created: [],
    failed: [],
    totalCreated: 0,
    totalFailed: 0,
  };

  for (const task of tasks) {
    try {
      const created = await createTaskFromGenerated(task, options);
      result.created.push(created);
      result.totalCreated++;
    } catch (error) {
      result.failed.push({
        item: task,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      result.totalFailed++;
      result.success = false;
    }
  }

  return result;
}

// ============================================================================
// COMBINED OPERATIONS
// ============================================================================

/**
 * Create features and their associated tasks together
 */
export async function createFeaturesWithTasks(
  features: GeneratedFeature[],
  tasksByFeature: Map<string, GeneratedTask[]>,
  featureOptions: CreateFeatureOptions,
  taskOptions: CreateTaskOptions = {}
): Promise<{
  features: BulkCreateResult<FeatureRequest>;
  tasks: BulkCreateResult<Task>;
  featureToTaskMap: Map<string, string[]>;
}> {
  const featureToTaskMap = new Map<string, string[]>();
  
  // First create all features
  const featuresResult = await createFeaturesFromGenerated(features, featureOptions);
  
  // Then create tasks for each feature
  const allTasks: GeneratedTask[] = [];
  const taskToFeatureId: Map<string, string> = new Map();
  
  for (const createdFeature of featuresResult.created) {
    // Find the original generated feature by title match
    const originalFeature = features.find(f => f.title === createdFeature.title);
    if (originalFeature) {
      const tasksForFeature = tasksByFeature.get(originalFeature.id) || [];
      tasksForFeature.forEach(task => {
        allTasks.push(task);
        taskToFeatureId.set(task.id, createdFeature.id);
      });
      featureToTaskMap.set(createdFeature.id, []);
    }
  }
  
  // Create all tasks
  const tasksResult: BulkCreateResult<Task> = {
    success: true,
    created: [],
    failed: [],
    totalCreated: 0,
    totalFailed: 0,
  };
  
  for (const task of allTasks) {
    try {
      const featureId = taskToFeatureId.get(task.id);
      const created = await createTaskFromGenerated(task, {
        ...taskOptions,
        featureId,
      });
      tasksResult.created.push(created);
      tasksResult.totalCreated++;
      
      // Track mapping
      if (featureId) {
        const existing = featureToTaskMap.get(featureId) || [];
        existing.push(created.id);
        featureToTaskMap.set(featureId, existing);
      }
    } catch (error) {
      tasksResult.failed.push({
        item: task,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
      tasksResult.totalFailed++;
      tasksResult.success = false;
    }
  }
  
  return {
    features: featuresResult,
    tasks: tasksResult,
    featureToTaskMap,
  };
}

// ============================================================================
// EXPORTS
// ============================================================================

export const bulkCreationService = {
  createFeatureFromGenerated,
  createFeaturesFromGenerated,
  createTaskFromGenerated,
  createTasksFromGenerated,
  createFeaturesWithTasks,
};

export default bulkCreationService;
