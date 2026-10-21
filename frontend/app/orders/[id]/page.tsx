'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '../../../store/authStore';
import {
  CheckCircleIcon,
  ArrowRightIcon,
  CoffeeCupIcon,
  CoffeeBeanIcon
} from '../../components/Icons';

interface OrderItemTopping {
  toppingId: number;
  priceAtTime: number;
  Topping?: {
    id: number;
    name: string;
    price: number;
  };
}

interface OrderItem {
  id: string | number;
  productId: string | number;
  size: string;
  qty: number;
  lineTotal: string | number;
  Product?: {
    id: string | number;
    name: string;
    imageUrl?: string | null;
  };
  OrderItemTopping?: OrderItemTopping[];
}

interface Payment {
  id: string | number;
  amount: string | number;
  method: string;
  idempotencyKey?: string;
}

interface OrderDetail {
  id: string | number;
  userId: string | number;
  status: string;
  total: string | number;
  createdAt: string;
  updatedAt: string;
  OrderItem?: OrderItem[];
  Payment?: Payment[];
}

// Bảng màu trạng thái chuẩn
const statusBadgeMap: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Chờ thanh toán', className: 'bg-amber-100 text-amber-800' },
  PAID: { label: 'Đã thanh toán - Đang pha chế', className: 'bg-emerald-100 text-emerald-800' },
  PREPARING: { label: 'Đang pha chế', className: 'bg-blue-100 text-blue-800' },
  READY: { label: 'Sẵn sàng nhận tại quầy', className: 'bg-purple-100 text-purple-800' },
  COMPLETED: { label: 'Hoàn thành', className: 'bg-gray-100 text-gray-800' },
  PAYMENT_FAILED: { label: 'Thanh toán lỗi', className: 'bg-red-100 text-red-800' },
  CANCELLED: { label: 'Đã hủy', className: 'bg-gray-200 text-gray-600' },
};

