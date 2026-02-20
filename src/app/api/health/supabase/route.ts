import { NextResponse } from 'next/server';
import { checkSupabaseHealth } from '@/lib/supabase/health-check';

/**
 * Health check API endpoint for Supabase
 * GET /api/health/supabase
 */
export async function GET() {
    try {
        const health = await checkSupabaseHealth();
        
        return NextResponse.json(health, {
            status: health.isHealthy ? 200 : 503,
        });
    } catch (error) {
        return NextResponse.json(
            {
                isHealthy: false,
                error: error instanceof Error ? error.message : 'Unknown error',
                timestamp: new Date(),
            },
            { status: 500 }
        );
    }
}
