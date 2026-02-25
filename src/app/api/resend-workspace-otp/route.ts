import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';

// ─── Admin client — bypasses RLS ─────────────────────────────────────────────
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

function generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

// ─── POST /api/resend-workspace-otp ──────────────────────────────────────────
// Resends the workspace access OTP for an existing pending invitation.
// Body: { invitationToken: string }
export async function POST(request: Request) {
    try {
        const { invitationToken } = await request.json();

        if (!invitationToken) {
            return NextResponse.json(
                { error: 'Missing invitationToken' },
                { status: 400 }
            );
        }

        const supabaseAdmin = getSupabaseAdmin();

        // ── 1. Look up the invitation ─────────────────────────────────────────
        const { data: invitation, error: invError } = await supabaseAdmin
            .from('workspace_invitations')
            .select('id, workspace_id, email, role, status, expires_at')
            .eq('token', invitationToken.trim())
            .maybeSingle();

        if (invError) {
            console.error('[resend-workspace-otp] DB error:', invError.message);
            return NextResponse.json({ error: 'Database error' }, { status: 500 });
        }

        if (!invitation) {
            return NextResponse.json({ error: 'Invitation not found' }, { status: 404 });
        }

        if (invitation.status !== 'pending') {
            return NextResponse.json(
                { error: 'This invitation is no longer valid.' },
                { status: 400 }
            );
        }

        if (new Date(invitation.expires_at) < new Date()) {
            return NextResponse.json(
                { error: 'This invitation has expired. Please ask the workspace admin to send a new one.' },
                { status: 400 }
            );
        }

        const { workspace_id: workspaceId, email } = invitation;

        // ── 2. Fetch workspace name ───────────────────────────────────────────
        const { data: ws } = await supabaseAdmin
            .from('workspaces')
            .select('name, icon')
            .eq('id', workspaceId)
            .maybeSingle();

        const workspaceName = ws?.name || 'the workspace';

        // ── 3. Generate new OTP and replace old one ───────────────────────────
        const otpCode = generateOtpCode();
        const expiresAt = invitation.expires_at; // keep same expiry as invitation

        // Delete any existing workspace_invite OTPs for this email + workspace
        await supabaseAdmin
            .from('pending_otps')
            .delete()
            .eq('email', email)
            .eq('workspace_id', workspaceId)
            .eq('type', 'workspace_invite');

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
            console.error('[resend-workspace-otp] OTP insert failed:', otpError.message);
            return NextResponse.json(
                { error: 'Failed to generate new workspace code. Please try again.' },
                { status: 500 }
            );
        }

        // ── 4. Build invitation URL ───────────────────────────────────────────
        const appUrl =
            process.env.NEXT_PUBLIC_APP_URL ||
            process.env.NEXTAUTH_URL ||
            'http://localhost:3000';
        const invitationUrl = `${appUrl}/invitation?token=${invitationToken}`;

        // ── 5. Send email ─────────────────────────────────────────────────────
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
            <h2 style="margin:0 0 8px 0;font-size:22px;color:#1a1a1a;">Your new workspace access code</h2>
            <p style="color:#666;font-size:15px;margin:0 0 28px 0;">
              Here is your new 6-digit code to join <strong>${workspaceName}</strong> on Venture CRM.
            </p>

            <!-- OTP -->
            <div style="background:#f5f5f5;border:2px dashed #d0d0d0;border-radius:12px;padding:28px;text-align:center;margin:0 0 28px 0;">
              <p style="color:#666;font-size:13px;margin:0 0 16px 0;">Your workspace access code:</p>
              <span style="font-size:40px;font-weight:700;letter-spacing:14px;color:#000;font-family:'Courier New',monospace;">${otpCode}</span>
              <p style="color:#999;font-size:12px;margin:16px 0 0 0;">⏱ This code expires with your invitation link.</p>
            </div>

            <!-- Link -->
            <div style="text-align:center;margin:0 0 28px 0;">
              <a href="${invitationUrl}" style="display:inline-block;background:#000;color:#fff;padding:14px 32px;text-decoration:none;border-radius:8px;font-weight:600;font-size:16px;">Open Invitation →</a>
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
            <p style="color:#999;font-size:12px;margin:0;">If you didn't request this, you can safely ignore this email.</p>
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
                subject: `Your new workspace access code for ${workspaceName}`,
                html,
            });
            emailSent = true;
            console.log(`✅ [resend-workspace-otp] Resent OTP email to ${email}`);
        } catch (emailError) {
            console.warn('[resend-workspace-otp] Failed to send email:', emailError);
        }

        // Always log to console for dev access
        console.log(`\n${'='.repeat(50)}`);
        console.log(`RESENT OTP FOR: ${email}`);
        console.log(`WORKSPACE:      ${workspaceName}`);
        console.log(`OTP CODE:       ${otpCode}`);
        console.log(`${'='.repeat(50)}\n`);

        return NextResponse.json({
            success: true,
            emailSent,
            message: emailSent
                ? `A new workspace code has been sent to ${email}`
                : `Code regenerated. Email not sent (SMTP not configured).`,
        });
    } catch (error) {
        console.error('[resend-workspace-otp] Unhandled error:', error);
        return NextResponse.json(
            {
                error: 'Failed to resend workspace code',
                message: error instanceof Error ? error.message : 'Unknown error',
            },
            { status: 500 }
        );
    }
}
