/**
 * Diagram Layout Engine
 *
 * Deterministic layout engine that converts structured graph data
 * (nodes + edges) into fully valid Excalidraw elements.
 *
 * The AI's ONLY job is to extract content (labels, relationships, groups)
 * from the PRD. This engine handles ALL layout, sizing, arrow positioning,
 * and Excalidraw binding creation.
 */

import type { CanvasGenerationType } from '@/components/canvas/prd-canvas';

// ============================================================================
// TYPES
// ============================================================================

/** A node in the AI-generated graph */
export interface GraphNode {
    id: string;
    label: string;
    /** Group determines color & layout position (e.g. "L1", "action", "entity") */
    group: string;
    /** Parent node ID for hierarchical diagrams */
    parent?: string | null;
}

/** An edge in the AI-generated graph */
export interface GraphEdge {
    from: string;
    to: string;
    label?: string;
}

/** The structured graph data returned by AI */
export interface GraphData {
    title: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
}

/** Layout configuration for a diagram type */
interface LayoutConfig {
    /** How to arrange nodes */
    strategy: 'hierarchical' | 'flow' | 'grid' | 'radial' | 'columns' | 'quadrant' | 'swimlane' | 'timeline' | 'card' | 'table' | 'wireframe';
    /** Group → visual config mapping */
    groups: Record<string, GroupConfig>;
    /** Default shape type */
    defaultShape: 'rectangle' | 'ellipse' | 'diamond';
}

interface GroupConfig {
    shape: 'rectangle' | 'ellipse' | 'diamond';
    color: string;
    width: number;
    height: number;
    fontSize?: number;
}

// ============================================================================
// LAYOUT CONFIGS PER DIAGRAM TYPE
// ============================================================================

