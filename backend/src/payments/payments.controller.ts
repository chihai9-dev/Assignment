import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseIntPipe,
  Post,
  UsePipes,
  ValidationPipe,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { VerifyPayOSDto } from './dto/verify-payos.dto';

@Controller('api/payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Body() createPaymentDto: CreatePaymentDto) {
    return this.paymentsService.create(createPaymentDto);
  }

  // Xác thực và đồng bộ thanh toán PayOS tự động (từ returnUrl hoặc polling)
  @Post(['payos-verify', 'verify-payos'])
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false, transform: true }))
  verifyPayOSPayment(@Body() body: VerifyPayOSDto) {
    return this.paymentsService.verifyPayOSPayment(body);
  }

  // Tạo liên kết thanh toán PayOS (Sinh mã VietQR / MoMo quét được trên điện thoại)
  // Hỗ trợ cả 2 endpoint /api/payments/payos-link và /api/payments/create-payos-link
  @Post(['payos-link', 'create-payos-link'])
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false, transform: true }))
  createPayOSLink(
    @Body() body: { orderId: number; returnUrl?: string; cancelUrl?: string },
  ) {
    return this.paymentsService.createPayOSLink(Number(body.orderId), body);
  }

  // Nhận thông báo biến động số dư từ cổng PayOS qua Webhook
  @Post('payos-webhook')
  @HttpCode(HttpStatus.OK)
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false }))
  handlePayOSWebhook(@Body() body: any) {
    return this.paymentsService.handlePayOSWebhook(body);
  }

  // Xác thực tự động Webhook URL với PayOS API
  @Post('payos-confirm-url')
  @UsePipes(new ValidationPipe({ whitelist: false, forbidNonWhitelisted: false }))
  confirmPayOSWebhookUrl(@Body() body: { webhookUrl: string }) {
    return this.paymentsService.confirmPayOSWebhookUrl(body.webhookUrl);
  }

  // Lấy trạng thái thanh toán hiện tại của đơn hàng
  @Get('status/:orderId')
  getStatus(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentsService.getPaymentStatus(orderId);
  }

  // Tạo hóa đơn thanh toán MoMo Sandbox
  @Post('momo-payment')
  createMomoPayment(@Body() body: { orderId: number }) {
    return this.paymentsService.createMomoPayment(Number(body.orderId));
  }

  // Nhận IPN Webhook từ MoMo
  @Post('momo-ipn')
  @HttpCode(HttpStatus.OK)
  handleMomoIPN(@Body() body: any) {
    return this.paymentsService.handleMomoIPN(body);
  }

  @Get('order/:orderId')
  findByOrder(@Param('orderId', ParseIntPipe) orderId: number) {
    return this.paymentsService.findByOrder(orderId);
  }
}
