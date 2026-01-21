'use client';

import { Calendar, Flag, MoreHorizontal, Pencil, Copy, Trash2, ChevronRight } from 'lucide-react';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { FeatureRequest } from '@/types';
import { FEATURE_REQUEST_STATUSES, FEATURE_REQUEST_PRIORITIES } from '@/types';

interface FeatureRequestRowProps {
  feature: FeatureRequest;
  isSelected?: boolean;
  onToggleSelect?: (id: string, selected: boolean) => void;
  onClick?: () => void;
  onDuplicate?: () => void;
  onDelete?: () => void;
  draggable?: boolean;
}

export function FeatureRequestRow({
  feature,
  isSelected = false,
  onToggleSelect,
  onClick,
  onDuplicate,
  onDelete,
  draggable = true,
}: FeatureRequestRowProps) {
  const status = FEATURE_REQUEST_STATUSES.find((s) => s.value === feature.status);
  const priority = FEATURE_REQUEST_PRIORITIES.find((p) => p.value === feature.priority);

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('application/feature-id', feature.id);
    e.dataTransfer.setData('application/feature-roadmap-id', feature.roadmapId);
    e.dataTransfer.setData('text/plain', feature.title);
    e.dataTransfer.effectAllowed = 'move';
  };

  return (
    <div
      className={cn(
        'flex items-center gap-3 px-4 py-3 border-b hover:bg-muted/50 transition-colors group cursor-grab active:cursor-grabbing',
        isSelected && 'bg-muted/50'
      )}
      draggable={draggable}
      onDragStart={handleDragStart}
    >
      {/* Checkbox */}
      <Checkbox
        checked={isSelected}
        onCheckedChange={(checked) => onToggleSelect?.(feature.id, !!checked)}
        onClick={(e) => e.stopPropagation()}
      />

      {/* Status indicator */}
      <div
        className={cn('w-2 h-2 rounded-full shrink-0', status?.color || 'bg-gray-400')}
        title={status?.label}
      />

      {/* Title */}
      <div
        className="flex-1 min-w-0 cursor-pointer"
        onClick={onClick}
      >
        <span className="text-sm font-medium truncate block">{feature.title}</span>
      </div>

      {/* Priority */}
      {priority && (
        <Badge
          variant="outline"
          className={cn(
            'shrink-0 text-xs',
            feature.priority === 'urgent' && 'border-red-500 text-red-500',
            feature.priority === 'high' && 'border-orange-500 text-orange-500'
          )}
        >
          {priority.label}
        </Badge>
      )}

      {/* Phase */}
      {feature.phase && (
        <Badge variant="secondary" className="shrink-0 text-xs">
          {feature.phase}
        </Badge>
      )}

      {/* Status */}
      <Badge
        className={cn('shrink-0 text-xs text-white', status?.color)}
      >
        {status?.label}
      </Badge>

      {/* Due date */}
      <div className="flex items-center gap-1 text-xs text-muted-foreground shrink-0 min-w-[90px]">
        {feature.dueDate ? (
          <>
            <Calendar className="h-3.5 w-3.5" />
            <span>{format(new Date(feature.dueDate), 'MMM d, yyyy')}</span>
          </>
        ) : (
          <span className="text-muted-foreground/50">No due date</span>
        )}
      </div>

      {/* Assignees */}
      <div className="flex -space-x-1 shrink-0 min-w-[60px]">
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

      {/* Actions */}
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 opacity-0 group-hover:opacity-100 transition-opacity"
            onClick={(e) => e.stopPropagation()}
          >
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem onClick={onClick}>
            <Pencil className="h-4 w-4 mr-2" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem onClick={onDuplicate}>
            <Copy className="h-4 w-4 mr-2" />
            Duplicate
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={onDelete}
            className="text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
