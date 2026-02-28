'use client';

import { useState, use, useEffect, useRef, useCallback, useMemo, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bot, Code2, Eye, Copy, Loader2, CheckCircle2, AlertTriangle, GripVertical, Pencil, Check, X, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';
import { SandpackProvider, SandpackLayout, SandpackCodeEditor, SandpackPreview, useSandpack } from '@codesandbox/sandpack-react';
import { toast } from 'sonner';
import { useComponentLibrary, useLibraryComponents } from '@/lib/hooks/use-component-libraries';
import { componentLibrariesRepository } from '@/lib/db/repositories/supabase/component-libraries';
import { useAISettingsStore } from '@/lib/stores/ai-settings-store';
import { usePrototype, useCreatePrototype, useUpdatePrototype } from '@/lib/hooks/use-prototypes';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { PrototypeChatInput, type MentionItem, type ChatConfig } from '@/components/prototypes/prototype-chat-input';
import { Conversation, ConversationContent, ConversationEmptyState, ConversationScrollButton } from '@/components/ai-elements/conversation';
import { Message as AIMessage, MessageContent, MessageResponse } from '@/components/ai-elements/message';
import type { PrototypeChatMessage } from '@/types';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Derives a clean prototype name from the user's first chat message.
 * - Strips @mention syntax (e.g. @[Title](id))
 * - Collapses whitespace
 * - Truncates at a word boundary up to maxLength characters
 * - Capitalizes the first letter
 */
function generateNameFromMessage(text: string, maxLength = 50): string {
  // Remove @mention markup like @[Some Title](id)
  let clean = text.replace(/@\[([^\]]*)\]\([^)]*\)/g, '$1');
  // Collapse newlines and extra spaces
  clean = clean.replace(/\s+/g, ' ').trim();
  if (!clean) return 'Untitled Prototype';
  // Truncate at word boundary
  if (clean.length > maxLength) {
    const truncated = clean.slice(0, maxLength);
    const lastSpace = truncated.lastIndexOf(' ');
    clean = lastSpace > 0 ? truncated.slice(0, lastSpace) : truncated;
    clean = clean.trimEnd() + '…';
  }
  // Capitalize first letter
  return clean.charAt(0).toUpperCase() + clean.slice(1);
}

function extractCode(content: string): string | null {
  const match = content.match(/```(?:jsx?|tsx?|javascript|typescript)\n([\s\S]*?)```/);
  if (!match) return null;
  let code = match[1].trim();
  // Sandpack handles absolute root paths (/lib/...) much better than path aliases (@/lib/...)
  code = code.replace(/from\s+['"]@\/(components|lib)\/([^'"]+)['"]/g, "from '/$1/$2'");
  return code;
}

function buildLibraryContext(library: any, components: any[] = []): string {
  if (!library) return 'No component library selected — use plain Tailwind CSS classes only.';
  const pkg = library.packageName || library.name;
  const parts: string[] = [
    `Component Library: ${library.name}`,
    `Package / Import Source: ${pkg}${library.packageVersion ? ` v${library.packageVersion}` : ''}`,
    library.description ? `Description: ${library.description}` : '',
    '',
    `IMPORTANT: Import ALL UI components from '${pkg}'. For example:`,
    `  import { Button, TextField, Card } from '${pkg}';`,
    `Do NOT import from '@/components/ui/*' or any shadcn paths.`,
  ].filter((s) => s !== undefined);

  const comps = components.length > 0 ? components : library.components || [];
  if (comps.length > 0) {
    parts.push('');
    parts.push(`Available Components (${comps.length} total):`);
    comps.slice(0, 60).forEach((c: any) => {
      let line = `- ${c.name}`;
      if (c.category) line += ` [${c.category}]`;
      if (c.description) line += `: ${c.description}`;
      parts.push(line);
      // Include example usage when available
      if (c.exampleUsage) {
        parts.push(`  Example: ${c.exampleUsage.split('\n')[0]}`);
      }
    });
  }
  return parts.join('\n');
}

function buildContextFromMentions(mentions: MentionItem[]): string {
  if (mentions.length === 0) return '';
  return mentions.map((m) => {
    const d = m.data as any;
    if (m.type === 'prd') return `=== PRD: ${d.title || m.title} ===\n${d.content ? String(d.content).slice(0, 2000) : '(no content)'}`;
    if (m.type === 'feature') return `=== Feature: ${d.title || m.title} ===\nStatus: ${d.status || 'N/A'}\nPriority: ${d.priority || 'N/A'}\nDescription: ${d.description || '(no description)'}`;
    if (m.type === 'task') return `=== Task: ${d.title || m.title} ===\nStatus: ${d.status || 'N/A'}\nDescription: ${d.description || '(no description)'}`;
    return '';
  }).filter(Boolean).join('\n\n');
}

function buildSandpackDeps(library: any): Record<string, string> {
  const base: Record<string, string> = {
    'lucide-react': 'latest',
    'class-variance-authority': 'latest',
    'clsx': 'latest',
    'tailwind-merge': 'latest',
    '@radix-ui/react-slot': 'latest',
    '@radix-ui/react-dialog': 'latest',
    '@radix-ui/react-dropdown-menu': 'latest',
    '@radix-ui/react-select': 'latest',
    '@radix-ui/react-tabs': 'latest',
    '@radix-ui/react-checkbox': 'latest',
    '@radix-ui/react-switch': 'latest',
    '@radix-ui/react-progress': 'latest',
    '@radix-ui/react-scroll-area': 'latest',
    '@radix-ui/react-separator': 'latest',
    '@radix-ui/react-avatar': 'latest',
    '@radix-ui/react-tooltip': 'latest',
    '@radix-ui/react-popover': 'latest',
    '@radix-ui/react-label': 'latest',
    '@radix-ui/react-accordion': 'latest',
    '@radix-ui/react-collapsible': 'latest',
    '@radix-ui/react-radio-group': 'latest',
    'cmdk': 'latest',
    'react-dom': '18.2.0',
    'react': '18.2.0',
  };
  if (library?.packageName) {
    base[library.packageName] = library.packageVersion ? `^${library.packageVersion}` : 'latest';

    // Add emotion and icons required by MUI
    if (library.packageName.includes('@mui')) {
      base['@emotion/react'] = 'latest';
      base['@emotion/styled'] = 'latest';
      base['@mui/icons-material'] = 'latest';
    }
  }
  return base;
}

const DEFAULT_CODE = `export default function App() {
  return (
    <div style={{ minHeight: "100%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", padding: "2rem" }}>
      <div style={{ width: "100%", maxWidth: 420, border: "1px solid #e5e7eb", borderRadius: 16, padding: "2rem", boxShadow: "0 2px 12px rgba(0,0,0,0.08)", textAlign: "center" }}>
        <div style={{ width: 56, height: 56, background: "#f0f4ff", borderRadius: 16, display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 1rem" }}>
          <svg width="28" height="28" fill="none" stroke="#6366f1" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <h2 style={{ fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>Ready to Build</h2>
        <p style={{ color: "#6b7280", fontSize: "0.875rem", lineHeight: 1.6, marginBottom: "1.5rem" }}>
          Describe the UI you want in the chat below.
        </p>
        <span style={{ display: "inline-block", background: "#f3f4f6", borderRadius: 999, padding: "0.25rem 0.75rem", fontSize: "0.75rem" }}>shadcn/ui powered</span>
      </div>
    </div>
  );
}`;

