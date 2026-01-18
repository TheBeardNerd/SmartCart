import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('analytics')
@UseGuards(JwtAuthGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  async getOverview(@Request() req, @Query('period') period?: string) {
    const userId = req.user.userId;
    return this.analyticsService.getOverview(userId, period || 'all');
  }

  @Get('savings')
  async getSavings(@Request() req, @Query('period') period?: string) {
    const userId = req.user.userId;
    return this.analyticsService.getSavings(userId, period || 'all');
  }

  @Get('spending-trends')
  async getSpendingTrends(@Request() req, @Query('period') period?: string) {
    const userId = req.user.userId;
    return this.analyticsService.getSpendingTrends(userId, period || 'year');
  }

  @Get('category-breakdown')
  async getCategoryBreakdown(@Request() req) {
    const userId = req.user.userId;
    return this.analyticsService.getCategoryBreakdown(userId);
  }

  @Get('store-breakdown')
  async getStoreBreakdown(@Request() req) {
    const userId = req.user.userId;
    return this.analyticsService.getStoreBreakdown(userId);
  }

  @Get('top-products')
  async getTopProducts(@Request() req, @Query('limit') limit?: string) {
    const userId = req.user.userId;
    return this.analyticsService.getTopProducts(userId, parseInt(limit || '10'));
  }

  @Get('shopping-frequency')
  async getShoppingFrequency(@Request() req) {
    const userId = req.user.userId;
    return this.analyticsService.getShoppingFrequency(userId);
  }
}
