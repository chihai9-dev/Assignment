'use client';
import { API_URL } from '@/services/api';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useCartStore } from '@/store/cartStore';
import { useAuthStore } from '@/store/authStore';
import { CHECKOUT_DURATION_MINUTES } from '@/hooks/useCheckoutTimer';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  CoffeeCupIcon,
  BagIcon,
} from '@/components/Icons';

export default function CartPage() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const {
    items = [],
    checkoutItems = [],
    removeFromCart,
    updateQuantity,
    startCheckout,
    restoreCheckoutToCart,
  } = useCartStore();

  const { user, token } = useAuthStore();
  const [noticeMessage, setNoticeMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isSubmittingRef = useRef(false);
  const isNavigatingRef = useRef(false);

  // Tự động kiểm tra nếu quay về từ PayOS bị hủy hoặc hết hạn đếm ngược
  useEffect(() => {
    // Không can thiệp nếu đang trong tiến trình bấm nút chuyển trang sang /checkout
    if (isNavigatingRef.current) return;

    const status = searchParams.get('status');
    const reason = searchParams.get('reason');

    if (status === 'cancelled' || status === 'restored' || reason === 'timeout' || reason === 'payos_timeout') {
      const store = useCartStore.getState();
      const orderIdParam = searchParams.get('orderId');
      const cancelId = orderIdParam ? Number(orderIdParam) : store.pendingOrderId;

      if (cancelId && token) {
        fetch(`${API_URL}/orders/${cancelId}/cancel`, {
          method: 'PATCH',
          headers: { Authorization: `Bearer ${token}` },
        }).catch((e) => console.error('Lỗi hoàn trả tồn kho PayOS:', e));
      }

      if (typeof restoreCheckoutToCart === 'function') {
        restoreCheckoutToCart();
      } else if (store && typeof store.restoreCheckoutToCart === 'function') {
        store.restoreCheckoutToCart();
      }

      if (reason === 'timeout') {
        setNoticeMessage(
          '⏱️ Đã hết thời gian giữ đơn hàng (5 phút). Các sản phẩm đã được tự động hoàn lại vào giỏ hàng của bạn!'
        );
      } else if (status === 'restored') {
        setNoticeMessage(
          '↩️ Đã hoàn trả món về giỏ hàng thành công.'
        );
      } else {
        setNoticeMessage(
          '⚠️ Quá trình thanh toán qua PayOS đã hết hạn hoặc bị hủy. Các sản phẩm đã được tự động hoàn lại vào giỏ hàng.'
        );
      }
      // Dọn sạch query parameters trên thanh địa chỉ URL
      window.history.replaceState({}, '', '/cart');
    } else if (items.length === 0 && checkoutItems.length > 0) {
      const store = useCartStore.getState();
      const isExpired = !store.checkoutExpiresAt || store.checkoutExpiresAt <= Date.now();

      // Chỉ tự động phục hồi nếu phiên checkout ĐÃ HẾT HẠN
      if (isExpired) {
        const cancelId = store.pendingOrderId;
        if (cancelId && token) {
          fetch(`${API_URL}/orders/${cancelId}/cancel`, {
            method: 'PATCH',
            headers: { Authorization: `Bearer ${token}` },
          }).catch((e) => console.error('Lỗi hoàn trả tồn kho khi hết hạn:', e));
        }

        if (typeof restoreCheckoutToCart === 'function') {
          restoreCheckoutToCart();
        } else if (store && typeof store.restoreCheckoutToCart === 'function') {
          store.restoreCheckoutToCart();
        }
      }
    }
  }, [searchParams, restoreCheckoutToCart, items.length, checkoutItems.length, token]);

  const safeItems = items || [];
  const totalItemsCount = safeItems.reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  const subtotal = safeItems.reduce(
    (sum, item) => sum + Number(item.price || 0) * Number(item.quantity || 0),
    0
  );

  const loyaltyPoints = Number(user?.loyaltyPoints || 0);
  const discountPercent =
    loyaltyPoints >= 100 ? 15 : loyaltyPoints >= 50 ? 10 : loyaltyPoints >= 20 ? 5 : 0;
  const membershipTier =
    loyaltyPoints >= 100
      ? 'Kim Cương'
      : loyaltyPoints >= 50
      ? 'Vàng'
      : loyaltyPoints >= 20
      ? 'Bạc'
      : 'Đồng';

  const discount = Math.round((subtotal * discountPercent) / 100);
  const grandTotal = Math.max(0, subtotal - discount);

  // Khi bấm nút Thanh toán: gọi API tạo đơn giữ kho (trừ stock trong DB), chuyển món sang checkoutItems và sang /checkout
  const handleProceedToCheckout = async () => {
    if (safeItems.length === 0 || isSubmitting || isSubmittingRef.current || isNavigatingRef.current) return;

    if (!token) {
      alert('Vui lòng đăng nhập để thanh toán đơn hàng!');
      router.push('/login?redirect=/cart');
      return;
    }

    try {
      isSubmittingRef.current = true;
      setIsSubmitting(true);
      // Gọi API POST /api/orders: Backend tự động kiểm tra tồn kho & trừ stock ngay trong DB
      const orderResponse = await fetch(`${API_URL}/orders`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          items: safeItems.map((item) => ({
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
        throw new Error(
          Array.isArray(orderData.message)
            ? orderData.message.join(', ')
            : orderData.message || 'Không thể tạo đơn hàng giữ kho'
        );
      }

      const orderId = Number(orderData.orderId);

      // Đánh dấu đang điều hướng sang checkout để tránh bị useEffect tự hủy đơn
      isNavigatingRef.current = true;

      const store = useCartStore.getState();
      if (typeof startCheckout === 'function') {
        startCheckout(CHECKOUT_DURATION_MINUTES, orderId);
      } else if (store && typeof store.startCheckout === 'function') {
        store.startCheckout(CHECKOUT_DURATION_MINUTES, orderId);
      }

      router.push('/checkout');
    } catch (err: any) {
      isNavigatingRef.current = false;
      isSubmittingRef.current = false;
      setIsSubmitting(false);
      alert(err.message || 'Có lỗi xảy ra khi kiểm tra tồn kho.');
    }
  };

  if (safeItems.length === 0) {
    const hasActiveCheckout = checkoutItems.length > 0;
    return (
      <main className="min-h-screen bg-[#FBF8F2] py-16 px-4 text-center flex items-center justify-center">
        <div className="bg-white border border-[#E8DFD8] rounded-3xl p-8 sm:p-12 max-w-md w-full shadow-sm space-y-5">
          {noticeMessage && (
            <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl text-xs sm:text-sm text-amber-900 text-left font-medium leading-relaxed">
              {noticeMessage}
            </div>
          )}

          {hasActiveCheckout ? (
            <>
              <div className="w-16 h-16 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center mx-auto text-3xl">
                ⏱️
              </div>
              <h1 className="text-2xl font-extrabold text-[#3E2723]">
                Đơn hàng đang chờ thanh toán
              </h1>
              <p className="text-sm text-[#756C65]">
                Món của bạn đang được giữ ở trang thanh toán (giữ kho 5 phút).
              </p>
              <div className="pt-2 flex flex-col gap-2.5">
                <Link
                  href="/checkout"
                  className="w-full inline-flex items-center justify-center gap-2 bg-[#763A1E] hover:bg-[#5C2D17] text-white font-bold px-6 py-3.5 rounded-xl transition shadow-md text-sm"
                >
                  <span>Tiếp tục thanh toán</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => {
                    const store = useCartStore.getState();
                    if (store.pendingOrderId && token) {
                      fetch(`${API_URL}/orders/${store.pendingOrderId}/cancel`, {
                        method: 'PATCH',
                        headers: { Authorization: `Bearer ${token}` },
                      }).catch(() => {});
                    }
                    if (typeof restoreCheckoutToCart === 'function') {
                      restoreCheckoutToCart();
                    } else if (store && typeof store.restoreCheckoutToCart === 'function') {
                      store.restoreCheckoutToCart();
                    }
                  }}
                  className="w-full text-xs text-[#8D6E63] hover:text-[#3E2723] font-semibold py-2 cursor-pointer"
                >
                  ↩️ Hủy giữ món & hoàn về giỏ hàng
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="w-16 h-16 rounded-full bg-[#F5F0E6] text-[#8D6E63] flex items-center justify-center mx-auto">
                <BagIcon className="w-8 h-8" />
              </div>
              <h1 className="text-2xl font-extrabold text-[#3E2723]">
                Giỏ hàng của bạn đang trống
              </h1>
              <p className="text-sm text-[#756C65]">
                Hãy khám phá thực đơn cà phê và đồ uống đặc biệt của BrewLite để thêm món yêu thích nhé!
              </p>
              <div className="pt-2">
                <Link
                  href="/#menu"
                  className="inline-flex items-center gap-2 bg-[#3E2723] hover:bg-[#2E1C12] text-white font-bold px-6 py-3 rounded-xl transition shadow-md shadow-[#3E2723]/20 text-sm"
                >
                  <span>Khám phá Menu ngay</span>
                  <ArrowRightIcon className="w-4 h-4" />
                </Link>
              </div>
            </>
          )}
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FBF8F2] py-8 px-4 sm:px-6 lg:px-8 text-[#1F1F1F]">
      <div className="max-w-6xl mx-auto space-y-6">

        {/* Thông báo trả hàng về giỏ khi hết thời gian hoặc hủy */}
        {noticeMessage && (
          <div className="p-4 bg-amber-50 border border-amber-200 rounded-2xl flex items-start justify-between gap-3 text-amber-900 shadow-sm animate-fade-in">
            <div className="flex items-center gap-2.5 text-sm font-medium">
              <span className="text-xl">⚠️</span>
              <span>{noticeMessage}</span>
            </div>
            <button
              onClick={() => setNoticeMessage(null)}
              className="text-amber-700 hover:text-amber-950 font-bold text-sm px-2 py-0.5 rounded cursor-pointer"
            >
              ✕
            </button>
          </div>
        )}

        {/* Nút quay lại & Tiêu đề Giỏ hàng */}
        <div className="space-y-2">
          <Link
            href="/#menu"
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#8D6E63] hover:text-[#3E2723] transition-colors group"
          >
            <ArrowLeftIcon className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Tiếp tục chọn món</span>
          </Link>

          <h1 className="text-3xl font-extrabold text-[#3E2723] tracking-tight">
            Giỏ hàng ({totalItemsCount})
          </h1>
        </div>

        {/* Layout 2 cột: Danh sách món (Trái) & Tóm tắt đơn hàng (Phải) */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          
          {/* CỘT TRÁI: DANH SÁCH MÓN TRONG GIỎ */}
          <div className="lg:col-span-7 xl:col-span-8 space-y-4">
            {safeItems.map((item) => {
              const itemTotal = Number(item.price) * Number(item.quantity);
              return (
                <div
                  key={item.cartItemId}
                  className="bg-white border border-[#E8DFD8] rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-xl overflow-hidden bg-[#F5F0E6] flex-shrink-0 flex items-center justify-center">
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <CoffeeCupIcon className="w-8 h-8 text-[#8D6E63]" />
                      )}
                    </div>

                    <div className="space-y-1 min-w-0">
                      <h3 className="font-bold text-base sm:text-lg text-[#3E2723] truncate">
                        {item.name}
                      </h3>
                      <div className="flex flex-wrap gap-1.5 text-xs text-[#756C65]">
                        <span className="bg-[#F5F0E6] px-2 py-0.5 rounded-md font-medium">
                          Size {item.size}
                        </span>
                        {item.toppings && item.toppings.length > 0 && (
                          <span className="bg-[#F5F0E6] px-2 py-0.5 rounded-md">
                            +{item.toppings.join(', ')}
                          </span>
                        )}
                      </div>
                      <p className="font-extrabold text-sm sm:text-base text-[#8D6E63]">
                        {Number(item.price).toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-end sm:items-center gap-3 sm:gap-6 flex-shrink-0">
                    {/* Bộ tăng giảm số lượng */}
                    <div className="flex items-center border border-[#E8DFD8] rounded-xl bg-[#FDFBF7] p-1 shadow-inner">
                      <button
                        type="button"
                        onClick={() =>
                          item.quantity > 1
                            ? updateQuantity(item.cartItemId, item.quantity - 1)
                            : removeFromCart(item.cartItemId)
                        }
                        className="w-7 h-7 flex items-center justify-center text-[#8D6E63] hover:bg-white hover:text-[#3E2723] rounded-lg transition cursor-pointer"
                      >
                        <MinusIcon className="w-3.5 h-3.5" />
                      </button>
                      <span className="w-8 text-center text-sm font-bold text-[#3E2723]">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center text-[#8D6E63] hover:bg-white hover:text-[#3E2723] rounded-lg transition cursor-pointer"
                      >
                        <PlusIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    <div className="text-right min-w-[80px]">
                      <div className="font-black text-sm sm:text-base text-[#3E2723]">
                        {itemTotal.toLocaleString('vi-VN')}đ
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={() => removeFromCart(item.cartItemId)}
                      className="text-[#BCAAA4] hover:text-red-600 transition-colors p-1 cursor-pointer"
                      title="Xóa món"
                    >
                      <TrashIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CỘT PHẢI: TÓM TẮT ĐƠN HÀNG */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-6">
            <div className="bg-white border border-[#E8DFD8] rounded-3xl p-6 shadow-sm space-y-5">
              <h2 className="text-lg font-bold text-[#3E2723] pb-3 border-b border-[#E8DFD8]">
                Tóm tắt đơn hàng
              </h2>

              <div className="space-y-3 text-sm">
                <div className="flex justify-between text-[#5C4D44]">
                  <span>Tổng tiền ({totalItemsCount} sản phẩm)</span>
                  <span className="font-bold text-[#2E1810]">
                    {subtotal.toLocaleString('vi-VN')}đ
                  </span>
                </div>

                <div className="flex justify-between text-[#5C4D44]">
                  <span>
                    Giảm giá {user ? `(Hạng ${membershipTier} -${discountPercent}%)` : ''}
                  </span>
                  <span className="font-semibold text-emerald-600">
                    {discount > 0 ? `-${discount.toLocaleString('vi-VN')}đ` : '0đ'}
                  </span>
                </div>
              </div>

              {!user && (
                <p className="text-[11px] text-[#8D6E63] bg-[#FDFBF7] p-2.5 rounded-xl border border-[#E8DFD8] leading-relaxed">
                  💡 <strong>Đăng nhập</strong> để tự động nhận ưu đãi giảm giá theo điểm tích lũy thành viên (lên đến 15%).
                </p>
              )}

              <hr className="border-[#E8DFD8]" />

              <div className="flex justify-between items-baseline">
                <span className="font-bold text-base text-[#3E2723]">
                  Tổng cộng
                </span>
                <span className="font-extrabold text-2xl text-[#3E2723]">
                  {grandTotal.toLocaleString('vi-VN')}đ
                </span>
              </div>

              {/* Nút thanh toán */}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={handleProceedToCheckout}
                className="w-full bg-[#3E2723] hover:bg-[#2E1C12] disabled:opacity-60 disabled:pointer-events-none text-white font-bold py-3.5 px-4 rounded-xl transition shadow-md shadow-[#3E2723]/20 hover:-translate-y-0.5 active:translate-y-0 text-center flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>{isSubmitting ? 'Đang kiểm tra tồn kho...' : 'Thanh toán'}</span>
                <ArrowRightIcon className="w-4 h-4" />
              </button>

              <Link
                href="/#menu"
                className="block text-center text-xs font-semibold text-[#8D6E63] hover:text-[#3E2723] hover:underline"
              >
                Tiếp tục mua sắm
              </Link>
            </div>
          </div>

        </div>

      </div>
    </main>
  );
}