// Các trạng thái chưa thanh toán -> cần polling
const PENDING_STATUSES = ['PENDING'];

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const { token, logout } = useAuthStore();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isConfirming, setIsConfirming] = useState(false);
  const [confirmMessage, setConfirmMessage] = useState<string | null>(null);

  const fetchOrder = useCallback(async () => {
    if (!token || !orderId) return null;

    try {
      const res = await fetch(`http://localhost:3001/api/orders/${orderId}`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        if (res.status === 401) {
          logout();
          setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để xem đơn hàng.');
          return null;
        }
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Không thể tải thông tin đơn hàng');
      }

      const data: OrderDetail = await res.json();
      setOrder(data);
      return data;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải thông tin đơn hàng');
      return null;
    }
  }, [orderId, token, logout]);

  // Tải đơn hàng lần đầu
  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }
    if (!orderId) return;

    setLoading(true);
    fetchOrder().finally(() => setLoading(false));
  }, [orderId, token, fetchOrder]);

  // Polling tự động mỗi 3 giây khi đơn ở trạng thái PENDING
  useEffect(() => {
    if (!order || !PENDING_STATUSES.includes(order.status)) return;

    const interval = setInterval(async () => {
      const updated = await fetchOrder();
      if (updated && !PENDING_STATUSES.includes(updated.status)) {
        clearInterval(interval);
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [order?.status, fetchOrder]);

  // Xác nhận thanh toán thủ công (cho trường hợp webhook không gửi được)
  const handleManualConfirm = async () => {
    if (!token || !order) return;
    setIsConfirming(true);
    setConfirmMessage(null);

    try {
      const res = await fetch(`http://localhost:3001/api/payments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          orderId: Number(order.id),
          amount: Number(order.total),
          method: 'WALLET',
          idempotencyKey: `manual-confirm-${order.id}-${Date.now()}`,
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setConfirmMessage('✅ Xác nhận thanh toán thành công! Đơn hàng đang được chuẩn bị.');
        await fetchOrder();
      } else {
        setConfirmMessage(`⚠️ ${data.message || 'Không thể xác nhận. Vui lòng thử lại.'}`);
      }
    } catch {
      setConfirmMessage('⚠️ Có lỗi xảy ra. Vui lòng thử lại.');
    } finally {
      setIsConfirming(false);
    }
  };

  if (!token) {
    return (
      <main className="min-h-screen bg-[#FBF8F2] p-8 flex items-center justify-center">
        <div className="bg-white border border-[#E8DFD8] text-gray-800 p-8 rounded-3xl shadow-sm max-w-md w-full text-center space-y-4">
          <p className="text-base font-semibold text-[#3E2723]">
            Vui lòng đăng nhập để xem thông tin đơn hàng
          </p>
          <button
            onClick={() => router.push(`/login?redirect=/orders/${orderId}`)}
            className="w-full bg-[#3E2723] hover:bg-[#2E1C12] text-white font-bold py-3 rounded-xl transition text-sm cursor-pointer"
          >
            Đăng nhập ngay
          </button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#FBF8F2] p-8 flex flex-col items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#8D6E63] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-sm font-medium text-[#756C65]">Đang tải thông tin đơn hàng...</p>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-[#FBF8F2] p-8 flex items-center justify-center">
        <div className="bg-white border border-[#E8DFD8] text-gray-800 p-8 rounded-3xl shadow-sm max-w-md w-full text-center space-y-4">
          <div className="w-14 h-14 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto text-xl font-bold">
            ✕
          </div>
          <h2 className="text-xl font-extrabold text-[#3E2723]">Không tìm thấy đơn hàng</h2>
          <p className="text-xs text-gray-500">{error || 'Đơn hàng không tồn tại hoặc bạn không có quyền xem.'}</p>
          <div className="space-y-2 pt-2">
            <Link
              href="/orders"
              className="block w-full bg-[#3E2723] hover:bg-[#2E1C12] text-white font-bold py-2.5 rounded-xl transition text-xs"
            >
              Lịch sử đơn
            </Link>
            <Link
              href="/"
              className="block w-full bg-[#FDFBF7] hover:bg-[#F5F0E6] text-[#5C4D44] font-semibold py-2.5 rounded-xl transition border border-[#E8DFD8] text-xs"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const statusConfig = statusBadgeMap[order.status] || {
    label: order.status,
    className: 'bg-gray-100 text-gray-800',
  };

  const formattedDate = new Date(order.createdAt).toLocaleString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <main className="min-h-screen bg-[#FBF8F2] py-10 px-4 sm:px-6 lg:px-8 text-[#1F1F1F]">
      <div className="max-w-4xl mx-auto space-y-8">
        
        {/* =========================================================
            CARD ĐẶT HÀNG THÀNH CÔNG (Theo Mockup 7. Đặt hàng thành công!)
        ========================================================= */}
        <div className="bg-white border border-[#E8DFD8] rounded-3xl p-6 sm:p-10 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8 items-center">
          
          {/* CỘT TRÁI: HÌNH ẢNH LY CÀ PHÊ NHƯ MOCKUP */}
          <div className="md:col-span-5 flex justify-center">
            <div className="relative w-64 h-72 sm:w-72 sm:h-80 rounded-2xl overflow-hidden shadow-lg border-2 border-[#E8DFD8] bg-[#F5F0E6]">
              <img
                src="https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=600&auto=format&fit=crop&q=85"
                alt="BrewLite Success"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent flex items-end p-4">
                <span className="text-xs font-semibold text-white/90">
                  Cảm ơn bạn đã lựa chọn BrewLite ☕
                </span>
              </div>
            </div>
          </div>

          {/* CỘT PHẢI: ICON CHECKMARK, TIÊU ĐỀ & THÔNG TIN ĐƠN */}
          <div className="md:col-span-7 space-y-6">
            
            {/* Checkmark icon & Title */}
            <div className="space-y-2">
              <div className="w-14 h-14 rounded-full bg-[#D7A86E] text-[#3E2723] flex items-center justify-center shadow-md">
                <svg className="w-8 h-8 text-[#2E1810]" fill="none" stroke="currentColor" strokeWidth="3" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              </div>

              <h1 className="text-2xl sm:text-3xl font-extrabold text-[#3E2723] tracking-tight pt-2">
                Đặt hàng thành công!
              </h1>
              <p className="text-xs sm:text-sm text-[#756C65] leading-relaxed">
                Cảm ơn bạn đã lựa chọn BrewLite. Chúng tôi sẽ sớm chuẩn bị đơn hàng của bạn.
              </p>
            </div>

            {/* Thông tin đơn tóm tắt (Mã đơn hàng, Thời gian, Tổng tiền) */}
            <div className="bg-[#FDFBF7] border border-[#E8DFD8] rounded-2xl p-4 sm:p-5 space-y-3 text-xs sm:text-sm">
              <div className="flex justify-between items-center py-1">
                <span className="text-[#756C65] font-medium">Mã đơn hàng:</span>
                <span className="font-extrabold text-[#3E2723] text-sm">
                  #BL{String(order.id).padStart(8, '0')}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-[#756C65] font-medium">Thời gian:</span>
                <span className="font-semibold text-[#2E1810]">
                  {formattedDate}
                </span>
              </div>

              <div className="flex justify-between items-center py-1">
                <span className="text-[#756C65] font-medium">Trạng thái:</span>
                <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${statusConfig.className}`}>
                  {statusConfig.label}
                </span>
              </div>

              {/* Polling indicator khi đang chờ thanh toán */}
              {PENDING_STATUSES.includes(order.status) && (
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 space-y-3">
                  <div className="flex items-center gap-2 text-amber-700 text-xs">
                    <div className="w-3 h-3 border-2 border-amber-500 border-t-transparent rounded-full animate-spin shrink-0" />
                    <span className="font-medium">Đang chờ xác nhận thanh toán từ ngân hàng...</span>
                  </div>
                  <p className="text-[11px] text-amber-600">
                    Nếu bạn đã chuyển khoản xong nhưng trạng thái chưa cập nhật, bấm nút bên dưới để xác nhận thủ công.
                  </p>
                  {confirmMessage && (
                    <p className="text-xs font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                      {confirmMessage}
                    </p>
                  )}
                  <button
                    onClick={handleManualConfirm}
                    disabled={isConfirming}
                    className="w-full bg-amber-600 hover:bg-amber-700 disabled:opacity-50 text-white font-bold py-2 px-4 rounded-lg text-xs transition cursor-pointer"
                  >
                    {isConfirming ? 'Đang xác nhận...' : '✅ Tôi đã chuyển khoản - Xác nhận thanh toán'}
                  </button>
                </div>
              )}

              <hr className="border-[#E8DFD8]" />

              {Number(order.total) >= 10000 && (
                <div className="flex justify-between items-center px-2.5 py-1.5 bg-emerald-50 rounded-xl border border-emerald-200 text-xs text-emerald-800">
                  <span className="font-medium">Điểm thưởng tích lũy:</span>
                  <span className="font-extrabold">+{Math.floor(Number(order.total) / 10000)} điểm</span>
                </div>
              )}
              <div className="flex justify-between items-baseline pt-1">
                <span className="font-bold text-sm text-[#3E2723]">Tổng tiền:</span>
                <span className="font-extrabold text-xl text-[#3E2723]">
                  {Number(order.total).toLocaleString('vi-VN')}đ
                </span>
              </div>
            </div>

            {/* Hai nút hành động chuẩn Mockup */}
            <div className="flex flex-col sm:flex-row gap-3 pt-2">
              <Link
                href="/orders"
                className="flex-1 bg-[#3E2723] hover:bg-[#2E1C12] text-white font-bold py-3 px-4 rounded-xl text-center text-xs sm:text-sm transition shadow-md shadow-[#3E2723]/20 cursor-pointer"
              >
                Xem đơn hàng
              </Link>
              <Link
                href="/"
                className="flex-1 bg-white hover:bg-[#F5F0E6] text-[#3E2723] font-bold py-3 px-4 rounded-xl text-center text-xs sm:text-sm transition border border-[#E8DFD8] cursor-pointer"
              >
                Về trang chủ
              </Link>
            </div>

          </div>

        </div>

        {/* =========================================================
            CHI TIẾT DANH SÁCH MÓN ĐÃ ĐẶT
        ========================================================= */}
        <div className="bg-white border border-[#E8DFD8] rounded-3xl p-6 sm:p-8 shadow-sm space-y-4">
          <h2 className="font-extrabold text-lg text-[#3E2723] pb-3 border-b border-gray-100">
            Chi tiết món đã đặt
          </h2>

          <div className="divide-y divide-gray-100">
            {order.OrderItem && order.OrderItem.length > 0 ? (
              order.OrderItem.map((item) => (
                <div key={item.id} className="py-3.5 flex justify-between items-center gap-4 text-xs sm:text-sm">
                  <div>
                    <h3 className="font-bold text-[#2E1810]">
                      {item.Product?.name || `Sản phẩm #${item.productId}`}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-[#756C65] mt-1">
                      <span className="bg-[#F5F0E6] text-[#5C4D44] font-semibold px-2 py-0.5 rounded">
                        Size {item.size}
                      </span>
                      <span>× {item.qty}</span>
                    </div>

                    {item.OrderItemTopping && item.OrderItemTopping.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-1.5">
                        <span className="text-[11px] text-[#8D6E63] font-medium">Topping:</span>
                        {item.OrderItemTopping.map((oit) => (
                          <span
                            key={oit.toppingId}
                            className="text-[11px] bg-[#FDFBF7] text-[#8D6E63] border border-[#E8DFD8] px-2 py-0.5 rounded font-medium"
                          >
                            +{oit.Topping?.name || `Topping #${oit.toppingId}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>

                  <div className="text-right font-extrabold text-[#3E2723]">
                    {Number(item.lineTotal).toLocaleString('vi-VN')}đ
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-400 text-xs py-4 text-center">Không có chi tiết sản phẩm</p>
            )}
          </div>
        </div>

      </div>
    </main>
  );
}
