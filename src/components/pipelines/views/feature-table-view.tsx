'use client';

import { ArrowUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { FeatureRequest, FeatureRequestSortField } from '@/types';
import { FEATURE_REQUEST_STATUSES, FEATURE_REQUEST_PRIORITIES } from '@/types';
import { usePipelineStore } from '@/lib/stores/pipeline-store';

interface FeatureTableViewProps {
  features: FeatureRequest[];
  isLoading?: boolean;
  onFeatureClick: (feature: FeatureRequest) => void;
  onAddFeature: () => void;
}

export function FeatureTableView({
  features,
  isLoading,
  onFeatureClick,
  onAddFeature,
}: FeatureTableViewProps) {
  const { sort, setSortField, selectedFeatureIds, toggleFeatureSelected, selectAllFeatures, clearSelection } =
    usePipelineStore();

  const allSelected = features.length > 0 && features.every((f) => selectedFeatureIds.has(f.id));
  const someSelected = features.some((f) => selectedFeatureIds.has(f.id)) && !allSelected;

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      selectAllFeatures(features.map((f) => f.id));
    } else {
      clearSelection();
    }
  };

  const SortableHeader = ({
    field,
    children,
  }: {
    field: FeatureRequestSortField;
    children: React.ReactNode;
  }) => (
    <Button
      variant="ghost"
      size="sm"
      className="-ml-3 h-8 data-[state=open]:bg-accent"
      onClick={() => setSortField(field)}
    >
      {children}
      <ArrowUpDown className="ml-2 h-4 w-4" />
    </Button>
  );

  if (isLoading) {
    return (
      <div className="space-y-2">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="h-12 bg-muted animate-pulse rounded" />
        ))}
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="hover:bg-transparent">
            <TableHead className="w-12">
              <Checkbox
                checked={allSelected}
                ref={(el) => {
                  if (el) {
                    (el as HTMLButtonElement & { indeterminate: boolean }).indeterminate = someSelected;
                  }
                }}
                onCheckedChange={handleSelectAll}
              />
            </TableHead>
            <TableHead className="min-w-[300px]">
              <SortableHeader field="title">Title</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="status">Status</SortableHeader>
            </TableHead>
            <TableHead>
              <SortableHeader field="priority">Priority</SortableHeader>
            </TableHead>
            <TableHead>Phase</TableHead>
            <TableHead>
              <SortableHeader field="dueDate">Due Date</SortableHeader>
            </TableHead>
            <TableHead>Assignees</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {features.map((feature) => {
            const status = FEATURE_REQUEST_STATUSES.find((s) => s.value === feature.status);
            const priority = FEATURE_REQUEST_PRIORITIES.find((p) => p.value === feature.priority);

            const handleDragStart = (e: React.DragEvent) => {
              e.dataTransfer.setData('application/feature-id', feature.id);
              e.dataTransfer.setData('application/feature-roadmap-id', feature.roadmapId);
              e.dataTransfer.setData('text/plain', feature.title);
              e.dataTransfer.effectAllowed = 'move';
            };

            return (
              <TableRow
                key={feature.id}
                className="cursor-pointer"
                onClick={() => onFeatureClick(feature)}
                draggable
                onDragStart={handleDragStart}
              >
                <TableCell onClick={(e) => e.stopPropagation()}>
                  <Checkbox
                    checked={selectedFeatureIds.has(feature.id)}
                    onCheckedChange={(checked) => toggleFeatureSelected(feature.id)}
                  />
                </TableCell>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <div className={cn('w-2 h-2 rounded-full shrink-0', status?.color)} />
                    <span className="truncate">{feature.title}</span>
                  </div>
                </TableCell>
                <TableCell>
                  <Badge className={cn('text-xs text-white', status?.color)}>
                    {status?.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={cn(
                      'text-xs',
                      feature.priority === 'urgent' && 'border-red-500 text-red-500',
                      feature.priority === 'high' && 'border-orange-500 text-orange-500'
                    )}
                  >
                    {priority?.label}
                  </Badge>
                </TableCell>
                <TableCell>
                  {feature.phase ? (
                    <Badge variant="secondary" className="text-xs">
                      {feature.phase}
                    </Badge>
                  ) : (
                    <span className="text-muted-foreground text-xs">—</span>
                  )}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {feature.dueDate
                    ? format(new Date(feature.dueDate), 'MMM d, yyyy')
                    : '—'}
                </TableCell>
                <TableCell>
                  <div className="flex -space-x-1">
                    {feature.assignees.slice(0, 3).map((assignee) => (
                      <Avatar key={assignee} className="h-6 w-6 border-2 border-background">
                        <AvatarFallback className="text-[10px]">
                          {assignee.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                    ))}
                    {feature.assignees.length > 3 && (
                      <div className="h-6 w-6 rounded-full bg-muted flex items-center justify-center text-[10px] border-2 border-background">
                        +{feature.assignees.length - 3}
                      </div>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}

          {/* Add new feature row */}
          <TableRow className="hover:bg-muted/50">
            <TableCell colSpan={7}>
              <button
                onClick={onAddFeature}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors py-1"
              >
                <Plus className="h-4 w-4" />
                Add Feature
              </button>
            </TableCell>
          </TableRow>
        </TableBody>
      </Table>
    </div>
  );
}
