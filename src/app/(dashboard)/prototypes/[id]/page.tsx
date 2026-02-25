"use client";

import { useState, use } from 'react';
import { notFound } from 'next/navigation';
import { ArrowLeft, Send, Sparkles, Image as ImageIcon, AtSign, Loader2, Bot, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import Link from 'next/link';
import { SandpackProvider, SandpackLayout, SandpackCodeEditor, SandpackPreview } from "@codesandbox/sandpack-react";
import { useChat } from '@ai-sdk/react';

// Mock data
const mockPrototype = {
  id: 'p1',
  name: 'Landing Page v2',
  libraryId: '1',
  libraryName: 'Acme UI Kit',
  prdTitle: 'Marketing Site Refresh (PRD-132)',
  codeContent: `import React from 'react';

export default function LadingPage() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-8">
      <div className="max-w-2xl text-center space-y-6">
        <h1 className="text-5xl font-extrabold tracking-tight text-slate-900">
          Supercharge your business
        </h1>
        <p className="text-xl text-slate-600">
          The ultimate platform to build, scale, and manage your online presence with AI.
        </p>
        <div className="flex items-center justify-center gap-4 pt-4">
          <button className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 rounded-lg font-medium transition-colors">
            Get Started Free
          </button>
          <button className="bg-white hover:bg-slate-50 text-slate-900 border border-slate-200 px-6 py-3 rounded-lg font-medium transition-colors">
            View Live Demo
          </button>
        </div>
      </div>
    </div>
  );
}
`
};

type Message = { id: string; role: 'user' | 'assistant'; content: string };

const initialMessages = [
  { id: '1', role: 'user', content: 'Generate a hero section using Acme UI Kit for the landing page following PRD-132.' },
  { id: '2', role: 'assistant', content: 'Here is a hero section built with your component library specifications. Let me know if you would like me to add a navigation bar or feature blocks.\n\n```jsx\nimport React from \'react\';\nexport default function App() { return <div>Hero</div> }\n```' }
] as any[];

export default function PrototypeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const prototype = unwrappedParams.id === 'p1' ? mockPrototype : null;
  const isNew = unwrappedParams.id === 'new';

  const [code, setCode] = useState(isNew ? `export default function App() {\n  return <div>New Prototype Area</div>;\n}` : prototype?.codeContent || '');
  const [input, setInput] = useState('');

  const { messages, sendMessage, status } = useChat({
    api: '/api/prototypes/chat',
    initialMessages: initialMessages,
    body: {
      libraryContext: 'Mock library docs...',
      prdContext: 'Mock PRD details...'
    },
    onFinish: (message: any) => {
      if (message.content) {
        const codeMatch = message.content.match(/```(jsx|tsx|javascript|typescript|js|ts)\n([\s\S]*?)```/);
        if (codeMatch && codeMatch[2]) {
          setCode(codeMatch[2]);
        }
      }
    }
  } as any);

  const isLoading = status === 'submitted' || status === 'streaming';

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage({ role: 'user', content: input } as any);
    setInput('');
  }

  if (!prototype && !isNew) {
    return notFound();
  }

  return (
    <div className="flex flex-col h-full bg-background mt-[100px]">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur z-10 px-6 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Link href="/prototypes">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div>
              <h1 className="text-lg font-semibold tracking-tight">
                {isNew ? 'New Prototype' : prototype?.name}
              </h1>
              <div className="flex items-center text-xs text-muted-foreground space-x-2">
                {!isNew && prototype?.libraryName && <span>Library: {prototype.libraryName}</span>}
                {!isNew && prototype?.prdTitle && <span>• PRD: {prototype.prdTitle}</span>}
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm">Export Code</Button>
            <Button size="sm">Publish to Web</Button>
          </div>
        </div>
      </header>

      {/* Main Layout */}
      <div className="flex flex-1 overflow-hidden">

        {/* Chat Sidebar (Adorable Style UI) */}
        <aside className="w-[350px] border-r border-border bg-muted/10 flex flex-col">
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center space-y-3 p-4">
                <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center">
                  <Sparkles className="w-6 h-6 text-primary" />
                </div>
                <h3 className="font-medium text-lg">What do you want to build?</h3>
                <p className="text-sm text-muted-foreground">
                  Use <span className="text-foreground font-mono bg-muted px-1 py-0.5 rounded">@</span> to mention documents, component libraries, or projects.
                </p>
              </div>
            ) : (
              messages.map((rawMsg: any) => {
                const msg = rawMsg as Message;

                return (
                  <div key={msg.id} className={`flex gap-3 ${msg.role === 'assistant' ? '' : 'flex-row-reverse'}`}>
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'assistant' ? 'bg-primary/20 text-primary' : 'bg-muted text-foreground'
                      }`}>
                      {msg.role === 'assistant' ? <Bot size={16} /> : <User size={16} />}
                    </div>
                    <div className={`px-4 py-2 rounded-2xl max-w-[85%] text-sm ${msg.role === 'assistant'
                      ? 'bg-muted/50 text-foreground rounded-tl-sm'
                      : 'bg-primary text-primary-foreground rounded-tr-sm'
                      }`}>
                      {msg.content}
                    </div>
                  </div>
                )
              })
            )}

            {isLoading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-full bg-primary/20 text-primary flex items-center justify-center shrink-0">
                  <Bot size={16} />
                </div>
                <div className="px-4 py-3 rounded-2xl bg-muted/50 rounded-tl-sm flex items-center space-x-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '0ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '150ms' }} />
                  <span className="w-1.5 h-1.5 rounded-full bg-primary/50 animate-bounce" style={{ animationDelay: '300ms' }} />
                </div>
              </div>
            )}
          </div>

          <div className="p-4 bg-background border-t border-border">
            <div className="relative border border-input bg-transparent rounded-xl focus-within:ring-1 focus-within:ring-ring focus-within:border-primary overflow-hidden shadow-sm">
              <Textarea
                placeholder="Message Prototype AI..."
                className="min-h-[80px] max-h-[200px] border-0 focus-visible:ring-0 resize-none pb-10"
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    handleSend();
                  }
                }}
              />
              <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between">
                <div className="flex items-center space-x-1">
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <ImageIcon className="h-4 w-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-muted-foreground hover:text-foreground">
                    <AtSign className="h-4 w-4" />
                  </Button>
                </div>
                <Button
                  onClick={handleSend}
                  size="icon"
                  className="h-8 w-8 rounded-full"
                  disabled={!input.trim() || isLoading}
                >
                  {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
              </div>
            </div>
          </div>
        </aside>

        {/* Sandpack Code & Live Preview */}
        <main className="flex-1 bg-[#151515] h-full flex flex-col">
          <SandpackProvider
            template="react"
            theme="dark"
            files={{
              "/App.js": code
            }}
            customSetup={{
              dependencies: {
                "lucide-react": "^0.263.1",
              },
            }}
            options={{
              externalResources: ["https://cdn.tailwindcss.com"],
            }}
          >
            <div className="flex h-full border-t-[0.5px] border-gray-800">
              <SandpackLayout className="flex-1 rounded-none border-none !h-full shadow-none w-full">
                <div className="hidden lg:block w-1/3 border-r border-[#2a2a2a] h-full">
                  <SandpackCodeEditor showTabs={true} showLineNumbers={true} style={{ height: "100%" }} />
                </div>
                <div className="w-full lg:w-2/3 h-full">
                  <SandpackPreview showNavigator={true} style={{ height: "100%" }} />
                </div>
              </SandpackLayout>
            </div>
          </SandpackProvider>
        </main>
      </div>
    </div>
  );
}
