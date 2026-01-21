'use client';

import { List, Table as TableIcon, LayoutGrid, Filter, ArrowUpDown, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { usePipelineStore, type PipelineViewType } from '@/lib/stores/pipeline-store';
import { FEATURE_REQUEST_STATUSES, FEATURE_REQUEST_PRIORITIES } from '@/types';

interface PipelineHeaderProps {
  title: string;
  onAddFeature: () => void;
}

export function PipelineHeader({ title, onAddFeature }: PipelineHeaderProps) {
  const { pipelineView, setPipelineView, filter, setFilter, searchQuery, setSearchQuery } =
    usePipelineStore();

  const handleStatusFilterChange = (status: string, checked: boolean) => {
    const currentStatuses = filter.status || [];
    const newStatuses = checked
      ? [...currentStatuses, status]
      : currentStatuses.filter((s) => s !== status);
    setFilter({ ...filter, status: newStatuses.length > 0 ? newStatuses as any : undefined });
  };

  const handlePriorityFilterChange = (priority: string, checked: boolean) => {
    const currentPriorities = filter.priority || [];
    const newPriorities = checked
      ? [...currentPriorities, priority]
      : currentPriorities.filter((p) => p !== priority);
    setFilter({ ...filter, priority: newPriorities.length > 0 ? newPriorities as any : undefined });
  };

  const activeFiltersCount =
    (filter.status?.length || 0) +
    (filter.priority?.length || 0) +
    (filter.phase?.length || 0) +
    (filter.assignees?.length || 0);

  return (
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-4">
        <h1 className="text-2xl font-semibold">{title}</h1>

        {/* View Switcher */}
        <Tabs
          value={pipelineView}
          onValueChange={(v) => setPipelineView(v as PipelineViewType)}
        >
          <TabsList className="h-9">
            <TabsTrigger value="list" className="gap-1.5 px-3">
              <List className="h-4 w-4" />
              List
            </TabsTrigger>
            <TabsTrigger value="table" className="gap-1.5 px-3">
              <TableIcon className="h-4 w-4" />
              Table
            </TabsTrigger>
            <TabsTrigger value="board" className="gap-1.5 px-3">
              <LayoutGrid className="h-4 w-4" />
              Board
            </TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="flex items-center gap-2">
        {/* Search */}
        <Input
          placeholder="Search features..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-9 w-48"
        />

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <ArrowUpDown className="h-4 w-4" />
              Sort By
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48">
            <DropdownMenuLabel>Sort by</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => usePipelineStore.getState().setSortField('order')}>
              Order
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => usePipelineStore.getState().setSortField('title')}>
              Title
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => usePipelineStore.getState().setSortField('priority')}>
              Priority
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => usePipelineStore.getState().setSortField('status')}>
              Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => usePipelineStore.getState().setSortField('dueDate')}>
              Due Date
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => usePipelineStore.getState().setSortField('createdAt')}>
              Created Date
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="gap-2">
              <Filter className="h-4 w-4" />
              Filter
              {activeFiltersCount > 0 && (
                <span className="ml-1 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-xs text-primary-foreground">
                  {activeFiltersCount}
                </span>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Filter by Status</DropdownMenuLabel>
            {FEATURE_REQUEST_STATUSES.map((status) => (
              <DropdownMenuCheckboxItem
                key={status.value}
                checked={filter.status?.includes(status.value)}
                onCheckedChange={(checked) => handleStatusFilterChange(status.value, checked)}
              >
                <span className={`w-2 h-2 rounded-full mr-2 ${status.color}`} />
                {status.label}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuSeparator />
            <DropdownMenuLabel>Filter by Priority</DropdownMenuLabel>
            {FEATURE_REQUEST_PRIORITIES.map((priority) => (
              <DropdownMenuCheckboxItem
                key={priority.value}
                checked={filter.priority?.includes(priority.value)}
                onCheckedChange={(checked) => handlePriorityFilterChange(priority.value, checked)}
              >
                <span className={`w-2 h-2 rounded-full mr-2 ${priority.color}`} />
                {priority.label}
              </DropdownMenuCheckboxItem>
            ))}
            {activeFiltersCount > 0 && (
              <>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={() => usePipelineStore.getState().clearFilter()}
                  className="text-destructive"
                >
                  Clear all filters
                </DropdownMenuItem>
              </>
            )}
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Add Feature Button */}
        <Button size="sm" className="gap-2" onClick={onAddFeature}>
          <Plus className="h-4 w-4" />
          Add Feature
        </Button>
      </div>
    </div>
  );
}
