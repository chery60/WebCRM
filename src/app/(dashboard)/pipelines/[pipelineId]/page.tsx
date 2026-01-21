'use client';

import { useState, useMemo } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { usePipeline } from '@/lib/hooks/use-pipelines';
import { useRoadmap } from '@/lib/hooks/use-roadmaps';
import {
  useFeatureRequests,
  useFeatureRequestsByPhase,
  useFeatureRequestsByStatus,
  useCreateFeatureRequest,
  useDuplicateFeatureRequest,
  useDeleteFeatureRequest,
  useUpdateFeatureRequest,
} from '@/lib/hooks/use-feature-requests';
import { usePipelineStore } from '@/lib/stores/pipeline-store';
import { PipelineHeader } from '@/components/pipelines/pipeline-header';
import { FeatureListView } from '@/components/pipelines/views/feature-list-view';
import { FeatureTableView } from '@/components/pipelines/views/feature-table-view';
import { FeatureBoardView } from '@/components/pipelines/views/feature-board-view';
import { FeatureRequestDrawer } from '@/components/pipelines/feature-request-drawer';
import { FeatureBulkActionBar } from '@/components/pipelines/feature-bulk-action-bar';
import { toast } from 'sonner';
import type { FeatureRequest, FeatureRequestStatus, FeatureRequestPriority } from '@/types';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function PipelinePage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const pipelineId = params.pipelineId as string;
  const roadmapId = searchParams.get('roadmap') || undefined;

  const { data: pipeline } = usePipeline(pipelineId);
  const { data: roadmap } = useRoadmap(roadmapId);

  const { 
    pipelineView, 
    filter, 
    sort, 
    searchQuery, 
    selectedFeatureId, 
    setSelectedFeatureId,
    selectedFeatureIds,
    clearSelection,
  } = usePipelineStore();

  // Combine filter with search
  const combinedFilter = useMemo(
    () => ({
      ...filter,
      search: searchQuery || undefined,
    }),
    [filter, searchQuery]
  );

  const { data: features = [], isLoading } = useFeatureRequests(roadmapId, combinedFilter, sort);
  const { data: groupedByPhase = new Map() } = useFeatureRequestsByPhase(roadmapId);
  const { data: groupedByStatus = new Map() } = useFeatureRequestsByStatus(roadmapId);

  const createFeature = useCreateFeatureRequest();
  const duplicateFeature = useDuplicateFeatureRequest();
  const deleteFeature = useDeleteFeatureRequest();
  const updateFeature = useUpdateFeatureRequest();

  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [featureToDelete, setFeatureToDelete] = useState<FeatureRequest | null>(null);
  const [showBulkDeleteDialog, setShowBulkDeleteDialog] = useState(false);
  
  // Drawer state - unified for create and edit
  const [drawerMode, setDrawerMode] = useState<'create' | 'edit'>('edit');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [drawerDefaults, setDrawerDefaults] = useState<{
    phase?: string;
    status?: FeatureRequestStatus;
  }>({});

  const selectedFeature = features.find((f) => f.id === selectedFeatureId);

  const handleAddFeature = (phaseOrStatus?: string | FeatureRequestStatus) => {
    if (typeof phaseOrStatus === 'string') {
      // Check if it's a status
      const statuses = ['backlog', 'considering', 'in_scoping', 'designing', 'ready_for_dev', 'under_development', 'in_review', 'live_on_production'];
      if (statuses.includes(phaseOrStatus)) {
        setDrawerDefaults({ status: phaseOrStatus as FeatureRequestStatus });
      } else {
        setDrawerDefaults({ phase: phaseOrStatus });
      }
    } else {
      setDrawerDefaults({});
    }
    setDrawerMode('create');
    setSelectedFeatureId(null);
    setDrawerOpen(true);
  };

  const handleFeatureClick = (feature: FeatureRequest) => {
    setDrawerMode('edit');
    setSelectedFeatureId(feature.id);
    setDrawerOpen(true);
  };

  const handleDrawerClose = () => {
    setDrawerOpen(false);
    setSelectedFeatureId(null);
    setDrawerDefaults({});
  };

  const handleDuplicate = async (feature: FeatureRequest) => {
    try {
      await duplicateFeature.mutateAsync(feature.id);
      toast.success('Feature duplicated');
    } catch {
      toast.error('Failed to duplicate feature');
    }
  };

  const handleDeleteClick = (feature: FeatureRequest) => {
    setFeatureToDelete(feature);
    setShowDeleteDialog(true);
  };

  const handleConfirmDelete = async () => {
    if (!featureToDelete) return;
    try {
      await deleteFeature.mutateAsync(featureToDelete.id);
      toast.success('Feature deleted');
      setShowDeleteDialog(false);
      setFeatureToDelete(null);
    } catch {
      toast.error('Failed to delete feature');
    }
  };

  // Bulk action handlers
  const handleBulkMoveToRoadmap = async (targetRoadmapId: string) => {
    const selectedIds = Array.from(selectedFeatureIds);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          updateFeature.mutateAsync({ id, data: { roadmapId: targetRoadmapId } })
        )
      );
      toast.success(`${selectedIds.length} feature(s) moved`);
      clearSelection();
    } catch {
      toast.error('Failed to move some features');
    }
  };

  const handleBulkChangeStatus = async (status: FeatureRequestStatus) => {
    const selectedIds = Array.from(selectedFeatureIds);
    try {
      await Promise.all(
        selectedIds.map((id) => updateFeature.mutateAsync({ id, data: { status } }))
      );
      toast.success(`Status updated for ${selectedIds.length} feature(s)`);
      clearSelection();
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleBulkChangePriority = async (priority: FeatureRequestPriority) => {
    const selectedIds = Array.from(selectedFeatureIds);
    try {
      await Promise.all(
        selectedIds.map((id) => updateFeature.mutateAsync({ id, data: { priority } }))
      );
      toast.success(`Priority updated for ${selectedIds.length} feature(s)`);
      clearSelection();
    } catch {
      toast.error('Failed to update priority');
    }
  };

  const handleBulkChangePhase = async (phase: string) => {
    const selectedIds = Array.from(selectedFeatureIds);
    try {
      await Promise.all(
        selectedIds.map((id) =>
          updateFeature.mutateAsync({ id, data: { phase: phase || undefined } })
        )
      );
      toast.success(`Phase updated for ${selectedIds.length} feature(s)`);
      clearSelection();
    } catch {
      toast.error('Failed to update phase');
    }
  };

  const handleBulkAssignUsers = async (userIds: string[]) => {
    const selectedIds = Array.from(selectedFeatureIds);
    try {
      await Promise.all(
        selectedIds.map((id) => {
          const feature = features.find((f) => f.id === id);
          if (feature) {
            // Merge existing assignees with new ones (avoid duplicates)
            const mergedAssignees = Array.from(new Set([...feature.assignees, ...userIds]));
            return updateFeature.mutateAsync({ id, data: { assignees: mergedAssignees } });
          }
          return Promise.resolve();
        })
      );
      toast.success(`Assigned ${userIds.length} user(s) to ${selectedIds.length} feature(s)`);
      clearSelection();
    } catch {
      toast.error('Failed to assign users');
    }
  };

  const handleBulkAddTags = async (tags: string[]) => {
    const selectedIds = Array.from(selectedFeatureIds);
    try {
      await Promise.all(
        selectedIds.map((id) => {
          const feature = features.find((f) => f.id === id);
          if (feature) {
            // Merge existing tags with new ones (avoid duplicates)
            const mergedTags = Array.from(new Set([...feature.tags, ...tags]));
            return updateFeature.mutateAsync({ id, data: { tags: mergedTags } });
          }
          return Promise.resolve();
        })
      );
      toast.success(`Added ${tags.length} tag(s) to ${selectedIds.length} feature(s)`);
      clearSelection();
    } catch {
      toast.error('Failed to add tags');
    }
  };

  const handleBulkDuplicate = async () => {
    const selectedIds = Array.from(selectedFeatureIds);
    try {
      await Promise.all(selectedIds.map((id) => duplicateFeature.mutateAsync(id)));
      toast.success(`${selectedIds.length} feature(s) duplicated`);
      clearSelection();
    } catch {
      toast.error('Failed to duplicate some features');
    }
  };

  const handleBulkDeleteClick = () => {
    setShowBulkDeleteDialog(true);
  };

  const handleConfirmBulkDelete = async () => {
    const selectedIds = Array.from(selectedFeatureIds);
    try {
      await Promise.all(selectedIds.map((id) => deleteFeature.mutateAsync(id)));
      toast.success(`${selectedIds.length} feature(s) deleted`);
      clearSelection();
      setShowBulkDeleteDialog(false);
    } catch {
      toast.error('Failed to delete some features');
    }
  };

  if (!roadmapId) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-semibold mb-4">{pipeline?.name || 'Pipeline'}</h1>
        <p className="text-muted-foreground">
          Select a roadmap from the sidebar to view feature requests.
        </p>
      </div>
    );
  }

  const title = roadmap?.name || 'Roadmap';
  return (
    <div className="p-6">
      <PipelineHeader
        title={title}
        onAddFeature={() => handleAddFeature()}
      />

      {/* Views */}
      {pipelineView === 'list' && (
        <FeatureListView
          features={features}
          groupedByPhase={groupedByPhase}
          isLoading={isLoading}
          onFeatureClick={handleFeatureClick}
          onDuplicate={handleDuplicate}
          onDelete={handleDeleteClick}
          onAddFeature={handleAddFeature}
          roadmapId={roadmapId}
        />
      )}

      {pipelineView === 'table' && (
        <FeatureTableView
          features={features}
          isLoading={isLoading}
          onFeatureClick={handleFeatureClick}
          onAddFeature={() => handleAddFeature()}
        />
      )}

      {pipelineView === 'board' && (
        <FeatureBoardView
          features={features}
          groupedByStatus={groupedByStatus}
          isLoading={isLoading}
          onFeatureClick={handleFeatureClick}
          onAddFeature={handleAddFeature}
        />
      )}

      {/* Feature Drawer - for both create and edit */}
      <FeatureRequestDrawer
        open={drawerOpen}
        feature={drawerMode === 'edit' ? selectedFeature || null : null}
        onClose={handleDrawerClose}
        mode={drawerMode}
        roadmapId={roadmapId}
        defaultPhase={drawerDefaults.phase}
        defaultStatus={drawerDefaults.status}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Feature Request</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete &quot;{featureToDelete?.title}&quot;? This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Delete Confirmation Dialog */}
      <AlertDialog open={showBulkDeleteDialog} onOpenChange={setShowBulkDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {selectedFeatureIds.size} Features</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {selectedFeatureIds.size} selected feature(s)? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmBulkDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete {selectedFeatureIds.size} Features
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Bulk Action Bar */}
      <FeatureBulkActionBar
        selectedCount={selectedFeatureIds.size}
        currentPipelineId={pipelineId}
        onClearSelection={clearSelection}
        onMoveToRoadmap={handleBulkMoveToRoadmap}
        onChangeStatus={handleBulkChangeStatus}
        onChangePriority={handleBulkChangePriority}
        onChangePhase={handleBulkChangePhase}
        onAssignUsers={handleBulkAssignUsers}
        onAddTags={handleBulkAddTags}
        onDuplicate={handleBulkDuplicate}
        onDelete={handleBulkDeleteClick}
      />
    </div>
  );
}
