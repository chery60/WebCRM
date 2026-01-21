'use client';

import { useState } from 'react';
import { X, Trash2, FolderInput, Copy, Flag, Layers, Users, Tag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { motion, AnimatePresence } from 'framer-motion';
import { useRoadmaps } from '@/lib/hooks/use-roadmaps';
import { cn } from '@/lib/utils';
import { FEATURE_REQUEST_STATUSES, FEATURE_REQUEST_PRIORITIES } from '@/types';
import type { FeatureRequestStatus, FeatureRequestPriority } from '@/types';

// Mock users - in a real app, this would come from a users hook/API
const AVAILABLE_USERS = [
  { id: 'user-1', name: 'John Doe' },
  { id: 'user-2', name: 'Jane Smith' },
  { id: 'user-3', name: 'Mike Johnson' },
  { id: 'user-4', name: 'Sarah Wilson' },
  { id: 'user-5', name: 'Alex Brown' },
];

// Common tags for features
const COMMON_TAGS = [
  'frontend',
  'backend',
  'api',
  'ui',
  'ux',
  'bug',
  'enhancement',
  'performance',
  'security',
  'documentation',
];

interface FeatureBulkActionBarProps {
  selectedCount: number;
  currentPipelineId?: string;
  onClearSelection: () => void;
  onMoveToRoadmap: (roadmapId: string) => void;
  onChangeStatus: (status: FeatureRequestStatus) => void;
  onChangePriority: (priority: FeatureRequestPriority) => void;
  onChangePhase: (phase: string) => void;
  onAssignUsers: (userIds: string[]) => void;
  onAddTags: (tags: string[]) => void;
  onDuplicate: () => void;
  onDelete: () => void;
}

const PHASES = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Future'];

export function FeatureBulkActionBar({
  selectedCount,
  currentPipelineId,
  onClearSelection,
  onMoveToRoadmap,
  onChangeStatus,
  onChangePriority,
  onChangePhase,
  onAssignUsers,
  onAddTags,
  onDuplicate,
  onDelete,
}: FeatureBulkActionBarProps) {
  const { data: allRoadmaps = [] } = useRoadmaps();
  
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customTag, setCustomTag] = useState('');
  const [usersPopoverOpen, setUsersPopoverOpen] = useState(false);
  const [tagsPopoverOpen, setTagsPopoverOpen] = useState(false);
  
  // Filter roadmaps to show only those in the current pipeline (if specified) or all
  const roadmaps = currentPipelineId 
    ? allRoadmaps.filter((r) => r.pipelineId === currentPipelineId)
    : allRoadmaps;

  const handleToggleUser = (userId: string) => {
    setSelectedUsers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleApplyUsers = () => {
    if (selectedUsers.length > 0) {
      onAssignUsers(selectedUsers);
      setSelectedUsers([]);
      setUsersPopoverOpen(false);
    }
  };

  const handleToggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleAddCustomTag = () => {
    if (customTag.trim() && !selectedTags.includes(customTag.trim())) {
      setSelectedTags((prev) => [...prev, customTag.trim()]);
      setCustomTag('');
    }
  };

  const handleApplyTags = () => {
    if (selectedTags.length > 0) {
      onAddTags(selectedTags);
      setSelectedTags([]);
      setTagsPopoverOpen(false);
    }
  };

  if (selectedCount === 0) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ y: 100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 100, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 300, damping: 30 }}
        className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 p-2 bg-background border shadow-xl rounded-full"
      >
        <div className="flex items-center gap-2 pl-4 pr-2">
          <span className="text-sm font-medium whitespace-nowrap">
            {selectedCount} selected
          </span>
          <Button
            variant="ghost"
            size="icon"
            className="h-6 w-6 hover:bg-muted rounded-full"
            onClick={onClearSelection}
          >
            <X className="h-3 w-3" />
          </Button>
        </div>

        <Separator orientation="vertical" className="h-6" />

        <div className="flex items-center gap-1">
          {/* Change Status */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2 rounded-full"
              >
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">Status</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-52">
              <DropdownMenuLabel>Change Status</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {FEATURE_REQUEST_STATUSES.map((status) => (
                <DropdownMenuItem
                  key={status.value}
                  onClick={() => onChangeStatus(status.value)}
                >
                  <div className={cn('w-2 h-2 rounded-full mr-2', status.color)} />
                  {status.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Change Priority */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2 rounded-full"
              >
                <Flag className="h-4 w-4" />
                <span className="hidden sm:inline">Priority</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-40">
              <DropdownMenuLabel>Change Priority</DropdownMenuLabel>
              <DropdownMenuSeparator />
              {FEATURE_REQUEST_PRIORITIES.map((priority) => (
                <DropdownMenuItem
                  key={priority.value}
                  onClick={() => onChangePriority(priority.value)}
                >
                  <div className={cn('w-2 h-2 rounded-full mr-2', priority.color)} />
                  {priority.label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Change Phase */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2 rounded-full"
              >
                <Layers className="h-4 w-4" />
                <span className="hidden sm:inline">Phase</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="center" className="w-40">
              <DropdownMenuLabel>Change Phase</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onChangePhase('')}>
                No Phase
              </DropdownMenuItem>
              {PHASES.map((phase) => (
                <DropdownMenuItem
                  key={phase}
                  onClick={() => onChangePhase(phase)}
                >
                  {phase}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Assign Users */}
          <Popover open={usersPopoverOpen} onOpenChange={setUsersPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2 rounded-full"
              >
                <Users className="h-4 w-4" />
                <span className="hidden sm:inline">Assign</span>
                {selectedUsers.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {selectedUsers.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-64 p-3" align="center">
              <div className="space-y-3">
                <p className="text-sm font-medium">Assign to Users</p>
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {AVAILABLE_USERS.map((user) => (
                    <div
                      key={user.id}
                      className="flex items-center gap-2 p-1.5 rounded hover:bg-muted cursor-pointer"
                      onClick={() => handleToggleUser(user.id)}
                    >
                      <Checkbox
                        checked={selectedUsers.includes(user.id)}
                        onCheckedChange={() => handleToggleUser(user.id)}
                      />
                      <Avatar className="h-6 w-6">
                        <AvatarFallback className="text-xs">
                          {user.name.split(' ').map((n) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{user.name}</span>
                    </div>
                  ))}
                </div>
                <Button
                  size="sm"
                  className="w-full"
                  disabled={selectedUsers.length === 0}
                  onClick={handleApplyUsers}
                >
                  Assign to {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Add Tags */}
          <Popover open={tagsPopoverOpen} onOpenChange={setTagsPopoverOpen}>
            <PopoverTrigger asChild>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 gap-2 rounded-full"
              >
                <Tag className="h-4 w-4" />
                <span className="hidden sm:inline">Tags</span>
                {selectedTags.length > 0 && (
                  <Badge variant="secondary" className="ml-1 h-5 px-1.5">
                    {selectedTags.length}
                  </Badge>
                )}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-72 p-3" align="center">
              <div className="space-y-3">
                <p className="text-sm font-medium">Add Tags</p>
                
                {/* Selected tags */}
                {selectedTags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {selectedTags.map((tag) => (
                      <Badge
                        key={tag}
                        variant="secondary"
                        className="cursor-pointer hover:bg-destructive/20"
                        onClick={() => handleToggleTag(tag)}
                      >
                        {tag} ×
                      </Badge>
                    ))}
                  </div>
                )}

                {/* Custom tag input */}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add custom tag..."
                    value={customTag}
                    onChange={(e) => setCustomTag(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCustomTag()}
                    className="h-8 text-sm"
                  />
                  <Button size="sm" variant="outline" onClick={handleAddCustomTag}>
                    Add
                  </Button>
                </div>

                {/* Common tags */}
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Common tags</p>
                  <div className="flex flex-wrap gap-1">
                    {COMMON_TAGS.filter((t) => !selectedTags.includes(t)).slice(0, 8).map((tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="cursor-pointer hover:bg-accent"
                        onClick={() => handleToggleTag(tag)}
                      >
                        {tag}
                      </Badge>
                    ))}
                  </div>
                </div>

                <Button
                  size="sm"
                  className="w-full"
                  disabled={selectedTags.length === 0}
                  onClick={handleApplyTags}
                >
                  Add {selectedTags.length} tag{selectedTags.length !== 1 ? 's' : ''}
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Move to Roadmap */}
          {roadmaps.length > 1 && (
            <Select onValueChange={onMoveToRoadmap}>
              <SelectTrigger className="h-8 border-none bg-transparent hover:bg-accent hover:text-accent-foreground w-[140px] rounded-full focus:ring-0">
                <FolderInput className="mr-2 h-4 w-4" />
                <SelectValue placeholder="Move to..." />
              </SelectTrigger>
              <SelectContent align="center">
                {roadmaps.map((roadmap) => (
                  <SelectItem key={roadmap.id} value={roadmap.id}>
                    {roadmap.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}

          {/* Duplicate */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 rounded-full"
            onClick={onDuplicate}
          >
            <Copy className="h-4 w-4" />
            <span className="hidden sm:inline">Duplicate</span>
          </Button>

          <Separator orientation="vertical" className="h-6 mx-1" />

          {/* Delete */}
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-2 text-destructive hover:text-destructive hover:bg-destructive/10 rounded-full"
            onClick={onDelete}
          >
            <Trash2 className="h-4 w-4" />
            <span className="hidden sm:inline">Delete</span>
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
