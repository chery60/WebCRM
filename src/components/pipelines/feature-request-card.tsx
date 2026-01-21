'use client';

import { Calendar, Flag, User } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import type { FeatureRequest } from '@/types';
import { FEATURE_REQUEST_STATUSES, FEATURE_REQUEST_PRIORITIES } from '@/types';

interface FeatureRequestCardProps {
  feature: FeatureRequest;
  onClick?: () => void;
  className?: string;
}

export function FeatureRequestCard({ feature, onClick, className }: FeatureRequestCardProps) {
  const status = FEATURE_REQUEST_STATUSES.find((s) => s.value === feature.status);
  const priority = FEATURE_REQUEST_PRIORITIES.find((p) => p.value === feature.priority);

  return (
    <Card
      className={cn(
        'cursor-pointer hover:shadow-md transition-shadow',
        className
      )}
      onClick={onClick}
    >
      <CardContent className="p-4 space-y-3">
        {/* Title */}
        <h3 className="font-medium text-sm line-clamp-2">{feature.title}</h3>

        {/* Tags */}
        {feature.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {feature.tags.slice(0, 3).map((tag) => (
              <Badge key={tag} variant="secondary" className="text-xs px-1.5 py-0">
                {tag}
              </Badge>
            ))}
            {feature.tags.length > 3 && (
              <Badge variant="secondary" className="text-xs px-1.5 py-0">
                +{feature.tags.length - 3}
              </Badge>
            )}
          </div>
        )}

        {/* Meta info */}
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <div className="flex items-center gap-3">
            {/* Due date */}
            {feature.dueDate && (
              <div className="flex items-center gap-1">
                <Calendar className="h-3 w-3" />
                <span>{format(new Date(feature.dueDate), 'MMM d')}</span>
              </div>
            )}

            {/* Priority */}
            {priority && (
              <div className="flex items-center gap-1">
                <Flag className={cn('h-3 w-3', priority.color.replace('bg-', 'text-'))} />
                <span>{priority.label}</span>
              </div>
            )}
          </div>

          {/* Assignees */}
          {feature.assignees.length > 0 && (
            <div className="flex -space-x-1">
              {feature.assignees.slice(0, 2).map((assignee, index) => (
                <Avatar key={assignee} className="h-5 w-5 border-2 border-background">
                  <AvatarFallback className="text-[8px]">
                    {assignee.slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
              ))}
              {feature.assignees.length > 2 && (
                <div className="h-5 w-5 rounded-full bg-muted flex items-center justify-center text-[8px] border-2 border-background">
                  +{feature.assignees.length - 2}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Phase badge */}
        {feature.phase && (
          <Badge variant="outline" className="text-xs">
            {feature.phase}
          </Badge>
        )}
      </CardContent>
    </Card>
  );
}
