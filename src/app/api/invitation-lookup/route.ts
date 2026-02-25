import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Admin client bypasses RLS — safe here because we only expose data
// for the specific token provided (token is a secret UUID).
function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase env vars');
    }
    return createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

export async function GET(request: Request) {
    try {
        const { searchParams } = new URL(request.url);
        const token = searchParams.get('token');

        if (!token || token.trim() === '') {
            return NextResponse.json({ error: 'Missing token' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();

        // Fetch the invitation first (without join to avoid PostgREST schema cache issues)
        const { data: invitation, error } = await supabaseAdmin
            .from('workspace_invitations')
            .select('id, workspace_id, email, role, status, expires_at')
            .eq('token', token.trim())
            .maybeSingle();

        if (error) {
            console.error('[invitation-lookup] DB error:', error.message);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (!invitation) {
            return NextResponse.json({ status: 'invalid' });
        }

        if (invitation.status === 'accepted') {
            return NextResponse.json({ status: 'accepted' });
        }

        if (invitation.status !== 'pending') {
            return NextResponse.json({ status: 'invalid' });
        }

        if (new Date(invitation.expires_at) < new Date()) {
            return NextResponse.json({ status: 'expired' });
        }

        const workspaceId = invitation.workspace_id;

        // Fetch workspace details in a separate query (avoids FK join / schema cache dependency)
        const { data: ws } = await supabaseAdmin
            .from('workspaces')
            .select('name, icon')
            .eq('id', workspaceId)
            .maybeSingle();

        // Optional: check if a specific user is already a member
        const checkMember = searchParams.get('checkMember');
        if (checkMember) {
            const { data: membership } = await supabaseAdmin
                .from('workspace_memberships')
                .select('id')
                .eq('workspace_id', workspaceId)
                .eq('user_id', checkMember)
                .eq('status', 'active')
                .maybeSingle();

            return NextResponse.json({
                status: 'valid',
                isMember: !!membership,
                workspaceId,
                email: invitation.email,
                role: invitation.role,
                workspaceName: ws?.name || 'the workspace',
                workspaceIcon: ws?.icon || null,
            });
        }

        return NextResponse.json({
            status: 'valid',
            isMember: false,
            workspaceId,
            email: invitation.email,
            role: invitation.role,
            workspaceName: ws?.name || 'the workspace',
            workspaceIcon: ws?.icon || null,
        });
    } catch (err) {
        console.error('[invitation-lookup] Unexpected error:', err);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
