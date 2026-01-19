import { useState } from 'react';
import { format } from 'date-fns';
import { Calendar, Plus, ArrowUpDown } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { TaskLabelBadge } from '../task-label-badge';
import { TaskStatusBadge } from '../task-status-badge';
import { TaskActionsMenu } from '../task-actions-menu';
import { BulkActionBar } from '../bulk-action-bar';
import { cn } from '@/lib/utils';
import type { Task, TaskSortField, SortDirection, TaskStatus } from '@/types';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"

interface TaskTableViewProps {
    tasks: Task[];
    users: { id: string; name: string; avatar?: string }[];
    onTaskClick: (task: Task) => void;
    onCreateTask: () => void;
    onEditTask: (task: Task) => void;
    onDuplicateTask: (id: string) => void;
    onDeleteTask: (id: string) => void;
    onSort?: (field: TaskSortField) => void;
    sortField?: TaskSortField;
    sortDirection?: SortDirection;
    onUpdateTaskStatus: (taskId: string, newStatus: TaskStatus) => void;
    onToggleComplete: (id: string, completed: boolean) => void;
}

export function TaskTableView({
    tasks,
    users,
    onTaskClick,
    onCreateTask,
    onEditTask,
    onDuplicateTask,
    onDeleteTask,
    onSort,
    sortField,
    sortDirection,
    onUpdateTaskStatus,
    onToggleComplete,
}: TaskTableViewProps) {
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());

    const getAssignees = (assigneeIds: string[]) => {
        return users.filter((u) => assigneeIds.includes(u.id));
    };

    const handleToggleSelect = (id: string, selected: boolean) => {
        const newSelected = new Set(selectedTaskIds);
        if (selected) {
            newSelected.add(id);
        } else {
            newSelected.delete(id);
        }
        setSelectedTaskIds(newSelected);
    };

    const handleSelectAll = (selected: boolean) => {
        if (selected) {
            setSelectedTaskIds(new Set(tasks.map(t => t.id)));
        } else {
            setSelectedTaskIds(new Set());
        }
    };

    const handleClearSelection = () => {
        setSelectedTaskIds(new Set());
    };

    const handleBulkMarkComplete = () => {
        selectedTaskIds.forEach(id => {
            onToggleComplete(id, true);
        });
        handleClearSelection();
    };

    const handleBulkDelete = () => {
        selectedTaskIds.forEach(id => {
            onDeleteTask(id);
        });
        handleClearSelection();
    };

    const handleBulkStatusChange = (status: TaskStatus) => {
        selectedTaskIds.forEach(id => {
            onUpdateTaskStatus(id, status);
        });
        handleClearSelection();
    };

    const allSelected = tasks.length > 0 && selectedTaskIds.size === tasks.length;
    const isIndeterminate = selectedTaskIds.size > 0 && selectedTaskIds.size < tasks.length;

    return (
        <div className="rounded-lg border">
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead className="w-[4%]">
                            <Checkbox
                                checked={allSelected || (isIndeterminate ? 'indeterminate' : false)}
                                onCheckedChange={(checked) => handleSelectAll(checked as boolean)}
                            />
                        </TableHead>
                        <TableHead className="w-[35%]">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="-ml-3 h-8"
                                onClick={() => onSort?.('title')}
                            >
                                Task Name
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead className="w-[12%]">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="-ml-3 h-8"
                                onClick={() => onSort?.('dueDate')}
                            >
                                Due Date
                                <ArrowUpDown className="ml-2 h-4 w-4" />
                            </Button>
                        </TableHead>
                        <TableHead className="w-[20%]">Label</TableHead>
                        <TableHead className="w-[15%]">Member</TableHead>
                        <TableHead className="w-[12%]">Status</TableHead>
                        <TableHead className="w-[6%]"></TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {tasks.map((task) => {
                        const taskAssignees = getAssignees(task.assignees);
                        const isSelected = selectedTaskIds.has(task.id);
                        return (
                            <TableRow
                                key={task.id}
                                className={cn(
                                    "group cursor-pointer hover:bg-muted/50 transition-colors",
                                    isSelected && "bg-muted"
                                )}
                                onClick={() => onTaskClick(task)}
                            >
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                    <Checkbox
                                        checked={isSelected}
                                        onCheckedChange={(checked) => handleToggleSelect(task.id, checked as boolean)}
                                    />
                                </TableCell>
                                <TableCell className="font-medium">
                                    {task.title}
                                </TableCell>
                                <TableCell>
                                    {task.dueDate && (
                                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                                            <Calendar className="h-4 w-4" />
                                            <span>{format(new Date(task.dueDate), 'dd MMM yyyy')}</span>
                                        </div>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex flex-wrap gap-1">
                                        {task.labels.slice(0, 3).map((label) => (
                                            <TaskLabelBadge key={label} label={label} />
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell>
                                    <div className="flex items-center -space-x-2">
                                        {taskAssignees.slice(0, 3).map((assignee) => (
                                            <Avatar key={assignee.id} className="h-7 w-7 border-2 border-background">
                                                <AvatarImage src={assignee.avatar} alt={assignee.name} />
                                                <AvatarFallback className="text-xs">
                                                    {assignee.name.split(' ').map((n) => n[0]).join('')}
                                                </AvatarFallback>
                                            </Avatar>
                                        ))}
                                    </div>
                                </TableCell>
                                <TableCell onClick={(e) => e.stopPropagation()}>
                                    <Select
                                        value={task.status}
                                        onValueChange={(value) => onUpdateTaskStatus?.(task.id, value as TaskStatus)}
                                    >
                                        <SelectTrigger className="h-8 w-[110px] text-xs">
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="planned">Planned</SelectItem>
                                            <SelectItem value="upcoming">Ongoing</SelectItem>
                                            <SelectItem value="completed">Completed</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <TaskActionsMenu
                                        onEdit={() => onEditTask(task)}
                                        onDuplicate={() => onDuplicateTask(task.id)}
                                        onDelete={() => onDeleteTask(task.id)}
                                    />
                                </TableCell>
                            </TableRow>
                        );
                    })}
                    {/* Add New Task Row */}
                    <TableRow>
                        <TableCell colSpan={7}>
                            <Button
                                variant="ghost"
                                className="w-full justify-start gap-2 text-muted-foreground"
                                onClick={onCreateTask}
                            >
                                <Plus className="h-4 w-4" />
                                New Task
                            </Button>
                        </TableCell>
                    </TableRow>
                </TableBody>
            </Table>

            <BulkActionBar
                selectedCount={selectedTaskIds.size}
                onClearSelection={handleClearSelection}
                onMarkComplete={handleBulkMarkComplete}
                onDelete={handleBulkDelete}
                onStatusChange={handleBulkStatusChange}
            />
        </div>
    );
}
