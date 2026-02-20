# Configure Custom SMTP in Supabase

## Why You Need This
Supabase's default email service often gets blocked by Gmail, Outlook, and other providers. To ensure OTP emails reach users' inboxes, you need to configure Custom SMTP.

## Steps

### 1. Choose an Email Provider
Pick one of these SMTP providers (all have free tiers):
- **Resend** (recommended, easiest setup) - https://resend.com
- **SendGrid** - https://sendgrid.com
- **Postmark** - https://postmarkapp.com
- **Amazon SES** - https://aws.amazon.com/ses

### 2. Get SMTP Credentials
For example, with **Resend**:
1. Sign up at https://resend.com
2. Go to **API Keys** → Create API Key
3. Add a verified domain (or use Resend's sandbox for testing)

### 3. Configure in Supabase
1. Go to **Supabase Dashboard** → **Authentication** → **Settings**
2. Scroll to **SMTP Settings**
3. Enable **Custom SMTP**
4. Fill in the credentials:

#### For Resend:
- **SMTP Host**: `smtp.resend.com`
- **SMTP Port**: `465` (or `587`)
- **SMTP Username**: `resend`
- **SMTP Password**: Your Resend API key
- **Sender Email**: Your verified email (e.g., `noreply@yourdomain.com`)
- **Sender Name**: Your App Name

#### For SendGrid:
- **SMTP Host**: `smtp.sendgrid.net`
- **SMTP Port**: `587`
- **SMTP Username**: `apikey`
- **SMTP Password**: Your SendGrid API key
- **Sender Email**: Your verified email
- **Sender Name**: Your App Name

### 4. Test It
1. Save the SMTP settings in Supabase
2. Try signing up with a new email address
3. Check your actual inbox - the OTP should arrive!

## Alternative: Use Supabase Email Logs (Development Only)
For testing during development:
1. Sign up with any email
2. Go to **Supabase Dashboard** → **Authentication** → **Email Logs**
3. Find your email and copy the OTP code
4. Use it to verify your account

**Note**: This only works for you (the admin). Real users won't have access to the logs.

## Verification
After setting up SMTP, run another test signup and check:
- ✅ Email appears in Supabase Email Logs
- ✅ Email arrives in your actual inbox
- ✅ OTP code works for verification
