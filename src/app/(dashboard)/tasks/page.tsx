'use client';

import { useState, useEffect } from 'react';
import { List, Columns, Table as TableIcon, Plus, Filter, ArrowUpDown, X, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import {
    ContextMenu,
    ContextMenuContent,
    ContextMenuItem,
    ContextMenuTrigger,
} from '@/components/ui/context-menu';
import { TaskListView } from '@/components/tasks/views/task-list-view';
import { TaskKanbanView } from '@/components/tasks/views/task-kanban-view';
import { TaskTableView } from '@/components/tasks/views/task-table-view';
import { CreateTaskDrawer } from '@/components/tasks/create-task-drawer';
import { TaskDetailsDrawer } from '@/components/tasks/task-details-drawer';
import {
    useTasksByStatus,
    useTasks,
    useCreateTask,
    useUpdateTask,
    useUpdateTaskStatus,
    useDeleteTask,
    useDuplicateTask,
    useReorderTasks,
} from '@/lib/hooks/use-tasks';
import { useTaskTabsManager } from '@/lib/hooks/use-task-tabs';
import type { Task, TaskFormData, TaskStatus, TaskSortField, SortDirection, TaskTab } from '@/types';
import { db } from '@/lib/db/dexie';
import { useQuery } from '@tanstack/react-query';
import { useLabels } from '@/lib/hooks/use-labels';
import { cn } from '@/lib/utils';

type ViewType = 'list' | 'kanban' | 'table';

export default function TasksPage() {
    const [view, setView] = useState<ViewType>('list');
    const [createDrawerOpen, setCreateDrawerOpen] = useState(false);
    const [detailsDrawerOpen, setDetailsDrawerOpen] = useState(false);
    const [selectedTask, setSelectedTask] = useState<Task | null>(null);
    const [defaultStatus, setDefaultStatus] = useState<TaskStatus>('planned');
    const [sortField, setSortField] = useState<TaskSortField>('createdAt');
    const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

    // Tab management state
    const [addTabDialogOpen, setAddTabDialogOpen] = useState(false);
    const [editTabDialogOpen, setEditTabDialogOpen] = useState(false);
    const [newTabName, setNewTabName] = useState('');
    const [editingTab, setEditingTab] = useState<TaskTab | null>(null);

    // Task tab manager (handles both local storage and Supabase)
    const { tabs, activeTabId, addTab, updateTab, deleteTab, setActiveTab, isLoading: tabsLoading } = useTaskTabsManager();

    // Filter based on active tab
    const filter = activeTabId ? { projectId: activeTabId } : undefined;

    // Queries
    const { data: tasksByStatus, isLoading: loadingByStatus } = useTasksByStatus(filter);
    const { data: allTasks, isLoading: loadingAll } = useTasks(
        filter,
        { field: sortField, direction: sortDirection }
    );

    // Get users for avatars
    const { data: users = [] } = useQuery({
        queryKey: ['users'],
        queryFn: async () => db.users.toArray(),
    });

    // Get available labels
    const { data: availableLabels = [] } = useLabels();

    // Mutations
    const createTask = useCreateTask();
    const updateTask = useUpdateTask();
    const updateTaskStatusMutation = useUpdateTaskStatus();
    const deleteTaskMutation = useDeleteTask();
    const duplicateTaskMutation = useDuplicateTask();
    const reorderTasksMutation = useReorderTasks();

    // Keep selectedTask in sync with updated task data
    useEffect(() => {
        if (selectedTask && allTasks) {
            const updatedTask = allTasks.find(t => t.id === selectedTask.id);
            if (updatedTask) {
                setSelectedTask(updatedTask);
            }
        }
    }, [allTasks, selectedTask?.id]); // Only depend on task ID to avoid infinite loops

    const handleTaskClick = (task: Task) => {
        setSelectedTask(task);
        setDetailsDrawerOpen(true);
    };

    const handleCreateTask = (status: TaskStatus) => {
        setDefaultStatus(status);
        setCreateDrawerOpen(true);
    };

    const handleToggleComplete = (id: string, completed: boolean) => {
        updateTaskStatusMutation.mutate({
            id,
            status: completed ? 'completed' : 'upcoming',
        });
    };

    const handleStatusChange = (id: string, status: TaskStatus) => {
        updateTaskStatusMutation.mutate({
            id,
            status,
        });
    };

    const handleEditTask = (task: Task) => {
        setSelectedTask(task);
        setDetailsDrawerOpen(true);
    };

    const handleDuplicateTask = (id: string) => {
        duplicateTaskMutation.mutate(id);
    };

    const handleDeleteTask = (id: string) => {
        deleteTaskMutation.mutate(id);
    };

    const handleCreateNewTask = (data: TaskFormData) => {
        createTask.mutate(data);
    };

    const handleUpdateTask = (id: string, updates: Partial<Task>) => {
        updateTask.mutate({ id, updates });
    };

    const handleProjectChange = (id: string, projectId: string | undefined) => {
        updateTask.mutate({ id, updates: { projectId } });
    };

    const handleSort = (field: TaskSortField) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('asc');
        }
    };

    // Tab management handlers
    const handleAddTab = async () => {
        if (newTabName.trim()) {
            const newTab = await addTab(newTabName.trim());
            setNewTabName('');
            setAddTabDialogOpen(false);
            setActiveTab(newTab.id);
        }
    };

    const handleEditTab = () => {
        if (editingTab && newTabName.trim()) {
            updateTab(editingTab.id, { name: newTabName.trim() });
            setNewTabName('');
            setEditTabDialogOpen(false);
            setEditingTab(null);
        }
    };

    const handleDeleteTab = (tabId: string) => {
        deleteTab(tabId);
    };

    const openEditDialog = (tab: TaskTab) => {
        setEditingTab(tab);
        setNewTabName(tab.name);
        setEditTabDialogOpen(true);
    };

    const isLoading = loadingByStatus || loadingAll || tabsLoading;

    return (
        <div className="flex-1 flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b">
                <div className="flex items-center gap-4">
                    <h1 className="text-2xl font-medium">Task</h1>
                    <Tabs value={view} onValueChange={(v) => setView(v as ViewType)}>
                        <TabsList>
                            <TabsTrigger value="list" className="gap-2">
                                <List className="h-4 w-4" />
                                List
                            </TabsTrigger>
                            <TabsTrigger value="kanban" className="gap-2">
                                <Columns className="h-4 w-4" />
                                Kanban
                            </TabsTrigger>
                            <TabsTrigger value="table" className="gap-2">
                                <TableIcon className="h-4 w-4" />
                                Table
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                        <ArrowUpDown className="mr-2 h-4 w-4" />
                        Sort By
                    </Button>
                    <Button variant="outline" size="sm">
                        <Filter className="mr-2 h-4 w-4" />
                        Filter
                    </Button>
                    <Button size="sm" onClick={() => handleCreateTask('planned')}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Task
                    </Button>
                </div>
            </div>

            {/* Project Tabs */}
            <div className="flex items-center gap-2 px-6 py-3 border-b bg-muted/30">
                <button
                    onClick={() => setActiveTab(null)}
                    className={cn(
                        "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                        activeTabId === null
                            ? "bg-primary text-primary-foreground"
                            : "text-muted-foreground hover:text-foreground hover:bg-muted"
                    )}
                >
                    All Tasks
                </button>
                {tabs.map((tab) => (
                    <ContextMenu key={tab.id}>
                        <ContextMenuTrigger asChild>
                            <button
                                onClick={() => setActiveTab(tab.id)}
                                className={cn(
                                    "px-4 py-1.5 text-sm font-medium rounded-md transition-colors",
                                    activeTabId === tab.id
                                        ? "bg-primary text-primary-foreground"
                                        : "text-muted-foreground hover:text-foreground hover:bg-muted"
                                )}
                            >
                                {tab.name}
                            </button>
                        </ContextMenuTrigger>
                        <ContextMenuContent>
                            <ContextMenuItem onClick={() => openEditDialog(tab)}>
                                <Pencil className="mr-2 h-4 w-4" />
                                Rename
                            </ContextMenuItem>
                            <ContextMenuItem
                                onClick={() => handleDeleteTab(tab.id)}
                                className="text-destructive focus:text-destructive"
                            >
                                <X className="mr-2 h-4 w-4" />
                                Delete
                            </ContextMenuItem>
                        </ContextMenuContent>
                    </ContextMenu>
                ))}
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setAddTabDialogOpen(true)}
                    className="text-muted-foreground hover:text-foreground"
                >
                    <Plus className="h-4 w-4 mr-1" />
                    Add Tab
                </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto p-6">
                {isLoading ? (
                    <div className="flex items-center justify-center h-64">
                        <div className="text-muted-foreground">Loading tasks...</div>
                    </div>
                ) : (
                    <>
                        {view === 'list' && tasksByStatus && (
                            <TaskListView
                                tasksByStatus={tasksByStatus}
                                users={users}
                                tabs={tabs}
                                onTaskClick={handleTaskClick}
                                onCreateTask={handleCreateTask}
                                onToggleComplete={handleToggleComplete}
                                onStatusChange={handleStatusChange}
                                onProjectChange={handleProjectChange}
                                onEditTask={handleEditTask}
                                onDuplicateTask={handleDuplicateTask}
                                onDeleteTask={handleDeleteTask}
                                onReorderTasks={(items) => reorderTasksMutation.mutate(items)}
                            />
                        )}
                        {view === 'kanban' && tasksByStatus && (
                            <TaskKanbanView
                                tasksByStatus={tasksByStatus}
                                users={users}
                                onTaskClick={handleTaskClick}
                                onCreateTask={handleCreateTask}
                                onEditTask={handleEditTask}
                                onDuplicateTask={handleDuplicateTask}
                                onDeleteTask={handleDeleteTask}
                                onUpdateTaskStatus={handleStatusChange}
                            />
                        )}
                        {view === 'table' && allTasks && (
                            <TaskTableView
                                tasks={allTasks}
                                users={users}
                                onTaskClick={handleTaskClick}
                                onCreateTask={() => handleCreateTask('planned')}
                                onEditTask={handleEditTask}
                                onDuplicateTask={handleDuplicateTask}
                                onDeleteTask={handleDeleteTask}
                                onSort={handleSort}
                                sortField={sortField}
                                sortDirection={sortDirection}
                                onUpdateTaskStatus={handleStatusChange}
                                onToggleComplete={handleToggleComplete}
                            />
                        )}
                    </>
                )}
            </div>

            {/* Drawers */}
            <CreateTaskDrawer
                open={createDrawerOpen}
                onClose={() => setCreateDrawerOpen(false)}
                onCreate={handleCreateNewTask}
                defaultStatus={defaultStatus}
                users={users}
                availableLabels={availableLabels}
                tabs={tabs}
                defaultProjectId={activeTabId || undefined}
            />
            <TaskDetailsDrawer
                open={detailsDrawerOpen}
                task={selectedTask}
                users={users}
                onClose={() => {
                    setDetailsDrawerOpen(false);
                    setSelectedTask(null);
                }}
                onUpdate={handleUpdateTask}
            />

            {/* Add Tab Dialog */}
            <Dialog open={addTabDialogOpen} onOpenChange={setAddTabDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Add New Tab</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="Tab name (e.g., Project Alpha)"
                            value={newTabName}
                            onChange={(e) => setNewTabName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleAddTab();
                                }
                            }}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setAddTabDialogOpen(false);
                            setNewTabName('');
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={handleAddTab} disabled={!newTabName.trim()}>
                            Add Tab
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Edit Tab Dialog */}
            <Dialog open={editTabDialogOpen} onOpenChange={setEditTabDialogOpen}>
                <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                        <DialogTitle>Rename Tab</DialogTitle>
                    </DialogHeader>
                    <div className="py-4">
                        <Input
                            placeholder="Tab name"
                            value={newTabName}
                            onChange={(e) => setNewTabName(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    handleEditTab();
                                }
                            }}
                            autoFocus
                        />
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => {
                            setEditTabDialogOpen(false);
                            setNewTabName('');
                            setEditingTab(null);
                        }}>
                            Cancel
                        </Button>
                        <Button onClick={handleEditTab} disabled={!newTabName.trim()}>
                            Save
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
