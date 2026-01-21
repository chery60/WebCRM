import { db } from './dexie';
import type { Note, Tag, User, Task, CalendarEvent, Employee } from '@/types';
import { v4 as uuidv4 } from 'uuid';
import { seedPipelines } from './seed-pipelines';

// Default tags matching the Figma design
const defaultTags: Tag[] = [
  { id: uuidv4(), name: 'Weekly', color: 'weekly', category: 'frequency' },
  { id: uuidv4(), name: 'Monthly', color: 'monthly', category: 'frequency' },
  { id: uuidv4(), name: 'Product', color: 'product', category: 'type' },
  { id: uuidv4(), name: 'Business', color: 'business', category: 'type' },
  { id: uuidv4(), name: 'Personal', color: 'personal', category: 'type' },
  { id: uuidv4(), name: 'Badge', color: 'badge', category: 'custom' },
];

// Task-specific labels (from Figma)
const taskLabels = ['Internal', 'Marketing', 'Urgent', 'Report', 'Event', 'Document'];

// Default users for tasks
// Note: Using plain text passwords for demo purposes only. In production, use proper hashing!
const defaultUsers: User[] = [
  { id: 'user-1', name: 'Brian F.', email: 'brian@venture.com', password: 'password123', avatar: '/avatars/brian.jpg', role: 'admin' },
  { id: 'user-2', name: 'Cameron Williamson', email: 'cameron@venture.com', password: 'password123', avatar: '/avatars/cameron.jpg', role: 'member' },
  { id: 'user-3', name: 'Albert Flores', email: 'albert@venture.com', password: 'password123', avatar: '/avatars/albert.jpg', role: 'member' },
  { id: 'user-4', name: 'Brooklyn Simmons', email: 'brooklyn@venture.com', password: 'password123', avatar: '/avatars/brooklyn.jpg', role: 'member' },
  { id: 'user-5', name: 'Annette Black', email: 'annette@venture.com', password: 'password123', avatar: '/avatars/annette.jpg', role: 'member' },
];

// Helper function to generate dates relative to current date
function getRelativeDate(daysOffset: number, hours: number, minutes: number = 0): Date {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(hours, minutes, 0, 0);
  return date;
}

