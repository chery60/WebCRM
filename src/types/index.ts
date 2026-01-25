// Database types - designed for Supabase migration

export interface Note {
  id: string;
  title: string;
  content: string; // JSON (TipTap format)
  tags: string[];
  projectId?: string; // Optional project ID for organizing notes
  authorId: string;
  authorName: string;
  authorAvatar?: string;
  generatedFeatures?: GeneratedFeature[]; // AI-generated features stored with the note
  generatedTasks?: GeneratedTask[]; // AI-generated tasks stored with the note
  canvasData?: string; // JSON string of Excalidraw canvas data
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

// Project type for organizing notes (like Figma projects)
export interface Project {
  id: string;
  name: string;
  description?: string;
  instructions?: string; // Default AI instructions for generating PRDs in this project
  icon?: string; // Emoji or icon identifier
  color?: string; // Color for the project
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

// ============================================
// Pipeline & Roadmap Types (like ClickUp Spaces)
// ============================================

// Pipeline (like ClickUp Spaces) - top-level container
export interface Pipeline {
  id: string;
  name: string;
  description?: string;
  icon?: string;
  color?: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

// Roadmap (list within a Pipeline)
export interface Roadmap {
  id: string;
  pipelineId: string;
  name: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

// Feature Request Status
export type FeatureRequestStatus =
  | 'backlog'
  | 'considering'
  | 'in_scoping'
  | 'designing'
  | 'ready_for_dev'
  | 'under_development'
  | 'in_review'
  | 'live_on_production';

// Feature Request Priority
export type FeatureRequestPriority = 'low' | 'medium' | 'high' | 'urgent';

// Feature Request Business Value
export type BusinessValue = 'low' | 'medium' | 'high' | 'critical';

// Feature Activity (comments and history)
export interface FeatureActivity {
  id: string;
  type: 'comment' | 'status_change' | 'assignment' | 'edit';
  content: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  attachments?: FeatureAttachment[];
  createdAt: Date;
}

// Feature Attachment
export interface FeatureAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string; // base64 encoded
  uploadedBy: string;
  uploadedAt: Date;
}

// Feature Request (items in a Roadmap)
export interface FeatureRequest {
  id: string;
  roadmapId: string;
  title: string;
  description?: string; // Rich text content
  status: FeatureRequestStatus;
  priority: FeatureRequestPriority;
  phase?: string; // e.g., "Phase 1", "Phase 2", "Future"

  // Assignees
  assignees: string[];

  // Tags/Labels
  tags: string[];

  // Dates
  dueDate?: Date;
  startDate?: Date;

  // Feature Understanding Fields
  problemStatement?: string; // What problem does this solve?
  proposedSolution?: string; // How will we solve it?
  acceptanceCriteria: string[]; // List of requirements/criteria
  userStories: string[]; // As a [user], I want [feature] so that [benefit]
  technicalNotes?: string; // Implementation details
  dependencies: string[]; // IDs of dependent features or text descriptions
  estimatedEffort?: string; // e.g., "2 weeks", "1 sprint", "3 story points"
  businessValue?: BusinessValue; // Why is this important?

  // Activity & Attachments
  activities: FeatureActivity[];
  attachments: FeatureAttachment[];

  // Ordering for drag-drop
  order: number;

  // Metadata
  createdBy: string;
  createdByName: string;
  createdByAvatar?: string;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

// Helper constants for feature request statuses
export const FEATURE_REQUEST_STATUSES: { value: FeatureRequestStatus; label: string; color: string }[] = [
  { value: 'backlog', label: 'Backlog', color: 'bg-gray-500' },
  { value: 'considering', label: 'Considering', color: 'bg-yellow-500' },
  { value: 'in_scoping', label: 'In Scoping', color: 'bg-blue-400' },
  { value: 'designing', label: 'Designing', color: 'bg-purple-500' },
  { value: 'ready_for_dev', label: 'Ready for Dev', color: 'bg-cyan-500' },
  { value: 'under_development', label: 'Under Development', color: 'bg-orange-500' },
  { value: 'in_review', label: 'In Review', color: 'bg-pink-500' },
  { value: 'live_on_production', label: 'Live on Production', color: 'bg-green-500' },
];

// Helper constants for priorities
export const FEATURE_REQUEST_PRIORITIES: { value: FeatureRequestPriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-gray-400' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-400' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
];

// Helper constants for business value
export const BUSINESS_VALUES: { value: BusinessValue; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-gray-400' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-400' },
  { value: 'high', label: 'High', color: 'bg-purple-500' },
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
];

// Filter and sort types for Feature Requests
export type FeatureRequestSortField = 'createdAt' | 'updatedAt' | 'title' | 'priority' | 'status' | 'dueDate' | 'order';

export interface FeatureRequestFilter {
  status?: FeatureRequestStatus[];
  priority?: FeatureRequestPriority[];
  phase?: string[];
  assignees?: string[];
  tags?: string[];
  search?: string;
}

export interface FeatureRequestSort {
  field: FeatureRequestSortField;
  direction: SortDirection;
}

export interface Tag {
  id: string;
  name: string;
  color: TagColor;
  category: 'frequency' | 'type' | 'custom';
}

export type TagColor =
  | 'weekly'
  | 'monthly'
  | 'product'
  | 'business'
  | 'personal'
  | 'badge';

export interface User {
  id: string;
  name: string;
  email: string;
  password?: string; // Optional for backward compatibility, stored as plain text for demo purposes
  avatar?: string;
  role: 'admin' | 'member' | 'viewer';
  phone?: string;
  department?: string;
  location?: string;
  gender?: string;
  resetToken?: string; // Token for password reset
  resetTokenExpiry?: Date; // Expiry time for reset token
}

// Employee Status
export type EmployeeStatus = 'active' | 'inactive' | 'pending';

// Employee Category/Type
export type EmployeeCategory = 'Employee' | 'Customers' | 'Partners';

// Extended Employee interface for the Employees module
export interface Employee {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role: 'admin' | 'member' | 'viewer';
  status: EmployeeStatus;
  category: EmployeeCategory;

