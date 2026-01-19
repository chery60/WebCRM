'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';

export default function AppsSettingsPage() {
    const [startupPage, setStartupPage] = useState('last-visited');
    const [autoTimezone, setAutoTimezone] = useState(true);
    const [showViewHistory, setShowViewHistory] = useState(true);

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl font-medium mb-1">Apps Settings</h1>
            </div>

            {/* Startup Settings */}
            <div className="mb-8">
                <h2 className="text-base font-medium mb-2">Startup Settings</h2>
                <div className="flex items-center justify-between mb-6">
                    <p className="text-sm text-muted-foreground">
                        Choose what to show when Apps starts or when you switch workspaces.
                    </p>
                    <Select value={startupPage} onValueChange={setStartupPage}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="last-visited">Last Visited Page</SelectItem>
                            <SelectItem value="dashboard">Dashboard</SelectItem>
                            <SelectItem value="tasks">Tasks</SelectItem>
                            <SelectItem value="notes">Notes</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <Separator className="my-8" />

            {/* Date and Time */}
            <div className="mb-8">
                <h2 className="text-xl font-medium mb-6">Date and Time</h2>

                {/* Auto Timezone */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                        <h3 className="text-base font-medium mb-1">Set timezone automatically using your location</h3>
                        <p className="text-sm text-muted-foreground">
                            Reminders, notifications and emails are delivered based on your time zone.
                        </p>
                    </div>
                    <Switch
                        checked={autoTimezone}
                        onCheckedChange={setAutoTimezone}
                    />
                </div>

                {/* Time Zone Display */}
                <div>
                    <Label className="text-sm font-normal mb-2 block">Time Zone</Label>
                    <p className="text-sm text-muted-foreground">
                        Current time zone setting.
                    </p>
                    <p className="text-sm text-muted-foreground mt-1">
                        (GMT-07:00) US/Arizona (MST)
                    </p>
                </div>
            </div>

            <Separator className="my-8" />

            {/* Privacy */}
            <div className="mb-8">
                <h2 className="text-xl font-medium mb-6">Privacy</h2>

                {/* Cookie Settings */}
                <div className="mb-6">
                    <h3 className="text-base font-medium mb-1">Cookie Settings</h3>
                    <div className="flex items-center justify-between">
                        <p className="text-sm text-muted-foreground">
                            Customize cookies. See Cookies Notice for details.
                        </p>
                        <Select>
                            <SelectTrigger className="w-[140px]">
                                <SelectValue placeholder="Customize" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Accept All</SelectItem>
                                <SelectItem value="necessary">Necessary Only</SelectItem>
                                <SelectItem value="custom">Customize</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <Separator className="my-6" />

                {/* Show View History */}
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="text-base font-medium mb-1">Show my view history</h3>
                        <p className="text-sm text-muted-foreground">
                            People with edit or full access will be able to see when you've viewed a page.
                        </p>
                    </div>
                    <Switch
                        checked={showViewHistory}
                        onCheckedChange={setShowViewHistory}
                    />
                </div>
            </div>
        </div>
    );
}
