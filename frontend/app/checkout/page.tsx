'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

export default function CheckoutPage() {
  const router = useRouter();

  const { items, removeFromCart, updateQuantity, clearActiveCart } = useCartStore();
  const { token, user, logout } = useAuthStore();

  const [hasHydrated, setHasHydrated] = useState(false);
  const [isPaying, setIsPaying] = useState(false);

  // Phương thức thanh toán (2 tùy chọn: VietQR, MoMo)
  type PaymentMethodType = 'VIETQR' | 'MOMO';
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('VIETQR');
  const [showMomoModal, setShowMomoModal] = useState(false);
  const [createdOrderData, setCreatedOrderData] = useState<{ id: number; total: number } | null>(null);
  const [payosPaymentData, setPayosPaymentData] = useState<{ qrCode?: string; accountNumber?: string; accountName?: string; description?: string; amount?: number } | null>(null);
  const [pollCount, setPollCount] = useState(0);
  const [autoDetected, setAutoDetected] = useState(false);

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

  // Tạo mã nội dung chuyển khoản động
  const transferContent = useMemo(() => {
    return `BrewLite_#ORD${Math.floor(100000 + Math.random() * 900000)}`;
  }, []);

  // Tiến hành thanh toán
  const handleCheckoutSubmit = async () => {
    if (!token) {
      alert('Vui lòng đăng nhập để thanh toán đơn hàng!');
      router.push('/login?redirect=/checkout');
      return;
    }

    try {
      setIsPaying(true);

      // BƯỚC 1: Tạo Order qua API backend NestJS (backend tự tính giảm giá theo loyaltyPoints của user)
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
      const payableAmount =
        orderData.total !== undefined ? Number(orderData.total) : grandTotal;

      // BƯỚC 2A: Nếu chọn VietQR -> Tạo link thanh toán PayOS và chuyển hướng để quét mã thực tế
      if (paymentMethod === 'VIETQR') {
        const payosResponse = await fetch('http://localhost:3001/api/payments/create-payos-link', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ orderId }),
        });

        const payosData = await payosResponse.json();
        if (!payosResponse.ok) {
          throw new Error(
            payosData.message || 'Không thể tạo link thanh toán VietQR qua PayOS'
          );
        }

        // Chuyển hướng tới cổng thanh toán VietQR chuẩn PayOS (chưa xóa giỏ hàng, chỉ xóa khi thanh toán thành công)
        window.location.href = payosData.checkoutUrl;
        return;
      }

      // BƯỚC 2B: Nếu chọn MoMo -> Tạo link PayOS để có mã QR & Lời nhắn đồng bộ, tự động nhận tiền 100%
      if (paymentMethod === 'MOMO') {
        try {
          const payosResponse = await fetch('http://localhost:3001/api/payments/create-payos-link', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({ orderId }),
          });

          if (payosResponse.ok) {
            const payosData = await payosResponse.json();
            setPayosPaymentData(payosData);
          }
        } catch (e) {
          console.error('Không thể tạo PayOS link cho MoMo:', e);
        }

        setCreatedOrderData({ id: orderId, total: payableAmount });
        setShowMomoModal(true);
        return;
      }

      // BƯỚC 2C: Dự phòng thanh toán
      clearActiveCart();
      router.push(`/orders/${orderId}`);
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

  // Tự động Polling kiểm tra khi tiền về (không cần bấm nút, tự động nhảy trang)
  useEffect(() => {
    if (!showMomoModal || !createdOrderData?.id || !token) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/orders/${createdOrderData.id}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) {
          const order = await res.json();
          // Khi Webhook PayOS/Ngân hàng báo tiền về -> Trạng thái đổi sang PAID
          if (order.status === 'PAID' || order.status === 'PREPARING' || order.status === 'COMPLETED') {
            clearInterval(interval);
            setShowMomoModal(false);
            clearActiveCart();
            router.push(`/orders/${createdOrderData.id}`);
          }
        }
      } catch (err) {
        console.error('Lỗi polling MoMo:', err);
      }
    }, 2500);

    return () => clearInterval(interval);
  }, [showMomoModal, createdOrderData?.id, token, router, clearActiveCart]);

  // Xác nhận sau khi khách hàng đã quét mã chuyển tiền MoMo thật
  const handleConfirmMomoPaid = async () => {
    if (!createdOrderData || !token) return;

    try {
      setIsPaying(true);
      const paymentResponse = await fetch('http://localhost:3001/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: createdOrderData.id,
          amount: createdOrderData.total,
          method: 'WALLET',
          idempotencyKey: `momo-p2p-${createdOrderData.id}-${Date.now()}`,
        }),
      });

      const paymentData = await paymentResponse.json();
      if (!paymentResponse.ok) {
        throw new Error(paymentData.message || 'Không thể xác nhận thanh toán');
      }

      if (paymentData.pointsEarned) {
        const currentPoints = useAuthStore.getState().user?.loyaltyPoints || 0;
        useAuthStore.getState().updateLoyaltyPoints(currentPoints + Number(paymentData.pointsEarned));
      }

      setShowMomoModal(false);
      clearActiveCart();
      router.push(`/orders/${createdOrderData.id}`);
    } catch (err: any) {
      alert(err.message || 'Lỗi xác nhận thanh toán MoMo');
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
            Vui lòng chọn phương thức thanh toán để hoàn tất đơn hàng và nhận món tại quầy
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
                      Chuyển khoản 24/7
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
                      Quét mã tiện lợi
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
                    <span>Thông tin chuyển khoản VietQR Pro</span>
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
                      <div className="flex justify-between py-1.5 bg-[#F5F0E6] px-3 rounded-lg border border-[#E8DFD8]">
                        <span className="text-gray-600 font-semibold">Nội dung:</span>
                        <span className="font-extrabold text-[#8D6E63] tracking-wide">
                          {transferContent}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 italic pt-1">
                        * Quét mã QR bằng ứng dụng ngân hàng bất kỳ để hoàn tất đơn hàng tự động.
                      </p>
                    </div>

                    <div className="sm:col-span-5 flex flex-col items-center justify-center p-5 bg-[#F5F0E6]/50 rounded-2xl border border-dashed border-[#8D6E63]/30 text-center space-y-2.5">
                      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#8D6E63] shadow-sm mx-auto">
                        <BankIcon className="w-6 h-6" />
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-[#3E2723] block">
                          Tự động sinh mã VietQR
                        </span>
                        <p className="text-[11px] text-[#756C65] leading-relaxed">
                          Nhấn nút <strong className="text-[#3E2723]">&quot;Thanh toán ngay&quot;</strong> bên dưới để lấy mã QR chính thức và tự động duyệt đơn khi chuyển khoản.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Chi tiết 2: Ví MoMo Cá Nhân */}
              {paymentMethod === 'MOMO' && (
                <div className="bg-[#FFF8FB] border border-[#F3D1E4] rounded-2xl p-4 sm:p-6 shadow-inner space-y-4">
                  <div className="flex items-center gap-2 text-xs font-bold text-[#A50064] pb-2 border-b border-[#F3D1E4]">
                    <span className="w-4 h-4 rounded-full bg-[#A50064] text-white text-[10px] font-bold flex items-center justify-center">M</span>
                    <span>Thông tin chuyển tiền Ví MoMo</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                    <div className="sm:col-span-7 space-y-2 text-xs text-[#5C4D44]">
                      <div className="flex justify-between py-1">
                        <span className="text-gray-500">Ví điện tử:</span>
                        <span className="font-bold text-[#A50064]">MoMo</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-500">Chủ ví MoMo:</span>
                        <span className="font-bold text-[#2E1810]">VO DUONG THANH LE</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-500">Số điện thoại:</span>
                        <span className="font-extrabold text-[#A50064] tracking-wider text-sm">
                          0962 6295 94
                        </span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-500">Số tiền:</span>
                        <span className="font-extrabold text-[#A50064] text-sm">
                          {grandTotal.toLocaleString('vi-VN')}đ
                        </span>
                      </div>
                      <div className="flex justify-between py-1.5 bg-[#FFF0F6] px-3 rounded-lg border border-[#F3D1E4]">
                        <span className="text-gray-600 font-semibold">Lời nhắn:</span>
                        <span className="font-extrabold text-[#A50064] tracking-wide">
                          {transferContent}
                        </span>
                      </div>
                      <p className="text-[11px] text-gray-400 italic pt-1">
                        * Mở app MoMo trên điện thoại, quét mã QR bên cạnh để chuyển tiền trực tiếp. Sau khi chuyển xong, bấm nút &quot;Thanh toán ngay&quot; bên dưới để hoàn tất đơn!
                      </p>
                    </div>

                    <div className="sm:col-span-5 flex flex-col items-center justify-center p-5 bg-[#FFF0F6]/50 rounded-2xl border border-dashed border-[#A50064]/30 text-center space-y-2.5">
                      <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center text-[#A50064] shadow-sm mx-auto">
                        <span className="font-black text-lg">M</span>
                      </div>
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-[#A50064] block">
                          Quét mã MoMo tiền thật
                        </span>
                        <p className="text-[11px] text-[#756C65] leading-relaxed">
                          Nhấn nút <strong className="text-[#A50064]">&quot;Thanh toán ngay&quot;</strong> bên dưới để mở cửa sổ quét mã MoMo và hoàn tất đơn hàng.
                        </p>
                      </div>
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
                <span>{isPaying ? 'Đang xử lý đơn...' : 'Thanh toán ngay'}</span>
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
          MODAL POPUP QUÉT MÃ MOMO CHUYỂN TIỀN THẬT
      ========================================================= */}
      {showMomoModal && createdOrderData && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-white rounded-3xl p-6 sm:p-8 max-w-md w-full shadow-2xl border border-[#F3D1E4] space-y-5 text-center relative animate-in zoom-in-95 duration-200">
            {/* Nút đóng góc phải */}
            <button
              type="button"
              onClick={() => setShowMomoModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-gray-600 w-8 h-8 rounded-full flex items-center justify-center bg-gray-100 hover:bg-gray-200 transition cursor-pointer"
            >
              ✕
            </button>

            {/* Icon MoMo */}
            <div className="w-12 h-12 bg-[#FFF0F6] text-[#A50064] rounded-2xl flex items-center justify-center mx-auto shadow-inner">
              <span className="font-black text-xl">M</span>
            </div>

            <div className="space-y-1">
              <h3 className="text-xl font-extrabold text-[#3E2723]">
                Quét mã Ví MoMo để thanh toán
              </h3>
              <p className="text-xs text-[#756C65]">
                Dùng App MoMo hoặc Camera điện thoại quét mã QR bên dưới
              </p>
            </div>

            {/* Khung ảnh QR MoMo */}
            <div className="p-4 bg-[#FFF8FB] border border-[#F3D1E4] rounded-2xl flex flex-col items-center justify-center">
              <div className="w-48 h-48 bg-white p-2 rounded-xl shadow-md border border-pink-100 flex items-center justify-center">
                <img
                  src={
                    payosPaymentData?.accountNumber
                      ? `https://img.vietqr.io/image/970448-${payosPaymentData.accountNumber}-compact2.png?amount=${createdOrderData.total}&addInfo=${encodeURIComponent(payosPaymentData.description || `BrewLite #${createdOrderData.id}`)}&accountName=${encodeURIComponent(payosPaymentData.accountName || "VO DUONG THANH LE")}`
                      : `https://img.vietqr.io/image/970448-0962629594-compact2.png?amount=${createdOrderData.total}&addInfo=${encodeURIComponent(`BrewLite #${createdOrderData.id}`)}&accountName=${encodeURIComponent("VO DUONG THANH LE")}`
                  }
                  alt="MoMo VietQR"
                  className="w-full h-full object-contain"
                />
              </div>
              <span className="text-xs font-bold text-[#A50064] mt-2.5">
                VO DUONG THANH LE — 0962 6295 94
              </span>
              <span className="text-xl font-black text-[#A50064] mt-0.5">
                {createdOrderData.total.toLocaleString('vi-VN')}đ
              </span>
            </div>

            {/* Đang tự động nhận diện thanh toán */}
            <div className="flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-pink-50 border border-pink-200 text-[11px] text-[#A50064] font-medium">
              <div className="w-3.5 h-3.5 border-2 border-[#A50064] border-t-transparent rounded-full animate-spin shrink-0" />
              <span>Đang chờ chuyển tiền... Hệ thống sẽ tự động duyệt đơn khi tiền vào!</span>
            </div>

            {/* Chi tiết người nhận & Lời nhắn */}
            <div className="bg-gray-50 p-3 rounded-xl border border-gray-200 text-xs text-left space-y-1.5">
              <div className="flex justify-between">
                <span className="text-gray-500">Người nhận:</span>
                <span className="font-bold text-gray-800">VO DUONG THANH LE</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Số MoMo:</span>
                <span className="font-bold text-[#A50064]">0962 6295 94</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Nội dung CK (tự động nhận diện):</span>
                <span className="font-bold text-[#A50064] bg-pink-50 px-1.5 py-0.5 rounded border border-pink-200">{payosPaymentData?.description || `BrewLite #${createdOrderData.id}`}</span>
              </div>
            </div>

            {/* Nút bấm xác nhận */}
            <div className="space-y-2 pt-1">
              <button
                type="button"
                disabled={isPaying}
                onClick={handleConfirmMomoPaid}
                className="w-full bg-[#A50064] hover:bg-[#880052] disabled:opacity-50 text-white font-bold py-3.5 px-4 rounded-xl transition shadow-lg shadow-[#A50064]/25 text-sm cursor-pointer"
              >
                {isPaying ? 'Đang xác nhận...' : '✅ Tôi đã chuyển tiền MoMo thành công'}
              </button>
              <button
                type="button"
                onClick={() => setShowMomoModal(false)}
                className="w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-2.5 rounded-xl transition text-xs cursor-pointer"
              >
                Hủy / Đổi phương thức
              </button>
            </div>
          </div>
        </div>
      )}

    </main>
  );
}
