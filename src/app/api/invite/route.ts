import { NextResponse } from 'next/server';
import { sendEmail } from '@/lib/email';
import { createSupabaseServerClient } from '@/lib/supabase/server';

export async function POST(request: Request) {
    try {
        const { email, name, signupUrl, senderName } = await request.json();

        // Basic authorization check
        const supabase = await createSupabaseServerClient();
        const { data: { user } } = await supabase.auth.getUser();

        if (!user) {
            console.error('Unauthorized: No user session found');
            return NextResponse.json({ 
                error: 'Unauthorized',
                message: 'User not authenticated. Please sign in and try again.'
            }, { status: 401 });
        }

        const html = `
            <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
                <h2>You've been invited to join Venture CRM</h2>
                <p>Hello ${name},</p>
                <p>${senderName} has invited you to join their workspace on Venture CRM.</p>
                <p>Click the button below to accept the invitation and set up your account:</p>
                <div style="text-align: center; margin: 30px 0;">
                    <a href="${signupUrl}" style="display: inline-block; background-color: #000; color: #fff; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">Accept Invitation</a>
                </div>
                <p style="color: #666; font-size: 14px;">or copy and paste this link into your browser:</p>
                <p style="font-size: 14px;"><a href="${signupUrl}">${signupUrl}</a></p>
                <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;" />
                <p style="color: #999; font-size: 12px;">If you didn't expect this invitation, you can ignore this email.</p>
            </div>
        `;

        // Try to send email, but don't fail if SMTP is not configured
        try {
            await sendEmail({
                to: email,
                subject: `Invitation to join Venture CRM`,
                html,
            });
            
            console.log(`Invitation email sent to ${email}`);
            return NextResponse.json({ 
                success: true,
                emailSent: true 
            });
        } catch (emailError) {
            // Email failed, but that's okay - invitation is already in the database
            console.warn('Failed to send invitation email (SMTP may not be configured):', emailError);
            console.log(`\n=== INVITATION LINK FOR ${email} ===`);
            console.log(signupUrl);
            console.log('=====================================\n');
            
            return NextResponse.json({ 
                success: true,
                emailSent: false,
                invitationUrl: signupUrl,
                message: 'Employee added successfully. Email service not configured - share the invitation link manually.'
            });
        }
    } catch (error) {
        console.error('Error in invitation endpoint:', error);
        return NextResponse.json({ 
            error: 'Failed to process invitation',
            message: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
