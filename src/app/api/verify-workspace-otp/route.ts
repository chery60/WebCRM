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

        // Look up OTP — try with workspace_id column first, fall back gracefully
        let otpRecord: any = null;

        // Query by email + otp_code (workspace_id column may or may not exist)
        const { data: records, error: lookupError } = await supabaseAdmin
            .from('pending_otps')
            .select('*')
            .eq('email', email)
            .eq('otp_code', otp)
            .order('created_at', { ascending: false })
            .limit(1);

        if (lookupError) {
            console.error('OTP lookup error:', lookupError);
            return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 });
        }

        otpRecord = records?.[0] || null;

        if (!otpRecord) {
            return NextResponse.json({ error: 'Invalid OTP code. Please check the code from your invitation email.' }, { status: 400 });
        }

        // Check expiry
        if (new Date(otpRecord.expires_at) < new Date()) {
            await supabaseAdmin.from('pending_otps').delete().eq('id', otpRecord.id);
            return NextResponse.json({ error: 'OTP has expired. Please ask the workspace admin to resend the invitation.' }, { status: 400 });
        }

        // If we have an invitationToken and userId, accept the workspace invitation now
        if (invitationToken && userId) {
            // Find the workspace invitation
            const { data: invitation, error: invError } = await supabaseAdmin
                .from('workspace_invitations')
                .select('*')
                .eq('token', invitationToken)
                .eq('status', 'pending')
                .single();

            if (invError || !invitation) {
                // Invitation might already be accepted or token is wrong — not a hard error
                console.warn('Workspace invitation not found or already accepted:', invError?.message);
            } else {
                // Check invitation expiry
                if (new Date(invitation.expires_at) < new Date()) {
                    await supabaseAdmin
                        .from('workspace_invitations')
                        .update({ status: 'expired' })
                        .eq('id', invitation.id);
                    return NextResponse.json({ error: 'The workspace invitation has expired. Please ask the admin to send a new one.' }, { status: 400 });
                }

                // Check if membership already exists
                const { data: existingMembership } = await supabaseAdmin
                    .from('workspace_memberships')
                    .select('id')
                    .eq('workspace_id', invitation.workspace_id)
                    .eq('user_id', userId)
                    .eq('status', 'active')
                    .maybeSingle();

                if (!existingMembership) {
                    // Create membership
                    const { error: membershipError } = await supabaseAdmin
                        .from('workspace_memberships')
                        .insert({
                            workspace_id: invitation.workspace_id,
                            user_id: userId,
                            role: invitation.role,
                            joined_at: new Date().toISOString(),
                            invited_by: invitation.invited_by,
                            status: 'active',
                        });

                    if (membershipError) {
                        console.error('Error creating membership:', membershipError);
                        return NextResponse.json({ error: 'Failed to join workspace. Please try again.' }, { status: 500 });
                    }
                }

                // Mark invitation as accepted
                await supabaseAdmin
                    .from('workspace_invitations')
                    .update({ status: 'accepted' })
                    .eq('id', invitation.id);

                // Update employee record status if exists
                await supabaseAdmin
                    .from('employees')
                    .update({ status: 'active', updated_at: new Date().toISOString() })
                    .eq('email', email)
                    .eq('workspace_id', invitation.workspace_id);
            }
        }

        // Clean up used OTP
        await supabaseAdmin.from('pending_otps').delete().eq('id', otpRecord.id);

        console.log(`✅ Workspace OTP verified for ${email}`);

        return NextResponse.json({
            success: true,
            message: 'OTP verified. You have joined the workspace!',
        });
    } catch (error) {
        console.error('Error in verify-workspace-otp endpoint:', error);
        return NextResponse.json({
            error: 'Verification failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
