'use client';

import { MoreVertical, RefreshCw, Settings, Eye, EyeOff, Check, Loader2 } from 'lucide-react';
import { useSession, signIn } from 'next-auth/react';
import { Button } from '@/components/ui/button';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
    DropdownMenuSub,
    DropdownMenuSubTrigger,
    DropdownMenuSubContent,
} from '@/components/ui/dropdown-menu';
import { useCalendarStore, calendarProviders } from '@/lib/stores/calendar-store';
import { CalendarProvider } from '@/types';
import { cn } from '@/lib/utils';

// Provider icons as SVG components
const GoogleIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
        <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
        <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
        <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
        <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
    </svg>
);

const OutlookIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24">
        <path fill="#0078D4" d="M24 7.387v10.478c0 .23-.08.424-.238.576-.158.152-.354.228-.586.228h-8.547v-6.953l1.602 1.18a.432.432 0 00.264.09.46.46 0 00.27-.09.374.374 0 00.156-.313.39.39 0 00-.156-.32l-2.48-1.828a.43.43 0 00-.264-.09.43.43 0 00-.264.09L8.5 15.422V4.242a.81.81 0 01.238-.59.776.776 0 01.582-.244h13.856c.232 0 .428.076.586.228.159.152.238.346.238.576v3.175z"/>
        <path fill="#0078D4" d="M8.11 8.625l-2.86 1.856L1.582 8.15V6.742l3.668 2.39 2.86-1.867v1.36z"/>
        <path fill="#0078D4" d="M0 6.227v10.227c0 .158.057.293.172.402a.58.58 0 00.41.165h6.937V5.66H.582a.58.58 0 00-.41.165A.536.536 0 000 6.227z"/>
    </svg>
);

const AppleIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z"/>
    </svg>
);

const NotionIcon = () => (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
        <path d="M4.459 4.208c.746.606 1.026.56 2.428.466l13.215-.793c.28 0 .047-.28-.046-.326L17.86 1.968c-.42-.326-.98-.7-2.055-.607L3.01 2.295c-.466.046-.56.28-.374.466l1.823 1.447zm.793 3.08v13.904c0 .747.373 1.027 1.214.98l14.523-.84c.841-.046.935-.56.935-1.167V6.354c0-.606-.233-.933-.748-.886l-15.177.887c-.56.047-.747.327-.747.933zm14.337.745c.093.42 0 .84-.42.888l-.7.14v10.264c-.608.327-1.168.514-1.635.514-.748 0-.935-.234-1.495-.933l-4.577-7.186v6.952l1.448.327s0 .84-1.168.84l-3.22.186c-.094-.186 0-.653.327-.746l.84-.233V9.854L7.822 9.76c-.094-.42.14-1.026.793-1.073l3.454-.233 4.764 7.279v-6.44l-1.215-.14c-.093-.514.28-.886.747-.933l3.224-.186z"/>
    </svg>
);

export const providerIcons: Record<CalendarProvider, React.ComponentType> = {
    google: GoogleIcon,
    outlook: OutlookIcon,
    apple: AppleIcon,
    notion: NotionIcon,
};

interface CalendarMenuProps {
    onOpenSyncDialog: () => void;
    onSyncAll: () => void;
}

export function CalendarMenu({ onOpenSyncDialog, onSyncAll }: CalendarMenuProps) {
    const { data: session } = useSession();
    const { accounts, isSyncing, syncGoogleCalendar, toggleAccountVisibility, syncAccount } = useCalendarStore();

    const isGoogleConnected = !!session?.accessToken;

    const handleQuickConnectGoogle = async () => {
        await signIn('google', { callbackUrl: window.location.href });
    };

    const handleSyncGoogle = async () => {
        await syncGoogleCalendar();
    };

    const connectedAccounts = accounts.filter(a => a.isConnected);

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="outline" size="icon" className="h-8 w-8">
                    <MoreVertical className="h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>Calendar Options</DropdownMenuLabel>
                <DropdownMenuSeparator />

                {/* Google Calendar */}
                {isGoogleConnected ? (
                    <>
                        <DropdownMenuLabel className="text-xs text-muted-foreground font-normal">
                            Connected
                        </DropdownMenuLabel>
                        <DropdownMenuItem
                            onClick={handleSyncGoogle}
                            disabled={isSyncing}
                            className="flex items-center justify-between"
                        >
                            <div className="flex items-center">
                                <providerIcons.google />
                                <span className="ml-2">Google Calendar</span>
                            </div>
                            <RefreshCw className={cn("h-4 w-4", isSyncing && "animate-spin")} />
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                ) : (
                    <>
                        <DropdownMenuItem onClick={handleQuickConnectGoogle}>
                            <providerIcons.google />
                            <span className="ml-2">Connect Google Calendar</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                    </>
                )}

                {/* Sync All (if connected) */}
                {isGoogleConnected && (
                    <DropdownMenuItem onClick={handleSyncGoogle} disabled={isSyncing}>
                        <RefreshCw className={cn("mr-2 h-4 w-4", isSyncing && "animate-spin")} />
                        {isSyncing ? 'Syncing...' : 'Sync Now'}
                    </DropdownMenuItem>
                )}

                {/* Manage Calendars */}
                <DropdownMenuItem onClick={onOpenSyncDialog}>
                    <Settings className="mr-2 h-4 w-4" />
                    Manage Calendars
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
