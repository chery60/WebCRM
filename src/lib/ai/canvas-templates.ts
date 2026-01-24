/**
 * Canvas Templates
 * 
 * Pre-built Excalidraw templates for common product management diagrams.
 * These templates provide a quick start for users who want to create diagrams manually.
 */

export type CanvasTemplateType = 
  | 'blank'
  | 'user-flow-template'
  | 'sitemap-template'
  | 'feature-matrix-template'
  | 'sprint-board-template'
  | 'roadmap-template'
  | 'brainstorm-template';

export interface CanvasTemplate {
  id: CanvasTemplateType;
  name: string;
  description: string;
  thumbnail: string; // Emoji or icon representation
  elements: any[]; // Excalidraw elements
}

// Helper function to create base element properties
const createBaseElement = (id: string, type: string) => ({
  id,
  type,
  version: 1,
  versionNonce: Math.random() * 1000000 | 0,
  isDeleted: false,
  fillStyle: 'solid',
  strokeWidth: 2,
  strokeStyle: 'solid',
  roughness: 1,
  opacity: 100,
  seed: Math.random() * 1000000 | 0,
  groupIds: [],
  frameId: null,
  roundness: { type: 3 },
  boundElements: [],
  updated: Date.now(),
  link: null,
  locked: false,
});

// Helper to create a rectangle
const createRectangle = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  backgroundColor: string = '#e3f2fd',
  strokeColor: string = '#1e1e1e'
) => ({
  ...createBaseElement(id, 'rectangle'),
  x,
  y,
  width,
  height,
  backgroundColor,
  strokeColor,
  angle: 0,
});

// Helper to create text
const createText = (
  id: string,
  x: number,
  y: number,
  text: string,
  fontSize: number = 16,
  strokeColor: string = '#1e1e1e'
) => ({
  ...createBaseElement(id, 'text'),
  x,
  y,
  width: text.length * fontSize * 0.6,
  height: fontSize * 1.5,
  text,
  fontSize,
  fontFamily: 1,
  textAlign: 'center',
  verticalAlign: 'middle',
  strokeColor,
  backgroundColor: 'transparent',
  containerId: null,
  originalText: text,
  lineHeight: 1.25,
});

// Helper to create an arrow
const createArrow = (
  id: string,
  x: number,
  y: number,
  points: number[][],
  strokeColor: string = '#1e1e1e'
) => ({
  ...createBaseElement(id, 'arrow'),
  x,
  y,
  width: Math.abs(points[1][0] - points[0][0]),
  height: Math.abs(points[1][1] - points[0][1]),
  strokeColor,
  backgroundColor: 'transparent',
  points,
  startBinding: null,
  endBinding: null,
  startArrowhead: null,
  endArrowhead: 'arrow',
});

// Helper to create an ellipse
const createEllipse = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  backgroundColor: string = '#e8f5e9',
  strokeColor: string = '#1e1e1e'
) => ({
  ...createBaseElement(id, 'ellipse'),
  x,
  y,
  width,
  height,
  backgroundColor,
  strokeColor,
  angle: 0,
});

// Helper to create a diamond
const createDiamond = (
  id: string,
  x: number,
  y: number,
  width: number,
  height: number,
  backgroundColor: string = '#fff3e0',
  strokeColor: string = '#1e1e1e'
) => ({
  ...createBaseElement(id, 'diamond'),
  x,
  y,
  width,
  height,
  backgroundColor,
  strokeColor,
  angle: 0,
});

// ============================================================================
// TEMPLATES
// ============================================================================

