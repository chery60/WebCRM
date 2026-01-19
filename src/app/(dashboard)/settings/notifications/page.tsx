'use client';

import { useState } from 'react';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';

export default function NotificationsSettingsPage() {
    // In-app notification settings
    const [desktopPush, setDesktopPush] = useState(true);
    const [dailyDigest, setDailyDigest] = useState(true);

    // Email notification settings
    const [workspaceActivity, setWorkspaceActivity] = useState(true);
    const [alwaysSendEmail, setAlwaysSendEmail] = useState(false);
    const [emailDigest, setEmailDigest] = useState(true);

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl font-medium mb-1">Notification Settings</h1>
            </div>

            {/* In-app Notifications */}
            <div className="mb-8">
                <h2 className="text-xl font-medium mb-6">In-app Notifications</h2>

                {/* Desktop push notifications */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                        <h3 className="text-base font-medium mb-1">Desktop push notifications</h3>
                        <p className="text-sm text-muted-foreground">
                            Receive push notifications on mentions and comments immediately on your desktop app
                        </p>
                    </div>
                    <Switch
                        checked={desktopPush}
                        onCheckedChange={setDesktopPush}
                    />
                </div>

                {/* Daily digest */}
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="text-base font-medium mb-1">Daily digest</h3>
                        <p className="text-sm text-muted-foreground">
                            Includes Productivity stats and tasks due today. Sent every morning.
                        </p>
                    </div>
                    <Switch
                        checked={dailyDigest}
                        onCheckedChange={setDailyDigest}
                    />
                </div>
            </div>

            <Separator className="my-8" />

            {/* Email Notifications */}
            <div className="mb-8">
                <h2 className="text-xl font-medium mb-6">Email Notifications</h2>

                {/* Activity in your workspace */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                        <h3 className="text-base font-medium mb-1">Activity in your workspace</h3>
                        <p className="text-sm text-muted-foreground">
                            Receive emails when you get comments, mentions, page invites, reminders, access requests, and property changes
                        </p>
                    </div>
                    <Switch
                        checked={workspaceActivity}
                        onCheckedChange={setWorkspaceActivity}
                    />
                </div>

                {/* Always send email notifications */}
                <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                        <h3 className="text-base font-medium mb-1">Always send email notifications</h3>
                        <p className="text-sm text-muted-foreground">
                            Receive emails about activity in your workspace, even when you're active on the app
                        </p>
                    </div>
                    <Switch
                        checked={alwaysSendEmail}
                        onCheckedChange={setAlwaysSendEmail}
                    />
                </div>

                {/* Email digest */}
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="text-base font-medium mb-1">Email digest</h3>
                        <p className="text-sm text-muted-foreground">
                            Receive email digests every 8 hours for changes to pages you're subscribed to
                        </p>
                    </div>
                    <Switch
                        checked={emailDigest}
                        onCheckedChange={setEmailDigest}
                    />
                </div>
            </div>
        </div>
    );
}
