import nodemailer from 'nodemailer';

interface SendEmailParams {
    to: string;
    subject: string;
    html: string;
}

// Create transporter fresh each time so env vars are always read correctly.
// A module-level singleton would cache a broken transporter if env vars
// weren't available at import time (common in Next.js dev mode).
function createTransporter() {
    const host = process.env.SMTP_HOST;
    const port = parseInt(process.env.SMTP_PORT || '587');
    const user = process.env.SMTP_USER;
    // Gmail App Passwords are 16 chars with optional spaces — strip all spaces
    const pass = process.env.SMTP_PASSWORD?.replace(/\s+/g, '');
    const secure = process.env.SMTP_SECURE === 'true'; // true only for port 465

    return nodemailer.createTransport({
        host,
        port,
        secure,
        auth: { user, pass },
        // Required for Gmail on port 587 (STARTTLS)
        tls: {
            rejectUnauthorized: false,
        },
    });
}

export async function sendEmail({ to, subject, html }: SendEmailParams) {
    const host = process.env.SMTP_HOST;
    const user = process.env.SMTP_USER;
    const pass = process.env.SMTP_PASSWORD?.replace(/\s+/g, '');

    if (!host || !user || !pass) {
        console.warn('[email] SMTP credentials not configured — email not sent.');
        console.log('[email] To:', to);
        console.log('[email] Subject:', subject);
        // Throw so the caller knows email wasn't sent
        throw new Error('SMTP credentials not configured');
    }

    const transporter = createTransporter();

    try {
        const from = process.env.SMTP_FROM || `"Venture CRM" <${user}>`;
        const info = await transporter.sendMail({ from, to, subject, html });
        console.log('[email] ✅ Message sent:', info.messageId);
        return info;
    } catch (error: any) {
        console.error('[email] ❌ Failed to send email:', error?.message || error);
        throw error;
    }
}
