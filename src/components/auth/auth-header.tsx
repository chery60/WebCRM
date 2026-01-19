'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';

export function AuthHeader() {
    return (
        <header className="absolute top-0 left-0 right-0 z-10 flex items-center justify-between px-8 py-6">
            <Link href="/" className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-black">
                    <span className="text-lg font-bold text-white">V</span>
                </div>
                <span className="text-lg font-semibold">Venture</span>
            </Link>

            <nav className="hidden md:flex items-center gap-8">
                <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    About
                </Link>
                <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Features
                </Link>
                <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Pricing
                </Link>
                <Link href="#" className="text-sm text-muted-foreground hover:text-foreground transition-colors">
                    Blog
                </Link>
            </nav>

            <div className="flex items-center gap-3">
                <Link href="/signin" className="text-sm font-medium underline hover:no-underline">
                    Log in
                </Link>
                <Button asChild size="sm" className="bg-black text-white hover:bg-black/90">
                    <Link href="/signup">Get Started</Link>
                </Button>
            </div>
        </header>
    );
}
