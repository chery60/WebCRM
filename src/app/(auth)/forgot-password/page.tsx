'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AuthHeader } from '@/components/auth/auth-header';
import { db } from '@/lib/db/dexie';
import { v4 as uuidv4 } from 'uuid';

export default function ForgotPasswordPage() {
    const router = useRouter();
    const [email, setEmail] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [resetToken, setResetToken] = useState<string | null>(null);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsLoading(true);
        setError(null);

        try {
            // Check if user exists
            const user = await db.users.where('email').equals(email).first();
            
            if (!user) {
                setError('No account found with this email address.');
                setIsLoading(false);
                return;
            }

            // Generate a reset token
            const token = uuidv4();
            
            // Store the reset token in the user record
            await db.users.update(user.id, {
                resetToken: token,
                resetTokenExpiry: new Date(Date.now() + 60 * 60 * 1000), // 1 hour expiry
            });

            setResetToken(token);
            setIsSubmitted(true);
        } catch (err) {
            setError('An error occurred. Please try again.');
        } finally {
            setIsLoading(false);
        }
    };

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
                        <h1 className="text-2xl font-semibold tracking-tight">Forget Password</h1>
                        <p className="text-sm text-muted-foreground mt-2">
                            Your new password must be different than the previous passwords
                        </p>
                    </div>

                    {isSubmitted ? (
                        <div className="text-center space-y-4">
                            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                                <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                                </svg>
                            </div>
                            <p className="text-sm text-muted-foreground">
                                Password reset link generated for <strong>{email}</strong>
                            </p>
                            {/* In a real app, this would be sent via email. For demo purposes, we show the link directly */}
                            <div className="mt-4 p-3 bg-muted rounded-md">
                                <p className="text-xs text-muted-foreground mb-2">Demo: Click the link below to reset your password</p>
                                <Link 
                                    href={`/reset-password?token=${resetToken}&email=${encodeURIComponent(email)}`}
                                    className="text-sm text-primary hover:underline break-all"
                                >
                                    Reset Password Link
                                </Link>
                            </div>
                            <Link href="/signin">
                                <Button variant="outline" className="mt-4">
                                    Back to Sign In
                                </Button>
                            </Link>
                        </div>
                    ) : (
                        <form onSubmit={handleSubmit} className="space-y-5">
                            {error && (
                                <div className="p-3 text-sm text-red-500 bg-red-50 rounded-md">
                                    {error}
                                </div>
                            )}
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

                            <Button
                                type="submit"
                                className="w-full h-11 bg-black text-white hover:bg-black/90"
                                disabled={isLoading}
                            >
                                {isLoading ? 'Sending...' : 'Sent to my Email'}
                            </Button>
                        </form>
                    )}

                    {!isSubmitted && (
                        <p className="mt-6 text-center text-sm text-muted-foreground">
                            Don&apos;t want to reset your Password?{' '}
                            <Link href="/signin" className="font-medium text-foreground hover:underline">
                                Back to Sign In
                            </Link>
                        </p>
                    )}

                    {/* Copyright */}
                    <p className="mt-12 text-center text-xs text-muted-foreground">
                        ©2023 Venture. All rights reserved
                    </p>
                </div>
            </div>
        </div>
    );
}
