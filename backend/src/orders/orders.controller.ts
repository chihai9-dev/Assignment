import { Controller, Get } from '@nestjs/common';

@Controller('orders')
export class OrdersController {
  @Get()
  testOrderApi() {
    return "API Quản lý Đơn hàng (Task 6) đã sẵn sàng!";
  }
}