// ─── Helper: strip code fences from displayed text ───────────────────────────
function stripCodeBlocks(text: string): string {
  return text.replace(/```(?:jsx?|tsx?|javascript|typescript)\n[\s\S]*?```/g, '').trim();
}

// ─── Sandpack Error Banner ────────────────────────────────────────────────────
function SandpackErrorBanner({ onSendError }: { onSendError: (errorText: string) => void }) {
  const { sandpack } = useSandpack();
  const error = sandpack.error;

  if (!error) return null;

  const errorText = [error.title, error.message]
    .filter(Boolean)
    .join('\n')
    .trim();

  return (
    <div className="absolute top-0 left-0 right-0 z-20 flex items-start gap-3 px-4 py-3 bg-destructive/10 border-b border-destructive/30 backdrop-blur-sm">
      <AlertTriangle className="w-4 h-4 text-destructive shrink-0 mt-0.5" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-semibold text-destructive">
          {error.title || 'Runtime Error'}
        </p>
        <p className="text-[11px] text-destructive/80 mt-0.5 line-clamp-2 font-mono break-all">
          {error.message}
        </p>
      </div>
      <Button
        size="sm"
        variant="destructive"
        className="h-7 px-2.5 text-xs shrink-0 gap-1.5"
        onClick={() => {
          const prompt = `I got this error in the preview:\n\n${errorText}\n\nPlease fix the code to resolve this error.`;
          onSendError(prompt);
        }}
      >
        <AlertTriangle className="w-3 h-3" />
        Send to AI
      </Button>
    </div>
  );
}

// ─── Sandpack CSS + theme variables ──────────────────────────────────────────
const SHADCN_THEME_FILE = `
import { useEffect } from 'react';
export function ShadcnTheme() {
  useEffect(() => {
    const s = document.createElement('style');
    s.textContent = \`
      *, *::before, *::after { box-sizing: border-box; }
      :root {
        --background: 0 0% 100%; --foreground: 222.2 84% 4.9%;
        --card: 0 0% 100%; --card-foreground: 222.2 84% 4.9%;
        --popover: 0 0% 100%; --popover-foreground: 222.2 84% 4.9%;
        --primary: 221.2 83.2% 53.3%; --primary-foreground: 210 40% 98%;
        --secondary: 210 40% 96.1%; --secondary-foreground: 222.2 47.4% 11.2%;
        --muted: 210 40% 96.1%; --muted-foreground: 215.4 16.3% 46.9%;
        --accent: 210 40% 96.1%; --accent-foreground: 222.2 47.4% 11.2%;
        --destructive: 0 84.2% 60.2%; --destructive-foreground: 210 40% 98%;
        --border: 214.3 31.8% 91.4%; --input: 214.3 31.8% 91.4%;
        --ring: 221.2 83.2% 53.3%; --radius: 0.5rem;
      }
      body { margin: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: hsl(var(--background)); color: hsl(var(--foreground)); }
    \`;
    document.head.appendChild(s);
    return () => document.head.removeChild(s);
  }, []);
  return null;
}
`;

// ─── shadcn/ui virtual file: utils ───────────────────────────────────────────
const UTILS_FILE = `import { clsx } from 'clsx'; import { twMerge } from 'tailwind-merge'; export function cn(...inputs) { return twMerge(clsx(inputs)); }`;

// ─── shadcn/ui virtual file: button ──────────────────────────────────────────
const BUTTON_FILE = `import * as React from 'react'; import { Slot } from '@radix-ui/react-slot'; import { cva } from 'class-variance-authority'; import { cn } from '../../lib/utils';
const buttonVariants = cva('inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50', { variants: { variant: { default: 'bg-primary text-primary-foreground hover:bg-primary/90', destructive: 'bg-destructive text-destructive-foreground hover:bg-destructive/90', outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground', secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80', ghost: 'hover:bg-accent hover:text-accent-foreground', link: 'text-primary underline-offset-4 hover:underline' }, size: { default: 'h-10 px-4 py-2', sm: 'h-9 rounded-md px-3', lg: 'h-11 rounded-md px-8', icon: 'h-10 w-10' } }, defaultVariants: { variant: 'default', size: 'default' } });
const Button = React.forwardRef(({ className, variant, size, asChild = false, ...props }, ref) => { const Comp = asChild ? Slot : 'button'; return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />; });
Button.displayName = 'Button'; export { Button, buttonVariants };`;

const CARD_FILE = `import * as React from 'react'; import { cn } from '../../lib/utils';
const Card = React.forwardRef(({ className, ...props }, ref) => (<div ref={ref} className={cn('rounded-xl border bg-card text-card-foreground shadow', className)} {...props} />));
Card.displayName = 'Card';
const CardHeader = React.forwardRef(({ className, ...props }, ref) => (<div ref={ref} className={cn('flex flex-col space-y-1.5 p-6', className)} {...props} />));
CardHeader.displayName = 'CardHeader';
const CardTitle = React.forwardRef(({ className, ...props }, ref) => (<div ref={ref} className={cn('font-semibold leading-none tracking-tight', className)} {...props} />));
CardTitle.displayName = 'CardTitle';
const CardDescription = React.forwardRef(({ className, ...props }, ref) => (<div ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />));
CardDescription.displayName = 'CardDescription';
const CardContent = React.forwardRef(({ className, ...props }, ref) => (<div ref={ref} className={cn('p-6 pt-0', className)} {...props} />));
CardContent.displayName = 'CardContent';
const CardFooter = React.forwardRef(({ className, ...props }, ref) => (<div ref={ref} className={cn('flex items-center p-6 pt-0', className)} {...props} />));
CardFooter.displayName = 'CardFooter';
export { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter };`;

const BADGE_FILE = `import * as React from 'react'; import { cva } from 'class-variance-authority'; import { cn } from '../../lib/utils';
const badgeVariants = cva('inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors', { variants: { variant: { default: 'border-transparent bg-primary text-primary-foreground hover:bg-primary/80', secondary: 'border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80', destructive: 'border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80', outline: 'text-foreground' } }, defaultVariants: { variant: 'default' } });
function Badge({ className, variant, ...props }) { return <div className={cn(badgeVariants({ variant }), className)} {...props} />; }
export { Badge, badgeVariants };`;

const INPUT_FILE = `import * as React from 'react'; import { cn } from '../../lib/utils';
const Input = React.forwardRef(({ className, type, ...props }, ref) => (<input type={type} className={cn('flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', className)} ref={ref} {...props} />));
Input.displayName = 'Input'; export { Input };`;

const LABEL_FILE = `import * as React from 'react'; import * as LabelPrimitive from '@radix-ui/react-label'; import { cva } from 'class-variance-authority'; import { cn } from '../../lib/utils';
const labelVariants = cva('text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70');
const Label = React.forwardRef(({ className, ...props }, ref) => (<LabelPrimitive.Root ref={ref} className={cn(labelVariants(), className)} {...props} />));
Label.displayName = LabelPrimitive.Root.displayName; export { Label };`;

const SEPARATOR_FILE = `import * as React from 'react'; import * as SeparatorPrimitive from '@radix-ui/react-separator'; import { cn } from '../../lib/utils';
const Separator = React.forwardRef(({ className, orientation = 'horizontal', decorative = true, ...props }, ref) => (<SeparatorPrimitive.Root ref={ref} decorative={decorative} orientation={orientation} className={cn('shrink-0 bg-border', orientation === 'horizontal' ? 'h-[1px] w-full' : 'h-full w-[1px]', className)} {...props} />));
Separator.displayName = SeparatorPrimitive.Root.displayName; export { Separator };`;

