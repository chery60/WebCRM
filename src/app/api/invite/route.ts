import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { createClient } from '@supabase/supabase-js';
import { nanoid } from 'nanoid';

// ─── Admin client — bypasses RLS, no session needed ──────────────────────────
function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY');
    }
    return createClient(supabaseUrl, serviceRoleKey, {
        auth: { autoRefreshToken: false, persistSession: false },
    });
}

// Generate a random 6-digit OTP
function generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── POST /api/invite ─────────────────────────────────────────────────────────
// Called by employee-store.sendInvitation()
// Receives: { email, name, senderName, workspaceId, workspaceName, employeeId }
// Does everything server-side:
//   1. Upsert workspace_invitation (creates token)
//   2. Upsert workspace OTP in pending_otps
//   3. Send invitation email with link + OTP
//   Returns: { success, emailSent, invitationUrl, token }
export async function POST(request: Request) {
    try {
        const {
            email,
            name,
            senderName,
            workspaceId,
            workspaceName,
            employeeId,
            invitedBy,
        } = await request.json();

        if (!email || !workspaceId) {
            return NextResponse.json(
                { error: 'Missing required fields: email and workspaceId' },
                { status: 400 }
            );
        }

        const supabaseAdmin = getSupabaseAdmin();

        // ── 0. Resolve invitedBy ───────────────────────────────────────────────
        // invited_by is NOT NULL in workspace_invitations schema.
        // If caller didn't pass it, find the workspace owner/admin as fallback.
        let resolvedInvitedBy = invitedBy;
        if (!resolvedInvitedBy) {
            const { data: ownerMembership } = await supabaseAdmin
                .from('workspace_memberships')
                .select('user_id')
                .eq('workspace_id', workspaceId)
                .in('role', ['owner', 'admin'])
                .limit(1)
                .maybeSingle();
            resolvedInvitedBy = ownerMembership?.user_id;
        }

        if (!resolvedInvitedBy) {
            console.error('[invite] Could not determine invitedBy user ID for workspace:', workspaceId);
            return NextResponse.json(
                { error: 'Could not determine the inviting user. Please try again.' },
                { status: 400 }
            );
        }

        // ── 1. Create / refresh the workspace invitation ──────────────────────
        // Cancel any existing pending invitation for this email + workspace first
        await supabaseAdmin
            .from('workspace_invitations')
            .update({ status: 'cancelled' })
            .eq('workspace_id', workspaceId)
            .eq('email', email)
            .eq('status', 'pending');

        const invitationToken = nanoid(32);
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

        // Look up workspace name server-side (avoid client-side Supabase auth issues)
        let resolvedWorkspaceName = workspaceName || '';
        if (!resolvedWorkspaceName) {
            const { data: ws } = await supabaseAdmin
                .from('workspaces')
                .select('name')
                .eq('id', workspaceId)
                .single();
            resolvedWorkspaceName = ws?.name || 'the workspace';
        }

        const { data: invitation, error: invError } = await supabaseAdmin
            .from('workspace_invitations')
            .insert({
                workspace_id: workspaceId,
                email,
                token: invitationToken,
                invited_by: resolvedInvitedBy,
                role: 'member',
                expires_at: expiresAt,
                status: 'pending',
            })
            .select()
            .single();

        if (invError || !invitation) {
            console.error('[invite] Failed to create workspace invitation:', invError?.message);
            return NextResponse.json(
                { error: 'Failed to create workspace invitation', details: invError?.message },
                { status: 500 }
            );
        }

        // ── 2. Generate and store workspace-access OTP ────────────────────────
        const otpCode = generateOtpCode();

        // Delete any existing workspace_invite OTPs for this email+workspace
        // Try with type filter first, fall back to just email if type column doesn't exist
        try {
            await supabaseAdmin
                .from('pending_otps')
                .delete()
                .eq('email', email)
                .eq('type', 'workspace_invite');
        } catch {
            // type column may not exist — delete all OTPs for this email as fallback
            await supabaseAdmin
                .from('pending_otps')
                .delete()
                .eq('email', email);
        }

        // Insert new workspace invite OTP
        let otpInserted = false;

        // Try full insert with workspace_id and type columns
        const { error: otpError } = await supabaseAdmin
            .from('pending_otps')
            .insert({
                email,
                otp_code: otpCode,
                expires_at: expiresAt,
                workspace_id: workspaceId,
                type: 'workspace_invite',
            });

        if (otpError) {
            console.error('[invite] OTP insert failed (full):', otpError.message, otpError.code);
            // If columns don't exist, try without workspace_id and type
            if (otpError.code === '42703' || otpError.message?.includes('column') || otpError.message?.includes('workspace_id') || otpError.message?.includes('type')) {
                const { error: fallbackOtpError } = await supabaseAdmin
                    .from('pending_otps')
                    .insert({
                        email,
                        otp_code: otpCode,
                        expires_at: expiresAt,
                    });
                if (fallbackOtpError) {
                    console.error('[invite] OTP insert failed (fallback):', fallbackOtpError.message);
                } else {
                    otpInserted = true;
                    console.log('[invite] OTP inserted without workspace_id/type (migration pending)');
                }
            }
        } else {
            otpInserted = true;
        }

        // ── 3. Build the invitation URL ───────────────────────────────────────
        const appUrl = process.env.NEXT_PUBLIC_APP_URL ||
            process.env.NEXTAUTH_URL ||
            'http://localhost:3000';
        const invitationUrl = `${appUrl}/invitation?token=${invitationToken}`;
        const displayWorkspace = resolvedWorkspaceName;
        const displayName = name || email;

        // ── 4. Send invitation email ──────────────────────────────────────────
        const html = `
<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#f5f5f5;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#f5f5f5;padding:40px 16px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,0.1);max-width:600px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="background:#000000;padding:32px;text-align:center;">
            <div style="display:inline-block;background:#ffffff;width:48px;height:48px;border-radius:12px;line-height:48px;font-size:24px;font-weight:bold;color:#000;text-align:center;">V</div>
            <h1 style="color:#ffffff;margin:16px 0 0 0;font-size:24px;font-weight:600;">Venture CRM</h1>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:40px 32px;">
            <h2 style="margin:0 0 8px 0;font-size:22px;color:#1a1a1a;">You've been invited to join ${displayWorkspace}!</h2>
            <p style="color:#666;font-size:15px;margin:0 0 28px 0;">
              Hello <strong>${displayName}</strong>, <strong>${senderName || 'A workspace admin'}</strong> has invited you to join their workspace on Venture CRM.
            </p>

            <!-- Step 1: Accept link -->
            <p style="color:#333;font-size:15px;font-weight:600;margin:0 0 12px 0;">Step 1 — Click to accept the invitation:</p>
            <div style="text-align:center;margin:0 0 32px 0;">
              <a href="${invitationUrl}" style="display:inline-block;background:#000;color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Accept Invitation →</a>
            </div>

            <!-- Step 2: OTP -->
            <p style="color:#333;font-size:15px;font-weight:600;margin:0 0 12px 0;">Step 2 — Enter this workspace access code:</p>
            <div style="background:#f5f5f5;border:2px dashed #d0d0d0;border-radius:12px;padding:28px;text-align:center;margin:0 0 28px 0;">
              <p style="color:#666;font-size:13px;margin:0 0 16px 0;">Your one-time workspace access code:</p>
              <span style="font-size:40px;font-weight:700;letter-spacing:14px;color:#000;font-family:'Courier New',monospace;">${otpCode}</span>
              <p style="color:#999;font-size:12px;margin:16px 0 0 0;">⏱ This code expires in 7 days.</p>
            </div>

            <p style="color:#999;font-size:13px;text-align:center;margin:0;">
              Or copy this link:<br>
              <a href="${invitationUrl}" style="color:#000;word-break:break-all;">${invitationUrl}</a>
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="background:#fafafa;padding:20px 32px;border-top:1px solid #f0f0f0;text-align:center;">
            <p style="color:#999;font-size:12px;margin:0;">If you didn't expect this invitation, you can safely ignore this email.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

        let emailSent = false;
        try {
            await sendEmail({
                to: email,
                subject: `You're invited to join ${displayWorkspace} on Venture CRM`,
                html,
            });
            emailSent = true;
            console.log(`✅ [invite] Invitation email sent to ${email}`);
        } catch (emailError) {
            console.warn('[invite] Failed to send email (SMTP may not be configured):', emailError);
        }

        // Always log to console so dev can access it without email
        console.log(`\n${'='.repeat(50)}`);
        console.log(`INVITATION FOR: ${email}`);
        console.log(`WORKSPACE:      ${displayWorkspace}`);
        console.log(`LINK:           ${invitationUrl}`);
        if (otpInserted) console.log(`OTP CODE:       ${otpCode}`);
        console.log(`${'='.repeat(50)}\n`);

        return NextResponse.json({
            success: true,
            emailSent,
            invitationUrl,
            token: invitationToken,
            otp: otpInserted ? otpCode : undefined,
            message: emailSent
                ? `Invitation email sent to ${email}`
                : `Employee added. Email not sent (SMTP not configured). Share link and OTP manually.`,
        });

    } catch (error) {
        console.error('[invite] Unhandled error:', error);
        return NextResponse.json(
            {
                error: 'Failed to process invitation',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
