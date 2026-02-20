import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

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

export async function POST(request: Request) {
    try {
        const { email, otp } = await request.json();

        if (!email || !otp) {
            return NextResponse.json({ error: 'Email and OTP are required' }, { status: 400 });
        }

        const supabaseAdmin = getSupabaseAdmin();

        // Look up the OTP in the pending_otps table
        const { data: otpRecord, error: lookupError } = await supabaseAdmin
            .from('pending_otps')
            .select('*')
            .eq('email', email)
            .eq('otp_code', otp)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

        if (lookupError || !otpRecord) {
            return NextResponse.json({ error: 'Invalid OTP code' }, { status: 400 });
        }

        // Check if OTP has expired
        if (new Date(otpRecord.expires_at) < new Date()) {
            // Clean up expired OTP
            await supabaseAdmin
                .from('pending_otps')
                .delete()
                .eq('id', otpRecord.id);

            return NextResponse.json({ error: 'OTP has expired. Please request a new one.' }, { status: 400 });
        }

        // OTP is valid — confirm the user's email via admin API
        // Find the user by email
        const { data: userList, error: userListError } = await supabaseAdmin.auth.admin.listUsers();

        if (userListError) {
            console.error('Error listing users:', userListError);
            return NextResponse.json({ error: 'Verification failed' }, { status: 500 });
        }

        const authUser = userList.users.find((u: { email?: string }) => u.email === email);

        if (!authUser) {
            return NextResponse.json({ error: 'User not found' }, { status: 404 });
        }

        // Confirm the user's email
        const { error: confirmError } = await supabaseAdmin.auth.admin.updateUserById(
            authUser.id,
            { email_confirm: true }
        );

        if (confirmError) {
            console.error('Error confirming user email:', confirmError);
            return NextResponse.json({ error: 'Failed to verify email' }, { status: 500 });
        }

        // Clean up used OTP
        await supabaseAdmin
            .from('pending_otps')
            .delete()
            .eq('email', email);

        console.log(`✅ Email verified for ${email}`);

        return NextResponse.json({
            success: true,
            userId: authUser.id,
            message: 'Email verified successfully',
        });
    } catch (error) {
        console.error('Error in verify-otp endpoint:', error);
        return NextResponse.json({
            error: 'Verification failed',
            message: error instanceof Error ? error.message : 'Unknown error',
        }, { status: 500 });
    }
}
