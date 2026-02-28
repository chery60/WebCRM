'use client';

import {
  useState, useRef, useEffect, useCallback, KeyboardEvent,
} from 'react';
import { Button } from '@/components/ui/button';
import {
  Send, Loader2, AtSign, FileText, Zap, CheckSquare, X,
  ChevronLeft, Package, Bot, ChevronDown,
} from 'lucide-react';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
  DropdownMenuSeparator, DropdownMenuLabel,
} from '@/components/ui/dropdown-menu';
import { useWorkspaceNotes } from '@/lib/hooks/use-notes';
import { useTasks } from '@/lib/hooks/use-tasks';
import { usePipelines } from '@/lib/hooks/use-pipelines';
import { useFeatureRequests } from '@/lib/hooks/use-feature-requests';
import { useComponentLibraries } from '@/lib/hooks/use-component-libraries';
import { useAISettingsStore, AI_MODELS } from '@/lib/stores/ai-settings-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import type { Note, Task, Pipeline, FeatureRequest } from '@/types';

// ─── Types ────────────────────────────────────────────────────────────────────

export type MentionType = 'prd' | 'feature' | 'task';

export interface MentionItem {
  id: string;
  type: MentionType;
  title: string;
  subtitle?: string;
  data: Record<string, unknown>;
}

export interface ChatConfig {
  libraryId: string;
  provider: string;
  model: string;
}

interface DropdownEntry {
  id: string;
  type: MentionType;
  label: string;
  subtitle?: string;
  data: Record<string, unknown>;
}

type BrowseView =
  | { mode: 'root' }
  | { mode: 'pipeline-list' }
  | { mode: 'feature-list'; pipelineId: string; pipelineName: string };

interface PrototypeChatInputProps {
  onSend: (message: string, mentions: MentionItem[], config: ChatConfig) => void;
  isLoading: boolean;
  mentions: MentionItem[];
  onRemoveMention: (id: string) => void;
  onAddMention: (item: MentionItem) => void;
  initialConfig?: Partial<ChatConfig>;
}

// ─── Icon / colour maps ───────────────────────────────────────────────────────

const TYPE_ICONS: Record<MentionType, React.ElementType> = {
  prd: FileText,
  feature: Zap,
  task: CheckSquare,
};

const TYPE_COLORS: Record<MentionType, string> = {
  prd: 'bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-200 dark:border-blue-800',
  feature: 'bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-200 dark:border-purple-800',
  task: 'bg-green-500/15 text-green-600 dark:text-green-400 border-green-200 dark:border-green-800',
};

// ─── Feature sub-panel ────────────────────────────────────────────────────────