const AVATAR_FILE = `import * as React from 'react'; import * as AvatarPrimitive from '@radix-ui/react-avatar'; import { cn } from '../../lib/utils';
const Avatar = React.forwardRef(({ className, ...props }, ref) => (<AvatarPrimitive.Root ref={ref} className={cn('relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full', className)} {...props} />));
Avatar.displayName = AvatarPrimitive.Root.displayName;
const AvatarImage = React.forwardRef(({ className, ...props }, ref) => (<AvatarPrimitive.Image ref={ref} className={cn('aspect-square h-full w-full', className)} {...props} />));
AvatarImage.displayName = AvatarPrimitive.Image.displayName;
const AvatarFallback = React.forwardRef(({ className, ...props }, ref) => (<AvatarPrimitive.Fallback ref={ref} className={cn('flex h-full w-full items-center justify-center rounded-full bg-muted', className)} {...props} />));
AvatarFallback.displayName = AvatarPrimitive.Fallback.displayName;
export { Avatar, AvatarImage, AvatarFallback };`;

const TABS_FILE = `import * as React from 'react'; import * as TabsPrimitive from '@radix-ui/react-tabs'; import { cn } from '../../lib/utils';
const Tabs = TabsPrimitive.Root;
const TabsList = React.forwardRef(({ className, ...props }, ref) => (<TabsPrimitive.List ref={ref} className={cn('inline-flex h-10 items-center justify-center rounded-md bg-muted p-1 text-muted-foreground', className)} {...props} />));
TabsList.displayName = TabsPrimitive.List.displayName;
const TabsTrigger = React.forwardRef(({ className, ...props }, ref) => (<TabsPrimitive.Trigger ref={ref} className={cn('inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium ring-offset-background transition-all disabled:pointer-events-none disabled:opacity-50 data-[state=active]:bg-background data-[state=active]:text-foreground data-[state=active]:shadow-sm', className)} {...props} />));
TabsTrigger.displayName = TabsPrimitive.Trigger.displayName;
const TabsContent = React.forwardRef(({ className, ...props }, ref) => (<TabsPrimitive.Content ref={ref} className={cn('mt-2 ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2', className)} {...props} />));
TabsContent.displayName = TabsPrimitive.Content.displayName;
export { Tabs, TabsList, TabsTrigger, TabsContent };`;

const TEXTAREA_FILE = `import * as React from 'react'; import { cn } from '../../lib/utils';
const Textarea = React.forwardRef(({ className, ...props }, ref) => (<textarea className={cn('flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50', className)} ref={ref} {...props} />));
Textarea.displayName = 'Textarea'; export { Textarea };`;

const SWITCH_FILE = `import * as React from 'react'; import * as SwitchPrimitives from '@radix-ui/react-switch'; import { cn } from '../../lib/utils';
const Switch = React.forwardRef(({ className, ...props }, ref) => (
  <SwitchPrimitives.Root className={cn('peer inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border-2 border-transparent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=unchecked]:bg-input', className)} {...props} ref={ref}>
    <SwitchPrimitives.Thumb className={cn('pointer-events-none block h-5 w-5 rounded-full bg-background shadow-lg ring-0 transition-transform data-[state=checked]:translate-x-5 data-[state=unchecked]:translate-x-0')} />
  </SwitchPrimitives.Root>
));
Switch.displayName = SwitchPrimitives.Root.displayName; export { Switch };`;

const CHECKBOX_FILE = `import * as React from 'react'; import * as CheckboxPrimitive from '@radix-ui/react-checkbox'; import { cn } from '../../lib/utils';
const Checkbox = React.forwardRef(({ className, ...props }, ref) => (
  <CheckboxPrimitive.Root ref={ref} className={cn('peer h-4 w-4 shrink-0 rounded-sm border border-primary ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 data-[state=checked]:bg-primary data-[state=checked]:text-primary-foreground', className)} {...props}>
    <CheckboxPrimitive.Indicator className={cn('flex items-center justify-center text-current')}>
      <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L3.5 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg>
    </CheckboxPrimitive.Indicator>
  </CheckboxPrimitive.Root>
));
Checkbox.displayName = CheckboxPrimitive.Root.displayName; export { Checkbox };`;

const PROGRESS_FILE = `import * as React from 'react'; import * as ProgressPrimitive from '@radix-ui/react-progress'; import { cn } from '../../lib/utils';
const Progress = React.forwardRef(({ className, value, ...props }, ref) => (<ProgressPrimitive.Root ref={ref} className={cn('relative h-4 w-full overflow-hidden rounded-full bg-secondary', className)} {...props}><ProgressPrimitive.Indicator className="h-full w-full flex-1 bg-primary transition-all" style={{ transform: 'translateX(-' + (100 - (value || 0)) + '%)' }} /></ProgressPrimitive.Root>));
Progress.displayName = ProgressPrimitive.Root.displayName; export { Progress };`;

const SKELETON_FILE = `import { cn } from '../../lib/utils';
function Skeleton({ className, ...props }) { return <div className={cn('animate-pulse rounded-md bg-muted', className)} {...props} />; }
export { Skeleton };`;

const ALERT_FILE = `import * as React from 'react'; import { cva } from 'class-variance-authority'; import { cn } from '../../lib/utils';
const alertVariants = cva('relative w-full rounded-lg border p-4', { variants: { variant: { default: 'bg-background text-foreground', destructive: 'border-destructive/50 text-destructive' } }, defaultVariants: { variant: 'default' } });
const Alert = React.forwardRef(({ className, variant, ...props }, ref) => (<div ref={ref} role="alert" className={cn(alertVariants({ variant }), className)} {...props} />));
Alert.displayName = 'Alert';
const AlertTitle = React.forwardRef(({ className, ...props }, ref) => (<h5 ref={ref} className={cn('mb-1 font-medium leading-none tracking-tight', className)} {...props} />));
AlertTitle.displayName = 'AlertTitle';
const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (<div ref={ref} className={cn('text-sm [&_p]:leading-relaxed', className)} {...props} />));
AlertDescription.displayName = 'AlertDescription';
export { Alert, AlertTitle, AlertDescription };`;

const TABLE_FILE = `import * as React from 'react'; import { cn } from '../../lib/utils';
const Table = React.forwardRef(({ className, ...props }, ref) => (<div className="relative w-full overflow-auto"><table ref={ref} className={cn('w-full caption-bottom text-sm', className)} {...props} /></div>));
Table.displayName = 'Table';
const TableHeader = React.forwardRef(({ className, ...props }, ref) => (<thead ref={ref} className={cn('[&_tr]:border-b', className)} {...props} />));
TableHeader.displayName = 'TableHeader';
const TableBody = React.forwardRef(({ className, ...props }, ref) => (<tbody ref={ref} className={cn('[&_tr:last-child]:border-0', className)} {...props} />));
TableBody.displayName = 'TableBody';
const TableHead = React.forwardRef(({ className, ...props }, ref) => (<th ref={ref} className={cn('h-12 px-4 text-left align-middle font-medium text-muted-foreground', className)} {...props} />));
TableHead.displayName = 'TableHead';
const TableRow = React.forwardRef(({ className, ...props }, ref) => (<tr ref={ref} className={cn('border-b transition-colors hover:bg-muted/50', className)} {...props} />));
TableRow.displayName = 'TableRow';
const TableCell = React.forwardRef(({ className, ...props }, ref) => (<td ref={ref} className={cn('p-4 align-middle', className)} {...props} />));
TableCell.displayName = 'TableCell';
export { Table, TableHeader, TableBody, TableHead, TableRow, TableCell };`;

