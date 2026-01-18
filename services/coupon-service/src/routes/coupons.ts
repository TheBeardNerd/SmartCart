import { FastifyInstance } from 'fastify';
import { PrismaClient, DiscountType, CouponStatus } from '@prisma/client';
import { z } from 'zod';
import { authenticate, optionalAuth, AuthenticatedRequest } from '../middleware/auth';

const prisma = new PrismaClient();

// Validation schemas
const getCouponsSchema = z.object({
  store: z.string().optional(),
  category: z.string().optional(),
  productId: z.string().optional(),
  featured: z.boolean().optional(),
  limit: z.number().min(1).max(100).optional(),
  offset: z.number().min(0).optional(),
});

const applyCouponSchema = z.object({
  code: z.string().min(1),
  cartItems: z.array(
    z.object({
      productId: z.string(),
      store: z.string(),
      category: z.string().optional(),
      price: z.number(),
      quantity: z.number().min(1),
    })
  ),
  subtotal: z.number().min(0),
});

export async function couponRoutes(fastify: FastifyInstance) {
  // Get all coupons with optional filters
  fastify.get<{
    Querystring: z.infer<typeof getCouponsSchema>;
  }>('/coupons', { preHandler: optionalAuth }, async (request, reply) => {
    try {
      const query = getCouponsSchema.parse(request.query);

      const now = new Date();
      const where: any = {
        status: CouponStatus.ACTIVE,
        OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
        OR: [{ startsAt: null }, { startsAt: { lte: now } }],
      };

      if (query.store) {
        where.OR = [{ store: query.store }, { store: null }];
      }

      if (query.category) {
        where.category = query.category;
      }

      if (query.productId) {
        where.productId = query.productId;
      }

      if (query.featured) {
        where.isFeatured = true;
      }

      const coupons = await prisma.coupon.findMany({
        where,
        take: query.limit || 50,
        skip: query.offset || 0,
        orderBy: [{ isFeatured: 'desc' }, { createdAt: 'desc' }],
        include: {
          _count: {
            select: { usages: true },
          },
        },
      });

      const total = await prisma.coupon.count({ where });

      reply.send({
        success: true,
        data: {
          coupons,
          total,
          limit: query.limit || 50,
          offset: query.offset || 0,
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      } else {
        reply.status(500).send({
          success: false,
          error: error.message || 'Failed to fetch coupons',
        });
      }
    }
  });

  // Get featured coupons
  fastify.get('/coupons/featured', { preHandler: optionalAuth }, async (request, reply) => {
    try {
      const now = new Date();
      const coupons = await prisma.coupon.findMany({
        where: {
          status: CouponStatus.ACTIVE,
          isFeatured: true,
          OR: [{ expiresAt: null }, { expiresAt: { gte: now } }],
        },
        take: 10,
        orderBy: { createdAt: 'desc' },
      });

      reply.send({
        success: true,
        data: { coupons },
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to fetch featured coupons',
      });
    }
  });

  // Get specific coupon
  fastify.get<{
    Params: { id: string };
  }>('/coupons/:id', { preHandler: optionalAuth }, async (request, reply) => {
    try {
      const coupon = await prisma.coupon.findUnique({
        where: { id: request.params.id },
        include: {
          _count: {
            select: { usages: true, savedBy: true },
          },
        },
      });

      if (!coupon) {
        return reply.status(404).send({
          success: false,
          error: 'Coupon not found',
        });
      }

      reply.send({
        success: true,
        data: { coupon },
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to fetch coupon',
      });
    }
  });

  // Validate coupon code
  fastify.get<{
    Params: { code: string };
  }>('/coupons/validate/:code', { preHandler: optionalAuth }, async (request, reply) => {
    try {
      const coupon = await prisma.coupon.findUnique({
        where: { code: request.params.code.toUpperCase() },
      });

      if (!coupon) {
        return reply.status(404).send({
          success: false,
          error: 'Coupon not found',
          valid: false,
        });
      }

      const now = new Date();
      const errors: string[] = [];

      // Check status
      if (coupon.status !== CouponStatus.ACTIVE) {
        errors.push('Coupon is not active');
      }

      // Check start date
      if (coupon.startsAt && coupon.startsAt > now) {
        errors.push('Coupon not yet valid');
      }

      // Check expiration
      if (coupon.expiresAt && coupon.expiresAt < now) {
        errors.push('Coupon has expired');
      }

      // Check usage limit
      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        errors.push('Coupon usage limit reached');
      }

      const valid = errors.length === 0;

      reply.send({
        success: true,
        data: {
          coupon,
          valid,
          errors: errors.length > 0 ? errors : undefined,
        },
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to validate coupon',
      });
    }
  });

  // Apply coupon to cart (calculate discount)
  fastify.post<{
    Body: z.infer<typeof applyCouponSchema>;
  }>('/coupons/apply', { preHandler: optionalAuth }, async (request, reply) => {
    try {
      const validatedData = applyCouponSchema.parse(request.body);
      const { code, cartItems, subtotal } = validatedData;

      // Find coupon
      const coupon = await prisma.coupon.findUnique({
        where: { code: code.toUpperCase() },
      });

      if (!coupon) {
        return reply.status(404).send({
          success: false,
          error: 'Coupon not found',
        });
      }

      // Validate coupon
      const now = new Date();
      if (coupon.status !== CouponStatus.ACTIVE) {
        return reply.status(400).send({
          success: false,
          error: 'Coupon is not active',
        });
      }

      if (coupon.startsAt && coupon.startsAt > now) {
        return reply.status(400).send({
          success: false,
          error: 'Coupon not yet valid',
        });
      }

      if (coupon.expiresAt && coupon.expiresAt < now) {
        return reply.status(400).send({
          success: false,
          error: 'Coupon has expired',
        });
      }

      if (coupon.usageLimit && coupon.usageCount >= coupon.usageLimit) {
        return reply.status(400).send({
          success: false,
          error: 'Coupon usage limit reached',
        });
      }

      // Check minimum purchase
      if (coupon.minPurchase && subtotal < Number(coupon.minPurchase)) {
        return reply.status(400).send({
          success: false,
          error: `Minimum purchase of $${coupon.minPurchase} required`,
        });
      }

      // Calculate eligible items
      let eligibleItems = cartItems;

      // Filter by store
      if (coupon.store) {
        eligibleItems = eligibleItems.filter((item) => item.store === coupon.store);
      }

      // Filter by category
      if (coupon.category) {
        eligibleItems = eligibleItems.filter((item) => item.category === coupon.category);
      }

      // Filter by product
      if (coupon.productId) {
        eligibleItems = eligibleItems.filter((item) => item.productId === coupon.productId);
      }

      if (eligibleItems.length === 0) {
        return reply.status(400).send({
          success: false,
          error: 'No items in cart match coupon criteria',
        });
      }

      // Calculate discount
      let discountAmount = 0;
      const eligibleSubtotal = eligibleItems.reduce(
        (sum, item) => sum + item.price * item.quantity,
        0
      );

      switch (coupon.discountType) {
        case DiscountType.PERCENTAGE:
          discountAmount = (eligibleSubtotal * Number(coupon.discountValue)) / 100;
          if (coupon.maxDiscount) {
            discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
          }
          break;

        case DiscountType.FIXED_AMOUNT:
          discountAmount = Number(coupon.discountValue);
          break;

        case DiscountType.BOGO:
          // Simple BOGO: 50% off eligible items
          discountAmount = eligibleSubtotal * 0.5;
          break;

        case DiscountType.FREE_SHIPPING:
          // Free shipping - discount amount would be calculated based on shipping cost
          discountAmount = 0; // Handled separately in checkout
          break;
      }

      // Ensure discount doesn't exceed subtotal
      discountAmount = Math.min(discountAmount, subtotal);
      const finalTotal = Math.max(0, subtotal - discountAmount);

      reply.send({
        success: true,
        data: {
          coupon: {
            id: coupon.id,
            code: coupon.code,
            title: coupon.title,
            description: coupon.description,
            discountType: coupon.discountType,
          },
          eligibleItems: eligibleItems.length,
          totalItems: cartItems.length,
          subtotal,
          discountAmount: Number(discountAmount.toFixed(2)),
          finalTotal: Number(finalTotal.toFixed(2)),
          savings: Number(discountAmount.toFixed(2)),
        },
      });
    } catch (error: any) {
      if (error instanceof z.ZodError) {
        reply.status(400).send({
          success: false,
          error: 'Validation error',
          details: error.errors,
        });
      } else {
        reply.status(500).send({
          success: false,
          error: error.message || 'Failed to apply coupon',
        });
      }
    }
  });

  // Get user's saved coupons
  fastify.get('/my-coupons', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = request.user!.userId;

      const savedCoupons = await prisma.userCoupon.findMany({
        where: { userId },
        include: {
          coupon: {
            include: {
              _count: {
                select: { usages: true },
              },
            },
          },
        },
        orderBy: { savedAt: 'desc' },
      });

      const now = new Date();
      const activeCoupons = savedCoupons.filter(
        (sc) =>
          sc.coupon.status === CouponStatus.ACTIVE &&
          (!sc.coupon.expiresAt || sc.coupon.expiresAt >= now)
      );

      const expiredCoupons = savedCoupons.filter(
        (sc) => sc.coupon.expiresAt && sc.coupon.expiresAt < now
      );

      reply.send({
        success: true,
        data: {
          savedCoupons,
          activeCoupons,
          expiredCoupons,
          total: savedCoupons.length,
        },
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to fetch saved coupons',
      });
    }
  });

  // Save a coupon
  fastify.post<{
    Params: { couponId: string };
  }>('/my-coupons/:couponId', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = request.user!.userId;
      const { couponId } = request.params;

      // Check if coupon exists
      const coupon = await prisma.coupon.findUnique({
        where: { id: couponId },
      });

      if (!coupon) {
        return reply.status(404).send({
          success: false,
          error: 'Coupon not found',
        });
      }

      // Check if already saved
      const existing = await prisma.userCoupon.findUnique({
        where: {
          userId_couponId: {
            userId,
            couponId,
          },
        },
      });

      if (existing) {
        return reply.status(409).send({
          success: false,
          error: 'Coupon already saved',
        });
      }

      // Save coupon
      const savedCoupon = await prisma.userCoupon.create({
        data: {
          userId,
          couponId,
        },
        include: {
          coupon: true,
        },
      });

      reply.send({
        success: true,
        data: { savedCoupon },
        message: 'Coupon saved successfully',
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to save coupon',
      });
    }
  });

  // Remove saved coupon
  fastify.delete<{
    Params: { couponId: string };
  }>('/my-coupons/:couponId', { preHandler: authenticate }, async (request: AuthenticatedRequest, reply) => {
    try {
      const userId = request.user!.userId;
      const { couponId } = request.params;

      const deleted = await prisma.userCoupon.deleteMany({
        where: {
          userId,
          couponId,
        },
      });

      if (deleted.count === 0) {
        return reply.status(404).send({
          success: false,
          error: 'Saved coupon not found',
        });
      }

      reply.send({
        success: true,
        message: 'Coupon removed from saved list',
      });
    } catch (error: any) {
      reply.status(500).send({
        success: false,
        error: error.message || 'Failed to remove coupon',
      });
    }
  });
}
