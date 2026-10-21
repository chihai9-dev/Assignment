import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { order_status, payment_method } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PayOS } = require('@payos/node');

@Injectable()
export class PaymentsService implements OnModuleInit {
  private payOS: any = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  onModuleInit() {
    const clientId = process.env.PAYOS_CLIENT_ID;
    const apiKey = process.env.PAYOS_API_KEY;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    if (clientId && apiKey && checksumKey) {
      try {
        this.payOS = new PayOS({
          clientId,
          apiKey,
          checksumKey,
        });
        console.log('[PayOS] SDK initialized successfully with client ID:', clientId.slice(0, 8) + '...');
      } catch (err: any) {
        console.error('[PayOS] Initialization error:', err?.message || err);
      }
    }
  }

  async create(createPaymentDto: CreatePaymentDto) {
    const {
      orderId,
      amount,
      method,
      idempotencyKey,
    } = createPaymentDto;

    // 1. Kiểm tra Idempotency: Giao dịch cùng key đã tồn tại -> Trả về giao dịch trước đó, không trừ tiền 2 lần
    const existingPayment =
      await this.prisma.payment.findUnique({
        where: {
          idempotencyKey,
        },
      });

    if (existingPayment) {
      const existingOrder = await this.prisma.order.findUnique({
        where: { id: BigInt(orderId) as any },
      });
      return {
        payment: existingPayment,
        order: existingOrder,
        idempotent: true,
        message: 'Giao dịch thanh toán đã được xử lý thành công trước đó (Idempotent)',
      };
    }

    // 2. Kiểm tra Order
    const order = await this.prisma.order.findUnique({
      where: {
        id: BigInt(orderId) as any,
      },
    });

    if (!order) {
      throw new NotFoundException(
        `Không tìm thấy đơn hàng #${orderId}`,
      );
    }

    // 3. Không cho thanh toán đơn đã hủy hoặc đơn đã hoàn thành
    if (order.status === order_status.CANCELLED) {
      throw new BadRequestException(
        'Không thể thanh toán đơn hàng đã hủy',
      );
    }
    if (order.status === order_status.COMPLETED) {
      throw new BadRequestException(
        'Đơn hàng này đã hoàn thành',
      );
    }
    if (order.status === order_status.PAID) {
      throw new BadRequestException(
        'Đơn hàng này đã được thanh toán',
      );
    }

    // 4. Kiểm tra số tiền thanh toán khớp với tổng đơn
    if (Number(order.total) !== amount) {
      throw new BadRequestException(
        `Số tiền thanh toán (${amount}đ) không khớp với tổng tiền đơn hàng (${Number(order.total)}đ)`,
      );
    }

    // 5. Tạo Payment và cập nhật Order sang PAID trong Transaction
    const result = await this.prisma.$transaction(
      async (tx) => {
        const payment = await tx.payment.create({
          data: {
            orderId: BigInt(orderId) as any,
            amount,
            method,
            idempotencyKey,
          },
        });

        const updatedOrder =
          await tx.order.update({
            where: {
              id: BigInt(orderId) as any,
            },
            data: {
              status: order_status.PAID,
            },
          });

        return {
          payment,
          order: updatedOrder,
        };
      },
    );

    // 6. Cộng điểm thưởng tích lũy (Loyalty Points) sau khi thanh toán thành công (1 điểm / 10.000đ)
    const pointsEarned = Math.floor(amount / 10000);
    if (pointsEarned > 0) {
      try {
        await this.usersService.addLoyaltyPoints(Number(order.userId), pointsEarned);
      } catch (err) {
        console.error('Lỗi cộng điểm tích lũy:', err);
      }
    }

    return {
      ...result,
      pointsEarned,
    };
  }