const SCROLL_AREA_FILE = `import * as React from 'react'; import * as ScrollAreaPrimitive from '@radix-ui/react-scroll-area'; import { cn } from '../../lib/utils';
const ScrollArea = React.forwardRef(({ className, children, ...props }, ref) => (<ScrollAreaPrimitive.Root ref={ref} className={cn('relative overflow-hidden', className)} {...props}><ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">{children}</ScrollAreaPrimitive.Viewport><ScrollBar /><ScrollAreaPrimitive.Corner /></ScrollAreaPrimitive.Root>));
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName;
const ScrollBar = React.forwardRef(({ className, orientation = 'vertical', ...props }, ref) => (<ScrollAreaPrimitive.ScrollAreaScrollbar ref={ref} orientation={orientation} className={cn('flex touch-none select-none transition-colors', orientation === 'vertical' ? 'h-full w-2.5 border-l border-l-transparent p-[1px]' : 'h-2.5 flex-col border-t border-t-transparent p-[1px]', className)} {...props}><ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-border" /></ScrollAreaPrimitive.ScrollAreaScrollbar>));
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName;
export { ScrollArea, ScrollBar };`;

const DIALOG_FILE = `import * as React from 'react'; import * as DialogPrimitive from '@radix-ui/react-dialog'; import { cn } from '../../lib/utils';
const Dialog = DialogPrimitive.Root; const DialogTrigger = DialogPrimitive.Trigger; const DialogPortal = DialogPrimitive.Portal; const DialogClose = DialogPrimitive.Close;
const DialogOverlay = React.forwardRef(({ className, ...props }, ref) => (<DialogPrimitive.Overlay ref={ref} className={cn('fixed inset-0 z-50 bg-black/80', className)} {...props} />));
DialogOverlay.displayName = DialogPrimitive.Overlay.displayName;
const DialogContent = React.forwardRef(({ className, children, ...props }, ref) => (<DialogPortal><DialogOverlay /><DialogPrimitive.Content ref={ref} className={cn('fixed left-[50%] top-[50%] z-50 grid w-full max-w-lg translate-x-[-50%] translate-y-[-50%] gap-4 border bg-background p-6 shadow-lg sm:rounded-lg', className)} {...props}>{children}</DialogPrimitive.Content></DialogPortal>));
DialogContent.displayName = DialogPrimitive.Content.displayName;
const DialogHeader = ({ className, ...props }) => (<div className={cn('flex flex-col space-y-1.5 text-center sm:text-left', className)} {...props} />);
const DialogFooter = ({ className, ...props }) => (<div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />);
const DialogTitle = React.forwardRef(({ className, ...props }, ref) => (<DialogPrimitive.Title ref={ref} className={cn('text-lg font-semibold leading-none tracking-tight', className)} {...props} />));
DialogTitle.displayName = DialogPrimitive.Title.displayName;
const DialogDescription = React.forwardRef(({ className, ...props }, ref) => (<DialogPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />));
DialogDescription.displayName = DialogPrimitive.Description.displayName;
export { Dialog, DialogPortal, DialogOverlay, DialogClose, DialogTrigger, DialogContent, DialogHeader, DialogFooter, DialogTitle, DialogDescription };`;

const DROPDOWN_FILE = `import * as React from 'react'; import * as DropdownMenuPrimitive from '@radix-ui/react-dropdown-menu'; import { cn } from '../../lib/utils';
const DropdownMenu = DropdownMenuPrimitive.Root; const DropdownMenuTrigger = DropdownMenuPrimitive.Trigger; const DropdownMenuGroup = DropdownMenuPrimitive.Group; const DropdownMenuPortal = DropdownMenuPrimitive.Portal; const DropdownMenuSub = DropdownMenuPrimitive.Sub; const DropdownMenuRadioGroup = DropdownMenuPrimitive.RadioGroup;
const DropdownMenuContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => (<DropdownMenuPrimitive.Portal><DropdownMenuPrimitive.Content ref={ref} sideOffset={sideOffset} className={cn('z-50 min-w-[8rem] overflow-hidden rounded-md border bg-popover p-1 text-popover-foreground shadow-md', className)} {...props} /></DropdownMenuPrimitive.Portal>));
DropdownMenuContent.displayName = DropdownMenuPrimitive.Content.displayName;
const DropdownMenuItem = React.forwardRef(({ className, inset, ...props }, ref) => (<DropdownMenuPrimitive.Item ref={ref} className={cn('relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50', inset && 'pl-8', className)} {...props} />));
DropdownMenuItem.displayName = DropdownMenuPrimitive.Item.displayName;
const DropdownMenuLabel = React.forwardRef(({ className, inset, ...props }, ref) => (<DropdownMenuPrimitive.Label ref={ref} className={cn('px-2 py-1.5 text-sm font-semibold', inset && 'pl-8', className)} {...props} />));
DropdownMenuLabel.displayName = DropdownMenuPrimitive.Label.displayName;
const DropdownMenuSeparator = React.forwardRef(({ className, ...props }, ref) => (<DropdownMenuPrimitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-muted', className)} {...props} />));
DropdownMenuSeparator.displayName = DropdownMenuPrimitive.Separator.displayName;
export { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuGroup, DropdownMenuPortal, DropdownMenuSub, DropdownMenuRadioGroup };`;

const SELECT_FILE = `import * as React from 'react'; import * as SelectPrimitive from '@radix-ui/react-select'; import { cn } from '../../lib/utils';
const Select = SelectPrimitive.Root; const SelectGroup = SelectPrimitive.Group; const SelectValue = SelectPrimitive.Value;
const SelectTrigger = React.forwardRef(({ className, children, ...props }, ref) => (<SelectPrimitive.Trigger ref={ref} className={cn('flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 [&>span]:line-clamp-1', className)} {...props}>{children}<SelectPrimitive.Icon asChild><svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></SelectPrimitive.Icon></SelectPrimitive.Trigger>));
SelectTrigger.displayName = SelectPrimitive.Trigger.displayName;
const SelectContent = React.forwardRef(({ className, children, position = 'popper', ...props }, ref) => (<SelectPrimitive.Portal><SelectPrimitive.Content ref={ref} className={cn('relative z-50 max-h-96 min-w-[8rem] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md', className)} position={position} {...props}><SelectPrimitive.Viewport className={cn('p-1', position === 'popper' && 'h-[var(--radix-select-trigger-height)] w-full min-w-[var(--radix-select-trigger-width)]')}>{children}</SelectPrimitive.Viewport></SelectPrimitive.Content></SelectPrimitive.Portal>));
SelectContent.displayName = SelectPrimitive.Content.displayName;
const SelectLabel = React.forwardRef(({ className, ...props }, ref) => (<SelectPrimitive.Label ref={ref} className={cn('py-1.5 pl-8 pr-2 text-sm font-semibold', className)} {...props} />));
SelectLabel.displayName = SelectPrimitive.Label.displayName;
const SelectItem = React.forwardRef(({ className, children, ...props }, ref) => (<SelectPrimitive.Item ref={ref} className={cn('relative flex w-full cursor-default select-none items-center rounded-sm py-1.5 pl-8 pr-2 text-sm outline-none focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50', className)} {...props}><span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center"><SelectPrimitive.ItemIndicator><svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1.5 5L3.5 7.5L8.5 2.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/></svg></SelectPrimitive.ItemIndicator></span><SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText></SelectPrimitive.Item>));
SelectItem.displayName = SelectPrimitive.Item.displayName;
const SelectSeparator = React.forwardRef(({ className, ...props }, ref) => (<SelectPrimitive.Separator ref={ref} className={cn('-mx-1 my-1 h-px bg-muted', className)} {...props} />));
SelectSeparator.displayName = SelectPrimitive.Separator.displayName;
export { Select, SelectGroup, SelectValue, SelectTrigger, SelectContent, SelectLabel, SelectItem, SelectSeparator };`;

