import { EmailService } from '../src/services/email-service';
import { SMSService } from '../src/services/sms-service';

describe('Email Service', () => {
  describe('sendWelcomeEmail', () => {
    it('should send welcome email', async () => {
      // In development, this will log the email instead of sending
      await expect(
        EmailService.sendWelcomeEmail('test@example.com', 'John')
      ).resolves.not.toThrow();
    });
  });

  describe('sendOrderConfirmation', () => {
    it('should send order confirmation email', async () => {
      const orderData = {
        orderNumber: 'ORD-123',
        total: 50.99,
        items: [
          { name: 'Bananas', quantity: 2, price: 1.99 },
          { name: 'Milk', quantity: 1, price: 3.99 },
        ],
        estimatedDelivery: '2026-01-18T14:00:00Z',
      };

      await expect(
        EmailService.sendOrderConfirmation('test@example.com', orderData)
      ).resolves.not.toThrow();
    });
  });

  describe('sendPriceDropAlert', () => {
    it('should send price drop alert', async () => {
      const productData = {
        name: 'Organic Bananas',
        oldPrice: 2.99,
        newPrice: 1.99,
        savings: 1.00,
        store: 'Kroger',
      };

      await expect(
        EmailService.sendPriceDropAlert('test@example.com', productData)
      ).resolves.not.toThrow();
    });
  });
});

describe('SMS Service', () => {
  describe('sendOrderStatusUpdate', () => {
    it('should send order status update SMS', async () => {
      await expect(
        SMSService.sendOrderStatusUpdate('+1234567890', 'ORD-123', 'delivered')
      ).resolves.not.toThrow();
    });
  });

  describe('sendDeliveryNotification', () => {
    it('should send delivery notification SMS', async () => {
      await expect(
        SMSService.sendDeliveryNotification('+1234567890', 'ORD-123', '2:00 PM')
      ).resolves.not.toThrow();
    });
  });

  describe('sendVerificationCode', () => {
    it('should send verification code SMS', async () => {
      await expect(
        SMSService.sendVerificationCode('+1234567890', '123456')
      ).resolves.not.toThrow();
    });
  });
});
