# Supabase Email Verification Guide

## Current Situation

After signup, you're seeing: **"We sent a verification link to your email. Please verify to continue."**

This is the **expected behavior** from Supabase. However, you're not receiving emails because:

1. **Supabase requires email provider configuration** to send actual emails
2. In development mode, Supabase uses **Inbucket** (a local email testing service)
3. Without proper configuration, emails won't be delivered

---

## Solutions (Choose One)

### **Option 1: Disable Email Confirmation (Development Only)** ⚡ QUICKEST

**Best for:** Local development and testing

**Steps:**
1. Go to your Supabase Dashboard
2. Navigate to **Authentication → Settings**
3. Find **"Enable email confirmations"**
4. **Turn it OFF**
5. Users can now sign up and log in immediately without email verification

**Pros:**
- ✅ Instant signup without email verification
- ✅ No email configuration needed
- ✅ Perfect for development

**Cons:**
- ⚠️ **NOT recommended for production** (security risk)

---

### **Option 2: Use Supabase Inbucket (Development)** 📧 RECOMMENDED FOR DEV

**Best for:** Testing email flows locally

**Steps:**
1. Go to your Supabase Dashboard
2. Navigate to **Authentication → Settings**
3. Scroll to **"Inbucket Email"** section
4. You'll see a link like: `https://inbucket-YOUR-PROJECT.supabase.co`
5. Click it to access all test emails sent by Supabase

**How to use:**
1. Sign up with any email (e.g., `test@example.com`)
2. Open Inbucket URL
3. Check the inbox for `test@example.com`
4. Click the verification link

**Pros:**
- ✅ Tests full email flow
- ✅ No external email service needed
- ✅ Great for development

**Cons:**
- ⚠️ Only works in Supabase cloud (not self-hosted)

---

### **Option 3: Configure SMTP Email Provider (Production)** 📮 PRODUCTION READY

**Best for:** Production deployment

**Popular providers:**
- **SendGrid** (free tier: 100 emails/day)
- **Resend** (free tier: 3,000 emails/month)
- **AWS SES**
- **Mailgun**
- **Postmark**

**Steps:**
1. Sign up for an email provider (e.g., Resend, SendGrid)
2. Get SMTP credentials
3. Go to Supabase Dashboard → **Authentication → Settings**
4. Scroll to **"SMTP Settings"**
5. Enable **"Enable Custom SMTP"**
6. Enter your SMTP details:
   - Host
   - Port
   - User
   - Password
   - Sender email
   - Sender name

**Pros:**
- ✅ Real emails sent to users
- ✅ Production-ready
- ✅ Professional email branding

**Cons:**
- ⚠️ Requires third-party service
- ⚠️ May have cost (most have free tiers)

---

## Quick Fix for Development

If you just want to test the app quickly, I recommend:

### **Disable Email Confirmation:**

1. Open Supabase Dashboard
2. Go to **Authentication** → **Settings**
3. Under **Email Auth**, toggle **OFF**: "Enable email confirmations"
4. Save changes
5. Try signing up again!

---

## Alternative: Auto-Confirm Emails in Code

You can also modify the signup to auto-confirm for specific test emails:

```typescript
const { data, error } = await supabase.auth.signUp({
    email: userData.email,
    password: userData.password || '',
    options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: {
            name: userData.name,
            avatar: userData.avatar,
        },
    },
});
```

---

## Checking Email Confirmation Status

To verify if email confirmation is enabled:

1. Go to Supabase Dashboard
2. **Authentication** → **Settings**
3. Look for **"Enable email confirmations"** toggle

---

## Summary

| Option | Speed | Best For | Emails Sent? |
|--------|-------|----------|--------------|
| **Disable confirmation** | ⚡ Instant | Local dev | ❌ No |
| **Inbucket** | 🚀 Fast | Testing flows | ✅ Test inbox |
| **SMTP Provider** | ⏱️ Setup required | Production | ✅ Real emails |

**My Recommendation:** 
- Development: **Disable email confirmation**
- Before production: **Set up SMTP provider (Resend/SendGrid)**

