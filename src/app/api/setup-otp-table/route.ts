import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
    try {
        const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
        const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

        if (!supabaseUrl || !serviceRoleKey) {
            return NextResponse.json({ error: 'Missing config' }, { status: 500 });
        }

        // Use the REST Data API with service role to create a test entry
        // If the table doesn't exist, we'll get a specific error
        const supabase = createClient(supabaseUrl, serviceRoleKey, {
            auth: { autoRefreshToken: false, persistSession: false },
            db: { schema: 'public' },
        });

        // Try to query the table first
        const { error: checkError } = await supabase.from('pending_otps').select('id').limit(1);

        if (checkError && checkError.message.includes('pending_otps')) {
            // Table doesn't exist - need to create it via SQL editor
            // The Supabase REST API can't run DDL, so we provide the SQL
            return NextResponse.json({
                status: 'table_missing',
                message: 'Please run this SQL in your Supabase Dashboard SQL Editor:',
                sql: `CREATE TABLE IF NOT EXISTS pending_otps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email TEXT NOT NULL,
    otp_code TEXT NOT NULL,
    expires_at TIMESTAMPTZ NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_pending_otps_email ON pending_otps(email);
ALTER TABLE pending_otps ENABLE ROW LEVEL SECURITY;`
            });
        }

        return NextResponse.json({ status: 'ok', message: 'pending_otps table exists' });
    } catch (error) {
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error'
        }, { status: 500 });
    }
}
