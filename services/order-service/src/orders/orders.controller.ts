import {
  Controller,
  Get,
  Post,
  Body,
  Patch,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { OrdersService } from './orders.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';

@Controller('api/orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Create a new order
   * POST /api/orders
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  async create(@Body() createOrderDto: CreateOrderDto) {
    const order = await this.ordersService.create(createOrderDto);
    return {
      success: true,
      data: order,
    };
  }

  /**
   * Get all orders for a user
   * GET /api/orders?userId=xxx
   */
  @Get()
  async findAll(
    @Query('userId') userId: string,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ) {
    const orders = await this.ordersService.findAllByUser(
      userId,
      limit ? parseInt(limit) : 50,
      offset ? parseInt(offset) : 0,
    );

    return {
      success: true,
      data: orders,
      count: orders.length,
    };
  }

  /**
   * Get order by ID
   * GET /api/orders/:id
   */
  @Get(':id')
  async findOne(@Param('id') id: string, @Query('userId') userId?: string) {
    const order = await this.ordersService.findOne(id, userId);
    return {
      success: true,
      data: order,
    };
  }

  /**
   * Get order by order number
   * GET /api/orders/number/:orderNumber
   */
  @Get('number/:orderNumber')
  async findByOrderNumber(
    @Param('orderNumber') orderNumber: string,
    @Query('userId') userId?: string,
  ) {
    const order = await this.ordersService.findByOrderNumber(orderNumber, userId);
    return {
      success: true,
      data: order,
    };
  }

  /**
   * Update order status
   * PATCH /api/orders/:id/status
   */
  @Patch(':id/status')
  async updateStatus(
    @Param('id') id: string,
    @Body() updateStatusDto: UpdateOrderStatusDto,
  ) {
    const order = await this.ordersService.updateStatus(id, updateStatusDto);
    return {
      success: true,
      data: order,
      message: `Order status updated to ${updateStatusDto.status}`,
    };
  }

  /**
   * Cancel an order
   * POST /api/orders/:id/cancel
   */
  @Post(':id/cancel')
  async cancel(
    @Param('id') id: string,
    @Body() body: { userId: string; reason?: string },
  ) {
    const order = await this.ordersService.cancel(id, body.userId, body.reason);
    return {
      success: true,
      data: order,
      message: 'Order cancelled successfully',
    };
  }

  /**
   * Get order tracking information
   * GET /api/orders/:id/tracking
   */
  @Get(':id/tracking')
  async getTracking(@Param('id') id: string, @Query('userId') userId?: string) {
    const tracking = await this.ordersService.getTracking(id, userId);
    return {
      success: true,
      data: tracking,
    };
  }
}