function FeaturePanel({
  pipelineId, pipelineName, query, alreadyAdded, onSelect, onBack,
}: {
  pipelineId: string;
  pipelineName: string;
  query: string;
  alreadyAdded: (id: string) => boolean;
  onSelect: (e: DropdownEntry) => void;
  onBack: () => void;
}) {
  const { data: features = [], isLoading } = useFeatureRequests(pipelineId);

  const filtered = query.trim()
    ? features.filter((f: FeatureRequest) =>
        f.title.toLowerCase().includes(query.toLowerCase()) ||
        (f.description ?? '').toLowerCase().includes(query.toLowerCase())
      )
    : features;

  return (
    <>
      <button
        type="button"
        onClick={onBack}
        className="flex items-center gap-1 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border-b border-border w-full"
      >
        <ChevronLeft className="w-3 h-3" />
        Back · <span className="font-medium text-foreground">{pipelineName}</span>
      </button>
      {isLoading ? (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="px-3 py-4 text-xs text-muted-foreground text-center">
          No features found
        </div>
      ) : (
        filtered.map((f: FeatureRequest) => (
          <button
            key={f.id}
            type="button"
            disabled={alreadyAdded(f.id)}
            onClick={() =>
              onSelect({
                id: f.id,
                type: 'feature',
                label: f.title,
                subtitle: f.status ?? '',
                data: { type: 'feature', id: f.id, title: f.title, description: f.description, status: f.status, priority: f.priority },
              })
            }
            className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors disabled:opacity-40 text-left"
          >
            <div className="p-1 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 shrink-0">
              <Zap className="w-3 h-3" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="truncate font-medium text-xs">{f.title}</div>
              {f.status && <div className="text-[10px] text-muted-foreground truncate">{f.status}</div>}
            </div>
            {alreadyAdded(f.id) && <span className="text-[10px] text-muted-foreground ml-auto shrink-0">Added</span>}
          </button>
        ))
      )}
    </>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function PrototypeChatInput({
  onSend, isLoading, mentions, onRemoveMention, onAddMention, initialConfig,
}: PrototypeChatInputProps) {
  const { providers, activeProvider } = useAISettingsStore();
  const { data: libraries = [] } = useComponentLibraries();

  // Config state (library + model)
  const [libraryId, setLibraryId] = useState<string>(initialConfig?.libraryId || 'none');
  const [provider, setProvider] = useState<string>(initialConfig?.provider || activeProvider || 'openai');
  const [model, setModel] = useState<string>(initialConfig?.model || '');

  // Text + @ mention state
  const [text, setText] = useState('');
  const [showDropdown, setShowDropdown] = useState(false);
  const [atQuery, setAtQuery] = useState('');
  const [browseView, setBrowseView] = useState<BrowseView>({ mode: 'root' });

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Data
  const { data: notes = [] } = useWorkspaceNotes();
  const { data: tasks = [] } = useTasks();
  const { data: pipelines = [] } = usePipelines();

  // Configured providers
  const configuredProviders = (Object.entries(providers) as [string, any][])
    .filter(([, cfg]) => cfg.apiKey && cfg.isEnabled)
    .map(([key]) => key);

  const modelsForProvider = (AI_MODELS as any)[provider] as { id: string; name: string; description: string }[] | undefined;
  const activeModel = model || (providers as any)[provider]?.defaultModel || modelsForProvider?.[0]?.id || '';

  // Selected library name
  const selectedLib = libraries.find((l) => l.id === libraryId);
  const selectedModelName = modelsForProvider?.find((m) => m.id === activeModel)?.name || activeModel;

  const alreadyAdded = useCallback((id: string) => mentions.some((m) => m.id === id), [mentions]);

  // Auto-resize textarea
  useEffect(() => {
    const ta = textareaRef.current;
    if (!ta) return;
    ta.style.height = 'auto';
    ta.style.height = `${Math.min(ta.scrollHeight, 160)}px`;
  }, [text]);

  // Close dropdown on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowDropdown(false);
      }
    }
    if (showDropdown) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showDropdown]);

  // Handle textarea change — detect @
  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value;
    setText(val);

    const cursorPos = e.target.selectionStart ?? val.length;
    const textBeforeCursor = val.slice(0, cursorPos);
    const lastAt = textBeforeCursor.lastIndexOf('@');

    if (lastAt !== -1) {
      const query = textBeforeCursor.slice(lastAt + 1);
      if (!query.includes(' ') || query.length === 0) {
        setAtQuery(query);
        setShowDropdown(true);
        setBrowseView({ mode: 'root' });
        return;
      }
    }
    setShowDropdown(false);
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
    if (e.key === 'Escape') setShowDropdown(false);
  };

  const selectMention = (entry: DropdownEntry) => {
    // Strip the @query from text
    const cursorPos = textareaRef.current?.selectionStart ?? text.length;
    const textBefore = text.slice(0, cursorPos);
    const lastAt = textBefore.lastIndexOf('@');
    const newText = lastAt !== -1 ? text.slice(0, lastAt) + text.slice(cursorPos) : text;
    setText(newText);
    setShowDropdown(false);
    setAtQuery('');
    setBrowseView({ mode: 'root' });

    onAddMention({
      id: entry.id,
      type: entry.type,
      title: entry.label,
      subtitle: entry.subtitle,
      data: entry.data,
    });
    setTimeout(() => textareaRef.current?.focus(), 0);
  };

  const handleSend = () => {
    if ((!text.trim() && mentions.length === 0) || isLoading) return;
    onSend(text.trim(), mentions, { libraryId, provider, model: activeModel });
    setText('');
  };

  // ── Dropdown content ──────────────────────────────────────────────────────

  const filteredNotes = notes
    .filter((n: Note) =>
      !alreadyAdded(n.id) &&
      (atQuery === '' || (n.title ?? '').toLowerCase().includes(atQuery.toLowerCase()))
    )
    .slice(0, 6);

  const filteredTasks = tasks
    .filter((t: Task) =>
      !alreadyAdded(t.id) &&
      (atQuery === '' || (t.title ?? '').toLowerCase().includes(atQuery.toLowerCase()))
    )
    .slice(0, 6);

  const filteredPipelines = pipelines
    .filter((p: Pipeline) =>
      atQuery === '' || (p.name ?? '').toLowerCase().includes(atQuery.toLowerCase())
    )
    .slice(0, 6);

  function renderDropdownContent() {
    if (browseView.mode === 'feature-list') {
      return (
        <FeaturePanel
          pipelineId={browseView.pipelineId}
          pipelineName={browseView.pipelineName}
          query={atQuery}
          alreadyAdded={alreadyAdded}
          onSelect={selectMention}
          onBack={() => setBrowseView({ mode: 'pipeline-list' })}
        />
      );
    }

    if (browseView.mode === 'pipeline-list') {
      return (
        <>
          <button
            type="button"
            onClick={() => setBrowseView({ mode: 'root' })}
            className="flex items-center gap-1 px-3 py-1.5 text-xs text-muted-foreground hover:text-foreground border-b border-border w-full"
          >
            <ChevronLeft className="w-3 h-3" /> Back
          </button>
          <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
            Select a Pipeline / Roadmap
          </div>
          {filteredPipelines.length === 0 ? (
            <div className="px-3 py-4 text-xs text-muted-foreground text-center">No pipelines found</div>
          ) : (
            filteredPipelines.map((p: Pipeline) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setBrowseView({ mode: 'feature-list', pipelineId: p.id, pipelineName: p.name })}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
              >
                <div className="p-1 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 shrink-0">
                  <Zap className="w-3 h-3" />
                </div>
                <span className="flex-1 truncate text-xs font-medium">{p.name}</span>
                <ChevronLeft className="w-3 h-3 rotate-180 text-muted-foreground" />
              </button>
            ))
          )}
        </>
      );
    }

    // Root view
    const hasResults = filteredNotes.length > 0 || filteredTasks.length > 0 || filteredPipelines.length > 0;

    return (
      <>
        {!hasResults && (
          <div className="px-3 py-4 text-xs text-muted-foreground text-center">
            {atQuery ? `No results for "${atQuery}"` : 'Type to search PRDs, Features, or Tasks'}
          </div>
        )}

        {/* PRDs */}
        {filteredNotes.length > 0 && (
          <>
            <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider">
              PRDs
            </div>
            {filteredNotes.map((n: Note) => (
              <button
                key={n.id}
                type="button"
                onClick={() =>
                  selectMention({
                    id: n.id,
                    type: 'prd',
                    label: n.title || 'Untitled PRD',
                    subtitle: n.projectId ? `Project: ${n.projectId}` : undefined,
                    data: { type: 'prd', id: n.id, title: n.title, content: n.content },
                  })
                }
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
              >
                <div className="p-1 rounded bg-blue-500/15 text-blue-600 dark:text-blue-400 shrink-0">
                  <FileText className="w-3 h-3" />
                </div>
                <span className="flex-1 truncate text-xs font-medium">{n.title || 'Untitled PRD'}</span>
              </button>
            ))}
          </>
        )}

        {/* Features (via pipelines) */}
        {filteredPipelines.length > 0 && (
          <>
            <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider border-t border-border mt-1 pt-2">
              Features
            </div>
            <button
              type="button"
              onClick={() => setBrowseView({ mode: 'pipeline-list' })}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
            >
              <div className="p-1 rounded bg-purple-500/15 text-purple-600 dark:text-purple-400 shrink-0">
                <Zap className="w-3 h-3" />
              </div>
              <span className="flex-1 truncate text-xs font-medium">Browse Features by Pipeline…</span>
              <ChevronLeft className="w-3 h-3 rotate-180 text-muted-foreground" />
            </button>
          </>
        )}

        {/* Tasks */}
        {filteredTasks.length > 0 && (
          <>
            <div className="px-3 py-1.5 text-[10px] text-muted-foreground font-semibold uppercase tracking-wider border-t border-border mt-1 pt-2">
              Tasks
            </div>
            {filteredTasks.map((t: Task) => (
              <button
                key={t.id}
                type="button"
                onClick={() =>
                  selectMention({
                    id: t.id,
                    type: 'task',
                    label: t.title || 'Untitled Task',
                    subtitle: t.status,
                    data: { type: 'task', id: t.id, title: t.title, description: t.description, status: t.status },
                  })
                }
                className="flex w-full items-center gap-2 px-3 py-2 text-sm hover:bg-accent transition-colors text-left"
              >
                <div className="p-1 rounded bg-green-500/15 text-green-600 dark:text-green-400 shrink-0">
                  <CheckSquare className="w-3 h-3" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="truncate text-xs font-medium">{t.title || 'Untitled Task'}</div>
                  {t.status && <div className="text-[10px] text-muted-foreground">{t.status}</div>}
                </div>
              </button>
            ))}
          </>
        )}
      </>
    );
  }

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col border-t border-border bg-background">
      {/* Mention chips */}
      {mentions.length > 0 && (
        <div className="flex flex-wrap gap-1.5 px-3 pt-2">
          {mentions.map((m) => {
            const Icon = TYPE_ICONS[m.type];
            return (
              <span
                key={m.id}
                className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full border font-medium ${TYPE_COLORS[m.type]}`}
              >
                <Icon className="w-3 h-3 shrink-0" />
                <span className="max-w-[140px] truncate">{m.title}</span>
                <button
                  type="button"
                  onClick={() => onRemoveMention(m.id)}
                  className="ml-0.5 opacity-60 hover:opacity-100 transition-opacity"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </span>
            );
          })}
        </div>
      )}

      {/* Textarea with dropdown */}
      <div className="relative px-3 pt-2">
        {/* @ dropdown */}
        {showDropdown && (
          <div
            ref={dropdownRef}
            className="absolute bottom-full left-3 right-3 mb-1 z-50 bg-popover border border-border rounded-xl shadow-xl overflow-hidden"
            style={{ maxHeight: 280 }}
          >
            <div className="px-3 py-2 border-b border-border bg-muted/30 flex items-center gap-1.5">
              <AtSign className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs text-muted-foreground font-medium">Add context</span>
              {atQuery && (
                <span className="text-xs text-foreground font-mono bg-muted px-1.5 py-0.5 rounded ml-1">
                  {atQuery}
                </span>
              )}
            </div>
            <div className="overflow-y-auto" style={{ maxHeight: 230 }}>
              {renderDropdownContent()}
            </div>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          placeholder="Describe the UI you want to build… press @ to add context"
          rows={3}
          className="w-full px-0 py-2 text-sm bg-transparent resize-none outline-none placeholder:text-muted-foreground leading-relaxed min-h-[72px] max-h-[160px]"
        />
      </div>

      {/* Bottom toolbar: library | model | send */}
      <div className="flex items-center gap-2 px-3 pb-3 pt-1">
        {/* Library selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs border border-border bg-muted/40 hover:bg-muted transition-colors text-foreground max-w-[140px] truncate"
              title="Component Library"
            >
              <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">
                {selectedLib ? selectedLib.name : 'No library'}
              </span>
              <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 ml-0.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-56">
            <DropdownMenuLabel className="text-xs text-muted-foreground">Component Library</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => setLibraryId('none')}
              className={libraryId === 'none' ? 'bg-accent' : ''}
            >
              <span className="text-xs text-muted-foreground">None — plain Tailwind CSS</span>
            </DropdownMenuItem>
            {libraries.map((lib) => (
              <DropdownMenuItem
                key={lib.id}
                onClick={() => setLibraryId(lib.id)}
                className={libraryId === lib.id ? 'bg-accent' : ''}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <Package className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                  <span className="text-xs truncate">{lib.name}</span>
                </div>
              </DropdownMenuItem>
            ))}
            {libraries.length === 0 && (
              <div className="px-2 py-2 text-xs text-muted-foreground text-center">
                No libraries imported yet
              </div>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Model selector */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex items-center gap-1.5 h-7 px-2.5 rounded-md text-xs border border-border bg-muted/40 hover:bg-muted transition-colors text-foreground max-w-[140px] truncate"
              title="AI Model"
            >
              <Bot className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
              <span className="truncate">{selectedModelName || 'Select model'}</span>
              <ChevronDown className="w-3 h-3 text-muted-foreground shrink-0 ml-0.5" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="w-64">
            <DropdownMenuLabel className="text-xs text-muted-foreground">AI Provider & Model</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {configuredProviders.length === 0 ? (
              <div className="px-2 py-2 text-xs text-muted-foreground text-center">
                No providers configured.{' '}
                <a href="/settings/features" className="underline">Settings → Features</a>
              </div>
            ) : (
              configuredProviders.map((p) => {
                const providerModels = (AI_MODELS as any)[p] as { id: string; name: string }[] | undefined;
                const providerLabel = p === 'openai' ? 'OpenAI' : p === 'anthropic' ? 'Anthropic' : 'Google Gemini';
                return (
                  <div key={p}>
                    <DropdownMenuLabel className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground py-1">
                      {providerLabel}
                    </DropdownMenuLabel>
                    {providerModels?.map((m) => (
                      <DropdownMenuItem
                        key={m.id}
                        onClick={() => { setProvider(p); setModel(m.id); }}
                        className={provider === p && activeModel === m.id ? 'bg-accent' : ''}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <Bot className="w-3.5 h-3.5 text-muted-foreground shrink-0" />
                          <span className="text-xs truncate">{m.name}</span>
                        </div>
                      </DropdownMenuItem>
                    ))}
                  </div>
                );
              })
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          disabled={(!text.trim() && mentions.length === 0) || isLoading}
          className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90 transition-colors disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
          title="Send (Enter)"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Send className="h-4 w-4" />
          )}
        </button>
      </div>

    </div>
  );
}
