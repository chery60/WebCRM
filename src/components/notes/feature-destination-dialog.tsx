'use client';

import { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Plus,
  Map,
  Loader2,
  CheckCircle2,
  Lightbulb,
  FolderTree,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePipelines, useCreatePipeline } from '@/lib/hooks/use-pipelines';
import { useRoadmaps, useCreateRoadmap } from '@/lib/hooks/use-roadmaps';
import type { GeneratedFeature, Pipeline, Roadmap } from '@/types';

// ============================================================================
// TYPES
// ============================================================================

interface FeatureDestinationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  features: GeneratedFeature[];
  mode: 'single' | 'bulk';
  onConfirm: (roadmapId: string) => Promise<void>;
  isCreating?: boolean;
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function FeatureDestinationDialog({
  open,
  onOpenChange,
  features,
  mode,
  onConfirm,
  isCreating = false,
}: FeatureDestinationDialogProps) {
  const { data: pipelines = [], isLoading: pipelinesLoading } = usePipelines();
  const { data: allRoadmaps = [], isLoading: roadmapsLoading } = useRoadmaps();
  const createPipeline = useCreatePipeline();
  const createRoadmap = useCreateRoadmap();

  const [selectedOption, setSelectedOption] = useState<'existing' | 'new-roadmap' | 'new-pipeline'>('existing');
  const [selectedRoadmapId, setSelectedRoadmapId] = useState<string>('');
  const [selectedPipelineId, setSelectedPipelineId] = useState<string>('');
  
  // New roadmap fields
  const [newRoadmapName, setNewRoadmapName] = useState('');
  const [newRoadmapPipelineId, setNewRoadmapPipelineId] = useState<string>('');
  
  // New pipeline fields
  const [newPipelineName, setNewPipelineName] = useState('');
  const [newPipelineRoadmapName, setNewPipelineRoadmapName] = useState('');
  
  const [error, setError] = useState('');
  const [isCreatingDestination, setIsCreatingDestination] = useState(false);

  // Get roadmaps grouped by pipeline
  const roadmapsByPipeline = pipelines.reduce((acc, pipeline) => {
    acc[pipeline.id] = allRoadmaps.filter((r) => r.pipelineId === pipeline.id);
    return acc;
  }, {} as Record<string, Roadmap[]>);

  // Reset state when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedOption('existing');
      setSelectedRoadmapId('');
      setSelectedPipelineId('');
      setNewRoadmapName('');
      setNewRoadmapPipelineId('');
      setNewPipelineName('');
      setNewPipelineRoadmapName('');
      setError('');
      
      // Auto-select first pipeline if available
      if (pipelines.length > 0) {
        setSelectedPipelineId(pipelines[0].id);
        setNewRoadmapPipelineId(pipelines[0].id);
      }
    }
  }, [open, pipelines]);

  const featureCount = mode === 'single' ? 1 : features.length;
  const featureLabel = featureCount === 1 ? 'feature' : 'features';
  const isLoading = pipelinesLoading || roadmapsLoading;

  const handleConfirm = async () => {
    setError('');

    try {
      if (selectedOption === 'existing') {
        if (!selectedRoadmapId) {
          setError('Please select a roadmap');
          return;
        }
        await onConfirm(selectedRoadmapId);
      } else if (selectedOption === 'new-roadmap') {
        if (!newRoadmapPipelineId) {
          setError('Please select a pipeline');
          return;
        }
        if (!newRoadmapName.trim()) {
          setError('Please enter a roadmap name');
          return;
        }
        
        // Check for duplicate roadmap name in the pipeline
        const existingRoadmaps = roadmapsByPipeline[newRoadmapPipelineId] || [];
        const exists = existingRoadmaps.some(
          (r) => r.name.toLowerCase() === newRoadmapName.trim().toLowerCase()
        );
        if (exists) {
          setError('A roadmap with this name already exists in this pipeline');
          return;
        }

        setIsCreatingDestination(true);
        const newRoadmap = await createRoadmap.mutateAsync({
          pipelineId: newRoadmapPipelineId,
          name: newRoadmapName.trim(),
        });
        await onConfirm(newRoadmap.id);
      } else if (selectedOption === 'new-pipeline') {
        if (!newPipelineName.trim()) {
          setError('Please enter a pipeline name');
          return;
        }
        if (!newPipelineRoadmapName.trim()) {
          setError('Please enter a roadmap name');
          return;
        }

        // Check for duplicate pipeline name
        const pipelineExists = pipelines.some(
          (p) => p.name.toLowerCase() === newPipelineName.trim().toLowerCase()
        );
        if (pipelineExists) {
          setError('A pipeline with this name already exists');
          return;
        }

        setIsCreatingDestination(true);
        
        // Create pipeline first
        const newPipeline = await createPipeline.mutateAsync({
          name: newPipelineName.trim(),
        });
        
        // Then create roadmap in that pipeline
        const newRoadmap = await createRoadmap.mutateAsync({
          pipelineId: newPipeline.id,
          name: newPipelineRoadmapName.trim(),
        });
        
        await onConfirm(newRoadmap.id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create features');
    } finally {
      setIsCreatingDestination(false);
    }
  };

  const renderExistingRoadmapSelection = () => {
    if (pipelines.length === 0) {
      return (
        <p className="text-sm text-muted-foreground italic mt-3">
          No pipelines yet. Create one below.
        </p>
      );
    }

    return (
      <div className="mt-3 space-y-3">
        {/* Pipeline Filter */}
        <div>
          <Label className="text-xs text-muted-foreground mb-1.5 block">
            Pipeline
          </Label>
          <Select
            value={selectedPipelineId}
            onValueChange={(value) => {
              setSelectedPipelineId(value);
              setSelectedRoadmapId(''); // Reset roadmap selection
            }}
          >
            <SelectTrigger className="h-9" onClick={(e) => e.stopPropagation()}>
              <SelectValue placeholder="Select a pipeline" />
            </SelectTrigger>
            <SelectContent>
              {pipelines.map((pipeline) => (
                <SelectItem key={pipeline.id} value={pipeline.id}>
                  <div className="flex items-center gap-2">
                    {pipeline.icon && <span>{pipeline.icon}</span>}
                    {pipeline.name}
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Roadmap Selection */}
        {selectedPipelineId && (
          <div>
            <Label className="text-xs text-muted-foreground mb-1.5 block">
              Roadmap
            </Label>
            {(roadmapsByPipeline[selectedPipelineId] || []).length === 0 ? (
              <p className="text-sm text-muted-foreground italic">
                No roadmaps in this pipeline. Create one below.
              </p>
            ) : (
              <ScrollArea className="h-[120px] rounded-md border">
                <div className="p-2 space-y-1">
                  {(roadmapsByPipeline[selectedPipelineId] || []).map((roadmap) => (
                    <button
                      key={roadmap.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedRoadmapId(roadmap.id);
                      }}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors text-left',
                        selectedRoadmapId === roadmap.id
                          ? 'bg-primary text-primary-foreground'
                          : 'hover:bg-muted'
                      )}
                    >
                      <Map className="h-4 w-4 shrink-0" />
                      <span className="flex-1 truncate">{roadmap.name}</span>
                      {selectedRoadmapId === roadmap.id && (
                        <CheckCircle2 className="h-4 w-4 shrink-0" />
                      )}
                    </button>
                  ))}
                </div>
              </ScrollArea>
            )}
          </div>
        )}
      </div>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5 text-primary" />
            Choose Destination
          </DialogTitle>
          <DialogDescription>
            Select where to create {featureCount} {featureLabel}. Features are
            organized within roadmaps, which belong to pipelines.
          </DialogDescription>
        </DialogHeader>

        {isLoading ? (
          <div className="py-8 flex items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="py-4 space-y-4">
            <RadioGroup
              value={selectedOption}
              onValueChange={(value) => {
                setSelectedOption(value as 'existing' | 'new-roadmap' | 'new-pipeline');
                setError('');
              }}
              className="space-y-3"
            >
              {/* Existing Roadmap Option */}
              <div
                className={cn(
                  'flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer',
                  selectedOption === 'existing'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                )}
                onClick={() => setSelectedOption('existing')}
              >
                <RadioGroupItem value="existing" id="existing" className="mt-0.5" />
                <div className="flex-1">
                  <Label
                    htmlFor="existing"
                    className="font-medium cursor-pointer flex items-center gap-2"
                  >
                    <Map className="h-4 w-4 text-muted-foreground" />
                    Existing Roadmap
                    {allRoadmaps.length > 0 && (
                      <Badge variant="secondary" className="text-xs">
                        {allRoadmaps.length}
                      </Badge>
                    )}
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Add to an existing roadmap in your pipelines
                  </p>

                  {selectedOption === 'existing' && renderExistingRoadmapSelection()}
                </div>
              </div>

              {/* New Roadmap Option */}
              <div
                className={cn(
                  'flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer',
                  selectedOption === 'new-roadmap'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                )}
                onClick={() => setSelectedOption('new-roadmap')}
              >
                <RadioGroupItem value="new-roadmap" id="new-roadmap" className="mt-0.5" />
                <div className="flex-1">
                  <Label
                    htmlFor="new-roadmap"
                    className="font-medium cursor-pointer flex items-center gap-2"
                  >
                    <Plus className="h-4 w-4 text-muted-foreground" />
                    Create New Roadmap
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a new roadmap in an existing pipeline
                  </p>

                  {selectedOption === 'new-roadmap' && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">
                          Pipeline
                        </Label>
                        <Select
                          value={newRoadmapPipelineId}
                          onValueChange={setNewRoadmapPipelineId}
                        >
                          <SelectTrigger className="h-9" onClick={(e) => e.stopPropagation()}>
                            <SelectValue placeholder="Select a pipeline" />
                          </SelectTrigger>
                          <SelectContent>
                            {pipelines.map((pipeline) => (
                              <SelectItem key={pipeline.id} value={pipeline.id}>
                                <div className="flex items-center gap-2">
                                  {pipeline.icon && <span>{pipeline.icon}</span>}
                                  {pipeline.name}
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                        {pipelines.length === 0 && (
                          <p className="text-xs text-muted-foreground mt-1">
                            No pipelines available. Create a new pipeline below.
                          </p>
                        )}
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">
                          Roadmap Name
                        </Label>
                        <Input
                          placeholder="Enter roadmap name..."
                          value={newRoadmapName}
                          onChange={(e) => {
                            setNewRoadmapName(e.target.value);
                            setError('');
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-9"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* New Pipeline Option */}
              <div
                className={cn(
                  'flex items-start space-x-3 p-3 rounded-lg border transition-colors cursor-pointer',
                  selectedOption === 'new-pipeline'
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-muted-foreground/30'
                )}
                onClick={() => setSelectedOption('new-pipeline')}
              >
                <RadioGroupItem value="new-pipeline" id="new-pipeline" className="mt-0.5" />
                <div className="flex-1">
                  <Label
                    htmlFor="new-pipeline"
                    className="font-medium cursor-pointer flex items-center gap-2"
                  >
                    <FolderTree className="h-4 w-4 text-muted-foreground" />
                    Create New Pipeline
                  </Label>
                  <p className="text-sm text-muted-foreground mt-1">
                    Create a new pipeline with a roadmap
                  </p>

                  {selectedOption === 'new-pipeline' && (
                    <div className="mt-3 space-y-3">
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">
                          Pipeline Name
                        </Label>
                        <Input
                          placeholder="e.g., Mobile App, Web Platform..."
                          value={newPipelineName}
                          onChange={(e) => {
                            setNewPipelineName(e.target.value);
                            setError('');
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-9"
                        />
                      </div>
                      <div>
                        <Label className="text-xs text-muted-foreground mb-1.5 block">
                          First Roadmap Name
                        </Label>
                        <Input
                          placeholder="e.g., Q1 2024, MVP Features..."
                          value={newPipelineRoadmapName}
                          onChange={(e) => {
                            setNewPipelineRoadmapName(e.target.value);
                            setError('');
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="h-9"
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </RadioGroup>

            {/* Error Message */}
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
          </div>
        )}

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isCreating || isCreatingDestination}
          >
            Cancel
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isCreating || isCreatingDestination || isLoading}
          >
            {isCreating || isCreatingDestination ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Creating...
              </>
            ) : (
              <>
                Create {featureCount} {featureLabel}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default FeatureDestinationDialog;