const POPOVER_FILE = `import * as React from 'react'; import * as PopoverPrimitive from '@radix-ui/react-popover'; import { cn } from '../../lib/utils';
const Popover = PopoverPrimitive.Root; const PopoverTrigger = PopoverPrimitive.Trigger;
const PopoverContent = React.forwardRef(({ className, align = 'center', sideOffset = 4, ...props }, ref) => (<PopoverPrimitive.Portal><PopoverPrimitive.Content ref={ref} align={align} sideOffset={sideOffset} className={cn('z-50 w-72 rounded-md border bg-popover p-4 text-popover-foreground shadow-md outline-none', className)} {...props} /></PopoverPrimitive.Portal>));
PopoverContent.displayName = PopoverPrimitive.Content.displayName;
export { Popover, PopoverTrigger, PopoverContent };`;

const TOOLTIP_FILE = `import * as React from 'react'; import * as TooltipPrimitive from '@radix-ui/react-tooltip'; import { cn } from '../../lib/utils';
const TooltipProvider = TooltipPrimitive.Provider; const Tooltip = TooltipPrimitive.Root; const TooltipTrigger = TooltipPrimitive.Trigger;
const TooltipContent = React.forwardRef(({ className, sideOffset = 4, ...props }, ref) => (<TooltipPrimitive.Content ref={ref} sideOffset={sideOffset} className={cn('z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md', className)} {...props} />));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;
export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };`;

const SHEET_FILE = `import * as React from 'react'; import * as SheetPrimitive from '@radix-ui/react-dialog'; import { cn } from '../../lib/utils';
const Sheet = SheetPrimitive.Root; const SheetTrigger = SheetPrimitive.Trigger; const SheetClose = SheetPrimitive.Close; const SheetPortal = SheetPrimitive.Portal;
const SheetOverlay = React.forwardRef(({ className, ...props }, ref) => (<SheetPrimitive.Overlay className={cn('fixed inset-0 z-50 bg-black/80', className)} {...props} ref={ref} />));
SheetOverlay.displayName = SheetPrimitive.Overlay.displayName;
const sideMap = { top: 'inset-x-0 top-0 border-b', bottom: 'inset-x-0 bottom-0 border-t', left: 'inset-y-0 left-0 h-full w-3/4 border-r sm:max-w-sm', right: 'inset-y-0 right-0 h-full w-3/4 border-l sm:max-w-sm' };
const SheetContent = React.forwardRef(({ side = 'right', className, children, ...props }, ref) => (<SheetPortal><SheetOverlay /><SheetPrimitive.Content ref={ref} className={cn('fixed z-50 gap-4 bg-background p-6 shadow-lg', sideMap[side] || sideMap.right, className)} {...props}>{children}</SheetPrimitive.Content></SheetPortal>));
SheetContent.displayName = SheetPrimitive.Content.displayName;
const SheetHeader = ({ className, ...props }) => (<div className={cn('flex flex-col space-y-2 text-center sm:text-left', className)} {...props} />);
const SheetFooter = ({ className, ...props }) => (<div className={cn('flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2', className)} {...props} />);
const SheetTitle = React.forwardRef(({ className, ...props }, ref) => (<SheetPrimitive.Title ref={ref} className={cn('text-lg font-semibold text-foreground', className)} {...props} />));
SheetTitle.displayName = SheetPrimitive.Title.displayName;
const SheetDescription = React.forwardRef(({ className, ...props }, ref) => (<SheetPrimitive.Description ref={ref} className={cn('text-sm text-muted-foreground', className)} {...props} />));
SheetDescription.displayName = SheetPrimitive.Description.displayName;
export { Sheet, SheetPortal, SheetOverlay, SheetTrigger, SheetClose, SheetContent, SheetHeader, SheetFooter, SheetTitle, SheetDescription };`;

const COMMAND_FILE = `import * as React from 'react'; import { Command as CommandPrimitive } from 'cmdk'; import { cn } from '../../lib/utils';
const Command = React.forwardRef(({ className, ...props }, ref) => (<CommandPrimitive ref={ref} className={cn('flex h-full w-full flex-col overflow-hidden rounded-md bg-popover text-popover-foreground', className)} {...props} />));
Command.displayName = CommandPrimitive.displayName;
const CommandInput = React.forwardRef(({ className, ...props }, ref) => (<div className="flex items-center border-b px-3"><svg className="mr-2 h-4 w-4 shrink-0 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg><CommandPrimitive.Input ref={ref} className={cn('flex h-11 w-full rounded-md bg-transparent py-3 text-sm outline-none placeholder:text-muted-foreground disabled:cursor-not-allowed disabled:opacity-50', className)} {...props} /></div>));
CommandInput.displayName = CommandPrimitive.Input.displayName;
const CommandList = React.forwardRef(({ className, ...props }, ref) => (<CommandPrimitive.List ref={ref} className={cn('max-h-[300px] overflow-y-auto overflow-x-hidden', className)} {...props} />));
CommandList.displayName = CommandPrimitive.List.displayName;
const CommandEmpty = React.forwardRef((props, ref) => (<CommandPrimitive.Empty ref={ref} className="py-6 text-center text-sm" {...props} />));
CommandEmpty.displayName = CommandPrimitive.Empty.displayName;
const CommandGroup = React.forwardRef(({ className, ...props }, ref) => (<CommandPrimitive.Group ref={ref} className={cn('overflow-hidden p-1 text-foreground', className)} {...props} />));
CommandGroup.displayName = CommandPrimitive.Group.displayName;
const CommandItem = React.forwardRef(({ className, ...props }, ref) => (<CommandPrimitive.Item ref={ref} className={cn('relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none aria-selected:bg-accent aria-selected:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50', className)} {...props} />));
CommandItem.displayName = CommandPrimitive.Item.displayName;
export { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem };`;

