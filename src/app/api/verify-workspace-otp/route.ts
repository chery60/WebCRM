import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase URL or Service Role Key');
    }
    return createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

export async function POST(request: Request) {
    try {
        const { email, otp, invitationToken, userId } = await request.json();

        if (!email || !otp) {
            return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();

        // ── Step 1: Resolve the invitation to get workspace_id ────────────────
        let workspaceId: string | null = null;
        let invitation: any = null;

        if (invitationToken) {
            const { data: inv, error: invLookupError } = await supabaseAdmin
                .from('workspace_invitations')
                .select('*')
                .eq('token', invitationToken)
                .eq('status', 'pending')
                .single();

            if (!invLookupError && inv) {
                invitation = inv;
                workspaceId = inv.workspace_id;
            }
        }

        // ── Step 2: Look up OTP — scoped by workspace_id if available ─────────
        // Build the query: always filter by email + otp_code + type
        let otpQuery = supabaseAdmin
            .from('pending_otps')
            .select('*')
            .eq('email', email)
            .eq('otp_code', otp)
            .eq('type', 'workspace_invite')
            .order('created_at', { ascending: false })
            .limit(1);

        // Additionally scope by workspace_id for precision (if we know it)
        if (workspaceId) {
            otpQuery = otpQuery.eq('workspace_id', workspaceId);
        }

        const { data: records, error: lookupError } = await otpQuery;

        if (lookupError) {
            console.error('OTP lookup error:', lookupError);
            // If the error is about a missing column, fall back to lookup without workspace_id
            if (lookupError.message?.includes('workspace_id') || lookupError.code === '42703') {
                // Column doesn't exist yet — try without workspace_id filter
                const { data: fallbackRecords, error: fallbackError } = await supabaseAdmin
                    .from('pending_otps')
                    .select('*')
                    .eq('email', email)
                    .eq('otp_code', otp)
                    .order('created_at', { ascending: false })
                    .limit(1);

                if (fallbackError || !fallbackRecords?.length) {
                    return NextResponse.json({ error: 'Invalid OTP code. Please check the code from your invitation email.' }, { status: 400 });
                }

                // Use the fallback record
                return await processVerification(supabaseAdmin, fallbackRecords[0], invitation, invitationToken, userId, email, workspaceId);
            }
            return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 });
        }

        // If workspace-scoped lookup found nothing, try without workspace_id scope
        // (handles case where workspace_id wasn't stored on OTP)
        let otpRecord = records?.[0] || null;

        if (!otpRecord && workspaceId) {
            const { data: fallbackRecords } = await supabaseAdmin
                .from('pending_otps')
                .select('*')
                .eq('email', email)
                .eq('otp_code', otp)
                .eq('type', 'workspace_invite')
                .order('created_at', { ascending: false })
                .limit(1);
            otpRecord = fallbackRecords?.[0] || null;
        }

        if (!otpRecord) {
            return NextResponse.json({ error: 'Invalid OTP code. Please check the code from your invitation email.' }, { status: 400 });
        }

        return await processVerification(supabaseAdmin, otpRecord, invitation, invitationToken, userId, email, workspaceId);

    } catch (error) {
        console.error('Error in verify-workspace-otp endpoint:', error);
        return NextResponse.json({
            error: 'Verification failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}

async function processVerification(
    supabaseAdmin: any,
    otpRecord: any,
    invitation: any,
    invitationToken: string | undefined,
    userId: string | undefined,
    email: string,
    workspaceId: string | null,
) {
    // Check expiry
    if (new Date(otpRecord.expires_at) < new Date()) {
        await supabaseAdmin.from('pending_otps').delete().eq('id', otpRecord.id);
        return NextResponse.json({ error: 'OTP has expired. Please ask the workspace admin to resend the invitation.' }, { status: 400 });
    }

    // ── Accept invitation and create membership ───────────────────────────────
    if (invitationToken && userId) {
        // If we didn't already load the invitation, try again
        if (!invitation) {
            const { data: inv } = await supabaseAdmin
                .from('workspace_invitations')
                .select('*')
                .eq('token', invitationToken)
                .eq('status', 'pending')
                .single();
            invitation = inv;
        }

        if (!invitation) {
            console.warn('Workspace invitation not found or already accepted.');
        } else {
            const resolvedWorkspaceId = invitation.workspace_id;

            // Check invitation expiry
            if (new Date(invitation.expires_at) < new Date()) {
                await supabaseAdmin
                    .from('workspace_invitations')
                    .update({ status: 'expired' })
                    .eq('id', invitation.id);
                return NextResponse.json({ error: 'The workspace invitation has expired. Please ask the admin to send a new one.' }, { status: 400 });
            }

            // Check if membership already exists (any status)
            const { data: existingMembership } = await supabaseAdmin
                .from('workspace_memberships')
                .select('id, status')
                .eq('workspace_id', resolvedWorkspaceId)
                .eq('user_id', userId)
                .maybeSingle();

            if (!existingMembership) {
                // No membership row at all — insert a fresh active one
                const { error: membershipError } = await supabaseAdmin
                    .from('workspace_memberships')
                    .insert({
                        workspace_id: resolvedWorkspaceId,
                        user_id: userId,
                        role: invitation.role,
                        joined_at: new Date().toISOString(),
                        invited_by: invitation.invited_by,
                        status: 'active',
                    });

                if (membershipError) {
                    // Handle race-condition duplicate (unique constraint)
                    if (membershipError.code === '23505') {
                        console.warn('Membership already exists (race condition), updating to active...');
                        await supabaseAdmin
                            .from('workspace_memberships')
                            .update({
                                status: 'active',
                                role: invitation.role,
                                joined_at: new Date().toISOString(),
                            })
                            .eq('workspace_id', resolvedWorkspaceId)
                            .eq('user_id', userId);
                    } else {
                        console.error('Error creating membership:', membershipError);
                        return NextResponse.json({ error: 'Failed to join workspace. Please try again.' }, { status: 500 });
                    }
                }
            } else if (existingMembership.status !== 'active') {
                // Membership exists but not active (e.g., 'invited' or 'suspended') — activate it
                const { error: updateError } = await supabaseAdmin
                    .from('workspace_memberships')
                    .update({
                        status: 'active',
                        role: invitation.role,
                        joined_at: new Date().toISOString(),
                    })
                    .eq('id', existingMembership.id);

                if (updateError) {
                    console.error('Error activating membership:', updateError);
                    return NextResponse.json({ error: 'Failed to join workspace. Please try again.' }, { status: 500 });
                }
            }
            // else: already active member — nothing to do

            // Mark invitation as accepted
            await supabaseAdmin
                .from('workspace_invitations')
                .update({ status: 'accepted' })
                .eq('id', invitation.id);

            // ── Create or activate employee record (deferred creation) ────────
            // Search by email in this workspace first, then fall back to any workspace
            // (handles cases where employee was created without workspace_id or with a different one)
            let existingEmployee: { id: string; status: string } | null = null;

            // Try workspace-scoped lookup first
            const { data: wsEmployee } = await supabaseAdmin
                .from('employees')
                .select('id, status')
                .eq('email', email)
                .eq('workspace_id', resolvedWorkspaceId)
                .eq('is_deleted', false)
                .maybeSingle();

            if (wsEmployee) {
                existingEmployee = wsEmployee;
            } else {
                // Fall back: find any non-deleted employee row with this email
                // (may have been created without workspace_id in older flow)
                const { data: anyEmployee } = await supabaseAdmin
                    .from('employees')
                    .select('id, status, workspace_id')
                    .eq('email', email)
                    .eq('is_deleted', false)
                    .order('created_at', { ascending: false })
                    .limit(1)
                    .maybeSingle();

                if (anyEmployee) {
                    existingEmployee = anyEmployee;
                }
            }

            if (existingEmployee) {
                // Employee row exists (was pre-created on invite) — activate it and link user_id
                const empUpdate: Record<string, any> = {
                    status: 'active',
                    is_active: true,
                    password_created: true,
                    workspace_id: resolvedWorkspaceId, // ensure workspace_id is set correctly
                    updated_at: new Date().toISOString(),
                };

                // Try to set user_id (added in migration 032) — gracefully skip if column missing
                const { error: updateErr } = await supabaseAdmin
                    .from('employees')
                    .update({ ...empUpdate, user_id: userId })
                    .eq('id', existingEmployee.id);

                if (updateErr) {
                    if (updateErr.code === '42703' || updateErr.message?.includes('user_id')) {
                        // user_id column not yet available — update without it
                        await supabaseAdmin
                            .from('employees')
                            .update(empUpdate)
                            .eq('id', existingEmployee.id);
                    } else {
                        console.warn('Could not update employee record on join:', updateErr.message);
                    }
                }
            } else {
                // No employee row found — create one now (deferred creation)
                // Fetch user profile to get name
                const { data: userProfile } = await supabaseAdmin
                    .from('users')
                    .select('name, email, avatar')
                    .eq('id', userId)
                    .maybeSingle();

                const userName = userProfile?.name || email.split('@')[0];
                const nameParts = userName.split(' ');
                const firstName = nameParts[0] || userName;
                const lastName = nameParts.slice(1).join(' ') || '';

                // Generate employee ID
                const employeeId = 'US' + Math.floor(100000 + Math.random() * 900000).toString();

                // Try with user_id first, fall back without it if column missing
                const empInsertData: Record<string, any> = {
                    first_name: firstName,
                    last_name: lastName,
                    email: email,
                    avatar: userProfile?.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`,
                    role: invitation.role || 'member',
                    status: 'active',
                    category: 'Employee',
                    employee_id: employeeId,
                    workspace_id: resolvedWorkspaceId,
                    user_id: userId,
                    invited_at: new Date().toISOString(),
                    invited_by: invitation.invited_by,
                    is_active: true,
                    password_created: true,
                    is_deleted: false,
                };

                const { error: empCreateError } = await supabaseAdmin
                    .from('employees')
                    .insert(empInsertData);

                if (empCreateError) {
                    if (empCreateError.code === '42703' || empCreateError.message?.includes('user_id')) {
                        // user_id column not available — insert without it
                        const { user_id: _uid, ...empInsertWithoutUserId } = empInsertData;
                        const { error: fallbackErr } = await supabaseAdmin
                            .from('employees')
                            .insert(empInsertWithoutUserId);
                        if (fallbackErr) {
                            console.warn('Could not create employee record on join (fallback):', fallbackErr.message);
                        }
                    } else if (empCreateError.code === '23505') {
                        // Duplicate email — update the existing row instead
                        console.warn('Employee already exists (unique email conflict), activating...');
                        await supabaseAdmin
                            .from('employees')
                            .update({
                                status: 'active',
                                is_active: true,
                                password_created: true,
                                workspace_id: resolvedWorkspaceId,
                                user_id: userId,
                                updated_at: new Date().toISOString(),
                            })
                            .eq('email', email)
                            .eq('is_deleted', false);
                    } else {
                        // Non-fatal — membership was already created
                        console.warn('Could not create employee record on join:', empCreateError.message);
                    }
                }
            }
        }
    }

    // ── Clean up used OTP ─────────────────────────────────────────────────────
    await supabaseAdmin.from('pending_otps').delete().eq('id', otpRecord.id);

    console.log(`✅ Workspace OTP verified for ${email}`);

    return NextResponse.json({
        success: true,
        message: 'OTP verified. You have joined the workspace!',
    });
}
