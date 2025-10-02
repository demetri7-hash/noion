"use strict";
/**
 * Email Service
 *
 * Handles all email sending using SendGrid
 * Supports templates, tracking, and various email types
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EmailService = void 0;
const mail_1 = __importDefault(require("@sendgrid/mail"));
const Restaurant_1 = __importDefault(require("../models/Restaurant"));
// Initialize SendGrid if API key is available
if (process.env.SENDGRID_API_KEY) {
    mail_1.default.setApiKey(process.env.SENDGRID_API_KEY);
}
class EmailService {
    constructor() {
        this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@noion.ai';
        this.fromName = process.env.SENDGRID_FROM_NAME || 'NOION Analytics';
    }
    /**
     * Send email using SendGrid
     */
    async sendEmail(options) {
        try {
            // For development/testing, just log the email
            if (process.env.NODE_ENV === 'development' && !process.env.SENDGRID_API_KEY) {
                console.log('📧 [DEV] Email would be sent:', {
                    to: options.to,
                    subject: options.subject,
                    from: options.from || `${this.fromName} <${this.fromEmail}>`,
                });
                return true;
            }
            // Send using SendGrid
            if (process.env.SENDGRID_API_KEY) {
                await mail_1.default.send({
                    to: options.to,
                    from: options.from || `${this.fromName} <${this.fromEmail}>`,
                    subject: options.subject,
                    text: options.text,
                    html: options.html,
                });
                console.log('✅ Email sent successfully to:', options.to);
                return true;
            }
            console.warn('⚠️ SendGrid API key not configured, email not sent');
            return false;
        }
        catch (error) {
            console.error('❌ Email sending failed:', error);
            return false;
        }
    }
    /**
     * Send welcome email to new user
     */
    async sendWelcomeEmail(restaurantId) {
        try {
            const restaurant = await Restaurant_1.default.findById(restaurantId);
            if (!restaurant) {
                throw new Error('Restaurant not found');
            }
            const html = `
        <h1>Welcome to NOION Analytics!</h1>
        <p>Hi ${restaurant.owner.firstName},</p>
        <p>Thank you for joining NOION Analytics. We're excited to help you unlock hidden revenue opportunities in your restaurant.</p>
        <h2>Next Steps:</h2>
        <ol>
          <li>Connect your POS system</li>
          <li>Generate your free discovery report</li>
          <li>Review your revenue opportunities</li>
        </ol>
        <p><a href="${process.env.FRONTEND_URL}/dashboard">Get Started →</a></p>
        <br>
        <p>Best regards,<br>The NOION Team</p>
      `;
            return await this.sendEmail({
                to: restaurant.owner.email,
                subject: 'Welcome to NOION Analytics',
                html,
                text: `Welcome to NOION Analytics! Get started by connecting your POS system.`,
            });
        }
        catch (error) {
            console.error('Welcome email error:', error);
            return false;
        }
    }
    /**
     * Send discovery report email
     */
    async sendDiscoveryReport(restaurantId, reportData) {
        try {
            const restaurant = await Restaurant_1.default.findById(restaurantId);
            if (!restaurant) {
                throw new Error('Restaurant not found');
            }
            const html = `
        <h1>Your Free Discovery Report is Ready!</h1>
        <p>Hi ${restaurant.owner.firstName},</p>
        <p>We've analyzed your restaurant data and discovered some significant revenue opportunities.</p>

        <div style="background: #f3f4f6; padding: 20px; margin: 20px 0; border-radius: 8px;">
          <h2 style="color: #dc2626; margin: 0;">💰 $${reportData.totalLostRevenue.toLocaleString()}/month</h2>
          <p style="margin: 5px 0 0 0;">in potential revenue identified</p>
        </div>

        <h2>Top Opportunities:</h2>
        <ul>
          ${reportData.topOpportunities.map(opp => `
            <li>
              <strong>${opp.title}</strong> - $${opp.impact.toLocaleString()}/month
              <br><small>${opp.description}</small>
            </li>
          `).join('')}
        </ul>

        <p><a href="${reportData.reportUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">View Full Report →</a></p>

        <p>This report shows you exactly where you're leaving money on the table and how to capture it.</p>

        <p>Best regards,<br>The NOION Team</p>
      `;
            return await this.sendEmail({
                to: restaurant.owner.email,
                subject: `💰 You're Losing $${reportData.totalLostRevenue.toLocaleString()}/month - Here's How to Fix It`,
                html,
            });
        }
        catch (error) {
            console.error('Discovery report email error:', error);
            return false;
        }
    }
    /**
     * Send weekly insights summary
     */
    async sendWeeklySummary(restaurantId) {
        try {
            const restaurant = await Restaurant_1.default.findById(restaurantId);
            if (!restaurant) {
                throw new Error('Restaurant not found');
            }
            const html = `
        <h1>Your Weekly Analytics Summary</h1>
        <p>Hi ${restaurant.owner.firstName},</p>
        <p>Here's what happened at ${restaurant.name} this week:</p>

        <h2>Key Metrics:</h2>
        <ul>
          <li>Revenue: [Dynamic data]</li>
          <li>Top performing server: [Dynamic data]</li>
          <li>Peak hours: [Dynamic data]</li>
        </ul>

        <p><a href="${process.env.FRONTEND_URL}/dashboard">View Full Dashboard →</a></p>

        <p>Best regards,<br>The NOION Team</p>
      `;
            return await this.sendEmail({
                to: restaurant.owner.email,
                subject: `Weekly Summary - ${restaurant.name}`,
                html,
            });
        }
        catch (error) {
            console.error('Weekly summary email error:', error);
            return false;
        }
    }
    /**
     * Send password reset email
     */
    async sendPasswordReset(email, resetToken) {
        try {
            const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
            const html = `
        <h1>Reset Your Password</h1>
        <p>You requested to reset your password for NOION Analytics.</p>
        <p><a href="${resetUrl}" style="background: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reset Password →</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
        <p>Best regards,<br>The NOION Team</p>
      `;
            return await this.sendEmail({
                to: email,
                subject: 'Reset Your Password - NOION Analytics',
                html,
            });
        }
        catch (error) {
            console.error('Password reset email error:', error);
            return false;
        }
    }
    /**
     * Send payment receipt
     */
    async sendPaymentReceipt(restaurantId, amount, invoiceUrl) {
        try {
            const restaurant = await Restaurant_1.default.findById(restaurantId);
            if (!restaurant) {
                throw new Error('Restaurant not found');
            }
            const html = `
        <h1>Payment Confirmation</h1>
        <p>Hi ${restaurant.owner.firstName},</p>
        <p>Your payment of $${amount.toFixed(2)} has been processed successfully.</p>
        <p><a href="${invoiceUrl}">Download Invoice →</a></p>
        <p>Thank you for using NOION Analytics!</p>
        <p>Best regards,<br>The NOION Team</p>
      `;
            return await this.sendEmail({
                to: restaurant.owner.email,
                subject: `Payment Confirmation - $${amount.toFixed(2)}`,
                html,
            });
        }
        catch (error) {
            console.error('Payment receipt email error:', error);
            return false;
        }
    }
    /**
     * Send sync completion notification
     */
    async sendSyncCompletedEmail(email, restaurantName, ordersImported, duration) {
        const durationMinutes = Math.round(duration / 1000 / 60);
        const dashboardUrl = `${process.env.FRONTEND_URL || 'https://noion.ai'}/dashboard`;
        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f9f9f9; }
          .stats { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; }
          .stat-item { margin: 10px 0; }
          .stat-label { font-weight: bold; color: #666; }
          .stat-value { font-size: 24px; color: #4F46E5; }
          .button { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>✅ Your Data is Ready!</h1>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p>Great news! We've successfully synced your data from <strong>${restaurantName}</strong>.</p>

            <div class="stats">
              <div class="stat-item">
                <div class="stat-label">Orders Imported</div>
                <div class="stat-value">${ordersImported.toLocaleString()}</div>
              </div>
              <div class="stat-item">
                <div class="stat-label">Processing Time</div>
                <div class="stat-value">${durationMinutes} min</div>
              </div>
            </div>

            <p>Your dashboard is now populated with actionable insights and analytics.</p>

            <a href="${dashboardUrl}" class="button">View Your Dashboard →</a>

            <p>Best regards,<br>The NOION Analytics Team</p>
          </div>
          <div class="footer">
            <p>NOION Analytics - AI-Powered Restaurant Intelligence</p>
          </div>
        </div>
      </body>
      </html>
    `;
        const text = `
Hi there,

Great news! We've successfully synced ${ordersImported} orders from ${restaurantName}.

The sync took ${durationMinutes} minute(s) and your dashboard is now ready to view.

View your dashboard: ${dashboardUrl}

Best regards,
The NOION Analytics Team
    `.trim();
        return await this.sendEmail({
            to: email,
            subject: '✅ Your restaurant data is ready!',
            html,
            text
        });
    }
    /**
     * Send sync failure notification
     */
    async sendSyncFailedEmail(email, restaurantName, error) {
        const supportEmail = process.env.SUPPORT_EMAIL || 'support@noion.ai';
        const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: #DC2626; color: white; padding: 20px; text-align: center; }
          .content { padding: 30px 20px; background: #f9f9f9; }
          .error-box { background: #FEE2E2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; }
          .footer { text-align: center; color: #666; font-size: 12px; padding: 20px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>⚠️ Sync Issue</h1>
          </div>
          <div class="content">
            <p>Hi there,</p>
            <p>We encountered an issue while syncing data from <strong>${restaurantName}</strong>.</p>

            <div class="error-box">
              <strong>Error:</strong> ${error}
            </div>

            <p>Our team has been automatically notified and is working on a fix. We'll retry the sync shortly.</p>
            <p>If you need immediate assistance, please contact us at <a href="mailto:${supportEmail}">${supportEmail}</a>.</p>

            <p>Best regards,<br>The NOION Analytics Team</p>
          </div>
          <div class="footer">
            <p>NOION Analytics - AI-Powered Restaurant Intelligence</p>
          </div>
        </div>
      </body>
      </html>
    `;
        const text = `
Hi there,

We encountered an issue while syncing data from ${restaurantName}.

Error: ${error}

Our team has been notified and is working on a fix. If you need immediate assistance, please contact us at ${supportEmail}.

Best regards,
The NOION Analytics Team
    `.trim();
        return await this.sendEmail({
            to: email,
            subject: '⚠️ Issue syncing your restaurant data',
            html,
            text
        });
    }
}
exports.EmailService = EmailService;
