/**
 * Diagram Completeness Validator
 *
 * After AI generation, validates whether the diagram is complete relative to
 * the PRD content and the expected schema for each diagram type.
 *
 * If incomplete, returns structured feedback so the generator can retry with
 * a targeted fix prompt.
 */

import type { CanvasGenerationType } from '@/components/canvas/prd-canvas';
import type { GraphData, GraphNode } from './diagram-layout-engine';
import type { MermaidDiagramType } from './mermaid-generator';

// ============================================================================
// TYPES
// ============================================================================

export interface CanvasValidationResult {
  complete: boolean;
  issues: string[];
  missingGroups: string[];
  nodeCount: number;
  minExpected: number;
  /** Structured feedback for the fix prompt */
  fixHint: string;
}

export interface MermaidValidationResult {
  complete: boolean;
  issues: string[];
  nodeCount: number;
  minExpected: number;
  fixHint: string;
}

// ============================================================================
// EXPECTED SCHEMA PER CANVAS DIAGRAM TYPE
// ============================================================================

interface GroupSpec {
  required: boolean;
  minNodes: number;
  maxNodes: number;
}

interface DiagramSpec {
  minTotalNodes: number;
  groups: Record<string, GroupSpec>;
  requiresEdges: boolean;
  minEdges: number;
}

