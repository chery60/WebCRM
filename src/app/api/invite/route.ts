import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { createClient } from '@supabase/supabase-js';

// Use service-role client so this route works regardless of cookie session
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

// Generate a random 6-digit OTP
function generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
    try {
        const { email, name, signupUrl, senderName, workspaceId, workspaceName } = await request.json();

        if (!email || !signupUrl) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        // Generate a workspace-access OTP and store it
        const otpCode = generateOtpCode();
        const expiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days

        const supabaseAdmin = getSupabaseAdmin();

        // Delete any existing OTP for this email + workspace combo
        await supabaseAdmin
            .from('pending_otps')
            .delete()
            .eq('email', email)
            .eq('workspace_id', workspaceId || null);

        // Store the new workspace-access OTP
        const { error: insertError } = await supabaseAdmin
            .from('pending_otps')
            .insert({
                email,
                otp_code: otpCode,
                expires_at: expiresAt,
                workspace_id: workspaceId || null,
            });

        if (insertError) {
            // If workspace_id column doesn't exist yet, fall back without it
            console.warn('OTP insert with workspace_id failed, trying without:', insertError.message);
            await supabaseAdmin.from('pending_otps').delete().eq('email', email);
            await supabaseAdmin.from('pending_otps').insert({
                email,
                otp_code: otpCode,
                expires_at: expiresAt,
            });
        }

        const displayWorkspace = workspaceName || 'the workspace';

        const html = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background-color: #000000; padding: 32px; text-align: center;">
                    <div style="display: inline-block; background-color: #ffffff; width: 48px; height: 48px; border-radius: 12px; line-height: 48px; font-size: 24px; font-weight: bold; color: #000000; text-align: center;">V</div>
                    <h1 style="color: #ffffff; margin: 16px 0 0 0; font-size: 24px; font-weight: 600;">Venture CRM</h1>
                </div>
                <div style="padding: 40px 32px;">
                    <h2 style="margin: 0 0 8px 0; font-size: 22px; color: #1a1a1a;">You've been invited to join ${displayWorkspace}</h2>
                    <p style="color: #666666; font-size: 15px; margin: 0 0 24px 0;">Hello ${name}, <strong>${senderName}</strong> has invited you to join their workspace on Venture CRM.</p>
                    
                    <p style="color: #333333; font-size: 15px; margin: 0 0 12px 0;">Click the button below to accept the invitation:</p>
                    <div style="text-align: center; margin: 0 0 32px 0;">
                        <a href="${signupUrl}" style="display: inline-block; background-color: #000000; color: #ffffff; padding: 14px 32px; text-decoration: none; border-radius: 8px; font-weight: 600; font-size: 16px;">Accept Invitation</a>
                    </div>

                    <div style="background-color: #f5f5f5; border: 2px dashed #d0d0d0; border-radius: 12px; padding: 24px; text-align: center; margin: 0 0 24px 0;">
                        <p style="color: #666666; font-size: 14px; margin: 0 0 12px 0;">After signing in, enter this workspace access code:</p>
                        <span style="font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #000000; font-family: 'Courier New', monospace;">${otpCode}</span>
                        <p style="color: #999999; font-size: 12px; margin: 12px 0 0 0;">This code expires in 7 days.</p>
                    </div>

                    <p style="color: #999999; font-size: 13px; margin: 0; text-align: center;">or copy and paste this link: <a href="${signupUrl}" style="color: #000000;">${signupUrl}</a></p>
                </div>
                <div style="background-color: #fafafa; padding: 20px 32px; border-top: 1px solid #f0f0f0; text-align: center;">
                    <p style="color: #999999; font-size: 12px; margin: 0;">If you didn't expect this invitation, you can safely ignore this email.</p>
                </div>
            </div>
        `;

        // Try to send email
        try {
            await sendEmail({
                to: email,
                subject: `You're invited to join ${displayWorkspace} on Venture CRM`,
                html,
            });

            console.log(`✅ Invitation email sent to ${email} with OTP: ${otpCode}`);
            return NextResponse.json({
                success: true,
                emailSent: true,
            });
        } catch (emailError) {
            console.warn('Failed to send invitation email (SMTP may not be configured):', emailError);
            console.log(`\n=== INVITATION FOR ${email} ===`);
            console.log(`Link: ${signupUrl}`);
            console.log(`OTP:  ${otpCode}`);
            console.log('================================\n');

            return NextResponse.json({
                success: true,
                emailSent: false,
                invitationUrl: signupUrl,
                otp: otpCode,
                message: 'Employee added. Email service not configured — share the link and OTP manually.',
            });
        }
    } catch (error) {
        console.error('Error in invitation endpoint:', error);
        return NextResponse.json({
            error: 'Failed to process invitation',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
