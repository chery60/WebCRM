import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendEmail } from '@/lib/email';

// Create a Supabase admin client with service role key (server-side only)
function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
        throw new Error('Missing Supabase URL or Service Role Key');
    }

    return createClient(supabaseUrl, serviceRoleKey, {
        auth: {
            autoRefreshToken: false,
            persistSession: false,
        },
    });
}

// Generate a random 6-digit OTP
function generateOtpCode(): string {
    return Math.floor(100000 + Math.random() * 900000).toString();
}

export async function POST(request: Request) {
    try {
        const { email } = await request.json();

        if (!email) {
            return NextResponse.json({ error: 'Email is required' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();

        // Generate a 6-digit OTP code
        const otpCode = generateOtpCode();
        const expiresAt = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 60 minutes

        // Store OTP in the pending_otps table
        // First, delete any existing OTP for this email
        await supabaseAdmin
            .from('pending_otps')
            .delete()
            .eq('email', email);

        // Insert the new OTP
        const { error: insertError } = await supabaseAdmin
            .from('pending_otps')
            .insert({
                email,
                otp_code: otpCode,
                expires_at: expiresAt,
            });

        if (insertError) {
            console.error('Error storing OTP:', insertError);
            return NextResponse.json({ error: 'Failed to generate OTP' }, { status: 500 });
        }

        // Send the OTP via Nodemailer SMTP
        const html = `
            <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <div style="background-color: #000000; padding: 32px; text-align: center;">
                    <div style="display: inline-block; background-color: #ffffff; width: 48px; height: 48px; border-radius: 12px; line-height: 48px; font-size: 24px; font-weight: bold; color: #000000;">V</div>
                    <h1 style="color: #ffffff; margin: 16px 0 0 0; font-size: 24px; font-weight: 600;">Venture CRM</h1>
                </div>
                <div style="padding: 40px 32px;">
                    <h2 style="margin: 0 0 8px 0; font-size: 22px; color: #1a1a1a;">Verify Your Email Address</h2>
                    <p style="color: #666666; font-size: 15px; margin: 0 0 32px 0;">Enter this verification code to complete your sign up:</p>
                    <div style="text-align: center; margin: 0 0 32px 0;">
                        <div style="display: inline-block; background-color: #f5f5f5; border: 2px dashed #d0d0d0; border-radius: 12px; padding: 20px 40px;">
                            <span style="font-size: 36px; font-weight: 700; letter-spacing: 12px; color: #000000; font-family: 'Courier New', monospace;">${otpCode}</span>
                        </div>
                    </div>
                    <p style="color: #999999; font-size: 13px; margin: 0; text-align: center;">This code expires in 60 minutes. Do not share it with anyone.</p>
                </div>
                <div style="background-color: #fafafa; padding: 20px 32px; border-top: 1px solid #f0f0f0; text-align: center;">
                    <p style="color: #999999; font-size: 12px; margin: 0;">If you didn't create an account on Venture CRM, please ignore this email.</p>
                </div>
            </div>
        `;

        await sendEmail({
            to: email,
            subject: 'Your Venture CRM Verification Code',
            html,
        });

        console.log(`✅ OTP sent to ${email} via Nodemailer`);

        return NextResponse.json({ success: true, message: 'OTP sent successfully' });
    } catch (error) {
        console.error('Error in send-otp endpoint:', error);
        return NextResponse.json({
            error: 'Failed to send OTP',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