// Sample calendar events matching the Figma design - using relative dates
const sampleEvents: Omit<CalendarEvent, 'id'>[] = [
  {
    title: 'Design Review',
    description: 'Review design mockups for new feature',
    startTime: getRelativeDate(0, 9, 0), // Today at 9:00
    endTime: getRelativeDate(0, 10, 0), // Today at 10:00
    isAllDay: false,
    repeat: 'none',
    color: 'pink',
    guests: ['user-1', 'user-2'],
    notifyBefore: 30,
    location: null,
    attachments: [],
    source: 'local',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  },
  {
    title: 'Meeting',
    description: 'Weekly team meeting',
    startTime: getRelativeDate(0, 14, 0), // Today at 14:00
    endTime: getRelativeDate(0, 15, 0), // Today at 15:00
    isAllDay: false,
    repeat: 'weekly',
    color: 'yellow',
    guests: ['user-1', 'user-2', 'user-3'],
    notifyBefore: 30,
    location: null,
    attachments: [],
    source: 'local',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  },
  {
    title: 'Design Review',
    description: 'Design review session',
    startTime: getRelativeDate(1, 10, 0), // Tomorrow at 10:00
    endTime: getRelativeDate(1, 11, 30), // Tomorrow at 11:30
    isAllDay: false,
    repeat: 'none',
    color: 'pink',
    guests: ['user-1'],
    notifyBefore: 30,
    location: null,
    attachments: [],
    source: 'local',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  },
  {
    title: 'Discussion',
    description: 'Product discussion',
    startTime: getRelativeDate(1, 11, 30), // Tomorrow at 11:30
    endTime: getRelativeDate(1, 12, 30), // Tomorrow at 12:30
    isAllDay: false,
    repeat: 'none',
    color: 'green',
    guests: ['user-2', 'user-3'],
    notifyBefore: 30,
    location: null,
    attachments: [],
    source: 'local',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  },
  {
    title: 'Market Research',
    description: 'Market research and analysis',
    startTime: getRelativeDate(2, 8, 0), // Day after tomorrow at 8:00
    endTime: getRelativeDate(2, 11, 30), // Day after tomorrow at 11:30
    isAllDay: false,
    repeat: 'none',
    color: 'green',
    guests: [],
    notifyBefore: 30,
    location: null,
    attachments: [],
    source: 'local',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  },
  {
    title: 'Discussion',
    description: 'General discussion',
    startTime: getRelativeDate(2, 10, 30), // Day after tomorrow at 10:30
    endTime: getRelativeDate(2, 13, 0), // Day after tomorrow at 13:00
    isAllDay: false,
    repeat: 'none',
    color: 'purple',
    guests: ['user-1', 'user-4'],
    notifyBefore: 30,
    location: null,
    attachments: [],
    source: 'local',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  },
  {
    title: 'New Deals',
    description: 'Review new deals',
    startTime: getRelativeDate(3, 9, 30), // 3 days from now at 9:30
    endTime: getRelativeDate(3, 11, 0), // 3 days from now at 11:00
    isAllDay: false,
    repeat: 'none',
    color: 'yellow',
    guests: ['user-2'],
    notifyBefore: 30,
    location: null,
    attachments: [],
    source: 'local',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  },
  {
    title: 'Design Review',
    description: 'Design review for new deals',
    startTime: getRelativeDate(4, 9, 0), // 4 days from now at 9:00
    endTime: getRelativeDate(4, 10, 30), // 4 days from now at 10:30
    isAllDay: false,
    repeat: 'none',
    color: 'pink',
    guests: ['user-1', 'user-3'],
    notifyBefore: 30,
    location: null,
    attachments: [],
    source: 'local',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  },
  {
    title: 'New Deals',
    description: 'New deals discussion',
    startTime: getRelativeDate(4, 10, 0), // 4 days from now at 10:00
    endTime: getRelativeDate(4, 11, 0), // 4 days from now at 11:00
    isAllDay: false,
    repeat: 'none',
    color: 'yellow',
    guests: ['user-2', 'user-4'],
    notifyBefore: 30,
    location: null,
    attachments: [],
    source: 'local',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  },
  {
    title: 'Meeting',
    description: 'Team meeting',
    startTime: getRelativeDate(5, 8, 0), // 5 days from now at 8:00
    endTime: getRelativeDate(5, 9, 30), // 5 days from now at 9:30
    isAllDay: false,
    repeat: 'none',
    color: 'yellow',
    guests: ['user-1', 'user-2', 'user-3'],
    notifyBefore: 30,
    location: null,
    attachments: [],
    source: 'local',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  },
  {
    title: 'Design Review',
    description: 'Weekly design review',
    startTime: getRelativeDate(5, 9, 30), // 5 days from now at 9:30
    endTime: getRelativeDate(5, 11, 0), // 5 days from now at 11:00
    isAllDay: false,
    repeat: 'none',
    color: 'pink',
    guests: ['user-1'],
    notifyBefore: 30,
    location: null,
    attachments: [],
    source: 'local',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  },
  {
    title: 'Meeting',
    description: 'End of week meeting',
    startTime: getRelativeDate(6, 8, 0), // 6 days from now at 8:00
    endTime: getRelativeDate(6, 9, 0), // 6 days from now at 9:00
    isAllDay: false,
    repeat: 'none',
    color: 'yellow',
    guests: [],
    notifyBefore: 30,
    location: null,
    attachments: [],
    source: 'local',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  },
  {
    title: 'New Deals',
    description: 'New deals review',
    startTime: getRelativeDate(6, 9, 0), // 6 days from now at 9:00
    endTime: getRelativeDate(6, 10, 0), // 6 days from now at 10:00
    isAllDay: false,
    repeat: 'none',
    color: 'yellow',
    guests: ['user-2'],
    notifyBefore: 30,
    location: null,
    attachments: [],
    source: 'local',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  },
  {
    title: 'Discussion',
    description: 'General discussion',
    startTime: getRelativeDate(7, 10, 0), // 7 days from now at 10:00
    endTime: getRelativeDate(7, 11, 0), // 7 days from now at 11:00
    isAllDay: false,
    repeat: 'none',
    color: 'green',
    guests: ['user-3', 'user-4'],
    notifyBefore: 30,
    location: null,
    attachments: [],
    source: 'local',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  },
  {
    title: 'Meeting',
    description: 'Monthly meeting',
    startTime: getRelativeDate(-1, 8, 0), // Yesterday at 8:00
    endTime: getRelativeDate(-1, 9, 0), // Yesterday at 9:00
    isAllDay: false,
    repeat: 'monthly',
    color: 'yellow',
    guests: ['user-1', 'user-2'],
    notifyBefore: 30,
    location: null,
    attachments: [],
    source: 'local',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  },
  {
    title: 'Design Review',
    description: 'Monthly design review',
    startTime: getRelativeDate(-2, 9, 0), // 2 days ago at 9:00
    endTime: getRelativeDate(-2, 10, 30), // 2 days ago at 10:30
    isAllDay: false,
    repeat: 'none',
    color: 'pink',
    guests: ['user-1'],
    notifyBefore: 30,
    location: null,
    attachments: [],
    source: 'local',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  },
  {
    title: 'New Deals',
    description: 'New deals wrap up',
    startTime: getRelativeDate(-3, 10, 30), // 3 days ago at 10:30
    endTime: getRelativeDate(-3, 11, 30), // 3 days ago at 11:30
    isAllDay: false,
    repeat: 'none',
    color: 'yellow',
    guests: ['user-2', 'user-3'],
    notifyBefore: 30,
    location: null,
    attachments: [],
    source: 'local',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  },
  {
    title: 'Discussion',
    description: 'End of month discussion',
    startTime: getRelativeDate(-4, 11, 30), // 4 days ago at 11:30
    endTime: getRelativeDate(-4, 12, 30), // 4 days ago at 12:30
    isAllDay: false,
    repeat: 'none',
    color: 'green',
    guests: ['user-4', 'user-5'],
    notifyBefore: 30,
    location: null,
    attachments: [],
    source: 'local',
    createdAt: new Date(),
    updatedAt: new Date(),
    isDeleted: false,
  },
];

