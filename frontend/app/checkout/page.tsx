'use client';

import { useState,useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';

export default function CheckoutPage() {
  const router = useRouter();

  const cartItems = useCartStore((state) => state.items);
  const items = useCartStore((state) => state.items);
  console.log('CHECKOUT ITEMS:', cartItems);
  const token = useAuthStore((state) => state.token);
  const [isPaying, setIsPaying] = useState(false);
  const [hasHydrated, setHasHydrated] = useState(false);

  useEffect(() => {
    setHasHydrated(true);
  }, []);
  const [paymentMethod, setPaymentMethod] = useState<
  'MOMO' | 'VNPAY' | 'STRIPE'
>('MOMO');

  const totalAmount = items.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  );
  if (!hasHydrated) {
  return null;
}
  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-[#8d2727] p-8 text-white">
        <div className="max-w-3xl mx-auto text-center pt-20">
          <h1 className="text-3xl font-bold mb-4">
            Không có sản phẩm để thanh toán
          </h1>

          <button
            onClick={() => router.push('/')}
            className="bg-white text-[#8d2727] px-6 py-3 rounded-lg font-bold"
          >
            Quay lại Menu
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#8d2727] p-8 text-white">

      <div className="max-w-6xl mx-auto">

        {/* Tiêu đề */}
        <div className="mb-8">
          <button
            onClick={() => router.push('/cart')}
            className="text-white/80 hover:text-white mb-4"
          >
            ← Quay lại giỏ hàng
          </button>

          <h1 className="text-3xl font-bold">
            Thanh toán
          </h1>

          <p className="text-white/80 mt-2">
            Kiểm tra đơn hàng và chọn phương thức thanh toán
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* =========================
              DANH SÁCH ĐƠN HÀNG
          ========================= */}
          <div className="lg:col-span-2 bg-white text-black rounded-xl p-6 shadow-lg">

            <h2 className="text-2xl font-bold mb-6">
              Chi tiết đơn hàng
            </h2>

            <div className="space-y-5">

              {items.map((item) => (
                <div
                  key={item.cartItemId}
                  className="flex justify-between border-b pb-5"
                >

                  <div>
                    <h3 className="font-bold text-lg">
                      {item.name}
                    </h3>

                    <p className="text-sm text-gray-500 mt-1">
                      Size: {item.size}
                    </p>

                    {item.toppings.length > 0 && (
                      <p className="text-sm text-gray-500 mt-1">
                        Topping: {item.toppings.join(', ')}
                      </p>
                    )}

                    <p className="text-sm text-gray-500 mt-1">
                      Số lượng: {item.quantity}
                    </p>
                  </div>

                  <div className="font-bold text-blue-600">
                    {(
                      Number(item.price) *
                      Number(item.quantity)
                    ).toLocaleString('vi-VN')}
                    đ
                  </div>

                </div>
              ))}

            </div>

            {/* Tổng tiền */}
            <div className="flex justify-between border-t-2 mt-6 pt-5 text-xl font-bold">

              <span>
                Tổng cộng
              </span>

              <span className="text-blue-600">
                {totalAmount.toLocaleString('vi-VN')}đ
              </span>

            </div>

          </div>

          {/* =========================
              THANH TOÁN
          ========================= */}
          <div className="bg-white text-black rounded-xl p-6 shadow-lg h-fit">

            <h2 className="text-2xl font-bold mb-6">
              Phương thức thanh toán
            </h2>

            
            {/* MOMO */}
            <button
            type="button"
            onClick={() => setPaymentMethod('MOMO')}
            className={`w-full text-left border rounded-xl p-4 mb-4 ${
                paymentMethod === 'MOMO'
                ? 'border-pink-500 bg-pink-50'
                : 'border-gray-300'
            }`}
            >
            <div className="flex items-center gap-3">
                <input
                type="radio"
                checked={paymentMethod === 'MOMO'}
                onChange={() => setPaymentMethod('MOMO')}
                />

                <div>
                <p className="font-bold">
                    MoMo
                </p>

                <p className="text-sm text-gray-500">
                    Thanh toán MoMo (Mock)
                </p>
                </div>
            </div>
            </button>

            {/* VNPAY */}
            <button
            type="button"
            onClick={() => setPaymentMethod('VNPAY')}
            className={`w-full text-left border rounded-xl p-4 mb-4 ${
                paymentMethod === 'VNPAY'
                ? 'border-blue-600 bg-blue-50'
                : 'border-gray-300'
            }`}
            >
            <div className="flex items-center gap-3">
                <input
                type="radio"
                checked={paymentMethod === 'VNPAY'}
                onChange={() => setPaymentMethod('VNPAY')}
                />

                <div>
                <p className="font-bold">
                    VNPay
                </p>

                <p className="text-sm text-gray-500">
                    Thanh toán VNPay (Mock)
                </p>
                </div>
            </div>
            </button>

            {/* STRIPE */}
            <button
            type="button"
            onClick={() => setPaymentMethod('STRIPE')}
            className={`w-full text-left border rounded-xl p-4 mb-6 ${
                paymentMethod === 'STRIPE'
                ? 'border-purple-600 bg-purple-50'
                : 'border-gray-300'
            }`}
            >
            <div className="flex items-center gap-3">
                <input
                type="radio"
                checked={paymentMethod === 'STRIPE'}
                onChange={() => setPaymentMethod('STRIPE')}
                />

                <div>
                <p className="font-bold">
                    Stripe
                </p>

                <p className="text-sm text-gray-500">
                    Thanh toán Stripe (Mock)
                </p>
                </div>
            </div>
            </button>

            {/* Tổng thanh toán */}
            <div className="bg-gray-100 rounded-xl p-4 mb-5">

              <div className="flex justify-between">

                <span>
                  Tổng thanh toán
                </span>

                <span className="font-bold text-blue-600">
                  {totalAmount.toLocaleString('vi-VN')}đ
                </span>

              </div>

            </div>

            {/* Nút thanh toán */}
            <button
             disabled={isPaying}
                onClick={async () => {
                    if (!token) {
                    alert('Vui lòng đăng nhập để thanh toán!');
                    router.push('/login?redirect=/checkout');
                    return;
                    }

                    try {
                    setIsPaying(true);

                    // BƯỚC 1: Tạo Order
                    const orderResponse = await fetch(
                        'http://localhost:3001/api/orders',
                        {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            items: items.map((item) => ({
                            productId: item.productId,
                            size: item.size,
                            qty: Number(item.quantity),
                            price: Number(item.price),
                            })),
                        }),
                        }
                    );

                    const orderData = await orderResponse.json();

                    if (!orderResponse.ok) {
                        throw new Error(
                        Array.isArray(orderData.message)
                            ? orderData.message.join(', ')
                            : orderData.message || 'Không thể tạo đơn hàng'
                        );
                    }

                    // Lấy ID đơn hàng
                    const orderId = Number(orderData.orderId);

                    // BƯỚC 2: Chuyển phương thức Mock
                    // MoMo + VNPay -> WALLET
                    // Stripe -> CARD
                    const backendMethod =
                        paymentMethod === 'STRIPE'
                        ? 'CARD'
                        : 'WALLET';

                    // BƯỚC 3: Tạo Payment
                    const paymentResponse = await fetch(
                        'http://localhost:3001/api/payments',
                        {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                        },
                        body: JSON.stringify({
                            orderId,
                            amount: totalAmount,
                            method: backendMethod,
                            idempotencyKey: `payment-${orderId}-${Date.now()}`,
                        }),
                        }
                    );

                    const paymentData = await paymentResponse.json();

                    if (!paymentResponse.ok) {
                        throw new Error(
                        Array.isArray(paymentData.message)
                            ? paymentData.message.join(', ')
                            : paymentData.message || 'Thanh toán thất bại'
                        );
                    }

                    // Thanh toán thành công
                    alert(
                        `Thanh toán ${paymentMethod} thành công!\nMã đơn hàng: #${orderId}`
                    );

                    router.push('/');
                    } catch (error) {
                    console.error('Lỗi thanh toán:', error);

                    alert(
                        error instanceof Error
                        ? error.message
                        : 'Có lỗi xảy ra trong quá trình thanh toán'
                    );
                    } finally {
                    setIsPaying(false);
                    }
                }}
                className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition disabled:opacity-50"
                >
                {isPaying ? 'Đang xử lý thanh toán...' : 'Thanh toán'}
            </button>

          </div>

        </div>

      </div>

    </main>
  );
}