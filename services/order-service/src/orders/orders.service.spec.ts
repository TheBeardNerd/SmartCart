import { Test, TestingModule } from '@nestjs/testing';
import { OrdersService } from './orders.service';
import { PrismaService } from '../prisma/prisma.service';
import { OrderStateMachineService } from './order-state-machine.service';
import { NotificationIntegrationService } from '../notifications/notification-integration.service';
import { CreateOrderDto, FulfillmentType } from './dto/create-order.dto';
import { OrderStatus } from './dto/update-order-status.dto';
import { BadRequestException, NotFoundException } from '@nestjs/common';

describe('OrdersService', () => {
  let service: OrdersService;
  let prismaService: PrismaService;
  let stateMachine: OrderStateMachineService;
  let notifications: NotificationIntegrationService;

  const mockPrismaService = {
    order: {
      create: jest.fn(),
      findMany: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    $queryRaw: jest.fn(),
  };

  const mockNotificationService = {
    sendOrderConfirmation: jest.fn().mockResolvedValue(undefined),
    sendOrderStatusUpdate: jest.fn().mockResolvedValue(undefined),
    sendDeliveryNotification: jest.fn().mockResolvedValue(undefined),
    sendOrderCancellation: jest.fn().mockResolvedValue(undefined),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrdersService,
        OrderStateMachineService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: NotificationIntegrationService,
          useValue: mockNotificationService,
        },
      ],
    }).compile();

    service = module.get<OrdersService>(OrdersService);
    prismaService = module.get<PrismaService>(PrismaService);
    stateMachine = module.get<OrderStateMachineService>(OrderStateMachineService);
    notifications = module.get<NotificationIntegrationService>(NotificationIntegrationService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('should create a new order successfully', async () => {
      const createOrderDto: CreateOrderDto = {
        userId: 'user123',
        fulfillmentType: FulfillmentType.DELIVERY,
        items: [
          {
            productId: 'prod123',
            productName: 'Organic Bananas',
            storeId: 'store1',
            storeName: 'Kroger',
            quantity: 2,
            unitPrice: 1.99,
          },
        ],
        contactEmail: 'test@example.com',
      };

      const mockOrder = {
        id: 'order123',
        orderNumber: 'ORD-ABC123',
        userId: 'user123',
        status: 'PENDING',
        items: [],
        storeFulfillments: [],
        statusHistory: [],
        total: 10.5,
      };

      mockPrismaService.order.create.mockResolvedValue(mockOrder);

      const result = await service.create(createOrderDto);

      expect(result).toEqual(mockOrder);
      expect(mockPrismaService.order.create).toHaveBeenCalled();
      expect(mockNotificationService.sendOrderConfirmation).toHaveBeenCalledWith(mockOrder);
    });

    it('should throw BadRequestException if no items provided', async () => {
      const createOrderDto: CreateOrderDto = {
        userId: 'user123',
        fulfillmentType: FulfillmentType.DELIVERY,
        items: [],
      };

      await expect(service.create(createOrderDto)).rejects.toThrow(BadRequestException);
    });
  });

  describe('findOne', () => {
    it('should find an order by ID', async () => {
      const mockOrder = {
        id: 'order123',
        orderNumber: 'ORD-ABC123',
        userId: 'user123',
        items: [],
        storeFulfillments: [],
        statusHistory: [],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.findOne('order123');

      expect(result).toEqual(mockOrder);
      expect(mockPrismaService.order.findUnique).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 'order123' },
        }),
      );
    });

    it('should throw NotFoundException if order not found', async () => {
      mockPrismaService.order.findUnique.mockResolvedValue(null);

      await expect(service.findOne('nonexistent')).rejects.toThrow(NotFoundException);
    });

    it('should throw NotFoundException if userId does not match', async () => {
      const mockOrder = {
        id: 'order123',
        userId: 'user123',
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.findOne('order123', 'differentUser')).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateStatus', () => {
    it('should update order status successfully', async () => {
      const mockExistingOrder = {
        id: 'order123',
        orderNumber: 'ORD-ABC123',
        userId: 'user123',
        status: 'PENDING',
        items: [],
        storeFulfillments: [],
        statusHistory: [],
      };

      const mockUpdatedOrder = {
        ...mockExistingOrder,
        status: 'CONFIRMED',
        confirmedAt: new Date(),
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockExistingOrder);
      mockPrismaService.order.update.mockResolvedValue(mockUpdatedOrder);

      const result = await service.updateStatus('order123', {
        status: OrderStatus.CONFIRMED,
        changedBy: 'user123',
      });

      expect(result.status).toEqual('CONFIRMED');
      expect(mockPrismaService.order.update).toHaveBeenCalled();
      expect(mockNotificationService.sendOrderStatusUpdate).toHaveBeenCalled();
    });

    it('should throw BadRequestException for invalid transition', async () => {
      const mockOrder = {
        id: 'order123',
        status: 'DELIVERED',
        items: [],
        storeFulfillments: [],
        statusHistory: [],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(
        service.updateStatus('order123', {
          status: OrderStatus.PENDING,
          changedBy: 'user123',
        }),
      ).rejects.toThrow(BadRequestException);
    });
  });

  describe('cancel', () => {
    it('should cancel an order successfully', async () => {
      const mockOrder = {
        id: 'order123',
        orderNumber: 'ORD-ABC123',
        userId: 'user123',
        status: 'PENDING',
        items: [],
        storeFulfillments: [],
        statusHistory: [],
      };

      const mockCancelledOrder = {
        ...mockOrder,
        status: 'CANCELLED',
        cancelledAt: new Date(),
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);
      mockPrismaService.order.update.mockResolvedValue(mockCancelledOrder);

      const result = await service.cancel('order123', 'user123', 'Changed my mind');

      expect(result.status).toEqual('CANCELLED');
      expect(mockNotificationService.sendOrderCancellation).toHaveBeenCalled();
    });

    it('should throw BadRequestException if order cannot be cancelled', async () => {
      const mockOrder = {
        id: 'order123',
        status: 'DELIVERED',
        userId: 'user123',
        items: [],
        storeFulfillments: [],
        statusHistory: [],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      await expect(service.cancel('order123', 'user123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('getTracking', () => {
    it('should return tracking information', async () => {
      const mockOrder = {
        id: 'order123',
        orderNumber: 'ORD-ABC123',
        status: 'OUT_FOR_DELIVERY',
        estimatedDelivery: new Date(),
        actualDelivery: null,
        storeFulfillments: [
          {
            storeId: 'store1',
            storeName: 'Kroger',
            status: 'OUT_FOR_DELIVERY',
            trackingNumber: 'TRK123',
            estimatedDelivery: new Date(),
          },
        ],
        statusHistory: [],
        items: [],
      };

      mockPrismaService.order.findUnique.mockResolvedValue(mockOrder);

      const result = await service.getTracking('order123');

      expect(result.orderNumber).toEqual('ORD-ABC123');
      expect(result.status).toEqual('OUT_FOR_DELIVERY');
      expect(result.storeFulfillments).toHaveLength(1);
    });
  });
});
