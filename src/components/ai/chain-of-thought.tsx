'use client';

import React, { useState } from 'react';
import { cn } from '@/lib/utils';
import {
  ChevronDown,
  ChevronRight,
  Brain,
  Lightbulb,
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { Badge } from '@/components/ui/badge';

// ============================================================================
// TYPES
// ============================================================================

export interface ThinkingStep {
  id: string;
  type: 'reasoning' | 'planning' | 'research' | 'execution' | 'validation';
  content: string;
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  timestamp: Date;
  metadata?: Record<string, any>;
}

interface ChainOfThoughtProps {
  steps: ThinkingStep[];
  isStreaming?: boolean;
  className?: string;
  defaultExpanded?: boolean;
}

// ============================================================================
// STEP ICON COMPONENT
// ============================================================================

function StepIcon({ type, status }: { type: ThinkingStep['type']; status: ThinkingStep['status'] }) {
  const iconClass = cn(
    'w-4 h-4',
    status === 'completed' && 'text-green-600',
    status === 'in_progress' && 'text-blue-600 animate-pulse',
    status === 'error' && 'text-red-600',
    status === 'pending' && 'text-muted-foreground'
  );

  if (status === 'in_progress') {
    return <Loader2 className={cn(iconClass, 'animate-spin')} />;
  }

  if (status === 'completed') {
    return <CheckCircle2 className={iconClass} />;
  }

  if (status === 'error') {
    return <XCircle className={iconClass} />;
  }

  switch (type) {
    case 'reasoning':
      return <Brain className={iconClass} />;
    case 'planning':
      return <Lightbulb className={iconClass} />;
    case 'research':
      return <Search className={iconClass} />;
    default:
      return <Brain className={iconClass} />;
  }
}

// ============================================================================
// STEP TYPE BADGE
// ============================================================================

function StepTypeBadge({ type }: { type: ThinkingStep['type'] }) {
  const colors = {
    reasoning: 'bg-purple-500/10 text-purple-700 border-purple-200',
    planning: 'bg-blue-500/10 text-blue-700 border-blue-200',
    research: 'bg-green-500/10 text-green-700 border-green-200',
    execution: 'bg-orange-500/10 text-orange-700 border-orange-200',
    validation: 'bg-pink-500/10 text-pink-700 border-pink-200',
  };

  const labels = {
    reasoning: 'Reasoning',
    planning: 'Planning',
    research: 'Research',
    execution: 'Executing',
    validation: 'Validating',
  };

  return (
    <Badge variant="outline" className={cn('text-xs', colors[type])}>
      {labels[type]}
    </Badge>
  );
}

// ============================================================================
// SINGLE STEP COMPONENT
// ============================================================================

function ThinkingStepComponent({ step }: { step: ThinkingStep }) {
  return (
    <div className="flex items-start gap-3 py-2">
      <div className="mt-0.5">
        <StepIcon type={step.type} status={step.status} />
      </div>
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <StepTypeBadge type={step.type} />
          {step.status === 'in_progress' && (
            <span className="text-xs text-muted-foreground">Processing...</span>
          )}
        </div>
        <p className="text-sm text-foreground/90 leading-relaxed">
          {step.content}
        </p>
        {step.metadata && Object.keys(step.metadata).length > 0 && (
          <div className="text-xs text-muted-foreground space-y-1 mt-2">
            {Object.entries(step.metadata).map(([key, value]) => (
              <div key={key} className="flex gap-2">
                <span className="font-medium">{key}:</span>
                <span>{String(value)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ChainOfThought({
  steps,
  isStreaming = false,
  className,
  defaultExpanded = false,
}: ChainOfThoughtProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  // Track if we ever showed thinking content - once shown, keep showing
  const [wasEverShown, setWasEverShown] = useState(false);

  // Update wasEverShown when we have steps or start streaming
  React.useEffect(() => {
    if (steps.length > 0 || isStreaming) {
      setWasEverShown(true);
    }
  }, [steps.length, isStreaming]);

  // Only hide if we never had any thinking content
  // Once shown during a session, keep showing (even if steps become empty)
  if (!wasEverShown && steps.length === 0 && !isStreaming) {
    return null;
  }

  const completedSteps = steps.filter(s => s.status === 'completed').length;
  const totalSteps = steps.length;
  const hasActiveStep = steps.some(s => s.status === 'in_progress');

  return (
    <div className={cn('border border-border/50 rounded-lg bg-muted/30', className)}>
      <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
        <CollapsibleTrigger asChild>
          <button
            className="w-full flex items-center justify-between p-3 hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-2">
              {isExpanded ? (
                <ChevronDown className="w-4 h-4 text-muted-foreground" />
              ) : (
                <ChevronRight className="w-4 h-4 text-muted-foreground" />
              )}
              <Brain className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                Chain of Thought
              </span>
              {hasActiveStep && (
                <Loader2 className="w-3 h-3 text-primary animate-spin" />
              )}
            </div>
            <div className="flex items-center gap-2">
              {totalSteps > 0 && (
                <span className="text-xs text-muted-foreground">
                  {completedSteps} / {totalSteps} steps
                </span>
              )}
              <Badge
                variant="secondary"
                className={cn(
                  'text-xs',
                  hasActiveStep && 'bg-blue-500/10 text-blue-700 border-blue-200'
                )}
              >
                {isStreaming || hasActiveStep ? 'Thinking...' : 'Complete'}
              </Badge>
            </div>
          </button>
        </CollapsibleTrigger>

        <CollapsibleContent>
          <div className="px-3 pb-3 space-y-1 border-t border-border/50 pt-3">
            {steps.map((step) => (
              <ThinkingStepComponent key={step.id} step={step} />
            ))}
            {isStreaming && steps.length === 0 && (
              <div className="flex items-center gap-2 py-4 justify-center text-sm text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Initializing thought process...</span>
              </div>
            )}
          </div>
        </CollapsibleContent>
      </Collapsible>
    </div>
  );
}

// ============================================================================
// INLINE THINKING INDICATOR (for streaming)
// ============================================================================

export function ThinkingIndicator({
  currentStep,
  className
}: {
  currentStep?: string;
  className?: string;
}) {
  return (
    <div className={cn('flex items-center gap-2 text-sm text-muted-foreground py-2', className)}>
      <Loader2 className="w-4 h-4 animate-spin text-primary" />
      <Brain className="w-4 h-4 text-primary" />
      <span>{currentStep || 'Thinking...'}</span>
    </div>
  );
}

export default ChainOfThought;
