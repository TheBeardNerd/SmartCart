import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller()
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get('health')
  async getHealth() {
    return {
      status: 'ok',
      timestamp: new Date().toISOString(),
      service: 'order-service',
    };
  }

  @Get('health/detailed')
  async getDetailedHealth() {
    let dbStatus = 'ok';

    try {
      await this.prisma.$queryRaw`SELECT 1`;
    } catch (error) {
      dbStatus = 'error';
    }

    return {
      status: dbStatus === 'ok' ? 'ok' : 'degraded',
      timestamp: new Date().toISOString(),
      service: 'order-service',
      dependencies: {
        database: dbStatus,
      },
    };
  }

  @Get('ready')
  async getReadiness() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { ready: true };
    } catch (error) {
      return { ready: false };
    }
  }

  @Get('live')
  getLiveness() {
    return { alive: true };
  }
}
