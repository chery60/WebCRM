'use client';

import { GitBranch, Plus, FolderKanban, Map, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { usePipelines, useCreatePipeline } from '@/lib/hooks/use-pipelines';
import { useRoadmaps } from '@/lib/hooks/use-roadmaps';
import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';

export default function PipelinesPage() {
  const { data: pipelines = [], isLoading } = usePipelines();
  const { data: allRoadmaps = [] } = useRoadmaps();
  const createPipeline = useCreatePipeline();

  const [showCreateDialog, setShowCreateDialog] = useState(false);
  const [newPipelineName, setNewPipelineName] = useState('');

  const handleCreatePipeline = async () => {
    if (!newPipelineName.trim()) return;
    try {
      await createPipeline.mutateAsync({ name: newPipelineName.trim() });
      setNewPipelineName('');
      setShowCreateDialog(false);
      toast.success('Pipeline created');
    } catch {
      toast.error('Failed to create pipeline');
    }
  };

  if (isLoading) {
    return (
      <div className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-semibold">Pipelines</h1>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-40 bg-muted animate-pulse rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-semibold">Pipelines</h1>
          <p className="text-muted-foreground">
            Manage your product roadmaps and feature requests
          </p>
        </div>
        <Button onClick={() => setShowCreateDialog(true)}>
          <Plus className="h-4 w-4 mr-2" />
          New Pipeline
        </Button>
      </div>

      {pipelines.length === 0 ? (
        <div className="text-center py-12">
          <GitBranch className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h2 className="text-lg font-medium mb-2">No pipelines yet</h2>
          <p className="text-muted-foreground mb-4">
            Create your first pipeline to start organizing your product roadmaps.
          </p>
          <Button onClick={() => setShowCreateDialog(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Pipeline
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {pipelines.map((pipeline) => {
            const pipelineRoadmaps = allRoadmaps.filter((r) => r.pipelineId === pipeline.id);

            return (
              <Card key={pipeline.id} className="hover:shadow-md transition-shadow">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <FolderKanban className="h-5 w-5 text-primary" />
                      <CardTitle className="text-lg">{pipeline.name}</CardTitle>
                    </div>
                  </div>
                  {pipeline.description && (
                    <CardDescription>{pipeline.description}</CardDescription>
                  )}
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {pipelineRoadmaps.length} roadmap{pipelineRoadmaps.length !== 1 ? 's' : ''}
                    </p>

                    {pipelineRoadmaps.length > 0 ? (
                      <div className="space-y-1">
                        {pipelineRoadmaps.slice(0, 3).map((roadmap) => (
                          <Link
                            key={roadmap.id}
                            href={`/pipelines/${pipeline.id}?roadmap=${roadmap.id}`}
                            className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors p-1 rounded hover:bg-muted"
                          >
                            <Map className="h-3.5 w-3.5" />
                            <span className="truncate">{roadmap.name}</span>
                            <ArrowRight className="h-3 w-3 ml-auto" />
                          </Link>
                        ))}
                        {pipelineRoadmaps.length > 3 && (
                          <p className="text-xs text-muted-foreground pl-6">
                            +{pipelineRoadmaps.length - 3} more
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground italic">
                        No roadmaps yet
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {/* Create Pipeline Dialog */}
      <Dialog open={showCreateDialog} onOpenChange={setShowCreateDialog}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Create New Pipeline</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <Label htmlFor="pipelineName">Pipeline Name</Label>
            <Input
              id="pipelineName"
              value={newPipelineName}
              onChange={(e) => setNewPipelineName(e.target.value)}
              placeholder="Enter pipeline name"
              className="mt-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleCreatePipeline();
                }
              }}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowCreateDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleCreatePipeline} disabled={!newPipelineName.trim()}>
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