const LAYOUT_CONFIGS: Record<CanvasGenerationType, LayoutConfig> = {
    'information-architecture': {
        strategy: 'hierarchical',
        defaultShape: 'rectangle',
        groups: {
            L1: { shape: 'rectangle', color: '#e3f2fd', width: 160, height: 60 },
            L2: { shape: 'rectangle', color: '#e8f5e9', width: 140, height: 55 },
            L3: { shape: 'rectangle', color: '#f3e5f5', width: 120, height: 50 },
        },
    },
    'user-flow': {
        strategy: 'flow',
        defaultShape: 'rectangle',
        groups: {
            start: { shape: 'ellipse', color: '#e8f5e9', width: 130, height: 60 },
            action: { shape: 'rectangle', color: '#e3f2fd', width: 155, height: 60 },
            decision: { shape: 'diamond', color: '#fff3e0', width: 155, height: 85 },
            success: { shape: 'ellipse', color: '#e8f5e9', width: 140, height: 60 },
            error: { shape: 'rectangle', color: '#fce4ec', width: 140, height: 55 },
        },
    },
    'system-architecture': {
        strategy: 'hierarchical',
        defaultShape: 'rectangle',
        groups: {
            client: { shape: 'rectangle', color: '#fce4ec', width: 155, height: 60 },
            api: { shape: 'rectangle', color: '#e0f2f1', width: 155, height: 60 },
            service: { shape: 'rectangle', color: '#f3e5f5', width: 150, height: 60 },
            data: { shape: 'rectangle', color: '#e8f5e9', width: 150, height: 60 },
            external: { shape: 'rectangle', color: '#e0f2f1', width: 150, height: 60 },
        },
    },
    'data-model': {
        strategy: 'grid',
        defaultShape: 'rectangle',
        groups: {
            entity: { shape: 'rectangle', color: '#e3f2fd', width: 170, height: 70 },
            junction: { shape: 'rectangle', color: '#f3e5f5', width: 150, height: 60 },
        },
    },
    'feature-priority': {
        strategy: 'quadrant',
        defaultShape: 'rectangle',
        groups: {
            'do-first': { shape: 'rectangle', color: '#e8f5e9', width: 150, height: 45 },
            'schedule': { shape: 'rectangle', color: '#e3f2fd', width: 150, height: 45 },
            'delegate': { shape: 'rectangle', color: '#fff3e0', width: 150, height: 45 },
            'eliminate': { shape: 'rectangle', color: '#fce4ec', width: 150, height: 45 },
        },
    },
    'stakeholder-map': {
        strategy: 'radial',
        defaultShape: 'ellipse',
        groups: {
            center: { shape: 'ellipse', color: '#e8f5e9', width: 160, height: 80 },
            inner: { shape: 'ellipse', color: '#e3f2fd', width: 140, height: 60 },
            middle: { shape: 'ellipse', color: '#fff3e0', width: 130, height: 55 },
            outer: { shape: 'ellipse', color: '#f3e5f5', width: 120, height: 50 },
        },
    },
    'risk-matrix': {
        strategy: 'grid',
        defaultShape: 'rectangle',
        groups: {
            critical: { shape: 'rectangle', color: '#fce4ec', width: 140, height: 45 },
            high: { shape: 'rectangle', color: '#fff3e0', width: 140, height: 45 },
            medium: { shape: 'rectangle', color: '#fff8e1', width: 140, height: 45 },
            low: { shape: 'rectangle', color: '#e8f5e9', width: 140, height: 45 },
        },
    },
    'sprint-planning': {
        strategy: 'columns',
        defaultShape: 'rectangle',
        groups: {
            backlog: { shape: 'rectangle', color: '#fff3e0', width: 170, height: 60 },
            todo: { shape: 'rectangle', color: '#e3f2fd', width: 170, height: 60 },
            'in-progress': { shape: 'rectangle', color: '#fff8e1', width: 170, height: 60 },
            done: { shape: 'rectangle', color: '#e8f5e9', width: 170, height: 60 },
        },
    },
    'journey-map': {
        strategy: 'swimlane',
        defaultShape: 'rectangle',
        groups: {
            stage: { shape: 'rectangle', color: '#e3f2fd', width: 150, height: 50 },
            action: { shape: 'rectangle', color: '#e8f5e9', width: 150, height: 50 },
            touchpoint: { shape: 'rectangle', color: '#fff3e0', width: 150, height: 50 },
            emotion: { shape: 'rectangle', color: '#fff8e1', width: 150, height: 50 },
            pain: { shape: 'rectangle', color: '#fce4ec', width: 150, height: 50 },
        },
    },
    'competitive-analysis': {
        strategy: 'table',
        defaultShape: 'rectangle',
        groups: {
            header: { shape: 'rectangle', color: '#e3f2fd', width: 160, height: 50 },
            feature: { shape: 'rectangle', color: '#f5f5f5', width: 160, height: 50 },
            cell: { shape: 'rectangle', color: '#ffffff', width: 120, height: 45 },
            'cell-yes': { shape: 'rectangle', color: '#e8f5e9', width: 120, height: 45 },
            'cell-no': { shape: 'rectangle', color: '#fce4ec', width: 120, height: 45 },
            'cell-partial': { shape: 'rectangle', color: '#fff3e0', width: 120, height: 45 },
        },
    },
    'release-timeline': {
        strategy: 'timeline',
        defaultShape: 'rectangle',
        groups: {
            milestone: { shape: 'diamond', color: '#fff3e0', width: 120, height: 70 },
            phase1: { shape: 'rectangle', color: '#e8f5e9', width: 150, height: 50 },
            phase2: { shape: 'rectangle', color: '#e3f2fd', width: 150, height: 50 },
            phase3: { shape: 'rectangle', color: '#f3e5f5', width: 150, height: 50 },
        },
    },
    'api-design': {
        strategy: 'hierarchical',
        defaultShape: 'rectangle',
        groups: {
            gateway: { shape: 'rectangle', color: '#e3f2fd', width: 180, height: 55 },
            auth: { shape: 'rectangle', color: '#e0f2f1', width: 170, height: 55 },
            get: { shape: 'rectangle', color: '#e8f5e9', width: 160, height: 50 },
            post: { shape: 'rectangle', color: '#e3f2fd', width: 160, height: 50 },
            put: { shape: 'rectangle', color: '#fff3e0', width: 160, height: 50 },
            delete: { shape: 'rectangle', color: '#fce4ec', width: 160, height: 50 },
        },
    },
    'wireframe': {
        strategy: 'wireframe',
        defaultShape: 'rectangle',
        groups: {
            screen:     { shape: 'rectangle', color: '#ffffff', width: 1060, height: 760, fontSize: 13 },
            topbar:     { shape: 'rectangle', color: '#1e293b', width: 1040, height: 56, fontSize: 13 },
            sidebar:    { shape: 'rectangle', color: '#f1f5f9', width: 200,  height: 660, fontSize: 13 },
            breadcrumb: { shape: 'rectangle', color: '#f8fafc', width: 810,  height: 38,  fontSize: 13 },
            toolbar:    { shape: 'rectangle', color: '#f1f5f9', width: 810,  height: 48,  fontSize: 13 },
            card:       { shape: 'rectangle', color: '#f8fafc', width: 220,  height: 110, fontSize: 12 },
            table:      { shape: 'rectangle', color: '#ffffff', width: 810,  height: 160, fontSize: 12 },
            form:       { shape: 'rectangle', color: '#fafafa', width: 380,  height: 200, fontSize: 12 },
            modal:      { shape: 'rectangle', color: '#ffffff', width: 420,  height: 260, fontSize: 13 },
            button:     { shape: 'rectangle', color: '#3b82f6', width: 150,  height: 40,  fontSize: 13 },
            badge:      { shape: 'rectangle', color: '#dcfce7', width: 100,  height: 30,  fontSize: 11 },
            empty:      { shape: 'rectangle', color: '#f8fafc', width: 400,  height: 120, fontSize: 13 },
            footer:     { shape: 'rectangle', color: '#f1f5f9', width: 1040, height: 44,  fontSize: 12 },
        },
    },
    'edge-cases': {
        strategy: 'columns',
        defaultShape: 'rectangle',
        groups: {
            category: { shape: 'rectangle', color: '#e3f2fd', width: 160, height: 55 },
            normal: { shape: 'rectangle', color: '#e8f5e9', width: 150, height: 50 },
            edge: { shape: 'rectangle', color: '#fff3e0', width: 150, height: 50 },
            error: { shape: 'rectangle', color: '#fce4ec', width: 150, height: 50 },
            recovery: { shape: 'rectangle', color: '#e0f2f1', width: 150, height: 50 },
        },
    },
    'persona': {
        strategy: 'card',
        defaultShape: 'rectangle',
        groups: {
            avatar: { shape: 'ellipse', color: '#e0f2f1', width: 100, height: 100 },
            name: { shape: 'rectangle', color: '#f5f5f5', width: 300, height: 50 },
            demographics: { shape: 'rectangle', color: '#f5f5f5', width: 300, height: 50 },
            goals: { shape: 'rectangle', color: '#e8f5e9', width: 300, height: 80 },
            pains: { shape: 'rectangle', color: '#fce4ec', width: 300, height: 80 },
            behaviors: { shape: 'rectangle', color: '#e3f2fd', width: 300, height: 80 },
        },
    },
};

// ============================================================================
// MAIN LAYOUT FUNCTION
// ============================================================================

/**
 * Convert structured graph data into valid Excalidraw elements.
 * This is the core of the two-phase architecture.
 */
