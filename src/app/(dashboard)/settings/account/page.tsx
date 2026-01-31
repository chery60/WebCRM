'use client';

import { useState } from 'react';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Switch } from '@/components/ui/switch';
import { Upload, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function AccountSettingsPage() {
    const { currentUser, updateProfile, logout } = useAuthStore();
    const [isLoading, setIsLoading] = useState(false);

    // Profile form state - split into first and last name
    // Handle edge case where name might be "undefined undefined" or malformed
    const sanitizeName = (name: string | undefined) => {
        if (!name || name === 'undefined' || name === 'undefined undefined') {
            return '';
        }
        return name;
    };
    const sanitizedName = sanitizeName(currentUser?.name);
    const nameParts = sanitizedName ? sanitizedName.split(' ') : ['', ''];
    const [profileData, setProfileData] = useState({
        firstName: nameParts[0] !== 'undefined' ? nameParts[0] : '',
        lastName: nameParts.slice(1).join(' ') !== 'undefined' ? nameParts.slice(1).join(' ') : '',
    });

    // Security settings
    const [twoStepEnabled, setTwoStepEnabled] = useState(false);
    const [supportAccessEnabled, setSupportAccessEnabled] = useState(false);

    const handleProfileUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);

        try {
            const fullName = `${profileData.firstName} ${profileData.lastName}`.trim();
            await updateProfile({
                name: fullName,
            });
            toast.success('Profile updated successfully');
        } catch (error) {
            toast.error('Failed to update profile');
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        // Validate file type
        if (!file.type.startsWith('image/')) {
            toast.error('Please upload an image file');
            return;
        }

        // Validate file size (max 2MB to match Figma spec)
        if (file.size > 2 * 1024 * 1024) {
            toast.error('Image must be less than 2MB');
            return;
        }

        try {
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64String = reader.result as string;
                await updateProfile({ avatar: base64String });
                toast.success('Profile photo updated');
            };
            reader.readAsDataURL(file);
        } catch (error) {
            toast.error('Failed to upload photo');
            console.error(error);
        }
    };

    const handleAvatarRemove = async () => {
        try {
            await updateProfile({ avatar: undefined });
            toast.success('Profile photo removed');
        } catch (error) {
            toast.error('Failed to remove photo');
            console.error(error);
        }
    };

    const handleChangeEmail = () => {
        toast.info('Email change functionality to be implemented');
    };

    const handleChangePassword = () => {
        toast.info('Password change functionality to be implemented');
    };

    const handleLogoutAllDevices = () => {
        toast.success('Logged out of all devices');
        logout();
    };

    const handleDeleteAccount = () => {
        if (confirm('Are you sure you want to delete your account? This action cannot be undone.')) {
            toast.success('Account deleted');
            logout();
        }
    };

    if (!currentUser) return null;

    const displayName = sanitizeName(currentUser.name) || currentUser.email?.split('@')[0] || 'U';
    const initials = displayName
        .split(' ')
        .map(n => n[0])
        .filter(Boolean)
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'U';

    return (
        <div className="p-8 max-w-4xl">
            <div className="mb-8">
                <h1 className="text-2xl font-medium mb-1">Account Settings</h1>
            </div>

            {/* My Profile Section */}
            <div className="mb-8">
                <h2 className="text-xl font-medium mb-6">My Profile</h2>

                {/* Avatar Upload */}
                <div className="flex items-start gap-6 mb-6">
                    <Avatar className="h-20 w-20">
                        <AvatarImage src={currentUser.avatar} alt={currentUser.name} />
                        <AvatarFallback className="text-lg">{initials}</AvatarFallback>
                    </Avatar>
                    <div className="space-y-2">
                        <div className="flex gap-2">
                            <Button
                                variant="default"
                                size="sm"
                                onClick={() => document.getElementById('avatar-upload')?.click()}
                            >
                                <Upload className="h-4 w-4 mr-2" />
                                Change Image
                            </Button>
                            {currentUser.avatar && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleAvatarRemove}
                                >
                                    Remove Image
                                </Button>
                            )}
                            <input
                                id="avatar-upload"
                                type="file"
                                accept="image/*"
                                className="hidden"
                                onChange={handleAvatarUpload}
                            />
                        </div>
                        <p className="text-xs text-muted-foreground">
                            We support PNGs, JPEGs and GIFs under 2MB
                        </p>
                    </div>
                </div>

                {/* Name Fields */}
                <form onSubmit={handleProfileUpdate} className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                        <div className="space-y-2">
                            <Label htmlFor="firstName">First Name</Label>
                            <Input
                                id="firstName"
                                value={profileData.firstName}
                                onChange={(e) =>
                                    setProfileData({ ...profileData, firstName: e.target.value })
                                }
                                placeholder="Brian"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="lastName">Last Name</Label>
                            <Input
                                id="lastName"
                                value={profileData.lastName}
                                onChange={(e) =>
                                    setProfileData({ ...profileData, lastName: e.target.value })
                                }
                                placeholder="Frederin"
                            />
                        </div>
                    </div>
                    <div className="flex justify-end gap-2">
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() =>
                                setProfileData({
                                    firstName: nameParts[0] !== 'undefined' ? nameParts[0] : '',
                                    lastName: nameParts.slice(1).join(' ') !== 'undefined' ? nameParts.slice(1).join(' ') : '',
                                })
                            }
                        >
                            Cancel
                        </Button>
                        <Button type="submit" disabled={isLoading}>
                            {isLoading ? 'Saving...' : 'Save Changes'}
                        </Button>
                    </div>
                </form>
            </div>

            <Separator className="my-8" />

            {/* Account Security Section */}
            <div className="mb-8">
                <h2 className="text-xl font-medium mb-6">Account Security</h2>

                {/* Email */}
                <div className="space-y-6">
                    <div>
                        <Label className="text-sm font-normal mb-2 block">Email</Label>
                        <div className="flex items-center justify-between">
                            <Input
                                value={currentUser.email}
                                disabled
                                className="max-w-md bg-muted"
                            />
                            <Button variant="outline" size="sm" onClick={handleChangeEmail}>
                                Change email
                            </Button>
                        </div>
                    </div>

                    {/* Password */}
                    <div>
                        <Label className="text-sm font-normal mb-2 block">Password</Label>
                        <div className="flex items-center justify-between">
                            <Input
                                value="••••••••••••"
                                disabled
                                type="password"
                                className="max-w-md bg-muted"
                            />
                            <Button variant="outline" size="sm" onClick={handleChangePassword}>
                                Change password
                            </Button>
                        </div>
                    </div>
                </div>
            </div>

            <Separator className="my-8" />

            {/* 2-Step Verifications */}
            <div className="mb-8">
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="text-base font-medium mb-1">2-Step Verifications</h3>
                        <p className="text-sm text-muted-foreground">
                            Add an additional layer of security to your account during login.
                        </p>
                    </div>
                    <Switch
                        checked={twoStepEnabled}
                        onCheckedChange={setTwoStepEnabled}
                    />
                </div>
            </div>

            <Separator className="my-8" />

            {/* Support Access */}
            <div className="mb-8">
                <h2 className="text-xl font-medium mb-6">Support Access</h2>

                <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                        <h3 className="text-base font-medium mb-1">Support access</h3>
                        <p className="text-sm text-muted-foreground">
                            You have granted us to access to your account for support purposes until Aug 31, 2023, 9:40 PM.
                        </p>
                    </div>
                    <Switch
                        checked={supportAccessEnabled}
                        onCheckedChange={setSupportAccessEnabled}
                    />
                </div>

                <Separator className="my-6" />

                {/* Log out of all devices */}
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="text-base font-medium mb-1">Log out of all devices</h3>
                        <p className="text-sm text-muted-foreground">
                            Log out of all other active sessions on other devices besides this one.
                        </p>
                    </div>
                    <Button variant="outline" size="sm" onClick={handleLogoutAllDevices}>
                        Log out
                    </Button>
                </div>

                <Separator className="my-6" />

                {/* Delete my account */}
                <div className="flex items-start justify-between">
                    <div className="flex-1">
                        <h3 className="text-base font-medium mb-1 text-destructive">Delete my account</h3>
                        <p className="text-sm text-muted-foreground">
                            Permanently delete the account and remove access from all workspaces.
                        </p>
                    </div>
                    <Button variant="destructive" size="sm" onClick={handleDeleteAccount}>
                        Delete Account
                    </Button>
                </div>
            </div>
        </div>
    );
}