  async findByOrder(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: {
        id: Number(orderId),
      },
    });

    if (!order) {
      throw new NotFoundException(
        `Không tìm thấy đơn hàng ${orderId}`,
      );
    }

    return this.prisma.payment.findMany({
      where: {
        orderId: Number(orderId),
      },
    });
  }

  /**
   * Tạo link thanh toán VietQR động bằng PayOS
   */
  async createPayOSPaymentLink(orderId: number) {
    if (!this.payOS) {
      throw new BadRequestException('PayOS chưa được khởi tạo, vui lòng kiểm tra cấu hình .env');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(orderId) as any },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${orderId}`);
    }

    if (order.status === order_status.PAID || order.status === order_status.COMPLETED) {
      throw new BadRequestException('Đơn hàng này đã được thanh toán');
    }

    const orderCode = Number(order.id);
    const amount = Math.round(Number(order.total));
    const description = `BrewLite #${orderId}`.slice(0, 25);

    try {
      const paymentLinkRes = await this.payOS.paymentRequests.create({
        orderCode,
        amount,
        description,
        cancelUrl: 'http://localhost:3000/checkout',
        returnUrl: `http://localhost:3000/orders/${orderId}`,
      });

      return {
        orderId,
        checkoutUrl: paymentLinkRes.checkoutUrl,
        qrCode: paymentLinkRes.qrCode,
        accountNumber: paymentLinkRes.accountNumber,
        accountName: paymentLinkRes.accountName,
        amount: paymentLinkRes.amount,
        description: paymentLinkRes.description,
      };
    } catch (err: any) {
      console.error('[PayOS] Lỗi tạo payment link:', err?.message || err);
      throw new BadRequestException(err?.message || 'Không thể tạo mã thanh toán VietQR');
    }
  }

  /**
   * Xử lý webhook từ PayOS khi khách chuyển khoản VietQR thành công
   */
  async handlePayOSWebhook(webhookBody: any) {
    console.log('[PayOS Webhook] Received webhook payload:', JSON.stringify(webhookBody));

    if (!webhookBody) {
      return { success: false, message: 'No data' };
    }

    let verifiedData: any = null;

    if (this.payOS && webhookBody.signature) {
      try {
        verifiedData = await this.payOS.webhooks.verify(webhookBody);
      } catch (err: any) {
        console.warn('[PayOS Webhook] Signature notice:', err?.message || err);
        verifiedData = webhookBody.data;
      }
    } else {
      verifiedData = webhookBody.data;
    }

    if (!verifiedData) {
      return { success: true, message: 'Ping/verification acknowledged' };
    }

    const orderCode = Number(verifiedData.orderCode);
    if (!orderCode) {
      return { success: true, message: 'No valid orderCode found' };
    }

    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(orderCode) as any },
    });

    if (!order) {
      console.warn(`[PayOS Webhook] Order #${orderCode} not found in database`);
      return { success: true, message: 'Order not found, acknowledged' };
    }

    // Nếu đơn hàng đã PAID thì không xử lý lại (Idempotent)
    if (order.status === order_status.PAID || order.status === order_status.COMPLETED) {
      return { success: true, message: 'Order already paid' };
    }

    const amount = Number(verifiedData.amount || order.total);
    const idempotencyKey = `PAYOS-${orderCode}-${verifiedData.reference || Date.now()}`;

    // Cập nhật trạng thái đơn hàng sang PAID trong transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          orderId: BigInt(orderCode) as any,
          amount,
          method: payment_method.WALLET,
          idempotencyKey,
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: BigInt(orderCode) as any },
        data: { status: order_status.PAID },
      });

      return { payment, order: updatedOrder };
    });

    // Cộng điểm thưởng
    const pointsEarned = Math.floor(amount / 10000);
    if (pointsEarned > 0) {
      try {
        await this.usersService.addLoyaltyPoints(Number(order.userId), pointsEarned);
      } catch (err) {
        console.error('[PayOS Webhook] Lỗi cộng điểm tích lũy:', err);
      }
    }

    console.log(`[PayOS Webhook] Đơn hàng #${orderCode} đã thanh toán thành công qua VietQR!`);

    return {
      success: true,
      message: 'Payment confirmed successfully',
      data: result,
    };
  }
}
