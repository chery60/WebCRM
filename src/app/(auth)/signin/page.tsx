'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { AuthMarketingPanel } from '@/components/auth/auth-marketing-panel';

function SignInContent() {
    const { login, isLoading } = useAuthStore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const invitationToken = searchParams?.get('invitation');
    const signInMessage = searchParams?.get('message');
    const prefillEmail = searchParams?.get('email');

    const [email, setEmail] = useState(prefillEmail ? decodeURIComponent(prefillEmail) : '');
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [rememberMe, setRememberMe] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        try {
            await login(email, password);

            // If user was invited, redirect to accept the invitation
            if (invitationToken) {
                router.push(`/invitation?token=${invitationToken}`);
            } else {
                router.push('/notes');
            }
        } catch (err) {
            setError('Login failed. Please check your email and password.');
        }
    };

    const handleGoogleSignIn = () => {
        // TODO: Implement Google OAuth
        console.log('Google sign in clicked');
    };

    return (
        <div className="flex min-h-screen">
            {/* Left Panel - Marketing */}
            <div className="hidden lg:flex lg:w-1/2">
                <AuthMarketingPanel variant="signin" />
            </div>

            {/* Right Panel - Form */}
            <div className="flex flex-1 flex-col items-center justify-center px-6 py-12 lg:px-8 bg-white">
                <div className="w-full max-w-sm">
                    {/* Logo */}
                    <div className="flex justify-center mb-8">
                        <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black">
                                <span className="text-xl font-bold text-white">V</span>
                            </div>
                            <span className="text-xl font-semibold">Venture</span>
                        </div>
                    </div>

                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-semibold tracking-tight">Welcome back!</h1>
                        <p className="text-sm text-muted-foreground mt-2">Please Login to Continue</p>
                    </div>

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 rounded-md">
                            {error}
                        </div>
                    )}

                    {signInMessage === 'check-email' && (
                        <div className="mb-4 p-3 text-sm text-green-600 bg-green-50 rounded-md">
                            We sent a verification link to your email. Please verify to continue.
                        </div>
                    )}

                    {/* Form */}
                    <form onSubmit={handleSubmit} className="space-y-5">
                        <div className="space-y-2">
                            <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                            <Input
                                id="email"
                                type="email"
                                placeholder="Enter your email here"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                className="h-11"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Enter your password here"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    required
                                    className="h-11 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <Checkbox
                                    id="remember"
                                    checked={rememberMe}
                                    onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                                />
                                <Label htmlFor="remember" className="text-sm font-normal cursor-pointer">
                                    Remember Me
                                </Label>
                            </div>
                            <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">
                                Forgot Password?
                            </Link>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11 bg-black text-white hover:bg-black/90"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Signing in...' : 'Sign In'}
                        </Button>
                    </form>

                    {/* Divider */}
                    <div className="relative my-6">
                        <div className="absolute inset-0 flex items-center">
                            <span className="w-full border-t" />
                        </div>
                    </div>

                    {/* Google Sign In */}
                    <Button
                        type="button"
                        variant="outline"
                        className="w-full h-11"
                        onClick={handleGoogleSignIn}
                    >
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                            <path
                                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                                fill="#4285F4"
                            />
                            <path
                                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                                fill="#34A853"
                            />
                            <path
                                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                                fill="#FBBC05"
                            />
                            <path
                                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                                fill="#EA4335"
                            />
                        </svg>
                        Sign In with Google
                    </Button>

                    {/* Sign Up Link */}
                    <p className="mt-6 text-center text-sm text-muted-foreground">
                        Don&apos;t you have an account?{' '}
                        <Link
                            href={invitationToken ? `/signup?invitation=${invitationToken}` : '/signup'}
                            className="font-medium text-foreground hover:underline"
                        >
                            Sign Up
                        </Link>
                    </p>

                    {/* Copyright */}
                    <p className="mt-8 text-center text-xs text-muted-foreground">
                        ©2026 Venture.ai. All rights reserved
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function SignInPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        }>
            <SignInContent />
        </Suspense>
    );
}
