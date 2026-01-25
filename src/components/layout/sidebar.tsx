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
import { useState, useEffect } from 'react';
import { WorkspaceSwitcher } from '@/components/sidebar/workspace-switcher';
import { PipelineNavSection } from '@/components/pipelines/pipeline-nav-section';
import { useProjects, useCreateProject, useUpdateProject, useDeleteProject } from '@/lib/hooks/use-projects';
import { useMoveNoteToProject } from '@/lib/hooks/use-notes';
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
import { MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
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

function NotesNavSection({ collapsed }: { collapsed: boolean }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { data: projects = [] } = useProjects();
  const createProject = useCreateProject();
  const updateProject = useUpdateProject();
  const deleteProject = useDeleteProject();
  const moveNote = useMoveNoteToProject();
  
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newProjectName, setNewProjectName] = useState('');
  
  // Rename dialog state
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [projectToRename, setProjectToRename] = useState<Project | null>(null);
  const [renameValue, setRenameValue] = useState('');
  
  // Delete dialog state
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);

  // Drag and drop state
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);

  const isNotesActive = pathname.startsWith('/notes');
  const currentProjectId = searchParams.get('project');
  
  // All Notes is active when on /notes page without a project query param
  const isAllNotesActive = pathname === '/notes' && !currentProjectId;

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
        : 'All Notes';
      
      moveNote.mutate(
        { noteId, projectId },
        {
          onSuccess: () => {
            toast.success(`Note moved to ${targetName}`);
          },
          onError: () => {
            toast.error('Failed to move note');
          },
        }
      );
    }
  };

  // Auto-expand when notes section is active
  useEffect(() => {
    if (isNotesActive) {
      setIsOpen(true);
    }
  }, [isNotesActive]);

  const handleCreateProject = async () => {
    if (!newProjectName.trim()) return;
    await createProject.mutateAsync({ name: newProjectName.trim() });
    setNewProjectName('');
    setShowCreateDialog(false);
    toast.success('Project created');
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
          <Link href="/notes">
            <div className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors w-full',
              isNotesActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            )}>
              <StickyNote className="h-5 w-5 shrink-0" />
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          Notes
        </TooltipContent>
      </Tooltip>
    );
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full text-left">
            <div className={cn(
              'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors w-full',
              isNotesActive && !isOpen
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
            )}>
              <StickyNote className="h-5 w-5 shrink-0" />
              <span className="flex-1">Notes</span>
              <ChevronDown className={cn('h-4 w-4 transition-transform', isOpen && 'rotate-180')} />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="pl-4 pt-1 space-y-1">
          {/* All Notes link */}
          <Link
            href="/notes"
            className={cn(
              'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors',
              isAllNotesActive
                ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
              dragOverTarget === 'all-notes' && 'ring-2 ring-primary bg-primary/10'
            )}
            onDragOver={(e) => handleDragOver(e, 'all-notes')}
            onDragLeave={handleDragLeave}
            onDrop={(e) => handleDrop(e, undefined)}
          >
            <StickyNote className="h-4 w-4" />
            <span>All Notes</span>
          </Link>

          {/* Projects */}
          {projects.map((project) => {
            const isProjectActive = pathname === '/notes' && currentProjectId === project.id;
            
            return (
              <ContextMenu key={project.id}>
                <ContextMenuTrigger asChild>
                  <div 
                    className="group relative"
                    onDragOver={(e) => handleDragOver(e, project.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, project.id)}
                  >
                    <Link
                      href={`/notes?project=${project.id}`}
                      className={cn(
                        'flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors pr-8',
                        isProjectActive
                          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground',
                        dragOverTarget === project.id && 'ring-2 ring-primary bg-primary/10'
                      )}
                    >
                      <FolderOpen className="h-4 w-4 shrink-0" />
                      <span className="truncate">{project.name}</span>
                    </Link>
                    
                    {/* More options button (visible on hover) */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button
                          className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded opacity-0 group-hover:opacity-100 hover:bg-sidebar-accent transition-opacity"
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
            );
          })}

          {/* Add Project button */}
          <button
            onClick={() => setShowCreateDialog(true)}
            className="flex items-center gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors w-full text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground"
          >
            <Plus className="h-4 w-4" />
            <span>Add Project</span>
          </button>
        </CollapsibleContent>
      </Collapsible>

      {/* Create Project Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Project</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="projectName">Project Name</Label>
            <Input
              id="projectName"
              value={newProjectName}
              onChange={(e) => setNewProjectName(e.target.value)}
              placeholder="Enter project name"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateProject();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateProject} disabled={!newProjectName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
              Notes in this project will be moved to &quot;All Notes&quot;.
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
        'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors w-full',
        isActive && !item.children
          ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
          : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
      )}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed && (
        <>
          <span className="flex-1">{item.title}</span>
          {item.children && (
            <ChevronDown
              className={cn(
                'h-4 w-4 transition-transform',
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
        <CollapsibleContent className="pl-8 pt-1 space-y-1">
          {item.children.map((child) => (
            <Link
              key={child.href}
              href={child.href}
              className={cn(
                'block rounded-lg px-3 py-1.5 text-sm transition-colors',
                pathname === child.href
                  ? 'bg-sidebar-accent text-sidebar-accent-foreground font-medium'
                  : 'text-sidebar-foreground/70 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground'
              )}
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
          'flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-300',
          isCollapsed ? 'w-[68px]' : 'w-[240px]'
        )}
      >
        {/* Logo and collapse button */}
        <div className="flex h-16 items-center justify-between px-4">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
              <span className="text-lg font-bold text-primary-foreground">V</span>
            </div>
            {!isCollapsed && (
              <span className="text-lg font-semibold text-sidebar-foreground truncate">Venture</span>
            )}
          </Link>

        </div>

        {/* Navigation */}
        <ScrollArea className="flex-1 px-3">
          <nav className="space-y-1 py-2">
            {/* Notes with Projects */}
            {features.notes && <NotesNavSection collapsed={isCollapsed} />}

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

          {filteredDatabaseNavItems.length > 0 && <Separator className="my-2" />}

          {/* Database section */}
          {filteredDatabaseNavItems.length > 0 && (
            <div className="py-2">
              {!isCollapsed && (
                <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Database
                </div>
              )}
              <nav className="space-y-1">
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

          <Separator className="my-2" />

          {/* Bottom items */}
          <nav className="space-y-1 py-2">
            {bottomNavItems.map((item) => (
              <NavItemComponent
                key={item.href}
                item={item}
                collapsed={isCollapsed}
              />
            ))}
          </nav>
        </ScrollArea>

        {/* Workspace selector */}
        <WorkspaceSwitcher collapsed={isCollapsed} />
      </aside>
    </TooltipProvider>
  );
}

