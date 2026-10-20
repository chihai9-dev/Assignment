import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { order_status, payment_method } from '@prisma/client';
import { OrdersService } from './orders.service';
import { PaymentsService } from '../payments/payments.service';

describe('Task 10 - Backend Business Logic Tests', () => {
  let ordersService: OrdersService;
  let paymentsService: PaymentsService;
  let mockPrisma: any;
  let mockUsersService: any;

  beforeEach(() => {
    mockPrisma = {
      order: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
        update: jest.fn(),
      },
      product: {
        findUnique: jest.fn(),
        updateMany: jest.fn(),
        update: jest.fn(),
      },
      payment: {
        create: jest.fn(),
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
      $transaction: jest.fn(async (cb) => {
        if (typeof cb === 'function') {
          return cb(mockPrisma);
        }
        return Promise.all(cb);
      }),
    };

    mockUsersService = {
      findOne: jest.fn(),
      addLoyaltyPoints: jest.fn(),
    };

    ordersService = new OrdersService(mockPrisma, mockUsersService);
    paymentsService = new PaymentsService(mockPrisma, mockUsersService);
  });

  // =========================================================================
  // Tiêu chí (a): Order State Machine - Chặn chuyển trạng thái sai
  // =========================================================================
  describe('1. Order State Machine (assertTransition)', () => {
    it('cho phép các chuyển đổi trạng thái hợp lệ trong luồng thành công', () => {
      expect(() =>
        ordersService.assertTransition(order_status.PENDING, order_status.PAID),
      ).not.toThrow();

      expect(() =>
        ordersService.assertTransition(order_status.PAID, order_status.PREPARING),
      ).not.toThrow();

      expect(() =>
        ordersService.assertTransition(order_status.PREPARING, order_status.READY),
      ).not.toThrow();

      expect(() =>
        ordersService.assertTransition(order_status.READY, order_status.COMPLETED),
      ).not.toThrow();
    });

    it('cho phép các nhánh ngoại lệ: thanh toán lỗi và hủy đơn', () => {
      expect(() =>
        ordersService.assertTransition(order_status.PENDING, order_status.PAYMENT_FAILED),
      ).not.toThrow();

      // Thử lại thanh toán: PAYMENT_FAILED -> PENDING
      expect(() =>
        ordersService.assertTransition(order_status.PAYMENT_FAILED, order_status.PENDING),
      ).not.toThrow();

      // Hủy đơn từ PENDING, PAYMENT_FAILED hoặc PAID
      expect(() =>
        ordersService.assertTransition(order_status.PENDING, order_status.CANCELLED),
      ).not.toThrow();

      expect(() =>
        ordersService.assertTransition(order_status.PAYMENT_FAILED, order_status.CANCELLED),
      ).not.toThrow();

      expect(() =>
        ordersService.assertTransition(order_status.PAID, order_status.CANCELLED),
      ).not.toThrow();
    });

    it('CHẶN chuyển đổi sai: PENDING -> COMPLETED (nhảy cóc bước pha chế)', () => {
      expect(() =>
        ordersService.assertTransition(order_status.PENDING, order_status.COMPLETED),
      ).toThrow(BadRequestException);
    });

    it('CHẶN chuyển đổi sai: PENDING -> READY', () => {
      expect(() =>
        ordersService.assertTransition(order_status.PENDING, order_status.READY),
      ).toThrow(BadRequestException);
    });

    it('CHẶN chuyển đổi sai: COMPLETED -> PENDING (trạng thái kết thúc không thể quay lại)', () => {
      expect(() =>
        ordersService.assertTransition(order_status.COMPLETED, order_status.PENDING),
      ).toThrow(BadRequestException);
    });

    it('CHẶN chuyển đổi sai: CANCELLED -> PAID (đơn đã hủy không thể thanh toán)', () => {
      expect(() =>
        ordersService.assertTransition(order_status.CANCELLED, order_status.PAID),
      ).toThrow(BadRequestException);
    });
  });

  // =========================================================================
  // Tiêu chí (b): Thanh toán Idempotent - Gửi 2 lần cùng key chỉ tạo 1 giao dịch
  // =========================================================================
  describe('2. Thanh toán Idempotent (Idempotency-Key)', () => {
    it('gửi yêu cầu thanh toán lần đầu: tạo giao dịch mới và chuyển đơn sang PAID', async () => {
      const orderId = 101;
      const amount = 50000;
      const idempotencyKey = 'key-test-uuid-1';

      mockPrisma.payment.findUnique.mockResolvedValue(null); // Chưa tồn tại
      mockPrisma.order.findUnique.mockResolvedValue({
        id: BigInt(orderId),
        userId: BigInt(1),
        total: 50000,
        status: order_status.PENDING,
      });

      const mockPayment = {
        id: BigInt(1),
        orderId: BigInt(orderId),
        amount,
        method: payment_method.WALLET,
        idempotencyKey,
      };
      mockPrisma.payment.create.mockResolvedValue(mockPayment);
      mockPrisma.order.update.mockResolvedValue({
        id: BigInt(orderId),
        status: order_status.PAID,
      });

      const result = await paymentsService.create({
        orderId,
        amount,
        method: payment_method.WALLET,
        idempotencyKey,
      });

      expect(result.payment).toBeDefined();
      expect(result.order.status).toBe(order_status.PAID);
      expect(mockPrisma.payment.create).toHaveBeenCalledTimes(1);
    });

    it('gửi lần 2 với CÙNG Idempotency-Key: trả về giao dịch cũ, không tạo record mới, không trừ tiền 2 lần', async () => {
      const orderId = 101;
      const amount = 50000;
      const idempotencyKey = 'key-test-uuid-1';

      const existingPayment = {
        id: BigInt(1),
        orderId: BigInt(orderId),
        amount,
        method: payment_method.WALLET,
        idempotencyKey,
      };

      // Giả lập lần 2: DB đã có sẵn payment với key này
      mockPrisma.payment.findUnique.mockResolvedValue(existingPayment);
      mockPrisma.order.findUnique.mockResolvedValue({
        id: BigInt(orderId),
        userId: BigInt(1),
        total: 50000,
        status: order_status.PAID,
      });

      const result = await paymentsService.create({
        orderId,
        amount,
        method: payment_method.WALLET,
        idempotencyKey,
      });

      // Kết quả trả về giao dịch trước đó
      expect(result.idempotent).toBe(true);
      expect(result.payment).toEqual(existingPayment);
      // Đảm bảo không gọi prisma.payment.create thêm lần nào
      expect(mockPrisma.payment.create).not.toHaveBeenCalled();
    });
  });

  // =========================================================================
  // Tiêu chí (c): Kiểm soát tồn kho khi đặt đồng thời (Optimistic Locking)
  // =========================================================================
  describe('3. Kiểm soát tồn kho & Optimistic Locking', () => {
    it('đặt hàng khi còn đủ tồn kho: trừ tồn kho và tăng version thành công', async () => {
      const product = {
        id: BigInt(1),
        name: 'Cà phê sữa',
        price: 35000,
        stock: 10,
        version: 0,
        status: 'active',
      };

      mockPrisma.product.findUnique.mockResolvedValue(product);
      mockPrisma.product.updateMany.mockResolvedValue({ count: 1 }); // Thành công
      mockPrisma.order.create.mockResolvedValue({ id: BigInt(201), total: 70000 });

      const result = await ordersService.create(
        {
          items: [{ productId: 1, size: 'M', qty: 2, price: 35000 }],
        },
        1,
      );

      expect(result.orderId).toBeDefined();
      expect(mockPrisma.product.updateMany).toHaveBeenCalledWith({
        where: {
          id: product.id,
          version: product.version,
          stock: { gte: 2 },
        },
        data: {
          stock: { decrement: 2 },
          version: { increment: 1 },
        },
      });
    });

    it('từ chối đặt hàng khi số lượng yêu cầu vượt quá tồn kho còn lại', async () => {
      const product = {
        id: BigInt(1),
        name: 'Cà phê sữa',
        price: 35000,
        stock: 1, // Chỉ còn 1 ly
        version: 0,
        status: 'active',
      };

      mockPrisma.product.findUnique.mockResolvedValue(product);

      await expect(
        ordersService.create(
          {
            items: [{ productId: 1, size: 'M', qty: 2, price: 35000 }], // Đòi mua 2 ly
          },
          1,
        ),
      ).rejects.toThrow(BadRequestException);
    });

    it('mô phỏng 2 khách đặt đồng thời (race condition): khách thứ 2 bị chặn do version mismatch (Optimistic Lock)', async () => {
      const product = {
        id: BigInt(1),
        name: 'Cà phê sữa',
        price: 35000,
        stock: 1,
        version: 0,
        status: 'active',
      };

      mockPrisma.product.findUnique.mockResolvedValue(product);
      // Giả lập khách thứ 2 bị tranh chấp version -> updateMany trả về count: 0
      mockPrisma.product.updateMany.mockResolvedValue({ count: 0 });

      await expect(
        ordersService.create(
          {
            items: [{ productId: 1, size: 'M', qty: 1, price: 35000 }],
          },
          2,
        ),
      ).rejects.toThrow(ConflictException);
    });
  });

  // =========================================================================
  // Tiêu chí (d): Giảm giá theo điểm tích lũy (Loyalty Points) và Tích điểm
  // =========================================================================
  describe('4. Giảm giá theo loyaltyPoints của User & Tích điểm thưởng', () => {
    it('tự động giảm đúng 10% cho khách hàng hạng Vàng (tích lũy >= 50 loyaltyPoints)', async () => {
      mockUsersService.findOne.mockResolvedValue({ id: 1, email: 'gold@brewlite.com', loyaltyPoints: 50 });
      const product = {
        id: BigInt(1),
        name: 'Cà phê sữa',
        price: 50000,
        stock: 10,
        version: 0,
        status: 'active',
      };

      mockPrisma.product.findUnique.mockResolvedValue(product);
      mockPrisma.product.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.create.mockImplementation((args: any) => ({
        id: BigInt(301),
        total: args.data.total,
      }));

      const result = await ordersService.create(
        {
          items: [{ productId: 1, size: 'M', qty: 2, price: 50000 }], // 100.000đ
        },
        1,
      );

      expect(result.rawTotal).toBe(100000);
      expect(result.discount).toBe(10000); // 10% của 100.000đ
      expect(result.total).toBe(90000);
      expect(result.discountPercent).toBe(10);
      expect(result.membershipTier).toBe('Vàng');
    });

    it('không giảm giá (0%) cho khách hàng mới có dưới 20 loyaltyPoints (Hạng Đồng)', async () => {
      mockUsersService.findOne.mockResolvedValue({ id: 2, email: 'new@brewlite.com', loyaltyPoints: 10 });
      const product = {
        id: BigInt(1),
        name: 'Cà phê đen',
        price: 40000,
        stock: 10,
        version: 0,
        status: 'active',
      };
      mockPrisma.product.findUnique.mockResolvedValue(product);
      mockPrisma.product.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.create.mockImplementation((args: any) => ({
        id: BigInt(302),
        total: args.data.total,
      }));

      const result = await ordersService.create(
        {
          items: [{ productId: 1, size: 'M', qty: 1, price: 40000 }],
        },
        2,
      );

      expect(result.rawTotal).toBe(40000);
      expect(result.discount).toBe(0);
      expect(result.total).toBe(40000);
      expect(result.discountPercent).toBe(0);
      expect(result.membershipTier).toBe('Đồng');
    });

    it('tự động giảm 5% cho khách hàng hạng Bạc (20 - 49 điểm) và 15% cho hạng Kim Cương (>= 100 điểm)', async () => {
      mockUsersService.findOne.mockResolvedValue({ id: 3, email: 'silver@brewlite.com', loyaltyPoints: 30 });
      const product = {
        id: BigInt(1),
        name: 'Trà sen',
        price: 100000,
        stock: 10,
        version: 0,
        status: 'active',
      };
      mockPrisma.product.findUnique.mockResolvedValue(product);
      mockPrisma.product.updateMany.mockResolvedValue({ count: 1 });
      mockPrisma.order.create.mockImplementation((args: any) => ({
        id: BigInt(303),
        total: args.data.total,
      }));

      const silverResult = await ordersService.create(
        { items: [{ productId: 1, size: 'L', qty: 1, price: 100000 }] },
        3,
      );
      expect(silverResult.discount).toBe(5000); // 5%
      expect(silverResult.membershipTier).toBe('Bạc');

      mockUsersService.findOne.mockResolvedValue({ id: 4, email: 'diamond@brewlite.com', loyaltyPoints: 120 });
      const diamondResult = await ordersService.create(
        { items: [{ productId: 1, size: 'L', qty: 1, price: 100000 }] },
        4,
      );
      expect(diamondResult.discount).toBe(15000); // 15%
      expect(diamondResult.membershipTier).toBe('Kim Cương');
    });

    it('tích điểm thưởng tích lũy (Loyalty Points) cho khách khi đơn thanh toán thành công', async () => {
      const orderId = 105;
      const amount = 50000;
      const userId = 88;

      mockPrisma.payment.findUnique.mockResolvedValue(null);
      mockPrisma.order.findUnique.mockResolvedValue({
        id: BigInt(orderId),
        userId: BigInt(userId),
        total: 50000,
        status: order_status.PENDING,
      });

      mockPrisma.payment.create.mockResolvedValue({ id: BigInt(1), amount });
      mockPrisma.order.update.mockResolvedValue({ id: BigInt(orderId), status: order_status.PAID });

      const result = await paymentsService.create({
        orderId,
        amount,
        method: payment_method.WALLET,
        idempotencyKey: 'loyalty-test-key',
      });

      // 50.000đ -> tích 5 điểm thưởng (1 điểm / 10.000đ)
      expect(result.pointsEarned).toBe(5);
      expect(mockUsersService.addLoyaltyPoints).toHaveBeenCalledWith(userId, 5);
    });
  });
});
