'use client';

import { useState, useRef, useEffect } from 'react';
import {
  Calendar,
  Flag,
  Users,
  Tag,
  Paperclip,
  MessageSquare,
  Plus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Send,
  Clock,
  Target,
  Lightbulb,
  CheckSquare,
  BookOpen,
  Code,
  Link2,
  BarChart3,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Calendar as CalendarComponent } from '@/components/ui/calendar';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';
import {
  useUpdateFeatureRequest,
  useCreateFeatureRequest,
  useAddFeatureActivity,
} from '@/lib/hooks/use-feature-requests';
import type { FeatureRequest, FeatureRequestStatus, FeatureRequestPriority, BusinessValue, FeatureActivity } from '@/types';
import { FEATURE_REQUEST_STATUSES, FEATURE_REQUEST_PRIORITIES, BUSINESS_VALUES } from '@/types';

interface FeatureRequestDrawerProps {
  open: boolean;
  feature: FeatureRequest | null;
  onClose: () => void;
  mode?: 'create' | 'edit';
  roadmapId?: string;
  defaultPhase?: string;
  defaultStatus?: FeatureRequestStatus;
}

const PHASES = ['Phase 1', 'Phase 2', 'Phase 3', 'Phase 4', 'Future'];

export function FeatureRequestDrawer({ 
  open, 
  feature, 
  onClose, 
  mode = 'edit',
  roadmapId,
  defaultPhase,
  defaultStatus,
}: FeatureRequestDrawerProps) {
  const updateFeature = useUpdateFeatureRequest();
  const createFeature = useCreateFeatureRequest();
  const addActivity = useAddFeatureActivity();
  
  const isCreateMode = mode === 'create';
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [status, setStatus] = useState<FeatureRequestStatus>('backlog');
  const [priority, setPriority] = useState<FeatureRequestPriority>('medium');
  const [phase, setPhase] = useState('');
  const [dueDate, setDueDate] = useState<Date | undefined>();
  const [startDate, setStartDate] = useState<Date | undefined>();
  const [problemStatement, setProblemStatement] = useState('');
  const [proposedSolution, setProposedSolution] = useState('');
  const [technicalNotes, setTechnicalNotes] = useState('');
  const [estimatedEffort, setEstimatedEffort] = useState('');
  const [businessValue, setBusinessValue] = useState<BusinessValue | ''>('');
  const [acceptanceCriteria, setAcceptanceCriteria] = useState<string[]>([]);
  const [userStories, setUserStories] = useState<string[]>([]);
  const [dependencies, setDependencies] = useState<string[]>([]);
  const [newCriterion, setNewCriterion] = useState('');
  const [newUserStory, setNewUserStory] = useState('');
  const [newDependency, setNewDependency] = useState('');
  const [comment, setComment] = useState('');

  // Section collapse state
  const [expandedSections, setExpandedSections] = useState({
    details: true,
    problem: true,
    solution: true,
    criteria: true,
    stories: false,
    technical: false,
    activity: true,
  });

  // Initialize form when feature changes or drawer opens
  useEffect(() => {
    if (open) {
      if (isCreateMode) {
        // Reset form for create mode
        setTitle('');
        setDescription('');
        setStatus(defaultStatus || 'backlog');
        setPriority('medium');
        setPhase(defaultPhase || '');
        setDueDate(undefined);
        setStartDate(undefined);
        setProblemStatement('');
        setProposedSolution('');
        setTechnicalNotes('');
        setEstimatedEffort('');
        setBusinessValue('');
        setAcceptanceCriteria([]);
        setUserStories([]);
        setDependencies([]);
        setComment('');
        setNewCriterion('');
        setNewUserStory('');
        setNewDependency('');
      } else if (feature) {
        // Populate form for edit mode
        setTitle(feature.title);
        setDescription(feature.description || '');
        setStatus(feature.status);
        setPriority(feature.priority);
        setPhase(feature.phase || '');
        setDueDate(feature.dueDate ? new Date(feature.dueDate) : undefined);
        setStartDate(feature.startDate ? new Date(feature.startDate) : undefined);
        setProblemStatement(feature.problemStatement || '');
        setProposedSolution(feature.proposedSolution || '');
        setTechnicalNotes(feature.technicalNotes || '');
        setEstimatedEffort(feature.estimatedEffort || '');
        setBusinessValue(feature.businessValue || '');
        setAcceptanceCriteria(feature.acceptanceCriteria || []);
        setUserStories(feature.userStories || []);
        setDependencies(feature.dependencies || []);
      }
    }
  }, [open, feature, isCreateMode, defaultPhase, defaultStatus]);

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const handleUpdate = async (updates: Partial<FeatureRequest>) => {
    if (isCreateMode || !feature) return; // Don't auto-save in create mode
    try {
      await updateFeature.mutateAsync({ id: feature.id, data: updates });
    } catch {
      toast.error('Failed to update');
    }
  };

  const handleCreate = async () => {
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }
    if (!roadmapId) {
      toast.error('No roadmap selected');
      return;
    }

    setIsSaving(true);
    try {
      await createFeature.mutateAsync({
        roadmapId,
        title: title.trim(),
        description: description.trim() || undefined,
        status,
        priority,
        phase: phase || undefined,
        dueDate,
        startDate,
        problemStatement: problemStatement.trim() || undefined,
        proposedSolution: proposedSolution.trim() || undefined,
        technicalNotes: technicalNotes.trim() || undefined,
        estimatedEffort: estimatedEffort.trim() || undefined,
        businessValue: businessValue || undefined,
        acceptanceCriteria,
        userStories,
        dependencies,
        assignees: [],
        tags: [],
        createdBy: 'user-1',
        createdByName: 'Current User',
      });
      toast.success('Feature created');
      onClose();
    } catch {
      toast.error('Failed to create feature');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSave = async () => {
    if (!feature) return;
    if (!title.trim()) {
      toast.error('Please enter a title');
      return;
    }

    setIsSaving(true);
    try {
      await updateFeature.mutateAsync({
        id: feature.id,
        data: {
          title: title.trim(),
          description: description.trim() || undefined,
          status,
          priority,
          phase: phase || undefined,
          dueDate,
          startDate,
          problemStatement: problemStatement.trim() || undefined,
          proposedSolution: proposedSolution.trim() || undefined,
          technicalNotes: technicalNotes.trim() || undefined,
          estimatedEffort: estimatedEffort.trim() || undefined,
          businessValue: businessValue || undefined,
          acceptanceCriteria,
          userStories,
          dependencies,
        },
      });
      toast.success('Feature saved');
      onClose();
    } catch {
      toast.error('Failed to save feature');
    } finally {
      setIsSaving(false);
    }
  };

  const handleTitleBlur = () => {
    if (!isCreateMode && feature && title !== feature.title) {
      handleUpdate({ title });
    }
  };

  const handleDescriptionBlur = () => {
    if (!isCreateMode && feature && description !== (feature.description || '')) {
      handleUpdate({ description: description || undefined });
    }
  };

  const handleStatusChange = (value: FeatureRequestStatus) => {
    setStatus(value);
    if (!isCreateMode) handleUpdate({ status: value });
  };

  const handlePriorityChange = (value: FeatureRequestPriority) => {
    setPriority(value);
    if (!isCreateMode) handleUpdate({ priority: value });
  };

  const handlePhaseChange = (value: string) => {
    setPhase(value);
    if (!isCreateMode) handleUpdate({ phase: value || undefined });
  };

  const handleDateChange = (field: 'dueDate' | 'startDate', date: Date | undefined) => {
    if (field === 'dueDate') {
      setDueDate(date);
    } else {
      setStartDate(date);
    }
    if (!isCreateMode) handleUpdate({ [field]: date });
  };

  const handleProblemStatementBlur = () => {
    if (!isCreateMode && feature && problemStatement !== (feature.problemStatement || '')) {
      handleUpdate({ problemStatement: problemStatement || undefined });
    }
  };

  const handleProposedSolutionBlur = () => {
    if (!isCreateMode && feature && proposedSolution !== (feature.proposedSolution || '')) {
      handleUpdate({ proposedSolution: proposedSolution || undefined });
    }
  };

  const handleTechnicalNotesBlur = () => {
    if (!isCreateMode && feature && technicalNotes !== (feature.technicalNotes || '')) {
      handleUpdate({ technicalNotes: technicalNotes || undefined });
    }
  };

  const handleEstimatedEffortBlur = () => {
    if (!isCreateMode && feature && estimatedEffort !== (feature.estimatedEffort || '')) {
      handleUpdate({ estimatedEffort: estimatedEffort || undefined });
    }
  };

  const handleBusinessValueChange = (value: BusinessValue | '') => {
    setBusinessValue(value);
    if (!isCreateMode) handleUpdate({ businessValue: value || undefined });
  };

  const handleAddCriterion = () => {
    if (!newCriterion.trim()) return;
    const updated = [...acceptanceCriteria, newCriterion.trim()];
    setAcceptanceCriteria(updated);
    setNewCriterion('');
    if (!isCreateMode) handleUpdate({ acceptanceCriteria: updated });
  };

  const handleRemoveCriterion = (index: number) => {
    const updated = acceptanceCriteria.filter((_, i) => i !== index);
    setAcceptanceCriteria(updated);
    if (!isCreateMode) handleUpdate({ acceptanceCriteria: updated });
  };

  const handleAddUserStory = () => {
    if (!newUserStory.trim()) return;
    const updated = [...userStories, newUserStory.trim()];
    setUserStories(updated);
    setNewUserStory('');
    if (!isCreateMode) handleUpdate({ userStories: updated });
  };

  const handleRemoveUserStory = (index: number) => {
    const updated = userStories.filter((_, i) => i !== index);
    setUserStories(updated);
    if (!isCreateMode) handleUpdate({ userStories: updated });
  };

  const handleAddDependency = () => {
    if (!newDependency.trim()) return;
    const updated = [...dependencies, newDependency.trim()];
    setDependencies(updated);
    setNewDependency('');
    if (!isCreateMode) handleUpdate({ dependencies: updated });
  };

  const handleRemoveDependency = (index: number) => {
    const updated = dependencies.filter((_, i) => i !== index);
    setDependencies(updated);
    if (!isCreateMode) handleUpdate({ dependencies: updated });
  };

  const handleAddComment = async () => {
    if (!comment.trim() || !feature) return;
    try {
      await addActivity.mutateAsync({
        id: feature.id,
        activity: {
          type: 'comment',
          content: comment.trim(),
          userId: 'user-1',
          userName: 'Current User',
        },
      });
      setComment('');
      toast.success('Comment added');
    } catch {
      toast.error('Failed to add comment');
    }
  };

  // In create mode, we don't need a feature; in edit mode, we do
  if (!isCreateMode && !feature) return null;

  const statusConfig = FEATURE_REQUEST_STATUSES.find((s) => s.value === status);
  const priorityConfig = FEATURE_REQUEST_PRIORITIES.find((p) => p.value === priority);

  return (
    <Sheet open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <SheetContent className="w-full sm:max-w-[700px] p-0 flex flex-col h-full overflow-hidden">
        {/* Header */}
        <SheetHeader className="px-6 py-4 border-b shrink-0 sticky top-0 bg-background z-10">
          <SheetTitle className="sr-only">
            {isCreateMode ? 'Create Feature Request' : 'Feature Request Details'}
          </SheetTitle>
          <SheetDescription className="sr-only">
            {isCreateMode ? 'Create a new feature request' : 'View and edit feature request details'}
          </SheetDescription>
          <div className="flex items-start justify-between">
            <div className="flex-1 pr-8">
              <Input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={handleTitleBlur}
                className="text-xl font-semibold border-none p-0 h-auto focus-visible:ring-0"
                placeholder={isCreateMode ? "Enter feature title..." : "Feature title"}
                autoFocus={isCreateMode}
              />
              <div className="flex items-center gap-2 mt-2">
                <Badge className={cn('text-white', statusConfig?.color)}>
                  {statusConfig?.label}
                </Badge>
                <Badge variant="outline" className={cn(
                  priority === 'urgent' && 'border-red-500 text-red-500',
                  priority === 'high' && 'border-orange-500 text-orange-500'
                )}>
                  {priorityConfig?.label} Priority
                </Badge>
                {phase && <Badge variant="secondary">{phase}</Badge>}
              </div>
            </div>
          </div>
        </SheetHeader>

        <ScrollArea className="flex-1 overflow-auto">
          <div className="px-6 py-4 space-y-6">
            {/* Status & Priority Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Status</label>
                <Select value={status} onValueChange={handleStatusChange}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEATURE_REQUEST_STATUSES.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', s.color)} />
                          {s.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Priority</label>
                <Select value={priority} onValueChange={handlePriorityChange}>
                  <SelectTrigger className="h-9">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FEATURE_REQUEST_PRIORITIES.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', p.color)} />
                          {p.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Phase</label>
                <Select 
                  value={phase || 'none'} 
                  onValueChange={(v) => handlePhaseChange(v === 'none' ? '' : v)}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select phase" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No Phase</SelectItem>
                    {PHASES.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium">Business Value</label>
                <Select 
                  value={businessValue || 'none'} 
                  onValueChange={(v) => handleBusinessValueChange(v === 'none' ? '' : v as BusinessValue | '')}
                >
                  <SelectTrigger className="h-9">
                    <SelectValue placeholder="Select value" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Not set</SelectItem>
                    {BUSINESS_VALUES.map((v) => (
                      <SelectItem key={v.value} value={v.value}>
                        <div className="flex items-center gap-2">
                          <div className={cn('w-2 h-2 rounded-full', v.color)} />
                          {v.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Dates Row */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Start Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start h-9 text-left font-normal">
                      {startDate ? format(startDate, 'MMM d, yyyy') : 'Set start date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={startDate}
                      onSelect={(date) => handleDateChange('startDate', date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Calendar className="h-3 w-3" /> Due Date
                </label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="w-full justify-start h-9 text-left font-normal">
                      {dueDate ? format(dueDate, 'MMM d, yyyy') : 'Set due date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <CalendarComponent
                      mode="single"
                      selected={dueDate}
                      onSelect={(date) => handleDateChange('dueDate', date)}
                    />
                  </PopoverContent>
                </Popover>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                  <Clock className="h-3 w-3" /> Estimated Effort
                </label>
                <Input
                  value={estimatedEffort}
                  onChange={(e) => setEstimatedEffort(e.target.value)}
                  onBlur={handleEstimatedEffortBlur}
                  placeholder="e.g., 2 weeks, 5 story points"
                  className="h-9"
                />
              </div>
            </div>

            <Separator />

            {/* Description */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={handleDescriptionBlur}
                placeholder="Describe the feature..."
                rows={3}
              />
            </div>

            {/* Problem Statement */}
            <Collapsible open={expandedSections.problem} onOpenChange={() => toggleSection('problem')}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                <Target className="h-4 w-4 text-red-500" />
                <span className="font-medium text-sm flex-1">Problem Statement</span>
                <span className="text-xs text-muted-foreground">What problem does this solve?</span>
                {expandedSections.problem ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <Textarea
                  value={problemStatement}
                  onChange={(e) => setProblemStatement(e.target.value)}
                  onBlur={handleProblemStatementBlur}
                  placeholder="Describe the problem this feature solves for users..."
                  rows={3}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Proposed Solution */}
            <Collapsible open={expandedSections.solution} onOpenChange={() => toggleSection('solution')}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                <Lightbulb className="h-4 w-4 text-yellow-500" />
                <span className="font-medium text-sm flex-1">Proposed Solution</span>
                <span className="text-xs text-muted-foreground">How will we solve it?</span>
                {expandedSections.solution ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3">
                <Textarea
                  value={proposedSolution}
                  onChange={(e) => setProposedSolution(e.target.value)}
                  onBlur={handleProposedSolutionBlur}
                  placeholder="Describe the proposed solution..."
                  rows={3}
                />
              </CollapsibleContent>
            </Collapsible>

            {/* Acceptance Criteria */}
            <Collapsible open={expandedSections.criteria} onOpenChange={() => toggleSection('criteria')}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                <CheckSquare className="h-4 w-4 text-green-500" />
                <span className="font-medium text-sm flex-1">Acceptance Criteria</span>
                <Badge variant="secondary" className="text-xs">{acceptanceCriteria.length}</Badge>
                {expandedSections.criteria ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-2">
                {acceptanceCriteria.map((criterion, index) => (
                  <div key={index} className="flex items-start gap-2 group">
                    <Checkbox checked disabled className="mt-0.5" />
                    <span className="flex-1 text-sm">{criterion}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => handleRemoveCriterion(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newCriterion}
                    onChange={(e) => setNewCriterion(e.target.value)}
                    placeholder="Add acceptance criterion..."
                    className="h-8 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddCriterion()}
                  />
                  <Button size="sm" variant="outline" onClick={handleAddCriterion}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* User Stories */}
            <Collapsible open={expandedSections.stories} onOpenChange={() => toggleSection('stories')}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                <BookOpen className="h-4 w-4 text-blue-500" />
                <span className="font-medium text-sm flex-1">User Stories</span>
                <Badge variant="secondary" className="text-xs">{userStories.length}</Badge>
                {expandedSections.stories ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-2">
                {userStories.map((story, index) => (
                  <div key={index} className="flex items-start gap-2 group p-2 bg-muted/50 rounded">
                    <span className="flex-1 text-sm">{story}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 opacity-0 group-hover:opacity-100"
                      onClick={() => handleRemoveUserStory(index)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    value={newUserStory}
                    onChange={(e) => setNewUserStory(e.target.value)}
                    placeholder="As a [user], I want [feature] so that [benefit]..."
                    className="h-8 text-sm"
                    onKeyDown={(e) => e.key === 'Enter' && handleAddUserStory()}
                  />
                  <Button size="sm" variant="outline" onClick={handleAddUserStory}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Technical Notes */}
            <Collapsible open={expandedSections.technical} onOpenChange={() => toggleSection('technical')}>
              <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                <Code className="h-4 w-4 text-purple-500" />
                <span className="font-medium text-sm flex-1">Technical Notes</span>
                {expandedSections.technical ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
              </CollapsibleTrigger>
              <CollapsibleContent className="pt-3 space-y-3">
                <Textarea
                  value={technicalNotes}
                  onChange={(e) => setTechnicalNotes(e.target.value)}
                  onBlur={handleTechnicalNotesBlur}
                  placeholder="Technical implementation notes, architecture considerations..."
                  rows={3}
                />

                {/* Dependencies */}
                <div className="space-y-2">
                  <label className="text-xs text-muted-foreground font-medium flex items-center gap-1">
                    <Link2 className="h-3 w-3" /> Dependencies
                  </label>
                  {dependencies.map((dep, index) => (
                    <div key={index} className="flex items-center gap-2 group">
                      <Badge variant="outline" className="flex-1 justify-start font-normal">
                        {dep}
                      </Badge>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-6 w-6 opacity-0 group-hover:opacity-100"
                        onClick={() => handleRemoveDependency(index)}
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                  <div className="flex gap-2">
                    <Input
                      value={newDependency}
                      onChange={(e) => setNewDependency(e.target.value)}
                      placeholder="Add dependency..."
                      className="h-8 text-sm"
                      onKeyDown={(e) => e.key === 'Enter' && handleAddDependency()}
                    />
                    <Button size="sm" variant="outline" onClick={handleAddDependency}>
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CollapsibleContent>
            </Collapsible>

            {/* Activity / Comments - Only show in edit mode */}
            {!isCreateMode && feature && (
              <>
                <Separator />

                <Collapsible open={expandedSections.activity} onOpenChange={() => toggleSection('activity')}>
                  <CollapsibleTrigger className="flex items-center gap-2 w-full text-left">
                    <MessageSquare className="h-4 w-4" />
                    <span className="font-medium text-sm flex-1">Activity</span>
                    <Badge variant="secondary" className="text-xs">{feature.activities.length}</Badge>
                    {expandedSections.activity ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="pt-3 space-y-4">
                    {/* Comment Input */}
                    <div className="flex gap-2">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>U</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex gap-2">
                        <Input
                          value={comment}
                          onChange={(e) => setComment(e.target.value)}
                          placeholder="Write a comment..."
                          className="h-9"
                          onKeyDown={(e) => e.key === 'Enter' && handleAddComment()}
                        />
                        <Button size="sm" onClick={handleAddComment} disabled={!comment.trim()}>
                          <Send className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>

                    {/* Activity List */}
                    <div className="space-y-3">
                      {feature.activities.length === 0 ? (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No activity yet
                        </p>
                      ) : (
                        [...feature.activities].reverse().map((activity) => (
                          <div key={activity.id} className="flex gap-3">
                            <Avatar className="h-7 w-7">
                              <AvatarFallback className="text-xs">
                                {activity.userName.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">{activity.userName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {format(new Date(activity.createdAt), 'MMM d, yyyy h:mm a')}
                                </span>
                              </div>
                              <p className="text-sm text-muted-foreground mt-0.5">{activity.content}</p>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </CollapsibleContent>
                </Collapsible>

                {/* Metadata */}
                <div className="text-xs text-muted-foreground pt-4 border-t">
                  <p>Created by {feature.createdByName} on {format(new Date(feature.createdAt), 'MMM d, yyyy')}</p>
                  <p>Last updated {format(new Date(feature.updatedAt), 'MMM d, yyyy h:mm a')}</p>
                </div>
              </>
            )}
          </div>
        </ScrollArea>

        {/* Footer with action buttons */}
        <div className="px-6 py-4 border-t shrink-0 flex justify-end gap-3 sticky bottom-0 bg-background z-10">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          {isCreateMode ? (
            <Button onClick={handleCreate} disabled={isSaving || !title.trim()}>
              {isSaving ? 'Creating...' : 'Create Feature'}
            </Button>
          ) : (
            <Button onClick={handleSave} disabled={isSaving || !title.trim()}>
              {isSaving ? 'Saving...' : 'Save Changes'}
            </Button>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}