export function layoutDiagram(
    graph: GraphData,
    diagramType: CanvasGenerationType,
    offsetX = 0,
    offsetY = 0
): any[] {
    const config = LAYOUT_CONFIGS[diagramType];
    if (!config) {
        console.error(`[LayoutEngine] No config for diagram type: ${diagramType}`);
        return [];
    }

    // Compute positions for each node based on layout strategy
    const positions = computePositions(graph, config, diagramType);

    // Build Excalidraw elements
    const elements: any[] = [];
    const idMap = new Map<string, string>(); // graph ID → excalidraw ID
    const timestamp = Date.now();
    let idx = 0;

    // 1. Title element
    elements.push(createTextElement({
        id: `title-${timestamp}`,
        x: 350 + offsetX,
        y: 20 + offsetY,
        text: graph.title,
        fontSize: 24,
    }));
    idx++;

    // 2. Shape elements with bound text
    for (const node of graph.nodes) {
        const pos = positions.get(node.id);
        if (!pos) continue;

        const groupConfig = config.groups[node.group] || {
            shape: config.defaultShape,
            color: '#e3f2fd',
            width: 150,
            height: 60,
        };

        const excalidrawId = `el-${timestamp}-${idx}`;
        const textId = `el-${timestamp}-${idx}-text`;
        idMap.set(node.id, excalidrawId);

        const x = pos.x + offsetX;
        const y = pos.y + offsetY;
        const w = groupConfig.width;
        const h = groupConfig.height;

        // Create shape
        elements.push(createShapeElement({
            id: excalidrawId,
            type: groupConfig.shape,
            x, y, width: w, height: h,
            backgroundColor: groupConfig.color,
            boundTextId: textId,
            group: node.group,
        }));

        // Create bound text
        elements.push(createBoundTextElement({
            id: textId,
            containerId: excalidrawId,
            x, y, width: w, height: h,
            text: node.label,
            fontSize: groupConfig.fontSize || 14,
            group: node.group,
        }));

        idx++;
    }

    // 3. Arrow elements with proper bindings
    // For wireframe diagrams, containment edges (screen→topbar etc.) are purely
    // structural — skip drawing visible arrows for them so the canvas stays clean.
    const isWireframe = diagramType === 'wireframe';
    const wireframeContainerGroups = new Set(['screen', 'toolbar', 'card', 'form', 'modal']);

    for (const edge of graph.edges) {
        const fromId = idMap.get(edge.from);
        const toId = idMap.get(edge.to);
        if (!fromId || !toId) continue;

        const fromEl = elements.find(e => e.id === fromId);
        const toEl = elements.find(e => e.id === toId);
        if (!fromEl || !toEl) continue;

        // For wireframe: skip arrows from structural container groups
        if (isWireframe) {
            const fromNode = graph.nodes.find(n => n.id === edge.from);
            if (fromNode && wireframeContainerGroups.has(fromNode.group)) {
                // Don't draw an arrow — the spatial layout already communicates containment
                idx++;
                continue;
            }
        }

        const arrowId = `arrow-${timestamp}-${idx}`;

        const arrowData = computeArrow(fromEl, toEl, arrowId);
        elements.push(arrowData.arrow);

        // Add arrow to both shapes' boundElements
        addBoundArrow(fromEl, arrowId);
        addBoundArrow(toEl, arrowId);

        idx++;
    }

    return elements;
}

// ============================================================================
// POSITION COMPUTATION
// ============================================================================

function computePositions(
    graph: GraphData,
    config: LayoutConfig,
    _diagramType: CanvasGenerationType
): Map<string, { x: number; y: number }> {
    switch (config.strategy) {
        case 'hierarchical':
            return layoutHierarchical(graph, config);
        case 'flow':
            return layoutFlow(graph, config);
        case 'grid':
            return layoutGrid(graph, config);
        case 'radial':
            return layoutRadial(graph, config);
        case 'columns':
            return layoutColumns(graph, config);
        case 'quadrant':
            return layoutQuadrant(graph, config);
        case 'swimlane':
            return layoutSwimlane(graph, config);
        case 'timeline':
            return layoutTimeline(graph, config);
        case 'table':
            return layoutTable(graph, config);
        case 'card':
            return layoutCard(graph, config);
        case 'wireframe':
            return layoutWireframe(graph, config);
        default:
            return layoutGrid(graph, config);
    }
}

// ─── Hierarchical (tree: IA, system arch, API design) ────────────────────────

function layoutHierarchical(
    graph: GraphData,
    config: LayoutConfig
): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();
    const groupNames = Object.keys(config.groups);

    // Group nodes by their group
    const byGroup = new Map<string, GraphNode[]>();
    for (const node of graph.nodes) {
        const arr = byGroup.get(node.group) || [];
        arr.push(node);
        byGroup.set(node.group, arr);
    }

    // Layout each group as a horizontal row
    const yStart = 80;
    const ySpacing = 140;

    let groupIdx = 0;
    for (const groupName of groupNames) {
        const nodes = byGroup.get(groupName) || [];
        if (nodes.length === 0) { groupIdx++; continue; }

        const gc = config.groups[groupName];
        const y = yStart + groupIdx * ySpacing;
        const totalWidth = nodes.length * (gc.width + 30) - 30;
        const startX = Math.max(80, (1200 - totalWidth) / 2); // center

        nodes.forEach((node, i) => {
            positions.set(node.id, {
                x: startX + i * (gc.width + 30),
                y,
            });
        });
        groupIdx++;
    }

    return positions;
}

// ─── Flow (left→right, multi-row) ────────────────────────────────────────────

function layoutFlow(
    graph: GraphData,
    config: LayoutConfig
): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();

    const maxPerRow = 5;
    const xStart = 80;
    const yStart = 80;
    const xSpacing = 210;
    const ySpacing = 150;

    let col = 0;
    let row = 0;

    for (const node of graph.nodes) {
        const gc = config.groups[node.group] || { width: 150, height: 60 };
        positions.set(node.id, {
            x: xStart + col * xSpacing,
            y: yStart + row * ySpacing,
        });

        col++;
        if (col >= maxPerRow) {
            col = 0;
            row++;
        }
    }

    return positions;
}

// ─── Grid (even distribution) ────────────────────────────────────────────────

