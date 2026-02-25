'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, CheckCircle, XCircle, Clock, Loader2, KeyRound, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

// ─── Types ────────────────────────────────────────────────────────────────────

type PageStatus =
    | 'loading'
    | 'invalid'
    | 'expired'
    | 'already_member'
    | 'accepted'
    | 'needs_auth'   // not signed in → show sign-up / sign-in buttons
    | 'enter_otp';   // signed in → show OTP entry form

interface InvitationInfo {
    workspaceName: string;
    workspaceIcon?: string | null;
    role: string;
    email: string;
    workspaceId: string;
}

// ─── Main content (must be inside Suspense because useSearchParams is used) ───

function InvitationContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams?.get('token') ?? '';

    const { isAuthenticated, hasHydrated, currentUser } = useAuthStore();
    const { fetchUserWorkspaces } = useWorkspaceStore();

    const [pageStatus, setPageStatus] = useState<PageStatus>('loading');
    const [invInfo, setInvInfo] = useState<InvitationInfo | null>(null);

    // OTP entry state
    const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
    const [isVerifying, setIsVerifying] = useState(false);
    const [otpError, setOtpError] = useState<string | null>(null);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // Resend state
    const [isResending, setIsResending] = useState(false);
    const [resendCooldown, setResendCooldown] = useState(0);

    // Cooldown timer
    useEffect(() => {
        if (resendCooldown <= 0) return;
        const timer = setTimeout(() => setResendCooldown(c => c - 1), 1000);
        return () => clearTimeout(timer);
    }, [resendCooldown]);

    // ── Load invitation details via server API (no client-side Supabase, no RLS issues) ──
    useEffect(() => {
        if (!hasHydrated) return;

        async function init() {
            if (!token) {
                setPageStatus('invalid');
                return;
            }

            try {
                // Call our server-side route that uses service-role client (bypasses RLS)
                const res = await fetch(`/api/invitation-lookup?token=${encodeURIComponent(token)}`);
                const data = await res.json();

                if (!res.ok || data.error) {
                    setPageStatus('invalid');
                    return;
                }

                if (data.status === 'invalid') { setPageStatus('invalid'); return; }
                if (data.status === 'expired') { setPageStatus('expired'); return; }
                if (data.status === 'accepted') { setPageStatus('accepted'); return; }

                // Valid invitation
                const info: InvitationInfo = {
                    workspaceName: data.workspaceName,
                    workspaceIcon: data.workspaceIcon,
                    role: data.role,
                    email: data.email,
                    workspaceId: data.workspaceId,
                };
                setInvInfo(info);

                if (!isAuthenticated || !currentUser) {
                    setPageStatus('needs_auth');
                    return;
                }

                // Logged in — check if already a member (also via API to avoid RLS issues)
                try {
                    const memberRes = await fetch(
                        `/api/invitation-lookup?token=${encodeURIComponent(token)}&checkMember=${currentUser.id}`
                    );
                    const memberData = await memberRes.json();
                    if (memberData.isMember) {
                        setPageStatus('already_member');
                        return;
                    }
                } catch {
                    // fall through to OTP
                }

                setPageStatus('enter_otp');
            } catch (err) {
                console.error('[invitation page] Error loading invitation:', err);
                setPageStatus('invalid');
            }
        }

        init();
    }, [token, hasHydrated, isAuthenticated, currentUser]);

    // ── OTP digit handling ───────────────────────────────────────────────────
    const handleDigitChange = (index: number, value: string) => {
        const digit = value.replace(/\D/g, '').slice(-1);
        const next = [...otpDigits];
        next[index] = digit;
        setOtpDigits(next);
        setOtpError(null);
        if (digit && index < 5) {
            inputRefs.current[index + 1]?.focus();
        }
    };

    const handleDigitKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !otpDigits[index] && index > 0) {
            inputRefs.current[index - 1]?.focus();
        }
    };

    const handleDigitPaste = (e: React.ClipboardEvent) => {
        e.preventDefault();
        const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
        if (!pasted) return;
        const next = [...otpDigits];
        pasted.split('').forEach((ch, i) => { if (i < 6) next[i] = ch; });
        setOtpDigits(next);
        inputRefs.current[Math.min(pasted.length, 5)]?.focus();
    };

    // ── Verify workspace OTP ─────────────────────────────────────────────────
    const handleVerifyOtp = async () => {
        const otp = otpDigits.join('');
        if (otp.length < 6) {
            setOtpError('Please enter the full 6-digit code from your email.');
            return;
        }

        if (!currentUser) {
            toast.error('You must be signed in to verify.');
            return;
        }

        setIsVerifying(true);
        setOtpError(null);

        try {
            const res = await fetch('/api/verify-workspace-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    email: invInfo?.email || currentUser.email,
                    otp,
                    invitationToken: token,
                    userId: currentUser.id,
                }),
            });

            const data = await res.json();

            if (!res.ok) {
                setOtpError(data.error || 'Verification failed. Please try again.');
                return;
            }

            // Success — refresh workspaces and navigate to dashboard
            await fetchUserWorkspaces(currentUser.id);
            toast.success(`Welcome to ${invInfo?.workspaceName || 'the workspace'}! 🎉`);
            router.push('/');
        } catch {
            setOtpError('Something went wrong. Please try again.');
        } finally {
            setIsVerifying(false);
        }
    };

    // ── Resend workspace OTP ─────────────────────────────────────────────────
    const handleResendCode = async () => {
        if (isResending || resendCooldown > 0) return;

        setIsResending(true);
        setOtpError(null);

        try {
            const res = await fetch('/api/resend-workspace-otp', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ invitationToken: token }),
            });

            const data = await res.json();

            if (!res.ok) {
                toast.error(data.error || 'Failed to resend code. Please try again.');
                return;
            }

            toast.success(`A new workspace code has been sent to ${invInfo?.email}`);
            setOtpDigits(['', '', '', '', '', '']);
            inputRefs.current[0]?.focus();
            setResendCooldown(60);
        } catch {
            toast.error('Something went wrong. Please try again.');
        } finally {
            setIsResending(false);
        }
    };

    // ── Workspace avatar initials ─────────────────────────────────────────────
    const workspaceInitials = invInfo?.workspaceName
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'W';

    // ──────────────────────────────────────────────────────────────────────────
    // Render
    // ──────────────────────────────────────────────────────────────────────────

    // Loading
    if (pageStatus === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <Card className="w-full max-w-md shadow-lg">
                    <CardContent className="flex flex-col items-center justify-center py-16">
                        <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground">Loading invitation…</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Invalid / Expired
    if (pageStatus === 'invalid' || pageStatus === 'expired') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                <Card className="w-full max-w-md shadow-lg">
                    <CardContent className="flex flex-col items-center justify-center py-14">
                        {pageStatus === 'expired' ? (
                            <>
                                <div className="h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center mb-5">
                                    <Clock className="h-8 w-8 text-yellow-600" />
                                </div>
                                <h2 className="text-xl font-semibold mb-2">Invitation Expired</h2>
                                <p className="text-muted-foreground text-center text-sm mb-6">
                                    This invitation link has expired. Please ask the workspace admin to send a new one.
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-5">
                                    <XCircle className="h-8 w-8 text-red-600" />
                                </div>
                                <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
                                <p className="text-muted-foreground text-center text-sm mb-6">
                                    This invitation link is invalid or has already been used.
                                </p>
                            </>
                        )}
                        <Link href="/signin">
                            <Button>Go to Sign In</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Already a member
    if (pageStatus === 'already_member') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                <Card className="w-full max-w-md shadow-lg">
                    <CardContent className="flex flex-col items-center justify-center py-14">
                        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-5">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">Already a Member</h2>
                        <p className="text-muted-foreground text-center text-sm mb-6">
                            You're already a member of <strong>{invInfo?.workspaceName}</strong>.
                        </p>
                        <Link href="/">
                            <Button>Go to Dashboard</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Already accepted
    if (pageStatus === 'accepted') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                <Card className="w-full max-w-md shadow-lg">
                    <CardContent className="flex flex-col items-center justify-center py-14">
                        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-5">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">Already Accepted</h2>
                        <p className="text-muted-foreground text-center text-sm mb-6">
                            This invitation has already been accepted. Sign in to access the workspace.
                        </p>
                        <Link href="/signin">
                            <Button>Sign In</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ── Not authenticated: show sign-up / sign-in ────────────────────────────
    if (pageStatus === 'needs_auth') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                <Card className="w-full max-w-md shadow-lg">
                    <CardHeader className="text-center pb-2">
                        <div className="flex justify-center mb-4">
                            <Avatar className="h-16 w-16 rounded-2xl">
                                <AvatarImage src={invInfo?.workspaceIcon ?? undefined} />
                                <AvatarFallback className="rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl font-bold">
                                    {workspaceInitials}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <CardTitle className="text-xl">You've been invited!</CardTitle>
                        <CardDescription className="text-base font-medium text-foreground mt-1">
                            Join <span className="font-semibold">{invInfo?.workspaceName}</span> on Venture CRM
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4 pt-4">
                        <p className="text-center text-muted-foreground text-sm">
                            To accept this invitation, create an account or sign in.
                            You'll then enter the workspace access code sent to <strong>{invInfo?.email}</strong>.
                        </p>

                        <div className="flex flex-col gap-3 pt-2">
                            {/* New user: sign up, then come back to enter OTP */}
                            <Link href={`/signup?invitation=${token}&email=${encodeURIComponent(invInfo?.email || '')}`} className="w-full">
                                <Button className="w-full" size="lg">
                                    Create Account
                                </Button>
                            </Link>

                            {/* Existing user: sign in, then come back to enter OTP */}
                            <Link href={`/signin?invitation=${token}`} className="w-full">
                                <Button variant="outline" className="w-full" size="lg">
                                    Sign In to Existing Account
                                </Button>
                            </Link>
                        </div>

                        <p className="text-center text-xs text-muted-foreground pt-2">
                            The invitation was sent to <strong>{invInfo?.email}</strong>.
                            Make sure to sign in with that email address.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ── Signed in: enter workspace OTP ───────────────────────────────────────
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
            <Card className="w-full max-w-md shadow-lg">
                <CardHeader className="text-center pb-2">
                    <div className="flex justify-center mb-4">
                        <Avatar className="h-16 w-16 rounded-2xl">
                            <AvatarImage src={invInfo?.workspaceIcon ?? undefined} />
                            <AvatarFallback className="rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl font-bold">
                                {workspaceInitials}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <CardTitle className="text-xl">Enter Workspace Code</CardTitle>
                    <CardDescription className="mt-1">
                        Enter the 6-digit code from your invitation email to join{' '}
                        <span className="font-semibold text-foreground">{invInfo?.workspaceName}</span>
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6 pt-4">
                    {/* OTP digit inputs */}
                    <div className="flex justify-center gap-2" onPaste={handleDigitPaste}>
                        {otpDigits.map((digit, i) => (
                            <input
                                key={i}
                                ref={(el) => { inputRefs.current[i] = el; }}
                                type="text"
                                inputMode="numeric"
                                maxLength={1}
                                value={digit}
                                onChange={(e) => handleDigitChange(i, e.target.value)}
                                onKeyDown={(e) => handleDigitKeyDown(i, e)}
                                className={`w-12 h-14 text-center text-xl font-bold border-2 rounded-lg outline-none transition-colors
                                    ${otpError
                                        ? 'border-red-400 bg-red-50 focus:border-red-500'
                                        : 'border-gray-200 bg-white focus:border-black'
                                    }`}
                            />
                        ))}
                    </div>

                    {/* Error message */}
                    {otpError && (
                        <p className="text-sm text-red-600 text-center -mt-2">{otpError}</p>
                    )}

                    {/* Verify button */}
                    <Button
                        onClick={handleVerifyOtp}
                        disabled={isVerifying || otpDigits.join('').length < 6}
                        className="w-full"
                        size="lg"
                    >
                        {isVerifying ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Verifying…
                            </>
                        ) : (
                            <>
                                <KeyRound className="mr-2 h-4 w-4" />
                                Join Workspace
                            </>
                        )}
                    </Button>

                    <p className="text-center text-xs text-muted-foreground">
                        Check your email at <strong>{invInfo?.email}</strong> for the 6-digit code.
                    </p>

                    {/* Resend code */}
                    <div className="text-center">
                        <p className="text-sm text-muted-foreground">
                            Didn't receive the code?{' '}
                            {resendCooldown > 0 ? (
                                <span className="text-muted-foreground">
                                    Resend in {resendCooldown}s
                                </span>
                            ) : (
                                <button
                                    onClick={handleResendCode}
                                    disabled={isResending}
                                    className="inline-flex items-center gap-1 font-medium text-black hover:underline disabled:opacity-50"
                                >
                                    {isResending ? (
                                        <>
                                            <Loader2 className="h-3 w-3 animate-spin" />
                                            Sending…
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="h-3 w-3" />
                                            Resend workspace code
                                        </>
                                    )}
                                </button>
                            )}
                        </p>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}

// ─── Page wrapper with Suspense ───────────────────────────────────────────────

export default function InvitationPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <Loader2 className="h-10 w-10 animate-spin text-muted-foreground" />
            </div>
        }>
            <InvitationContent />
        </Suspense>
    );
}
