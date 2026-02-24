'use client';

import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Building2, CheckCircle, XCircle, Clock, Loader2, KeyRound, Mail } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';

// ─── Types ───────────────────────────────────────────────────────────────────

type PageStatus =
    | 'loading'
    | 'invalid'
    | 'expired'
    | 'already_member'
    | 'accepted'
    | 'needs_auth'      // not signed in → show sign-up / sign-in buttons
    | 'enter_otp';      // signed in → show OTP entry form

interface InvitationInfo {
    workspaceName: string;
    workspaceIcon?: string;
    role: string;
    email: string;
}

// ─── Helper: fetch invitation details from Supabase ──────────────────────────

async function fetchInvitationInfo(token: string): Promise<{
    status: PageStatus;
    info?: InvitationInfo;
    workspaceId?: string;
}> {
    try {
        const { getSupabaseClient } = await import('@/lib/supabase/client');
        const supabase = getSupabaseClient();
        if (!supabase) return { status: 'invalid' };

        const { data: invitation, error } = await supabase
            .from('workspace_invitations')
            .select('*, workspaces(name, icon)')
            .eq('token', token)
            .maybeSingle();

        if (error || !invitation) return { status: 'invalid' };

        if (invitation.status === 'accepted') return { status: 'accepted' };
        if (invitation.status !== 'pending') return { status: 'invalid' };
        if (new Date(invitation.expires_at) < new Date()) return { status: 'expired' };

        const ws = invitation.workspaces as any;
        return {
            status: 'loading', // caller will determine the next step
            info: {
                workspaceName: ws?.name || 'the workspace',
                workspaceIcon: ws?.icon,
                role: invitation.role,
                email: invitation.email,
            },
            workspaceId: invitation.workspace_id,
        };
    } catch {
        return { status: 'invalid' };
    }
}

// ─── Main content component ───────────────────────────────────────────────────

function InvitationContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams?.get('token') ?? '';

    const { isAuthenticated, hasHydrated, currentUser } = useAuthStore();
    const { fetchUserWorkspaces } = useWorkspaceStore();

    const [pageStatus, setPageStatus] = useState<PageStatus>('loading');
    const [invInfo, setInvInfo] = useState<InvitationInfo | null>(null);
    const [workspaceId, setWorkspaceId] = useState<string>('');

    // OTP entry state
    const [otpDigits, setOtpDigits] = useState<string[]>(['', '', '', '', '', '']);
    const [isVerifying, setIsVerifying] = useState(false);
    const [otpError, setOtpError] = useState<string | null>(null);
    const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

    // ── Load invitation details ──────────────────────────────────────────────
    useEffect(() => {
        if (!hasHydrated) return;

        async function init() {
            if (!token) {
                setPageStatus('invalid');
                return;
            }

            const result = await fetchInvitationInfo(token);

            if (result.status === 'invalid') { setPageStatus('invalid'); return; }
            if (result.status === 'expired') { setPageStatus('expired'); return; }
            if (result.status === 'accepted') { setPageStatus('accepted'); return; }

            setInvInfo(result.info!);
            setWorkspaceId(result.workspaceId!);

            if (!isAuthenticated || !currentUser) {
                // Not logged in — need to sign up or sign in first
                setPageStatus('needs_auth');
                return;
            }

            // Logged in — check if already a member
            try {
                const { getSupabaseClient } = await import('@/lib/supabase/client');
                const supabase = getSupabaseClient();
                if (supabase) {
                    const { data: membership } = await supabase
                        .from('workspace_memberships')
                        .select('id')
                        .eq('workspace_id', result.workspaceId!)
                        .eq('user_id', currentUser.id)
                        .eq('status', 'active')
                        .maybeSingle();

                    if (membership) {
                        setPageStatus('already_member');
                        return;
                    }
                }
            } catch { /* fall through to OTP */ }

            // Logged in, not a member yet — show OTP entry
            setPageStatus('enter_otp');
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

    // ── Verify OTP ───────────────────────────────────────────────────────────
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

            // Refresh workspaces and go to dashboard
            await fetchUserWorkspaces(currentUser.id);
            toast.success(`Welcome to ${invInfo?.workspaceName || 'the workspace'}! 🎉`);
            router.push('/notes');
        } catch {
            setOtpError('Something went wrong. Please try again.');
        } finally {
            setIsVerifying(false);
        }
    };

    // ── Workspace avatar initials ─────────────────────────────────────────────
    const workspaceInitials = invInfo?.workspaceName
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'W';

    // ─────────────────────────────────────────────────────────────────────────
    // Render
    // ─────────────────────────────────────────────────────────────────────────

    if (pageStatus === 'loading') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground">Loading invitation…</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (pageStatus === 'invalid' || pageStatus === 'expired') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        {pageStatus === 'expired' ? (
                            <>
                                <div className="h-16 w-16 rounded-full bg-yellow-100 flex items-center justify-center mb-4">
                                    <Clock className="h-8 w-8 text-yellow-600" />
                                </div>
                                <h2 className="text-xl font-semibold mb-2">Invitation Expired</h2>
                                <p className="text-muted-foreground text-center mb-6">
                                    This invitation link has expired. Please ask the workspace admin to send a new one.
                                </p>
                            </>
                        ) : (
                            <>
                                <div className="h-16 w-16 rounded-full bg-red-100 flex items-center justify-center mb-4">
                                    <XCircle className="h-8 w-8 text-red-600" />
                                </div>
                                <h2 className="text-xl font-semibold mb-2">Invalid Invitation</h2>
                                <p className="text-muted-foreground text-center mb-6">
                                    This invitation link is invalid or has already been used.
                                </p>
                            </>
                        )}
                        <Link href="/signin"><Button>Go to Sign In</Button></Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (pageStatus === 'already_member') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">Already a Member</h2>
                        <p className="text-muted-foreground text-center mb-6">
                            You're already a member of <strong>{invInfo?.workspaceName}</strong>.
                        </p>
                        <Link href="/notes"><Button>Go to Dashboard</Button></Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    if (pageStatus === 'accepted') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">Invitation Already Accepted</h2>
                        <p className="text-muted-foreground text-center mb-6">
                            This invitation has already been accepted.
                        </p>
                        <Link href="/notes"><Button>Go to Dashboard</Button></Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ── Not authenticated: show sign-up / sign-in ────────────────────────────
    if (pageStatus === 'needs_auth') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <Avatar className="h-16 w-16 rounded-xl">
                                <AvatarImage src={invInfo?.workspaceIcon} />
                                <AvatarFallback className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">
                                    {workspaceInitials}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <CardTitle>You're invited to join</CardTitle>
                        <CardDescription className="text-lg font-semibold text-foreground">
                            {invInfo?.workspaceName}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-center text-muted-foreground text-sm">
                            To accept this invitation, please create an account or sign in.
                            You'll then enter the workspace access code from your invitation email.
                        </p>
                        <div className="flex flex-col gap-3">
                            {/* New users: sign up first, then come back here */}
                            <Link href={`/signup?invitation=${token}`}>
                                <Button className="w-full" size="lg">
                                    Create Account
                                </Button>
                            </Link>
                            {/* Existing users: sign in, then come back here */}
                            <Link href={`/signin?invitation=${token}`}>
                                <Button variant="outline" className="w-full" size="lg">
                                    Sign In
                                </Button>
                            </Link>
                        </div>
                        <p className="text-center text-xs text-muted-foreground pt-2">
                            You'll be asked for a workspace access code after signing in.
                        </p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // ── Authenticated: show OTP entry ────────────────────────────────────────
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <Avatar className="h-20 w-20 rounded-2xl">
                            <AvatarImage src={invInfo?.workspaceIcon} />
                            <AvatarFallback className="rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl">
                                {workspaceInitials}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <CardTitle className="text-2xl">Join {invInfo?.workspaceName}</CardTitle>
                    <CardDescription>
                        Enter the 6-digit workspace access code from your invitation email to continue.
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-6">
                    {/* OTP hint */}
                    <div className="flex items-start gap-3 p-3 bg-blue-50 rounded-lg text-sm text-blue-700">
                        <Mail className="h-4 w-4 mt-0.5 shrink-0" />
                        <p>
                            We sent a 6-digit access code to <strong>{invInfo?.email}</strong> along with your invitation.
                        </p>
                    </div>

                    {/* 6-digit OTP input */}
                    <div className="space-y-3">
                        <Label className="text-sm font-medium">Workspace Access Code</Label>
                        <div className="flex gap-2 justify-center">
                            {otpDigits.map((digit, i) => (
                                <Input
                                    key={i}
                                    ref={el => { inputRefs.current[i] = el; }}
                                    type="text"
                                    inputMode="numeric"
                                    maxLength={1}
                                    value={digit}
                                    onChange={e => handleDigitChange(i, e.target.value)}
                                    onKeyDown={e => handleDigitKeyDown(i, e)}
                                    onPaste={i === 0 ? handleDigitPaste : undefined}
                                    className={`w-11 h-12 text-center text-lg font-bold ${otpError ? 'border-red-500' : ''}`}
                                    autoFocus={i === 0}
                                />
                            ))}
                        </div>
                        {otpError && (
                            <p className="text-sm text-red-500 text-center">{otpError}</p>
                        )}
                    </div>

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
                                Verify & Join Workspace
                            </>
                        )}
                    </Button>

                    <p className="text-center text-xs text-muted-foreground">
                        Signed in as <strong>{currentUser?.email}</strong>.{' '}
                        <Link href="/notes" className="underline">Go to dashboard instead</Link>
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}

export default function InvitationPage() {
    return (
        <Suspense fallback={
            <div className="min-h-screen flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        }>
            <InvitationContent />
        </Suspense>
    );
}
