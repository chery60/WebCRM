'use client';

import { usePathname } from 'next/navigation';
import Link from 'next/link';
import { cn } from '@/lib/utils';
import { User, Bell, Globe, Building2, CreditCard, Grid2X2, ToggleLeft } from 'lucide-react';
import { Separator } from '@/components/ui/separator';

interface SettingsNavItem {
    title: string;
    href: string;
    icon: React.ElementType;
    section: 'app' | 'workspace';
}

const settingsNavItems: SettingsNavItem[] = [
    { title: 'Account', href: '/settings/account', icon: User, section: 'app' },
    { title: 'Apps', href: '/settings/apps', icon: Grid2X2, section: 'app' },
    { title: 'Features', href: '/settings/features', icon: ToggleLeft, section: 'app' },
    { title: 'Notifications', href: '/settings/notifications', icon: Bell, section: 'app' },
    { title: 'Language & Region', href: '/settings/language-region', icon: Globe, section: 'app' },
    { title: 'General', href: '/settings/workspace/general', icon: Building2, section: 'workspace' },
    { title: 'Billing', href: '/settings/workspace/billing', icon: CreditCard, section: 'workspace' },
];

export default function SettingsLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();

    const appSettingsItems = settingsNavItems.filter(item => item.section === 'app');
    const workspaceSettingsItems = settingsNavItems.filter(item => item.section === 'workspace');

    return (
        <div className="flex h-full">
            {/* Settings Sidebar */}
            <aside className="w-64 border-r bg-muted/10 flex flex-col">
                <div className="p-6">
                    <h1 className="text-2xl font-semibold">Settings</h1>
                </div>

                <div className="flex-1 overflow-y-auto px-3 pb-6">
                    {/* App Settings Section */}
                    <div className="mb-6">
                        <div className="px-3 mb-2">
                            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                App Settings
                            </h2>
                        </div>
                        <nav className="space-y-1">
                            {appSettingsItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                                            isActive
                                                ? 'bg-muted text-foreground font-medium'
                                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                        )}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        <span>{item.title}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>

                    <Separator className="my-4" />

                    {/* Workspace Settings Section */}
                    <div>
                        <div className="px-3 mb-2">
                            <h2 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                                Workspace Settings
                            </h2>
                        </div>
                        <nav className="space-y-1">
                            {workspaceSettingsItems.map((item) => {
                                const Icon = item.icon;
                                const isActive = pathname === item.href;

                                return (
                                    <Link
                                        key={item.href}
                                        href={item.href}
                                        className={cn(
                                            'flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors',
                                            isActive
                                                ? 'bg-muted text-foreground font-medium'
                                                : 'text-muted-foreground hover:bg-muted/50 hover:text-foreground'
                                        )}
                                    >
                                        <Icon className="h-4 w-4 shrink-0" />
                                        <span>{item.title}</span>
                                    </Link>
                                );
                            })}
                        </nav>
                    </div>
                </div>
            </aside>

            {/* Settings Content */}
            <main className="flex-1 overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
