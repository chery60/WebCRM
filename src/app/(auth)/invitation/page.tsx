'use client';

import { useEffect, useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuthStore } from '@/lib/stores/auth-store';
import { useWorkspaceStore } from '@/lib/stores/workspace-store';
import { db } from '@/lib/db/dexie';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Building2, CheckCircle, XCircle, Clock, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import Link from 'next/link';
import type { WorkspaceInvitation, Workspace } from '@/types';

function InvitationContent() {
    const router = useRouter();
    const searchParams = useSearchParams();
    const token = searchParams?.get('token');

    const { isAuthenticated, hasHydrated, currentUser } = useAuthStore();
    const { acceptInvitation, fetchUserWorkspaces } = useWorkspaceStore();

    const [invitation, setInvitation] = useState<WorkspaceInvitation | null>(null);
    const [workspace, setWorkspace] = useState<Workspace | null>(null);
    const [status, setStatus] = useState<'loading' | 'valid' | 'expired' | 'invalid' | 'already_member' | 'accepted'>('loading');
    const [isAccepting, setIsAccepting] = useState(false);

    // Fetch invitation details
    useEffect(() => {
        async function fetchInvitation() {
            if (!token) {
                setStatus('invalid');
                return;
            }

            try {
                // Find invitation by token
                const inv = await db.workspaceInvitations
                    .where('token')
                    .equals(token)
                    .first();

                if (!inv) {
                    setStatus('invalid');
                    return;
                }

                setInvitation(inv);

                // Check if expired
                if (new Date(inv.expiresAt) < new Date()) {
                    setStatus('expired');
                    return;
                }

                // Check if already accepted
                if (inv.status === 'accepted') {
                    setStatus('accepted');
                    return;
                }

                if (inv.status !== 'pending') {
                    setStatus('invalid');
                    return;
                }

                // Fetch workspace details
                const ws = await db.workspaces.get(inv.workspaceId);
                if (ws && !ws.isDeleted) {
                    setWorkspace(ws);
                }

                // Check if user is already a member
                if (currentUser) {
                    const existingMembership = await db.workspaceMemberships
                        .where('workspaceId')
                        .equals(inv.workspaceId)
                        .and(m => m.userId === currentUser.id && m.status === 'active')
                        .first();

                    if (existingMembership) {
                        setStatus('already_member');
                        return;
                    }
                }

                setStatus('valid');
            } catch (error) {
                console.error('Error fetching invitation:', error);
                setStatus('invalid');
            }
        }

        if (hasHydrated) {
            fetchInvitation();
        }
    }, [token, hasHydrated, currentUser]);

    const handleAccept = async () => {
        if (!invitation || !currentUser) return;

        setIsAccepting(true);
        try {
            const membership = await acceptInvitation(invitation.token, currentUser.id);

            if (membership) {
                // Refresh workspaces
                await fetchUserWorkspaces(currentUser.id);
                toast.success(`Welcome to ${workspace?.name || 'the workspace'}!`);
                router.push('/notes');
            } else {
                toast.error('Failed to accept invitation');
                setStatus('invalid');
            }
        } catch (error) {
            console.error('Error accepting invitation:', error);
            toast.error('Something went wrong');
        } finally {
            setIsAccepting(false);
        }
    };

    const workspaceInitials = workspace?.name
        ?.split(' ')
        .map(n => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2) || 'W';

    // Loading state
    if (status === 'loading' || !hasHydrated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                        <p className="mt-4 text-muted-foreground">Loading invitation...</p>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Invalid or expired states
    if (status === 'invalid' || status === 'expired') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        {status === 'expired' ? (
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
                        <Link href="/signin">
                            <Button>Go to Sign In</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Already a member
    if (status === 'already_member') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">Already a Member</h2>
                        <p className="text-muted-foreground text-center mb-6">
                            You're already a member of {workspace?.name || 'this workspace'}.
                        </p>
                        <Link href="/notes">
                            <Button>Go to Dashboard</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Already accepted
    if (status === 'accepted') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                <Card className="w-full max-w-md">
                    <CardContent className="flex flex-col items-center justify-center py-12">
                        <div className="h-16 w-16 rounded-full bg-green-100 flex items-center justify-center mb-4">
                            <CheckCircle className="h-8 w-8 text-green-600" />
                        </div>
                        <h2 className="text-xl font-semibold mb-2">Invitation Accepted</h2>
                        <p className="text-muted-foreground text-center mb-6">
                            This invitation has already been accepted.
                        </p>
                        <Link href="/notes">
                            <Button>Go to Dashboard</Button>
                        </Link>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Not authenticated - redirect to signup with invitation token
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
                <Card className="w-full max-w-md">
                    <CardHeader className="text-center">
                        <div className="flex justify-center mb-4">
                            <Avatar className="h-16 w-16 rounded-xl">
                                <AvatarImage src={workspace?.icon} />
                                <AvatarFallback className="rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 text-white text-xl">
                                    {workspaceInitials}
                                </AvatarFallback>
                            </Avatar>
                        </div>
                        <CardTitle>You're invited to join</CardTitle>
                        <CardDescription className="text-lg font-semibold text-foreground">
                            {workspace?.name || 'a workspace'}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <p className="text-center text-muted-foreground">
                            Sign in or create an account to accept this invitation.
                        </p>
                        <div className="flex flex-col gap-2">
                            <Link href={`/signup?invitation=${token}`}>
                                <Button className="w-full">Create Account</Button>
                            </Link>
                            <Link href={`/signin?invitation=${token}`}>
                                <Button variant="outline" className="w-full">
                                    Sign In
                                </Button>
                            </Link>
                        </div>
                    </CardContent>
                </Card>
            </div>
        );
    }

    // Valid invitation - show accept UI
    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-50 to-gray-100 p-4">
            <Card className="w-full max-w-md">
                <CardHeader className="text-center">
                    <div className="flex justify-center mb-4">
                        <Avatar className="h-20 w-20 rounded-2xl">
                            <AvatarImage src={workspace?.icon} />
                            <AvatarFallback className="rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 text-white text-2xl">
                                {workspaceInitials}
                            </AvatarFallback>
                        </Avatar>
                    </div>
                    <CardTitle className="text-2xl">Join {workspace?.name}</CardTitle>
                    <CardDescription>
                        You've been invited to join this workspace as a <strong>{invitation?.role}</strong>
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    {workspace?.description && (
                        <p className="text-center text-muted-foreground text-sm">
                            {workspace.description}
                        </p>
                    )}
                    <div className="flex flex-col gap-2">
                        <Button
                            onClick={handleAccept}
                            disabled={isAccepting}
                            className="w-full"
                            size="lg"
                        >
                            {isAccepting ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Joining...
                                </>
                            ) : (
                                <>
                                    <CheckCircle className="mr-2 h-4 w-4" />
                                    Accept Invitation
                                </>
                            )}
                        </Button>
                        <Link href="/notes">
                            <Button variant="ghost" className="w-full">
                                Maybe Later
                            </Button>
                        </Link>
                    </div>
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
