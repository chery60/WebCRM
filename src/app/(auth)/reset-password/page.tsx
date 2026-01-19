'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Eye, EyeOff, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthHeader } from '@/components/auth/auth-header';
import { db } from '@/lib/db/dexie';
import { toast } from 'sonner';

// Loading fallback for Suspense
function ResetPasswordLoading() {
    return (
        <div className="flex items-center justify-center min-h-screen">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
}

function ResetPasswordContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const [isLoading, setIsLoading] = useState(false);
    const [isValidating, setIsValidating] = useState(true);
    const [tokenValid, setTokenValid] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [userEmail, setUserEmail] = useState('');

    const token = searchParams?.get('token');
    const email = searchParams?.get('email');

    useEffect(() => {
        const validateToken = async () => {
            if (!token || !email) {
                setError('Invalid reset link. Please request a new password reset.');
                setIsValidating(false);
                return;
            }

            try {
                // Find user with this reset token
                const user = await db.users.where('email').equals(email).first();

                if (!user) {
                    setError('No account found with this email address.');
                    setIsValidating(false);
                    return;
                }

                if (!user.resetToken || user.resetToken !== token) {
                    setError('Invalid or expired reset link. Please request a new password reset.');
                    setIsValidating(false);
                    return;
                }

                // Check if token has expired
                if (user.resetTokenExpiry && new Date(user.resetTokenExpiry) < new Date()) {
                    setError('Reset link has expired. Please request a new password reset.');
                    setIsValidating(false);
                    return;
                }

                setTokenValid(true);
                setUserEmail(email);
            } catch (err) {
                setError('An error occurred. Please try again.');
            } finally {
                setIsValidating(false);
            }
        };

        validateToken();
    }, [token, email]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);

        if (password !== confirmPassword) {
            setError('Passwords do not match');
            return;
        }

        if (password.length < 6) {
            setError('Password must be at least 6 characters');
            return;
        }

        setIsLoading(true);

        try {
            // Find and update the user's password
            const user = await db.users.where('email').equals(userEmail).first();
            
            if (!user) {
                setError('User not found.');
                setIsLoading(false);
                return;
            }

            // Update password and clear reset token
            await db.users.update(user.id, {
                password: password,
                resetToken: undefined,
                resetTokenExpiry: undefined,
            });

            toast.success('Password reset successfully!');
            
            // Redirect to sign in after a short delay
            setTimeout(() => {
                router.push('/signin');
            }, 1500);
        } catch (err) {
            setError('Failed to reset password. Please try again.');
            setIsLoading(false);
        }
    };

    if (isValidating) {
        return (
            <div className="flex items-center justify-center min-h-screen">
                <div className="text-muted-foreground">Validating reset link...</div>
            </div>
        );
    }

    if (!tokenValid) {
        return (
            <div className="relative min-h-screen bg-white">
                <AuthHeader />
                <div className="relative flex flex-col items-center justify-center min-h-screen px-6 pt-20">
                    <div className="w-full max-w-md text-center space-y-4">
                        <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-semibold">Invalid Reset Link</h1>
                        <p className="text-sm text-muted-foreground">{error}</p>
                        <div className="flex flex-col gap-2 mt-4">
                            <Link href="/forgot-password">
                                <Button className="w-full bg-black text-white hover:bg-black/90">
                                    Request New Reset Link
                                </Button>
                            </Link>
                            <Link href="/signin">
                                <Button variant="outline" className="w-full">
                                    Back to Sign In
                                </Button>
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="relative min-h-screen bg-white">
            {/* Decorative pattern */}
            <div className="absolute inset-0 opacity-5 pointer-events-none">
                <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
                    <defs>
                        <pattern id="diagonalPattern" patternUnits="userSpaceOnUse" width="100" height="100" patternTransform="rotate(45)">
                            <line x1="0" y1="0" x2="0" y2="100" stroke="currentColor" strokeWidth="0.5" strokeDasharray="4 8" />
                        </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#diagonalPattern)" />
                </svg>
            </div>

            <AuthHeader />

            <div className="relative flex flex-col items-center justify-center min-h-screen px-6 pt-20">
                <div className="w-full max-w-md">
                    {/* Header */}
                    <div className="text-center mb-8">
                        <h1 className="text-2xl font-semibold tracking-tight">Reset Password</h1>
                        <p className="text-sm text-muted-foreground mt-2">
                            Enter your registered login email address to receive a secured link to set a new password
                        </p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-5">
                        {error && (
                            <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                                {error}
                            </div>
                        )}
                        <div className="space-y-2">
                            <Label htmlFor="password" className="text-sm font-medium">New Password</Label>
                            <div className="relative">
                                <Input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    placeholder="Password"
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

                        <div className="space-y-2">
                            <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm Password</Label>
                            <div className="relative">
                                <Input
                                    id="confirmPassword"
                                    type={showConfirmPassword ? 'text' : 'password'}
                                    placeholder="Password"
                                    value={confirmPassword}
                                    onChange={(e) => setConfirmPassword(e.target.value)}
                                    required
                                    className="h-11 pr-10"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                        </div>

                        <Button
                            type="submit"
                            className="w-full h-11 bg-black text-white hover:bg-black/90"
                            disabled={isLoading}
                        >
                            {isLoading ? 'Resetting...' : 'Reset Password'}
                        </Button>
                    </form>

                    {/* Copyright */}
                    <p className="mt-12 text-center text-xs text-muted-foreground">
                        ©2023 Venture. All rights reserved
                    </p>
                </div>
            </div>
        </div>
    );
}

// Default export wrapped in Suspense for useSearchParams
export default function ResetPasswordPage() {
    return (
        <Suspense fallback={<ResetPasswordLoading />}>
            <ResetPasswordContent />
        </Suspense>
    );
}