const DIAGRAM_SPECS: Record<CanvasGenerationType, DiagramSpec> = {
  'information-architecture': {
    minTotalNodes: 20,
    requiresEdges: true,
    minEdges: 10,
    groups: {
      L1: { required: true, minNodes: 4, maxNodes: 8 },
      L2: { required: true, minNodes: 8, maxNodes: 25 },
      L3: { required: true, minNodes: 6, maxNodes: 20 },
    },
  },
  'user-flow': {
    minTotalNodes: 10,
    requiresEdges: true,
    minEdges: 8,
    groups: {
      start:    { required: true,  minNodes: 1, maxNodes: 1 },
      action:   { required: true,  minNodes: 5, maxNodes: 12 },
      decision: { required: true,  minNodes: 2, maxNodes: 5 },
      success:  { required: true,  minNodes: 1, maxNodes: 3 },
      error:    { required: false, minNodes: 1, maxNodes: 3 },
    },
  },
  'system-architecture': {
    minTotalNodes: 10,
    requiresEdges: true,
    minEdges: 5,
    groups: {
      client:   { required: true,  minNodes: 1, maxNodes: 4 },
      api:      { required: true,  minNodes: 1, maxNodes: 4 },
      service:  { required: true,  minNodes: 3, maxNodes: 8 },
      data:     { required: true,  minNodes: 1, maxNodes: 5 },
      external: { required: false, minNodes: 1, maxNodes: 5 },
    },
  },
  'data-model': {
    minTotalNodes: 5,
    requiresEdges: true,
    minEdges: 3,
    groups: {
      entity:   { required: true,  minNodes: 4, maxNodes: 8 },
      junction: { required: false, minNodes: 0, maxNodes: 3 },
    },
  },
  'feature-priority': {
    minTotalNodes: 8,
    requiresEdges: false,
    minEdges: 0,
    groups: {
      'do-first':  { required: true,  minNodes: 2, maxNodes: 5 },
      'schedule':  { required: true,  minNodes: 2, maxNodes: 5 },
      'delegate':  { required: false, minNodes: 1, maxNodes: 4 },
      'eliminate': { required: false, minNodes: 1, maxNodes: 3 },
    },
  },
  'stakeholder-map': {
    minTotalNodes: 7,
    requiresEdges: true,
    minEdges: 4,
    groups: {
      center: { required: true,  minNodes: 1, maxNodes: 1 },
      inner:  { required: true,  minNodes: 2, maxNodes: 5 },
      middle: { required: true,  minNodes: 2, maxNodes: 5 },
      outer:  { required: false, minNodes: 1, maxNodes: 4 },
    },
  },
  'risk-matrix': {
    minTotalNodes: 6,
    requiresEdges: false,
    minEdges: 0,
    groups: {
      critical: { required: true,  minNodes: 1, maxNodes: 3 },
      high:     { required: true,  minNodes: 2, maxNodes: 4 },
      medium:   { required: false, minNodes: 1, maxNodes: 4 },
      low:      { required: false, minNodes: 1, maxNodes: 3 },
    },
  },
  'sprint-planning': {
    minTotalNodes: 8,
    requiresEdges: false,
    minEdges: 0,
    groups: {
      backlog:      { required: true,  minNodes: 2, maxNodes: 4 },
      todo:         { required: true,  minNodes: 2, maxNodes: 4 },
      'in-progress':{ required: true,  minNodes: 1, maxNodes: 3 },
      done:         { required: true,  minNodes: 1, maxNodes: 3 },
    },
  },
  'journey-map': {
    minTotalNodes: 20,
    requiresEdges: true,
    minEdges: 3,
    groups: {
      stage:      { required: true,  minNodes: 4, maxNodes: 6 },
      action:     { required: true,  minNodes: 4, maxNodes: 6 },
      touchpoint: { required: true,  minNodes: 4, maxNodes: 6 },
      emotion:    { required: false, minNodes: 3, maxNodes: 6 },
      pain:       { required: false, minNodes: 3, maxNodes: 6 },
    },
  },
  'competitive-analysis': {
    minTotalNodes: 10,
    requiresEdges: false,
    minEdges: 0,
    groups: {
      header:       { required: true,  minNodes: 2, maxNodes: 5 },
      feature:      { required: true,  minNodes: 3, maxNodes: 6 },
      'cell-yes':   { required: false, minNodes: 1, maxNodes: 30 },
      'cell-no':    { required: false, minNodes: 1, maxNodes: 30 },
      'cell-partial':{ required: false, minNodes: 0, maxNodes: 30 },
    },
  },
  'release-timeline': {
    minTotalNodes: 9,
    requiresEdges: true,
    minEdges: 3,
    groups: {
      milestone: { required: true,  minNodes: 2, maxNodes: 5 },
      phase1:    { required: true,  minNodes: 2, maxNodes: 5 },
      phase2:    { required: true,  minNodes: 2, maxNodes: 5 },
      phase3:    { required: false, minNodes: 1, maxNodes: 4 },
    },
  },
  'api-design': {
    minTotalNodes: 8,
    requiresEdges: true,
    minEdges: 4,
    groups: {
      gateway: { required: true,  minNodes: 1, maxNodes: 1 },
      auth:    { required: true,  minNodes: 1, maxNodes: 1 },
      get:     { required: true,  minNodes: 2, maxNodes: 5 },
      post:    { required: false, minNodes: 1, maxNodes: 4 },
      put:     { required: false, minNodes: 1, maxNodes: 3 },
      delete:  { required: false, minNodes: 1, maxNodes: 2 },
    },
  },
  'wireframe': {
    minTotalNodes: 12,
    requiresEdges: true,
    minEdges: 2,
    groups: {
      screen:     { required: true,  minNodes: 1, maxNodes: 1 },
      topbar:     { required: true,  minNodes: 1, maxNodes: 1 },
      sidebar:    { required: false, minNodes: 0, maxNodes: 1 },
      breadcrumb: { required: false, minNodes: 0, maxNodes: 1 },
      toolbar:    { required: false, minNodes: 0, maxNodes: 1 },
      card:       { required: true,  minNodes: 2, maxNodes: 6 },
      table:      { required: false, minNodes: 0, maxNodes: 2 },
      form:       { required: false, minNodes: 0, maxNodes: 2 },
      modal:      { required: false, minNodes: 0, maxNodes: 1 },
      button:     { required: true,  minNodes: 1, maxNodes: 5 },
      badge:      { required: false, minNodes: 0, maxNodes: 5 },
      empty:      { required: false, minNodes: 0, maxNodes: 1 },
      footer:     { required: false, minNodes: 0, maxNodes: 1 },
    },
  },
  'edge-cases': {
    minTotalNodes: 12,
    requiresEdges: true,
    minEdges: 3,
    groups: {
      category: { required: true,  minNodes: 2, maxNodes: 5 },
      normal:   { required: true,  minNodes: 2, maxNodes: 5 },
      edge:     { required: true,  minNodes: 2, maxNodes: 5 },
      error:    { required: true,  minNodes: 2, maxNodes: 5 },
      recovery: { required: false, minNodes: 1, maxNodes: 5 },
    },
  },
  'persona': {
    minTotalNodes: 5,
    requiresEdges: false,
    minEdges: 0,
    groups: {
      avatar:       { required: true,  minNodes: 1, maxNodes: 1 },
      name:         { required: true,  minNodes: 1, maxNodes: 1 },
      demographics: { required: true,  minNodes: 1, maxNodes: 1 },
      goals:        { required: true,  minNodes: 1, maxNodes: 2 },
      pains:        { required: false, minNodes: 1, maxNodes: 2 },
      behaviors:    { required: false, minNodes: 1, maxNodes: 2 },
    },
  },
};

