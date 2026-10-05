import { Body, Controller, Post, Request, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CreateOrderDto } from './dto/create-order.dto';
import { OrdersService } from './orders.service';

@Controller('api/orders') // Phải có chữ api để đồng bộ với Frontend
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @UseGuards(JwtAuthGuard) // Task 7: bắt buộc phải đăng nhập (gửi Bearer token) mới đặt đơn được
  @Post()
  create(
    @Body() createOrderDto: CreateOrderDto,
    @Request() req: { user: { userId: number; email: string } },
  ) {
    return this.ordersService.create(createOrderDto, req.user.userId);
  }
}