'use client';

import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { FeatureRequestCard } from '../feature-request-card';
import { cn } from '@/lib/utils';
import type { FeatureRequest, FeatureRequestStatus } from '@/types';
import { FEATURE_REQUEST_STATUSES } from '@/types';
import { useUpdateFeatureRequest } from '@/lib/hooks/use-feature-requests';
import { toast } from 'sonner';

interface FeatureBoardViewProps {
  features: FeatureRequest[];
  groupedByStatus: Map<string, FeatureRequest[]>;
  isLoading?: boolean;
  onFeatureClick: (feature: FeatureRequest) => void;
  onAddFeature: (status?: FeatureRequestStatus) => void;
}

export function FeatureBoardView({
  features,
  groupedByStatus,
  isLoading,
  onFeatureClick,
  onAddFeature,
}: FeatureBoardViewProps) {
  const updateFeature = useUpdateFeatureRequest();
  const [dragOverStatus, setDragOverStatus] = useState<FeatureRequestStatus | null>(null);
  const [draggedFeatureId, setDraggedFeatureId] = useState<string | null>(null);

  const handleDragStart = (e: React.DragEvent, feature: FeatureRequest) => {
    setDraggedFeatureId(feature.id);
    e.dataTransfer.setData('application/feature-id', feature.id);
    e.dataTransfer.setData('application/feature-status', feature.status);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, status: FeatureRequestStatus) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.types.includes('application/feature-id')) {
      e.dataTransfer.dropEffect = 'move';
      setDragOverStatus(status);
    }
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    const relatedTarget = e.relatedTarget as HTMLElement;
    if (!relatedTarget || !e.currentTarget.contains(relatedTarget)) {
      setDragOverStatus(null);
    }
  };

  const handleDrop = async (e: React.DragEvent, targetStatus: FeatureRequestStatus) => {
    e.preventDefault();
    e.stopPropagation();
    
    const featureId = e.dataTransfer.getData('application/feature-id');
    const sourceStatus = e.dataTransfer.getData('application/feature-status');
    
    setDragOverStatus(null);
    setDraggedFeatureId(null);

    if (!featureId || sourceStatus === targetStatus) return;

    const targetStatusLabel = FEATURE_REQUEST_STATUSES.find((s) => s.value === targetStatus)?.label;
    
    try {
      await updateFeature.mutateAsync({
        id: featureId,
        data: { status: targetStatus },
      });
      toast.success(`Moved to ${targetStatusLabel}`);
    } catch {
      toast.error('Failed to update status');
    }
  };

  const handleDragEnd = () => {
    setDragOverStatus(null);
    setDraggedFeatureId(null);
  };

  if (isLoading) {
    return (
      <div className="flex gap-4 overflow-x-auto pb-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="w-[300px] shrink-0 h-[400px] bg-muted animate-pulse rounded-lg"
          />
        ))}
      </div>
    );
  }

  return (
    <ScrollArea className="w-full">
      <div className="flex gap-4 pb-4 min-h-[500px]">
        {FEATURE_REQUEST_STATUSES.map((statusConfig) => {
          const statusFeatures = groupedByStatus.get(statusConfig.value) || [];
          const isDragOver = dragOverStatus === statusConfig.value;

          return (
            <div
              key={statusConfig.value}
              className={cn(
                'w-[300px] shrink-0 flex flex-col bg-muted/30 rounded-lg transition-all',
                isDragOver && 'ring-2 ring-primary bg-primary/5'
              )}
              onDragOver={(e) => handleDragOver(e, statusConfig.value)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, statusConfig.value)}
            >
              {/* Column Header */}
              <div className="flex items-center justify-between px-3 py-2 border-b">
                <div className="flex items-center gap-2">
                  <div className={cn('w-2 h-2 rounded-full', statusConfig.color)} />
                  <span className="font-medium text-sm">{statusConfig.label}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                    {statusFeatures.length}
                  </span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6"
                  onClick={() => onAddFeature(statusConfig.value)}
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {/* Column Content */}
              <ScrollArea className="flex-1 p-2">
                <div className="space-y-2">
                  {statusFeatures.map((feature) => (
                    <div
                      key={feature.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, feature)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'transition-opacity cursor-grab active:cursor-grabbing',
                        draggedFeatureId === feature.id && 'opacity-50'
                      )}
                    >
                      <FeatureRequestCard
                        feature={feature}
                        onClick={() => onFeatureClick(feature)}
                      />
                    </div>
                  ))}

                  {statusFeatures.length === 0 && (
                    <div className="text-center py-8 text-sm text-muted-foreground">
                      Drop features here
                    </div>
                  )}
                </div>
              </ScrollArea>

              {/* Add Feature Button */}
              <div className="p-2 border-t">
                <Button
                  variant="ghost"
                  size="sm"
                  className="w-full justify-start text-muted-foreground"
                  onClick={() => onAddFeature(statusConfig.value)}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Feature
                </Button>
              </div>
            </div>
          );
        })}
      </div>
      <ScrollBar orientation="horizontal" />
    </ScrollArea>
  );
}
