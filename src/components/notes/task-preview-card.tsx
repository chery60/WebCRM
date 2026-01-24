'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  Check,
  ChevronDown,
  ChevronRight,
  Clock,
  User,
  Link2,
  Flag,
  FolderKanban,
  Trash2,
} from 'lucide-react';
import type { GeneratedTask } from '@/types';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface TaskPreviewCardProps {
  task: GeneratedTask;
  isSelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  projectName?: string;
}

// Role colors
const roleColors: Record<string, string> = {
  'Frontend': 'bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-400',
  'Backend': 'bg-green-100 text-green-700 dark:bg-green-950 dark:text-green-400',
  'Design': 'bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-400',
  'QA': 'bg-orange-100 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  'DevOps': 'bg-cyan-100 text-cyan-700 dark:bg-cyan-950 dark:text-cyan-400',
  'Product': 'bg-pink-100 text-pink-700 dark:bg-pink-950 dark:text-pink-400',
  'Full Stack': 'bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-400',
};

// Priority colors
const priorityColors: Record<string, string> = {
  high: 'text-red-500',
  medium: 'text-yellow-500',
  low: 'text-gray-400',
};

// Hours to display string
const formatHours = (hours: number): string => {
  if (hours < 1) return `${Math.round(hours * 60)}m`;
  if (hours === 1) return '1h';
  if (hours < 8) return `${hours}h`;
  const days = Math.floor(hours / 8);
  const remainingHours = hours % 8;
  if (remainingHours === 0) return `${days}d`;
  return `${days}d ${remainingHours}h`;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function TaskPreviewCard({
  task,
  isSelected,
  onToggleSelect,
  onDelete,
  projectName,
}: TaskPreviewCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={cn(
        'border rounded-lg transition-all group',
        isSelected
          ? 'border-primary bg-primary/5 shadow-sm'
          : 'border-input hover:border-muted-foreground/50'
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Header */}
      <div className="p-3">
        <div className="flex items-start gap-3">
          {/* Selection Checkbox */}
          <button
            onClick={onToggleSelect}
            className={cn(
              'w-5 h-5 rounded border flex items-center justify-center shrink-0 mt-0.5 transition-colors',
              isSelected
                ? 'bg-primary border-primary text-primary-foreground'
                : 'border-muted-foreground/30 hover:border-muted-foreground'
            )}
          >
            {isSelected && <Check className="h-3 w-3" />}
          </button>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="flex-1">
                <h4 className="font-medium text-sm leading-tight">{task.title}</h4>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  {/* Role Badge */}
                  <Badge
                    className={cn(
                      'text-xs',
                      roleColors[task.role] || 'bg-gray-100 text-gray-700'
                    )}
                  >
                    <User className="h-3 w-3 mr-1" />
                    {task.role}
                  </Badge>

                  {/* Hours Badge */}
                  <Badge variant="outline" className="text-xs">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatHours(task.estimatedHours)}
                  </Badge>

                  {/* Priority */}
                  <div className="flex items-center gap-1">
                    <Flag className={cn('h-3 w-3', priorityColors[task.priority])} />
                    <span className={cn('text-xs capitalize', priorityColors[task.priority])}>
                      {task.priority}
                    </span>
                  </div>

                  {/* Project Name */}
                  {projectName && (
                    <Badge variant="outline" className="text-xs text-muted-foreground bg-muted/50">
                      <FolderKanban className="h-3 w-3 mr-1" />
                      {projectName}
                    </Badge>
                  )}
                </div>
              </div>

              {/* Delete Button - shown on hover */}
              <div className={cn(
                'shrink-0 transition-opacity duration-200',
                isHovered ? 'opacity-100' : 'opacity-0'
              )}>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete();
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Description */}
            <p className="text-sm text-muted-foreground mt-2 line-clamp-2">
              {task.description}
            </p>
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      {task.dependencies?.length > 0 && (
        <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
          <CollapsibleTrigger asChild>
            <button className="w-full px-3 py-2 border-t text-xs text-muted-foreground hover:bg-muted/50 flex items-center gap-1 transition-colors">
              {isExpanded ? (
                <ChevronDown className="h-3 w-3" />
              ) : (
                <ChevronRight className="h-3 w-3" />
              )}
              {isExpanded ? 'Hide details' : 'Show details'}
              <span className="ml-1">
                • {task.dependencies.length} dependencies
              </span>
            </button>
          </CollapsibleTrigger>

          <CollapsibleContent>
            <div className="px-3 pb-3 pt-2 border-t bg-muted/30">
              {/* Dependencies */}
              <div>
                <h5 className="text-xs font-medium flex items-center gap-1 mb-1.5">
                  <Link2 className="h-3 w-3" />
                  Dependencies
                </h5>
                <ul className="space-y-1">
                  {task.dependencies.map((dep, index) => (
                    <li
                      key={index}
                      className="text-xs text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-muted-foreground/50">→</span>
                      <span>{dep}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </CollapsibleContent>
        </Collapsible>
      )}
    </div>
  );
}

export default TaskPreviewCard;
