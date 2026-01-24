'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { Users, Circle, Wifi, WifiOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useCanvasCollaborationStore,
  type Collaborator,
} from '@/lib/stores/canvas-collaboration-store';

// ============================================================================
// TYPES
// ============================================================================

interface CanvasPresenceProps {
  className?: string;
  maxAvatars?: number;
}

// ============================================================================
// COLLABORATOR AVATAR
// ============================================================================

function CollaboratorAvatar({
  collaborator,
  showTooltip = true,
  size = 'sm',
}: {
  collaborator: Collaborator;
  showTooltip?: boolean;
  size?: 'sm' | 'md';
}) {
  const sizeClass = size === 'sm' ? 'h-7 w-7' : 'h-8 w-8';
  const initials = collaborator.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const avatar = (
    <div className="relative">
      <Avatar
        className={cn(sizeClass, 'border-2')}
        style={{ borderColor: collaborator.color }}
      >
        <AvatarImage src={collaborator.avatar} alt={collaborator.name} />
        <AvatarFallback
          className="text-xs font-medium"
          style={{ backgroundColor: `${collaborator.color}20`, color: collaborator.color }}
        >
          {initials}
        </AvatarFallback>
      </Avatar>
      {collaborator.isOnline && (
        <span
          className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-background"
          style={{ backgroundColor: '#22c55e' }}
        />
      )}
    </div>
  );

  if (!showTooltip) return avatar;

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{avatar}</TooltipTrigger>
        <TooltipContent>
          <div className="flex items-center gap-2">
            <Circle
              className="h-2 w-2"
              fill={collaborator.isOnline ? '#22c55e' : '#94a3b8'}
              stroke="none"
            />
            <span>{collaborator.name}</span>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

// ============================================================================
// COLLABORATOR LIST
// ============================================================================

function CollaboratorList({ collaborators }: { collaborators: Collaborator[] }) {
  if (collaborators.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        <Users className="h-8 w-8 mx-auto mb-2 opacity-50" />
        <p>No other collaborators</p>
        <p className="text-xs">Share the link to invite others</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {collaborators.map((collaborator) => (
        <div
          key={collaborator.id}
          className="flex items-center gap-3 p-2 rounded-md hover:bg-muted/50"
        >
          <CollaboratorAvatar collaborator={collaborator} showTooltip={false} size="md" />
          <div className="flex-1 min-w-0">
            <div className="font-medium text-sm truncate">{collaborator.name}</div>
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <Circle
                className="h-2 w-2"
                fill={collaborator.isOnline ? '#22c55e' : '#94a3b8'}
                stroke="none"
              />
              {collaborator.isOnline ? 'Active now' : 'Offline'}
            </div>
          </div>
          {collaborator.selectedElementIds && collaborator.selectedElementIds.length > 0 && (
            <Badge variant="secondary" className="text-xs">
              Editing
            </Badge>
          )}
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// ACTIVITY FEED
// ============================================================================

function ActivityFeed() {
  const recentEvents = useCanvasCollaborationStore((s) => s.recentEvents);
  const filteredEvents = recentEvents.slice(0, 10);

  if (filteredEvents.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground text-sm">
        <p>No recent activity</p>
      </div>
    );
  }

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    
    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    return `${Math.floor(hours / 24)}d ago`;
  };

  const getEventText = (event: typeof filteredEvents[0]) => {
    switch (event.type) {
      case 'join':
        return 'joined the canvas';
      case 'leave':
        return 'left the canvas';
      case 'element_change':
        return 'made changes';
      case 'comment_add':
        return 'added a comment';
      default:
        return 'was active';
    }
  };

  return (
    <div className="space-y-2">
      {filteredEvents.map((event) => (
        <div key={event.id} className="flex items-center gap-2 text-xs">
          <span className="font-medium">{event.userName}</span>
          <span className="text-muted-foreground">{getEventText(event)}</span>
          <span className="text-muted-foreground ml-auto">{formatTime(event.timestamp)}</span>
        </div>
      ))}
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CanvasPresence({ className, maxAvatars = 3 }: CanvasPresenceProps) {
  const connectionStatus = useCanvasCollaborationStore((s) => s.connectionStatus);
  const isConnected = useCanvasCollaborationStore((s) => s.isConnected);
  const getActiveCollaborators = useCanvasCollaborationStore((s) => s.getActiveCollaborators);
  
  const [collaborators, setCollaborators] = useState<Collaborator[]>([]);
  
  useEffect(() => {
    // Update collaborators list
    const updateCollaborators = () => {
      setCollaborators(getActiveCollaborators());
    };
    
    updateCollaborators();
    const interval = setInterval(updateCollaborators, 5000);
    return () => clearInterval(interval);
  }, [getActiveCollaborators]);

  const displayedCollaborators = collaborators.slice(0, maxAvatars);
  const remainingCount = collaborators.length - maxAvatars;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn('gap-2 h-8', className)}
        >
          {/* Connection status indicator */}
          {isConnected ? (
            <Wifi className="h-3 w-3 text-green-500" />
          ) : (
            <WifiOff className="h-3 w-3 text-muted-foreground" />
          )}
          
          {/* Collaborator avatars */}
          {displayedCollaborators.length > 0 ? (
            <div className="flex -space-x-2">
              {displayedCollaborators.map((collaborator) => (
                <CollaboratorAvatar
                  key={collaborator.id}
                  collaborator={collaborator}
                  showTooltip={false}
                />
              ))}
              {remainingCount > 0 && (
                <div className="h-7 w-7 rounded-full bg-muted flex items-center justify-center text-xs font-medium border-2 border-background">
                  +{remainingCount}
                </div>
              )}
            </div>
          ) : (
            <Users className="h-4 w-4" />
          )}
          
          <span className="text-xs">
            {collaborators.length === 0
              ? 'Only you'
              : `${collaborators.length + 1} collaborator${collaborators.length > 0 ? 's' : ''}`}
          </span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80" align="end">
        <div className="space-y-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b pb-2">
            <h4 className="font-medium text-sm">Collaborators</h4>
            <Badge
              variant={isConnected ? 'default' : 'secondary'}
              className="text-xs"
            >
              {connectionStatus === 'connected' && '● Live'}
              {connectionStatus === 'connecting' && '○ Connecting...'}
              {connectionStatus === 'disconnected' && '○ Offline'}
              {connectionStatus === 'error' && '○ Error'}
            </Badge>
          </div>

          {/* Collaborator list */}
          <div>
            <h5 className="text-xs font-medium text-muted-foreground mb-2">
              Active ({collaborators.length})
            </h5>
            <CollaboratorList collaborators={collaborators} />
          </div>

          {/* Activity feed */}
          <div className="border-t pt-3">
            <h5 className="text-xs font-medium text-muted-foreground mb-2">
              Recent Activity
            </h5>
            <ActivityFeed />
          </div>

          {/* Share link hint */}
          <div className="border-t pt-3 text-center">
            <p className="text-xs text-muted-foreground">
              Share the page URL to invite collaborators
            </p>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ============================================================================
// CURSOR OVERLAY
// ============================================================================

export function CollaboratorCursors() {
  const collaborators = useCanvasCollaborationStore((s) => s.collaborators);
  const currentUserId = useCanvasCollaborationStore((s) => s.currentUserId);
  
  const otherCollaborators = Array.from(collaborators.values()).filter(
    (c) => c.id !== currentUserId && c.cursor && c.isOnline
  );

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden">
      {otherCollaborators.map((collaborator) => (
        <div
          key={collaborator.id}
          className="absolute transition-all duration-100"
          style={{
            left: collaborator.cursor?.x || 0,
            top: collaborator.cursor?.y || 0,
          }}
        >
          {/* Cursor */}
          <svg
            width="24"
            height="24"
            viewBox="0 0 24 24"
            fill={collaborator.color}
            className="drop-shadow-md"
          >
            <path d="M5.65 2.922a.5.5 0 0 0-.78.54l4.93 15.11a.5.5 0 0 0 .94.03l2.12-5.46 5.46-2.12a.5.5 0 0 0-.03-.94L3.17 5.15" />
          </svg>
          {/* Name label */}
          <div
            className="absolute left-5 top-4 px-2 py-0.5 rounded text-xs text-white font-medium whitespace-nowrap"
            style={{ backgroundColor: collaborator.color }}
          >
            {collaborator.name.split(' ')[0]}
          </div>
        </div>
      ))}
    </div>
  );
}

export default CanvasPresence;
