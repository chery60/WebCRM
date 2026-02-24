'use client';

import { useState, useEffect, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { Loader2, Mail } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuthMarketingPanel } from '@/components/auth/auth-marketing-panel';

function VerifyOTPContent() {
    const { verifyOtp, resendOtp, isLoading } = useAuthStore();
    const router = useRouter();
    const searchParams = useSearchParams();
    const email = searchParams?.get('email') || '';
    const invitationToken = searchParams?.get('invitation') || '';

    const [otp, setOtp] = useState(['', '', '', '', '', '']);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [resendCooldown, setResendCooldown] = useState(0);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    useEffect(() => {
        if (!email) {
            router.push('/signup');
        }
    }, [email, router]);

    useEffect(() => {
        if (resendCooldown > 0) {
            const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
            return () => clearTimeout(timer);
        }
    }, [resendCooldown]);

    const handleOtpChange = (index: number, value: string) => {
        if (!/^\d*$/.test(value)) return; // Only allow digits

        const newOtp = [...otp];
        newOtp[index] = value.slice(-1); // Take only the last digit
        setOtp(newOtp);

        // Auto-focus next input
        if (value && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }

        // Auto-submit when all fields are filled
        if (index === 5 && value && newOtp.every(digit => digit)) {
            handleSubmit(newOtp.join(''));
        }
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otp[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handlePaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        const newOtp = [...otp];
        
        for (let i = 0; i < pastedData.length; i++) {
            newOtp[i] = pastedData[i];
        }
        
        setOtp(newOtp);
        
        // Focus the next empty field or the last field
        const nextEmptyIndex = newOtp.findIndex(digit => !digit);
        const focusIndex = nextEmptyIndex === -1 ? 5 : nextEmptyIndex;
        inputRefs.current[focusIndex]?.focus();

        // Auto-submit if all filled
        if (pastedData.length === 6) {
            handleSubmit(pastedData);
        }
    };

    const handleSubmit = async (otpCode?: string) => {
        const code = otpCode || otp.join('');
        
        if (code.length !== 6) {
            setError('Please enter all 6 digits');
            return;
        }

        setError(null);
        setSuccess(null);

        try {
            await verifyOtp(email, code);
            setSuccess('Verification successful! Redirecting...');
            setTimeout(() => {
                // If the user came from an invitation flow, go back to the invitation OTP page
                if (invitationToken) {
                    router.push(`/invitation?token=${invitationToken}`);
                } else {
                    router.push('/onboarding');
                }
            }, 1000);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Invalid or expired OTP. Please try again.');
            setOtp(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
        }
    };

    const handleResend = async () => {
        if (resendCooldown > 0) return;

        setError(null);
        setSuccess(null);

        try {
            await resendOtp(email);
            setSuccess('New OTP sent to your email!');
            setResendCooldown(60); // 60 seconds cooldown
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Failed to resend OTP. Please try again.');
        }
    };

    if (!email) {
        return null;
    }

    return (
        <div className="min-h-screen flex bg-gradient-to-br from-gray-50 to-gray-100">
            {/* Left Panel - Marketing */}
            <div className="hidden lg:flex lg:w-1/2">
                <AuthMarketingPanel variant="signin" />
            </div>

            {/* Right Panel - OTP Form */}
            <div className="flex-1 flex flex-col items-center justify-center px-6 py-12">
                <div className="w-full max-w-md">
                    {/* Logo */}
                    <div className="flex justify-center mb-6">
                        <div className="flex items-center gap-2">
                            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-black">
                                <span className="text-xl font-bold text-white">V</span>
                            </div>
                            <span className="text-xl font-semibold">Venture</span>
                        </div>
                    </div>

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="flex justify-center mb-4">
                            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-black/5">
                                <Mail className="h-8 w-8 text-black" />
                            </div>
                        </div>
                        <h1 className="text-2xl font-semibold tracking-tight">Verify Your Email</h1>
                        <p className="text-sm text-muted-foreground mt-2">
                            We've sent a 6-digit code to
                        </p>
                        <p className="text-sm font-medium mt-1">{email}</p>
                    </div>

                    {/* Success Message */}
                    {success && (
                        <div className="mb-4 p-3 text-sm text-green-600 bg-green-50 rounded-md">
                            {success}
                        </div>
                    )}

                    {/* Error Message */}
                    {error && (
                        <div className="mb-4 p-3 text-sm text-red-500 bg-red-50 rounded-md">
                            {error}
                        </div>
                    )}

                    {/* OTP Input */}
                    <div className="mb-6">
                        <div className="flex gap-2 justify-center">
                            {otp.map((digit, index) => (
                                <input
                                    key={index}
                                    ref={(el) => {
                                        inputRefs.current[index] = el;
                                    }}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={(e) => handleOtpChange(index, e.target.value)}
                                    onKeyDown={(e) => handleKeyDown(index, e)}
                                    onPaste={handlePaste}
                                    className="w-12 h-14 text-center text-xl font-semibold border border-gray-300 rounded-lg focus:border-black focus:ring-2 focus:ring-black/10 outline-none transition-all"
                                    disabled={isLoading}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Verify Button */}
                    <Button
                        onClick={() => handleSubmit()}
                        className="w-full h-11 bg-black text-white hover:bg-black/90"
                        disabled={isLoading || otp.some(digit => !digit)}
                    >
                        {isLoading ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Verifying...
                            </>
                        ) : (
                            'Verify Email'
                        )}
                    </Button>

                    {/* Resend OTP */}
                    <div className="mt-6 text-center">
                        <p className="text-sm text-muted-foreground">
                            Didn't receive the code?{' '}
                            {resendCooldown > 0 ? (
                                <span className="text-muted-foreground">
                                    Resend in {resendCooldown}s
                                </span>
                            ) : (
                                <button
                                    onClick={handleResend}
                                    disabled={isLoading}
                                    className="font-medium text-black hover:underline disabled:opacity-50"
                                >
                                    Resend OTP
                                </button>
                            )}
                        </p>
                    </div>

                    {/* Copyright */}
                    <p className="mt-8 text-center text-xs text-muted-foreground">
                        ©2026 Venture.ai. All rights reserved
                    </p>
                </div>
            </div>
        </div>
    );
}

export default function VerifyOTPPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        }>
            <VerifyOTPContent />
        </Suspense>
    );
}
