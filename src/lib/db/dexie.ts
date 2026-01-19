import Dexie, { type EntityTable } from 'dexie';
import type { Note, Tag, User, Workspace, Task, CalendarEvent, Employee, WorkspaceMembership, WorkspaceInvitation, CalendarAccount, Project } from '@/types';

// Define the database schema
const db = new Dexie('VentureCRM') as Dexie & {
  notes: EntityTable<Note, 'id'>;
  tags: EntityTable<Tag, 'id'>;
  users: EntityTable<User, 'id'>;
  workspaces: EntityTable<Workspace, 'id'>;
  workspaceMemberships: EntityTable<WorkspaceMembership, 'id'>;
  workspaceInvitations: EntityTable<WorkspaceInvitation, 'id'>;
  tasks: EntityTable<Task, 'id'>;
  events: EntityTable<CalendarEvent, 'id'>;
  employees: EntityTable<Employee, 'id'>;
  calendarAccounts: EntityTable<CalendarAccount, 'id'>;
  projects: EntityTable<Project, 'id'>;
};

// Schema definition - increment version when modifying schema
db.version(8).stores({
  notes: 'id, title, *tags, projectId, authorId, createdAt, updatedAt, isDeleted',
  tags: 'id, name, category',
  users: 'id, email',
  workspaces: 'id, name, ownerId, createdAt, isDeleted',
  workspaceMemberships: 'id, workspaceId, userId, status',
  workspaceInvitations: 'id, workspaceId, email, token, status',
  tasks: 'id, title, status, order, dueDate, *labels, *assignees, createdAt, updatedAt, isDeleted',
  events: 'id, title, startTime, endTime, isAllDay, repeat, color, source, createdAt, updatedAt, isDeleted',
  employees: 'id, email, employeeId, status, department, category, invitationToken, createdAt, updatedAt, isDeleted',
  calendarAccounts: 'id, provider, email, isConnected, isVisible, createdAt, updatedAt',
  projects: 'id, name, createdAt, updatedAt, isDeleted'
});

export { db };

// Helper to check if database is ready (client-side only)
export const isDatabaseReady = () => {
  return typeof window !== 'undefined';
};

