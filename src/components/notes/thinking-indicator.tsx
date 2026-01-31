'use client';

import React, { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';
import {
    Brain,
    Search,
    FileText,
    Sparkles,
    Check,
    Loader2,
    ChevronDown,
    ChevronRight
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';

// ============================================================================
// TYPES
// ============================================================================

export type GenerationPhase =
    | 'thinking'
    | 'analyzing'
    | 'researching'
    | 'planning'
    | 'generating'
    | 'complete';

export interface GenerationStep {
    id: string;
    phase: GenerationPhase;
    label: string;
    detail?: string;
    status: 'pending' | 'active' | 'complete';
    timestamp?: Date;
}

interface ThinkingIndicatorProps {
    steps: GenerationStep[];
    thinkingContent?: string;
    isComplete?: boolean;
    className?: string;
}

// ============================================================================
// ANIMATED DOTS
// ============================================================================

function AnimatedDots() {
    return (
        <span className="inline-flex gap-0.5 ml-1">
            <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:0ms]" />
            <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:150ms]" />
            <span className="w-1 h-1 bg-current rounded-full animate-bounce [animation-delay:300ms]" />
        </span>
    );
}

// ============================================================================
// PHASE ICON
// ============================================================================

function PhaseIcon({ phase, status }: { phase: GenerationPhase; status: GenerationStep['status'] }) {
    const iconClass = cn(
        "w-4 h-4 transition-all duration-300",
        status === 'active' && "text-primary animate-pulse",
        status === 'complete' && "text-green-500",
        status === 'pending' && "text-muted-foreground/50"
    );

    if (status === 'complete') {
        return <Check className={iconClass} />;
    }

    if (status === 'active') {
        switch (phase) {
            case 'thinking':
                return <Brain className={cn(iconClass, "animate-pulse")} />;
            case 'analyzing':
                return <Search className={cn(iconClass, "animate-pulse")} />;
            case 'researching':
                return <Search className={cn(iconClass, "animate-pulse")} />;
            case 'planning':
                return <FileText className={cn(iconClass, "animate-pulse")} />;
            case 'generating':
                return <Sparkles className={cn(iconClass, "animate-pulse")} />;
            default:
                return <Loader2 className={cn(iconClass, "animate-spin")} />;
        }
    }

    // Pending state
    switch (phase) {
        case 'thinking':
            return <Brain className={iconClass} />;
        case 'analyzing':
            return <Search className={iconClass} />;
        case 'researching':
            return <Search className={iconClass} />;
        case 'planning':
            return <FileText className={iconClass} />;
        case 'generating':
            return <Sparkles className={iconClass} />;
        default:
            return <Loader2 className={iconClass} />;
    }
}

// ============================================================================
// STEP ITEM
// ============================================================================

