'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { User, ArrowRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function OnboardingPage() {
    const router = useRouter();
    const { currentUser, updateProfile, hasHydrated, isAuthenticated } = useAuthStore();

    const [isLoading, setIsLoading] = useState(false);

    // Profile form state
    const [name, setName] = useState('');
    const [role, setRole] = useState<'pm' | 'designer' | 'developer' | 'founder' | 'other'>('pm');

    // Initialize form with user data
    useEffect(() => {
        if (currentUser) {
            setName(currentUser.name || '');
        }
    }, [currentUser]);

    // Redirect if not authenticated or already onboarded
    useEffect(() => {
        if (hasHydrated) {
            if (!isAuthenticated) {
                router.push('/signin');
            } else if (currentUser?.hasCompletedOnboarding) {
                router.push('/notes');
            }
        }
    }, [hasHydrated, isAuthenticated, currentUser, router]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        if (!currentUser) {
            toast.error('User not found');
            return;
        }

        setIsLoading(true);
        try {
            // Workspace is already auto-created during signup (per spec Flow #1)
            // Here we only update the user profile and mark onboarding as complete

            await updateProfile({
                name: name.trim() || currentUser.name,
                hasCompletedOnboarding: true,
                onboardingCompletedAt: new Date(),
            });

            toast.success('Welcome to Venture.ai! 🎉');
            router.push('/notes');
        } catch (error) {
            console.error('Onboarding error:', error);
            toast.error('Something went wrong. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

    const roleOptions = [
        { value: 'pm', label: 'Product Manager', icon: '📋' },
        { value: 'founder', label: 'Founder / CEO', icon: '🚀' },
        { value: 'designer', label: 'Designer', icon: '🎨' },
        { value: 'developer', label: 'Developer', icon: '💻' },
        { value: 'other', label: 'Other', icon: '✨' },
    ];

    if (!hasHydrated || !isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <div className="animate-pulse">Loading...</div>
            </div>
        );
    }

    const userInitials = name
        ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : currentUser?.email?.[0]?.toUpperCase() || 'U';

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Left Panel - Illustration */}
            <div className="hidden lg:flex lg:w-1/2 bg-black text-white flex-col items-center justify-center p-12 relative overflow-hidden">
                {/* Decorative pattern */}
                <div className="absolute inset-0 opacity-20">
                    <svg className="absolute inset-0 w-full h-full" xmlns="http://www.w3.org/2000/svg">
                        <defs>
                            <pattern id="diagonalLines" patternUnits="userSpaceOnUse" width="100" height="100" patternTransform="rotate(45)">
                                <line x1="0" y1="0" x2="0" y2="100" stroke="white" strokeWidth="0.5" strokeDasharray="4 8" />
                            </pattern>
                        </defs>
                        <rect width="100%" height="100%" fill="url(#diagonalLines)" />
                    </svg>
                </div>

                <div className="relative z-10 text-center max-w-md">
                    <div className="mb-8 flex justify-center">
                        <div className="h-20 w-20 rounded-2xl bg-white/10 backdrop-blur-sm flex items-center justify-center">
                            <Sparkles className="h-10 w-10 text-white" />
                        </div>
                    </div>
                    <h1 className="text-3xl font-bold mb-4">
                        Welcome to Venture.ai
                    </h1>
                    <p className="text-gray-400 text-lg">
                        The world's best AI-powered product management tool. Create PRDs, manage features, and ship products faster.
                    </p>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <div className="flex justify-center mb-8">
                        <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black">
                                <span className="text-xl font-bold text-white">V</span>
                            </div>
                            <span className="text-xl font-semibold">Venture</span>
                        </div>
                    </div>

                    {/* Profile Setup */}
                    <div className="text-center mb-8">
                        <h2 className="text-2xl font-semibold">Set up your profile</h2>
                        <p className="text-muted-foreground mt-2">Tell us a bit about yourself</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Avatar */}
                        <div className="flex justify-center mb-6">
                            <Avatar className="h-20 w-20">
                                <AvatarImage src={currentUser?.avatar} />
                                <AvatarFallback className="text-xl bg-primary text-primary-foreground">
                                    {userInitials}
                                </AvatarFallback>
                            </Avatar>
                        </div>

                        {/* Name */}
                        <div className="space-y-2">
                            <Label htmlFor="name">Your Name</Label>
                            <Input
                                id="name"
                                type="text"
                                placeholder="Enter your full name"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="h-12"
                            />
                        </div>

                        {/* Role */}
                        <div className="space-y-2">
                            <Label>Your Role</Label>
                            <div className="grid grid-cols-2 gap-2">
                                {roleOptions.map((option) => (
                                    <button
                                        key={option.value}
                                        type="button"
                                        onClick={() => setRole(option.value as typeof role)}
                                        className={`flex items-center gap-2 p-3 rounded-lg border transition-all text-left ${role === option.value
                                            ? 'border-black bg-black/5 ring-1 ring-black'
                                            : 'border-gray-200 hover:border-gray-300'
                                            }`}
                                    >
                                        <span className="text-lg">{option.icon}</span>
                                        <span className="text-sm font-medium">{option.label}</span>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-12 bg-black hover:bg-black/90 text-white"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Setting up...' : 'Get Started'}
                            {!isLoading && <Sparkles className="ml-2 h-4 w-4" />}
                        </Button>
                    </form>

                    {/* Copyright */}
                    <p className="mt-8 text-center text-xs text-muted-foreground">
                        ©2026 Venture.ai. All rights reserved
                    </p>
                </div>
            </div>
        </div>
    );
}