// Sample tasks matching the Figma design
const sampleTasks: Omit<Task, 'id'>[] = [
  // Planned tasks
  {
    title: 'Monthly Product Discussion',
    description: 'Monthly Product Discussion by Design and Marketing Teams with CEO to Plan our future products sales and reports',
    status: 'planned',
    order: 0,
    dueDate: new Date('2023-01-24'),
    labels: ['Internal', 'Marketing', 'Urgent'],
    assignees: ['user-1', 'user-2', 'user-3'],
    checklists: [
      {
        id: uuidv4(),
        name: 'Task Checklist',
        items: [
          { id: uuidv4(), text: 'Prepare Design Document', completed: false },
          { id: uuidv4(), text: 'Document Signature', completed: false },
          { id: uuidv4(), text: 'Pitch Deck Presentation Design', completed: false },
        ],
      },
    ],
    attachments: [],
    activities: [],
    subtaskProgress: { completed: 10, total: 124 },
    commentCount: 19,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-20'),
    isDeleted: false,
  },
  {
    title: 'Update New Social Media Posts',
    description: 'Update social media content across all platforms',
    status: 'planned',
    order: 1,
    dueDate: new Date('2023-01-18'),
    labels: ['Marketing', 'Event', 'Urgent'],
    assignees: ['user-1', 'user-2'],
    checklists: [],
    attachments: [],
    activities: [],
    subtaskProgress: { completed: 12, total: 52 },
    commentCount: 1,
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-15'),
    isDeleted: false,
  },
  {
    title: 'Input Data for Monthly Sales Revenue',
    description: 'Compile and input all sales data for monthly reports',
    status: 'planned',
    order: 2,
    dueDate: new Date('2023-01-31'),
    labels: ['Internal', 'Document', 'Marketing'],
    assignees: ['user-1', 'user-2'],
    checklists: [],
    attachments: [],
    activities: [],
    subtaskProgress: { completed: 4, total: 5 },
    commentCount: 0,
    createdAt: new Date('2023-01-03'),
    updatedAt: new Date('2023-01-28'),
    isDeleted: false,
  },
  // Upcoming tasks
  {
    title: 'Create Monthly Revenue Recap for All Product Linear',
    description: 'Prepare comprehensive revenue analysis for all product lines',
    status: 'upcoming',
    order: 0,
    dueDate: new Date('2023-01-11'),
    labels: ['Report', 'Event', 'Urgent'],
    assignees: ['user-3', 'user-4'],
    checklists: [],
    attachments: [],
    activities: [],
    subtaskProgress: { completed: 4, total: 12 },
    commentCount: 1,
    createdAt: new Date('2023-01-04'),
    updatedAt: new Date('2023-01-10'),
    isDeleted: false,
  },
  {
    title: 'Uploading New Items to Marketplace',
    description: 'Upload and list new products on the marketplace platform',
    status: 'upcoming',
    order: 1,
    dueDate: new Date('2023-01-09'),
    labels: ['Report', 'Document', 'Marketing'],
    assignees: ['user-1', 'user-2', 'user-3'],
    checklists: [],
    attachments: [],
    activities: [],
    subtaskProgress: { completed: 12, total: 64 },
    commentCount: 23,
    createdAt: new Date('2023-01-05'),
    updatedAt: new Date('2023-01-08'),
    isDeleted: false,
  },
  {
    title: 'Monthly Product Discussion',
    description: 'Regular monthly product planning session',
    status: 'upcoming',
    order: 2,
    dueDate: new Date('2023-01-12'),
    labels: ['Internal', 'Marketing', 'Urgent'],
    assignees: ['user-1', 'user-4', 'user-5'],
    checklists: [],
    attachments: [],
    activities: [],
    subtaskProgress: { completed: 3, total: 4 },
    commentCount: 51,
    createdAt: new Date('2023-01-06'),
    updatedAt: new Date('2023-01-11'),
    isDeleted: false,
  },
  {
    title: 'Update New Social Media Post',
    description: 'Update and schedule social media content',
    status: 'upcoming',
    order: 3,
    dueDate: new Date('2023-01-15'),
    labels: ['Marketing', 'Event', 'Urgent'],
    assignees: ['user-2', 'user-3', 'user-4'],
    checklists: [],
    attachments: [],
    activities: [],
    subtaskProgress: { completed: 0, total: 12 },
    commentCount: 3,
    createdAt: new Date('2023-01-07'),
    updatedAt: new Date('2023-01-14'),
    isDeleted: false,
  },
  {
    title: 'Input Data for Monthly Sales Revenue',
    description: 'Enter sales figures for monthly reporting',
    status: 'upcoming',
    order: 4,
    dueDate: new Date('2023-01-13'),
    labels: ['Internal', 'Document', 'Marketing'],
    assignees: ['user-1', 'user-2'],
    checklists: [],
    attachments: [],
    activities: [],
    subtaskProgress: { completed: 1, total: 53 },
    commentCount: 21,
    createdAt: new Date('2023-01-08'),
    updatedAt: new Date('2023-01-12'),
    isDeleted: false,
  },
  // Completed tasks
  {
    title: 'Uploading New Items to Marketplace',
    description: 'Completed marketplace uploads',
    status: 'completed',
    order: 0,
    dueDate: new Date('2023-01-09'),
    labels: ['Report', 'Document', 'Marketing'],
    assignees: ['user-1', 'user-2', 'user-3'],
    checklists: [],
    attachments: [],
    activities: [],
    subtaskProgress: { completed: 2, total: 15 },
    commentCount: 1,
    createdAt: new Date('2023-01-01'),
    updatedAt: new Date('2023-01-09'),
    isDeleted: false,
  },
  {
    title: 'Input Data for Monthly Sales Revenue',
    description: 'Completed sales data entry',
    status: 'completed',
    order: 1,
    dueDate: new Date('2023-01-13'),
    labels: ['Internal', 'Document', 'Marketing'],
    assignees: ['user-4', 'user-5'],
    checklists: [],
    attachments: [],
    activities: [],
    subtaskProgress: { completed: 12, total: 12 },
    commentCount: 1,
    createdAt: new Date('2023-01-02'),
    updatedAt: new Date('2023-01-13'),
    isDeleted: false,
  },
];

