'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import {
  MessageSquare,
  Plus,
  Trash2,
  Check,
  X,
  Edit2,
  Clock,
  User,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================================================
// TYPES
// ============================================================================

export type AnnotationPriority = 'low' | 'medium' | 'high';
export type AnnotationStatus = 'open' | 'resolved' | 'in-progress';

export interface CanvasAnnotation {
  id: string;
  content: string;
  author: string;
  authorAvatar?: string;
  createdAt: Date;
  updatedAt?: Date;
  priority: AnnotationPriority;
  status: AnnotationStatus;
  /** X position on canvas (percentage) */
  positionX?: number;
  /** Y position on canvas (percentage) */
  positionY?: number;
  /** Related element ID on canvas */
  elementId?: string;
  replies?: AnnotationReply[];
}

export interface AnnotationReply {
  id: string;
  content: string;
  author: string;
  createdAt: Date;
}

export interface CanvasAnnotationsProps {
  annotations: CanvasAnnotation[];
  onAddAnnotation: (annotation: Omit<CanvasAnnotation, 'id' | 'createdAt'>) => void;
  onUpdateAnnotation: (id: string, updates: Partial<CanvasAnnotation>) => void;
  onDeleteAnnotation: (id: string) => void;
  onAddReply: (annotationId: string, reply: Omit<AnnotationReply, 'id' | 'createdAt'>) => void;
  currentUser: string;
  className?: string;
}

// ============================================================================
// PRIORITY AND STATUS HELPERS
// ============================================================================

const PRIORITY_COLORS: Record<AnnotationPriority, string> = {
  low: 'bg-green-100 text-green-800',
  medium: 'bg-yellow-100 text-yellow-800',
  high: 'bg-red-100 text-red-800',
};

const STATUS_COLORS: Record<AnnotationStatus, string> = {
  open: 'bg-blue-100 text-blue-800',
  'in-progress': 'bg-purple-100 text-purple-800',
  resolved: 'bg-gray-100 text-gray-800',
};

// ============================================================================
// ANNOTATION CARD COMPONENT
// ============================================================================

interface AnnotationCardProps {
  annotation: CanvasAnnotation;
  currentUser: string;
  onUpdate: (updates: Partial<CanvasAnnotation>) => void;
  onDelete: () => void;
  onAddReply: (content: string) => void;
}