function layoutGrid(
    graph: GraphData,
    config: LayoutConfig
): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();

    const cols = Math.ceil(Math.sqrt(graph.nodes.length));
    const xSpacing = 220;
    const ySpacing = 130;
    const xStart = 80;
    const yStart = 80;

    graph.nodes.forEach((node, i) => {
        const col = i % cols;
        const row = Math.floor(i / cols);
        positions.set(node.id, {
            x: xStart + col * xSpacing,
            y: yStart + row * ySpacing,
        });
    });

    return positions;
}

// ─── Radial (stakeholder map) ────────────────────────────────────────────────

function layoutRadial(
    graph: GraphData,
    config: LayoutConfig
): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();

    const centerX = 550;
    const centerY = 350;
    const ringRadii: Record<string, number> = {
        center: 0,
        inner: 180,
        middle: 320,
        outer: 460,
    };

    // Group nodes by ring
    const byRing = new Map<string, GraphNode[]>();
    for (const node of graph.nodes) {
        const arr = byRing.get(node.group) || [];
        arr.push(node);
        byRing.set(node.group, arr);
    }

    for (const [ring, nodes] of byRing) {
        const radius = ringRadii[ring] ?? 300;
        if (radius === 0) {
            // Center
            const gc = config.groups[ring] || { width: 160, height: 80 };
            nodes.forEach(node => {
                positions.set(node.id, { x: centerX - gc.width / 2, y: centerY - gc.height / 2 });
            });
        } else {
            // Distribute around circle
            const gc = config.groups[ring] || { width: 130, height: 55 };
            nodes.forEach((node, i) => {
                const angle = (2 * Math.PI * i) / nodes.length - Math.PI / 2;
                positions.set(node.id, {
                    x: centerX + radius * Math.cos(angle) - gc.width / 2,
                    y: centerY + radius * Math.sin(angle) - gc.height / 2,
                });
            });
        }
    }

    return positions;
}

// ─── Columns (sprint board, edge cases) ──────────────────────────────────────

function layoutColumns(
    graph: GraphData,
    config: LayoutConfig
): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();
    const groupNames = Object.keys(config.groups);

    const colSpacing = 210;
    const yStart = 80;
    const yItemSpacing = 80;
    const xStart = 60;

    // Group nodes by column
    const byColumn = new Map<string, GraphNode[]>();
    for (const node of graph.nodes) {
        const arr = byColumn.get(node.group) || [];
        arr.push(node);
        byColumn.set(node.group, arr);
    }

    groupNames.forEach((groupName, colIdx) => {
        const nodes = byColumn.get(groupName) || [];
        const x = xStart + colIdx * colSpacing;

        nodes.forEach((node, rowIdx) => {
            positions.set(node.id, {
                x,
                y: yStart + rowIdx * yItemSpacing,
            });
        });
    });

    return positions;
}

// ─── Quadrant (feature priority) ─────────────────────────────────────────────

function layoutQuadrant(
    graph: GraphData,
    config: LayoutConfig
): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();

    const quadrantPositions: Record<string, { baseX: number; baseY: number }> = {
        'do-first': { baseX: 80, baseY: 100 },
        'schedule': { baseX: 480, baseY: 100 },
        'delegate': { baseX: 80, baseY: 380 },
        'eliminate': { baseX: 480, baseY: 380 },
    };

    const byQuadrant = new Map<string, GraphNode[]>();
    for (const node of graph.nodes) {
        const arr = byQuadrant.get(node.group) || [];
        arr.push(node);
        byQuadrant.set(node.group, arr);
    }

    for (const [quadrant, nodes] of byQuadrant) {
        const qPos = quadrantPositions[quadrant] || { baseX: 80, baseY: 100 };
        const cols = 2;
        nodes.forEach((node, i) => {
            const col = i % cols;
            const row = Math.floor(i / cols);
            positions.set(node.id, {
                x: qPos.baseX + col * 175,
                y: qPos.baseY + row * 65,
            });
        });
    }

    return positions;
}

// ─── Swimlane (journey map) ──────────────────────────────────────────────────

function layoutSwimlane(
    graph: GraphData,
    config: LayoutConfig
): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();
    const groupNames = Object.keys(config.groups);

    const xStart = 80;
    const xSpacing = 190;
    const yStart = 80;
    const yRowSpacing = 100;

    // Group nodes by their swim lane
    const byLane = new Map<string, GraphNode[]>();
    for (const node of graph.nodes) {
        const arr = byLane.get(node.group) || [];
        arr.push(node);
        byLane.set(node.group, arr);
    }

    groupNames.forEach((laneName, rowIdx) => {
        const nodes = byLane.get(laneName) || [];
        const y = yStart + rowIdx * yRowSpacing;

        nodes.forEach((node, colIdx) => {
            positions.set(node.id, {
                x: xStart + colIdx * xSpacing,
                y,
            });
        });
    });

    return positions;
}

// ─── Timeline (release roadmap) ──────────────────────────────────────────────

function layoutTimeline(
    graph: GraphData,
    config: LayoutConfig
): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();

    const xStart = 100;
    const xSpacing = 200;
    const timelineY = 100;

    // Separate milestones from phase items
    const milestones = graph.nodes.filter(n => n.group === 'milestone');
    const phaseNodes = graph.nodes.filter(n => n.group !== 'milestone');

    // Layout milestones on the timeline
    milestones.forEach((node, i) => {
        positions.set(node.id, {
            x: xStart + i * xSpacing,
            y: timelineY,
        });
    });

    // Layout phase items below the timeline
    const byPhase = new Map<string, GraphNode[]>();
    for (const node of phaseNodes) {
        const arr = byPhase.get(node.group) || [];
        arr.push(node);
        byPhase.set(node.group, arr);
    }

    let phaseIdx = 0;
    for (const [, nodes] of byPhase) {
        const baseX = xStart + phaseIdx * xSpacing * 1.5;
        nodes.forEach((node, i) => {
            positions.set(node.id, {
                x: baseX + (i % 3) * 170,
                y: 220 + Math.floor(i / 3) * 70,
            });
        });
        phaseIdx++;
    }

    return positions;
}

