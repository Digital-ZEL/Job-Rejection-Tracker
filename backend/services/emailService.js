const nodemailer = require('nodemailer');

// Create reusable transporter
const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
    auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
    },
});

// Verify transporter configuration
transporter.verify((error, success) => {
    if (error) {
        console.error('❌ Email service configuration error:', error);
    } else {
        console.log('✅ Email service ready');
    }
});

const emailService = {
    // Send email verification
    async sendVerificationEmail(email, verificationUrl) {
        const mailOptions = {
            from: `"Smart Job Tracker" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: email,
            subject: 'Verify Your Email Address',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .button { display: inline-block; padding: 12px 24px; background-color: #007AFF; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                        .footer { margin-top: 30px; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Welcome to Smart Job Tracker!</h1>
                        <p>Thank you for signing up. Please verify your email address by clicking the button below:</p>
                        <a href="${verificationUrl}" class="button">Verify Email Address</a>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #007AFF;">${verificationUrl}</p>
                        <p>This link will expire in 24 hours.</p>
                        <div class="footer">
                            <p>If you didn't create an account, you can safely ignore this email.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
                Welcome to Smart Job Tracker!
                
                Thank you for signing up. Please verify your email address by visiting:
                ${verificationUrl}
                
                This link will expire in 24 hours.
                
                If you didn't create an account, you can safely ignore this email.
            `
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log('✅ Verification email sent:', info.messageId);
            return info;
        } catch (error) {
            console.error('❌ Failed to send verification email:', error);
            throw error;
        }
    },

    // Send password reset email
    async sendPasswordResetEmail(email, resetUrl) {
        const mailOptions = {
            from: `"Smart Job Tracker" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: email,
            subject: 'Reset Your Password',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .button { display: inline-block; padding: 12px 24px; background-color: #007AFF; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                        .warning { background-color: #fff3cd; padding: 15px; border-radius: 6px; margin: 20px 0; }
                        .footer { margin-top: 30px; font-size: 12px; color: #666; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>Password Reset Request</h1>
                        <p>You requested to reset your password. Click the button below to create a new password:</p>
                        <a href="${resetUrl}" class="button">Reset Password</a>
                        <p>Or copy and paste this link into your browser:</p>
                        <p style="word-break: break-all; color: #007AFF;">${resetUrl}</p>
                        <div class="warning">
                            <p><strong>⚠️ Security Notice:</strong></p>
                            <p>This link will expire in 1 hour. If you didn't request a password reset, please ignore this email or contact support if you're concerned.</p>
                        </div>
                        <div class="footer">
                            <p>If you didn't request this, you can safely ignore this email.</p>
                        </div>
                    </div>
                </body>
                </html>
            `,
            text: `
                Password Reset Request
                
                You requested to reset your password. Visit this link to create a new password:
                ${resetUrl}
                
                This link will expire in 1 hour.
                
                If you didn't request a password reset, please ignore this email.
            `
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log('✅ Password reset email sent:', info.messageId);
            return info;
        } catch (error) {
            console.error('❌ Failed to send password reset email:', error);
            throw error;
        }
    },

    // Send welcome email (after verification)
    async sendWelcomeEmail(email) {
        const mailOptions = {
            from: `"Smart Job Tracker" <${process.env.SMTP_FROM || process.env.SMTP_USER}>`,
            to: email,
            subject: 'Welcome to Smart Job Tracker!',
            html: `
                <!DOCTYPE html>
                <html>
                <head>
                    <meta charset="utf-8">
                    <style>
                        body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                        .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                        .button { display: inline-block; padding: 12px 24px; background-color: #007AFF; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
                    </style>
                </head>
                <body>
                    <div class="container">
                        <h1>🎉 Email Verified!</h1>
                        <p>Your email has been verified successfully. You're all set to start tracking your job applications!</p>
                        <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}" class="button">Get Started</a>
                        <p>Happy job hunting!</p>
                    </div>
                </body>
                </html>
            `
        };

        try {
            const info = await transporter.sendMail(mailOptions);
            console.log('✅ Welcome email sent:', info.messageId);
            return info;
        } catch (error) {
            console.error('❌ Failed to send welcome email:', error);
            // Don't throw - welcome email is not critical
        }
    }
};

module.exports = emailService;
