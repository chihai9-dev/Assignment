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
import * as crypto from 'crypto';

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
  async createPayOSLink(
    orderId: number,
    options?: { returnUrl?: string; cancelUrl?: string },
  ) {
    if (!this.payOS) {
      throw new BadRequestException('PayOS chưa được khởi tạo, vui lòng kiểm tra cấu hình .env');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(orderId) as any },
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

    const orderCode = Number(order.id);
    const amount = Math.round(Number(order.total));
    const description = `BrewLite #${orderId}`.slice(0, 25);
    const cancelUrl =
      options?.cancelUrl ||
      `http://localhost:3000/cart?status=cancelled&reason=payos_timeout&orderId=${orderId}`;
    const returnUrl =
      options?.returnUrl || `http://localhost:3000/orders/${orderId}?status=PAID`;

    try {
      const paymentLinkRes = await this.payOS.paymentRequests.create({
        orderCode,
        amount,
        description,
        cancelUrl,
        // CHECKOUT_DURATION: Thời gian giữ đơn hàng (giây). Đồng bộ frontend
        expiredAt: Math.floor(Date.now() / 1000) + 5 * 60,
        returnUrl,
      });

      return {
        success: true,
        orderId,
        orderCode,
        amount: paymentLinkRes.amount,
        accountName: paymentLinkRes.accountName,
        accountNumber: paymentLinkRes.accountNumber,
        bin: paymentLinkRes.bin,
        description: paymentLinkRes.description,
        checkoutUrl: paymentLinkRes.checkoutUrl,
        qrCode: paymentLinkRes.qrCode,
        paymentLinkId: paymentLinkRes.paymentLinkId,
        status: paymentLinkRes.status,
      };
    } catch (err: any) {
      if (err?.message?.includes('đã tồn tại') || err?.code === '231') {
        try {
          const existingLink = await this.payOS.paymentRequests.get(orderCode);
          return {
            success: true,
            orderId,
            orderCode,
            amount: existingLink.amount,
            accountName: (existingLink as any).accountName,
            accountNumber: (existingLink as any).accountNumber,
            bin: (existingLink as any).bin,
            description: (existingLink as any).description,
            checkoutUrl: (existingLink as any).checkoutUrl || (existingLink.id ? `https://pay.payos.vn/web/${existingLink.id}` : undefined),
            qrCode: (existingLink as any).qrCode,
            paymentLinkId: existingLink.id,
            status: existingLink.status,
          };
        } catch (getErr) {
          console.error('[PayOS] Lỗi lấy thông tin link thanh toán đã tồn tại:', getErr);
        }
      }
      console.error('[PayOS] Lỗi tạo payment link:', err?.message || err);
      throw new BadRequestException(err?.message || 'Không thể tạo mã thanh toán VietQR');
    }
  }

  /**
   * Alias tương thích ngược cho createPayOSLink
   */
  async createPayOSPaymentLink(
    orderId: number,
    options?: { returnUrl?: string; cancelUrl?: string },
  ) {
    return this.createPayOSLink(orderId, options);
  }

  /**
   * Đăng ký tự động Webhook URL với PayOS API
   */
  async confirmPayOSWebhookUrl(webhookUrl: string) {
    if (!this.payOS) {
      throw new BadRequestException('PayOS chưa được cấu hình Client ID / API Key trong file .env');
    }
    try {
      const res = await this.payOS.webhooks.confirm(webhookUrl);
      return { success: true, data: res };
    } catch (err: any) {
      console.error('[PayOS] Lỗi confirm webhook URL:', err?.message || err);
      throw new BadRequestException(
        err?.message || 'Không thể xác thực Webhook URL với PayOS',
      );
    }
  }

  /**
   * Lấy trạng thái thanh toán hiện tại của đơn hàng
   */
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
      isPaid:
        order.status === order_status.PAID ||
        order.status === order_status.COMPLETED,
      total: Number(order.total),
      payment: order.Payment,
    };
  }

  /**
   * Xử lý webhook từ PayOS khi khách chuyển khoản VietQR thành công
   */
  async handlePayOSWebhook(webhookBody: any) {
    console.log('[PayOS Webhook] Received webhook payload:', JSON.stringify(webhookBody));

    if (!webhookBody) {
      return { success: false, message: 'No data' };
    }

    if (webhookBody?.webhookUrl) {
      return { success: true, message: 'Webhook URL verified successfully' };
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

    const rawOrderCode = Number(verifiedData.orderCode);
    if (!rawOrderCode) {
      return { success: true, message: 'No valid orderCode found' };
    }

    let order = await this.prisma.order.findUnique({
      where: { id: BigInt(rawOrderCode) as any },
    });
    let orderId = rawOrderCode;

    if (!order && rawOrderCode > 100000) {
      orderId = Math.floor(rawOrderCode / 100000);
      order = await this.prisma.order.findUnique({
        where: { id: BigInt(orderId) as any },
      });
    }

    if (!order) {
      console.warn(`[PayOS Webhook] Order #${orderId} not found in database`);
      return { success: true, message: 'Order not found, acknowledged' };
    }

    // Nếu đơn hàng đã PAID thì không xử lý lại (Idempotent)
    if (order.status === order_status.PAID || order.status === order_status.COMPLETED) {
      return { success: true, message: 'Order already paid' };
    }

    const amount = Number(verifiedData.amount || order.total);
    const idempotencyKey = `PAYOS-${orderId}-${verifiedData.reference || Date.now()}`;

    // Cập nhật trạng thái đơn hàng sang PAID trong transaction
    const result = await this.prisma.$transaction(async (tx) => {
      const payment = await tx.payment.create({
        data: {
          orderId: BigInt(orderId) as any,
          amount,
          method: payment_method.WALLET,
          idempotencyKey,
        },
      });

      const updatedOrder = await tx.order.update({
        where: { id: BigInt(orderId) as any },
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

    console.log(`[PayOS Webhook] Đơn hàng #${orderId} đã thanh toán thành công qua VietQR!`);

    return {
      success: true,
      message: 'Payment confirmed successfully',
      data: result,
    };
  }

  // Hàm logic tạo hóa đơn momo
  async createMomoPayment(orderId: number) {
    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(orderId) as any },
    });
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${orderId}`);
    }
    const partnerCode = process.env.MOMO_PARTNER_CODE || 'MOMO';
    const accessKey = process.env.MOMO_ACCESS_KEY || 'F8BBA842ECF85';
    const secretKey = process.env.MOMO_SECRET_KEY || 'K951B6PE1waDMi640xX08PD3vg6EkVlz';
    const momoApiUrl = process.env.MOMO_API_URL || 'https://test-payment.momo.vn/v2/gateway/api/create';
    const amount = Math.round(Number(order.total));
    const orderInfo = `Thanh toan don hang #${orderId} tai BrewLite`;
    const requestId = `${partnerCode}-${orderId}-${Date.now()}`;
    const momoOrderId = `BL_${orderId}_${Date.now()}`;

    // URL nhận kết quả
    const redirectUrl = `http://localhost:3000/orders/${orderId}`;
    // Link Webhook nhận thông báo tự động duyệt đơn (qua ngrok)
    const ipnUrl = `https://cusp-pager-velvet.ngrok-free.dev/api/payments/momo-ipn`;
    const requestType = 'captureWallet';
    const extraData = ''; // có thể để trống
    // Tạo chữ ký HMAC SHA256 chuẩn MoMo
    const rawSignature = `accessKey=${accessKey}&amount=${amount}&extraData=${extraData}&ipnUrl=${ipnUrl}&orderId=${momoOrderId}&orderInfo=${orderInfo}&partnerCode=${partnerCode}&redirectUrl=${redirectUrl}&requestId=${requestId}&requestType=${requestType}`;

    const signature = crypto
      .createHmac('sha256', secretKey)
      .update(rawSignature)
      .digest('hex');
    const requestBody = {
      partnerCode,
      partnerName: 'BrewLite Coffee',
      storeId: 'BrewLiteStore',
      requestId,
      amount,
      orderId: momoOrderId,
      orderInfo,
      redirectUrl,
      ipnUrl,
      lang: 'vi',
      requestType,
      autoCapture: true,
      extraData,
      signature,
    };
    // Gửi request sang MoMo Sandbox
    const response = await fetch(momoApiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody),
    });
    const result = await response.json();
    if (result.resultCode !== 0) {
      throw new BadRequestException(result.message || 'Lỗi kết nối tới cổng thanh toán MoMo');
    }
    return {
      orderId,
      payUrl: result.payUrl, // Link mở cổng thanh toán MoMo
      qrCodeUrl: result.qrCodeUrl, // Link ảnh QR MoMo
      deeplink: result.deeplink, // Mở trực tiếp app MoMo trên điện thoại
    };
  }

  // Xử lý IPN (Webhook) từ MoMo
  async handleMomoIPN(body: any) {
    console.log('[MoMo IPN] Received notification:', JSON.stringify(body));
    const { resultCode, orderId: momoOrderId, amount, transId } = body;
    // resultCode === 0 là thanh toán thành công
    if (resultCode === 0) {
      // Tách lấy id đơn hàng thực tế từ chuỗi BL_{orderId}_{timestamp}
      const match = momoOrderId?.match(/BL_(\d+)_/);
      const orderId = match ? Number(match[1]) : null;
      if (!orderId) {
        return { message: 'Invalid orderId format' };
      }
      const order = await this.prisma.order.findUnique({
        where: { id: BigInt(orderId) as any },
      });
      if (!order || order.status === order_status.PAID || order.status === order_status.COMPLETED) {
        return { message: 'Order processed or not found' };
      }
      const idempotencyKey = `MOMO-${orderId}-${transId || Date.now()}`;
      // Cập nhật trạng thái đơn sang PAID
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.create({
          data: {
            orderId: BigInt(orderId) as any,
            amount: Number(amount),
            method: payment_method.WALLET,
            idempotencyKey,
          },
        });
        await tx.order.update({
          where: { id: BigInt(orderId) as any },
          data: { status: order_status.PAID },
        });
      });
      // Cộng điểm tích lũy
      const pointsEarned = Math.floor(Number(amount) / 10000);
      if (pointsEarned > 0) {
        try {
          await this.usersService.addLoyaltyPoints(Number(order.userId), pointsEarned);
        } catch (err) {
          console.error('Lỗi cộng điểm tích lũy:', err);
        }
      }
      console.log(`[MoMo IPN] Đơn hàng #${orderId} đã duyệt thanh toán MoMo thành công!`);
    }
    // MoMo yêu cầu server trả về HTTP 204 No Content hoặc 200
    return { message: 'Received' };
  }
}