// ─── Table (competitive analysis) ────────────────────────────────────────────

function layoutTable(
    graph: GraphData,
    config: LayoutConfig
): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();

    const headers = graph.nodes.filter(n => n.group === 'header');
    const features = graph.nodes.filter(n => n.group === 'feature');
    const cells = graph.nodes.filter(n => n.group.startsWith('cell'));

    const xStart = 80;
    const yStart = 80;
    const colWidth = 150;
    const rowHeight = 60;

    // Headers in first row
    headers.forEach((node, i) => {
        positions.set(node.id, { x: xStart + i * colWidth, y: yStart });
    });

    // Feature labels in first column
    features.forEach((node, i) => {
        positions.set(node.id, { x: xStart, y: yStart + (i + 1) * rowHeight });
    });

    // Cells in grid
    const numCols = Math.max(headers.length - 1, 1);
    cells.forEach((node, i) => {
        const col = (i % numCols) + 1;
        const row = Math.floor(i / numCols) + 1;
        positions.set(node.id, {
            x: xStart + col * colWidth,
            y: yStart + row * rowHeight,
        });
    });

    return positions;
}

// ─── Wireframe (spatial UI layout) ───────────────────────────────────────────
//
//  ┌────────────────────────────────────────────────────────────┐ ← screen
//  │  [topbar: logo  nav items  ...  🔔 👤]                      │
//  ├─────────┬──────────────────────────────────────────────────┤
//  │ sidebar │ [breadcrumb]                                      │
//  │  nav 1  ├──────────────────────────────────────────────────┤
//  │  nav 2  │ [toolbar: 🔍 search  [+New]  [Filter▼]  [Sort▼]] │
//  │  nav 3  ├──────────────────────────────────────────────────┤
//  │         │ [card]  [card]  [card]  [card]   ← KPI row        │
//  │         ├──────────────────────────────────────────────────┤
//  │         │ [table / form / empty state]                      │
//  └─────────┴──────────────────────────────────────────────────┘
//  [footer: © links]
//
// Modal floats centered over the screen when present.

