import { NextRequest, NextResponse } from 'next/server';

/**
 * Storybook / Chromatic Import API
 *
 * Supports three modes:
 * 1. PUBLIC storybook URL  → fetches /index.json or /stories.json directly
 * 2. GITHUB repo URL       → uses GitHub API to find story files and extract component names
 * 3. MANUAL JSON paste     → user pastes their stories.json content directly
 */

interface StoryEntry {
  id: string;
  name: string;
  title: string;   // e.g. "Components/Button"
  importPath?: string;
  kind?: string;
}

interface StoriesIndex {
  v: number;
  stories?: Record<string, StoryEntry>;
  entries?: Record<string, StoryEntry>;
}

interface ParsedComponent {
  name: string;
  category: string;
  filePath: string;
  description: string;
  stories: string[];
}

function parseStoriesIndex(data: StoriesIndex): ParsedComponent[] {
  const entries = data.entries || data.stories || {};
  const componentMap = new Map<string, ParsedComponent>();

  for (const entry of Object.values(entries)) {
    // title is like "Components/Button/Primary" or "UI/Forms/Input"
    const title = entry.title || entry.kind || '';
    const parts = title.split('/').map((p: string) => p.trim());
    
    // Last part before the story name is usually the component
    // e.g. "Components/Button" → category="Components", name="Button"
    // e.g. "UI/Forms/Input"   → category="UI/Forms", name="Input"
    const componentName = parts[parts.length - 1];
    const category = parts.slice(0, -1).join('/') || 'General';
    const key = title.toLowerCase().replace(/\s+/g, '-');

    if (!componentName) continue;

    if (!componentMap.has(key)) {
      componentMap.set(key, {
        name: componentName,
        category,
        filePath: entry.importPath || `src/components/${componentName}.tsx`,
        description: `${componentName} component`,
        stories: [],
      });
    }
    componentMap.get(key)!.stories.push(entry.name || entry.id);
  }

  return Array.from(componentMap.values());
}

async function fetchStorybookIndex(
  baseUrl: string,
  token?: string
): Promise<{ components: ParsedComponent[]; version: number; storyCount: number } | null> {
  const headers: Record<string, string> = {
    'Accept': 'application/json',
    'User-Agent': 'VentureAI-Platform/1.0',
  };
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['X-Storybook-Token'] = token;
  }

  // Try Storybook 7+ index.json first, then 6.x stories.json
  const endpoints = [
    `${baseUrl.replace(/\/$/, '')}/index.json`,
    `${baseUrl.replace(/\/$/, '')}/stories.json`,
  ];

  for (const url of endpoints) {
    try {
      const res = await fetch(url, {
        headers,
        signal: AbortSignal.timeout(10000),
        redirect: 'follow',
      });

      if (res.ok) {
        const data: StoriesIndex = await res.json();
        const components = parseStoriesIndex(data);
        const entries = data.entries || data.stories || {};
        return {
          components,
          version: data.v || 6,
          storyCount: Object.keys(entries).length,
        };
      }

      // Check if redirected to login page (Chromatic protected)
      if (res.status === 302 || res.status === 401 || res.status === 403) {
        return null; // protected — caller handles this
      }
    } catch {
      // try next endpoint
    }
  }

  return null;
}

async function fetchFromGitHub(
  repoUrl: string,
  token?: string
): Promise<ParsedComponent[]> {
  // Parse owner/repo from GitHub URL
  const match = repoUrl.match(/github\.com\/([^/]+)\/([^/]+)/);
  if (!match) throw new Error('Invalid GitHub URL');

  const [, owner, repo] = match;
  const repoName = repo.replace(/\.git$/, '');

  const headers: Record<string, string> = {
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'VentureAI-Platform/1.0',
  };
  if (token) headers['Authorization'] = `token ${token}`;

  // Search for story files in the repo
  const searchUrl = `https://api.github.com/search/code?q=repo:${owner}/${repoName}+extension:stories.tsx+extension:stories.ts+extension:stories.jsx+extension:stories.js`;

  const searchRes = await fetch(searchUrl, { headers });
  if (!searchRes.ok) {
    throw new Error(`GitHub API error: ${searchRes.status}`);
  }

  const searchData = await searchRes.json();
  const files: Array<{ name: string; path: string }> = searchData.items || [];

  const componentMap = new Map<string, ParsedComponent>();

  for (const file of files.slice(0, 100)) { // limit to first 100
    // Extract component name from filename like "Button.stories.tsx" → "Button"
    const componentName = file.name
      .replace(/\.stories\.(tsx?|jsx?)$/, '')
      .replace(/\.(stories)\.(tsx?|jsx?)$/, '');

    if (!componentName || componentName === 'index') continue;

    // Infer category from path
    const pathParts = file.path.split('/');
    const category = pathParts.length > 2
      ? pathParts[pathParts.length - 2]
      : 'Components';

    const key = componentName.toLowerCase();
    if (!componentMap.has(key)) {
      componentMap.set(key, {
        name: componentName,
        category,
        filePath: file.path,
        description: `${componentName} component`,
        stories: ['Default'],
      });
    }
  }

  return Array.from(componentMap.values());
}

function parseManualJson(jsonStr: string): ParsedComponent[] {
  try {
    const data: StoriesIndex = JSON.parse(jsonStr);
    return parseStoriesIndex(data);
  } catch {
    throw new Error('Invalid JSON. Paste the complete content of your stories.json or index.json file.');
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      mode,          // 'url' | 'github' | 'manual'
      url,           // storybook or chromatic URL
      githubUrl,     // github repo URL
      token,         // auth token (GitHub PAT or Storybook token)
      manualJson,    // pasted stories.json content
    } = body;

    if (mode === 'url') {
      if (!url) {
        return NextResponse.json({ error: 'URL is required' }, { status: 400 });
      }

      const result = await fetchStorybookIndex(url, token);

      if (!result) {
        // Protected — tell user to use GitHub or manual mode
        return NextResponse.json({
          error: 'protected',
          message: 'This Storybook is protected and requires authentication. Use the GitHub import or paste your stories.json manually.',
          suggestion: 'github',
        }, { status: 401 });
      }

      return NextResponse.json({
        success: true,
        mode: 'url',
        components: result.components,
        storyCount: result.storyCount,
        version: result.version,
        componentCount: result.components.length,
      });

    } else if (mode === 'github') {
      if (!githubUrl) {
        return NextResponse.json({ error: 'GitHub URL is required' }, { status: 400 });
      }

      const components = await fetchFromGitHub(githubUrl, token);
      return NextResponse.json({
        success: true,
        mode: 'github',
        components,
        storyCount: components.reduce((acc, c) => acc + c.stories.length, 0),
        componentCount: components.length,
      });

    } else if (mode === 'manual') {
      if (!manualJson) {
        return NextResponse.json({ error: 'JSON content is required' }, { status: 400 });
      }

      const components = parseManualJson(manualJson);
      return NextResponse.json({
        success: true,
        mode: 'manual',
        components,
        storyCount: components.reduce((acc, c) => acc + c.stories.length, 0),
        componentCount: components.length,
      });

    } else {
      return NextResponse.json({ error: 'Invalid mode. Use: url, github, or manual' }, { status: 400 });
    }

  } catch (error: any) {
    console.error('[StorybookImport] Error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to import from Storybook' },
      { status: 500 }
    );
  }
}
