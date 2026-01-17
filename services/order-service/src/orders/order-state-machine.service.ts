import { Injectable, BadRequestException } from '@nestjs/common';
import { OrderStatus } from './dto/update-order-status.dto';

interface StateTransition {
  from: OrderStatus;
  to: OrderStatus[];
}

@Injectable()
export class OrderStateMachineService {
  // Define valid state transitions
  private readonly transitions: StateTransition[] = [
    {
      from: OrderStatus.PENDING,
      to: [OrderStatus.PAYMENT_PROCESSING, OrderStatus.CANCELLED, OrderStatus.FAILED],
    },
    {
      from: OrderStatus.PAYMENT_PROCESSING,
      to: [OrderStatus.CONFIRMED, OrderStatus.FAILED, OrderStatus.CANCELLED],
    },
    {
      from: OrderStatus.CONFIRMED,
      to: [OrderStatus.PREPARING, OrderStatus.CANCELLED],
    },
    {
      from: OrderStatus.PREPARING,
      to: [OrderStatus.READY_FOR_PICKUP, OrderStatus.OUT_FOR_DELIVERY, OrderStatus.CANCELLED],
    },
    {
      from: OrderStatus.READY_FOR_PICKUP,
      to: [OrderStatus.DELIVERED, OrderStatus.CANCELLED],
    },
    {
      from: OrderStatus.OUT_FOR_DELIVERY,
      to: [OrderStatus.DELIVERED, OrderStatus.FAILED],
    },
    {
      from: OrderStatus.DELIVERED,
      to: [OrderStatus.REFUNDED],
    },
    {
      from: OrderStatus.CANCELLED,
      to: [OrderStatus.REFUNDED],
    },
    {
      from: OrderStatus.FAILED,
      to: [OrderStatus.PENDING, OrderStatus.REFUNDED],
    },
    {
      from: OrderStatus.REFUNDED,
      to: [], // Terminal state
    },
  ];

  /**
   * Check if a status transition is valid
   */
  canTransition(currentStatus: OrderStatus, newStatus: OrderStatus): boolean {
    const transition = this.transitions.find((t) => t.from === currentStatus);

    if (!transition) {
      return false;
    }

    return transition.to.includes(newStatus);
  }

  /**
   * Validate and transition to new status
   * Throws BadRequestException if transition is invalid
   */
  validateTransition(currentStatus: OrderStatus, newStatus: OrderStatus): void {
    if (currentStatus === newStatus) {
      throw new BadRequestException(`Order is already in ${currentStatus} status`);
    }

    if (!this.canTransition(currentStatus, newStatus)) {
      throw new BadRequestException(
        `Cannot transition from ${currentStatus} to ${newStatus}. ` +
        `Valid transitions: ${this.getValidTransitions(currentStatus).join(', ')}`
      );
    }
  }

  /**
   * Get list of valid next statuses
   */
  getValidTransitions(currentStatus: OrderStatus): OrderStatus[] {
    const transition = this.transitions.find((t) => t.from === currentStatus);
    return transition ? transition.to : [];
  }

  /**
   * Check if a status is terminal (no further transitions possible)
   */
  isTerminalStatus(status: OrderStatus): boolean {
    const transition = this.transitions.find((t) => t.from === status);
    return transition ? transition.to.length === 0 : false;
  }

  /**
   * Get status that should trigger notifications
   */
  shouldNotifyCustomer(status: OrderStatus): boolean {
    return [
      OrderStatus.CONFIRMED,
      OrderStatus.PREPARING,
      OrderStatus.OUT_FOR_DELIVERY,
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
      OrderStatus.FAILED,
    ].includes(status);
  }

  /**
   * Get status that requires payment processing
   */
  requiresPayment(status: OrderStatus): boolean {
    return [OrderStatus.PENDING, OrderStatus.PAYMENT_PROCESSING].includes(status);
  }

  /**
   * Check if order can be cancelled
   */
  canCancel(status: OrderStatus): boolean {
    return ![
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
      OrderStatus.REFUNDED,
    ].includes(status);
  }

  /**
   * Check if order can be refunded
   */
  canRefund(status: OrderStatus): boolean {
    return [
      OrderStatus.DELIVERED,
      OrderStatus.CANCELLED,
      OrderStatus.FAILED,
    ].includes(status);
  }
}