function layoutWireframe(
    graph: GraphData,
    config: LayoutConfig
): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();

    // ── Dimensions (match the updated GroupConfig sizes) ────────────────────
    const SCREEN_X  = 40;
    const SCREEN_Y  = 40;
    const SCREEN_W  = config.groups['screen']?.width  || 1060;
    const SCREEN_H  = config.groups['screen']?.height || 760;
    const TOPBAR_H  = config.groups['topbar']?.height || 56;
    const SIDEBAR_W = config.groups['sidebar']?.width || 200;
    const FOOTER_H  = config.groups['footer']?.height || 44;
    const PADDING   = 12;

    // Content zone flags
    const hasSidebar = graph.nodes.some(n => n.group === 'sidebar');
    const hasFooter  = graph.nodes.some(n => n.group === 'footer');

    // Content zone: right of sidebar, below topbar, above footer
    const contentX  = SCREEN_X + (hasSidebar ? SIDEBAR_W + PADDING : PADDING);
    const contentW  = SCREEN_W - (hasSidebar ? SIDEBAR_W + PADDING : PADDING) - PADDING;
    const contentY  = SCREEN_Y + TOPBAR_H + PADDING;
    const contentMaxY = SCREEN_Y + SCREEN_H - (hasFooter ? FOOTER_H + PADDING : PADDING);

    // Running Y cursor inside content zone
    let runY = contentY;

    // Track which button nodes have been positioned
    const alreadyPositioned = new Set<string>();

    // ── 1. Screen container ─────────────────────────────────────────────────
    graph.nodes.filter(n => n.group === 'screen').forEach(node => {
        positions.set(node.id, { x: SCREEN_X, y: SCREEN_Y });
    });

    // ── 2. Topbar — full-width strip at top ─────────────────────────────────
    graph.nodes.filter(n => n.group === 'topbar').forEach(node => {
        positions.set(node.id, { x: SCREEN_X + PADDING, y: SCREEN_Y + PADDING });
    });

    // ── 3. Sidebar — left column, below topbar ──────────────────────────────
    graph.nodes.filter(n => n.group === 'sidebar').forEach(node => {
        positions.set(node.id, {
            x: SCREEN_X + PADDING,
            y: SCREEN_Y + TOPBAR_H + PADDING,
        });
    });

    // ── 4. Footer — full-width strip at bottom ──────────────────────────────
    graph.nodes.filter(n => n.group === 'footer').forEach(node => {
        positions.set(node.id, {
            x: SCREEN_X + PADDING,
            y: SCREEN_Y + SCREEN_H - FOOTER_H - PADDING,
        });
    });

    // ── 5. Breadcrumb row ────────────────────────────────────────────────────
    const breadcrumbNodes = graph.nodes.filter(n => n.group === 'breadcrumb');
    if (breadcrumbNodes.length > 0) {
        const bcH = config.groups['breadcrumb']?.height || 38;
        breadcrumbNodes.forEach(node => {
            positions.set(node.id, { x: contentX, y: runY });
        });
        runY += bcH + PADDING;
    }

    // ── 6. Toolbar row ────────────────────────────────────────────────────────
    const toolbarNodes = graph.nodes.filter(n => n.group === 'toolbar');
    const toolbarH = config.groups['toolbar']?.height || 48;
    if (toolbarNodes.length > 0) {
        toolbarNodes.forEach(node => {
            positions.set(node.id, { x: contentX, y: runY });
        });
        // Toolbar-child buttons: right-aligned inside toolbar strip
        const toolbarButtonIds = new Set(
            graph.edges
                .filter(e => graph.nodes.find(n => n.id === e.from && n.group === 'toolbar'))
                .map(e => e.to)
        );
        const btnW = config.groups['button']?.width || 150;
        const btnH = config.groups['button']?.height || 40;
        let tbBtnX = contentX + contentW - btnW;
        graph.nodes
            .filter(n => n.group === 'button' && toolbarButtonIds.has(n.id))
            .forEach(node => {
                positions.set(node.id, {
                    x: tbBtnX,
                    y: runY + Math.round((toolbarH - btnH) / 2),
                });
                alreadyPositioned.add(node.id);
                tbBtnX -= (btnW + 8);
            });
        runY += toolbarH + PADDING;
    }

    // ── 7. KPI metric cards row ───────────────────────────────────────────────
    const cardNodes = graph.nodes.filter(n => n.group === 'card');
    const cardW = config.groups['card']?.width  || 220;
    const cardH = config.groups['card']?.height || 110;
    const cardGap = 14;
    const cardRowStartY = runY;

    if (cardNodes.length > 0) {
        const maxCardCols = Math.max(1, Math.floor(contentW / (cardW + cardGap)));
        cardNodes.forEach((node, i) => {
            const col = i % maxCardCols;
            const row = Math.floor(i / maxCardCols);
            positions.set(node.id, {
                x: contentX + col * (cardW + cardGap),
                y: cardRowStartY + row * (cardH + cardGap),
            });
        });
        const cardRows = Math.ceil(cardNodes.length / maxCardCols);
        runY += cardRows * (cardH + cardGap) + PADDING;
    }

    // ── 7b. Badges — top-right corner of their parent card ────────────────────
    const cardBadgeMap = new Map<string, string>(); // badgeId → cardId
    graph.edges
        .filter(e => graph.nodes.find(n => n.id === e.from && n.group === 'card'))
        .forEach(e => cardBadgeMap.set(e.to, e.from));

    const maxCardCols2 = Math.max(1, Math.floor(contentW / (cardW + cardGap)));
    let freeBadgeX = contentX;

    graph.nodes.filter(n => n.group === 'badge').forEach(node => {
        const parentCardId = cardBadgeMap.get(node.id);
        if (parentCardId) {
            const cardIdx = cardNodes.findIndex(c => c.id === parentCardId);
            if (cardIdx >= 0) {
                const col = cardIdx % maxCardCols2;
                const row = Math.floor(cardIdx / maxCardCols2);
                const badgeW = config.groups['badge']?.width || 100;
                positions.set(node.id, {
                    x: contentX + col * (cardW + cardGap) + cardW - badgeW - 6,
                    y: cardRowStartY + row * (cardH + cardGap) + 6,
                });
                return;
            }
        }
        // Free-standing badge: place in a row below cards
        positions.set(node.id, { x: freeBadgeX, y: runY });
        freeBadgeX += (config.groups['badge']?.width || 100) + 8;
    });
    // Only advance runY if there are free-standing badges
    const hasFreeBadges = graph.nodes
        .filter(n => n.group === 'badge')
        .some(n => !cardBadgeMap.has(n.id));
    if (hasFreeBadges) runY += (config.groups['badge']?.height || 30) + PADDING;

    // ── 8. Table ──────────────────────────────────────────────────────────────
    const tableNodes = graph.nodes.filter(n => n.group === 'table');
    if (tableNodes.length > 0) {
        const tableH = config.groups['table']?.height || 160;
        tableNodes.forEach((node, i) => {
            positions.set(node.id, { x: contentX, y: runY + i * (tableH + PADDING) });
        });
        runY += tableNodes.length * (tableH + PADDING) + PADDING;
    }

    // ── 9. Form panels ────────────────────────────────────────────────────────
    const formNodes = graph.nodes.filter(n => n.group === 'form');
    if (formNodes.length > 0) {
        const formH = config.groups['form']?.height || 200;
        const formW = config.groups['form']?.width  || 380;
        formNodes.forEach((node, i) => {
            positions.set(node.id, { x: contentX + i * (formW + PADDING), y: runY });
        });
        // Form-child buttons: below the form
        const formButtonIds = new Set(
            graph.edges
                .filter(e => graph.nodes.find(n => n.id === e.from && n.group === 'form'))
                .map(e => e.to)
        );
        const btnW2 = config.groups['button']?.width || 150;
        let fbX = contentX;
        graph.nodes
            .filter(n => n.group === 'button' && formButtonIds.has(n.id) && !alreadyPositioned.has(n.id))
            .forEach(node => {
                positions.set(node.id, { x: fbX, y: runY + formH + PADDING });
                alreadyPositioned.add(node.id);
                fbX += btnW2 + 10;
            });
        runY += formH + (formButtonIds.size > 0 ? (config.groups['button']?.height || 40) + PADDING * 2 : PADDING);
    }

    // ── 10. Empty state ───────────────────────────────────────────────────────
    const emptyNodes = graph.nodes.filter(n => n.group === 'empty');
    if (emptyNodes.length > 0) {
        const emptyH = config.groups['empty']?.height || 120;
        const emptyW = config.groups['empty']?.width  || 400;
        emptyNodes.forEach(node => {
            positions.set(node.id, {
                x: contentX + Math.max(0, (contentW - emptyW) / 2),
                y: runY,
            });
        });
        runY += emptyH + PADDING;
    }

    // ── 11. Modal — centered over entire screen ───────────────────────────────
    const modalNodes = graph.nodes.filter(n => n.group === 'modal');
    const modalW = config.groups['modal']?.width  || 420;
    const modalH = config.groups['modal']?.height || 260;
    modalNodes.forEach(node => {
        positions.set(node.id, {
            x: SCREEN_X + Math.round((SCREEN_W - modalW) / 2),
            y: SCREEN_Y + Math.round((SCREEN_H - modalH) / 2),
        });
    });

    // ── 12. Modal-child buttons — bottom of modal ─────────────────────────────
    if (modalNodes.length > 0) {
        const modalPos = positions.get(modalNodes[0].id);
        const modalButtonIds = new Set(
            graph.edges
                .filter(e => graph.nodes.find(n => n.id === e.from && n.group === 'modal'))
                .map(e => e.to)
        );
        const btnW3 = config.groups['button']?.width  || 150;
        const btnH3 = config.groups['button']?.height || 40;
        let mbX = (modalPos?.x ?? 0) + modalW - btnW3 - 12;
        graph.nodes
            .filter(n => n.group === 'button' && modalButtonIds.has(n.id) && !alreadyPositioned.has(n.id))
            .forEach(node => {
                positions.set(node.id, {
                    x: mbX,
                    y: (modalPos?.y ?? 0) + modalH - btnH3 - 12,
                });
                alreadyPositioned.add(node.id);
                mbX -= (btnW3 + 8);
            });
    }

    // ── 13. Remaining unpositioned buttons ────────────────────────────────────
    const btnW4 = config.groups['button']?.width || 150;
    let remBtnX = contentX;
    graph.nodes
        .filter(n => n.group === 'button' && !alreadyPositioned.has(n.id))
        .forEach(node => {
            positions.set(node.id, { x: remBtnX, y: runY });
            alreadyPositioned.add(node.id);
            remBtnX += btnW4 + 10;
        });
    if (graph.nodes.some(n => n.group === 'button' && !alreadyPositioned.has(n.id))) {
        runY += (config.groups['button']?.height || 40) + PADDING;
    }

    // ── 14. Fallback for any remaining unpositioned nodes ─────────────────────
    let fallbackX = contentX;
    let fallbackY = Math.min(runY, contentMaxY - 60);
    graph.nodes.forEach(node => {
        if (!positions.has(node.id)) {
            positions.set(node.id, { x: fallbackX, y: fallbackY });
            fallbackX += 170;
            if (fallbackX > contentX + contentW - 80) {
                fallbackX = contentX;
                fallbackY += 70;
            }
        }
    });

    return positions;
}

