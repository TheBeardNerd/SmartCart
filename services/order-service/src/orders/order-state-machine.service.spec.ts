import { Test, TestingModule } from '@nestjs/testing';
import { OrderStateMachineService } from './order-state-machine.service';
import { OrderStatus } from './dto/update-order-status.dto';
import { BadRequestException } from '@nestjs/common';

describe('OrderStateMachineService', () => {
  let service: OrderStateMachineService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [OrderStateMachineService],
    }).compile();

    service = module.get<OrderStateMachineService>(OrderStateMachineService);
  });

  describe('canTransition', () => {
    it('should allow valid transition from PENDING to PAYMENT_PROCESSING', () => {
      expect(service.canTransition(OrderStatus.PENDING, OrderStatus.PAYMENT_PROCESSING)).toBe(true);
    });

    it('should allow valid transition from CONFIRMED to PREPARING', () => {
      expect(service.canTransition(OrderStatus.CONFIRMED, OrderStatus.PREPARING)).toBe(true);
    });

    it('should not allow invalid transition from DELIVERED to PENDING', () => {
      expect(service.canTransition(OrderStatus.DELIVERED, OrderStatus.PENDING)).toBe(false);
    });

    it('should not allow transition from REFUNDED (terminal state)', () => {
      expect(service.canTransition(OrderStatus.REFUNDED, OrderStatus.PENDING)).toBe(false);
    });
  });

  describe('validateTransition', () => {
    it('should not throw for valid transition', () => {
      expect(() => {
        service.validateTransition(OrderStatus.PENDING, OrderStatus.PAYMENT_PROCESSING);
      }).not.toThrow();
    });

    it('should throw BadRequestException for invalid transition', () => {
      expect(() => {
        service.validateTransition(OrderStatus.DELIVERED, OrderStatus.PENDING);
      }).toThrow(BadRequestException);
    });

    it('should throw BadRequestException for same status', () => {
      expect(() => {
        service.validateTransition(OrderStatus.PENDING, OrderStatus.PENDING);
      }).toThrow(BadRequestException);
    });
  });

  describe('getValidTransitions', () => {
    it('should return valid transitions for PENDING status', () => {
      const transitions = service.getValidTransitions(OrderStatus.PENDING);
      expect(transitions).toContain(OrderStatus.PAYMENT_PROCESSING);
      expect(transitions).toContain(OrderStatus.CANCELLED);
      expect(transitions).toContain(OrderStatus.FAILED);
    });

    it('should return empty array for terminal status', () => {
      const transitions = service.getValidTransitions(OrderStatus.REFUNDED);
      expect(transitions).toHaveLength(0);
    });
  });

  describe('isTerminalStatus', () => {
    it('should return true for REFUNDED status', () => {
      expect(service.isTerminalStatus(OrderStatus.REFUNDED)).toBe(true);
    });

    it('should return false for PENDING status', () => {
      expect(service.isTerminalStatus(OrderStatus.PENDING)).toBe(false);
    });
  });

  describe('shouldNotifyCustomer', () => {
    it('should return true for CONFIRMED status', () => {
      expect(service.shouldNotifyCustomer(OrderStatus.CONFIRMED)).toBe(true);
    });

    it('should return true for DELIVERED status', () => {
      expect(service.shouldNotifyCustomer(OrderStatus.DELIVERED)).toBe(true);
    });

    it('should return false for PENDING status', () => {
      expect(service.shouldNotifyCustomer(OrderStatus.PENDING)).toBe(false);
    });
  });

  describe('canCancel', () => {
    it('should return true for PENDING status', () => {
      expect(service.canCancel(OrderStatus.PENDING)).toBe(true);
    });

    it('should return true for PREPARING status', () => {
      expect(service.canCancel(OrderStatus.PREPARING)).toBe(true);
    });

    it('should return false for DELIVERED status', () => {
      expect(service.canCancel(OrderStatus.DELIVERED)).toBe(false);
    });

    it('should return false for CANCELLED status', () => {
      expect(service.canCancel(OrderStatus.CANCELLED)).toBe(false);
    });
  });

  describe('canRefund', () => {
    it('should return true for DELIVERED status', () => {
      expect(service.canRefund(OrderStatus.DELIVERED)).toBe(true);
    });

    it('should return true for CANCELLED status', () => {
      expect(service.canRefund(OrderStatus.CANCELLED)).toBe(true);
    });

    it('should return false for PENDING status', () => {
      expect(service.canRefund(OrderStatus.PENDING)).toBe(false);
    });
  });

  describe('requiresPayment', () => {
    it('should return true for PENDING status', () => {
      expect(service.requiresPayment(OrderStatus.PENDING)).toBe(true);
    });

    it('should return true for PAYMENT_PROCESSING status', () => {
      expect(service.requiresPayment(OrderStatus.PAYMENT_PROCESSING)).toBe(true);
    });

    it('should return false for CONFIRMED status', () => {
      expect(service.requiresPayment(OrderStatus.CONFIRMED)).toBe(false);
    });
  });
});
