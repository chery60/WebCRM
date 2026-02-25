"use client";

import { useState, use } from 'react';
import { notFound } from 'next/navigation';
import { ArrowLeft, Box } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { Sandpack } from "@codesandbox/sandpack-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const mockLibraries: Record<string, any> = {
  '1': {
    id: '1',
    name: 'Acme UI Kit',
    repoUrl: 'https://github.com/acme/ui-kit',
    components: [
      {
        id: 'c1',
        name: 'Button',
        category: 'Inputs',
        content: `export default function Button({ children, variant = 'primary' }) {
  const baseStyle = "px-4 py-2 rounded-md font-medium transition-colors";
  const variants = {
    primary: "bg-blue-600 text-white hover:bg-blue-700",
    secondary: "bg-gray-200 text-gray-900 hover:bg-gray-300"
  };
  return (
    <button className={\`\${baseStyle} \${variants[variant]}\`}>
      {children}
    </button>
  );
}`,
        exampleUsage: `import Button from './Button';

export default function App() {
  return (
    <div style={{ padding: 40, display: 'flex', gap: 16 }}>
      <Button variant="primary">Primary Button</Button>
      <Button variant="secondary">Secondary Button</Button>
    </div>
  );
}`
      },
      {
        id: 'c2',
        name: 'Card',
        category: 'Layout',
        content: `export default function Card({ title, children }) {
  return (
    <div className="border border-gray-200 rounded-lg p-6 shadow-sm bg-white max-w-sm">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <div className="text-gray-600">{children}</div>
    </div>
  );
}`,
        exampleUsage: `import Card from './Card';

export default function App() {
  return (
    <div style={{ padding: 40, backgroundColor: '#f9fafb', height: '100vh' }}>
      <Card title="Beautiful UI">
        This is a simple card component tailored for user interfaces.
      </Card>
    </div>
  );
}`
      }
    ]
  },
  '2': {
    id: '2',
    name: 'Marketing Site Blocks',
    repoUrl: 'https://github.com/acme/marketing-blocks',
    components: [
      {
        id: 'm1',
        name: 'Hero Section',
        category: 'Sections',
        content: `export default function HeroSection({ title, subtitle }) {
  return (
    <div className="text-center py-20 px-6">
      <h1 className="text-4xl font-extrabold tracking-tight text-gray-900 mb-4">{title}</h1>
      <p className="text-xl text-gray-600 mb-8">{subtitle}</p>
      <button className="bg-blue-600 text-white px-6 py-3 rounded-lg font-medium hover:bg-blue-700">Get Started</button>
    </div>
  );
}`,
        exampleUsage: `import HeroSection from './HeroSection';

export default function App() {
  return (
    <div style={{ backgroundColor: '#f9fafb', minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <HeroSection 
        title="Supercharge your startup"
        subtitle="The best way to build your application quickly and effectively."
      />
    </div>
  );
}`
      }
    ]
  }
};

export default function RepositoryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  // Mock fetch
  const library = mockLibraries[unwrappedParams.id] || null;

  if (!library) {
    return notFound();
  }

  const [activeComponentId, setActiveComponentId] = useState<string | null>(null);
  const activeComponent = library.components.find((c: any) => c.id === activeComponentId);

  const categories = Array.from(new Set(library.components.map((c: any) => c.category))) as string[];

  return (
    <div className="flex flex-col h-full bg-background mt-[100px] overflow-y-auto w-full">
      {/* Header */}
      <header className="flex-shrink-0 border-b border-border bg-background z-10 px-8 py-10 w-full">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center space-x-4 mb-4">
            <Link href="/repositories">
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <ArrowLeft className="h-4 w-4" />
              </Button>
            </Link>
            <div className="text-sm font-medium text-muted-foreground flex items-center space-x-2">
              <span>Repositories</span>
              <span>/</span>
              <span className="text-foreground">{library.name}</span>
            </div>
          </div>
          <div>
            <h1 className="text-4xl font-extrabold tracking-tight mb-4">{library.name} components</h1>
            <p className="text-lg text-muted-foreground max-w-3xl">
              Every {library.name} component available so far.
            </p>
          </div>
        </div>
      </header>

      {/* Main Layout - Grid View */}
      <main className="flex-1 w-full max-w-6xl mx-auto px-8 py-12">
        <div className="space-y-16">
          {categories.map(category => {
            const categoryComponents = library.components.filter((c: any) => c.category === category);
            return (
              <section key={category}>
                <h2 className="text-2xl font-bold tracking-tight mb-6">{category}</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
                  {categoryComponents.map((comp: any) => (
                    <div
                      key={comp.id}
                      onClick={() => setActiveComponentId(comp.id)}
                      className="group flex flex-col border border-border rounded-xl overflow-hidden cursor-pointer hover:shadow-md transition-all relative bg-card h-full"
                    >
                      {/* Preview Placeholder Area */}
                      <div className="flex-1 min-h-[160px] flex items-center justify-center border-b border-border/50 p-6">
                        <div className="text-foreground/70 group-hover:scale-[1.05] transition-transform duration-300 flex flex-col items-center justify-center">
                          <Box className="w-10 h-10 mb-2 opacity-80 text-primary" />
                        </div>
                      </div>

                      {/* Card Footer */}
                      <div className="p-4 flex items-center justify-between bg-card text-card-foreground">
                        <span className="font-semibold text-sm">{comp.name}</span>
                        <span className="text-[10px] font-medium border border-border text-muted-foreground px-2 py-0.5 rounded-full uppercase tracking-wider">
                          No guidelines
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            );
          })}
        </div>
      </main>

      {/* Component Detail Modal */}
      <Dialog open={!!activeComponent} onOpenChange={(open: boolean) => !open && setActiveComponentId(null)}>
        <DialogContent className="max-w-5xl h-[80vh] flex flex-col p-0 overflow-hidden bg-[#151515] border-border">
          <DialogHeader className="p-4 border-b border-border/10">
            <DialogTitle className="text-white text-lg font-semibold flex items-center">
              <Box className="w-5 h-5 mr-2 text-primary" />
              {activeComponent?.name} Component Preview
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-hidden">
            {activeComponent && (
              <Sandpack
                template="react"
                theme="dark"
                files={{
                  "/App.js": activeComponent.exampleUsage,
                  [`/${activeComponent.name}.js`]: activeComponent.content,
                }}
                options={{
                  showNavigator: true,
                  showTabs: true,
                  editorHeight: "100%",
                  editorWidthPercentage: 50,
                  externalResources: ["https://cdn.tailwindcss.com"],
                }}
                customSetup={{
                  dependencies: {
                    "lucide-react": "^0.263.1",
                  },
                }}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