// ─── Card (persona) ───────────────────────────────────────────────────────────

function layoutCard(
    graph: GraphData,
    config: LayoutConfig
): Map<string, { x: number; y: number }> {
    const positions = new Map<string, { x: number; y: number }>();
    const groupNames = Object.keys(config.groups);

    let currentY = 80;
    const xCenter = 200;

    for (const groupName of groupNames) {
        const nodes = graph.nodes.filter(n => n.group === groupName);
        const gc = config.groups[groupName];

        nodes.forEach((node, i) => {
            positions.set(node.id, {
                x: xCenter + i * (gc.width + 20),
                y: currentY,
            });
        });

        if (nodes.length > 0) {
            currentY += (gc.height || 60) + 20;
        }
    }

    return positions;
}

// ============================================================================
// EXCALIDRAW ELEMENT FACTORIES
// ============================================================================

function createTextElement(opts: {
    id: string;
    x: number;
    y: number;
    text: string;
    fontSize: number;
}): any {
    const textWidth = opts.text.length * opts.fontSize * 0.6;
    return {
        id: opts.id,
        type: 'text',
        x: opts.x,
        y: opts.y,
        width: textWidth,
        height: opts.fontSize * 1.25,
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        seed: Math.floor(Math.random() * 1e9),
        groupIds: [],
        frameId: null,
        roundness: null,
        boundElements: [],
        updated: Date.now(),
        link: null,
        locked: false,
        text: opts.text,
        fontSize: opts.fontSize,
        fontFamily: 1,
        textAlign: 'left',
        verticalAlign: 'top',
        containerId: null,
        originalText: opts.text,
        lineHeight: 1.25,
        version: 1,
        versionNonce: Math.floor(Math.random() * 1e9),
        isDeleted: false,
    };
}

function createShapeElement(opts: {
    id: string;
    type: 'rectangle' | 'ellipse' | 'diamond';
    x: number;
    y: number;
    width: number;
    height: number;
    backgroundColor: string;
    boundTextId: string;
    /** Wireframe group for special stroke/fill treatment */
    group?: string;
}): any {
    // Wireframe-specific stroke colours for each zone
    const wireframeStrokes: Record<string, string> = {
        screen:     '#94a3b8',
        topbar:     '#1e293b',
        sidebar:    '#cbd5e1',
        breadcrumb: '#cbd5e1',
        toolbar:    '#cbd5e1',
        card:       '#e2e8f0',
        table:      '#e2e8f0',
        form:       '#fcd34d',
        modal:      '#94a3b8',
        button:     '#2563eb',
        badge:      '#86efac',
        empty:      '#e2e8f0',
        footer:     '#cbd5e1',
    };
    const strokeColor = opts.group && wireframeStrokes[opts.group]
        ? wireframeStrokes[opts.group]
        : '#1e1e1e';

    const strokeWidth = opts.group === 'screen' ? 2
        : opts.group === 'topbar' ? 0
        : opts.group === 'button' ? 0
        : 1;

    return {
        id: opts.id,
        type: opts.type,
        x: opts.x,
        y: opts.y,
        width: opts.width,
        height: opts.height,
        angle: 0,
        strokeColor,
        backgroundColor: opts.backgroundColor,
        fillStyle: 'solid',
        strokeWidth,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        seed: Math.floor(Math.random() * 1e9),
        groupIds: [],
        frameId: null,
        roundness: opts.type === 'rectangle'
            ? (opts.group === 'button' || opts.group === 'badge' ? { type: 3 } : null)
            : null,
        boundElements: [{ type: 'text', id: opts.boundTextId }],
        updated: Date.now(),
        link: null,
        locked: false,
        version: 1,
        versionNonce: Math.floor(Math.random() * 1e9),
        isDeleted: false,
    };
}

