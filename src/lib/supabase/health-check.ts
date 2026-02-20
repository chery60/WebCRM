/**
 * Supabase Health Check Utility
 * Provides health check functionality for Supabase connection
 */

import { getSupabaseClient } from './client';
import { validateSupabaseConfig } from './error-handler';

export interface HealthCheckResult {
    isHealthy: boolean;
    checks: {
        config: { passed: boolean; message: string };
        connection: { passed: boolean; message: string };
        auth: { passed: boolean; message: string };
    };
    timestamp: Date;
}

/**
 * Perform a comprehensive health check of Supabase
 */
export async function checkSupabaseHealth(): Promise<HealthCheckResult> {
    const result: HealthCheckResult = {
        isHealthy: true,
        checks: {
            config: { passed: false, message: '' },
            connection: { passed: false, message: '' },
            auth: { passed: false, message: '' },
        },
        timestamp: new Date(),
    };

    // Check 1: Configuration
    try {
        const validation = validateSupabaseConfig();
        result.checks.config.passed = validation.isValid;
        result.checks.config.message = validation.isValid
            ? 'Configuration is valid'
            : `Configuration errors: ${validation.errors.join(', ')}`;
    } catch (error) {
        result.checks.config.message = `Configuration check failed: ${error}`;
    }

    // Check 2: Connection
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('users')
            .select('count')
            .limit(1)
            .single();

        result.checks.connection.passed = !error || error.code === 'PGRST116';
        result.checks.connection.message = result.checks.connection.passed
            ? 'Connection successful'
            : `Connection failed: ${error?.message}`;
    } catch (error) {
        result.checks.connection.message = `Connection check failed: ${error}`;
    }

    // Check 3: Auth
    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase.auth.getSession();

        result.checks.auth.passed = !error;
        result.checks.auth.message = error
            ? `Auth check failed: ${error.message}`
            : data.session
            ? 'Auth session active'
            : 'No active session';
    } catch (error) {
        result.checks.auth.message = `Auth check failed: ${error}`;
    }

    // Overall health
    result.isHealthy = Object.values(result.checks).every((check) => check.passed);

    return result;
}

/**
 * Quick health check (config only, no network calls)
 */
export function quickHealthCheck(): { isHealthy: boolean; message: string } {
    const validation = validateSupabaseConfig();
    return {
        isHealthy: validation.isValid,
        message: validation.isValid
            ? 'Supabase is configured correctly'
            : `Configuration issues: ${validation.errors.join(', ')}`,
    };
}
