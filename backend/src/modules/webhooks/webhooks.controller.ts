import { Controller, Logger, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';

import { Public } from '../auth/decorators/public.decorator';

/**
 * Controller for receiving BBB webhook events.
 * Placeholder implementation — full webhook handling will be added in Sprint 1.
 */
@ApiTags('Webhooks')
@Public()
@Controller('webhooks')
export class WebhooksController {
  private readonly logger = new Logger(WebhooksController.name);

  @Post('bbb')
  @ApiOperation({ summary: 'Receive BBB webhook events' })
  @ApiResponse({ status: 200, description: 'Webhook received successfully' })
  async handleBbbWebhook(): Promise<{ received: boolean }> {
    this.logger.log('Received BBB webhook event');
    return { received: true };
  }
}