// Sample notes matching the Figma design
const sampleNotes: Omit<Note, 'id'>[] = [
  {
    title: 'Product Team Meeting',
    content: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'This monthly progress agenda is following this items:' }]
        },
        {
          type: 'bulletList',
          content: [
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Introduction to Newest Product Plan' }] }
              ]
            },
            {
              type: 'listItem',
              content: [
                { type: 'paragraph', content: [{ type: 'text', text: 'Monthly Revenue updates for each products' }] }
              ]
            }
          ]
        }
      ]
    }),
    tags: ['Weekly', 'Product'],
    authorId: 'user-1',
    authorName: 'Floyd Miles',
    authorAvatar: '/avatars/floyd.jpg',
    createdAt: new Date('2024-03-05T04:25:00'),
    updatedAt: new Date('2024-03-05T04:25:00'),
    isDeleted: false,
  },
  // ... keeping original notes for brevity, they remain unchanged
  {
    title: 'Document Images',
    content: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Report Document of Weekly Meetings' }]
        }
      ]
    }),
    tags: ['Personal'],
    authorId: 'user-6',
    authorName: 'Cameron Williamson',
    authorAvatar: '/avatars/cameron.jpg',
    createdAt: new Date('2024-12-30T21:28:00'),
    updatedAt: new Date('2024-12-30T21:28:00'),
    isDeleted: false,
  },
  {
    title: 'Revenue Progress',
    content: JSON.stringify({
      type: 'doc',
      content: [
        {
          type: 'paragraph',
          content: [{ type: 'text', text: 'Quarterly revenue analysis and projections.' }]
        }
      ]
    }),
    tags: ['Business'],
    authorId: 'user-7',
    authorName: 'Ronald Richards',
    authorAvatar: '/avatars/ronald.jpg',
    createdAt: new Date('2024-05-22T04:43:00'),
    updatedAt: new Date('2024-05-22T04:43:00'),
    isDeleted: false,
  },
];

