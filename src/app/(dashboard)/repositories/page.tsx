import { Suspense } from 'react';
import { Plus, Github, Box, Search, FolderOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

// Mock data until DB is fully hooked up
const mockLibraries = [
    {
        id: '1',
        name: 'Acme UI Kit',
        description: 'Standard collection of internal tools UI components.',
        repoUrl: 'https://github.com/acme/ui-kit',
        updatedAt: new Date().toISOString(),
        componentCount: 24,
    },
    {
        id: '2',
        name: 'Marketing Site Blocks',
        description: 'Hero sections, features, testimonials used on marketing pages.',
        repoUrl: 'https://github.com/acme/marketing-blocks',
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
        componentCount: 15,
    }
];

export default function RepositoriesPage() {
    return (
        <div className="flex flex-col h-full bg-background mt-[100px]">
            {/* Header */}
            <header className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 z-10 px-8 py-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Component Repositories</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            Import and manage React component libraries for AI prototyping.
                        </p>
                    </div>
                    <Button>
                        <Plus className="h-4 w-4 mr-2" />
                        Import Repository
                    </Button>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex items-center space-x-2 w-full max-w-sm">
                        <Search className="w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Search repositories..." className="w-full" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                        {mockLibraries.map((lib) => (
                            <Link key={lib.id} href={`/repositories/${lib.id}`} className="block group">
                                <div className="flex flex-col h-48 p-6 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all hover:border-primary/50 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                        <FolderOpen size={80} />
                                    </div>
                                    <div className="flex items-start justify-between">
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                            <Box className="w-6 h-6" />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex-1">
                                        <h3 className="font-semibold text-lg line-clamp-1">{lib.name}</h3>
                                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                                            {lib.description}
                                        </p>
                                    </div>
                                    <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                                        <span className="flex items-center">
                                            <Github className="w-3 h-3 mr-1" />
                                            {lib.repoUrl ? new URL(lib.repoUrl).pathname.slice(1) : 'Local Upload'}
                                        </span>
                                        <span>{lib.componentCount} components</span>
                                    </div>
                                </div>
                            </Link>
                        ))}

                        {/* Empty State / Add New Card */}
                        <div className="flex flex-col items-center justify-center h-48 p-6 border-2 border-dashed border-border rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer text-center group">
                            <div className="w-12 h-12 bg-background border border-border rounded-full flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                                <Plus className="w-6 h-6" />
                            </div>
                            <h3 className="font-medium">Import new library</h3>
                            <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Connect a GitHub repo or upload standard components</p>
                        </div>
                    </div>
                </div>
            </main>
        </div>
    );
}