function StepItem({ step }: { step: GenerationStep }) {
    return (
        <div
            className={cn(
                "flex items-start gap-3 py-2 transition-all duration-300",
                step.status === 'active' && "opacity-100",
                step.status === 'complete' && "opacity-70",
                step.status === 'pending' && "opacity-40"
            )}
        >
            <div className="flex-shrink-0 mt-0.5">
                <PhaseIcon phase={step.phase} status={step.status} />
            </div>
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                    <span className={cn(
                        "text-sm font-medium transition-colors",
                        step.status === 'active' && "text-foreground",
                        step.status === 'complete' && "text-muted-foreground",
                        step.status === 'pending' && "text-muted-foreground/50"
                    )}>
                        {step.label}
                    </span>
                    {step.status === 'active' && <AnimatedDots />}
                </div>
                {step.detail && step.status !== 'pending' && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {step.detail}
                    </p>
                )}
            </div>
        </div>
    );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ThinkingIndicator({
    steps,
    thinkingContent,
    isComplete = false,
    className
}: ThinkingIndicatorProps) {
    const [isExpanded, setIsExpanded] = useState(false);

    // Auto-collapse thinking when complete
    useEffect(() => {
        if (isComplete) {
            // Keep expanded for a moment so user can see completion
            const timer = setTimeout(() => {
                setIsExpanded(false);
            }, 1500);
            return () => clearTimeout(timer);
        }
    }, [isComplete]);

    const activeStep = steps.find(s => s.status === 'active');
    const completedSteps = steps.filter(s => s.status === 'complete');

    return (
        <div className={cn("rounded-lg border border-border/50 bg-muted/30 overflow-hidden", className)}>
            <Collapsible open={isExpanded} onOpenChange={setIsExpanded}>
                <CollapsibleTrigger className="w-full">
                    <div className="flex items-center gap-3 px-4 py-3 hover:bg-muted/50 transition-colors">
                        <div className="flex-shrink-0">
                            {isComplete ? (
                                <div className="w-8 h-8 rounded-full bg-green-500/10 flex items-center justify-center">
                                    <Check className="w-4 h-4 text-green-500" />
                                </div>
                            ) : (
                                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center">
                                    <Brain className="w-4 h-4 text-primary animate-pulse" />
                                </div>
                            )}
                        </div>
                        <div className="flex-1 text-left">
                            <div className="flex items-center gap-2">
                                <span className="text-sm font-medium">
                                    {isComplete ? 'Generation complete' : (activeStep?.label || 'Thinking')}
                                </span>
                                {!isComplete && <AnimatedDots />}
                            </div>
                            <p className="text-xs text-muted-foreground">
                                {isComplete
                                    ? `Completed ${completedSteps.length} steps`
                                    : `Step ${completedSteps.length + 1} of ${steps.length}`
                                }
                            </p>
                        </div>
                        <div className="flex-shrink-0">
                            {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-muted-foreground" />
                            ) : (
                                <ChevronRight className="w-4 h-4 text-muted-foreground" />
                            )}
                        </div>
                    </div>
                </CollapsibleTrigger>

                <CollapsibleContent>
                    <div className="px-4 pb-3 border-t border-border/30">
                        {/* Steps list */}
                        <div className="space-y-0.5 mt-2">
                            {steps.map((step) => (
                                <StepItem key={step.id} step={step} />
                            ))}
                        </div>

                        {/* Thinking content (if available) */}
                        {thinkingContent && (
                            <div className="mt-3 pt-3 border-t border-border/30">
                                <p className="text-xs font-medium text-muted-foreground mb-1.5">
                                    Reasoning:
                                </p>
                                <div className="text-xs text-muted-foreground bg-background/50 rounded-md p-2 max-h-32 overflow-y-auto">
                                    <pre className="whitespace-pre-wrap font-sans">{thinkingContent}</pre>
                                </div>
                            </div>
                        )}
                    </div>
                </CollapsibleContent>
            </Collapsible>
        </div>
    );
}

// ============================================================================
// DEFAULT GENERATION STEPS
// ============================================================================

export function createDefaultGenerationSteps(): GenerationStep[] {
    return [
        {
            id: 'thinking',
            phase: 'thinking',
            label: 'Understanding your request',
            status: 'pending',
        },
        {
            id: 'analyzing',
            phase: 'analyzing',
            label: 'Analyzing product requirements',
            status: 'pending',
        },
        {
            id: 'researching',
            phase: 'researching',
            label: 'Researching best practices',
            status: 'pending',
        },
        {
            id: 'planning',
            phase: 'planning',
            label: 'Structuring the PRD',
            status: 'pending',
        },
        {
            id: 'generating',
            phase: 'generating',
            label: 'Generating comprehensive content',
            status: 'pending',
        },
    ];
}

export function updateStepStatus(
    steps: GenerationStep[],
    stepId: string,
    status: GenerationStep['status'],
    detail?: string
): GenerationStep[] {
    return steps.map(step => {
        if (step.id === stepId) {
            return {
                ...step,
                status,
                detail: detail || step.detail,
                timestamp: status === 'complete' ? new Date() : step.timestamp
            };
        }
        return step;
    });
}

export function advanceToNextStep(steps: GenerationStep[]): GenerationStep[] {
    const activeIndex = steps.findIndex(s => s.status === 'active');

    return steps.map((step, index) => {
        if (index === activeIndex) {
            return { ...step, status: 'complete' as const, timestamp: new Date() };
        }
        if (index === activeIndex + 1) {
            return { ...step, status: 'active' as const };
        }
        return step;
    });
}

export function startGeneration(steps: GenerationStep[]): GenerationStep[] {
    return steps.map((step, index) => ({
        ...step,
        status: index === 0 ? 'active' as const : 'pending' as const
    }));
}

export function completeAllSteps(steps: GenerationStep[]): GenerationStep[] {
    return steps.map(step => ({
        ...step,
        status: 'complete' as const,
        timestamp: new Date()
    }));
}

export default ThinkingIndicator;
