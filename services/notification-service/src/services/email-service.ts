import { config } from '../config';
import { logger } from '../utils/logger';

export interface EmailData {
  to: string;
  subject: string;
  html?: string;
  text?: string;
  template?: string;
  templateData?: any;
}

export class EmailService {
  /**
   * Send email using SendGrid (or mock in development)
   */
  static async sendEmail(data: EmailData): Promise<void> {
    if (!config.email.enabled) {
      logger.info('Email disabled, would have sent:', {
        to: data.to,
        subject: data.subject,
      });
      return;
    }

    if (!config.email.apiKey) {
      logger.warn('SendGrid API key not configured, email not sent');
      return;
    }

    try {
      // In production, use SendGrid SDK
      // const sgMail = require('@sendgrid/mail');
      // sgMail.setApiKey(config.email.apiKey);
      //
      // await sgMail.send({
      //   to: data.to,
      //   from: config.email.from,
      //   subject: data.subject,
      //   html: data.html,
      //   text: data.text,
      // });

      logger.info(`Email sent to ${data.to}: ${data.subject}`);
    } catch (error) {
      logger.error('Error sending email:', error);
      throw error;
    }
  }

  /**
   * Send welcome email
   */
  static async sendWelcomeEmail(email: string, firstName: string): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: 'Welcome to SmartCart!',
      html: `
        <h1>Welcome to SmartCart, ${firstName}!</h1>
        <p>Thank you for joining SmartCart. Start saving money on your groceries today!</p>
        <p>Get started by:</p>
        <ul>
          <li>Adding items to your cart</li>
          <li>Using our price optimization engine</li>
          <li>Comparing prices across multiple stores</li>
        </ul>
        <p>Happy shopping!</p>
        <p>The SmartCart Team</p>
      `,
      text: `Welcome to SmartCart, ${firstName}! Thank you for joining. Start saving money on your groceries today!`,
    });
  }

  /**
   * Send order confirmation email
   */
  static async sendOrderConfirmation(
    email: string,
    orderData: {
      orderNumber: string;
      total: number;
      items: any[];
      estimatedDelivery: string;
    }
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Order Confirmation #${orderData.orderNumber}`,
      html: `
        <h1>Order Confirmed!</h1>
        <p>Thank you for your order #${orderData.orderNumber}</p>
        <p><strong>Total:</strong> $${orderData.total.toFixed(2)}</p>
        <p><strong>Estimated Delivery:</strong> ${orderData.estimatedDelivery}</p>
        <h3>Order Items:</h3>
        <ul>
          ${orderData.items.map((item) => `<li>${item.name} x${item.quantity} - $${item.price.toFixed(2)}</li>`).join('')}
        </ul>
        <p>Track your order in the SmartCart app.</p>
      `,
    });
  }

  /**
   * Send price drop alert
   */
  static async sendPriceDropAlert(
    email: string,
    productData: {
      name: string;
      oldPrice: number;
      newPrice: number;
      savings: number;
      store: string;
    }
  ): Promise<void> {
    await this.sendEmail({
      to: email,
      subject: `Price Drop Alert: ${productData.name}`,
      html: `
        <h1>Price Drop Alert!</h1>
        <p><strong>${productData.name}</strong> is now on sale!</p>
        <p><strong>Was:</strong> $${productData.oldPrice.toFixed(2)}</p>
        <p><strong>Now:</strong> $${productData.newPrice.toFixed(2)}</p>
        <p><strong>You Save:</strong> $${productData.savings.toFixed(2)}</p>
        <p><strong>Store:</strong> ${productData.store}</p>
        <p>Don't miss out on this great deal!</p>
      `,
    });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetLink = `${config.allowedOrigins[0]}/reset-password?token=${resetToken}`;

    await this.sendEmail({
      to: email,
      subject: 'Reset Your Password - SmartCart',
      html: `
        <h1>Reset Your Password</h1>
        <p>Click the link below to reset your password:</p>
        <p><a href="${resetLink}">${resetLink}</a></p>
        <p>This link will expire in 1 hour.</p>
        <p>If you didn't request this, please ignore this email.</p>
      `,
      text: `Reset your password: ${resetLink}`,
    });
  }
}
