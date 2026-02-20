# Supabase Configuration Guide

## Environment Variables

Your `.env.local` file **MUST** contain valid Supabase credentials:

```bash
# Supabase Configuration
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

## Getting Your Supabase Credentials

1. Go to https://supabase.com/dashboard
2. Select your project
3. Go to Settings → API
4. Copy:
   - `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
   - `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role` key → `SUPABASE_SERVICE_ROLE_KEY`

⚠️ **IMPORTANT**: The anon key MUST be a valid JWT token starting with `eyJ`

## Common Errors

### "Failed to fetch" Error

**Cause**: Invalid API key or network connectivity issues

**Solutions**:
1. Verify your `NEXT_PUBLIC_SUPABASE_ANON_KEY` is a valid JWT token
2. Check that `NEXT_PUBLIC_SUPABASE_URL` is correct
3. Ensure your Supabase project is active
4. Check your internet connection

### Invalid API Key

**Cause**: The anon key in your `.env.local` is not valid

**Solution**: 
- Get a fresh anon key from your Supabase dashboard
- Ensure you're copying the full JWT token (starts with `eyJ`)
- Restart your Next.js dev server after updating `.env.local`

## Testing Your Configuration

Run this in your browser console on any page:

```javascript
// Quick config check
import { quickHealthCheck } from '@/lib/supabase/health-check';
quickHealthCheck().then(console.log);

// Full health check
import { checkSupabaseHealth } from '@/lib/supabase/health-check';
checkSupabaseHealth().then(console.log);
```

## Error Handling

All Supabase operations now include:
- ✅ Automatic retry with exponential backoff
- ✅ Graceful degradation on network errors
- ✅ Configuration validation on startup
- ✅ Detailed error logging

## Support

If you continue to see errors:
1. Check the browser console for detailed error messages
2. Verify your Supabase project is active and not paused
3. Ensure all environment variables are set correctly
4. Restart your development server
