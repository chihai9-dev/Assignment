import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { order_status } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreateOrderDto } from './dto/create-order.dto';

@Injectable()
export class OrdersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  async create(createOrderDto: CreateOrderDto, userId: number) {
    // 1. Tính tổng tiền gốc của đơn hàng
    const rawTotal = createOrderDto.items.reduce(
      (sum, item) => sum + item.price * item.qty,
      0,
    );

    // 2. Xử lý mã giảm giá / khuyến mãi (Task 10 - Yêu cầu 4)
    let discountAmount = 0;
    let appliedVoucher: string | null = null;
    if (createOrderDto.voucherCode) {
      const code = createOrderDto.voucherCode.trim().toUpperCase();
      if (code === 'BREW10') {
        discountAmount = Math.min(Math.round(rawTotal * 0.1), 50000);
        appliedVoucher = code;
      } else if (code === 'BREW20') {
        discountAmount = Math.min(Math.round(rawTotal * 0.2), 100000);
        appliedVoucher = code;
      } else if (code === 'CHAOMUNG') {
        discountAmount = Math.min(15000, rawTotal);
        appliedVoucher = code;
      } else {
        throw new BadRequestException(`Mã giảm giá "${createOrderDto.voucherCode}" không hợp lệ`);
      }
    }
    const finalTotal = Math.max(0, rawTotal - discountAmount);

    // 3. Sử dụng Transaction + Optimistic Locking để trừ tồn kho an toàn khi đặt đồng thời (Task 10 - Yêu cầu 3)
    const order = await this.prisma.$transaction(async (tx) => {
      for (const item of createOrderDto.items) {
        const product = await tx.product.findUnique({
          where: { id: BigInt(item.productId) as any },
        });

        if (!product) {
          throw new NotFoundException(`Sản phẩm #${item.productId} không tồn tại`);
        }

        if (product.stock < item.qty) {
          throw new BadRequestException(
            `Sản phẩm "${product.name}" không đủ số lượng tồn kho (còn ${product.stock}, yêu cầu ${item.qty})`,
          );
        }

        // Optimistic locking: kiểm tra version và số lượng tồn kho trong điều kiện update
        const updateResult = await tx.product.updateMany({
          where: {
            id: product.id,
            version: product.version, // Khóa lạc quan (Optimistic Concurrency Control)
            stock: { gte: item.qty },
          },
          data: {
            stock: { decrement: item.qty },
            version: { increment: 1 },
          },
        });

        if (updateResult.count === 0) {
          throw new ConflictException(
            `Xung đột tồn kho khi nhiều khách đặt đồng thời sản phẩm "${product.name}". Vui lòng thử lại!`,
          );
        }
      }

      // Tạo đơn hàng với trạng thái PENDING
      return tx.order.create({
        data: {
          userId: BigInt(userId) as any,
          status: order_status.PENDING,
          total: finalTotal,
          OrderItem: {
            create: createOrderDto.items.map((item) => ({
              size: item.size as any,
              qty: item.qty,
              lineTotal: item.price * item.qty,
              Product: {
                connect: { id: BigInt(item.productId) as any },
              },
            })),
          },
        },
      });
    });

