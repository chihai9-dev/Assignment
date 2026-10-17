'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/store/authStore';

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

interface OrderSummary {
  id: string | number;
  userId: string | number;
  status: string;
  total: string | number;
  createdAt: string;
  OrderItem?: OrderItem[];
}

const statusBadgeMap: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Chờ thanh toán', className: 'bg-yellow-100 text-yellow-800' },
  PAID: { label: 'Đã thanh toán', className: 'bg-green-100 text-green-800' },
  PREPARING: { label: 'Đang pha chế', className: 'bg-blue-100 text-blue-800' },
  READY: { label: 'Sẵn sàng', className: 'bg-purple-100 text-purple-800' },
  COMPLETED: { label: 'Hoàn thành', className: 'bg-gray-200 text-gray-800' },
  PAYMENT_FAILED: { label: 'Thanh toán lỗi', className: 'bg-red-100 text-red-800' },
  CANCELLED: { label: 'Đã hủy', className: 'bg-gray-300 text-gray-600' },
};

export default function OrderHistoryPage() {
  const router = useRouter();
  const { token, user, logout } = useAuthStore();
  const [orders, setOrders] = useState<OrderSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    const fetchOrders = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch('http://localhost:3001/api/orders/me', {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            logout();
            setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để xem lịch sử đơn hàng.');
            return;
          }
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Không thể tải lịch sử đơn hàng');
        }

        const data: OrderSummary[] = await res.json();
        setOrders(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi khi tải lịch sử đơn hàng');
      } finally {
        setLoading(false);
      }
    };

    fetchOrders();
  }, [token, logout]);

  // Chưa đăng nhập
  if (!token) {
    return (
      <main className="min-h-screen bg-[#8d2727] p-8 text-white flex items-center justify-center">
        <div className="bg-white text-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl">
            🔒
          </div>
          <h2 className="text-2xl font-bold mb-2">Đăng nhập tài khoản</h2>
          <p className="text-gray-600 mb-6">
            Vui lòng đăng nhập để xem lịch sử đơn hàng của bạn.
          </p>
          <button
            onClick={() => router.push('/login?redirect=/orders')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
          >
            Đăng nhập ngay
          </button>
        </div>
      </main>
    );
  }

  // Đang tải
  if (loading) {
    return (
      <main className="min-h-screen bg-[#8d2727] p-8 text-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-lg font-medium">Đang tải danh sách đơn hàng...</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#8d2727] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-white">
          <div>
            <h1 className="text-3xl font-extrabold tracking-tight">Lịch sử đơn hàng</h1>
            <p className="text-white/80 mt-1 text-sm">
              Xem lại tất cả các đơn hàng bạn đã đặt tại BrewLite
            </p>
          </div>
          <Link
            href="/"
            className="self-start sm:self-auto bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-semibold backdrop-blur transition"
          >
            ← Về trang chủ
          </Link>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-300 text-red-800 p-5 rounded-2xl text-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow">
            <span className="font-medium">{error}</span>
            <button
              onClick={() => router.push('/login?redirect=/orders')}
              className="bg-red-600 hover:bg-red-700 text-white font-semibold px-4 py-2 rounded-lg text-xs transition whitespace-nowrap self-start sm:self-auto"
            >
              Đăng nhập lại ngay
            </button>
          </div>
        )}

        {/* Empty state */}
        {!error && orders.length === 0 && (
          <div className="bg-white rounded-2xl p-12 text-center shadow-xl">
            <div className="w-20 h-20 bg-gray-100 text-gray-400 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              ☕
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2">Chưa có đơn hàng nào</h2>
            <p className="text-gray-500 max-w-sm mx-auto mb-6">
              Bạn chưa thực hiện đơn đặt hàng nào. Hãy khám phá thực đơn cà phê thơm ngon của chúng tôi!
            </p>
            <Link
              href="/"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold px-6 py-3 rounded-xl transition shadow"
            >
              Khám phá thực đơn
            </Link>
          </div>
        )}

        {/* Danh sách đơn hàng */}
        {orders.length > 0 && (
          <div className="space-y-4">
            {orders.map((order) => {
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
                <div
                  key={order.id}
                  onClick={() => router.push(`/orders/${order.id}`)}
                  className="bg-white rounded-2xl p-6 shadow-md hover:shadow-xl transition cursor-pointer border border-transparent hover:border-blue-400 group"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-gray-100 gap-2">
                    <div className="flex items-center gap-3">
                      <span className="font-extrabold text-lg text-gray-900">
                        Đơn #{order.id}
                      </span>
                      <span
                        className={`px-3 py-1 rounded-full text-xs font-bold ${statusConfig.className}`}
                      >
                        {statusConfig.label}
                      </span>
                    </div>
                    <span className="text-xs text-gray-500 font-medium">{formattedDate}</span>
                  </div>

                  {/* Tóm tắt các món */}
                  <div className="py-4">
                    <div className="text-sm text-gray-700 space-y-1">
                      {order.OrderItem && order.OrderItem.length > 0 ? (
                        order.OrderItem.map((item) => (
                          <div key={item.id} className="py-1">
                            <div className="flex justify-between items-center text-sm">
                              <span className="font-medium text-gray-800">
                                {item.Product?.name || `Món #${item.productId}`}
                                <span className="text-gray-500 text-xs ml-2 font-normal">
                                  (Size {item.size} × {item.qty})
                                </span>
                              </span>
                              <span className="text-gray-600 font-semibold">
                                {Number(item.lineTotal).toLocaleString('vi-VN')}đ
                              </span>
                            </div>
                            {item.OrderItemTopping && item.OrderItemTopping.length > 0 && (
                              <div className="text-xs text-amber-700 flex flex-wrap gap-1 mt-0.5">
                                <span>Topping:</span>
                                {item.OrderItemTopping.map((oit) => (
                                  <span key={oit.toppingId} className="bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                                    +{oit.Topping?.name || `Topping #${oit.toppingId}`}
                                  </span>
                                ))}
                              </div>
                            )}
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-400 text-xs italic">Không có chi tiết sản phẩm</p>
                      )}
                    </div>
                  </div>

                  {/* Tổng tiền & Link xem chi tiết */}
                  <div className="flex justify-between items-center pt-3 border-t border-gray-100">
                    <div className="text-sm">
                      <span className="text-gray-500 mr-2">Tổng tiền:</span>
                      <span className="text-lg font-extrabold text-blue-600">
                        {Number(order.total).toLocaleString('vi-VN')}đ
                      </span>
                    </div>

                    <span className="text-sm font-semibold text-blue-600 group-hover:text-blue-800 flex items-center gap-1 transition">
                      Xem chi tiết <span className="group-hover:translate-x-1 transition-transform">→</span>
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </main>
  );
}