function AnnotationCard({
  annotation,
  currentUser,
  onUpdate,
  onDelete,
  onAddReply,
}: AnnotationCardProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(annotation.content);
  const [replyContent, setReplyContent] = useState('');
  const [showReplies, setShowReplies] = useState(false);

  const handleSave = () => {
    onUpdate({ content: editContent, updatedAt: new Date() });
    setIsEditing(false);
  };

  const handleAddReply = () => {
    if (replyContent.trim()) {
      onAddReply(replyContent);
      setReplyContent('');
    }
  };

  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  return (
    <div className={cn(
      'border rounded-lg p-3 space-y-2',
      annotation.status === 'resolved' && 'opacity-60'
    )}>
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-full bg-primary/10 flex items-center justify-center">
            <User className="h-3 w-3" />
          </div>
          <div>
            <span className="text-sm font-medium">{annotation.author}</span>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <Clock className="h-3 w-3" />
              {formatDate(annotation.createdAt)}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Badge className={cn('text-xs', PRIORITY_COLORS[annotation.priority])}>
            {annotation.priority}
          </Badge>
          <Badge className={cn('text-xs', STATUS_COLORS[annotation.status])}>
            {annotation.status}
          </Badge>
        </div>
      </div>

      {/* Content */}
      {isEditing ? (
        <div className="space-y-2">
          <Textarea
            value={editContent}
            onChange={(e) => setEditContent(e.target.value)}
            className="min-h-[60px] text-sm"
          />
          <div className="flex gap-1">
            <Button size="sm" onClick={handleSave}>
              <Check className="h-3 w-3 mr-1" />
              Save
            </Button>
            <Button size="sm" variant="ghost" onClick={() => setIsEditing(false)}>
              <X className="h-3 w-3 mr-1" />
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <p className="text-sm">{annotation.content}</p>
      )}

      {/* Actions */}
      <div className="flex items-center justify-between pt-2 border-t">
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2 text-xs"
            onClick={() => setShowReplies(!showReplies)}
          >
            <MessageSquare className="h-3 w-3 mr-1" />
            {annotation.replies?.length || 0} replies
          </Button>
          {annotation.status !== 'resolved' && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2 text-xs text-green-600"
              onClick={() => onUpdate({ status: 'resolved' })}
            >
              <Check className="h-3 w-3 mr-1" />
              Resolve
            </Button>
          )}
        </div>
        {annotation.author === currentUser && (
          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7"
              onClick={() => setIsEditing(true)}
            >
              <Edit2 className="h-3 w-3" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive"
              onClick={onDelete}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        )}
      </div>

      {/* Replies */}
      {showReplies && (
        <div className="pt-2 space-y-2">
          {annotation.replies?.map((reply) => (
            <div key={reply.id} className="pl-4 border-l-2 text-sm">
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span className="font-medium text-foreground">{reply.author}</span>
                <span>{formatDate(reply.createdAt)}</span>
              </div>
              <p>{reply.content}</p>
            </div>
          ))}
          <div className="flex gap-2 pl-4">
            <Input
              placeholder="Add a reply..."
              value={replyContent}
              onChange={(e) => setReplyContent(e.target.value)}
              className="h-8 text-sm"
              onKeyDown={(e) => e.key === 'Enter' && handleAddReply()}
            />
            <Button size="sm" className="h-8" onClick={handleAddReply}>
              Reply
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// NEW ANNOTATION FORM
// ============================================================================

interface NewAnnotationFormProps {
  onSubmit: (annotation: Omit<CanvasAnnotation, 'id' | 'createdAt'>) => void;
  currentUser: string;
  onCancel: () => void;
}

function NewAnnotationForm({ onSubmit, currentUser, onCancel }: NewAnnotationFormProps) {
  const [content, setContent] = useState('');
  const [priority, setPriority] = useState<AnnotationPriority>('medium');

  const handleSubmit = () => {
    if (content.trim()) {
      onSubmit({
        content,
        author: currentUser,
        priority,
        status: 'open',
        replies: [],
      });
      setContent('');
      setPriority('medium');
    }
  };

  return (
    <div className="border rounded-lg p-3 space-y-3 bg-muted/30">
      <Textarea
        placeholder="Add a comment or feedback..."
        value={content}
        onChange={(e) => setContent(e.target.value)}
        className="min-h-[80px]"
      />
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground">Priority:</span>
          {(['low', 'medium', 'high'] as AnnotationPriority[]).map((p) => (
            <Button
              key={p}
              variant={priority === p ? 'default' : 'outline'}
              size="sm"
              className="h-6 text-xs capitalize"
              onClick={() => setPriority(p)}
            >
              {p}
            </Button>
          ))}
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
          <Button size="sm" onClick={handleSubmit} disabled={!content.trim()}>
            <Plus className="h-3 w-3 mr-1" />
            Add
          </Button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CanvasAnnotations({
  annotations,
  onAddAnnotation,
  onUpdateAnnotation,
  onDeleteAnnotation,
  onAddReply,
  currentUser,
  className,
}: CanvasAnnotationsProps) {
  const [isAdding, setIsAdding] = useState(false);
  const [filter, setFilter] = useState<'all' | 'open' | 'resolved'>('all');

  const filteredAnnotations = annotations.filter((a) => {
    if (filter === 'all') return true;
    if (filter === 'open') return a.status !== 'resolved';
    return a.status === 'resolved';
  });

  const openCount = annotations.filter((a) => a.status !== 'resolved').length;

  return (
    <Sheet>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className={cn('gap-2', className)}>
          <MessageSquare className="h-4 w-4" />
          Comments
          {openCount > 0 && (
            <Badge variant="secondary" className="h-5 px-1.5 text-xs">
              {openCount}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent className="w-[400px] sm:w-[450px]">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            Canvas Comments
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Filter tabs */}
          <div className="flex gap-1 border-b pb-2">
            {(['all', 'open', 'resolved'] as const).map((f) => (
              <Button
                key={f}
                variant={filter === f ? 'secondary' : 'ghost'}
                size="sm"
                className="capitalize"
                onClick={() => setFilter(f)}
              >
                {f}
                {f === 'open' && openCount > 0 && (
                  <Badge className="ml-1 h-4 px-1 text-xs">{openCount}</Badge>
                )}
              </Button>
            ))}
          </div>

          {/* Add new annotation */}
          {isAdding ? (
            <NewAnnotationForm
              onSubmit={(annotation) => {
                onAddAnnotation(annotation);
                setIsAdding(false);
              }}
              currentUser={currentUser}
              onCancel={() => setIsAdding(false)}
            />
          ) : (
            <Button
              variant="outline"
              className="w-full justify-start gap-2"
              onClick={() => setIsAdding(true)}
            >
              <Plus className="h-4 w-4" />
              Add Comment
            </Button>
          )}

          {/* Annotations list */}
          <ScrollArea className="h-[calc(100vh-280px)]">
            <div className="space-y-3 pr-4">
              {filteredAnnotations.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <MessageSquare className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p className="text-sm">No comments yet</p>
                  <p className="text-xs">Add comments to discuss the canvas</p>
                </div>
              ) : (
                filteredAnnotations.map((annotation) => (
                  <AnnotationCard
                    key={annotation.id}
                    annotation={annotation}
                    currentUser={currentUser}
                    onUpdate={(updates) => onUpdateAnnotation(annotation.id, updates)}
                    onDelete={() => onDeleteAnnotation(annotation.id)}
                    onAddReply={(content) =>
                      onAddReply(annotation.id, { content, author: currentUser })
                    }
                  />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export default CanvasAnnotations;
