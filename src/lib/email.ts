import nodemailer from 'nodemailer';

interface SendEmailParams {
    to: string;
    subject: string;
    html: string;
}

const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASSWORD?.replace(/\s+/g, ''),
    },
});

export async function sendEmail({ to, subject, html }: SendEmailParams) {
    if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASSWORD) {
        console.warn('SMTP credentials not configured. Email not sent.');
        console.log('=== EMAIL CONTENT (Missing SMTP Config) ===');
        console.log(`To: ${to}`);
        console.log(`Subject: ${subject}`);
        console.log('==========================================');
        return { messageId: 'simulated' };
    }

    try {
        const info = await transporter.sendMail({
            from: process.env.SMTP_FROM || '"Venture CRM" <noreply@venture.ai>',
            to,
            subject,
            html,
        });

        console.log('Message sent: %s', info.messageId);
        return info;
    } catch (error) {
        console.error('Error sending email:', error);
        throw error;
    }
}
