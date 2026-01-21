'use client';

import { useState } from 'react';
import { ChevronDown, Plus, GripVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { FeatureRequestRow } from '../feature-request-row';
import { cn } from '@/lib/utils';
import type { FeatureRequest } from '@/types';
import { usePipelineStore } from '@/lib/stores/pipeline-store';
import { useUpdateFeatureRequest, useReorderFeatureRequests } from '@/lib/hooks/use-feature-requests';
import { toast } from 'sonner';

interface FeatureListViewProps {
  features: FeatureRequest[];
  groupedByPhase: Map<string, FeatureRequest[]>;
  isLoading?: boolean;
  onFeatureClick: (feature: FeatureRequest) => void;
  onDuplicate: (feature: FeatureRequest) => void;
  onDelete: (feature: FeatureRequest) => void;
  onAddFeature: (phase?: string) => void;
  roadmapId: string;
}

const PHASE_ORDER = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Future', 'Unassigned'];

export function FeatureListView({
  features,
  groupedByPhase,
  isLoading,
  onFeatureClick,
  onDuplicate,
  onDelete,
  onAddFeature,
  roadmapId,
}: FeatureListViewProps) {
  const { expandedPhases, togglePhaseExpanded, selectedFeatureIds, toggleFeatureSelected } =
    usePipelineStore();
  
  const updateFeature = useUpdateFeatureRequest();
  const reorderFeatures = useReorderFeatureRequests();
  
  const [dragOverPhase, setDragOverPhase] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [draggedFeatureId, setDraggedFeatureId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, feature: FeatureRequest) => {
    setDraggedFeatureId(feature.id);
    e.dataTransfer.setData('application/feature-id', feature.id);
    e.dataTransfer.setData('application/feature-phase', feature.phase || 'Unassigned');
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, phase: string, index: number) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('application/feature-id')) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverPhase(phase);
      setDragOverIndex(index);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    // Only clear if leaving the container entirely
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverPhase(null);
      setDragOverIndex(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetPhase: string, targetIndex: number) => {
    e.preventDefault();
    e.stopPropagation();
    
    const featureId = e.dataTransfer.getData('application/feature-id');
    const sourcePhase = e.dataTransfer.getData('application/feature-phase');
    
    setDragOverPhase(null);
    setDragOverIndex(null);
    setDraggedFeatureId(null);

    if (!featureId) return;

    const draggedFeature = features.find((f) => f.id === featureId);
    if (!draggedFeature) return;

    // If moving to a different phase, update the phase
    const newPhase = targetPhase === 'Unassigned' ? undefined : targetPhase;
    if ((draggedFeature.phase || 'Unassigned') !== targetPhase) {
      try {
        await updateFeature.mutateAsync({
          id: featureId,
          data: { phase: newPhase },
        });
        toast.success(`Moved to ${targetPhase}`);
      } catch {
        toast.error('Failed to move feature');
      }
    }
  };

  const handleDragEnd = () => {
    setDragOverPhase(null);
    setDragOverIndex(null);
    setDraggedFeatureId(null);
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-16 bg-muted animate-pulse rounded-lg" />
        ))}
      </div>
    );
  }

  // Sort phases according to defined order
  const sortedPhases = Array.from(groupedByPhase.keys()).sort((a, b) => {
    const indexA = PHASE_ORDER.indexOf(a);
    const indexB = PHASE_ORDER.indexOf(b);
    if (indexA === -1 && indexB === -1) return a.localeCompare(b);
    if (indexA === -1) return 1;
    if (indexB === -1) return -1;
    return indexA - indexB;
  });

  if (sortedPhases.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground mb-4">No feature requests yet</p>
        <Button onClick={() => onAddFeature()}>
          <Plus className="h-4 w-4 mr-2" />
          Add your first feature
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedPhases.map((phase) => {
        const phaseFeatures = groupedByPhase.get(phase) || [];
        const isExpanded = expandedPhases.has(phase);
        const completedCount = phaseFeatures.filter(
          (f) => f.status === 'live_on_production'
        ).length;

        return (
          <Collapsible
            key={phase}
            open={isExpanded}
            onOpenChange={() => togglePhaseExpanded(phase)}
          >
            <div className="border rounded-lg overflow-hidden">
              {/* Phase Header */}
              <CollapsibleTrigger asChild>
                <button className="w-full flex items-center gap-3 px-4 py-3 bg-muted/50 hover:bg-muted transition-colors">
                  <ChevronDown
                    className={cn(
                      'h-4 w-4 transition-transform',
                      !isExpanded && '-rotate-90'
                    )}
                  />
                  <span className="font-medium">{phase}</span>
                  <span className="text-sm text-muted-foreground">
                    {phaseFeatures.length} feature{phaseFeatures.length !== 1 ? 's' : ''}
                    {completedCount > 0 && ` · ${completedCount} completed`}
                  </span>
                </button>
              </CollapsibleTrigger>

              {/* Phase Content */}
              <CollapsibleContent>
                <div 
                  className="divide-y"
                  onDragLeave={handleDragLeave}
                >
                  {phaseFeatures.map((feature, index) => (
                    <div
                      key={feature.id}
                      onDragOver={(e) => handleDragOver(e, phase, index)}
                      onDrop={(e) => handleDrop(e, phase, index)}
                      className="relative"
                    >
                      {/* Drop indicator line */}
                      {dragOverPhase === phase && dragOverIndex === index && draggedFeatureId !== feature.id && (
                        <div className="absolute top-0 left-0 right-0 h-0.5 bg-primary z-10" />
                      )}
                      <div
                        draggable
                        onDragStart={(e) => handleDragStart(e, feature)}
                        onDragEnd={handleDragEnd}
                        className={cn(
                          'transition-opacity',
                          draggedFeatureId === feature.id && 'opacity-50'
                        )}
                      >
                        <FeatureRequestRow
                          key={feature.id}
                          feature={feature}
                          isSelected={selectedFeatureIds.has(feature.id)}
                          onToggleSelect={toggleFeatureSelected}
                          onClick={() => onFeatureClick(feature)}
                          onDuplicate={() => onDuplicate(feature)}
                          onDelete={() => onDelete(feature)}
                          draggable={false}
                        />
                      </div>
                    </div>
                  ))}

                  {/* Drop zone at end of phase */}
                  <div
                    onDragOver={(e) => handleDragOver(e, phase, phaseFeatures.length)}
                    onDrop={(e) => handleDrop(e, phase, phaseFeatures.length)}
                    className={cn(
                      'transition-colors',
                      dragOverPhase === phase && dragOverIndex === phaseFeatures.length && 'bg-primary/10'
                    )}
                  >
                    {/* Add feature to phase */}
                    <button
                      onClick={() => onAddFeature(phase)}
                      className="w-full flex items-center gap-2 px-4 py-2 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors"
                    >
                      <Plus className="h-4 w-4" />
                      Add feature to {phase}
                    </button>
                  </div>
                </div>
              </CollapsibleContent>
            </div>
          </Collapsible>
        );
      })}
    </div>
  );
}