// ─── All shadcn virtual files mapped for Sandpack ────────────────────────────
function buildShadcnFiles(isCustomLibrary: boolean) {
  if (isCustomLibrary) {
    return {
      '/index.js': {
        code: `import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
const root = createRoot(document.getElementById('root'));
root.render(<React.StrictMode><App /></React.StrictMode>);`,
        hidden: true,
      },
    };
  }

  return {
    '/lib/shadcn-theme.jsx': { code: SHADCN_THEME_FILE, hidden: true },
    '/lib/utils.js': { code: UTILS_FILE, hidden: true },
    '/components/ui/button.jsx': { code: BUTTON_FILE, hidden: true },
    '/components/ui/card.jsx': { code: CARD_FILE, hidden: true },
    '/components/ui/badge.jsx': { code: BADGE_FILE, hidden: true },
    '/components/ui/input.jsx': { code: INPUT_FILE, hidden: true },
    '/components/ui/label.jsx': { code: LABEL_FILE, hidden: true },
    '/components/ui/separator.jsx': { code: SEPARATOR_FILE, hidden: true },
    '/components/ui/avatar.jsx': { code: AVATAR_FILE, hidden: true },
    '/components/ui/tabs.jsx': { code: TABS_FILE, hidden: true },
    '/components/ui/textarea.jsx': { code: TEXTAREA_FILE, hidden: true },
    '/components/ui/switch.jsx': { code: SWITCH_FILE, hidden: true },
    '/components/ui/checkbox.jsx': { code: CHECKBOX_FILE, hidden: true },
    '/components/ui/progress.jsx': { code: PROGRESS_FILE, hidden: true },
    '/components/ui/skeleton.jsx': { code: SKELETON_FILE, hidden: true },
    '/components/ui/alert.jsx': { code: ALERT_FILE, hidden: true },
    '/components/ui/table.jsx': { code: TABLE_FILE, hidden: true },
    '/components/ui/scroll-area.jsx': { code: SCROLL_AREA_FILE, hidden: true },
    '/components/ui/dialog.jsx': { code: DIALOG_FILE, hidden: true },
    '/components/ui/dropdown-menu.jsx': { code: DROPDOWN_FILE, hidden: true },
    '/components/ui/select.jsx': { code: SELECT_FILE, hidden: true },
    '/components/ui/popover.jsx': { code: POPOVER_FILE, hidden: true },
    '/components/ui/tooltip.jsx': { code: TOOLTIP_FILE, hidden: true },
    '/components/ui/sheet.jsx': { code: SHEET_FILE, hidden: true },
    '/components/ui/command.jsx': { code: COMMAND_FILE, hidden: true },
    '/index.js': {
      code: `import React from 'react';
import { createRoot } from 'react-dom/client';
import { ShadcnTheme } from '/lib/shadcn-theme';
import App from './App';
const root = createRoot(document.getElementById('root'));
root.render(<React.StrictMode><ShadcnTheme /><App /></React.StrictMode>);`,
      hidden: true,
    },
  };
}

// ─── Main Page Component ──────────────────────────────────────────────────────

