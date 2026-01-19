'use client';

import { cn } from '@/lib/utils';
import type { TagColor } from '@/types';

interface TagBadgeProps {
  name: string;
  color?: TagColor;
  className?: string;
  onClick?: () => void;
  removable?: boolean;
  onRemove?: () => void;
}

const colorMap: Record<TagColor, string> = {
  weekly: 'bg-tag-weekly text-tag-weekly-foreground',
  monthly: 'bg-tag-monthly text-tag-monthly-foreground',
  product: 'bg-tag-product text-tag-product-foreground',
  business: 'bg-tag-business text-tag-business-foreground',
  personal: 'bg-tag-personal text-tag-personal-foreground',
  badge: 'bg-tag-badge text-tag-badge-foreground',
};

export function getTagColor(tagName: string): TagColor {
  const normalized = tagName.toLowerCase();
  if (normalized === 'weekly') return 'weekly';
  if (normalized === 'monthly') return 'monthly';
  if (normalized === 'product') return 'product';
  if (normalized === 'business') return 'business';
  if (normalized === 'personal') return 'personal';
  if (normalized === 'badge') return 'badge';
  // Default color based on first letter
  const colors: TagColor[] = ['weekly', 'monthly', 'product', 'business', 'personal', 'badge'];
  const index = normalized.charCodeAt(0) % colors.length;
  return colors[index];
}

export function TagBadge({
  name,
  color,
  className,
  onClick,
  removable,
  onRemove,
}: TagBadgeProps) {
  const tagColor = color || getTagColor(name);

  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-xs font-medium transition-colors',
        colorMap[tagColor],
        onClick && 'cursor-pointer hover:opacity-80',
        className
      )}
      onClick={onClick}
    >
      {name}
      {removable && onRemove && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          className="ml-0.5 rounded-full hover:bg-black/10 dark:hover:bg-white/10 p-0.5"
        >
          <svg
            className="h-3 w-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      )}
    </span>
  );
}

