'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { 
  Search, 
  FileText, 
  Code, 
  Image as ImageIcon,
  Database,
  Loader2,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';

// ============================================================================
// TYPES
// ============================================================================

export interface ToolInvocation {
  id: string;
  toolName: string;
  args: Record<string, any>;
  result?: any;
  state: 'pending' | 'in_progress' | 'completed' | 'error';
  error?: string;
  startedAt: Date;
  completedAt?: Date;
}

interface ToolInvocationDisplayProps {
  invocation: ToolInvocation;
  className?: string;
}

// ============================================================================
// TOOL ICON MAPPING
// ============================================================================

const TOOL_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  webSearch: Search,
  generateSection: FileText,
  defineStructure: Code,
  generateDiagram: ImageIcon,
  queryDatabase: Database,
};

const TOOL_LABELS: Record<string, string> = {
  webSearch: 'Web Search',
  generateSection: 'Generate Section',
  defineStructure: 'Define Structure',
  generateDiagram: 'Generate Diagram',
  queryDatabase: 'Query Database',
};

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getToolIcon(toolName: string) {
  const Icon = TOOL_ICONS[toolName] || FileText;
  return Icon;
}

function getToolLabel(toolName: string): string {
  return TOOL_LABELS[toolName] || toolName;
}

function formatToolArgs(args: Record<string, any>): string {
  const keys = Object.keys(args);
  if (keys.length === 0) return 'No parameters';
  
  if (keys.length === 1) {
    const value = args[keys[0]];
    if (typeof value === 'string' && value.length < 50) {
      return value;
    }
  }
  
  return keys.join(', ');
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function ToolInvocationDisplay({ 
  invocation, 
  className 
}: ToolInvocationDisplayProps) {
  const Icon = getToolIcon(invocation.toolName);
  const label = getToolLabel(invocation.toolName);

  const statusColors = {
    pending: 'bg-gray-500/10 text-gray-700 border-gray-200',
    in_progress: 'bg-blue-500/10 text-blue-700 border-blue-200',
    completed: 'bg-green-500/10 text-green-700 border-green-200',
    error: 'bg-red-500/10 text-red-700 border-red-200',
  };

  return (
    <Card className={cn('border-border/50 bg-muted/20', className)}>
      <CardContent className="p-3 space-y-2">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className={cn(
              'w-8 h-8 rounded-md flex items-center justify-center',
              invocation.state === 'in_progress' && 'bg-blue-500/10',
              invocation.state === 'completed' && 'bg-green-500/10',
              invocation.state === 'error' && 'bg-red-500/10',
              invocation.state === 'pending' && 'bg-muted'
            )}>
              {invocation.state === 'in_progress' ? (
                <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />
              ) : invocation.state === 'completed' ? (
                <CheckCircle2 className="w-4 h-4 text-green-600" />
              ) : invocation.state === 'error' ? (
                <XCircle className="w-4 h-4 text-red-600" />
              ) : (
                <Icon className="w-4 h-4 text-muted-foreground" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-foreground">
                  {label}
                </span>
                <Badge 
                  variant="outline" 
                  className={cn('text-xs', statusColors[invocation.state])}
                >
                  {invocation.state === 'in_progress' ? 'Running...' : invocation.state}
                </Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                {formatToolArgs(invocation.args)}
              </p>
            </div>
          </div>
        </div>

        {/* Result or Error */}
        {invocation.state === 'completed' && invocation.result && (
          <div className="pl-10 text-xs">
            <div className="bg-background rounded-md p-2 border border-border/50">
              {typeof invocation.result === 'string' ? (
                <p className="text-foreground/80 line-clamp-3">
                  {invocation.result}
                </p>
              ) : (
                <pre className="text-foreground/80 overflow-x-auto">
                  {JSON.stringify(invocation.result, null, 2)}
                </pre>
              )}
            </div>
          </div>
        )}

        {invocation.state === 'error' && invocation.error && (
          <div className="pl-10 text-xs">
            <div className="bg-red-500/5 rounded-md p-2 border border-red-200">
              <p className="text-red-700">{invocation.error}</p>
            </div>
          </div>
        )}

        {/* Timing */}
        {invocation.completedAt && (
          <div className="pl-10 text-xs text-muted-foreground">
            Completed in {Math.round((invocation.completedAt.getTime() - invocation.startedAt.getTime()) / 1000)}s
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// ============================================================================
// TOOL INVOCATIONS LIST
// ============================================================================

export function ToolInvocationsList({ 
  invocations,
  className 
}: { 
  invocations: ToolInvocation[];
  className?: string;
}) {
  if (invocations.length === 0) {
    return null;
  }

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Code className="w-3 h-3" />
        <span>Tool Invocations ({invocations.length})</span>
      </div>
      {invocations.map((invocation) => (
        <ToolInvocationDisplay key={invocation.id} invocation={invocation} />
      ))}
    </div>
  );
}

export default ToolInvocationDisplay;
