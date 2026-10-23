import {
  BadRequestException,
  ConflictException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { order_status } from '@prisma/client';
import { PayOS } from '@payos/node';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from '../users/users.service';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private payos: PayOS | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {
    const clientId = process.env.PAYOS_CLIENT_ID;
    const apiKey = process.env.PAYOS_API_KEY;
    const checksumKey = process.env.PAYOS_CHECKSUM_KEY;

    if (clientId && apiKey && checksumKey) {
      try {
        this.payos = new PayOS({
          clientId,
          apiKey,
          checksumKey,
        });
        this.logger.log('Đã kết nối thành công cổng thanh toán PayOS VietQR Pro');
      } catch (err) {
        this.logger.error('Lỗi khởi tạo PayOS:', err);
      }
    } else {
      this.logger.warn('Chưa có đủ biến môi trường PAYOS trong file .env');
    }
  }

  // 1. Tạo liên kết thanh toán PayOS (Sinh mã VietQR quét được bằng MoMo và mọi App Ngân hàng)
  async createPayOSLink(
    orderId: number,
    options?: { returnUrl?: string; cancelUrl?: string },
  ) {
    if (!this.payos) {
      throw new BadRequestException(
        'Cổng thanh toán PayOS chưa được cấu hình Client ID / API Key trong backend/.env',
      );
    }

    const order = await this.prisma.order.findUnique({
      where: {
        id: BigInt(orderId) as any,
      },
      include: {
        OrderItem: {
          include: {
            Product: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${orderId}`);
    }

    if (order.status === order_status.PAID || order.status === order_status.COMPLETED) {
      throw new BadRequestException('Đơn hàng này đã được thanh toán hoàn tất');
    }

    if (order.status === order_status.CANCELLED) {
      throw new BadRequestException('Đơn hàng này đã bị hủy, không thể thanh toán');
    }

    const amount = Number(order.total);
    if (amount <= 0) {
      throw new BadRequestException('Số tiền thanh toán phải lớn hơn 0đ');
    }

    // PayOS yêu cầu orderCode duy nhất (số nguyên dương <= 9007199254740991)
    // Mã hóa: orderId * 100000 + số ngẫu nhiên 5 chữ số
    // Khi giải mã webhook: Math.floor(orderCode / 100000) = orderId
    const orderCode = Number(orderId) * 100000 + Math.floor(10000 + Math.random() * 90000);

    // Mô tả hiển thị tối đa 25 ký tự, không dấu và không ký tự đặc biệt
    const description = `BrewLite ${orderId}`.slice(0, 25);

    const clientOrigin = 'http://localhost:3000';
    const returnUrl = options?.returnUrl || `${clientOrigin}/orders/${orderId}?status=PAID`;
    const cancelUrl = options?.cancelUrl || `${clientOrigin}/orders/${orderId}?status=CANCELLED`;

    const items = order.OrderItem.map((item) => ({
      name: item.Product?.name || `Món #${item.productId}`,
      quantity: item.qty,
      price: Math.round(Number(item.lineTotal) / item.qty),
    }));

    const itemsSum = items.reduce((sum, it) => sum + it.price * it.quantity, 0);
    const paymentPayload: any = {
      orderCode,
      amount,
      description,
      cancelUrl,
      returnUrl,
    };
    if (itemsSum === amount) {
      paymentPayload.items = items;
    }

    try {
      const paymentLink = await this.payos.paymentRequests.create(paymentPayload);

      return {
        success: true,
        orderId,
        orderCode,
        amount,
        accountName: paymentLink.accountName,
        accountNumber: paymentLink.accountNumber,
        bin: paymentLink.bin,
        description: paymentLink.description,
        checkoutUrl: paymentLink.checkoutUrl,
        qrCode: paymentLink.qrCode,
        paymentLinkId: paymentLink.paymentLinkId,
        status: paymentLink.status,
      };
    } catch (err: any) {
      this.logger.error(`Lỗi tạo mã QR PayOS cho đơn #${orderId}:`, err);
      throw new BadRequestException(
        err.message || 'Không thể tạo link thanh toán PayOS',
      );
    }
  }

  // 2. Xử lý Webhook từ PayOS khi khách hàng quét QR và chuyển tiền thành công
  async handlePayOSWebhook(body: any) {
    this.logger.log('Nhận tín hiệu webhook từ PayOS: ' + JSON.stringify(body));

    // PayOS gửi ping xác thực khi admin cấu hình Webhook URL
    if (body?.webhookUrl) {
      return { success: true, message: 'Webhook URL verified successfully' };
    }

    if (!this.payos) {
      return { success: false, message: 'PayOS chưa cấu hình trong .env' };
    }

    let webhookData: any;
    try {
      webhookData = await this.payos.webhooks.verify(body);
    } catch (err: any) {
      this.logger.warn(`Lỗi xác thực webhook signature: ${err.message}`);
      // Nếu là test payload từ PayOS Dashboard
      if (body?.desc === 'success' || body?.data?.orderCode === 123) {
        return { success: true, message: 'Handled PayOS test webhook' };
      }
      return { success: false, message: 'Invalid webhook signature' };
    }

    if (!webhookData || !webhookData.orderCode) {
      return { success: true, message: 'No orderCode in webhook' };
    }

    // Giải mã orderId từ orderCode
    const rawOrderCode = Number(webhookData.orderCode);
    let orderId = Math.floor(rawOrderCode / 100000);
    let order = await this.prisma.order.findUnique({
      where: { id: BigInt(orderId) as any },
    });

    if (!order) {
      order = await this.prisma.order.findUnique({
        where: { id: BigInt(rawOrderCode) as any },
      });
      if (order) {
        orderId = rawOrderCode;
      }
    }

    if (!order) {
      this.logger.warn(
        `Webhook PayOS: Không tìm thấy đơn hàng với orderCode ${rawOrderCode}`,
      );
      return {
        success: true,
        message: `Order #${orderId} not found (might be test)`,
      };
    }

    if (order.status === order_status.PAID || order.status === order_status.COMPLETED) {
      this.logger.log(`Đơn hàng #${orderId} đã được thanh toán từ trước`);
      return { success: true, message: 'Order already paid' };
    }

    // Cập nhật trạng thái đơn sang PAID và tạo Payment record
    const idempotencyKey = `payos-${webhookData.paymentLinkId || webhookData.reference || rawOrderCode}`;

    await this.prisma.$transaction(async (tx) => {
      const existingPayment = await tx.payment.findUnique({
        where: { idempotencyKey },
      });

      if (!existingPayment) {
        await tx.payment.create({
          data: {
            orderId: BigInt(orderId) as any,
            amount: webhookData.amount,
            method: 'WALLET',
            idempotencyKey,
          },
        });
      }

      await tx.order.update({
        where: { id: BigInt(orderId) as any },
        data: { status: order_status.PAID },
      });
    });

    // Cộng điểm thưởng tích lũy (1 điểm / 10.000đ)
    const pointsEarned = Math.floor(Number(webhookData.amount) / 10000);
    if (pointsEarned > 0) {
      try {
        await this.usersService.addLoyaltyPoints(
          Number(order.userId),
          pointsEarned,
        );
      } catch (err) {
        this.logger.error('Lỗi cộng điểm tích lũy PayOS:', err);
      }
    }

    this.logger.log(
      `Đã xác nhận thanh toán PayOS thành công cho đơn #${orderId} (+${pointsEarned} điểm thưởng)`,
    );

    return {
      success: true,
      orderId,
      status: 'PAID',
      message: 'Xác nhận thanh toán PayOS thành công',
    };
  }

  // 3. Đăng ký tự động Webhook URL với PayOS API
  async confirmPayOSWebhookUrl(webhookUrl: string) {
    if (!this.payos) {
      throw new BadRequestException('PayOS chưa được cấu hình');
    }
    try {
      const res = await this.payos.webhooks.confirm(webhookUrl);
      return { success: true, data: res };
    } catch (err: any) {
      this.logger.error('Lỗi confirm webhook URL:', err);
      throw new BadRequestException(
        err.message || 'Không thể xác thực Webhook URL với PayOS',
      );
    }
  }

  // 4. Kiểm tra trạng thái thanh toán của đơn hàng
  async getPaymentStatus(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(orderId) as any },
      include: { Payment: true },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${orderId}`);
    }

    return {
      orderId,
      status: order.status,
      isPaid: order.status === order_status.PAID || order.status === order_status.COMPLETED,
      total: Number(order.total),
      payment: order.Payment,
    };
  }

  // 5. Thanh toán trực tiếp / Mock Idempotent (Bảo lưu nghiệp vụ cũ)
  async create(createPaymentDto: CreatePaymentDto) {
    const { orderId, amount, method, idempotencyKey } = createPaymentDto;

    // 1. Kiểm tra Idempotency
    const existingPayment = await this.prisma.payment.findUnique({
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
      throw new NotFoundException(`Không tìm thấy đơn hàng #${orderId}`);
    }

    if (order.status === order_status.CANCELLED) {
      throw new BadRequestException('Không thể thanh toán đơn hàng đã hủy');
    }
    if (order.status === order_status.COMPLETED) {
      throw new BadRequestException('Đơn hàng này đã hoàn thành');
    }
    if (order.status === order_status.PAID) {
      throw new BadRequestException('Đơn hàng này đã được thanh toán');
    }

    if (Number(order.total) !== amount) {
      throw new BadRequestException(
        `Số tiền thanh toán (${amount}đ) không khớp với tổng tiền đơn hàng (${Number(order.total)}đ)`,
      );
    }

    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          orderId: BigInt(orderId) as any,
          amount,
          method,
          idempotencyKey,
        },
      });

      const updatedOrder = await tx.order.update({
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
    });

    const pointsEarned = Math.floor(amount / 10000);
    if (pointsEarned > 0) {
      try {
        await this.usersService.addLoyaltyPoints(
          Number(order.userId),
          pointsEarned,
        );
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
      throw new NotFoundException(`Không tìm thấy đơn hàng ${orderId}`);
    }

    return this.prisma.payment.findMany({
      where: {
        orderId: Number(orderId),
      },
    });
  }
}
