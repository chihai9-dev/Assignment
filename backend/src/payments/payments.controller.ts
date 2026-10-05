import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Post,
} from '@nestjs/common';

import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

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

  @Get('order/:orderId')
  findByOrder(
    @Param('orderId', ParseIntPipe) orderId: number,
  ) {
    return this.paymentsService.findByOrder(orderId);
  }
}