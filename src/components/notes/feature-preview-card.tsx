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
  Flag,
  Clock,
  ListChecks,
  User,
  Map,
  Trash2,
  CheckCircle2,
} from 'lucide-react';
import type { GeneratedFeature } from '@/types';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

interface FeaturePreviewCardProps {
  feature: GeneratedFeature;
  isSelected: boolean;
  onToggleSelect: () => void;
  onDelete: () => void;
  roadmapName?: string;
}

// Priority colors
const priorityColors: Record<string, string> = {
  urgent: 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-400',
  high: 'border-orange-500 bg-orange-50 text-orange-700 dark:bg-orange-950 dark:text-orange-400',
  medium: 'border-yellow-500 bg-yellow-50 text-yellow-700 dark:bg-yellow-950 dark:text-yellow-400',
  low: 'border-gray-400 bg-gray-50 text-gray-600 dark:bg-gray-900 dark:text-gray-400',
};

// Priority icons
const PriorityIcon = ({ priority }: { priority: string }) => {
  const colors: Record<string, string> = {
    urgent: 'text-red-500',
    high: 'text-orange-500',
    medium: 'text-yellow-500',
    low: 'text-gray-400',
  };
  return <Flag className={cn('h-3 w-3', colors[priority] || colors.medium)} />;
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FeaturePreviewCard({
  feature,
  isSelected,
  onToggleSelect,
  onDelete,
  roadmapName,
}: FeaturePreviewCardProps) {
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
                <h4 className="font-medium text-sm leading-tight">{feature.title}</h4>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <Badge
                    variant="outline"
                    className={cn('text-xs', priorityColors[feature.priority])}
                  >
                    <PriorityIcon priority={feature.priority} />
                    <span className="ml-1 capitalize">{feature.priority}</span>
                  </Badge>
                  <Badge variant="secondary" className="text-xs">
                    {feature.phase}
                  </Badge>
                  {feature.estimatedEffort && (
                    <Badge variant="outline" className="text-xs text-muted-foreground">
                      <Clock className="h-3 w-3 mr-1" />
                      {feature.estimatedEffort.split(' ')[0]}
                    </Badge>
                  )}

                  {/* Roadmap Name (from prop) */}
                  {roadmapName && (
                    <Badge variant="outline" className="text-xs text-muted-foreground bg-muted/50">
                      <Map className="h-3 w-3 mr-1" />
                      {roadmapName}
                    </Badge>
                  )}

                  {/* Added to Pipeline Indicator */}
                  {feature.addedToPipeline && (
                    <Badge 
                      variant="outline" 
                      className="text-xs bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-400 dark:border-green-800"
                    >
                      <CheckCircle2 className="h-3 w-3 mr-1" />
                      Added{feature.addedToRoadmapName ? ` to ${feature.addedToRoadmapName}` : ''}
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
              {feature.description}
            </p>
          </div>
        </div>
      </div>

      {/* Expandable Details */}
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button className="w-full px-3 py-2 border-t text-xs text-muted-foreground hover:bg-muted/50 flex items-center gap-1 transition-colors">
            {isExpanded ? (
              <ChevronDown className="h-3 w-3" />
            ) : (
              <ChevronRight className="h-3 w-3" />
            )}
            {isExpanded ? 'Hide details' : 'Show details'}
            {feature.acceptanceCriteria?.length > 0 && (
              <span className="ml-1">
                • {feature.acceptanceCriteria.length} criteria
              </span>
            )}
            {feature.userStories?.length > 0 && (
              <span className="ml-1">
                • {feature.userStories.length} stories
              </span>
            )}
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 pt-2 border-t space-y-3 bg-muted/30">
            {/* Acceptance Criteria */}
            {feature.acceptanceCriteria?.length > 0 && (
              <div>
                <h5 className="text-xs font-medium flex items-center gap-1 mb-1.5">
                  <ListChecks className="h-3 w-3" />
                  Acceptance Criteria
                </h5>
                <ul className="space-y-1">
                  {feature.acceptanceCriteria.map((criteria, index) => (
                    <li
                      key={index}
                      className="text-xs text-muted-foreground flex items-start gap-2"
                    >
                      <span className="text-primary mt-0.5">✓</span>
                      <span>{criteria}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* User Stories */}
            {feature.userStories?.length > 0 && (
              <div>
                <h5 className="text-xs font-medium flex items-center gap-1 mb-1.5">
                  <User className="h-3 w-3" />
                  User Stories
                </h5>
                <ul className="space-y-1">
                  {feature.userStories.map((story, index) => (
                    <li
                      key={index}
                      className="text-xs text-muted-foreground italic"
                    >
                      "{story}"
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Estimated Effort Details */}
            {feature.estimatedEffort && (
              <div className="text-xs text-muted-foreground">
                <span className="font-medium">Effort: </span>
                {feature.estimatedEffort}
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

export default FeaturePreviewCard;