// ============================================================================
// CANVAS DIAGRAM VALIDATOR
// ============================================================================

/**
 * Validate completeness of a canvas/Excalidraw diagram against the PRD.
 */
export function validateCanvasDiagram(
  graphData: GraphData,
  prdContent: string,
  type: CanvasGenerationType
): CanvasValidationResult {
  const spec = DIAGRAM_SPECS[type];
  const issues: string[] = [];
  const missingGroups: string[] = [];

  // Count nodes per group
  const groupCounts: Record<string, number> = {};
  for (const node of graphData.nodes) {
    groupCounts[node.group] = (groupCounts[node.group] || 0) + 1;
  }

  const nodeCount = graphData.nodes.length;

  // 1. Check total node count
  if (nodeCount < spec.minTotalNodes) {
    issues.push(
      `Only ${nodeCount} nodes generated, expected at least ${spec.minTotalNodes}. ` +
      `Extract ALL relevant items from the PRD — do not summarize or truncate.`
    );
  }

  // 2. Check required groups
  for (const [groupName, groupSpec] of Object.entries(spec.groups)) {
    const count = groupCounts[groupName] || 0;
    if (groupSpec.required && count === 0) {
      missingGroups.push(groupName);
      issues.push(`Missing required group "${groupName}" — must have at least ${groupSpec.minNodes} node(s).`);
    } else if (count > 0 && count < groupSpec.minNodes) {
      issues.push(
        `Group "${groupName}" has only ${count} node(s), expected at least ${groupSpec.minNodes}. Add more.`
      );
    }
  }

  // 3. Check edges
  if (spec.requiresEdges && graphData.edges.length < spec.minEdges) {
    issues.push(
      `Only ${graphData.edges.length} edges generated, expected at least ${spec.minEdges}. ` +
      `Add edges to connect all related nodes.`
    );
  }

  // 4. Check PRD keyword coverage (spot-check that labels reference real content)
  const prdKeywords = extractSignificantKeywords(prdContent, 10);
  const allLabels = graphData.nodes.map(n => n.label.toLowerCase()).join(' ');
  const matchedKeywords = prdKeywords.filter(kw => allLabels.includes(kw.toLowerCase()));

  if (prdKeywords.length > 3 && matchedKeywords.length < Math.ceil(prdKeywords.length * 0.3)) {
    issues.push(
      `Diagram labels do not reflect actual PRD content. ` +
      `Expected to see terms like: ${prdKeywords.slice(0, 5).join(', ')}. ` +
      `Use ACTUAL names from the PRD, not generic placeholders.`
    );
  }

  const complete = issues.length === 0;

  // Build a targeted fix hint for the retry prompt
  const fixHint = buildCanvasFixHint(issues, missingGroups, nodeCount, spec.minTotalNodes, prdKeywords);

  return {
    complete,
    issues,
    missingGroups,
    nodeCount,
    minExpected: spec.minTotalNodes,
    fixHint,
  };
}

function buildCanvasFixHint(
  issues: string[],
  missingGroups: string[],
  nodeCount: number,
  minExpected: number,
  prdKeywords: string[]
): string {
  if (issues.length === 0) return '';

  const lines: string[] = [
    '## ⚠️ Previous generation was INCOMPLETE. You MUST fix all issues below:\n',
  ];

  lines.push(`### Issues Found (${issues.length} total):`);
  issues.forEach((issue, i) => {
    lines.push(`${i + 1}. ${issue}`);
  });

  if (missingGroups.length > 0) {
    lines.push(`\n### Missing Groups (REQUIRED):`);
    lines.push(`These groups had zero nodes but are REQUIRED: ${missingGroups.join(', ')}`);
    lines.push(`You MUST include nodes for every required group.`);
  }

  if (nodeCount < minExpected) {
    lines.push(`\n### Node Count:`);
    lines.push(`Generated: ${nodeCount} | Required minimum: ${minExpected}`);
    lines.push(`You must add ${minExpected - nodeCount} more nodes. Extract everything from the PRD.`);
  }

  if (prdKeywords.length > 0) {
    lines.push(`\n### PRD Content to Include:`);
    lines.push(`Make sure your nodes reference these concepts from the PRD: ${prdKeywords.slice(0, 8).join(', ')}`);
  }

  lines.push(`\n### Requirements:`);
  lines.push(`- Output a COMPLETE JSON with ALL required groups populated`);
  lines.push(`- Do NOT truncate — include every relevant item from the PRD`);
  lines.push(`- Use ACTUAL names and terms from the PRD content, not generic placeholders`);

  return lines.join('\n');
}

