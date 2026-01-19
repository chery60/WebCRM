'use client';

import Link from 'next/link';
import { Card, CardContent } from '@/components/ui/card';
import { TagBadge, getTagColor } from '@/components/shared/tag-badge';
import { UserAvatar } from '@/components/shared/user-avatar';
import type { Note } from '@/types';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { useState } from 'react';
import { FolderOpen } from 'lucide-react';

interface NoteCardProps {
  note: Note;
  projectName?: string;
  className?: string;
  draggable?: boolean;
}

interface TiptapNode {
  type?: string;
  text?: string;
  content?: TiptapNode[];
}

function extractPreview(content: string): { text: string; items: string[] } {
  try {
    const parsed = JSON.parse(content);
    let text = '';
    const items: string[] = [];

    function traverse(node: TiptapNode) {
      if (!node) return;

      if (node.type === 'paragraph' && node.content) {
        const paragraphText = node.content
          .filter((n): n is TiptapNode & { text: string } => n.type === 'text' && !!n.text)
          .map((n) => n.text)
          .join('');
        if (paragraphText && !text) {
          text = paragraphText;
        }
      }

      if ((node.type === 'bulletList' || node.type === 'orderedList' || node.type === 'taskList') && node.content) {
        node.content.forEach((listItem) => {
          if (listItem.content) {
            listItem.content.forEach((child) => {
              if (child.type === 'paragraph' && child.content) {
                const itemText = child.content
                  .filter((n): n is TiptapNode & { text: string } => n.type === 'text' && !!n.text)
                  .map((n) => n.text)
                  .join('');
                if (itemText && items.length < 2) {
                  items.push(itemText);
                }
              }
            });
          }
        });
      }

      if (node.content && Array.isArray(node.content)) {
        node.content.forEach((child) => traverse(child));
      }
    }

    traverse(parsed);
    return { text, items };
  } catch {
    return { text: content.slice(0, 100), items: [] };
  }
}

export function NoteCard({ note, projectName, className, draggable = true }: NoteCardProps) {
  const preview = extractPreview(note.content);
  const formattedDate = format(new Date(note.createdAt), 'MMM d HH:mm');
  const [isDragging, setIsDragging] = useState(false);

  const handleDragStart = (e: React.DragEvent<HTMLAnchorElement>) => {
    e.dataTransfer.setData('application/note-id', note.id);
    e.dataTransfer.setData('text/plain', note.title);
    e.dataTransfer.effectAllowed = 'move';
    setIsDragging(true);
  };

  const handleDragEnd = () => {
    setIsDragging(false);
  };

  return (
    <Link 
      href={`/notes/${note.id}`} 
      className="block h-full"
      draggable={draggable}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <Card
        className={cn(
          'group cursor-pointer transition-all duration-200 hover:shadow-md hover:border-primary/20 py-0 flex flex-col h-[200px] min-[1440px]:h-[216px]',
          isDragging && 'opacity-50 ring-2 ring-primary',
          className
        )}
      >
        <CardContent className="py-4 px-6 flex flex-col h-full">
          {/* Tags */}
          <div className="flex flex-wrap gap-1.5 mb-3">
            {note.tags.map((tag) => (
              <TagBadge key={tag} name={tag} color={getTagColor(tag)} />
            ))}
          </div>

          {/* Title */}
          <h3 className="font-semibold text-base mb-2 line-clamp-1 group-hover:text-primary transition-colors">
            {note.title}
          </h3>

          {/* Preview content */}
          <div className="text-sm text-muted-foreground mb-4 min-h-0 flex-1 overflow-hidden">
            {preview.text && (
              <p className="line-clamp-2 mb-1">{preview.text}</p>
            )}
            {preview.items.length > 0 && (
              <ul className="list-disc list-inside space-y-0.5">
                {preview.items.map((item, i) => (
                  <li key={i} className="line-clamp-1 text-xs">
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Footer: Author, project and date */}
          <div className="flex items-center justify-between pt-3 border-t mt-auto">
            <div className="flex items-center gap-3">
              <UserAvatar
                name={note.authorName}
                avatar={note.authorAvatar}
                size="sm"
                showName
              />
              {projectName && (
                <span className="text-xs text-muted-foreground flex items-center gap-1">
                  <FolderOpen className="h-3 w-3" />
                  {projectName}
                </span>
              )}
            </div>
            <span className="text-xs text-muted-foreground">{formattedDate}</span>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}

// Skeleton for loading state
export function NoteCardSkeleton() {
  return (
    <Card className="py-0">
      <CardContent className="py-4 px-6">
        <div className="flex gap-1.5 mb-3">
          <div className="h-5 w-14 rounded-md bg-muted animate-pulse" />
          <div className="h-5 w-16 rounded-md bg-muted animate-pulse" />
        </div>
        <div className="h-5 w-3/4 rounded bg-muted animate-pulse mb-2" />
        <div className="space-y-2 mb-4">
          <div className="h-4 w-full rounded bg-muted animate-pulse" />
          <div className="h-4 w-2/3 rounded bg-muted animate-pulse" />
        </div>
        <div className="flex items-center justify-between pt-3 border-t">
          <div className="flex items-center gap-2">
            <div className="h-6 w-6 rounded-full bg-muted animate-pulse" />
            <div className="h-4 w-24 rounded bg-muted animate-pulse" />
          </div>
          <div className="h-4 w-16 rounded bg-muted animate-pulse" />
        </div>
      </CardContent>
    </Card>
  );
}

