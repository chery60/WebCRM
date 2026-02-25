import { Suspense } from 'react';
import { Plus, LayoutDashboard, Search, Clock, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import Link from 'next/link';

// Mock data until DB is fully hooked up
const mockPrototypes = [
    {
        id: 'p1',
        name: 'Landing Page v2',
        libraryId: '1',
        libraryName: 'Acme UI Kit',
        prdId: 'n1',
        prdTitle: 'Marketing Site Refresh (PRD-132)',
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'p2',
        name: 'Dashboard Analytics View',
        libraryId: '1',
        libraryName: 'Acme UI Kit',
        prdId: null,
        prdTitle: null,
        updatedAt: new Date(Date.now() - 172800000).toISOString(),
    }
];

export default function PrototypesPage() {
    return (
        <div className="flex flex-col h-full bg-background mt-[100px]">
            {/* Header */}
            <header className="flex-shrink-0 border-b border-border bg-background/95 backdrop-blur z-10 px-8 py-5">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-semibold tracking-tight">Prototypes</h1>
                        <p className="text-sm text-muted-foreground mt-1">
                            AI-generated UI prototypes powered by your component libraries and PRDs.
                        </p>
                    </div>
                    <Link href="/prototypes/new">
                        <Button>
                            <Plus className="h-4 w-4 mr-2" />
                            New Prototype
                        </Button>
                    </Link>
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 overflow-y-auto p-8">
                <div className="max-w-6xl mx-auto space-y-6">
                    <div className="flex items-center space-x-2 w-full max-w-sm">
                        <Search className="w-4 h-4 text-muted-foreground" />
                        <Input placeholder="Search prototypes..." className="w-full" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-8">
                        {/* Create New Card */}
                        <Link href="/prototypes/new" className="block">
                            <div className="flex flex-col items-center justify-center h-48 p-6 border-2 border-dashed border-border rounded-xl bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer text-center group">
                                <div className="w-12 h-12 bg-background border border-border rounded-full flex items-center justify-center mb-3 group-hover:bg-primary group-hover:text-primary-foreground group-hover:border-primary transition-colors">
                                    <Plus className="w-6 h-6" />
                                </div>
                                <h3 className="font-medium">Generate new prototype</h3>
                                <p className="text-xs text-muted-foreground mt-1 max-w-[200px]">Build UIs from your React components using AI</p>
                            </div>
                        </Link>

                        {mockPrototypes.map((proto) => (
                            <Link key={proto.id} href={`/prototypes/${proto.id}`} className="block group">
                                <div className="flex flex-col h-48 p-6 bg-card border border-border rounded-xl shadow-sm hover:shadow-md transition-all hover:border-primary/50 relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:scale-110 transition-transform">
                                        <LayoutDashboard size={80} />
                                    </div>
                                    <div className="flex items-start justify-between">
                                        <div className="p-2 bg-primary/10 rounded-lg text-primary">
                                            <LayoutDashboard className="w-6 h-6" />
                                        </div>
                                    </div>
                                    <div className="mt-4 flex-1">
                                        <h3 className="font-semibold text-lg line-clamp-1">{proto.name}</h3>
                                        {proto.prdTitle && (
                                            <p className="text-sm text-muted-foreground mt-1 line-clamp-1">
                                                PRD: {proto.prdTitle}
                                            </p>
                                        )}
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Library: {proto.libraryName}
                                        </p>
                                    </div>
                                    <div className="mt-auto flex items-center justify-between text-xs text-muted-foreground">
                                        <span className="flex items-center">
                                            <Clock className="w-3 h-3 mr-1" />
                                            {new Date(proto.updatedAt).toLocaleDateString()}
                                        </span>
                                        <ExternalLink className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
