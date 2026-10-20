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

  // Voucher
  const [voucherCode, setVoucherCode] = useState('');
  const [voucherDiscount, setVoucherDiscount] = useState(0);
  const [voucherMessage, setVoucherMessage] = useState('');

  // Phương thức thanh toán (2 tùy chọn: VietQR, MoMo)
  type PaymentMethodType = 'VIETQR' | 'MOMO';
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethodType>('VIETQR');

  useEffect(() => {
    setHasHydrated(true);
  }, []);

  // Tính toán chi phí (Không có phí giao hàng vì nhận món trực tiếp tại quầy)
  const subtotal = useMemo(() => {
    return items.reduce(
      (sum, item) => sum + Number(item.price) * Number(item.quantity),
      0
    );
  }, [items]);

  const grandTotal = Math.max(0, subtotal - voucherDiscount);

  // Tạo mã nội dung chuyển khoản động
  const transferContent = useMemo(() => {
    return `BrewLite_#ORD${Math.floor(100000 + Math.random() * 900000)}`;
  }, []);

  // Xử lý áp dụng mã voucher
  const handleApplyVoucher = (code: string) => {
    const cleanCode = code.trim().toUpperCase();
    setVoucherCode(cleanCode);
    if (cleanCode === 'BREW10') {
      const discount = Math.round(subtotal * 0.1);
      setVoucherDiscount(discount);
      setVoucherMessage('Áp dụng mã BREW10: Giảm 10%');
    } else if (cleanCode === 'BREW20') {
      const discount = Math.round(subtotal * 0.2);
      setVoucherDiscount(discount);
      setVoucherMessage('Áp dụng mã BREW20: Giảm 20%');
    } else if (cleanCode === 'CHAOMUNG') {
      setVoucherDiscount(15000);
      setVoucherMessage('Áp dụng mã CHAOMUNG: Giảm 15.000đ');
    } else if (cleanCode === '') {
      setVoucherDiscount(0);
      setVoucherMessage('');
    } else {
      setVoucherDiscount(0);
      setVoucherMessage('Mã giảm giá không hợp lệ');
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
          voucherCode: voucherCode.trim() || undefined,
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

      // BƯỚC 2: Gọi thanh toán idempotent qua POST /api/payments
      const backendMethod = 'WALLET'; // VietQR và MoMo đều xử lý qua luồng ví/chuyển khoản điện tử WALLET

      const paymentResponse = await fetch('http://localhost:3001/api/payments', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId,
          amount: payableAmount,
          method: backendMethod,
          idempotencyKey: `payment-${orderId}-${Date.now()}`,
        }),
      });

      const paymentData = await paymentResponse.json();

      if (!paymentResponse.ok) {
        throw new Error(
          Array.isArray(paymentData.message)
            ? paymentData.message.join(', ')
            : paymentData.message || 'Thanh toán không thành công'
        );
      }

      // Xóa giỏ hàng và chuyển hướng sang trang xác nhận thành công
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
                        <span className="font-bold text-[#2E1810]">Vietcombank</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-500">Chủ tài khoản:</span>
                        <span className="font-bold text-[#2E1810]">BrewLite Coffee</span>
                      </div>
                      <div className="flex justify-between py-1">
                        <span className="text-gray-500">Số tài khoản:</span>
                        <span className="font-extrabold text-[#3E2723] tracking-wider text-sm">
                          1234 5678 9012
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

                    <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-[#E8DFD8]">
                      <div className="w-36 h-36 p-1.5 bg-white rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=00020101021238540010A0000007270124000697043601121234567890120208QRIBFTTA5303704540${grandTotal}5802VN62250821${transferContent}6304`}
                          alt="VietQR Code"
                          className="w-full h-full object-contain"
                          onError={(e) => {
                            (e.target as HTMLElement).style.display = 'none';
                          }}
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
                    <span>Thanh toán siêu tốc qua Ví MoMo</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center">
                    <div className="sm:col-span-7 space-y-2.5 text-xs text-[#5C4D44]">
                      <p className="font-semibold text-[#A50064]">
                        Các bước thanh toán qua Ví MoMo:
                      </p>
                      <ol className="list-decimal list-inside space-y-1.5 text-gray-700">
                        <li>Mở ứng dụng <strong>Ví MoMo</strong> trên điện thoại.</li>
                        <li>Chọn tính năng <strong>&quot;Quét mã&quot;</strong> tại màn hình chính.</li>
                        <li>Quét mã QR bên cạnh và bấm <strong>&quot;Xác nhận thanh toán&quot;</strong>.</li>
                      </ol>
                      <div className="bg-white p-2.5 rounded-lg border border-[#F3D1E4] text-[11px] text-[#A50064]">
                        Số tiền thanh toán: <strong>{grandTotal.toLocaleString('vi-VN')}đ</strong>
                      </div>
                    </div>

                    <div className="sm:col-span-5 flex flex-col items-center justify-center p-3 bg-white rounded-xl border border-[#F3D1E4]">
                      <div className="w-36 h-36 p-1.5 bg-white rounded-lg border border-gray-200 shadow-sm flex items-center justify-center">
                        <img
                          src={`https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=2|99|0901234567|BrewLite%20Coffee|contact@brewlite.vn|0|0|${grandTotal}|${transferContent}|transfer_p2p`}
                          alt="MoMo QR Code"
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <span className="text-[11px] font-bold text-[#A50064] mt-2">
                        Quét mã bằng Ví MoMo
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

              {/* Ô nhập Voucher ưu đãi (Task 10) */}
              <div className="pt-2 border-t border-gray-100 space-y-2">
                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Mã voucher (BREW10, BREW20...)"
                    value={voucherCode}
                    onChange={(e) => setVoucherCode(e.target.value.toUpperCase())}
                    className="flex-1 bg-[#FDFBF7] border border-[#E8DFD8] rounded-xl px-3 py-1.5 text-xs uppercase font-medium focus:outline-none focus:ring-1 focus:ring-[#8D6E63]"
                  />
                  <button
                    type="button"
                    onClick={() => handleApplyVoucher(voucherCode)}
                    className="bg-[#8D6E63] hover:bg-[#763A1E] text-white px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
                  >
                    Áp dụng
                  </button>
                </div>

                {voucherMessage && (
                  <p className={`text-[11px] ${voucherDiscount > 0 ? 'text-emerald-600 font-semibold' : 'text-red-500'}`}>
                    {voucherMessage}
                  </p>
                )}

                {/* Gợi ý mã nhanh */}
                <div className="flex gap-1.5 text-[10px]">
                  <button
                    type="button"
                    onClick={() => handleApplyVoucher('BREW10')}
                    className="bg-[#F5F0E6] text-[#8D6E63] hover:bg-[#E8DFD8] px-2 py-0.5 rounded cursor-pointer font-medium"
                  >
                    BREW10 (-10%)
                  </button>
                  <button
                    type="button"
                    onClick={() => handleApplyVoucher('CHAOMUNG')}
                    className="bg-[#F5F0E6] text-[#8D6E63] hover:bg-[#E8DFD8] px-2 py-0.5 rounded cursor-pointer font-medium"
                  >
                    CHAOMUNG (-15k)
                  </button>
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

                {voucherDiscount > 0 && (
                  <div className="flex justify-between text-emerald-600 font-medium">
                    <span>Mã ưu đãi giảm</span>
                    <span>-{voucherDiscount.toLocaleString('vi-VN')}đ</span>
                  </div>
                )}
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
    </main>
  );
}
