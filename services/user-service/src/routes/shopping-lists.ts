import { FastifyInstance, FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';
import { PrismaClient } from '@prisma/client';
import { authenticateUser } from '../middleware/auth';

const prisma = new PrismaClient();

// Validation schemas
const createListSchema = z.object({
  name: z.string().min(1, 'List name is required'),
  description: z.string().optional(),
  isDefault: z.boolean().default(false),
  color: z.string().optional(),
  icon: z.string().optional(),
});

const updateListSchema = createListSchema.partial();

const addItemSchema = z.object({
  productId: z.string().min(1, 'Product ID is required'),
  productName: z.string().min(1, 'Product name is required'),
  store: z.string().min(1, 'Store is required'),
  category: z.string().optional(),
  imageUrl: z.string().optional(),
  price: z.number().optional(),
  quantity: z.number().int().min(1).default(1),
  notes: z.string().optional(),
});

const updateItemSchema = z.object({
  quantity: z.number().int().min(1).optional(),
  checked: z.boolean().optional(),
  notes: z.string().optional(),
});

export async function shoppingListRoutes(fastify: FastifyInstance) {
  /**
   * GET /shopping-lists
   * Get all shopping lists for the authenticated user
   */
  fastify.get(
    '/shopping-lists',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Get all shopping lists',
        tags: ['shopping-lists'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        const lists = await prisma.shoppingList.findMany({
          where: { userId: request.user.userId },
          include: {
            items: {
              orderBy: { addedAt: 'desc' },
            },
          },
          orderBy: [
            { isDefault: 'desc' },
            { createdAt: 'desc' },
          ],
        });

        // Calculate stats for each list
        const listsWithStats = lists.map((list) => ({
          ...list,
          totalItems: list.items.length,
          checkedItems: list.items.filter((item) => item.checked).length,
          completionPercentage:
            list.items.length > 0
              ? Math.round((list.items.filter((item) => item.checked).length / list.items.length) * 100)
              : 0,
        }));

        reply.send({
          success: true,
          data: { lists: listsWithStats },
        });
      } catch (error) {
        fastify.log.error('Get shopping lists error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to get shopping lists',
        });
      }
    }
  );

  /**
   * POST /shopping-lists
   * Create a new shopping list
   */
  fastify.post(
    '/shopping-lists',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Create a new shopping list',
        tags: ['shopping-lists'],
      },
    },
    async (request: FastifyRequest, reply: FastifyReply) => {
      try {
        if (!request.user) {
          reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        const validatedData = createListSchema.parse(request.body);

        // If setting as default, unset other defaults
        if (validatedData.isDefault) {
          await prisma.shoppingList.updateMany({
            where: {
              userId: request.user.userId,
              isDefault: true,
            },
            data: { isDefault: false },
          });
        }

        const list = await prisma.shoppingList.create({
          data: {
            ...validatedData,
            userId: request.user.userId,
          },
          include: {
            items: true,
          },
        });

        reply.status(201).send({
          success: true,
          data: { list },
          message: 'Shopping list created successfully',
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
          return;
        }

        fastify.log.error('Create shopping list error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to create shopping list',
        });
      }
    }
  );

  /**
   * GET /shopping-lists/:id
   * Get a specific shopping list with items
   */
  fastify.get(
    '/shopping-lists/:id',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Get shopping list by ID',
        tags: ['shopping-lists'],
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        if (!request.user) {
          reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        const list = await prisma.shoppingList.findFirst({
          where: {
            id: request.params.id,
            userId: request.user.userId,
          },
          include: {
            items: {
              orderBy: { addedAt: 'desc' },
            },
          },
        });

        if (!list) {
          reply.status(404).send({
            success: false,
            error: 'Shopping list not found',
          });
          return;
        }

        const stats = {
          totalItems: list.items.length,
          checkedItems: list.items.filter((item) => item.checked).length,
          completionPercentage:
            list.items.length > 0
              ? Math.round((list.items.filter((item) => item.checked).length / list.items.length) * 100)
              : 0,
        };

        reply.send({
          success: true,
          data: { list: { ...list, ...stats } },
        });
      } catch (error) {
        fastify.log.error('Get shopping list error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to get shopping list',
        });
      }
    }
  );

  /**
   * PATCH /shopping-lists/:id
   * Update a shopping list
   */
  fastify.patch(
    '/shopping-lists/:id',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Update shopping list',
        tags: ['shopping-lists'],
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        if (!request.user) {
          reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        const validatedData = updateListSchema.parse(request.body);

        // Verify ownership
        const existing = await prisma.shoppingList.findFirst({
          where: {
            id: request.params.id,
            userId: request.user.userId,
          },
        });

        if (!existing) {
          reply.status(404).send({
            success: false,
            error: 'Shopping list not found',
          });
          return;
        }

        // If setting as default, unset other defaults
        if (validatedData.isDefault) {
          await prisma.shoppingList.updateMany({
            where: {
              userId: request.user.userId,
              isDefault: true,
              id: { not: request.params.id },
            },
            data: { isDefault: false },
          });
        }

        const updated = await prisma.shoppingList.update({
          where: { id: request.params.id },
          data: validatedData,
          include: {
            items: true,
          },
        });

        reply.send({
          success: true,
          data: { list: updated },
          message: 'Shopping list updated successfully',
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
          return;
        }

        fastify.log.error('Update shopping list error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to update shopping list',
        });
      }
    }
  );

  /**
   * DELETE /shopping-lists/:id
   * Delete a shopping list
   */
  fastify.delete(
    '/shopping-lists/:id',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Delete shopping list',
        tags: ['shopping-lists'],
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        if (!request.user) {
          reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        // Verify ownership
        const existing = await prisma.shoppingList.findFirst({
          where: {
            id: request.params.id,
            userId: request.user.userId,
          },
        });

        if (!existing) {
          reply.status(404).send({
            success: false,
            error: 'Shopping list not found',
          });
          return;
        }

        await prisma.shoppingList.delete({
          where: { id: request.params.id },
        });

        reply.send({
          success: true,
          message: 'Shopping list deleted successfully',
        });
      } catch (error) {
        fastify.log.error('Delete shopping list error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to delete shopping list',
        });
      }
    }
  );

  /**
   * POST /shopping-lists/:id/items
   * Add item to shopping list
   */
  fastify.post(
    '/shopping-lists/:id/items',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Add item to shopping list',
        tags: ['shopping-lists'],
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        if (!request.user) {
          reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        const validatedData = addItemSchema.parse(request.body);

        // Verify list ownership
        const list = await prisma.shoppingList.findFirst({
          where: {
            id: request.params.id,
            userId: request.user.userId,
          },
        });

        if (!list) {
          reply.status(404).send({
            success: false,
            error: 'Shopping list not found',
          });
          return;
        }

        // Check if item already exists
        const existing = await prisma.shoppingListItem.findFirst({
          where: {
            listId: request.params.id,
            productId: validatedData.productId,
            store: validatedData.store,
          },
        });

        if (existing) {
          // Update quantity if already exists
          const updated = await prisma.shoppingListItem.update({
            where: { id: existing.id },
            data: {
              quantity: existing.quantity + validatedData.quantity,
              checked: false, // Uncheck when adding more
            },
          });

          reply.send({
            success: true,
            data: { item: updated },
            message: 'Item quantity updated',
          });
          return;
        }

        const item = await prisma.shoppingListItem.create({
          data: {
            ...validatedData,
            listId: request.params.id,
          },
        });

        reply.status(201).send({
          success: true,
          data: { item },
          message: 'Item added to shopping list',
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
          return;
        }

        fastify.log.error('Add list item error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to add item to list',
        });
      }
    }
  );

  /**
   * PATCH /shopping-lists/:listId/items/:itemId
   * Update shopping list item
   */
  fastify.patch(
    '/shopping-lists/:listId/items/:itemId',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Update shopping list item',
        tags: ['shopping-lists'],
      },
    },
    async (
      request: FastifyRequest<{ Params: { listId: string; itemId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        if (!request.user) {
          reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        const validatedData = updateItemSchema.parse(request.body);

        // Verify list ownership
        const list = await prisma.shoppingList.findFirst({
          where: {
            id: request.params.listId,
            userId: request.user.userId,
          },
        });

        if (!list) {
          reply.status(404).send({
            success: false,
            error: 'Shopping list not found',
          });
          return;
        }

        const item = await prisma.shoppingListItem.findFirst({
          where: {
            id: request.params.itemId,
            listId: request.params.listId,
          },
        });

        if (!item) {
          reply.status(404).send({
            success: false,
            error: 'Item not found',
          });
          return;
        }

        const updated = await prisma.shoppingListItem.update({
          where: { id: request.params.itemId },
          data: validatedData,
        });

        reply.send({
          success: true,
          data: { item: updated },
          message: 'Item updated successfully',
        });
      } catch (error: any) {
        if (error instanceof z.ZodError) {
          reply.status(400).send({
            success: false,
            error: 'Validation failed',
            details: error.errors,
          });
          return;
        }

        fastify.log.error('Update list item error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to update item',
        });
      }
    }
  );

  /**
   * DELETE /shopping-lists/:listId/items/:itemId
   * Remove item from shopping list
   */
  fastify.delete(
    '/shopping-lists/:listId/items/:itemId',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Remove item from shopping list',
        tags: ['shopping-lists'],
      },
    },
    async (
      request: FastifyRequest<{ Params: { listId: string; itemId: string } }>,
      reply: FastifyReply
    ) => {
      try {
        if (!request.user) {
          reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        // Verify list ownership
        const list = await prisma.shoppingList.findFirst({
          where: {
            id: request.params.listId,
            userId: request.user.userId,
          },
        });

        if (!list) {
          reply.status(404).send({
            success: false,
            error: 'Shopping list not found',
          });
          return;
        }

        const item = await prisma.shoppingListItem.findFirst({
          where: {
            id: request.params.itemId,
            listId: request.params.listId,
          },
        });

        if (!item) {
          reply.status(404).send({
            success: false,
            error: 'Item not found',
          });
          return;
        }

        await prisma.shoppingListItem.delete({
          where: { id: request.params.itemId },
        });

        reply.send({
          success: true,
          message: 'Item removed from list',
        });
      } catch (error) {
        fastify.log.error('Delete list item error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to remove item',
        });
      }
    }
  );

  /**
   * POST /shopping-lists/:id/clear-checked
   * Clear all checked items from list
   */
  fastify.post(
    '/shopping-lists/:id/clear-checked',
    {
      preHandler: authenticateUser,
      schema: {
        description: 'Clear all checked items',
        tags: ['shopping-lists'],
      },
    },
    async (request: FastifyRequest<{ Params: { id: string } }>, reply: FastifyReply) => {
      try {
        if (!request.user) {
          reply.status(401).send({
            success: false,
            error: 'User not authenticated',
          });
          return;
        }

        // Verify list ownership
        const list = await prisma.shoppingList.findFirst({
          where: {
            id: request.params.id,
            userId: request.user.userId,
          },
        });

        if (!list) {
          reply.status(404).send({
            success: false,
            error: 'Shopping list not found',
          });
          return;
        }

        const result = await prisma.shoppingListItem.deleteMany({
          where: {
            listId: request.params.id,
            checked: true,
          },
        });

        reply.send({
          success: true,
          data: { deletedCount: result.count },
          message: `Cleared ${result.count} checked items`,
        });
      } catch (error) {
        fastify.log.error('Clear checked items error:', error);

        reply.status(500).send({
          success: false,
          error: 'Failed to clear checked items',
        });
      }
    }
  );
}
