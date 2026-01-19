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
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
}

// Project type for organizing notes (like Figma projects)
export interface Project {
  id: string;
  name: string;
  description?: string;
  icon?: string; // Emoji or icon identifier
  color?: string; // Color for the project
  createdAt: Date;
  updatedAt: Date;
  isDeleted: boolean;
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
}

// Filter and sort types
export type NoteSortField = 'createdAt' | 'updatedAt' | 'title';
export type SortDirection = 'asc' | 'desc';

export interface NotesFilter {
  tags?: string[];
  search?: string;
  authorId?: string;
  projectId?: string; // Filter notes by project
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

export interface AIGenerateRequest {
  prompt: string;
  context?: string;
  type: 'summarize' | 'expand' | 'rewrite' | 'translate' | 'continue' | 'grammar' | 'professional';
  options?: Record<string, unknown>;
}

export interface AIGenerateResponse {
  content: string;
  tokens?: number;
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
  checklists: TaskChecklist[];
}

export type TaskSortField = 'createdAt' | 'updatedAt' | 'dueDate' | 'title';

export interface TasksFilter {
  status?: TaskStatus[];
  labels?: string[];
  assignees?: string[];
  search?: string;
}

export interface TasksSort {
  field: TaskSortField;
  direction: SortDirection;
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