function PrototypeWorkspaceInner({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const prototypeId = resolvedParams.id;
  const router = useRouter();
  const searchParams = useSearchParams();

  // URL params set by NewPrototypeDialog
  const urlLibraryId = searchParams.get('libraryId');
  const urlProvider = searchParams.get('provider');
  const urlModel = searchParams.get('model');
  const urlName = searchParams.get('name');

  const { currentWorkspace } = useWorkspaceStore();
  const aiStore = useAISettingsStore();
  const activeProvider = aiStore.activeProvider;

  const { data: prototype, isLoading: prototypeLoading } = usePrototype(prototypeId);
  const createPrototype = useCreatePrototype();
  const updatePrototype = useUpdatePrototype();

  // Resolve effective libraryId: URL param (new prototype) OR saved on prototype (existing)
  const effectiveLibraryId = urlLibraryId || prototype?.libraryId || undefined;
  const { data: library } = useComponentLibrary(effectiveLibraryId);
  const { data: libraryComponents = [] } = useLibraryComponents(effectiveLibraryId);

  const isCustomLibrary = !!library && !library.name?.includes('No component library');

  // Track which library is used for Sandpack — updated at send time when user picks a different library
  const [sandpackLibrary, setSandpackLibrary] = useState<any>(null);
  // Use whichever is available: explicitly set sandpack library > URL/prototype library
  const effectiveSandpackLibrary = sandpackLibrary || library;
  const actualIsCustomLibrary = !!effectiveSandpackLibrary && !effectiveSandpackLibrary.name?.includes('No component library');

  // Conditionally build Sandpack files containing just index.js (for custom libs) or all shadcn files
  const shadcnFiles = useMemo(() => buildShadcnFiles(actualIsCustomLibrary), [actualIsCustomLibrary]);
  // Key to force Sandpack remount when library changes (Sandpack only installs deps on mount)
  const sandpackKey = `sp-${effectiveSandpackLibrary?.id || 'default'}`;

  // Adjust DEFAULT_CODE if MUI is selected, so the initial state doesn't look like Shadcn
  const defaultMuiCode = `export default function App() {
  return (
    <div style={{ padding: "2rem", textAlign: "center", fontFamily: "sans-serif" }}>
      <h2>Ready to Build with Material UI</h2>
      <p>Describe your UI below.</p>
    </div>
  );
}`;
  const initialCode = isCustomLibrary ? defaultMuiCode : DEFAULT_CODE;

  const [messages, setMessages] = useState<PrototypeChatMessage[]>([]);
  const [mentions, setMentions] = useState<MentionItem[]>([]);
  const [code, setCode] = useState(initialCode);
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [activeTab, setActiveTab] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState(false);

  // ── Auto-generated name from first message (for 'new' prototypes) ──────────
  const [autoName, setAutoName] = useState<string>('');

  // ── Inline title rename state ────────────────────────────────────────────────
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [titleDraft, setTitleDraft] = useState('');
  const titleInputRef = useRef<HTMLInputElement>(null);

  // ── Resize panel state (persisted to localStorage) ─────────────────────────
  const CHAT_WIDTH_KEY = 'prototype-chat-width';
  const [chatWidth, setChatWidth] = useState<number>(400);

  // Hydrate chatWidth from localStorage after mount (avoids SSR mismatch)
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const saved = localStorage.getItem(CHAT_WIDTH_KEY);
    if (saved) {
      const n = parseInt(saved, 10);
      if (!isNaN(n) && n >= 260 && n <= 600) setChatWidth(n);
    }
  }, []);
  const isResizing = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const resizeOverlayRef = useRef<HTMLDivElement | null>(null);

  const handleResizeMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    isResizing.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';

    // Create a full-screen transparent overlay to prevent iframes from stealing mouse events
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;cursor:col-resize;';
    document.body.appendChild(overlay);
    resizeOverlayRef.current = overlay;

    const onMouseMove = (ev: MouseEvent) => {
      if (!isResizing.current || !containerRef.current) return;
      const containerRect = containerRef.current.getBoundingClientRect();
      const newChatWidth = containerRect.right - ev.clientX;
      const clamped = Math.max(260, Math.min(600, newChatWidth));
      setChatWidth(clamped);
    };

    const onMouseUp = () => {
      isResizing.current = false;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
      // Remove the overlay
      if (resizeOverlayRef.current) {
        resizeOverlayRef.current.remove();
        resizeOverlayRef.current = null;
      }
      // Persist final width to localStorage
      setChatWidth(prev => {
        localStorage.setItem(CHAT_WIDTH_KEY, String(prev));
        return prev;
      });
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, []);

  // ── Send error to AI ────────────────────────────────────────────────────────
  const handleSendError = useCallback((errorText: string) => {
    handleSend(errorText, mentions, {
      libraryId: effectiveLibraryId || 'none',
      provider: urlProvider || activeProvider || 'openai',
      model: urlModel || '',
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mentions, effectiveLibraryId, urlProvider, activeProvider, urlModel]);
  const abortRef = useRef<AbortController | null>(null);

  // Load saved messages/code from prototype
  useEffect(() => {
    if (prototype) {
      if (prototype.chatHistory?.length) setMessages(prototype.chatHistory);
      if (prototype.codeContent) setCode(prototype.codeContent);
    }
  }, [prototype]);

  const handleSend = useCallback(async (text: string, mentions: MentionItem[], config: ChatConfig) => {
    if (!text.trim() || isStreaming) return;

    const userMsg: PrototypeChatMessage = { role: 'user', content: text, timestamp: new Date().toISOString() };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setIsStreaming(true);
    setStreamingText('');
    // Auto-switch to code tab so user can see code being generated in the left panel
    setActiveTab('code');

    // Use the library selected in the chat input (config.libraryId) — NOT the stale effectiveLibraryId
    const actualLibraryId = config.libraryId && config.libraryId !== 'none' ? config.libraryId : effectiveLibraryId;

    // Fetch the correct library + components at send time to ensure fresh data
    let sendLibrary: any = library;
    let sendComponents: any[] = libraryComponents;

    if (actualLibraryId && actualLibraryId !== 'none') {
      try {
        // If the selected library differs from what we have cached, fetch fresh
        if (!sendLibrary || sendLibrary.id !== actualLibraryId) {
          const fetched = await componentLibrariesRepository.getById(actualLibraryId);
          if (fetched) sendLibrary = fetched;
        }
        // Always fetch components if we don't have them for this library
        if (sendComponents.length === 0 || sendLibrary?.id !== library?.id) {
          const fetchedComponents = await componentLibrariesRepository.getComponents(actualLibraryId);
          if (fetchedComponents.length > 0) sendComponents = fetchedComponents;
        }
      } catch (err) {
        console.warn('[handleSend] Failed to fetch library data:', err);
      }
    } else {
      // No library selected — force undefined so buildLibraryContext returns shadcn path
      sendLibrary = undefined;
      sendComponents = [];
    }

    const libraryContext = buildLibraryContext(sendLibrary, sendComponents);
    const mentionContext = buildContextFromMentions(mentions);

    // Update Sandpack deps/files to match the library we're generating for
    setSandpackLibrary(sendLibrary || null);

    console.log('[handleSend] actualLibraryId:', actualLibraryId);
    console.log('[handleSend] sendLibrary:', sendLibrary?.name, sendLibrary?.packageName);
    console.log('[handleSend] sendComponents count:', sendComponents.length);
    console.log('[handleSend] libraryContext (first 300):', libraryContext.slice(0, 300));

    // Provider priority: chat input config → URL param (set during creation) → store default
    const selectedProvider = (config.provider || urlProvider || activeProvider || 'anthropic') as string;
    // Model priority: chat input config → URL param → provider default
    const selectedModel = config.model || urlModel || aiStore.providers[selectedProvider as keyof typeof aiStore.providers]?.defaultModel || '';
    const apiKey = aiStore.providers[selectedProvider as keyof typeof aiStore.providers]?.apiKey || '';

    try {
      abortRef.current = new AbortController();
      const res = await fetch('/api/prototypes/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(m => ({ role: m.role, content: m.content })),
          libraryContext,
          mentionContext,
          currentCode: code,
          provider: selectedProvider,
          model: selectedModel,
          apiKey,
        }),
        signal: abortRef.current.signal,
      });

      if (!res.ok) throw new Error(await res.text());

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let full = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        full += decoder.decode(value, { stream: true });
        setStreamingText(full);

        // Live-update preview as code streams in
        const liveCode = extractCode(full);
        if (liveCode) setCode(liveCode);
      }

      const finalCode = extractCode(full);
      if (finalCode) setCode(finalCode);

      // Switch back to preview tab once code is done generating
      setActiveTab('preview');

      const assistantMsg: PrototypeChatMessage = { role: 'assistant', content: full, timestamp: new Date().toISOString() };
      const finalMessages = [...newMessages, assistantMsg];
      setMessages(finalMessages);

      // Persist to DB
      if (currentWorkspace?.id) {
        if (prototypeId === 'new') {
          // Auto-name from the first message; urlName (from dialog) takes precedence if set
          const prototypeName = urlName || generateNameFromMessage(text);
          setAutoName(prototypeName);
          const created = await createPrototype.mutateAsync({
            name: prototypeName,
            codeContent: finalCode || code,
            chatHistory: finalMessages,
            libraryId: effectiveLibraryId,
          });
          // Navigate to saved prototype — no need to carry URL params anymore
          router.replace(`/prototypes/${created.id}`);
        } else {
          await updatePrototype.mutateAsync({
            id: prototypeId,
            codeContent: finalCode || code,
            chatHistory: finalMessages,
          });
        }
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast.error('Generation failed: ' + (err.message || 'Unknown error'));
      }
    } finally {
      setIsStreaming(false);
      setStreamingText('');
    }
  }, [messages, isStreaming, code, library, libraryComponents, urlProvider, urlModel, urlName, activeProvider, aiStore, currentWorkspace, prototypeId, effectiveLibraryId, createPrototype, updatePrototype, router]);

  const handleCopy = useCallback(() => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }, [code]);

  // ── Inline title rename handlers ─────────────────────────────────────────────
  const startEditingTitle = useCallback(() => {
    const currentName = prototype?.name || urlName || autoName || 'Untitled Prototype';
    setTitleDraft(currentName);
    setIsEditingTitle(true);
    // Focus the input after state update
    setTimeout(() => titleInputRef.current?.select(), 0);
  }, [prototype?.name, urlName, autoName]);

  const commitTitleRename = useCallback(async () => {
    const newName = titleDraft.trim();
    if (!newName) {
      setIsEditingTitle(false);
      return;
    }
    const currentName = prototype?.name || urlName || autoName || 'Untitled Prototype';
    if (newName === currentName) {
      setIsEditingTitle(false);
      return;
    }
    setIsEditingTitle(false);
    // Only persist if we have a real saved prototype (not 'new')
    if (prototypeId !== 'new' && prototype?.id) {
      try {
        await updatePrototype.mutateAsync({ id: prototype.id, name: newName });
        toast.success('Prototype renamed');
      } catch {
        toast.error('Failed to rename prototype');
      }
    }
  }, [titleDraft, prototype, urlName, autoName, prototypeId, updatePrototype]);

  const cancelTitleRename = useCallback(() => {
    setIsEditingTitle(false);
  }, []);

  const sandpackDeps = buildSandpackDeps(effectiveSandpackLibrary);

  if (prototypeLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  // Show error if prototype not found (and it's not a brand-new unsaved one)
  // Use a small delay guard: only show error if query finished AND no data returned
  if (!prototype && prototypeId !== 'new' && !prototypeLoading && prototypeId?.length > 10) {
    return (
      <div className="h-full flex flex-col items-center justify-center gap-4 text-center px-4">
        <div className="w-14 h-14 rounded-2xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-7 h-7 text-destructive" />
        </div>
        <div>
          <h2 className="text-lg font-semibold">Prototype not found</h2>
          <p className="text-sm text-muted-foreground mt-1 max-w-sm">
            This prototype may have been deleted, or the database tables are not yet set up.
            Run <code className="bg-muted px-1.5 py-0.5 rounded text-xs font-mono">036_fix_prototypes_rls.sql</code> in Supabase to set up the tables.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link href="/prototypes"><ArrowLeft className="w-4 h-4 mr-2" />Back to Prototypes</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-background overflow-hidden">
      {/* Top bar */}
      <div className="h-12 border-b flex items-center gap-3 px-4 shrink-0 bg-background/95 backdrop-blur">
        <Button variant="ghost" size="icon" className="h-7 w-7" asChild>
          <Link href="/prototypes"><ArrowLeft className="w-4 h-4" /></Link>
        </Button>
        <div className="flex-1 min-w-0 flex items-center gap-2">
          {isEditingTitle ? (
            <div className="flex items-center gap-1.5 min-w-0 flex-1">
              <Input
                ref={titleInputRef}
                value={titleDraft}
                onChange={(e) => setTitleDraft(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') commitTitleRename();
                  if (e.key === 'Escape') cancelTitleRename();
                }}
                onBlur={commitTitleRename}
                className="h-7 text-sm font-medium px-2 py-0 max-w-xs"
                autoFocus
              />
              <button
                type="button"
                onClick={commitTitleRename}
                className="p-1 rounded hover:bg-muted text-green-600 shrink-0"
                title="Save"
              >
                <Check className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={cancelTitleRename}
                className="p-1 rounded hover:bg-muted text-muted-foreground shrink-0"
                title="Cancel"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={startEditingTitle}
              className="group flex items-center gap-1.5 min-w-0 rounded px-1 -mx-1 hover:bg-muted/60 transition-colors"
              title="Click to rename"
            >
              <span className="text-sm font-medium truncate">
                {prototype?.name || urlName || autoName || 'Untitled Prototype'}
              </span>
              <Pencil className="w-3 h-3 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity shrink-0" />
            </button>
          )}
          {library && !isEditingTitle && (
            <span className="text-xs text-muted-foreground shrink-0">· {library.name}</span>
          )}
        </div>
      </div>

      {/* Main layout: left panel (preview/code) + resize handle + right panel (chat) */}
      <div ref={containerRef} className="flex-1 flex min-h-0 overflow-hidden">

        {/* ── Left panel: Preview / Code ── */}
        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          {/* Left panel header with Preview / Code tabs */}
          <div className="h-10 border-b flex items-center gap-2 px-3 shrink-0 bg-muted/30">
            <div className="flex items-center gap-1 border rounded-md p-0.5 bg-background">
              <Button
                variant={activeTab === 'preview' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 px-2.5 text-xs gap-1"
                onClick={() => setActiveTab('preview')}
              >
                <Eye className="w-3 h-3" /> Preview
              </Button>
              <Button
                variant={activeTab === 'code' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-6 px-2.5 text-xs gap-1"
                onClick={() => setActiveTab('code')}
              >
                <Code2 className="w-3 h-3" /> Code
              </Button>
            </div>
            {/* Copy button — only on code tab */}
            {activeTab === 'code' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 ml-auto"
                onClick={handleCopy}
                title="Copy code"
              >
                {copied ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
              </Button>
            )}
            {/* Coding indicator shown in left panel header too */}
            {isStreaming && activeTab === 'code' && (
              <div className="flex items-center gap-1.5 text-xs text-primary font-medium ml-auto">
                <Loader2 className="w-3 h-3 animate-spin" />
                AI is writing code…
              </div>
            )}
          </div>

          {/* Sandpack area */}
          <div className="flex-1 relative overflow-hidden">
            <SandpackProvider
              key={sandpackKey}
              template="react"
              theme="light"
              files={{
                '/App.js': { code, active: true },
                ...(shadcnFiles as Record<string, any>),
              }}
              customSetup={{
                dependencies: sandpackDeps,
                entry: '/index.js',
              }}
              options={{
                externalResources: ['https://cdn.tailwindcss.com'],
              }}
            >
              {/* Error banner — must be inside SandpackProvider */}
              {activeTab === 'preview' && (
                <SandpackErrorBanner onSendError={handleSendError} />
              )}
              <SandpackLayout style={{ position: 'absolute', inset: 0, height: '100%', minHeight: 'unset', borderRadius: 0, border: 'none' }}>
                <div style={{ display: activeTab === 'preview' ? 'flex' : 'none', flex: 1, height: '100%', width: '100%', flexDirection: 'column' }}>
                  <SandpackPreview
                    showNavigator={false}
                    showOpenInCodeSandbox={false}
                    style={{ height: '100%', flex: 1, minHeight: 'unset' }}
                  />
                </div>
                <div style={{ display: activeTab === 'code' ? 'flex' : 'none', flex: 1, height: '100%', width: '100%', flexDirection: 'column' }}>
                  <SandpackCodeEditor
                    showTabs={false}
                    showLineNumbers
                    showInlineErrors
                    wrapContent={false}
                    style={{ height: '100%', flex: 1, minHeight: 'unset' }}
                  />
                </div>
              </SandpackLayout>
            </SandpackProvider>
          </div>
        </div>

        {/* ── Resize handle ── */}
        <div
          onMouseDown={handleResizeMouseDown}
          className="w-1.5 shrink-0 flex items-center justify-center bg-border/40 hover:bg-primary/20 cursor-col-resize transition-colors group z-10"
          title="Drag to resize"
        >
          <GripVertical className="w-3 h-3 text-muted-foreground/50 group-hover:text-primary/60 transition-colors" />
        </div>

        {/* ── Right panel: Chat ── */}
        <div
          className="shrink-0 flex flex-col min-h-0 bg-background border-l overflow-hidden"
          style={{ width: chatWidth }}
        >
          {/* Chat panel header */}
          <div className="h-10 border-b flex items-center px-3 shrink-0 bg-muted/30">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-primary" />
              <span className="text-xs font-medium text-muted-foreground">AI Chat</span>
            </div>
            {isStreaming && (
              <div className="ml-auto flex items-center gap-1.5 text-xs text-primary font-medium">
                <Loader2 className="w-3 h-3 animate-spin" />
                Generating…
              </div>
            )}
          </div>

          {/* Messages — using AI SDK Conversation + Message elements */}
          <Conversation className="flex-1 min-h-0">
            <ConversationContent className="gap-4 px-4 py-5">
              {messages.length === 0 && !isStreaming ? (
                <ConversationEmptyState
                  icon={<Bot className="w-8 h-8" />}
                  title="Describe your UI"
                  description="Use @ to reference PRDs, Features, or Tasks"
                />
              ) : (
                <>
                  {messages.map((m, i) => {
                    const isUser = m.role === 'user';
                    const displayText = isUser
                      ? m.content
                      : stripCodeBlocks(m.content) || '✅ Code generated — see Preview tab.';
                    const hasCode = !isUser && extractCode(m.content);

                    return (
                      <AIMessage key={i} from={m.role as 'user' | 'assistant'}>
                        <MessageContent>
                          <MessageResponse>{displayText}</MessageResponse>
                          {hasCode && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-primary/70 font-medium">
                              <Code2 className="w-3 h-3" />
                              <span>Code generated</span>
                            </div>
                          )}
                        </MessageContent>
                      </AIMessage>
                    );
                  })}

                  {/* Streaming indicator */}
                  {isStreaming && (
                    <AIMessage from="assistant">
                      <MessageContent>
                        {/* Thinking / coding status */}
                        <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-primary/5 border border-primary/15 text-primary text-xs font-medium w-fit">
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          <span>Thinking & writing code…</span>
                        </div>
                        {/* Show any non-code explanation text streamed so far */}
                        {stripCodeBlocks(streamingText) && (
                          <MessageResponse>
                            {stripCodeBlocks(streamingText)}
                          </MessageResponse>
                        )}
                      </MessageContent>
                    </AIMessage>
                  )}
                </>
              )}
            </ConversationContent>
            <ConversationScrollButton />
          </Conversation>

          {/* Input */}
          <div className="shrink-0 border-t">
            <PrototypeChatInput
              onSend={handleSend}
              isLoading={isStreaming}
              mentions={mentions}
              onRemoveMention={(id) => setMentions(prev => prev.filter(m => m.id !== id))}
              onAddMention={(item) => setMentions(prev => [...prev.filter(m => m.id !== item.id), item])}
              initialConfig={{
                libraryId: effectiveLibraryId || 'none',
                provider: urlProvider || activeProvider || 'openai',
                model: urlModel || '',
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Suspense wrapper (required for useSearchParams in Next.js App Router) ───
export default function PrototypeWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  return (
    <Suspense fallback={
      <div className="h-full flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    }>
      <PrototypeWorkspaceInner params={params} />
    </Suspense>
  );
}
