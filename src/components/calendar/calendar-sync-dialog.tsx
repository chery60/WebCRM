'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import { RefreshCw, Trash2, Check, Loader2, ExternalLink } from 'lucide-react';
import { signIn, signOut, useSession } from 'next-auth/react';
import { useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { useCalendarStore, calendarProviders } from '@/lib/stores/calendar-store';
import { providerIcons } from './calendar-menu';
import { CalendarProvider, EventColor } from '@/types';
import { cn } from '@/lib/utils';

interface CalendarSyncDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
}

const colorOptions: { value: EventColor; label: string; className: string }[] = [
    { value: 'blue', label: 'Blue', className: 'bg-blue-500' },
    { value: 'green', label: 'Green', className: 'bg-green-500' },
    { value: 'yellow', label: 'Yellow', className: 'bg-yellow-500' },
    { value: 'pink', label: 'Pink', className: 'bg-pink-500' },
    { value: 'purple', label: 'Purple', className: 'bg-purple-500' },
];

export function CalendarSyncDialog({ open, onOpenChange }: CalendarSyncDialogProps) {
    const { data: session, status } = useSession();
    const queryClient = useQueryClient();
    const {
        accounts,
        isLoading,
        isSyncing,
        lastSyncedAt,
        googleConnected,
        connectAccount,
        disconnectAccount,
        toggleAccountVisibility,
        updateAccountColor,
        syncAccount,
        syncGoogleCalendar,
        checkGoogleConnection,
        setGoogleConnected,
    } = useCalendarStore();

    const [connectingProvider, setConnectingProvider] = useState<CalendarProvider | null>(null);

    // Check Google connection status when dialog opens
    useEffect(() => {
        if (open && session?.accessToken) {
            setGoogleConnected(true);
        } else if (open) {
            setGoogleConnected(false);
        }
    }, [open, session, setGoogleConnected]);

    const handleConnectGoogle = async () => {
        setConnectingProvider('google');
        // Redirect to Google OAuth
        await signIn('google', { callbackUrl: window.location.href });
    };

    const handleDisconnectGoogle = async () => {
        await signOut({ redirect: false });
        setGoogleConnected(false);
    };

    const handleSyncGoogle = async () => {
        const events = await syncGoogleCalendar();
        if (events.length > 0) {
            // Invalidate React Query cache to refresh the calendar UI
            queryClient.invalidateQueries({ queryKey: ['events'] });
        }
    };

    const handleConnect = async (provider: CalendarProvider) => {
        if (provider === 'google') {
            await handleConnectGoogle();
            return;
        }
        
        setConnectingProvider(provider);
        // For other providers, show coming soon message
        setTimeout(() => {
            setConnectingProvider(null);
        }, 1000);
    };

    const isGoogleConnected = !!session?.accessToken;
    const allProviders: CalendarProvider[] = ['google', 'outlook', 'apple', 'notion'];

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>Manage Calendars</DialogTitle>
                    <DialogDescription>
                        Connect your calendars to sync events across all platforms
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Available Calendar Services */}
                    <div>
                        <h3 className="text-sm font-medium mb-3">Calendar Services</h3>
                        <div className="space-y-2">
                            {/* Google Calendar - Real Integration */}
                            <div className="flex items-center justify-between p-3 border rounded-lg">
                                <div className="flex items-center gap-3">
                                    <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                                        {providerIcons.google && <providerIcons.google />}
                                    </div>
                                    <div>
                                        <div className="font-medium">Google Calendar</div>
                                        {isGoogleConnected && session?.user?.email && (
                                            <div className="text-xs text-muted-foreground">
                                                {session.user.email}
                                            </div>
                                        )}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                    {isGoogleConnected ? (
                                        <>
                                            <Badge variant="secondary" className="gap-1">
                                                <Check className="h-3 w-3" />
                                                Connected
                                            </Badge>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleDisconnectGoogle}
                                            >
                                                <Trash2 className="h-4 w-4 text-destructive" />
                                            </Button>
                                        </>
                                    ) : (
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            onClick={handleConnectGoogle}
                                            disabled={connectingProvider === 'google'}
                                        >
                                            {connectingProvider === 'google' ? (
                                                <>
                                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                    Connecting...
                                                </>
                                            ) : (
                                                'Connect'
                                            )}
                                        </Button>
                                    )}
                                </div>
                            </div>

                            {/* Other Providers - Coming Soon */}
                            {(['outlook', 'apple', 'notion'] as CalendarProvider[]).map((provider) => {
                                const Icon = providerIcons[provider];
                                const info = calendarProviders[provider];

                                return (
                                    <div
                                        key={provider}
                                        className="flex items-center justify-between p-3 border rounded-lg opacity-60"
                                    >
                                        <div className="flex items-center gap-3">
                                            <div className="flex items-center justify-center w-10 h-10 rounded-lg bg-muted">
                                                <Icon />
                                            </div>
                                            <div>
                                                <div className="font-medium">{info.name}</div>
                                                <div className="text-xs text-muted-foreground">
                                                    Coming soon
                                                </div>
                                            </div>
                                        </div>
                                        <Button
                                            variant="outline"
                                            size="sm"
                                            disabled
                                        >
                                            Connect
                                        </Button>
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Google Calendar Settings */}
                    {isGoogleConnected && (
                        <>
                            <Separator />
                            <div>
                                <h3 className="text-sm font-medium mb-3">Google Calendar Settings</h3>
                                <div className="space-y-4">
                                    <div className="space-y-3 p-3 border rounded-lg">
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-2">
                                                {providerIcons.google && <providerIcons.google />}
                                                <span className="font-medium">Google Calendar</span>
                                            </div>
                                            <Button
                                                variant="ghost"
                                                size="sm"
                                                onClick={handleSyncGoogle}
                                                disabled={isSyncing}
                                            >
                                                <RefreshCw className={cn("h-4 w-4 mr-1", isSyncing && "animate-spin")} />
                                                {isSyncing ? 'Syncing...' : 'Sync Now'}
                                            </Button>
                                        </div>

                                        {lastSyncedAt && (
                                            <div className="text-xs text-muted-foreground">
                                                Last synced: {format(new Date(lastSyncedAt), 'MMM d, yyyy h:mm a')}
                                            </div>
                                        )}

                                        <div className="pt-2 border-t">
                                            <p className="text-xs text-muted-foreground">
                                                Events from your Google Calendar will appear with a 🔵 indicator.
                                                Changes made here will sync back to Google.
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
