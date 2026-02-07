// Database types - designed for Supabase migration

// Note/PRD Status for document lifecycle
export type NoteStatus = 'draft' | 'in_review' | 'approved' | 'shipped' | 'archived';

// Note/PRD Priority
export type NotePriority = 'low' | 'medium' | 'high' | 'urgent';

// Helper constants for note statuses
export const NOTE_STATUSES: { value: NoteStatus; label: string; color: string; icon: string }[] = [
  { value: 'draft', label: 'Draft', color: 'bg-gray-500', icon: 'pencil' },
  { value: 'in_review', label: 'In Review', color: 'bg-yellow-500', icon: 'eye' },
  { value: 'approved', label: 'Approved', color: 'bg-blue-500', icon: 'check' },
  { value: 'shipped', label: 'Shipped', color: 'bg-green-500', icon: 'rocket' },
  { value: 'archived', label: 'Archived', color: 'bg-gray-400', icon: 'archive' },
];

// Helper constants for note priorities
export const NOTE_PRIORITIES: { value: NotePriority; label: string; color: string }[] = [
  { value: 'low', label: 'Low', color: 'bg-gray-400' },
  { value: 'medium', label: 'Medium', color: 'bg-yellow-400' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'urgent', label: 'Urgent', color: 'bg-red-500' },
];

export interface Note {
  id: string;
  title: string;
  content: string; // JSON (TipTap format)
  tags: string[];
  projectId?: string; // Optional project ID for organizing notes
  workspaceId?: string; // Workspace this note belongs to
  authorId: string;
  authorName: string;
  authorAvatar?: string;

  // PRD Metadata fields
  status?: NoteStatus; // Document lifecycle status
  priority?: NotePriority; // Priority level
  targetRelease?: string; // Target release/sprint (e.g., "Q1 2026", "Sprint 23")
  dueDate?: Date; // Target completion date
  stakeholders?: string[]; // List of stakeholder user IDs or names

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
  workspaceId?: string; // Workspace this project belongs to
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
  workspaceId?: string; // Workspace this pipeline belongs to
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
  hasCompletedOnboarding?: boolean; // Whether user has completed onboarding
  onboardingCompletedAt?: Date; // When onboarding was completed
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

  // Workspace scoping
  workspaceId?: string;

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
  workspaceId?: string; // Workspace this employee belongs to
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
  workspaceId?: string;
  status?: NoteStatus;
  priority?: NotePriority;
  targetRelease?: string;
  dueDate?: Date;
  stakeholders?: string[];
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
  workspaceId?: string; // Filter notes by workspace
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
  useWebSearch?: boolean; // Enable web search/grounding for this request
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
  /** Whether this feature has been added to a pipeline/roadmap */
  addedToPipeline?: boolean;
  /** Name of the roadmap it was added to (for display) */
  addedToRoadmapName?: string;
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
  /** Whether this task has been added to a project */
  addedToProject?: boolean;
  /** Name of the project it was added to (for display) */
  addedToProjectName?: string;
}

export interface PRDGenerationResult {
  content: string;
  sections: PRDSection[];
  suggestedFeatures?: GeneratedFeature[];
  suggestedTasks?: GeneratedTask[];
}

// ============================================
// PRD Chat Types (Conversational PRD Generation)
// ============================================

export interface PRDChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  // For AI messages - the generated PRD content
  generatedContent?: string;
  // For version history - snapshot of note content at this point
  noteSnapshot?: string;
  // Template used for this generation (if any)
  templateUsed?: PRDTemplateType | string;
  // Provider used for generation
  providerUsed?: string;
  // Is the AI currently generating this message
  isGenerating?: boolean;
  // Error message if generation failed
  error?: string;
}

export interface PRDChatSession {
  id: string;
  messages: PRDChatMessage[];
  noteId?: string;
  createdAt: Date;
  updatedAt: Date;
}

// Template Section with optional description for AI guidance
export interface TemplateSection {
  id: string;
  title: string;
  order: number;
  description?: string; // Optional description explaining what this section should contain
}

// Template Category for organizing templates
export type TemplateCategory =
  | 'saas'           // SaaS & B2B products
  | 'consumer'       // Consumer apps
  | 'platform'       // Platforms & marketplaces
  | 'internal'       // Internal tools
  | 'api'            // API & developer products
  | 'custom';        // User-created custom category

// Template category metadata
export const TEMPLATE_CATEGORIES: { value: TemplateCategory; label: string; icon: string; color: string }[] = [
  { value: 'saas', label: 'SaaS & B2B', icon: 'building2', color: 'bg-blue-500/10 text-blue-600 border-blue-200' },
  { value: 'consumer', label: 'Consumer Apps', icon: 'smartphone', color: 'bg-purple-500/10 text-purple-600 border-purple-200' },
  { value: 'platform', label: 'Platforms', icon: 'network', color: 'bg-green-500/10 text-green-600 border-green-200' },
  { value: 'internal', label: 'Internal Tools', icon: 'wrench', color: 'bg-gray-500/10 text-gray-600 border-gray-200' },
  { value: 'api', label: 'API & Dev Tools', icon: 'code', color: 'bg-orange-500/10 text-orange-600 border-orange-200' },
  { value: 'custom', label: 'Custom', icon: 'file-text', color: 'bg-primary/10 text-primary border-primary/20' },
];

// Template version for tracking changes
export interface TemplateVersion {
  id: string;
  version: number;
  name: string;
  description: string;
  sections: TemplateSection[];
  contextPrompt?: string;
  category?: TemplateCategory; // Category of the template at this version
  changeDescription?: string; // What changed in this version
  createdAt: Date;
}

// Custom PRD Template (user-created or starter templates)
export interface CustomPRDTemplate {
  id: string;
  name: string;
  description: string;
  sections: TemplateSection[];
  isStarterTemplate?: boolean; // True if this is a starter template (can still be edited/deleted)
  contextPrompt?: string; // AI context prompt for this template type
  icon?: string; // Icon identifier for the template
  color?: string; // Color class for the template
  useCases?: string[]; // Example use cases for this template
  category?: TemplateCategory; // Category for organizing templates
  version?: number; // Current version number
  versionHistory?: TemplateVersion[]; // History of previous versions
  createdAt: Date;
  updatedAt: Date;
}

// Canvas Item for multiple canvases per note
export interface CanvasItem {
  id: string;
  name: string;
  data: {
    elements: unknown[];
    appState?: Record<string, unknown>;
    files?: Record<string, unknown>;
  };
  createdAt: string;
  updatedAt: string;
}

// Export format for sharing templates
export interface TemplateExportFormat {
  formatVersion: '1.0'; // For future compatibility
  exportedAt: Date;
  templates: Omit<CustomPRDTemplate, 'createdAt' | 'updatedAt' | 'versionHistory'>[];
}

// Import result
export interface TemplateImportResult {
  success: boolean;
  imported: number;
  skipped: number;
  errors: string[];
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
  workspaceId?: string; // Workspace this task belongs to
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
  workspaceId?: string; // Workspace this task belongs to
  checklists: TaskChecklist[];
}

export type TaskSortField = 'createdAt' | 'updatedAt' | 'dueDate' | 'title';

export interface TasksFilter {
  status?: TaskStatus[];
  labels?: string[];
  assignees?: string[];
  projectId?: string; // Filter by project/tab
  workspaceId?: string; // Filter by workspace
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