function createBoundTextElement(opts: {
    id: string;
    containerId: string;
    x: number;
    y: number;
    width: number;
    height: number;
    text: string;
    fontSize: number;
    /** Wireframe group for colour overrides */
    group?: string;
}): any {
    // Multi-line text: the AI uses \n as line separator
    const lines = opts.text.split('\n');
    const lineHeight = 1.3;
    const lineHeightPx = opts.fontSize * lineHeight;
    const totalTextH = lines.length * lineHeightPx;

    // For very tall containers (sidebar, form, modal) show all lines;
    // For small ones (button, badge, breadcrumb) keep a single truncated line.
    const maxLines = Math.max(1, Math.floor((opts.height - 8) / lineHeightPx));
    const visibleLines = lines.slice(0, maxLines);

    // Per-line truncation based on container width
    const charsPerLine = Math.max(10, Math.floor((opts.width - 12) / (opts.fontSize * 0.58)));
    const truncatedLines = visibleLines.map(line =>
        line.length > charsPerLine ? line.substring(0, charsPerLine - 1) + '…' : line
    );
    const displayText = truncatedLines.join('\n');

    const textWidth  = opts.width - 12;
    const textHeight = Math.min(totalTextH, opts.height - 8);

    // Colour overrides
    const textColor = opts.group === 'topbar' ? '#f8fafc'
        : opts.group === 'button'  ? '#ffffff'
        : '#1e293b';

    // Alignment
    const textAlign = (opts.group === 'topbar' || opts.group === 'toolbar' || opts.group === 'breadcrumb')
        ? 'left' : 'center';
    const verticalAlign = 'middle';

    return {
        id: opts.id,
        type: 'text',
        x: opts.x + 6,
        y: opts.y + Math.max(4, (opts.height - textHeight) / 2),
        width: textWidth,
        height: textHeight,
        angle: 0,
        strokeColor: textColor,
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 1,
        strokeStyle: 'solid',
        roughness: 0,
        opacity: 100,
        seed: Math.floor(Math.random() * 1e9),
        groupIds: [],
        frameId: null,
        roundness: null,
        boundElements: [],
        updated: Date.now(),
        link: null,
        locked: false,
        text: displayText,
        fontSize: opts.fontSize,
        fontFamily: opts.group ? 3 : 1,   // monospace for wireframe groups, hand-drawn for others
        textAlign,
        verticalAlign,
        containerId: opts.containerId,
        originalText: displayText,
        lineHeight,
        version: 1,
        versionNonce: Math.floor(Math.random() * 1e9),
        isDeleted: false,
    };
}

// ============================================================================
// ARROW COMPUTATION
// ============================================================================

function computeArrow(
    fromEl: any,
    toEl: any,
    arrowId: string
): { arrow: any } {
    // Get center points
    const fromCx = fromEl.x + fromEl.width / 2;
    const fromCy = fromEl.y + fromEl.height / 2;
    const toCx = toEl.x + toEl.width / 2;
    const toCy = toEl.y + toEl.height / 2;

    // Compute edge exit/entry points
    const startEdge = computeEdgePoint(fromEl, toCx, toCy);
    const endEdge = computeEdgePoint(toEl, fromCx, fromCy);

    const dx = endEdge.x - startEdge.x;
    const dy = endEdge.y - startEdge.y;

    const arrow: any = {
        id: arrowId,
        type: 'arrow',
        x: startEdge.x,
        y: startEdge.y,
        width: Math.max(Math.abs(dx), 1),
        height: Math.max(Math.abs(dy), 1),
        angle: 0,
        strokeColor: '#1e1e1e',
        backgroundColor: 'transparent',
        fillStyle: 'solid',
        strokeWidth: 2,
        strokeStyle: 'solid',
        roughness: 1,
        opacity: 100,
        seed: Math.floor(Math.random() * 1e9),
        groupIds: [],
        frameId: null,
        roundness: { type: 2 },
        boundElements: [],
        updated: Date.now(),
        link: null,
        locked: false,
        points: [[0, 0], [dx, dy]],
        lastCommittedPoint: [dx, dy],
        startBinding: {
            elementId: fromEl.id,
            focus: 0,
            gap: 8,
        },
        endBinding: {
            elementId: toEl.id,
            focus: 0,
            gap: 8,
        },
        startArrowhead: null,
        endArrowhead: 'arrow',
        version: 1,
        versionNonce: Math.floor(Math.random() * 1e9),
        isDeleted: false,
    };

    return { arrow };
}

/**
 * Compute the point on a shape's edge closest to a target point.
 */
function computeEdgePoint(
    shape: any,
    targetX: number,
    targetY: number
): { x: number; y: number } {
    const cx = shape.x + shape.width / 2;
    const cy = shape.y + shape.height / 2;
    const hw = shape.width / 2;
    const hh = shape.height / 2;

    const dx = targetX - cx;
    const dy = targetY - cy;

    if (dx === 0 && dy === 0) {
        return { x: cx, y: cy + hh };
    }

    if (shape.type === 'ellipse') {
        const angle = Math.atan2(dy, dx);
        return {
            x: cx + hw * Math.cos(angle),
            y: cy + hh * Math.sin(angle),
        };
    }

    // Rectangle / diamond: ray-box intersection
    const absDx = Math.abs(dx);
    const absDy = Math.abs(dy);
    const aspect = hh / (hw || 0.001);
    const slope = absDy / (absDx || 0.001);

    if (slope > aspect) {
        // Top or bottom edge
        const signY = dy > 0 ? 1 : -1;
        const edgeY = cy + signY * hh;
        const edgeX = cx + (dx / (absDy || 1)) * hh;
        return { x: edgeX, y: edgeY };
    } else {
        // Left or right edge
        const signX = dx > 0 ? 1 : -1;
        const edgeX = cx + signX * hw;
        const edgeY = cy + (dy / (absDx || 1)) * hw;
        return { x: edgeX, y: edgeY };
    }
}

/**
 * Add an arrow binding to a shape's boundElements array.
 */
function addBoundArrow(shapeEl: any, arrowId: string): void {
    if (!shapeEl.boundElements) {
        shapeEl.boundElements = [];
    }
    if (!shapeEl.boundElements.some((b: any) => b.id === arrowId)) {
        shapeEl.boundElements.push({ type: 'arrow', id: arrowId });
    }
}
