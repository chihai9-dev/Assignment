import { Injectable } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
// Lưu ý: Đảm bảo đường dẫn này trỏ đúng tới file PrismaService của bạn
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  async create(createOrderDto: CreateOrderDto, userId: number) {
    // 1. Tính tổng tiền của đơn hàng
    const totalAmount = createOrderDto.items.reduce(
      (sum, item) => sum + item.price * item.qty,
      0,
    );

// 2. Lưu vào database với trạng thái PENDING
    const order = await this.prisma.order.create({
      data: {
        userId, // lấy từ JWT (req.user.userId), không tin dữ liệu người dùng tự gửi lên
        status: 'PENDING',
        total: totalAmount,
        OrderItem: {
          create: createOrderDto.items.map((item) => ({
            size: item.size as any, // <--- Thêm "as any" ở đây để ép kiểu
            qty: item.qty,
            lineTotal: item.price * item.qty,
            Product: {
              connect: { id: item.productId }
            }
          })),
        },
      },
    });

    // 3. Trả về mã đơn hàng theo yêu cầu Task 6
    return {
      message: 'Tạo đơn hàng thành công',
      orderId: order.id,
    };
  }
}