'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Upload, Download } from 'lucide-react';
import { toast } from 'sonner';

export default function WorkspaceGeneralSettingsPage() {
    const [workspaceData, setWorkspaceData] = useState({
        name: 'Business',
        icon: '',
    });

    const handleIconUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        // Validate file size (max 2MB)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be less than 2MB');
            return;
        }

        try {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64String = reader.result as string;
                setWorkspaceData({ ...workspaceData, icon: base64String });
                toast.success('Workspace icon updated');
            };
            reader.readAsDataURL(file);
        } catch (error) {
            toast.error('Failed to upload icon');
            console.error(error);
        }
    };

    const handleIconRemove = () => {
        setWorkspaceData({ ...workspaceData, icon: '' });
        toast.success('Workspace icon removed');
    };

    const handleStartExport = () => {
        toast.info('Export functionality coming soon');
    };

    const workspaceInitials = workspaceData.name
        .split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl font-medium mb-1">General Settings</h1>
            </div>

            {/* Workspace Preferences */}
            <div className="mb-8">
                <h2 className="text-xl font-medium mb-6">Workspace Preferences</h2>

                {/* Workspace Icon and Name */}
                <div className="flex items-start gap-6 mb-6">
                    <Avatar className="h-20 w-20 rounded-lg">
                        <AvatarImage src={workspaceData.icon} alt={workspaceData.name} />
                        <AvatarFallback className="text-lg rounded-lg bg-primary text-primary-foreground">
                            {workspaceInitials}
                        </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 space-y-2">
                        <div className="flex gap-2">
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => document.getElementById('icon-upload')?.click()}
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                Upload Image
                            </Button>
                            {workspaceData.icon && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleIconRemove}
                                >
                                    Remove Image
                                </Button>
                            )}
                            <input
                                id="icon-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleIconUpload}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            We support PNGs, JPEGs and GIFs under 2MB
                        </p>
                    </div>
                </div>

                {/* Workspace Name */}
                <div className="space-y-2">
                    <Label htmlFor="workspace-name">Workspace Name</Label>
                    <Input
                        id="workspace-name"
                        value={workspaceData.name}
                        onChange={(e) =>
                            setWorkspaceData({ ...workspaceData, name: e.target.value })
                        }
                        placeholder="Business"
                    />
                </div>
            </div>

            <Separator className="my-8" />

            {/* Export Workspace Data */}
            <div className="mb-8">
                <h2 className="text-xl font-medium mb-2">Export Workspace Data</h2>
                <p className="text-sm text-muted-foreground mb-6">
                    Exports are in CSV format and can be downloaded within 7 days.
                </p>

                {/* Export Table */}
                <div className="border rounded-lg">
                    {/* Table Header */}
                    <div className="grid grid-cols-[1fr_1fr_auto] gap-4 p-4 border-b bg-muted/30">
                        <div className="text-sm font-medium text-muted-foreground">TYPE</div>
                        <div className="text-sm font-medium text-muted-foreground">DATE</div>
                        <div className="w-[140px]"></div>
                    </div>

                    {/* Empty State */}
                    <div className="p-12 text-center">
                        <p className="text-sm text-muted-foreground">
                            You have not created any exports yet.
                        </p>
                    </div>
                </div>

                {/* Start Export Button */}
                <div className="flex justify-end mt-4">
                    <Button variant="outline" size="sm" onClick={handleStartExport}>
                        <Download className="h-4 w-4 mr-2" />
                        Start New Export
                    </Button>
                </div>
            </div>
        </div>
    );
}