  // Account Information
  employeeId: string; // e.g., "US219410"
  department?: string;
  isActive: boolean; // Can the employee log in to the system?

  // Contact Information
  phone?: string;
  phoneCountryCode?: string;

  // Personal Information
  birthDate?: Date;
  gender?: 'Male' | 'Female' | 'Other';
  occupation?: string;
  personalId?: string; // Passport/ID number

  // Location Information
  country?: string;
  city?: string;
  address?: string;

  // Invitation tracking
  invitationToken?: string;
  invitedAt?: Date;
  invitedBy?: string;
  passwordCreated?: boolean;
  passwordCreatedAt?: Date;

  // Activity tracking
  lastActivityAt?: Date;
  deactivatedAt?: Date;
  deactivatedBy?: string;

  // Timestamps
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

// Helper to get full name
export function getEmployeeFullName(employee: Employee): string {
  return `${employee.firstName} ${employee.lastName}`.trim();
}

// Department type for filtering
export type Department = 'Design' | 'Product' | 'Sales' | 'Engineering' | 'Marketing' | 'HR';

// Employee form data for create/edit
export interface EmployeeFormData {
  firstName: string;
  lastName: string;
  email: string;
  avatar?: string;
  role?: 'admin' | 'member' | 'viewer'; // Access Level
  department?: string;
  phone?: string;
  phoneCountryCode?: string;
  personalId?: string;
  birthDate?: Date;
  occupation?: string;
  gender?: 'Male' | 'Female' | 'Other';
  country?: string;
  city?: string;
  address?: string;
  category?: EmployeeCategory;
}

// Workspace types for multi-org support
export interface Workspace {
  id: string;
  name: string;
  icon?: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  ownerId: string; // User who created the workspace
  isDeleted: boolean;
}

export interface WorkspaceMembership {
  id: string;
  workspaceId: string;
  userId: string; // References User id
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: Date;
  invitedBy?: string;
  status: 'active' | 'invited' | 'suspended';
}

export interface WorkspaceInvitation {
  id: string;
  workspaceId: string;
  email: string;
  token: string; // Unique invitation token
  invitedBy: string;
  role: 'admin' | 'member' | 'viewer'; // Role to be assigned on acceptance
  expiresAt: Date;
  status: 'pending' | 'accepted' | 'expired' | 'cancelled';
  createdAt: Date;
}


// Form types
export interface NoteFormData {
  title: string;
  content: string;
  tags: string[];
  projectId?: string;
  generatedFeatures?: GeneratedFeature[];
  generatedTasks?: GeneratedTask[];
  canvasData?: string; // JSON string of Excalidraw canvas data
}

// Filter and sort types
export type NoteSortField = 'createdAt' | 'updatedAt' | 'title';
export type SortDirection = 'asc' | 'desc';

export interface NotesFilter {
  tags?: string[];
  search?: string;
  authorId?: string;
  projectId?: string; // Filter notes by project
  /** When true, returns all PRDs regardless of project assignment (for sidebar) */
  includeAllProjects?: boolean;
}

export interface NotesSort {
  field: NoteSortField;
  direction: SortDirection;
}

// AI types
export interface AICommand {
  id: string;
  name: string;
  description: string;
  category: 'ai-generate' | 'ai-action' | 'format' | 'widget';
  icon: string;
  action: (editor: unknown, selectedText?: string) => Promise<void> | void;
}

// AI Provider Types
export type AIProviderType = 'openai' | 'anthropic' | 'gemini';

export type AIGenerationType =
  | 'summarize'
  | 'expand'
  | 'rewrite'
  | 'translate'
  | 'continue'
  | 'grammar'
  | 'professional'
  | 'ask'
  | 'generate-prd'
  | 'generate-prd-section'
  | 'improve-prd'
  | 'generate-features'
  | 'generate-tasks'
  | 'generate-canvas';

export interface AIGenerateRequest {
  prompt: string;
  context?: string;
  type: AIGenerationType;
  options?: Record<string, unknown>;
  provider?: AIProviderType;
  model?: string;
}

export interface AIGenerateResponse {
  content: string;
  tokens?: number;
  provider?: string;
  model?: string;
}

// PRD Related Types
export type PRDTemplateType = 'b2b-saas' | 'consumer-app' | 'platform' | 'api-product' | 'internal-tool' | 'custom';

export interface PRDSection {
  id: string;
  title: string;
  content: string;
  order: number;
  isGenerated: boolean;
}

export interface PRDTemplate {
  id: PRDTemplateType;
  name: string;
  description: string;
  sections: Omit<PRDSection, 'content' | 'isGenerated'>[];
}

export interface GeneratedFeature {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  phase: string;
  estimatedEffort: string;
  acceptanceCriteria: string[];
  userStories: string[];
  isSelected: boolean;
}

export interface GeneratedTask {
  id: string;
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high';
  estimatedHours: number;
  role: string;
  featureId?: string;
  dependencies: string[];
  isSelected: boolean;
}

export interface PRDGenerationResult {
  content: string;
  sections: PRDSection[];
  suggestedFeatures?: GeneratedFeature[];
  suggestedTasks?: GeneratedTask[];
}

// Task types
export type TaskStatus = 'planned' | 'upcoming' | 'completed';
export type TaskPriority = 'low' | 'medium' | 'high';

export interface TaskChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface TaskChecklist {
  id: string;
  name: string;
  items: TaskChecklistItem[];
}

export interface TaskAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string; // base64 encoded
  uploadedBy: string;
  uploadedAt: Date;
}

export interface TaskActivity {
  id: string;
  type: 'comment' | 'change' | 'mention';
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: Date;
  attachments?: TaskAttachment[]; // Attachments specific to this comment/activity
  metadata?: Record<string, unknown>;
}

export interface Task {
  id: string;
  title: string;
  description: string;
  status: TaskStatus;
  order: number;
  dueDate: Date | null;
  labels: string[];
  assignees: string[]; // User IDs
  projectId?: string; // Optional project/tab ID for grouping tasks
  checklists: TaskChecklist[];
  attachments: TaskAttachment[];
  activities: TaskActivity[];
  subtaskProgress?: { completed: number; total: number };
  commentCount?: number;
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface TaskFormData {
  title: string;
  description: string;
  status: TaskStatus;
  dueDate: Date | null;
  labels: string[];
  assignees: string[];
  projectId?: string; // Optional project/tab ID for grouping tasks
  checklists: TaskChecklist[];
}

export type TaskSortField = 'createdAt' | 'updatedAt' | 'dueDate' | 'title';

export interface TasksFilter {
  status?: TaskStatus[];
  labels?: string[];
  assignees?: string[];
  projectId?: string; // Filter by project/tab
  search?: string;
}

export interface TasksSort {
  field: TaskSortField;
  direction: SortDirection;
}

// Task Tab/Project for grouping tasks
export interface TaskTab {
  id: string;
  name: string;
  color?: string;
  icon?: string;
  order: number;
  createdAt: Date;
  updatedAt: Date;
}

// Calendar Event types
export type EventRepeat = 'none' | 'daily' | 'weekly' | 'monthly' | 'yearly';
export type EventColor = 'yellow' | 'green' | 'pink' | 'purple' | 'blue';
export type EventSource = 'local' | 'google' | 'outlook' | 'apple' | 'notion';

// Calendar Account for sync
export type CalendarProvider = 'google' | 'outlook' | 'apple' | 'notion';

export interface CalendarAccount {
  id: string;
  provider: CalendarProvider;
  email: string;
  name: string; // Display name for the calendar
  color: EventColor; // Default color for events from this calendar
  isConnected: boolean;
  isVisible: boolean; // Show/hide events from this calendar
  lastSyncedAt: Date | null;
  accessToken?: string; // Mock token for demo
  refreshToken?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface EventAttachment {
  id: string;
  name: string;
  size: number;
  type: string;
  data: string; // base64 encoded
  uploadedAt: Date;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  repeat: EventRepeat;
  color: EventColor;
  guests: string[]; // User IDs or email addresses
  notifyBefore: number | null; // Minutes before event to notify
  location: string | null;
  attachments: EventAttachment[];
  source: EventSource; // For future third-party sync
  externalId?: string; // ID from external calendar (Google, Notion, etc.)
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

export interface EventFormData {
  title: string;
  startTime: Date;
  endTime: Date;
  isAllDay: boolean;
  repeat: EventRepeat;
  color: EventColor;
  guests: string[];
  notifyBefore: number | null;
  location: string | null;
  description: string;
  attachments?: EventAttachment[];
}