// ============================================================================
// MERMAID DIAGRAM VALIDATOR
// ============================================================================

const MERMAID_MIN_SPECS: Record<MermaidDiagramType, { minNodes: number; minArrows: number }> = {
  flowchart:       { minNodes: 4, minArrows: 3 },
  sequenceDiagram: { minNodes: 3, minArrows: 3 },
};

/**
 * Validate completeness of a Mermaid diagram.
 */
export function validateMermaidCompleteness(
  diagram: string,
  prdContent: string,
  type: MermaidDiagramType
): MermaidValidationResult {
  const spec = MERMAID_MIN_SPECS[type];
  const issues: string[] = [];
  const lines = diagram.split('\n').filter(l => l.trim() && !l.trim().startsWith('%%'));

  let nodeCount = 0;
  let arrowCount = 0;

  if (type === 'flowchart') {
    // Count unique node IDs (word chars followed by bracket shapes)
    const nodePattern = /\b([A-Za-z_]\w*)\s*[\[({>]/g;
    const nodeIds = new Set<string>();
    for (const line of lines) {
      let m;
      while ((m = nodePattern.exec(line)) !== null) {
        nodeIds.add(m[1]);
      }
    }
    // Also count nodes that appear only as targets (no shape bracket)
    const arrowTargetPattern = /--[->]+(?:\|[^|]*\|)?\s*([A-Za-z_]\w*)/g;
    for (const line of lines) {
      let m;
      while ((m = arrowTargetPattern.exec(line)) !== null) {
        nodeIds.add(m[1]);
      }
    }
    nodeCount = nodeIds.size;

    // Count arrows
    const arrowPattern = /--[->]+/g;
    for (const line of lines) {
      const matches = line.match(arrowPattern);
      if (matches) arrowCount += matches.length;
    }

    // Check for dangling arrows (line ending with --> or arrow without target)
    const danglingPattern = /--[->]+\s*$/;
    const danglingLines = lines.filter(l => danglingPattern.test(l.trim()));
    if (danglingLines.length > 0) {
      issues.push(
        `${danglingLines.length} dangling arrow(s) found (arrows with no target node). ` +
        `Every arrow must connect two nodes: \`A --> B\`.`
      );
    }
  } else if (type === 'sequenceDiagram') {
    // Count participants
    const participantPattern = /^\s*participant\s+/i;
    nodeCount = lines.filter(l => participantPattern.test(l)).length;

    // Count messages
    const messagePattern = /->>/;
    arrowCount = lines.filter(l => messagePattern.test(l)).length;
  }

  if (nodeCount < spec.minNodes) {
    issues.push(
      `Only ${nodeCount} nodes/participants detected, expected at least ${spec.minNodes}. ` +
      `Add more nodes that represent the actual steps/actors from the PRD.`
    );
  }

  if (arrowCount < spec.minArrows) {
    issues.push(
      `Only ${arrowCount} connections found, expected at least ${spec.minArrows}. ` +
      `Connect all nodes with arrows to show the full flow.`
    );
  }

  // PRD keyword coverage
  const prdKeywords = extractSignificantKeywords(prdContent, 8);
  const diagramText = diagram.toLowerCase();
  const matchedKeywords = prdKeywords.filter(kw => diagramText.includes(kw.toLowerCase()));

  if (prdKeywords.length > 3 && matchedKeywords.length < Math.ceil(prdKeywords.length * 0.25)) {
    issues.push(
      `Diagram does not reflect PRD content. ` +
      `Expected to see references to: ${prdKeywords.slice(0, 5).join(', ')}.`
    );
  }

  const complete = issues.length === 0;

  const fixHint = buildMermaidFixHint(issues, nodeCount, spec.minNodes, arrowCount, spec.minArrows, prdKeywords);

  return {
    complete,
    issues,
    nodeCount,
    minExpected: spec.minNodes,
    fixHint,
  };
}

function buildMermaidFixHint(
  issues: string[],
  nodeCount: number,
  minNodes: number,
  arrowCount: number,
  minArrows: number,
  prdKeywords: string[]
): string {
  if (issues.length === 0) return '';

  const lines: string[] = [
    '## ⚠️ Previous diagram was INCOMPLETE. Fix all issues below:\n',
  ];

  issues.forEach((issue, i) => {
    lines.push(`${i + 1}. ${issue}`);
  });

  lines.push(`\n### Requirements:`);
  lines.push(`- Minimum ${minNodes} nodes/participants`);
  lines.push(`- Minimum ${minArrows} connections/arrows`);
  lines.push(`- No dangling arrows — every arrow MUST connect exactly two nodes`);
  if (prdKeywords.length > 0) {
    lines.push(`- Include PRD concepts: ${prdKeywords.slice(0, 6).join(', ')}`);
  }
  lines.push(`- Output ONLY the \`\`\`mermaid code block — no prose`);

  return lines.join('\n');
}

// ============================================================================
// UTILITIES
// ============================================================================

/**
 * Extract significant keywords from PRD content for coverage checking.
 * Filters out common stop words and short words.
 */
function extractSignificantKeywords(content: string, limit: number): string[] {
  if (!content) return [];

  const stopWords = new Set([
    'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for',
    'of', 'with', 'by', 'from', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will', 'would',
    'could', 'should', 'may', 'might', 'must', 'shall', 'can', 'this',
    'that', 'these', 'those', 'it', 'its', 'as', 'if', 'so', 'than',
    'then', 'when', 'where', 'who', 'which', 'what', 'how', 'all', 'each',
    'any', 'both', 'few', 'more', 'most', 'other', 'some', 'such', 'no',
    'not', 'only', 'same', 'also', 'into', 'through', 'during', 'before',
    'after', 'above', 'below', 'between', 'out', 'up', 'down', 'their',
    'they', 'them', 'we', 'our', 'you', 'your', 'he', 'she', 'his', 'her',
    'user', 'users', 'system', 'feature', 'features', 'product',
  ]);

  // Extract words from headings and first sentences of paragraphs (higher signal)
  const highValueLines = content.split('\n').filter(l => l.startsWith('#') || l.trim().length > 20);
  const text = highValueLines.join(' ').toLowerCase();

  const words = text.match(/\b[a-z]{4,}\b/g) || [];
  const freq: Record<string, number> = {};

  for (const word of words) {
    if (!stopWords.has(word)) {
      freq[word] = (freq[word] || 0) + 1;
    }
  }

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([word]) => word);
}

/**
 * Pick the best result from multiple attempts based on node count.
 */
export function pickBestCanvasResult(
  attempts: Array<{ graphData: GraphData | null; score: number }>
): GraphData | null {
  const valid = attempts.filter(a => a.graphData && a.graphData.nodes.length > 0);
  if (valid.length === 0) return null;
  valid.sort((a, b) => b.score - a.score);
  return valid[0].graphData;
}

/**
 * Score a graph for completeness (higher = better).
 */
export function scoreGraphData(graphData: GraphData, type: CanvasGenerationType): number {
  const spec = DIAGRAM_SPECS[type];
  let score = graphData.nodes.length * 10;
  score += graphData.edges.length * 3;

  // Bonus for having all required groups
  const groupCounts: Record<string, number> = {};
  for (const node of graphData.nodes) {
    groupCounts[node.group] = (groupCounts[node.group] || 0) + 1;
  }
  for (const [groupName, groupSpec] of Object.entries(spec.groups)) {
    if (groupSpec.required && (groupCounts[groupName] || 0) >= groupSpec.minNodes) {
      score += 50;
    }
  }

  return score;
}

/**
 * Score a Mermaid diagram (higher = better).
 */
export function scoreMermaidDiagram(diagram: string): number {
  const lines = diagram.split('\n').filter(l => l.trim());
  const arrowCount = (diagram.match(/--[->]+/g) || []).length;
  const participantCount = (diagram.match(/participant\s+/gi) || []).length;
  return lines.length * 5 + arrowCount * 8 + participantCount * 10;
}
