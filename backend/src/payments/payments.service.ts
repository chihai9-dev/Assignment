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
import { VerifyPayOSDto } from './dto/verify-payos.dto';
import * as crypto from 'crypto';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { PayOS } = require('@payos/node');

@Injectable()
export class PaymentsService implements OnModuleInit {
  private payOS: any = null;
  // Lưu map tạm thời giữa orderId (DB) và orderCode sinh ra cho PayOS
  private latestOrderCodes = new Map<number, number>();

  constructor(
    private readonly prisma: PrismaService,
    private readonly usersService: UsersService,
  ) {}

  public initPayOS() {
    if (this.payOS) return;
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

  onModuleInit() {
    this.initPayOS();
  }

  // Danh dau don hang la da thanh toan thanh cong (PAID), tao Payment va cong diem thuong
  async markOrderAsPaid(
    orderId: number,
    amount?: number,
    reference?: string,
    method: payment_method = payment_method.WALLET,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(orderId) as any },
      include: {
        OrderItem: {
          include: {
            Product: true,
            OrderItemTopping: {
              include: {
                Topping: true,
              },
            },
          },
        },
        Payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${orderId}`);
    }

    if (order.status === order_status.PAID || order.status === order_status.COMPLETED) {
      return {
        alreadyPaid: true,
        order,
      };
    }

    const payAmount = Number(amount || order.total);
    const idempotencyKey = `PAYOS-${orderId}-${reference || Date.now()}`;

    const result = await this.prisma.$transaction(async (tx) => {
      // Kiểm tra xem đã có bản ghi payment nào cho đơn này chưa
      const existingPayment = await tx.payment.findFirst({
        where: { orderId: BigInt(orderId) as any },
      });

      let payment = existingPayment;
      if (!existingPayment) {
        payment = await tx.payment.create({
          data: {
            orderId: BigInt(orderId) as any,
            amount: payAmount,
            method,
            idempotencyKey,
          },
        });
      }

      const updatedOrder = await tx.order.update({
        where: { id: BigInt(orderId) as any },
        data: { status: order_status.PAID },
        include: {
          OrderItem: {
            include: {
              Product: true,
              OrderItemTopping: {
                include: {
                  Topping: true,
                },
              },
            },
          },
          Payment: true,
        },
      });

      return { payment, order: updatedOrder };
    });

    // Cộng điểm thưởng tích lũy (Loyalty Points) sau khi thanh toán thành công (1 điểm / 10.000đ)
    const pointsEarned = Math.floor(payAmount / 10000);
    if (pointsEarned > 0) {
      try {
        await this.usersService.addLoyaltyPoints(Number(order.userId), pointsEarned);
      } catch (err) {
        console.error('[PayOS] Lỗi cộng điểm thưởng:', err);
      }
    }

    console.log(`[PayOS] Đơn hàng #${orderId} đã chuyển trạng thái thành công sang PAID!`);

    return {
      alreadyPaid: false,
      ...result,
      pointsEarned,
    };
  }

  async create(createPaymentDto: CreatePaymentDto): Promise<any> {
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
        pointsEarned: 0,
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

    // 5. Cập nhật Order sang PAID
    return this.markOrderAsPaid(orderId, amount, idempotencyKey, method);
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
      this.initPayOS();
    }
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

    const timestampSuffix = Date.now().toString().slice(-6);
    const orderCode = Number(`${order.id}${timestampSuffix}`);
    this.latestOrderCodes.set(Number(order.id), orderCode);

    const amount = Math.round(Number(order.total));
    const formattedOrderId = String(orderId).padStart(8, '0');
    const description = `BL${formattedOrderId}`;
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
   * Xác thực và đồng bộ tự động trạng thái thanh toán từ PayOS
   * Giải quyết triệt để trường hợp PayOS đã hoàn tất nhưng Webhook chưa kịp/không gửi về được localhost
   */
  async verifyPayOSPayment(body: VerifyPayOSDto) {
    const orderId = Number(body.orderId);
    if (!orderId) {
      throw new BadRequestException('Mã đơn hàng không hợp lệ');
    }

    const order = await this.prisma.order.findUnique({
      where: { id: BigInt(orderId) as any },
      include: {
        OrderItem: {
          include: {
            Product: true,
            OrderItemTopping: {
              include: {
                Topping: true,
              },
            },
          },
        },
        Payment: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${orderId}`);
    }

    // 1. Nếu đơn hàng đã PAID hoặc COMPLETED -> trả về kết quả thành công ngay
    if (order.status === order_status.PAID || order.status === order_status.COMPLETED) {
      return {
        success: true,
        isPaid: true,
        message: 'Đơn hàng đã được thanh toán hoàn tất',
        order,
      };
    }

    if (order.status === order_status.CANCELLED) {
      throw new BadRequestException('Đơn hàng này đã bị hủy');
    }

    // Xác định orderCode tương ứng
    let parsedOrderCode: number | null = null;
    if (body.orderCode) {
      parsedOrderCode = Number(body.orderCode);
    } else if (this.latestOrderCodes.has(orderId)) {
      parsedOrderCode = this.latestOrderCodes.get(orderId)!;
    }

    // 2. Tra cứu trực tiếp với PayOS API nếu có SDK
    if (this.payOS && parsedOrderCode) {
      try {
        const payosInfo = await this.payOS.paymentRequests.get(parsedOrderCode);
        console.log(`[PayOS Verify] PayOS API check orderCode=${parsedOrderCode} result status:`, payosInfo?.status);
        if (payosInfo && (payosInfo.status === 'PAID' || payosInfo.amountRemaining === 0)) {
          const res = await this.markOrderAsPaid(
            orderId,
            payosInfo.amountPaid || Number(order.total),
            payosInfo.transactions?.[0]?.reference || `PAYOS-${parsedOrderCode}`,
            payment_method.WALLET,
          );
          return {
            success: true,
            isPaid: true,
            message: 'Thanh toán PayOS được xác thực thành công!',
            order: res.order,
          };
        }
      } catch (err: any) {
        console.warn(`[PayOS Verify] Lỗi kiểm tra PayOS API:`, err?.message || err);
      }
    }

    // 3. Nếu PayOS redirect về trình duyệt với tham số status=PAID và code=00
    if (body.status === 'PAID' && (body.code === '00' || !body.code)) {
      const res = await this.markOrderAsPaid(
        orderId,
        Number(order.total),
        `PAYOS-RETURN-${orderId}-${Date.now()}`,
        payment_method.WALLET,
      );
      return {
        success: true,
        isPaid: true,
        message: 'Thanh toán được xác nhận tự động từ thông tin trả về của PayOS!',
        order: res.order,
      };
    }

    return {
      success: false,
      isPaid: false,
      status: order.status,
      message: 'Đơn hàng chưa hoàn tất thanh toán trên PayOS',
      order,
    };
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
   * Tự động kiểm tra PayOS API nếu đơn hàng đang ở trạng thái PENDING
   */
  async getPaymentStatus(orderId: number) {
    const existingOrder = await this.prisma.order.findUnique({
      where: { id: BigInt(orderId) as any },
      include: {
        Payment: true,
        OrderItem: {
          include: {
            Product: true,
            OrderItemTopping: {
              include: {
                Topping: true,
              },
            },
          },
        },
      },
    });

    if (!existingOrder) {
      throw new NotFoundException(`Không tìm thấy đơn hàng #${orderId}`);
    }

    let currentOrder: any = existingOrder;

    // Nếu đơn hàng đang PENDING, chủ động kiểm tra với PayOS API
    if (existingOrder.status === order_status.PENDING && this.payOS) {
      const cachedCode = this.latestOrderCodes.get(orderId);
      if (cachedCode) {
        try {
          const payosInfo = await this.payOS.paymentRequests.get(cachedCode);
          if (payosInfo && (payosInfo.status === 'PAID' || payosInfo.amountRemaining === 0)) {
            const updated = await this.markOrderAsPaid(
              orderId,
              payosInfo.amountPaid || Number(existingOrder.total),
              payosInfo.transactions?.[0]?.reference || `PAYOS-${cachedCode}`,
              payment_method.WALLET,
            );
            if (updated.order) {
              currentOrder = updated.order;
            }
          }
        } catch (e: any) {
          // Bỏ qua lỗi kết nối trong polling ngầm
        }
      }
    }

    return {
      orderId,
      status: currentOrder.status,
      isPaid:
        currentOrder.status === order_status.PAID ||
        currentOrder.status === order_status.COMPLETED,
      total: Number(currentOrder.total),
      payment: currentOrder.Payment,
      order: currentOrder,
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

    if (!order && rawOrderCode > 1000000) {
      const strCode = rawOrderCode.toString();
      orderId = Number(strCode.slice(0, strCode.length - 6));
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
    const reference = verifiedData.reference || `${Date.now()}`;
    const result = await this.markOrderAsPaid(
      orderId,
      amount,
      reference,
      payment_method.WALLET,
    );

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