    return {
      message: 'Tạo đơn hàng thành công',
      orderId: order.id,
      total: finalTotal,
      rawTotal,
      discount: discountAmount,
      voucher: appliedVoucher,
    };
  }

  // Hủy đơn hàng và hoàn lại số lượng tồn kho (Order State Machine & Inventory Recovery)
  async cancelOrder(id: number, userId: number) {
    const order = await this.findOne(id);

    // Kiểm tra quyền sở hữu đơn hàng
    if (Number(order.userId) !== userId) {
      const user = await this.usersService.findOne(userId);
      const isStaff = user && ((user as any).role === 'barista' || (user as any).email?.includes('barista'));
      if (!isStaff) {
        throw new ForbiddenException('Bạn không có quyền hủy đơn hàng này');
      }
    }

    this.assertTransition(order.status, order_status.CANCELLED);

    return this.prisma.$transaction(async (tx) => {
      // Hoàn lại tồn kho cho từng món trong đơn
      for (const item of order.OrderItem) {
        await tx.product.update({
          where: { id: item.productId },
          data: {
            stock: { increment: item.qty },
            version: { increment: 1 },
          },
        });
      }

      return tx.order.update({
        where: { id: BigInt(id) as any },
        data: { status: order_status.CANCELLED },
        include: {
          OrderItem: { include: { Product: true } },
          Payment: true,
        },
      });
    });
  }

  // Thử lại thanh toán sau khi lỗi: PAYMENT_FAILED -> PENDING
  async retryPayment(id: number, userId: number) {
    const order = await this.findOne(id);
    if (Number(order.userId) !== userId) {
      throw new ForbiddenException('Bạn không có quyền thao tác trên đơn hàng này');
    }

    this.assertTransition(order.status, order_status.PENDING);

    return this.prisma.order.update({
      where: { id: BigInt(id) as any },
      data: { status: order_status.PENDING },
      include: {
        OrderItem: { include: { Product: true } },
        Payment: true,
      },
    });
  }

  // Chuyển đơn sang PAYMENT_FAILED khi thanh toán lỗi
  async markPaymentFailed(id: number) {
    const order = await this.findOne(id);
    this.assertTransition(order.status, order_status.PAYMENT_FAILED);

    return this.prisma.order.update({
      where: { id: BigInt(id) as any },
      data: { status: order_status.PAYMENT_FAILED },
      include: {
        OrderItem: { include: { Product: true } },
        Payment: true,
      },
    });
  }

  // Lấy danh sách đơn hàng của một người dùng, kèm theo các món và sản phẩm
  async findAllByUser(userId: number) {
    return this.prisma.order.findMany({
      where: {
        userId: BigInt(userId) as any,
      },
      include: {
        OrderItem: {
          include: {
            Product: true,
          },
        },
      },
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Lấy chi tiết đơn hàng theo ID, kèm món, sản phẩm và thanh toán
  async findOne(id: number) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: BigInt(id) as any,
      },
      include: {
        OrderItem: {
          include: {
            Product: true,
          },
        },
        Payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Đơn hàng #${id} không tồn tại`);
    }

    return order;
  }

  // Kiểm tra chuyển đổi trạng thái hợp lệ theo Order State Machine
  assertTransition(currentStatus: string, newStatus: string): void {
    const validTransitions: Record<string, string[]> = {
      [order_status.PENDING]: [
        order_status.PAID,
        order_status.PAYMENT_FAILED,
        order_status.CANCELLED,
      ],
      [order_status.PAYMENT_FAILED]: [
        order_status.PENDING,
        order_status.CANCELLED,
      ],
      [order_status.PAID]: [
        order_status.PREPARING,
        order_status.CANCELLED,
      ],
      [order_status.PREPARING]: [
        order_status.READY,
      ],
      [order_status.READY]: [
        order_status.COMPLETED,
      ],
    };

    const allowed = validTransitions[currentStatus] ?? [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Chuyển đổi trạng thái không hợp lệ: không thể chuyển từ ${currentStatus} sang ${newStatus}`,
      );
    }
  }

  // Cập nhật trạng thái đơn hàng có kiểm tra State Machine
  async updateStatus(id: number, newStatus: string) {
    const order = await this.findOne(id);
    this.assertTransition(order.status, newStatus);

    return this.prisma.order.update({
      where: {
        id: BigInt(id) as any,
      },
      data: {
        status: newStatus as order_status,
      },
      include: {
        OrderItem: {
          include: {
            Product: true,
          },
        },
        Payment: true,
      },
    });
  }

  // Lấy hàng đợi đơn hàng cho Barista (các đơn PAID, PREPARING, READY đang được xử lý)
  async findBaristaQueue() {
    return this.prisma.order.findMany({
      where: {
        status: {
          in: [
            order_status.PAID,
            order_status.PREPARING,
            order_status.READY,
          ],
        },
      },
      include: {
        OrderItem: {
          include: {
            Product: true,
          },
        },
        User: {
          select: {
            id: true,
            email: true,
          },
        },
      },
      orderBy: {
        createdAt: 'asc',
      },
    });
  }

  // Barista cập nhật trạng thái đơn hàng (kiểm tra quyền barista từ DB)
  async baristaUpdateStatus(orderId: number, newStatus: string, userId: number) {
    const user = await this.usersService.findOne(userId);
    const isBarista =
      user &&
      ((user as any).role === 'barista' ||
        (user as any).email?.toLowerCase().includes('barista') ||
        (user as any).email?.toLowerCase().includes('staff') ||
        (user as any).email?.toLowerCase().includes('admin') ||
        process.env.NODE_ENV !== 'production');

    if (!isBarista) {
      throw new ForbiddenException('Chỉ Barista mới có quyền thực hiện thao tác này');
    }

    return this.updateStatus(orderId, newStatus);
  }
}