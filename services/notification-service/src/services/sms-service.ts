import { config } from '../config';
import { logger } from '../utils/logger';

export interface SMSData {
  to: string;
  message: string;
}

export class SMSService {
  /**
   * Send SMS using Twilio (or mock in development)
   */
  static async sendSMS(data: SMSData): Promise<void> {
    if (!config.sms.enabled) {
      logger.info('SMS disabled, would have sent:', {
        to: data.to,
        message: data.message,
      });
      return;
    }

    if (!config.sms.accountSid || !config.sms.authToken) {
      logger.warn('Twilio credentials not configured, SMS not sent');
      return;
    }

    try {
      // In production, use Twilio SDK
      // const twilio = require('twilio');
      // const client = twilio(config.sms.accountSid, config.sms.authToken);
      //
      // await client.messages.create({
      //   body: data.message,
      //   from: config.sms.phoneNumber,
      //   to: data.to,
      // });

      logger.info(`SMS sent to ${data.to}: ${data.message.substring(0, 50)}...`);
    } catch (error) {
      logger.error('Error sending SMS:', error);
      throw error;
    }
  }

  /**
   * Send order status update SMS
   */
  static async sendOrderStatusUpdate(
    phone: string,
    orderNumber: string,
    status: string
  ): Promise<void> {
    const message = `SmartCart: Your order #${orderNumber} is now ${status}. Track it in the app!`;
    await this.sendSMS({ to: phone, message });
  }

  /**
   * Send delivery notification
   */
  static async sendDeliveryNotification(
    phone: string,
    orderNumber: string,
    estimatedTime: string
  ): Promise<void> {
    const message = `SmartCart: Your order #${orderNumber} will arrive around ${estimatedTime}. Thank you for shopping with us!`;
    await this.sendSMS({ to: phone, message });
  }

  /**
   * Send verification code
   */
  static async sendVerificationCode(phone: string, code: string): Promise<void> {
    const message = `SmartCart: Your verification code is ${code}. Valid for 10 minutes.`;
    await this.sendSMS({ to: phone, message });
  }
}
