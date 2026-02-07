'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useUIStore } from '@/lib/stores/ui-store';
import { useFeatureSettingsStore } from '@/lib/stores/feature-settings-store';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  LayoutDashboard,
  Bell,
  StickyNote,
  CheckSquare,
  Mail,
  Calendar,
  BarChart3,
  Users,
  Building2,
  Puzzle,
  Settings,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  Plus,
  FolderOpen,
} from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { WorkspaceSwitcher } from '@/components/sidebar/workspace-switcher';
import { PipelineNavSection } from '@/components/pipelines/pipeline-nav-section';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '@/lib/hooks/use-projects';
import { useMoveNoteToProject, useAllPRDs, useCreateNote, useDeleteNote } from '@/lib/hooks/use-notes';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { FileText } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MoreHorizontal, Pencil, Trash2, Folder } from 'lucide-react';
import { toast } from 'sonner';
import { CreateProjectDialog } from '@/components/projects/create-project-dialog';
import type { Project } from '@/types';

interface NavItem {
  title: string;
  href: string;
  icon: React.ElementType;
  children?: { title: string; href: string }[];
}

const mainNavItems: NavItem[] = [
  // { title: 'Dashboard', href: '/dashboard', icon: LayoutDashboard }, // TODO: Scoped out for later
  // { title: 'Notifications', href: '/notifications', icon: Bell }, // TODO: Scoped out for later
  // Notes is handled separately with projects
  { title: 'Tasks', href: '/tasks', icon: CheckSquare },
  // TODO: Emails scoped out for later
  // {
  //   title: 'Emails',
  //   href: '/emails',
  //   icon: Mail,
  //   children: [
  //     { title: 'Inbox', href: '/emails/inbox' },
  //     { title: 'Sent', href: '/emails/sent' },
  //     { title: 'Drafts', href: '/emails/drafts' },
  //   ],
  // },
  { title: 'Calendar', href: '/calendar', icon: Calendar },
];

const databaseNavItems: NavItem[] = [
  { title: 'Analytics', href: '/analytics', icon: BarChart3 },
  { title: 'Employees', href: '/employees', icon: Users },
  // { title: 'Companies', href: '/companies', icon: Building2 }, // TODO: Scoped out for later
];

const bottomNavItems: NavItem[] = [
  // { title: 'Integrations', href: '/integrations', icon: Puzzle }, // TODO: Scoped out for later
  { title: 'Settings', href: '/settings', icon: Settings },
];

