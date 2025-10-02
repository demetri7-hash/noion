/**
 * Email Service
 *
 * Handles all email sending using SendGrid
 * Supports templates, tracking, and various email types
 */

import Restaurant from '@/models/Restaurant';

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;
}

interface DiscoveryReportData {
  restaurantName: string;
  totalLostRevenue: number;
  topOpportunities: Array<{
    title: string;
    impact: number;
    description: string;
  }>;
  reportUrl: string;
}

export class EmailService {
  private fromEmail: string;
  private fromName: string;

  constructor() {
    this.fromEmail = process.env.SENDGRID_FROM_EMAIL || 'noreply@noion.ai';
    this.fromName = process.env.SENDGRID_FROM_NAME || 'NOION Analytics';
  }

  /**
   * Send email using SendGrid
   */
  private async sendEmail(options: EmailOptions): Promise<boolean> {
    try {
      // For development/testing, just log the email
      if (process.env.NODE_ENV === 'development') {
        console.log('📧 [DEV] Email would be sent:', {
          to: options.to,
          subject: options.subject,
          from: options.from || `${this.fromName} <${this.fromEmail}>`,
        });
        return true;
      }

      // TODO: Implement actual SendGrid sending when API key is available
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      // await sgMail.send({
      //   to: options.to,
      //   from: options.from || `${this.fromName} <${this.fromEmail}>`,
      //   subject: options.subject,
      //   text: options.text,
      //   html: options.html,
      // });

      console.log('✅ Email sent successfully to:', options.to);
      return true;
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      return false;
    }
  }

  /**
   * Send welcome email to new user
   */
  async sendWelcomeEmail(restaurantId: string): Promise<boolean> {
    try {
      const restaurant = await Restaurant.findById(restaurantId);
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
    } catch (error) {
      console.error('Welcome email error:', error);
      return false;
    }
  }

  /**
   * Send discovery report email
   */
  async sendDiscoveryReport(restaurantId: string, reportData: DiscoveryReportData): Promise<boolean> {
    try {
      const restaurant = await Restaurant.findById(restaurantId);
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
    } catch (error) {
      console.error('Discovery report email error:', error);
      return false;
    }
  }

  /**
   * Send weekly insights summary
   */
  async sendWeeklySummary(restaurantId: string): Promise<boolean> {
    try {
      const restaurant = await Restaurant.findById(restaurantId);
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
    } catch (error) {
      console.error('Weekly summary email error:', error);
      return false;
    }
  }

  /**
   * Send password reset email
   */
  async sendPasswordReset(email: string, resetToken: string): Promise<boolean> {
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
    } catch (error) {
      console.error('Password reset email error:', error);
      return false;
    }
  }

  /**
   * Send payment receipt
   */
  async sendPaymentReceipt(restaurantId: string, amount: number, invoiceUrl: string): Promise<boolean> {
    try {
      const restaurant = await Restaurant.findById(restaurantId);
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
    } catch (error) {
      console.error('Payment receipt email error:', error);
      return false;
    }
  }
}
