import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(private prisma: PrismaService) {}

  async create(createPaymentDto: CreatePaymentDto) {
    const {
      orderId,
      amount,
      method,
      idempotencyKey,
    } = createPaymentDto;

    // 1. Kiểm tra giao dịch trùng
    const existingPayment =
      await this.prisma.payment.findUnique({
        where: {
          idempotencyKey,
        },
      });

    if (existingPayment) {
      throw new ConflictException(
        'Giao dịch thanh toán này đã được xử lý',
      );
    }

    // 2. Kiểm tra Order
    const order = await this.prisma.order.findUnique({
      where: {
        id: BigInt(orderId),
      },
    });

    if (!order) {
      throw new NotFoundException(
        `Không tìm thấy đơn hàng ${orderId}`,
      );
    }

    // 3. Không cho thanh toán đơn đã hủy
    if (order.status === 'CANCELLED') {
      throw new BadRequestException(
        'Không thể thanh toán đơn hàng đã hủy',
      );
    }

    // 4. Kiểm tra số tiền
    if (Number(order.total) !== amount) {
      throw new BadRequestException(
        'Số tiền thanh toán không khớp với tổng tiền đơn hàng',
      );
    }

    // 5. Tạo Payment và cập nhật Order
    const result = await this.prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.create({
          data: {
            orderId: BigInt(orderId),
            amount,
            method,
            idempotencyKey,
          },
        });

        const updatedOrder =
          await tx.order.update({
            where: {
              id: BigInt(orderId),
            },
            data: {
              status: 'PAID',
            },
          });

        return {
          payment,
          order: updatedOrder,
        };
      },
    );

    return result;
  }

  async findByOrder(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: BigInt(orderId),
      },
    });

    if (!order) {
      throw new NotFoundException(
        `Không tìm thấy đơn hàng ${orderId}`,
      );
    }

    return this.prisma.payment.findMany({
      where: {
        orderId: BigInt(orderId),
      },
    });
  }
}