function PRDNavSection({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const router = useRouter();
  const { data: projects = [] } = useProjects();
  const { currentUser } = useAuthStore();
  const { currentWorkspace } = useWorkspaceStore();
  const { data: allPRDs = [] } = useAllPRDs(currentWorkspace?.id);
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const createNote = useCreateNote();
  const moveNote = useMoveNoteToProject();
  const deleteNote = useDeleteNote();

  const [isOpen, setIsOpen] = useState(true);
  const [expandedProjects, setExpandedProjects] = useState<Set<string>>(new Set());
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [creatingPRDForProject, setCreatingPRDForProject] = useState<string | null>(null);

  // Rename dialog state
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);
  const [renameValue, setRenameValue] = useState('');

  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Drag and drop state
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  // Track last processed pathname to prevent infinite loops
  const lastProcessedPathnameRef = useRef<string>('');

  const isPRDActive = pathname.startsWith('/notes') || pathname.startsWith('/projects');

  // Group PRDs by project
  const prdsByProject = allPRDs.reduce((acc, prd) => {
    const projectId = prd.projectId || 'unassigned';
    if (!acc[projectId]) {
      acc[projectId] = [];
    }
    acc[projectId].push(prd);
    return acc;
  }, {} as Record<string, typeof allPRDs>);

  // Toggle project expansion
  const toggleProject = (projectId: string) => {
    setExpandedProjects(prev => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  // Handle drag over for drop zones
  const handleDragOver = (e: React.DragEvent, targetId: string | null) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('application/note-id')) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverTarget(targetId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);
  };

  const handleDrop = (e: React.DragEvent, projectId: string | undefined) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);

    const noteId = e.dataTransfer.getData('application/note-id');
    if (noteId) {
      const targetName = projectId
        ? projects.find(p => p.id === projectId)?.name || 'project'
        : 'Unassigned';

      moveNote.mutate(
        { noteId, projectId },
        {
          onSuccess: () => {
            toast.success(`PRD moved to ${targetName}`);
          },
          onError: () => {
            toast.error('Failed to move PRD');
          },
        }
      );
    }
  };

  // Auto-expand when PRD section is active
  useEffect(() => {
    if (isPRDActive) {
      setIsOpen(true);
    }
  }, [isPRDActive]);

  // Auto-expand project when viewing its PRD or settings
  useEffect(() => {
    // Skip if we've already processed this pathname
    if (pathname === lastProcessedPathnameRef.current) {
      return;
    }

    let projectIdToExpand: string | null = null;

    // Check if we're on a PRD page
    const prdMatch = pathname.match(/^\/notes\/([^/]+)$/);
    if (prdMatch) {
      const prdId = prdMatch[1];
      const prd = allPRDs.find(p => p.id === prdId);
      if (prd?.projectId) {
        projectIdToExpand = prd.projectId;
      }
    }
    // Check if we're on a project settings page
    if (!projectIdToExpand) {
      const projectMatch = pathname.match(/^\/projects\/([^/]+)\/settings$/);
      if (projectMatch) {
        projectIdToExpand = projectMatch[1];
      }
    }

    // Expand project if needed
    if (projectIdToExpand) {
      setExpandedProjects(prev => {
        if (prev.has(projectIdToExpand!)) {
          return prev; // Already expanded, no need to update
        }
        const next = new Set(prev);
        next.add(projectIdToExpand!);
        return next;
      });
    }

    // Update ref to mark this pathname as processed
    lastProcessedPathnameRef.current = pathname;
  }, [pathname, allPRDs]);

  const handleCreateProject = (newProject: Project) => {
    // Auto-expand the new project
    if (newProject?.id) {
      setExpandedProjects(prev => new Set(prev).add(newProject.id));
    }
  };

  const handleCreatePRD = async (projectId: string) => {
    if (!currentUser) {
      toast.error('Please sign in to create PRDs');
      return;
    }

    if (!currentWorkspace) {
      toast.error('Please select a workspace first');
      return;
    }

    setCreatingPRDForProject(projectId);
    try {
      const newPRD = await createNote.mutateAsync({
        data: {
          title: 'Untitled',
          content: '',
          tags: [],
          projectId,
          workspaceId: currentWorkspace.id,
        },
        authorId: currentUser.id,
        authorName: currentUser.name || currentUser.email,
        authorAvatar: currentUser.avatar,
      });

      if (newPRD) {
        router.push(`/notes/${newPRD.id}`);
      }
    } catch (error) {
      toast.error('Failed to create PRD');
    } finally {
      setCreatingPRDForProject(null);
    }
  };

  const handleRenameClick = (project: Project) => {
    setProjectToRename(project);
    setRenameValue(project.name);
    setShowRenameDialog(true);
  };

  const handleRenameProject = async () => {
    if (!projectToRename || !renameValue.trim()) return;
    await updateProject.mutateAsync({
      id: projectToRename.id,
      data: { name: renameValue.trim() },
    });
    setShowRenameDialog(false);
    setProjectToRename(null);
    setRenameValue('');
    toast.success('Project renamed');
  };

  const handleDeleteClick = (project: Project) => {
    setProjectToDelete(project);
    setShowDeleteDialog(true);
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    await deleteProject.mutateAsync(projectToDelete.id);
    setShowDeleteDialog(false);
    setProjectToDelete(null);
    toast.success('Project deleted');
  };

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="/projects">
            <div
              className={cn(
                'flex items-center transition-colors w-full',
                isPRDActive ? 'font-medium' : ''
              )}
              style={{
                height: '24px',
                fontSize: '16px',
                color: isPRDActive
                  ? 'var(--sidebar-text-primary)'
                  : 'var(--sidebar-text-secondary)',
                gap: '8px',
              }}
            >
              <FileText className="h-5 w-5 shrink-0" style={{ width: '20px', height: '20px' }} />
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          PRD
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full text-left">
            <div
              className={cn(
                'flex items-center transition-colors w-full',
                isPRDActive && !isOpen ? 'font-medium' : ''
              )}
              style={{
                height: '24px',
                fontSize: '16px',
                color: isPRDActive && !isOpen
                  ? 'var(--sidebar-text-primary)'
                  : 'var(--sidebar-text-secondary)',
                gap: '8px',
              }}
            >
              <FileText className="h-5 w-5 shrink-0" style={{ width: '20px', height: '20px' }} />
              <span className="flex-1">PRD</span>
              <ChevronDown className={cn('h-4 w-4 transition-transform shrink-0', isOpen && 'rotate-180')} />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col" style={{ gap: '8px', paddingLeft: '28px', paddingTop: '8px', overflow: 'hidden', width: '100%' }}>
          {/* All PRDs link */}
          <Link
            href="/notes"
            className={cn(
              'flex items-center transition-colors',
              pathname === '/notes' ? 'font-medium' : '',
              dragOverTarget === 'all-prds' && 'ring-2 ring-primary bg-primary/10'
            )}
            style={{
              height: '24px',
              fontSize: '14px',
              color: pathname === '/notes'
                ? 'var(--sidebar-text-primary)'
                : 'var(--sidebar-text-secondary)',
              gap: '8px',
            }}
            onDragOver={(e) => handleDragOver(e, 'all-prds')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, undefined)}
          >
            <FileText className="h-4 w-4" style={{ width: '16px', height: '16px' }} />
            <span>All PRDs</span>
          </Link>

          {/* Projects with nested PRDs */}
          {projects.map((project) => {
            const isExpanded = expandedProjects.has(project.id);
            const projectPRDs = prdsByProject[project.id] || [];
            const isProjectSettingsActive = pathname === `/projects/${project.id}/settings`;
            const isAnyPRDActive = projectPRDs.some(prd => pathname === `/notes/${prd.id}`);

            return (
              <div key={project.id} style={{ width: '100%', overflow: 'hidden' }}>
                <ContextMenu>
                  <ContextMenuTrigger asChild>
                    <div
                      className="group relative"
                      style={{ width: '100%', overflow: 'hidden' }}
                      onDragOver={(e) => handleDragOver(e, project.id)}
                      onDragLeave={handleDragLeave}
                      onDrop={(e) => handleDrop(e, project.id)}
                    >
                      <Link
                        href={`/projects/${project.id}/settings`}
                        onClick={() => {
                          // Ensure project is expanded when navigating to settings
                          if (!isExpanded) {
                            setExpandedProjects(prev => {
                              const next = new Set(prev);
                              next.add(project.id);
                              return next;
                            });
                          }
                        }}
                        className={cn(
                          'flex items-center transition-colors',
                          (isExpanded && (isProjectSettingsActive || isAnyPRDActive)) ? 'font-medium' : '',
                          dragOverTarget === project.id && 'ring-2 ring-primary bg-primary/10'
                        )}
                        style={{
                          height: '24px',
                          fontSize: '14px',
                          color: (isExpanded && (isProjectSettingsActive || isAnyPRDActive))
                            ? 'var(--sidebar-text-primary)'
                            : 'var(--sidebar-text-secondary)',
                          gap: '8px',
                          paddingRight: '28px',
                          width: '100%',
                          overflow: 'hidden',
                        }}
                      >
                        <ChevronDown className={cn('h-3.5 w-3.5 transition-transform shrink-0', !isExpanded && '-rotate-90')} style={{ flexShrink: 0 }} />
                        <FolderOpen className="h-4 w-4 shrink-0" style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{project.name}</span>
                      </Link>

                      {/* More options button (visible on hover) */}
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button
                            className="absolute right-0 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-sidebar-accent transition-opacity"
                            style={{ zIndex: 10 }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40">
                          <DropdownMenuItem onClick={() => handleRenameClick(project)}>
                            <Pencil className="h-4 w-4 mr-2" />
                            Rename
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => handleDeleteClick(project)}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-40">
                    <ContextMenuItem onClick={() => handleRenameClick(project)}>
                      <Pencil className="h-4 w-4 mr-2" />
                      Rename
                    </ContextMenuItem>
                    <ContextMenuSeparator />
                    <ContextMenuItem
                      onClick={() => handleDeleteClick(project)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </ContextMenuItem>
                  </ContextMenuContent>
                </ContextMenu>

                {/* Expanded project content */}
                {isExpanded && (
                  <div className="flex flex-col" style={{ gap: '8px', paddingLeft: '24px', marginTop: '8px', width: '100%', overflow: 'hidden' }}>
                    {/* PRDs list */}
                    {projectPRDs.map((prd) => {
                      const isPRDActive = pathname === `/notes/${prd.id}`;
                      return (
                        <div key={prd.id} className="group relative" style={{ width: '100%', overflow: 'hidden' }}>
                          <Link
                            href={`/notes/${prd.id}`}
                            className={cn(
                              'flex items-center transition-colors',
                              isPRDActive ? 'font-medium' : ''
                            )}
                            style={{
                              height: '24px',
                              fontSize: '14px',
                              color: isPRDActive
                                ? 'var(--sidebar-text-primary)'
                                : 'var(--sidebar-text-secondary)',
                              gap: '8px',
                              paddingRight: '24px',
                              width: '100%',
                              overflow: 'hidden',
                            }}
                          >
                            <StickyNote className="h-3.5 w-3.5" style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{prd.title || 'Untitled'}</span>
                          </Link>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <button
                                className="absolute right-0 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-sidebar-accent transition-opacity"
                                style={{ zIndex: 10 }}
                                onClick={(e) => e.stopPropagation()}
                              >
                                <MoreHorizontal className="h-3 w-3" />
                              </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-32">
                              <DropdownMenuItem
                                onClick={async () => {
                                  try {
                                    await deleteNote.mutateAsync(prd.id);
                                    toast.success(`"${prd.title || 'Untitled'}" deleted`);
                                  } catch (error) {
                                    toast.error('Failed to delete note');
                                  }
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="h-4 w-4 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      );
                    })}

                    {/* New PRD button - at bottom of list */}
                    <button
                      onClick={() => handleCreatePRD(project.id)}
                      disabled={creatingPRDForProject === project.id}
                      className="flex items-center transition-colors w-full disabled:opacity-50"
                      style={{
                        height: '24px',
                        fontSize: '14px',
                        color: 'var(--sidebar-text-secondary)',
                        gap: '8px',
                      }}
                    >
                      <Plus className="h-3.5 w-3.5" style={{ width: '14px', height: '14px' }} />
                      <span>{creatingPRDForProject === project.id ? 'Creating...' : 'New PRD'}</span>
                    </button>
                  </div>
                )}
              </div>
            );
          })}

          {/* Add Project button */}
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center transition-colors w-full"
            style={{
              height: '24px',
              fontSize: '14px',
              color: 'var(--sidebar-text-secondary)',
              gap: '8px',
            }}
          >
            <Plus className="h-4 w-4" style={{ width: '16px', height: '16px' }} />
            <span>Add Project</span>
          </button>
        </CollapsibleContent>
      </Collapsible>

      {/* Create Project Dialog */}
      <CreateProjectDialog
        open={showCreateDialog}
        onOpenChange={setShowCreateDialog}
        onProjectCreated={handleCreateProject}
      />

      {/* Rename Project Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rename Project</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="renameProject">Project Name</Label>
            <Input
              id="renameProject"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter project name"
              className="mt-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameProject();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameProject} disabled={!renameValue.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Project Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Project</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete &quot;{projectToDelete?.name}&quot;?
              PRDs in this project will be permanently deleted.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteProject}>
              Delete Project
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

function NavItemComponent({
  item,
  collapsed,
}: {
  item: NavItem;
  collapsed: boolean;
}) {
  const pathname = usePathname();
  const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
  const [isOpen, setIsOpen] = useState(isActive);

  // Automatically open if the section becomes active (e.g. on navigation)
  useEffect(() => {
    if (isActive) {
      setIsOpen(true);
    }
  }, [isActive]);

  const Icon = item.icon;

  const content = (
    <div
      className={cn(
        'flex items-center transition-colors w-full',
        isActive && !item.children
          ? 'font-medium'
          : ''
      )}
      style={{
        height: '24px',
        fontSize: '16px',
        color: isActive && !item.children
          ? 'var(--sidebar-text-primary)'
          : 'var(--sidebar-text-secondary)',
        gap: '8px',
      }}
    >
      <Icon className="h-5 w-5 shrink-0" style={{ width: '20px', height: '20px' }} />
      {!collapsed && (
        <>
          <span className="flex-1">{item.title}</span>
          {item.children && (
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform shrink-0',
                isOpen && 'rotate-180'
              )}
            />
          )}
        </>
      )}
    </div>
  );

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href={item.href}>{content}</Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          {item.title}
        </TooltipContent>
      </Tooltip>
    );
  }

  if (item.children) {
    return (
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full text-left">{content}</button>
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col" style={{ gap: '8px', paddingLeft: '28px', paddingTop: '8px' }}>
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                'flex items-center transition-colors',
                pathname === child.href ? 'font-medium' : ''
              )}
              style={{
                height: '24px',
                fontSize: '14px',
                color: pathname === child.href
                  ? 'var(--sidebar-text-primary)'
                  : 'var(--sidebar-text-secondary)',
              }}
            >
              {child.title}
            </Link>
          ))}
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return <Link href={item.href}>{content}</Link>;
}

export function Sidebar() {
  const { sidebarCollapsed, toggleSidebar } = useUIStore();
  const { features } = useFeatureSettingsStore();
  const [mounted, setMounted] = useState(false);

  // Prevent hydration mismatch by only reading persisted state after mount
  useEffect(() => {
    setMounted(true);
  }, []);

  // Use default value (false = expanded) during SSR to prevent hydration mismatch
  const isCollapsed = mounted ? sidebarCollapsed : false;

  // Filter nav items based on enabled features
  const filteredMainNavItems = mainNavItems.filter((item) => {
    if (item.title === 'Tasks') return features.tasks;
    if (item.title === 'Calendar') return features.calendar;
    return true;
  });

  const filteredDatabaseNavItems = databaseNavItems.filter((item) => {
    if (item.title === 'Analytics') return features.analytics;
    if (item.title === 'Employees') return features.employees;
    return true;
  });

  return (
    <TooltipProvider delayDuration={0}>
      <aside
        className={cn(
          'flex flex-col transition-all duration-300 relative h-full',
          isCollapsed ? 'w-[68px]' : 'w-[239px]',
          'border-r border-sidebar-border'
        )
        }
        style={{
          padding: '0px 0px 20px',
          gap: '2px',
          fontFamily: 'var(--font-sans)',
          fontSize: '16px',
          fontWeight: 400,
          lineHeight: '24px',
          color: 'var(--sidebar-text-primary)',
          textAlign: 'start',
          backgroundColor: 'white',
        }}

      >
        {/* Logo and collapse button */}
        <div
          className={cn(
            "flex items-center border-b h-16",
            isCollapsed ? "justify-center" : "justify-between"
          )}
          style={{
            paddingLeft: isCollapsed ? '0' : '24px',
            paddingRight: isCollapsed ? '0' : '24px',
            borderColor: 'var(--sidebar-separator)'
          }}
        >
          <Link href="/" className="flex items-center gap-2">
            {isCollapsed ? (
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                <span className="text-lg font-bold text-primary-foreground">V</span>
              </div>
            ) : (
              <img src="/ventureai.svg" alt="Venture AI" className="h-5" />
            )}
          </Link>
        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1">
          <div className="flex flex-col" style={{ gap: '20px', paddingLeft: '24px', paddingRight: '24px', paddingTop: '24px' }}>
            {/* Main navigation section */}
            <nav className="flex flex-col" style={{ gap: '20px' }}>
              {/* Notes with Projects */}
              {features.notes && <PRDNavSection collapsed={isCollapsed} />}

              {/* Pipelines with Roadmaps */}
              {features.pipelines && <PipelineNavSection collapsed={isCollapsed} />}

              {/* Other nav items (Tasks, Calendar) */}
              {filteredMainNavItems.map((item) => (
                <NavItemComponent
                  key={item.href}
                  item={item}
                  collapsed={isCollapsed}
                />
              ))}
            </nav>



            {/* Database section */}
            {filteredDatabaseNavItems.length > 0 && (
              <div className="flex flex-col" style={{ gap: '8px' }}>
                {!isCollapsed && (
                  <div
                    className="shrink-0"
                    style={{
                      height: '24px',
                      fontSize: '16px',
                      color: 'var(--sidebar-text-primary)',
                      display: 'flex',
                      alignItems: 'center'
                    }}
                  >
                    Database
                  </div>
                )}
                <nav className="flex flex-col" style={{ gap: '8px' }}>
                  {filteredDatabaseNavItems.map((item) => (
                    <NavItemComponent
                      key={item.href}
                      item={item}
                      collapsed={isCollapsed}
                    />
                  ))}
                </nav>
              </div>
            )}



            {/* Bottom items */}
            <nav className="flex flex-col" style={{ gap: '8px' }}>
              {bottomNavItems.map((item) => (
                <NavItemComponent
                  key={item.href}
                  item={item}
                  collapsed={isCollapsed}
                />
              ))}
            </nav>
          </div>
        </ScrollArea>

        {/* Workspace selector - fixed to bottom */}
        <div className="absolute bottom-0 left-0 right-0">
          <WorkspaceSwitcher collapsed={isCollapsed} />
        </div>
      </aside>
    </TooltipProvider>
  );
}

