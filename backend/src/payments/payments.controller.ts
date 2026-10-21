import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { CreatePayOSLinkDto } from './dto/create-payos-link.dto';

@Controller('api/payments')
export class PaymentsController {
  constructor(
    private readonly paymentsService: PaymentsService,
  ) {}

  @Post()
  create(
    @Body() createPaymentDto: CreatePaymentDto,
  ) {
    return this.paymentsService.create(
      createPaymentDto,
    );
  }

  @Post('create-payos-link')
  createPayOSLink(
    @Body() dto: CreatePayOSLinkDto,
  ) {
    return this.paymentsService.createPayOSPaymentLink(dto.orderId);
  }

  @Get('order/:orderId')
  findByOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.paymentsService.findByOrder(orderId);
  }

  //Liên kết webhoob của payos
  @Get('payos-webhook')
  checkWebhookHealth() {
    return {
      status: 'ok',
      message: 'PayOS Webhook endpoint is active and ready to receive POST notifications!',
    };
  }

  @Post('payos-webhook')
  @HttpCode(HttpStatus.OK)
  handlePayOSWebhook(
    @Body() webhookData: any,
  ) {
    return this.paymentsService.handlePayOSWebhook(webhookData);
  }
}
