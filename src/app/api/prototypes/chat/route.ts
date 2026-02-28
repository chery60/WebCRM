import { streamText } from 'ai';
import { createOpenAI } from '@ai-sdk/openai';
import { createAnthropic } from '@ai-sdk/anthropic';
import { createGoogleGenerativeAI } from '@ai-sdk/google';

export const maxDuration = 60;

function getAIModel(provider: string, apiKey: string, model: string) {
  switch (provider) {
    case 'anthropic': {
      const anthropic = createAnthropic({ apiKey });
      return anthropic(model || 'claude-3-5-sonnet-20241022');
    }
    case 'gemini': {
      const google = createGoogleGenerativeAI({ apiKey });
      return google(model || 'gemini-2.5-flash');
    }
    case 'openai':
    default: {
      const openai = createOpenAI({ apiKey });
      return openai(model || 'gpt-4o');
    }
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      messages = [],
      provider = 'openai',
      apiKey,
      model = 'gpt-4o',
      libraryContext = '',
      mentionContext = '',
      currentCode = '',
    } = body;

    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'API key is required. Please configure your AI provider in Settings → Features.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    if (!messages || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: 'No message provided.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    // Determine whether a custom component library is selected
    const isCustomLibrary = libraryContext && !libraryContext.startsWith('No component library');

    // Extract the actual package name from the library context
    let libraryPackageName = '';
    if (isCustomLibrary) {
      const pkgMatch = libraryContext.match(/Package \/ Import Source:\s*([^\s\n]+)/);
      if (pkgMatch) {
        libraryPackageName = pkgMatch[1];
      }
    }

    console.log('[Prototypes Chat] libraryContext:', libraryContext);
    console.log('[Prototypes Chat] isCustomLibrary:', isCustomLibrary);
    console.log('[Prototypes Chat] libraryPackageName:', libraryPackageName);

    // ── Build the import rules section based on whether a custom library is selected ──
    const importRules = isCustomLibrary
      ? `4. COMPONENT LIBRARY IN USE — You MUST use the components from the selected library (see COMPONENT LIBRARY section below).
   • Import components using the package name: ${libraryPackageName ? `import { ComponentName } from '${libraryPackageName}'` : 'Use the package import paths specified in the COMPONENT LIBRARY section'}
   • ABSOLUTELY DO NOT import from '@/components/ui/*' or use any shadcn/ui components. This is critical.
   • You may ALSO import from:
       - lucide-react  (icons only)
       - react         (hooks: useState, useEffect, useRef, useCallback, useMemo)${libraryPackageName.includes('@mui') ? `\n       - @mui/icons-material  (MUI icons)` : ''}
   • For any UI element the library does NOT provide, fall back to plain Tailwind CSS HTML elements (NOT shadcn).`
      : `4. ONLY import from these allowed sources:
   • @/components/ui/*   (shadcn/ui — copy import paths EXACTLY from the list below)
   • lucide-react        (icons only)
   • react               (hooks: useState, useEffect, useRef, useCallback, useMemo)
   NO OTHER IMPORTS. No axios, no date-fns, no recharts, no framer-motion, no external URLs.`;

    // ── Build the component reference section ──
    const componentReferenceSection = isCustomLibrary
      ? `════════════════════════════════════════
  COMPONENT LIBRARY (USE THIS — NOT SHADCN)
════════════════════════════════════════
${libraryContext}

CRITICAL REMINDERS:
• Use ONLY this library for UI components. Do NOT use shadcn/ui, @/components/ui/*, or @radix-ui/* imports.
• Import from '${libraryPackageName || 'the package listed above'}' directly.
• For elements not in this library, use plain HTML with Tailwind classes.`
      : `════════════════════════════════════════
  AVAILABLE SHADCN/UI COMPONENTS
════════════════════════════════════════
Copy import paths EXACTLY. Do not deviate by one character.

\`\`\`js
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Separator } from "@/components/ui/separator"
import { Switch } from "@/components/ui/switch"
import { Checkbox } from "@/components/ui/checkbox"
import { Progress } from "@/components/ui/progress"
import { Skeleton } from "@/components/ui/skeleton"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command"
\`\`\``;

    // ── Build the mention/context section ──
    const mentionSection = mentionContext
      ? `════════════════════════════════════════
  REFERENCE CONTEXT (from user mentions)
════════════════════════════════════════
Use the following context to inform the UI you build. Extract relevant data, flows, and requirements from it.

${mentionContext}`
      : '';

    // ── Build the current code section ──
    const currentCodeSection = currentCode && currentCode.trim() && !currentCode.includes('Ready to Build')
      ? `════════════════════════════════════════
  CURRENT CODE (modify/extend this)
════════════════════════════════════════
\`\`\`jsx
${currentCode}
\`\`\``
      : '';

    // ── Build the Good Example section ──
    const goodExampleSection = !isCustomLibrary
      ? `════════════════════════════════════════
  GOOD EXAMPLE (shadcn/ui, no custom library)
════════════════════════════════════════
A settings page with profile, notifications, and security tabs.

\`\`\`jsx
import { useState } from "react"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Separator } from "@/components/ui/separator"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"

export default function App() {
  const [name, setName] = useState("Sarah Johnson")
  const [email, setEmail] = useState("sarah@example.com")
  const [emailNotifs, setEmailNotifs] = useState(true)
  const [pushNotifs, setPushNotifs] = useState(false)

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-2xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-muted-foreground text-sm">Manage your account preferences</p>
        </div>
        <Tabs defaultValue="profile">
          <TabsList className="mb-4">
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="security">Security</TabsTrigger>
          </TabsList>
          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile</CardTitle>
                <CardDescription>Update your personal information</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src="https://i.pravatar.cc/64?u=sarah" />
                    <AvatarFallback>SJ</AvatarFallback>
                  </Avatar>
                  <Button variant="outline" size="sm">Change photo</Button>
                </div>
                <Separator />
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Full name</Label>
                    <Input value={name} onChange={e => setName(e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input value={email} onChange={e => setEmail(e.target.value)} />
                  </div>
                </div>
                <Button>Save changes</Button>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notifications</CardTitle>
                <CardDescription>Choose how you receive notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Email notifications</p>
                    <p className="text-sm text-muted-foreground">Receive updates via email</p>
                  </div>
                  <Switch checked={emailNotifs} onCheckedChange={setEmailNotifs} />
                </div>
                <Separator />
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">Push notifications</p>
                    <p className="text-sm text-muted-foreground">Receive browser push alerts</p>
                  </div>
                  <Switch checked={pushNotifs} onCheckedChange={setPushNotifs} />
                </div>
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="security">
            <Card>
              <CardHeader>
                <CardTitle>Security</CardTitle>
                <CardDescription>Manage your account security</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Current password</Label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                <div className="space-y-2">
                  <Label>New password</Label>
                  <Input type="password" placeholder="••••••••" />
                </div>
                <Button>Update password</Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
\`\`\`` : '';

    // ── Build the Good Example section for custom libraries ──
    const customLibExampleSection = isCustomLibrary && libraryPackageName
      ? (() => {
        if (libraryPackageName.includes('@mui')) {
          return `════════════════════════════════════════
  GOOD EXAMPLE (Material UI)
════════════════════════════════════════
A settings page using MUI components.

\`\`\`jsx
import { useState } from "react"
import { Button, TextField, Card, CardContent, CardHeader, Typography, Switch, FormControlLabel, Divider, Avatar, Box, Tab, Tabs } from "${libraryPackageName}"

export default function App() {
  const [tab, setTab] = useState(0)
  const [name, setName] = useState("Sarah Johnson")
  const [email, setEmail] = useState("sarah@example.com")
  const [emailNotifs, setEmailNotifs] = useState(true)

  return (
    <Box sx={{ minHeight: "100vh", bgcolor: "#f5f5f5", p: 4 }}>
      <Box sx={{ maxWidth: 600, mx: "auto" }}>
        <Typography variant="h4" fontWeight="bold" gutterBottom>Settings</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>Manage your account preferences</Typography>
        <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 3 }}>
          <Tab label="Profile" />
          <Tab label="Notifications" />
        </Tabs>
        {tab === 0 && (
          <Card>
            <CardHeader title="Profile" subheader="Update your personal information" />
            <CardContent>
              <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                <Avatar sx={{ width: 64, height: 64 }}>SJ</Avatar>
                <Button variant="outlined" size="small">Change photo</Button>
              </Box>
              <Divider sx={{ mb: 3 }} />
              <Box sx={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2, mb: 2 }}>
                <TextField label="Full name" value={name} onChange={e => setName(e.target.value)} fullWidth />
                <TextField label="Email" value={email} onChange={e => setEmail(e.target.value)} fullWidth />
              </Box>
              <Button variant="contained">Save changes</Button>
            </CardContent>
          </Card>
        )}
        {tab === 1 && (
          <Card>
            <CardHeader title="Notifications" subheader="Choose how you receive notifications" />
            <CardContent>
              <FormControlLabel control={<Switch checked={emailNotifs} onChange={(_, v) => setEmailNotifs(v)} />} label="Email notifications" />
            </CardContent>
          </Card>
        )}
      </Box>
    </Box>
  )
}
\`\`\``;
        }
        // Generic custom library example
        return `════════════════════════════════════════
  GOOD EXAMPLE (Custom Library: ${libraryPackageName})
════════════════════════════════════════
When using '${libraryPackageName}', import components directly:

\`\`\`jsx
import { useState } from "react"
import { /* use actual component names from the COMPONENT LIBRARY section above */ } from "${libraryPackageName}"

export default function App() {
  // Build a complete, interactive UI using ONLY components from ${libraryPackageName}
  // plus plain HTML with Tailwind CSS for anything the library doesn't provide
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      {/* Your implementation here */}
    </div>
  )
}
\`\`\``;
      })()
      : '';

    const systemPrompt = `You are an expert React UI engineer. Your ONLY job is to produce a single, complete, immediately-runnable React component for a Sandpack sandbox.

════════════════════════════════════════
  ABSOLUTE RULES — NEVER VIOLATE THESE
════════════════════════════════════════
1. OUTPUT EXACTLY ONE fenced code block tagged \`\`\`jsx ... \`\`\`.
2. The component MUST be: export default function App() { ... }
3. useState / useEffect / useRef / useCallback / useMemo — import only what you use from 'react'.
${importRules}
5. Use Tailwind CSS utility classes for layout, spacing, sizing, and colour.
   You MAY use inline style only for values impossible to express in Tailwind (e.g. exact pixel heights for scroll containers).
6. ${isCustomLibrary ? 'Use components from the selected library (see COMPONENT LIBRARY section). For elements the library does not cover, use semantic HTML with Tailwind.' : 'NEVER use raw HTML elements where a shadcn/ui component exists:\n   ❌ <button>  →  ✅ <Button>\n   ❌ <input>   →  ✅ <Input>\n   ❌ <select>  →  ✅ <Select> / <SelectTrigger> / <SelectContent> / <SelectItem>\n   ❌ <textarea>→  ✅ <Textarea>\n   ❌ <a href>  →  ✅ <Button variant="link">'}
7. ALL data must be hardcoded realistic placeholder values — no fetch(), no API calls, no Math.random().
8. The component must be fully interactive with useState where interactions exist (tabs, toggles, dialogs, dropdowns, etc.).
9. Do NOT add explanatory comments inside the JSX. Code must be clean.
10. Response format — EXACTLY this structure:
    One sentence describing what you built.
    [blank line]
    \`\`\`jsx
    ...complete code...
    \`\`\`
    Nothing else after the closing code fence.

${componentReferenceSection}
${mentionSection}
${currentCodeSection}
${goodExampleSection}
${customLibExampleSection}`;

    // Build messages array for the AI — keep last 16 messages (8 turns) for context
    const aiMessages: { role: 'user' | 'assistant'; content: string }[] = messages
      .slice(-16)
      .map((m: any) => ({
        role: m.role as 'user' | 'assistant',
        content: m.content as string,
      }));

    const aiModel = getAIModel(provider, apiKey, model);

    const result = streamText({
      model: aiModel,
      system: systemPrompt,
      messages: aiMessages,
    });

    return result.toTextStreamResponse();
  } catch (error: any) {
    console.error('[Prototypes Chat] Error:', error);
    return new Response(
      JSON.stringify({ error: error?.message || 'Failed to generate prototype' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