export async function seedDatabase() {
  // Check if already seeded
  const existingTags = await db.tags.count();
  if (existingTags > 0) {
    console.log('Database already seeded');
    return;
  }

  console.log('Seeding database...');

  // Seed tags
  await db.tags.bulkAdd(defaultTags);

  // Seed users
  await db.users.bulkAdd(defaultUsers);

  // Seed employees from users - automatically create employee records for all users
  const defaultEmployees = defaultUsers.map((user, index) => {
    const nameParts = user.name.split(' ');
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(' ') || '';
    
    // Department mapping based on user
    const departments = ['Design', 'Product', 'Sales', 'Marketing', 'Engineering'];
    const department = departments[index % departments.length];
    
    return {
      id: user.id, // Use the same ID as the user for easy mapping
      firstName,
      lastName,
      email: user.email,
      avatar: user.avatar,
      role: user.role,
      status: 'active' as const,
      category: 'Employee' as const,
      employeeId: `US${String(219410 + index).padStart(6, '0')}`,
      department,
      isActive: true, // Employee can log in
      phone: undefined,
      phoneCountryCode: '+1',
      birthDate: undefined,
      gender: undefined,
      occupation: undefined,
      personalId: undefined,
      country: 'United States',
      city: undefined,
      address: undefined,
      invitationToken: undefined,
      invitedAt: undefined,
      invitedBy: undefined,
      passwordCreated: true, // Already have password since they're seeded users
      passwordCreatedAt: new Date(),
      lastActivityAt: new Date(),
      createdAt: new Date(),
      updatedAt: new Date(),
      isDeleted: false,
    };
  });
  await db.employees.bulkAdd(defaultEmployees);

  // Seed notes
  const notesWithIds = sampleNotes.map(note => ({
    ...note,
    id: uuidv4(),
  }));
  await db.notes.bulkAdd(notesWithIds);

  // Seed tasks
  const tasksWithIds = sampleTasks.map(task => ({
    ...task,
    id: uuidv4(),
  }));
  await db.tasks.bulkAdd(tasksWithIds);

  // Seed events
  const eventsWithIds = sampleEvents.map(event => ({
    ...event,
    id: uuidv4(),
  }));
  await db.events.bulkAdd(eventsWithIds);

  // Seed pipelines
  await seedPipelines();

  console.log('Database seeded successfully');
  console.log(`Created ${defaultEmployees.length} employee records from users`);
}

export async function clearDatabase() {
  await db.notes.clear();
  await db.tags.clear();
  await db.users.clear();
  await db.workspaces.clear();
  await db.tasks.clear();
  await db.events.clear();
  await db.employees.clear();
  await db.pipelines.clear();
  await db.roadmaps.clear();
  await db.featureRequests.clear();
  console.log('Database cleared');
}
