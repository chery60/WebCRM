import { db } from './dexie';
import type { Pipeline, Roadmap, FeatureRequest } from '@/types';
import { v4 as uuidv4 } from 'uuid';

export async function seedPipelines() {
  // Check if already seeded
  const existingPipelines = await db.pipelines.count();
  if (existingPipelines > 0) {
    console.log('Pipelines already seeded');
    return;
  }

  console.log('Seeding pipelines...');

  const now = new Date();

  // Create Pipeline
  const pipeline: Pipeline = {
    id: uuidv4(),
    name: 'Product Development',
    description: 'Main product development pipeline',
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  };

  await db.pipelines.add(pipeline);

  // Create Roadmaps
  const roadmap1: Roadmap = {
    id: uuidv4(),
    pipelineId: pipeline.id,
    name: 'Q1 2026 Roadmap',
    description: 'Features planned for Q1 2026',
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  };

  const roadmap2: Roadmap = {
    id: uuidv4(),
    pipelineId: pipeline.id,
    name: 'Platform Improvements',
    description: 'Ongoing platform improvements',
    createdAt: now,
    updatedAt: now,
    isDeleted: false,
  };

  await db.roadmaps.bulkAdd([roadmap1, roadmap2]);

  // Create Feature Requests for roadmap1
  const features: FeatureRequest[] = [
    {
      id: uuidv4(),
      roadmapId: roadmap1.id,
      title: 'Implement user dashboard analytics',
      description: 'Add comprehensive analytics dashboard for users to track their activity and progress.',
      status: 'live_on_production',
      priority: 'high',
      phase: 'Phase 1',
      assignees: ['user-1', 'user-2'],
      tags: ['analytics', 'dashboard'],
      problemStatement: 'Users currently have no visibility into their usage patterns and performance metrics.',
      proposedSolution: 'Create a comprehensive dashboard with charts, graphs, and key metrics that users can customize.',
      acceptanceCriteria: [
        'Dashboard shows daily/weekly/monthly views',
        'Users can customize which metrics to display',
        'Data exports to CSV/PDF',
        'Mobile responsive design',
      ],
      userStories: [
        'As a user, I want to see my activity over time so that I can track my progress',
        'As a manager, I want to export reports so that I can share with stakeholders',
      ],
      technicalNotes: 'Use Chart.js for visualizations. Consider caching for performance.',
      dependencies: [],
      estimatedEffort: '3 weeks',
      businessValue: 'high',
      activities: [
        {
          id: uuidv4(),
          type: 'comment',
          content: 'Started working on the chart components',
          userId: 'user-1',
          userName: 'John Doe',
          createdAt: new Date(Date.now() - 86400000 * 5),
        },
        {
          id: uuidv4(),
          type: 'status_change',
          content: 'Moved to Live on Production',
          userId: 'user-1',
          userName: 'John Doe',
          createdAt: now,
        },
      ],
      attachments: [],
      order: 1,
      createdBy: 'user-1',
      createdByName: 'John Doe',
      createdAt: new Date(Date.now() - 86400000 * 30),
      updatedAt: now,
      isDeleted: false,
    },
    {
      id: uuidv4(),
      roadmapId: roadmap1.id,
      title: 'Add real-time collaboration features',
      description: 'Enable multiple users to work on the same document simultaneously.',
      status: 'under_development',
      priority: 'urgent',
      phase: 'Phase 1',
      assignees: ['user-2'],
      tags: ['collaboration', 'real-time'],
      dueDate: new Date(Date.now() + 86400000 * 14),
      problemStatement: 'Users cannot collaborate in real-time, leading to version conflicts and delays.',
      proposedSolution: 'Implement WebSocket-based real-time sync with conflict resolution.',
      acceptanceCriteria: [
        'Multiple users can edit simultaneously',
        'Changes sync within 500ms',
        'Conflict resolution handles concurrent edits',
        'Presence indicators show who is online',
      ],
      userStories: [
        'As a team member, I want to see changes from others in real-time',
        'As a user, I want to know who else is viewing the document',
      ],
      technicalNotes: 'Consider using Yjs or Automerge for CRDT-based sync.',
      dependencies: ['WebSocket infrastructure upgrade'],
      estimatedEffort: '4 weeks',
      businessValue: 'critical',
      activities: [],
      attachments: [],
      order: 2,
      createdBy: 'user-1',
      createdByName: 'John Doe',
      createdAt: new Date(Date.now() - 86400000 * 20),
      updatedAt: now,
      isDeleted: false,
    },
    {
      id: uuidv4(),
      roadmapId: roadmap1.id,
      title: 'Mobile app push notifications',
      description: 'Implement push notifications for mobile applications.',
      status: 'ready_for_dev',
      priority: 'medium',
      phase: 'Phase 2',
      assignees: ['user-3'],
      tags: ['mobile', 'notifications'],
      dueDate: new Date(Date.now() + 86400000 * 30),
      startDate: new Date(Date.now() + 86400000 * 7),
      problemStatement: 'Mobile users miss important updates because there are no push notifications.',
      proposedSolution: 'Integrate Firebase Cloud Messaging for cross-platform push notifications.',
      acceptanceCriteria: [
        'iOS and Android support',
        'Users can customize notification preferences',
        'Deep linking to relevant content',
        'Notification history in app',
      ],
      userStories: [],
      technicalNotes: '',
      dependencies: [],
      estimatedEffort: '2 weeks',
      businessValue: 'medium',
      activities: [],
      attachments: [],
      order: 3,
      createdBy: 'user-2',
      createdByName: 'Jane Smith',
      createdAt: new Date(Date.now() - 86400000 * 10),
      updatedAt: now,
      isDeleted: false,
    },
    {
      id: uuidv4(),
      roadmapId: roadmap1.id,
      title: 'Advanced search with filters',
      description: 'Enhance search functionality with advanced filtering options.',
      status: 'designing',
      priority: 'medium',
      phase: 'Phase 2',
      assignees: [],
      tags: ['search', 'ux'],
      problemStatement: 'Current search is basic and users struggle to find specific items.',
      proposedSolution: 'Implement Elasticsearch with faceted search and filters.',
      acceptanceCriteria: [
        'Filter by date range, type, status',
        'Search suggestions as you type',
        'Save search filters',
        'Search results highlighting',
      ],
      userStories: [],
      technicalNotes: '',
      dependencies: [],
      estimatedEffort: '3 weeks',
      businessValue: 'medium',
      activities: [],
      attachments: [],
      order: 4,
      createdBy: 'user-1',
      createdByName: 'John Doe',
      createdAt: new Date(Date.now() - 86400000 * 5),
      updatedAt: now,
      isDeleted: false,
    },
    {
      id: uuidv4(),
      roadmapId: roadmap1.id,
      title: 'API rate limiting and throttling',
      description: 'Implement rate limiting to protect API from abuse.',
      status: 'backlog',
      priority: 'low',
      phase: 'Phase 3',
      assignees: [],
      tags: ['api', 'security'],
      problemStatement: 'API is vulnerable to abuse and DoS attacks.',
      proposedSolution: 'Implement token bucket rate limiting with Redis.',
      acceptanceCriteria: [
        'Rate limits per user/API key',
        'Configurable limits per endpoint',
        'Clear error messages when limited',
        'Dashboard showing API usage',
      ],
      userStories: [],
      technicalNotes: '',
      dependencies: [],
      estimatedEffort: '1 week',
      businessValue: 'low',
      activities: [],
      attachments: [],
      order: 5,
      createdBy: 'user-2',
      createdByName: 'Jane Smith',
      createdAt: new Date(Date.now() - 86400000 * 2),
      updatedAt: now,
      isDeleted: false,
    },
    {
      id: uuidv4(),
      roadmapId: roadmap1.id,
      title: 'Dark mode support',
      description: 'Add system-wide dark mode support.',
      status: 'considering',
      priority: 'low',
      phase: 'Future',
      assignees: [],
      tags: ['ui', 'theme'],
      problemStatement: 'Users want dark mode for better viewing in low-light conditions.',
      proposedSolution: 'Use CSS variables and Tailwind dark mode classes.',
      acceptanceCriteria: [
        'Toggle in settings',
        'Respects system preference',
        'All components support dark mode',
        'Smooth transition animation',
      ],
      userStories: [],
      technicalNotes: '',
      dependencies: [],
      estimatedEffort: '1 week',
      businessValue: 'low',
      activities: [],
      attachments: [],
      order: 6,
      createdBy: 'user-1',
      createdByName: 'John Doe',
      createdAt: new Date(Date.now() - 86400000 * 1),
      updatedAt: now,
      isDeleted: false,
    },
  ];

  await db.featureRequests.bulkAdd(features);

  console.log('Pipelines seeded successfully!');
}