export const CANVAS_TEMPLATES: CanvasTemplate[] = [
  {
    id: 'blank',
    name: 'Blank Canvas',
    description: 'Start with an empty canvas',
    thumbnail: '📄',
    elements: [],
  },
  {
    id: 'user-flow-template',
    name: 'User Flow',
    description: 'Basic user flow with start, actions, and decisions',
    thumbnail: '🔀',
    elements: [
      // Title
      createText('title', 100, 50, 'User Flow', 24),
      // Start
      createEllipse('start', 100, 120, 100, 60, '#e8f5e9'),
      createText('start-text', 115, 135, 'Start', 16),
      // Arrow 1
      createArrow('arrow1', 200, 150, [[0, 0], [80, 0]]),
      // Action 1
      createRectangle('action1', 280, 120, 150, 60, '#e3f2fd'),
      createText('action1-text', 295, 135, 'User Action', 16),
      // Arrow 2
      createArrow('arrow2', 430, 150, [[0, 0], [80, 0]]),
      // Decision
      createDiamond('decision', 510, 110, 120, 80, '#fff3e0'),
      createText('decision-text', 530, 135, 'Decision?', 14),
      // Arrow to success
      createArrow('arrow3', 630, 150, [[0, 0], [80, 0]]),
      // Success
      createEllipse('success', 710, 120, 100, 60, '#e8f5e9'),
      createText('success-text', 725, 135, 'Success', 16),
      // Arrow to error (down)
      createArrow('arrow4', 570, 190, [[0, 0], [0, 60]]),
      // Error
      createRectangle('error', 510, 250, 120, 60, '#fce4ec'),
      createText('error-text', 530, 265, 'Error State', 14),
    ],
  },
  {
    id: 'sitemap-template',
    name: 'Sitemap / IA',
    description: 'Information architecture with page hierarchy',
    thumbnail: '🗺️',
    elements: [
      // Title
      createText('title', 250, 30, 'Sitemap', 24),
      // Home
      createRectangle('home', 280, 80, 140, 60, '#e3f2fd'),
      createText('home-text', 310, 95, 'Home', 18),
      // Arrows down
      createArrow('arrow1', 350, 140, [[0, 0], [-150, 60]]),
      createArrow('arrow2', 350, 140, [[0, 0], [0, 60]]),
      createArrow('arrow3', 350, 140, [[0, 0], [150, 60]]),
      // Level 2 pages
      createRectangle('page1', 100, 200, 140, 60, '#e8f5e9'),
      createText('page1-text', 125, 215, 'Products', 16),
      createRectangle('page2', 280, 200, 140, 60, '#e8f5e9'),
      createText('page2-text', 305, 215, 'About Us', 16),
      createRectangle('page3', 460, 200, 140, 60, '#e8f5e9'),
      createText('page3-text', 490, 215, 'Contact', 16),
      // Level 3
      createArrow('arrow4', 170, 260, [[0, 0], [-50, 50]]),
      createArrow('arrow5', 170, 260, [[0, 0], [50, 50]]),
      createRectangle('subpage1', 50, 310, 120, 50, '#f3e5f5'),
      createText('subpage1-text', 65, 320, 'Category A', 12),
      createRectangle('subpage2', 180, 310, 120, 50, '#f3e5f5'),
      createText('subpage2-text', 195, 320, 'Category B', 12),
    ],
  },
  {
    id: 'feature-matrix-template',
    name: 'Feature Priority Matrix',
    description: '2x2 matrix for prioritizing features by impact and effort',
    thumbnail: '📊',
    elements: [
      // Title
      createText('title', 200, 30, 'Feature Priority Matrix', 24),
      // Quadrant backgrounds
      createRectangle('q1', 100, 100, 200, 150, '#e8f5e9'), // High Impact, Low Effort - DO FIRST
      createRectangle('q2', 300, 100, 200, 150, '#e3f2fd'), // High Impact, High Effort - PLAN
      createRectangle('q3', 100, 250, 200, 150, '#fff3e0'), // Low Impact, Low Effort - MAYBE
      createRectangle('q4', 300, 250, 200, 150, '#fce4ec'), // Low Impact, High Effort - DON'T DO
      // Labels
      createText('q1-label', 130, 110, 'DO FIRST', 14, '#2e7d32'),
      createText('q2-label', 350, 110, 'PLAN', 14, '#1565c0'),
      createText('q3-label', 150, 260, 'MAYBE', 14, '#ef6c00'),
      createText('q4-label', 350, 260, "DON'T DO", 14, '#c62828'),
      // Axis labels
      createText('y-axis', 50, 200, 'Impact →', 14),
      createText('x-axis', 270, 420, 'Effort →', 14),
      // Example features
      createRectangle('feature1', 130, 160, 100, 40, '#c8e6c9'),
      createText('feature1-text', 140, 168, 'Feature A', 12),
      createRectangle('feature2', 350, 180, 100, 40, '#bbdefb'),
      createText('feature2-text', 360, 188, 'Feature B', 12),
    ],
  },
  {
    id: 'sprint-board-template',
    name: 'Sprint Board',
    description: 'Kanban-style sprint planning board',
    thumbnail: '📋',
    elements: [
      // Title
      createText('title', 250, 30, 'Sprint Board', 24),
      // Column headers
      createRectangle('backlog-header', 50, 80, 140, 40, '#e0e0e0'),
      createText('backlog-text', 80, 88, 'Backlog', 14),
      createRectangle('todo-header', 200, 80, 140, 40, '#e0e0e0'),
      createText('todo-text', 230, 88, 'To Do', 14),
      createRectangle('progress-header', 350, 80, 140, 40, '#e0e0e0'),
      createText('progress-text', 365, 88, 'In Progress', 14),
      createRectangle('done-header', 500, 80, 140, 40, '#e0e0e0'),
      createText('done-text', 540, 88, 'Done', 14),
      // Column backgrounds
      createRectangle('backlog-col', 50, 120, 140, 280, '#fafafa'),
      createRectangle('todo-col', 200, 120, 140, 280, '#fafafa'),
      createRectangle('progress-col', 350, 120, 140, 280, '#fafafa'),
      createRectangle('done-col', 500, 120, 140, 280, '#fafafa'),
      // Sample tasks
      createRectangle('task1', 60, 130, 120, 60, '#fff3e0'),
      createText('task1-text', 70, 145, 'Task 1', 12),
      createRectangle('task2', 60, 200, 120, 60, '#fff3e0'),
      createText('task2-text', 70, 215, 'Task 2', 12),
      createRectangle('task3', 210, 130, 120, 60, '#e3f2fd'),
      createText('task3-text', 220, 145, 'Task 3', 12),
      createRectangle('task4', 360, 130, 120, 60, '#fff9c4'),
      createText('task4-text', 370, 145, 'Task 4', 12),
      createRectangle('task5', 510, 130, 120, 60, '#e8f5e9'),
      createText('task5-text', 520, 145, 'Task 5', 12),
    ],
  },
  {
    id: 'roadmap-template',
    name: 'Product Roadmap',
    description: 'Timeline-based product roadmap',
    thumbnail: '🛣️',
    elements: [
      // Title
      createText('title', 250, 30, 'Product Roadmap', 24),
      // Timeline
      createArrow('timeline', 50, 120, [[0, 0], [600, 0]]),
      // Quarter markers
      createText('q1', 100, 90, 'Q1', 14),
      createText('q2', 250, 90, 'Q2', 14),
      createText('q3', 400, 90, 'Q3', 14),
      createText('q4', 550, 90, 'Q4', 14),
      // Milestone diamonds
      createDiamond('m1', 90, 100, 30, 30, '#e8f5e9'),
      createDiamond('m2', 240, 100, 30, 30, '#e3f2fd'),
      createDiamond('m3', 390, 100, 30, 30, '#fff3e0'),
      createDiamond('m4', 540, 100, 30, 30, '#f3e5f5'),
      // Feature blocks - Q1
      createRectangle('f1', 70, 160, 120, 50, '#e8f5e9'),
      createText('f1-text', 85, 173, 'Feature 1', 12),
      // Feature blocks - Q2
      createRectangle('f2', 200, 160, 150, 50, '#e3f2fd'),
      createText('f2-text', 225, 173, 'Feature 2', 12),
      createRectangle('f3', 220, 220, 100, 50, '#bbdefb'),
      createText('f3-text', 235, 233, 'Feature 3', 12),
      // Feature blocks - Q3
      createRectangle('f4', 370, 160, 130, 50, '#fff3e0'),
      createText('f4-text', 395, 173, 'Feature 4', 12),
      // Feature blocks - Q4
      createRectangle('f5', 520, 160, 120, 50, '#f3e5f5'),
      createText('f5-text', 540, 173, 'Feature 5', 12),
    ],
  },
  {
    id: 'brainstorm-template',
    name: 'Brainstorm / Mind Map',
    description: 'Central idea with branching thoughts',
    thumbnail: '💡',
    elements: [
      // Central idea
      createEllipse('center', 250, 180, 160, 80, '#e3f2fd'),
      createText('center-text', 275, 205, 'Main Idea', 18),
      // Branch 1 - Top
      createArrow('b1-arrow', 330, 180, [[0, 0], [0, -60]]),
      createRectangle('b1', 260, 80, 140, 50, '#e8f5e9'),
      createText('b1-text', 285, 93, 'Concept 1', 14),
      // Branch 2 - Right
      createArrow('b2-arrow', 410, 220, [[0, 0], [60, 0]]),
      createRectangle('b2', 470, 195, 140, 50, '#fff3e0'),
      createText('b2-text', 495, 208, 'Concept 2', 14),
      // Branch 3 - Bottom
      createArrow('b3-arrow', 330, 260, [[0, 0], [0, 60]]),
      createRectangle('b3', 260, 320, 140, 50, '#f3e5f5'),
      createText('b3-text', 285, 333, 'Concept 3', 14),
      // Branch 4 - Left
      createArrow('b4-arrow', 250, 220, [[0, 0], [-60, 0]]),
      createRectangle('b4', 50, 195, 140, 50, '#fce4ec'),
      createText('b4-text', 75, 208, 'Concept 4', 14),
      // Sub-branches
      createArrow('sb1-arrow', 540, 195, [[0, 0], [30, -30]]),
      createRectangle('sb1', 570, 130, 100, 40, '#ffe0b2'),
      createText('sb1-text', 585, 138, 'Detail A', 12),
      createArrow('sb2-arrow', 540, 245, [[0, 0], [30, 30]]),
      createRectangle('sb2', 570, 275, 100, 40, '#ffe0b2'),
      createText('sb2-text', 585, 283, 'Detail B', 12),
    ],
  },
];

// Get template by ID
export function getCanvasTemplate(id: CanvasTemplateType): CanvasTemplate | undefined {
  return CANVAS_TEMPLATES.find(t => t.id === id);
}

// Get all templates
export function getAllCanvasTemplates(): CanvasTemplate[] {
  return CANVAS_TEMPLATES;
}

export default CANVAS_TEMPLATES;
