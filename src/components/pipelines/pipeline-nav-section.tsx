'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import {
  GitBranch,
  ChevronDown,
  Plus,
  MoreHorizontal,
  Pencil,
  Trash2,
  FolderKanban,
  Map,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from '@/components/ui/context-menu';
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { toast } from 'sonner';
import {
  usePipelines,
  useCreatePipeline,
  useUpdatePipeline,
  useDeletePipeline,
} from '@/lib/hooks/use-pipelines';
import {
  useRoadmapsByPipeline,
  useCreateRoadmap,
  useUpdateRoadmap,
  useDeleteRoadmap,
} from '@/lib/hooks/use-roadmaps';
import { useUpdateFeatureRequest } from '@/lib/hooks/use-feature-requests';
import type { Pipeline, Roadmap } from '@/types';

interface PipelineNavSectionProps {
  collapsed: boolean;
}

function PipelineItem({
  pipeline,
  collapsed,
  onRename,
  onDelete,
}: {
  pipeline: Pipeline;
  collapsed: boolean;
  onRename: (pipeline: Pipeline) => void;
  onDelete: (pipeline: Pipeline) => void;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isOpen, setIsOpen] = useState(false);
  const [dragOverRoadmapId, setDragOverRoadmapId] = useState<string | null>(null);

  const { data: roadmaps = [] } = useRoadmapsByPipeline(pipeline.id);
  const createRoadmap = useCreateRoadmap();
  const updateRoadmap = useUpdateRoadmap();
  const deleteRoadmap = useDeleteRoadmap();
  const updateFeature = useUpdateFeatureRequest();

  const [showCreateRoadmapDialog, setShowCreateRoadmapDialog] = useState(false);
  const [newRoadmapName, setNewRoadmapName] = useState('');
  const [showRenameRoadmapDialog, setShowRenameRoadmapDialog] = useState(false);
  const [roadmapToRename, setRoadmapToRename] = useState<Roadmap | null>(null);
  const [renameRoadmapValue, setRenameRoadmapValue] = useState('');
  const [showDeleteRoadmapDialog, setShowDeleteRoadmapDialog] = useState(false);
  const [roadmapToDelete, setRoadmapToDelete] = useState<Roadmap | null>(null);

  const isPipelineActive = pathname.startsWith(`/pipelines/${pipeline.id}`);
  const currentRoadmapId = searchParams.get('roadmap');

  // Auto-expand when pipeline is active
  useEffect(() => {
    if (isPipelineActive) {
      setIsOpen(true);
    }
  }, [isPipelineActive]);

  const handleCreateRoadmap = async () => {
    if (!newRoadmapName.trim()) return;
    await createRoadmap.mutateAsync({
      pipelineId: pipeline.id,
      name: newRoadmapName.trim(),
    });
    setNewRoadmapName('');
    setShowCreateRoadmapDialog(false);
    toast.success('Roadmap created');
  };

  const handleRenameRoadmapClick = (roadmap: Roadmap) => {
    setRoadmapToRename(roadmap);
    setRenameRoadmapValue(roadmap.name);
    setShowRenameRoadmapDialog(true);
  };

  const handleRenameRoadmap = async () => {
    if (!roadmapToRename || !renameRoadmapValue.trim()) return;
    await updateRoadmap.mutateAsync({
      id: roadmapToRename.id,
      data: { name: renameRoadmapValue.trim() },
    });
    setShowRenameRoadmapDialog(false);
    setRoadmapToRename(null);
    setRenameRoadmapValue('');
    toast.success('Roadmap renamed');
  };

  const handleDeleteRoadmapClick = (roadmap: Roadmap) => {
    setRoadmapToDelete(roadmap);
    setShowDeleteRoadmapDialog(true);
  };

  const handleDeleteRoadmap = async () => {
    if (!roadmapToDelete) return;
    await deleteRoadmap.mutateAsync(roadmapToDelete.id);
    setShowDeleteRoadmapDialog(false);
    setRoadmapToDelete(null);
    toast.success('Roadmap deleted');
  };

  // Drag and drop handlers for moving features between roadmaps
  const handleDragOver = (e: React.DragEvent, roadmapId: string) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('application/feature-id')) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverRoadmapId(roadmapId);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverRoadmapId(null);
  };

  const handleDrop = async (e: React.DragEvent, targetRoadmapId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverRoadmapId(null);

    const featureId = e.dataTransfer.getData('application/feature-id');
    const sourceRoadmapId = e.dataTransfer.getData('application/feature-roadmap-id');

    if (featureId && sourceRoadmapId !== targetRoadmapId) {
      const targetRoadmap = roadmaps.find((r) => r.id === targetRoadmapId);
      try {
        await updateFeature.mutateAsync({
          id: featureId,
          data: { roadmapId: targetRoadmapId },
        });
        toast.success(`Feature moved to ${targetRoadmap?.name || 'roadmap'}`);
      } catch {
        toast.error('Failed to move feature');
      }
    }
  };

  if (collapsed) {
    return null; // Pipelines are hidden when sidebar is collapsed
  }

  return (
    <>
      <Collapsible open={isOpen} onOpenChange={setIsOpen}>
        <div className="group relative" style={{ width: '100%', overflow: 'hidden' }}>
          <ContextMenu>
            <ContextMenuTrigger asChild>
              <CollapsibleTrigger asChild>
                <button
                  className={cn(
                    'flex items-center transition-colors',
                    isPipelineActive && !isOpen ? 'font-medium' : ''
                  )}
                  style={{
                    height: '24px',
                    fontSize: '14px',
                    color: isPipelineActive && !isOpen
                      ? 'var(--sidebar-text-primary)'
                      : 'var(--sidebar-text-secondary)',
                    gap: '8px',
                    paddingRight: '28px',
                    width: '100%',
                    overflow: 'hidden',
                  }}
                >
                  <FolderKanban className="h-4 w-4" style={{ width: '16px', height: '16px', flexShrink: 0 }} />
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0, textAlign: 'left' }}>{pipeline.name}</span>
                  <ChevronDown
                    className={cn(
                      'h-3.5 w-3.5 transition-transform',
                      isOpen && 'rotate-180'
                    )}
                    style={{ flexShrink: 0 }}
                  />
                </button>
              </CollapsibleTrigger>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-40">
              <ContextMenuItem onClick={() => setShowCreateRoadmapDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Roadmap
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem onClick={() => onRename(pipeline)}>
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </ContextMenuItem>
              <ContextMenuSeparator />
              <ContextMenuItem
                onClick={() => onDelete(pipeline)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </ContextMenuItem>
            </ContextMenuContent>
          </ContextMenu>

          {/* More options button */}
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
              <DropdownMenuItem onClick={() => setShowCreateRoadmapDialog(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add Roadmap
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onRename(pipeline)}>
                <Pencil className="h-4 w-4 mr-2" />
                Rename
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => onDelete(pipeline)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <CollapsibleContent className="flex flex-col" style={{ gap: '8px', paddingLeft: '24px', marginTop: '8px', width: '100%', overflow: 'hidden' }}>
          {roadmaps.map((roadmap) => {
            const isRoadmapActive =
              pathname === `/pipelines/${pipeline.id}` && currentRoadmapId === roadmap.id;
            const isDragOver = dragOverRoadmapId === roadmap.id;

            return (
              <ContextMenu key={roadmap.id}>
                <ContextMenuTrigger asChild>
                  <div
                    className="group relative"
                    style={{ width: '100%', overflow: 'hidden' }}
                    onDragOver={(e) => handleDragOver(e, roadmap.id)}
                    onDragLeave={handleDragLeave}
                    onDrop={(e) => handleDrop(e, roadmap.id)}
                  >
                    <Link
                      href={`/pipelines/${pipeline.id}?roadmap=${roadmap.id}`}
                      className={cn(
                        'flex items-center transition-colors',
                        isRoadmapActive ? 'font-medium' : '',
                        isDragOver && 'ring-2 ring-primary bg-primary/10'
                      )}
                      style={{
                        height: '24px',
                        fontSize: '14px',
                        color: isRoadmapActive
                          ? 'var(--sidebar-text-primary)'
                          : 'var(--sidebar-text-secondary)',
                        gap: '8px',
                        paddingRight: '24px',
                        width: '100%',
                        overflow: 'hidden',
                      }}
                    >
                      <Map className="h-3.5 w-3.5" style={{ width: '14px', height: '14px', flexShrink: 0 }} />
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1, minWidth: 0 }}>{roadmap.name}</span>
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
                      <DropdownMenuContent align="end" className="w-40">
                        <DropdownMenuItem onClick={() => handleRenameRoadmapClick(roadmap)}>
                          <Pencil className="h-4 w-4 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={() => handleDeleteRoadmapClick(roadmap)}
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
                  <ContextMenuItem onClick={() => handleRenameRoadmapClick(roadmap)}>
                    <Pencil className="h-4 w-4 mr-2" />
                    Rename
                  </ContextMenuItem>
                  <ContextMenuSeparator />
                  <ContextMenuItem
                    onClick={() => handleDeleteRoadmapClick(roadmap)}
                    className="text-destructive focus:text-destructive"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </ContextMenuItem>
                </ContextMenuContent>
              </ContextMenu>
            );
          })}

          {/* Add Roadmap button */}
          <button
            onClick={() => setShowCreateRoadmapDialog(true)}
            className="flex items-center transition-colors w-full"
            style={{
              height: '24px',
              fontSize: '14px',
              color: 'var(--sidebar-text-secondary)',
              gap: '8px',
            }}
          >
            <Plus className="h-3.5 w-3.5" style={{ width: '14px', height: '14px' }} />
            <span>Add Roadmap</span>
          </button>
        </CollapsibleContent>
      </Collapsible>

      {/* Create Roadmap Dialog */}
      <Dialog open={showCreateRoadmapDialog} onOpenChange={setShowCreateRoadmapDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Roadmap</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="roadmapName">Roadmap Name</Label>
            <Input
              id="roadmapName"
              value={newRoadmapName}
              onChange={(e) => setNewRoadmapName(e.target.value)}
              placeholder="Enter roadmap name"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreateRoadmap();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateRoadmapDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreateRoadmap} disabled={!newRoadmapName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Roadmap Dialog */}
      <Dialog open={showRenameRoadmapDialog} onOpenChange={setShowRenameRoadmapDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rename Roadmap</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="renameRoadmap">Roadmap Name</Label>
            <Input
              id="renameRoadmap"
              value={renameRoadmapValue}
              onChange={(e) => setRenameRoadmapValue(e.target.value)}
              placeholder="Enter roadmap name"
              className="mt-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenameRoadmap();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameRoadmapDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenameRoadmap} disabled={!renameRoadmapValue.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Roadmap Dialog */}
      <Dialog open={showDeleteRoadmapDialog} onOpenChange={setShowDeleteRoadmapDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Roadmap</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &quot;{roadmapToDelete?.name}&quot;? All feature
            requests in this roadmap will be deleted.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDeleteRoadmapDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteRoadmap}>
              Delete Roadmap
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function PipelineNavSection({ collapsed }: PipelineNavSectionProps) {
  const pathname = usePathname();
  const { data: pipelines = [] } = usePipelines();
  const createPipeline = useCreatePipeline();
  const updatePipeline = useUpdatePipeline();
  const deletePipeline = useDeletePipeline();

  const [isOpen, setIsOpen] = useState(false);
  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');
  const [showRenameDialog, setShowRenameDialog] = useState(false);
  const [pipelineToRename, setPipelineToRename] = useState<Pipeline | null>(null);
  const [renameValue, setRenameValue] = useState('');
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [pipelineToDelete, setPipelineToDelete] = useState<Pipeline | null>(null);

  const isPipelinesActive = pathname.startsWith('/pipelines');

  // Auto-expand when pipelines section is active
  useEffect(() => {
    if (isPipelinesActive) {
      setIsOpen(true);
    }
  }, [isPipelinesActive]);

  const handleCreatePipeline = async () => {
    if (!newPipelineName.trim()) return;
    await createPipeline.mutateAsync({ name: newPipelineName.trim() });
    setNewPipelineName('');
    setShowCreateDialog(false);
    toast.success('Pipeline created');
  };

  const handleRenameClick = (pipeline: Pipeline) => {
    setPipelineToRename(pipeline);
    setRenameValue(pipeline.name);
    setShowRenameDialog(true);
  };

  const handleRenamePipeline = async () => {
    if (!pipelineToRename || !renameValue.trim()) return;
    await updatePipeline.mutateAsync({
      id: pipelineToRename.id,
      data: { name: renameValue.trim() },
    });
    setShowRenameDialog(false);
    setPipelineToRename(null);
    setRenameValue('');
    toast.success('Pipeline renamed');
  };

  const handleDeleteClick = (pipeline: Pipeline) => {
    setPipelineToDelete(pipeline);
    setShowDeleteDialog(true);
  };

  const handleDeletePipeline = async () => {
    if (!pipelineToDelete) return;
    try {
      await deletePipeline.mutateAsync(pipelineToDelete.id);
      setShowDeleteDialog(false);
      setPipelineToDelete(null);
      toast.success('Pipeline deleted');
    } catch (error) {
      console.error('Failed to delete pipeline:', error);
      toast.error('Failed to delete pipeline');
    }
  };

  if (collapsed) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>
          <Link href="/pipelines">
            <div
              className={cn(
                'flex items-center transition-colors w-full',
                isPipelinesActive ? 'font-medium' : ''
              )}
              style={{
                height: '24px',
                fontSize: '16px',
                color: isPipelinesActive
                  ? 'var(--sidebar-text-primary)'
                  : 'var(--sidebar-text-secondary)',
                gap: '8px',
              }}
            >
              <GitBranch className="h-5 w-5 shrink-0" style={{ width: '20px', height: '20px' }} />
            </div>
          </Link>
        </TooltipTrigger>
        <TooltipContent side="right" sideOffset={10}>
          Pipelines
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
                isPipelinesActive && !isOpen ? 'font-medium' : ''
              )}
              style={{
                height: '24px',
                fontSize: '16px',
                color: isPipelinesActive && !isOpen
                  ? 'var(--sidebar-text-primary)'
                  : 'var(--sidebar-text-secondary)',
                gap: '8px',
              }}
            >
              <GitBranch className="h-5 w-5 shrink-0" style={{ width: '20px', height: '20px' }} />
              <span className="flex-1">Pipelines</span>
              <ChevronDown className={cn('h-4 w-4 transition-transform shrink-0', isOpen && 'rotate-180')} />
            </div>
          </button>
        </CollapsibleTrigger>
        <CollapsibleContent className="flex flex-col w-full max-w-full overflow-hidden min-w-0" style={{ gap: '8px', paddingLeft: '28px', paddingTop: '8px', minWidth: 0, maxWidth: '100%' }}>
          {pipelines.map((pipeline) => (
            <PipelineItem
              key={pipeline.id}
              pipeline={pipeline}
              collapsed={collapsed}
              onRename={handleRenameClick}
              onDelete={handleDeleteClick}
            />
          ))}

          {/* Add Pipeline button */}
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
            <span>Add Pipeline</span>
          </button>
        </CollapsibleContent>
      </Collapsible>

      {/* Create Pipeline Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Pipeline</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="pipelineName">Pipeline Name</Label>
            <Input
              id="pipelineName"
              value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
              placeholder="Enter pipeline name"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreatePipeline();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePipeline} disabled={!newPipelineName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Rename Pipeline Dialog */}
      <Dialog open={showRenameDialog} onOpenChange={setShowRenameDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Rename Pipeline</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="renamePipeline">Pipeline Name</Label>
            <Input
              id="renamePipeline"
              value={renameValue}
              onChange={(e) => setRenameValue(e.target.value)}
              placeholder="Enter pipeline name"
              className="mt-2"
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleRenamePipeline();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowRenameDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleRenamePipeline} disabled={!renameValue.trim()}>
              Rename
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Pipeline Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Delete Pipeline</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-muted-foreground">
            Are you sure you want to delete &quot;{pipelineToDelete?.name}&quot;? All roadmaps and
            feature requests in this pipeline will be deleted.
          </p>
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setShowDeleteDialog(false)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeletePipeline}>
              Delete Pipeline
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
