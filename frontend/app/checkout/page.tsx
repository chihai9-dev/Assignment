'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { generateUUIDv4 } from '@/lib/uuid';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';
import {
  ArrowLeftIcon,
  BankIcon,
  BagIcon,
  TrashIcon,
  PlusIcon,
  MinusIcon,
  InfoIcon,
} from '../components/Icons';

interface PayOSPaymentData {
  orderId: number;
  orderCode: number;
  amount: number;
  accountName: string;
  accountNumber: string;
  bin: string;
  description: string;
  checkoutUrl: string;
  qrCode: string;
  paymentLinkId?: string;
  status?: string;
}

export default function CheckoutPage() {
  const router = useRouter();

  const { items, removeFromCart, updateQuantity, clearActiveCart } = useCartStore();
  const { token, user, logout } = useAuthStore();

  const [hasHydrated, setHasHydrated] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  // Phương thức thanh toán (2 tùy chọn: VietQR Pro, Ví MoMo)
  type PaymentMethodType = 'VIETQR' | 'MOMO';
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('VIETQR');

  // Trạng thái hiển thị Modal thanh toán QR PayOS
  const [payOSData, setPayOSData] = useState<PayOSPaymentData | null>(null);
  const [paymentStatus, setPaymentStatus] = useState<'PENDING' | 'PAID' | 'FAILED'>('PENDING');
  const [copySuccess, setCopySuccess] = useState<string | null>(null);

  // Lấy loyaltyPoints của user và tự động đồng bộ từ backend khi vào trang checkout
  useEffect(() => {
    setHasHydrated(true);
    if (token) {
      fetch('http://localhost:3001/api/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      })
        .then((res) => (res.ok ? res.json() : null))
        .then((freshUser) => {
          if (freshUser && typeof freshUser.loyaltyPoints === 'number') {
            useAuthStore.getState().setUser({
              ...freshUser,
              id: Number(freshUser.id),
            });
          }
        })
        .catch(() => {});
    }
  }, [token]);

  const loyaltyPoints = Number(user?.loyaltyPoints || 0);

  // Thông tin hạng thành viên và % giảm giá tự động theo loyaltyPoints
  const membership = useMemo(() => {
    if (loyaltyPoints >= 100) {
      return {
        tier: 'Kim Cương',
        badgeColor: 'bg-purple-100 text-purple-800 border-purple-200',
        icon: '💎',
        discountPercent: 15,
        nextTier: null,
        pointsNeeded: 0,
        description: 'Tự động giảm 15% cho mọi đơn hàng (Hạng cao nhất)',
      };
    }
    if (loyaltyPoints >= 50) {
      return {
        tier: 'Vàng',
        badgeColor: 'bg-amber-100 text-amber-800 border-amber-200',
        icon: '🏆',
        discountPercent: 10,
        nextTier: 'Kim Cương',
        pointsNeeded: 100 - loyaltyPoints,
        description: 'Tự động giảm 10% cho mọi đơn hàng',
      };
    }
    if (loyaltyPoints >= 20) {
      return {
        tier: 'Bạc',
        badgeColor: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: '🥈',
        discountPercent: 5,
        nextTier: 'Vàng',
        pointsNeeded: 50 - loyaltyPoints,
        description: 'Tự động giảm 5% cho mọi đơn hàng',
      };
    }
    return {
      tier: 'Đồng',
      badgeColor: 'bg-[#F5F0E6] text-[#8D6E63] border-[#E8DFD8]',
      icon: '🥉',
      discountPercent: 0,
      nextTier: 'Bạc',
      pointsNeeded: 20 - loyaltyPoints,
      description: 'Chưa có ưu đãi giảm giá',
    };
  }, [loyaltyPoints]);

  // Tính toán chi phí (Không có phí giao hàng vì nhận món trực tiếp tại quầy)
  const subtotal = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );
  }, [items]);

  const discountAmount = useMemo(() => {
    return Math.round((subtotal * membership.discountPercent) / 100);
  }, [subtotal, membership.discountPercent]);

  const grandTotal = Math.max(0, subtotal - discountAmount);
  const earnedPointsPreview = Math.floor(grandTotal / 10000);

  // Lắng nghe trạng thái thanh toán từ PayOS Webhook (Polling mỗi 2.5 giây khi mở Modal QR)
  useEffect(() => {
    if (!payOSData || paymentStatus === 'PAID') return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/payments/status/${payOSData.orderId}`);
        if (res.ok) {
          const statusData = await res.json();
          if (statusData.isPaid || statusData.status === 'PAID') {
            setPaymentStatus('PAID');
            clearInterval(interval);

            // Cập nhật điểm tích lũy vào store
            const currentPoints = useAuthStore.getState().user?.loyaltyPoints || 0;
            const pointsEarned = Math.floor(payOSData.amount / 10000);
            useAuthStore.getState().updateLoyaltyPoints(currentPoints + pointsEarned);

            // Xóa giỏ hàng sau khi thanh toán thành công
            clearActiveCart();

            // Tự động chuyển trang sau 1.5 giây
            setTimeout(() => {
              router.push(`/orders/${payOSData.orderId}`);
            }, 1500);
          }
        }
      } catch (err) {
        console.error('Lỗi kiểm tra trạng thái PayOS:', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [payOSData, paymentStatus, clearActiveCart, router]);

  // Sao chép thông tin chuyển khoản vào clipboard
  const handleCopy = (text: string, label: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopySuccess(label);
      setTimeout(() => setCopySuccess(null), 2000);
    }
  };

  // Tiến hành thanh toán
  const handleCheckoutSubmit = async () => {
    if (!token) {
      alert('Vui lòng đăng nhập để thanh toán đơn hàng!');
      router.push('/login?redirect=/checkout');
      return;
    }

    try {
      setIsPaying(true);

      // BƯỚC 1: Tạo Order qua API backend NestJS
      const orderResponse = await fetch('http://localhost:3001/api/orders', {
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
            toppings: item.toppings || [],
          })),
        }),
      });

      const orderData = await orderResponse.json();

      if (!orderResponse.ok) {
        if (orderResponse.status === 401) {
          logout();
          alert('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để hoàn tất!');
          router.push('/login?redirect=/checkout');
          return;
        }
        throw new Error(
          Array.isArray(orderData.message)
            ? orderData.message.join(', ')
            : orderData.message || 'Không thể tạo đơn hàng'
        );
      }

      const orderId = Number(orderData.orderId);

      // BƯỚC 2: Gọi PayOS Link để tạo mã QR VietQR / MoMo thật quét được trên điện thoại
      const payosResponse = await fetch('http://localhost:3001/api/payments/payos-link', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId,
          returnUrl: `${window.location.origin}/orders/${orderId}?status=PAID`,
          cancelUrl: `${window.location.origin}/orders/${orderId}?status=CANCELLED`,
        }),
      });

      const payosDataResult = await payosResponse.json();

      if (!payosResponse.ok) {
        throw new Error(
          Array.isArray(payosDataResult.message)
            ? payosDataResult.message.join(', ')
            : payosDataResult.message || 'Không thể tạo mã QR PayOS'
        );
      }

      // Mở modal thanh toán QR PayOS
      setPayOSData(payosDataResult);
      setPaymentStatus('PENDING');

    } catch (error) {
      console.error('Lỗi thanh toán:', error);
      alert(
        error instanceof Error
          ? error.message
          : 'Có lỗi xảy ra trong quá trình xử lý đơn hàng.'
      );
    } finally {
      setIsPaying(false);
    }
  };

  // Nút mô phỏng thanh toán thành công (Hỗ trợ demo khi không chuyển khoản tiền thật)
  const handleMockPaySuccess = async () => {
    if (!payOSData || !token) return;
    try {
      setIsPaying(true);
      const res = await fetch('http://localhost:3001/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: payOSData.orderId,
          amount: payOSData.amount,
          method: 'WALLET',
          idempotencyKey: generateUUIDv4(),
        }),
      });

      const resData = await res.json();
      if (!res.ok) {
        throw new Error(resData.message || 'Lỗi mô phỏng');
      }

      setPaymentStatus('PAID');
      clearActiveCart();

      if (resData.pointsEarned) {
        const currentPoints = useAuthStore.getState().user?.loyaltyPoints || 0;
        useAuthStore.getState().updateLoyaltyPoints(currentPoints + Number(resData.pointsEarned));
      }

      setTimeout(() => {
        router.push(`/orders/${payOSData.orderId}`);
      }, 1000);
    } catch (err: any) {
      alert(err.message || 'Không thể mô phỏng thanh toán');
    } finally {
      setIsPaying(false);
    }
  };

  if (!hasHydrated) return null;

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-[#FBF8F2] flex items-center justify-center p-6 text-center">
        <div className="bg-white border border-[#E8DFD8] rounded-3xl p-8 max-w-md w-full shadow-sm space-y-4">
          <BagIcon className="w-12 h-12 text-[#8D6E63] mx-auto" />
          <h2 className="text-2xl font-extrabold text-[#3E2723]">
            Không có sản phẩm để thanh toán
          </h2>
          <p className="text-sm text-[#756C65]">
            Giỏ hàng của bạn đang trống. Vui lòng thêm đồ uống vào giỏ hàng trước khi thanh toán.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-block bg-[#3E2723] hover:bg-[#2E1C12] text-white font-bold px-6 py-3 rounded-xl transition text-sm shadow-md shadow-[#3E2723]/20"
            >
              Quay lại Menu
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FBF8F2] py-8 px-4 sm:px-6 lg:px-8 text-[#1F1F1F]">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Link quay lại & Tiêu đề thanh toán */}
        <div className="space-y-1.5">
          <Link
            href="/cart"
            className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-[#8D6E63] hover:text-[#3E2723] transition-colors"
          >
            <ArrowLeftIcon className="w-4 h-4" />
            <span>Quay lại giỏ hàng</span>
          </Link>

          <h1 className="text-3xl sm:text-4xl font-extrabold text-[#3E2723] tracking-tight">
            Thanh toán
          </h1>
          <p className="text-xs sm:text-sm text-[#756C65]">
            Vui lòng chọn phương thức thanh toán để quét mã QR bằng điện thoại và nhận món tại quầy
          </p>
        </div>

        {/* Layout 2 cột: Phương thức thanh toán (Trái) & Tóm tắt đơn hàng (Phải) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* CỘT TRÁI: PHƯƠNG THỨC THANH TOÁN */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-6">
            
            <div className="bg-white border border-[#E8DFD8] rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
              <h2 className="text-xl font-extrabold text-[#3E2723]">
                Phương thức thanh toán
              </h2>

              {/* LƯỚI 2 PHƯƠNG THỨC THANH TOÁN (VietQR Pro & Ví MoMo) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                
                {/* 1. VietQR Pro */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('VIETQR')}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center gap-3.5 ${
                    paymentMethod === 'VIETQR'
                      ? 'border-2 border-[#8D6E63] bg-[#FDFBF7] shadow-sm ring-1 ring-[#8D6E63]/20'
                      : 'border-[#E8DFD8] bg-white hover:border-[#D7A86E] hover:bg-[#FAF5EE]/50'
                  }`}
                >
                  <div className="shrink-0">
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'VIETQR' ? 'border-[#3E2723] bg-white' : 'border-gray-300 bg-white'
                    }`}>
                      {paymentMethod === 'VIETQR' && <span className="w-2.5 h-2.5 rounded-full bg-[#3E2723]" />}
                    </span>
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-[#F5F0E6] flex items-center justify-center shrink-0 text-[#8D6E63]">
                    <BankIcon className="w-5 h-5" />
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-sm sm:text-base text-[#3E2723]">
                        VietQR Pro
                      </span>
                    </div>
                    <p className="text-xs text-[#756C65] mt-0.5">
                      Chuyển khoản 24/7 (PayOS)
                    </p>
                  </div>
                </button>

                {/* 2. Ví MoMo */}
                <button
                  type="button"
                  onClick={() => setPaymentMethod('MOMO')}
                  className={`p-4 rounded-2xl border text-left transition-all duration-200 cursor-pointer flex items-center gap-3.5 ${
                    paymentMethod === 'MOMO'
                      ? 'border-2 border-[#8D6E63] bg-[#FDFBF7] shadow-sm ring-1 ring-[#8D6E63]/20'
                      : 'border-[#E8DFD8] bg-white hover:border-[#D7A86E] hover:bg-[#FAF5EE]/50'
                  }`}
                >
                  <div className="shrink-0">
                    <span className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      paymentMethod === 'MOMO' ? 'border-[#3E2723] bg-white' : 'border-gray-300 bg-white'
                    }`}>
                      {paymentMethod === 'MOMO' && <span className="w-2.5 h-2.5 rounded-full bg-[#3E2723]" />}
                    </span>
                  </div>

                  <div className="w-10 h-10 rounded-xl bg-[#FFF0F6] flex items-center justify-center shrink-0">
                    <span className="w-6 h-6 rounded-full bg-[#A50064] text-white text-xs font-black flex items-center justify-center shadow-sm">
                      M
                    </span>
                  </div>

                  <div className="min-w-0 flex-1">
                    <span className="font-extrabold text-sm sm:text-base text-[#3E2723]">
                      Ví MoMo
                    </span>
                    <p className="text-xs text-[#756C65] mt-0.5">
                      Quét mã PayOS trên App MoMo
                    </p>
                  </div>
                </button>

              </div>

              {/* CHI TIẾT THEO PHƯƠNG THỨC ĐÃ CHỌN */}
              
              {/* Chi tiết 1: VietQR Pro */}
              {paymentMethod === 'VIETQR' && (
                <div className="bg-[#FDFBF7] border border-[#E8DFD8] rounded-2xl p-4 sm:p-6 shadow-inner space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#3E2723] pb-2 border-b border-[#E8DFD8]">
                    <InfoIcon className="w-4 h-4 text-[#8D6E63]" />
                    <span>Cổng thanh toán tự động VietQR Pro (PayOS)</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                    <div className="sm:col-span-7 space-y-2 text-xs text-[#5C4D44]">
                      <div className="flex justify-between py-1">
                        <span className="text-gray-500">Ngân hàng:</span>
                        <span className="font-bold text-[#2E1810]">OCB (Ngân hàng Phương Đông)</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-500">Chủ tài khoản:</span>
                        <span className="font-bold text-[#2E1810]">VO DUONG THANH LE</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-500">Số tài khoản:</span>
                        <span className="font-extrabold text-[#3E2723] tracking-wider text-sm">
                          0962 6295 94
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-500">Số tiền:</span>
                        <span className="font-extrabold text-[#8D6E63] text-sm">
                          {grandTotal.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                      <div className="p-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-emerald-800 text-[11px] leading-relaxed">
                        ✓ Mã QR động kèm nội dung chính xác sẽ hiển thị khi bạn bấm <strong>&quot;Thanh toán ngay&quot;</strong>.
                      </div>
                    </div>

                    <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-[#E8DFD8]">
                      <div className="w-32 h-32 p-1.5 bg-white rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
                        <img
                          src={`https://img.vietqr.io/image/970448-0962629594-compact2.png?amount=${grandTotal}&accountName=VO%20DUONG%20THANH%20LE`}
                          alt="VietQR Pro Preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-[11px] font-bold text-[#3E2723] mt-2">
                        Quét mã VietQR 24/7
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Chi tiết 2: Ví MoMo */}
              {paymentMethod === 'MOMO' && (
                <div className="bg-[#FFF8FB] border border-[#F3D1E4] rounded-2xl p-4 sm:p-6 shadow-inner space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#A50064] pb-2 border-b border-[#F3D1E4]">
                    <span className="w-4 h-4 rounded-full bg-[#A50064] text-white text-[10px] font-bold flex items-center justify-center">M</span>
                    <span>Thanh toán siêu tốc bằng cách quét mã trên Ví MoMo</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                    <div className="sm:col-span-7 space-y-2.5 text-xs text-[#5C4D44]">
                      <p className="font-semibold text-[#A50064]">
                        Các bước quét mã trên Ví MoMo:
                      </p>
                      <ol className="list-decimal list-inside space-y-1.5 text-gray-700">
                        <li>Bấm nút <strong>&quot;Thanh toán ngay&quot;</strong> bên dưới để tạo mã QR đơn hàng.</li>
                        <li>Mở ứng dụng <strong>Ví MoMo</strong> trên điện thoại.</li>
                        <li>Bấm chọn biểu tượng <strong>&quot;Quét mã&quot;</strong> ở góc trên màn hình chính MoMo.</li>
                        <li>Quét mã QR PayOS và bấm <strong>&quot;Chuyển tiền&quot;</strong>. Hệ thống tự động xác nhận sau 1-3s!</li>
                      </ol>
                      <div className="bg-white p-2.5 rounded-lg border border-[#F3D1E4] text-[11px] text-[#A50064]">
                        Số tiền thanh toán: <strong>{grandTotal.toLocaleString('vi-VN')}đ</strong>
                      </div>
                    </div>

                    <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-[#F3D1E4]">
                      <div className="w-32 h-32 p-1.5 bg-white rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
                        <img
                          src={`https://img.vietqr.io/image/970448-0962629594-compact2.png?amount=${grandTotal}&accountName=VO%20DUONG%20THANH%20LE`}
                          alt="MoMo VietQR Preview"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-[11px] font-bold text-[#A50064] mt-2">
                        Ví MoMo quét được 100%
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Back link at bottom */}
            <div>
              <Link
                href="/cart"
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#8D6E63] hover:text-[#3E2723]"
              >
                <ArrowLeftIcon className="w-3.5 h-3.5" />
                <span>Về giỏ hàng</span>
              </Link>
            </div>

          </div>

          {/* CỘT PHẢI: ĐƠN HÀNG CỦA BẠN & NÚT THANH TOÁN */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-24">
            <div className="bg-white border border-[#E8DFD8] rounded-3xl p-6 sm:p-7 shadow-sm space-y-6">
              
              {/* Header Right Sidebar */}
              <div className="flex items-center gap-2 pb-2 border-b border-gray-100">
                <BagIcon className="w-5 h-5 text-[#8D6E63]" />
                <h2 className="font-extrabold text-lg text-[#3E2723]">
                  Đơn hàng của bạn ({items.length} món)
                </h2>
              </div>

              {/* Danh sách món */}
              <div className="space-y-4 max-h-[360px] overflow-y-auto pr-1">
                {items.map((item) => (
                  <div
                    key={item.cartItemId}
                    className="flex items-start justify-between gap-3 text-xs"
                  >
                    <div className="flex items-start gap-3 min-w-0">
                      <div className="w-14 h-14 rounded-xl overflow-hidden bg-[#F5F0E6] shrink-0 border border-[#E8DFD8]">
                        <img
                          src={
                            item.imageUrl ||
                            "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=200&auto=format&fit=crop&q=80"
                          }
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      </div>

                      <div className="min-w-0">
                        <p className="font-bold text-[#2E1810] text-sm truncate">
                          {item.name}
                        </p>
                        <p className="text-gray-500 text-[11px] mt-0.5">
                          Size {item.size} {item.toppings?.length ? `• ${item.toppings.join(', ')}` : ''}
                        </p>
                        <p className="font-bold text-[#8D6E63] mt-1">
                          {(Number(item.price) * Number(item.quantity)).toLocaleString('vi-VN')}đ
                        </p>
                      </div>
                    </div>

                    {/* Stepper nhỏ & Trash */}
                    <div className="flex items-center gap-2 shrink-0">
                      <div className="flex items-center border border-gray-200 rounded-lg bg-[#FDFBF7]">
                        <button
                          type="button"
                          onClick={() => {
                            if (item.quantity > 1) {
                              updateQuantity(item.cartItemId, item.quantity - 1);
                            } else {
                              removeFromCart(item.cartItemId);
                            }
                          }}
                          className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-black cursor-pointer"
                        >
                          <MinusIcon className="w-2.5 h-2.5" />
                        </button>
                        <span className="px-1.5 font-bold text-[11px]">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                          className="w-5 h-5 flex items-center justify-center text-gray-500 hover:text-black cursor-pointer"
                        >
                          <PlusIcon className="w-2.5 h-2.5" />
                        </button>
                      </div>

                      <button
                        type="button"
                        onClick={() => removeFromCart(item.cartItemId)}
                        className="text-gray-300 hover:text-red-500 p-1 cursor-pointer"
                        title="Xóa"
                      >
                        <TrashIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* PHẦN GIẢM GIÁ THEO LOYALTYPOINTS CỦA USER */}
              <div className="pt-2 border-t border-gray-100 space-y-3">
                <div className="bg-[#FDFBF7] border border-[#E8DFD8] rounded-2xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5">
                      <span className="text-xl">{membership.icon}</span>
                      <div>
                        <span className="text-xs font-bold text-[#3E2723] block">
                          Ưu đãi thành viên BrewLite
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span
                            className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border ${membership.badgeColor}`}
                          >
                            Hạng {membership.tier}
                          </span>
                          <span className="text-xs font-bold text-[#8D6E63]">
                            {loyaltyPoints} điểm
                          </span>
                        </div>
                      </div>
                    </div>
                    {membership.discountPercent > 0 ? (
                      <span className="bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold px-2.5 py-1 rounded-xl">
                        Giảm {membership.discountPercent}%
                      </span>
                    ) : (
                      <span className="text-[11px] text-gray-500 font-medium">
                        0% giảm giá
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-[#756C65] leading-relaxed">
                    {membership.discountPercent > 0 ? (
                      <>
                        Đơn hàng của bạn được{' '}
                        <strong className="text-emerald-700">
                          tự động giảm {membership.discountPercent}%
                        </strong>{' '}
                        dựa trên điểm tích lũy ({loyaltyPoints} điểm - Hạng {membership.tier}).
                      </>
                    ) : (
                      <>
                        Bạn đang có <strong>{loyaltyPoints} điểm</strong>. Tích lũy thêm{' '}
                        <strong className="text-[#8D6E63]">{membership.pointsNeeded} điểm</strong> nữa để lên hạng{' '}
                        <strong>{membership.nextTier}</strong> và nhận ưu đãi giảm 5% tự động!
                      </>
                    )}
                  </p>

                  {/* Progress bar lên hạng tiếp theo */}
                  {membership.nextTier && (
                    <div className="space-y-1 pt-1">
                      <div className="flex justify-between text-[10px] text-gray-500 font-medium">
                        <span>Hạng {membership.tier}</span>
                        <span>Cần thêm {membership.pointsNeeded} điểm lên {membership.nextTier}</span>
                      </div>
                      <div className="w-full bg-[#E8DFD8] h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-[#8D6E63] h-full rounded-full transition-all duration-300"
                          style={{
                            width: `${Math.min(
                              100,
                              Math.round(
                                (loyaltyPoints /
                                  (loyaltyPoints + membership.pointsNeeded)) *
                                  100
                              )
                            )}%`,
                          }}
                        />
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Tóm tắt chi phí (Không có phí giao hàng) */}
              <div className="space-y-2 pt-2 border-t border-gray-100 text-xs">
                <div className="flex justify-between text-[#5C4D44]">
                  <span>Tạm tính ({items.length} món)</span>
                  <span className="font-bold text-[#2E1810]">
                    {subtotal.toLocaleString('vi-VN')}đ
                  </span>
                </div>

                {discountAmount > 0 ? (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>
                      Giảm giá thành viên (Hạng {membership.tier} -{membership.discountPercent}%)
                    </span>
                    <span className="font-bold">
                      -{discountAmount.toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                ) : (
                  <div className="flex justify-between text-gray-400">
                    <span>Giảm giá thành viên</span>
                    <span>0đ</span>
                  </div>
                )}

                {/* Điểm tích lũy nhận được */}
                <div className="flex justify-between text-[#8D6E63] text-[11px] pt-1.5 border-t border-dashed border-gray-200">
                  <span>Điểm tích lũy nhận được:</span>
                  <span className="font-bold">+{earnedPointsPreview} điểm</span>
                </div>
              </div>

              <hr className="border-[#E8DFD8]" />

              {/* Tổng cộng */}
              <div className="flex justify-between items-baseline">
                <span className="font-bold text-base text-[#3E2723]">
                  Tổng cộng
                </span>
                <span className="font-extrabold text-2xl text-[#3E2723]">
                  {grandTotal.toLocaleString('vi-VN')}đ
                </span>
              </div>

              {/* Nút Thanh toán ngay */}
              <button
                type="button"
                disabled={isPaying}
                onClick={handleCheckoutSubmit}
                className="w-full bg-[#763A1E] hover:bg-[#5C2D17] text-white font-bold py-3.5 px-4 rounded-xl transition shadow-lg shadow-[#763A1E]/20 hover:-translate-y-0.5 active:translate-y-0 disabled:opacity-50 text-center flex items-center justify-center gap-2 cursor-pointer text-sm"
              >
                <BankIcon className="w-4 h-4 text-[#D7A86E]" />
                <span>{isPaying ? 'Đang tạo mã thanh toán...' : 'Thanh toán ngay'}</span>
              </button>

              <div className="text-center pt-1">
                <Link
                  href="/#menu"
                  className="text-xs font-semibold text-[#8D6E63] hover:text-[#3E2723] hover:underline"
                >
                  ← Tiếp tục mua sắm
                </Link>
              </div>

            </div>
          </div>

        </div>

      </div>

      {/* =========================================================
          MODAL THANH TOÁN QR PAYOS (QUÉT BẰNG MOMO VÀ APP NGÂN HÀNG)
      ========================================================= */}
      {payOSData && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full overflow-hidden shadow-2xl border border-[#E8DFD8] my-8 animate-scaleUp">
            
            {/* Header Modal */}
            <div className={`p-5 text-white ${
              paymentMethod === 'MOMO' ? 'bg-[#A50064]' : 'bg-[#3E2723]'
            }`}>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  {paymentMethod === 'MOMO' ? (
                    <span className="w-8 h-8 rounded-full bg-white text-[#A50064] font-black flex items-center justify-center text-sm shadow">
                      M
                    </span>
                  ) : (
                    <span className="w-8 h-8 rounded-full bg-[#D7A86E] text-[#3E2723] font-bold flex items-center justify-center text-sm shadow">
                      QR
                    </span>
                  )}
                  <div>
                    <h3 className="font-extrabold text-base leading-tight">
                      {paymentMethod === 'MOMO' ? 'Quét mã bằng Ví MoMo' : 'Quét mã VietQR Pro (PayOS)'}
                    </h3>
                    <p className="text-xs text-white/80">
                      Đơn hàng #BL{String(payOSData.orderId).padStart(6, '0')}
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setPayOSData(null)}
                  className="w-8 h-8 rounded-full bg-white/20 hover:bg-white/30 text-white flex items-center justify-center font-bold text-sm transition cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Nội dung Modal */}
            <div className="p-6 space-y-5">
              
              {/* Trạng thái xác nhận (Pulsing / Thành công) */}
              {paymentStatus === 'PAID' ? (
                <div className="p-4 bg-emerald-50 border-2 border-emerald-500 rounded-2xl text-center space-y-2 animate-bounce">
                  <div className="w-12 h-12 rounded-full bg-emerald-500 text-white flex items-center justify-center mx-auto text-2xl font-bold">
                    ✓
                  </div>
                  <h4 className="font-extrabold text-emerald-800 text-lg">
                    Thanh toán thành công!
                  </h4>
                  <p className="text-xs text-emerald-700">
                    Cổng PayOS đã xác nhận giao dịch. Đang chuyển tới đơn hàng...
                  </p>
                </div>
              ) : (
                <div className="flex items-center justify-center gap-2.5 py-2 px-3 bg-amber-50 rounded-xl border border-amber-200 text-amber-800 text-xs font-medium">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                  <span>Đang chờ bạn quét mã và chuyển tiền trên điện thoại...</span>
                </div>
              )}

              {/* Khung hiển thị Mã QR */}
              {paymentStatus !== 'PAID' && (
                <div className="flex flex-col items-center justify-center">
                  <div className="p-3 bg-white rounded-2xl border-2 border-[#E8DFD8] shadow-md relative group">
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(payOSData.qrCode)}`}
                      alt="PayOS QR Code"
                      className="w-56 h-56 object-contain rounded-lg"
                    />
                    <div className="absolute inset-x-0 bottom-1 flex justify-center">
                      <span className="text-[10px] bg-white/90 text-gray-600 px-2 py-0.5 rounded shadow text-center font-semibold">
                        {paymentMethod === 'MOMO' ? 'Mở MoMo để quét' : 'MoMo / App Ngân hàng đều quét được'}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-center text-[#756C65] mt-3">
                    Mở ứng dụng <strong>{paymentMethod === 'MOMO' ? 'Ví MoMo' : 'Ngân hàng / MoMo'}</strong> trên điện thoại & chọn tính năng <strong>Quét mã QR</strong>
                  </p>
                </div>
              )}

              {/* Thông tin chuyển khoản chi tiết */}
              <div className="bg-[#FDFBF7] border border-[#E8DFD8] rounded-2xl p-4 space-y-2.5 text-xs text-[#5C4D44]">
                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-gray-500">Ngân hàng:</span>
                  <span className="font-bold text-[#2E1810]">OCB (Ngân hàng Phương Đông)</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-gray-500">Chủ tài khoản:</span>
                  <span className="font-bold text-[#2E1810]">{payOSData.accountName}</span>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-gray-500">Số tài khoản:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[#3E2723] text-sm tracking-wider">
                      {payOSData.accountNumber}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(payOSData.accountNumber, 'stk')}
                      className="text-[11px] font-bold text-[#8D6E63] hover:text-[#3E2723] underline cursor-pointer"
                    >
                      {copySuccess === 'stk' ? '✓ Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1 border-b border-gray-100">
                  <span className="text-gray-500">Số tiền:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[#8D6E63] text-base">
                      {payOSData.amount.toLocaleString('vi-VN')}đ
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(String(payOSData.amount), 'amount')}
                      className="text-[11px] font-bold text-[#8D6E63] hover:text-[#3E2723] underline cursor-pointer"
                    >
                      {copySuccess === 'amount' ? '✓ Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>

                <div className="flex justify-between items-center py-1 bg-[#F5F0E6] px-2.5 rounded-lg border border-[#E8DFD8]">
                  <span className="text-gray-700 font-semibold">Nội dung CK:</span>
                  <div className="flex items-center gap-2">
                    <span className="font-extrabold text-[#3E2723] tracking-wide">
                      {payOSData.description}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleCopy(payOSData.description, 'memo')}
                      className="text-[11px] font-bold text-[#8D6E63] hover:text-[#3E2723] underline cursor-pointer"
                    >
                      {copySuccess === 'memo' ? '✓ Đã chép' : 'Sao chép'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Nút thao tác bổ sung */}
              <div className="space-y-2 pt-1">
                {/* Mở cổng PayOS trực tiếp trong tab mới */}
                <a
                  href={payOSData.checkoutUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full bg-[#3E2723] hover:bg-[#2E1C12] text-white font-bold py-3 px-4 rounded-xl text-center text-xs sm:text-sm transition flex items-center justify-center gap-2 cursor-pointer shadow-md"
                >
                  <span>Mở trang thanh toán PayOS</span>
                  <span className="text-xs">↗</span>
                </a>

                {/* Nút mô phỏng thanh toán khi test / demo */}
                <button
                  type="button"
                  onClick={handleMockPaySuccess}
                  disabled={isPaying || paymentStatus === 'PAID'}
                  className="w-full bg-[#F5F0E6] hover:bg-[#E8DFD8] text-[#5C4D44] font-bold py-2.5 px-4 rounded-xl text-center text-xs transition border border-[#E8DFD8] cursor-pointer"
                >
                  ⚡ Mô phỏng thanh toán thành công (Test Demo)
                </button>

                {/* Nút đóng */}
                <button
                  type="button"
                  onClick={() => setPayOSData(null)}
                  className="w-full text-center text-xs text-gray-500 hover:text-gray-800 py-1.5 transition cursor-pointer"
                >
                  Đóng cửa sổ này
                </button>
              </div>

            </div>

          </div>
        </div>
      )}

    </main>
  );
}
