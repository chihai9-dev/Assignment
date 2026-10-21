import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Request,
  UseGuards,
} from '@nestjs/common';
import { order_status } from '@prisma/client';
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
    return this.ordersService.create(createOrderDto, Number(req.user.userId));
  }

  // Lấy danh sách đơn hàng của người dùng hiện tại
  @UseGuards(JwtAuthGuard)
  @Get('me')
  findMyOrders(@Request() req: { user: { userId: number; email: string } }) {
    return this.ordersService.findAllByUser(Number(req.user.userId));
  }

  // Hàng đợi đơn hàng cho Barista (các đơn PAID đang chờ pha chế)
  // - Nếu là Barista: thấy toàn bộ đơn hàng trong hàng đợi
  // - Nếu là Khách hàng: chỉ xem đơn hàng của chính mình
  @UseGuards(JwtAuthGuard)
  @Get('barista/queue')
  getBaristaQueue(
    @Request() req: { user: { userId: number; email: string; role?: string } },
  ) {
    return this.ordersService.findBaristaQueue(Number(req.user.userId));
  }

  // Barista nhận pha chế: PAID -> PREPARING
  @UseGuards(JwtAuthGuard)
  @Patch('barista/:id/prepare')
  prepareOrder(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { userId: number; email: string } },
  ) {
    return this.ordersService.baristaUpdateStatus(
      id,
      order_status.PREPARING,
      Number(req.user.userId),
    );
  }

  // Barista hoàn tất pha chế: PREPARING -> READY
  @UseGuards(JwtAuthGuard)
  @Patch('barista/:id/ready')
  readyOrder(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { userId: number; email: string } },
  ) {
    return this.ordersService.baristaUpdateStatus(
      id,
      order_status.READY,
      Number(req.user.userId),
    );
  }

  // Barista giao cho khách hoàn tất: READY -> COMPLETED
  @UseGuards(JwtAuthGuard)
  @Patch('barista/:id/complete')
  completeOrder(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { userId: number; email: string } },
  ) {
    return this.ordersService.baristaUpdateStatus(
      id,
      order_status.COMPLETED,
      Number(req.user.userId),
    );
  }

  // Hủy đơn hàng (Order State Machine: PENDING/PAID/PAYMENT_FAILED -> CANCELLED)
  @UseGuards(JwtAuthGuard)
  @Patch(':id/cancel')
  cancelOrder(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { userId: number; email: string } },
  ) {
    return this.ordersService.cancelOrder(id, Number(req.user.userId));
  }

  // Thử lại thanh toán sau khi bị lỗi: PAYMENT_FAILED -> PENDING
  @UseGuards(JwtAuthGuard)
  @Patch(':id/retry')
  retryPayment(
    @Param('id', ParseIntPipe) id: number,
    @Request() req: { user: { userId: number; email: string } },
  ) {
    return this.ordersService.retryPayment(id, Number(req.user.userId));
  }

  // Lấy chi tiết đơn hàng theo ID (đặt sau các route cụ thể để tránh conflict routing)
  @UseGuards(JwtAuthGuard)
  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.ordersService.findOne(id);
  }
}