'use client';

import React, { useEffect, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
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

const statusBadgeMap: Record<string, { label: string; className: string }> = {
  PENDING: { label: 'Chờ thanh toán', className: 'bg-yellow-100 text-yellow-800' },
  PAID: { label: 'Đã thanh toán', className: 'bg-green-100 text-green-800' },
  PREPARING: { label: 'Đang pha chế', className: 'bg-blue-100 text-blue-800' },
  READY: { label: 'Sẵn sàng', className: 'bg-purple-100 text-purple-800' },
  COMPLETED: { label: 'Hoàn thành', className: 'bg-gray-200 text-gray-800' },
  PAYMENT_FAILED: { label: 'Thanh toán lỗi', className: 'bg-red-100 text-red-800' },
  CANCELLED: { label: 'Đã hủy', className: 'bg-gray-300 text-gray-600' },
};

export default function OrderConfirmationPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const { token, user, logout } = useAuthStore();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    if (!orderId) return;

    const fetchOrder = async () => {
      try {
        setLoading(true);
        setError(null);
        const res = await fetch(`http://localhost:3001/api/orders/${orderId}`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            logout();
            setError('Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại để xem đơn hàng.');
            return;
          }
          const errData = await res.json().catch(() => ({}));
          throw new Error(errData.message || 'Không thể tải thông tin đơn hàng');
        }

        const data: OrderDetail = await res.json();
        setOrder(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Lỗi khi tải thông tin đơn hàng');
      } finally {
        setLoading(false);
      }
    };

    fetchOrder();
  }, [orderId, token]);

  if (!token) {
    return (
      <main className="min-h-screen bg-[#8d2727] p-8 text-white flex items-center justify-center">
        <div className="bg-white text-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <p className="text-lg font-semibold mb-4">Vui lòng đăng nhập để xem đơn hàng</p>
          <button
            onClick={() => router.push(`/login?redirect=/orders/${orderId}`)}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition"
          >
            Đăng nhập ngay
          </button>
        </div>
      </main>
    );
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-[#8d2727] p-8 text-white flex flex-col items-center justify-center">
        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-lg font-medium">Đang tải thông tin đơn hàng...</p>
      </main>
    );
  }

  if (error || !order) {
    return (
      <main className="min-h-screen bg-[#8d2727] p-8 text-white flex items-center justify-center">
        <div className="bg-white text-gray-800 p-8 rounded-2xl shadow-xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 text-red-600 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            ✕
          </div>
          <h2 className="text-2xl font-bold mb-2">Không tìm thấy đơn hàng</h2>
          <p className="text-gray-600 mb-6">{error || 'Đơn hàng không tồn tại hoặc bạn không có quyền xem.'}</p>
          <div className="space-y-3">
            <Link
              href="/orders"
              className="block w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 rounded-lg transition"
            >
              Lịch sử đơn
            </Link>
            <Link
              href="/"
              className="block w-full bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 rounded-lg transition"
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
    <main className="min-h-screen bg-[#8d2727] py-10 px-4 sm:px-6 lg:px-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header thành công */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg
              className="w-10 h-10"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 mb-2">
            Đặt hàng thành công!
          </h1>
          <p className="text-gray-600 mb-6">
            Cảm ơn bạn đã lựa chọn BrewLite. Đơn hàng của bạn đang được xử lý.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 border-t border-b border-gray-100 py-4 text-left sm:text-center">
            <div>
              <span className="block text-xs uppercase tracking-wider text-gray-500 font-semibold">Mã đơn</span>
              <span className="text-lg font-bold text-gray-800">#{order.id}</span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-gray-500 font-semibold">Trạng thái</span>
              <span
                className={`inline-block px-3 py-1 rounded-full text-xs font-bold mt-1 ${statusConfig.className}`}
              >
                {statusConfig.label}
              </span>
            </div>
            <div>
              <span className="block text-xs uppercase tracking-wider text-gray-500 font-semibold">Thời gian đặt</span>
              <span className="text-sm font-medium text-gray-700 mt-1 inline-block">{formattedDate}</span>
            </div>
          </div>
        </div>

        {/* Chi tiết đơn hàng */}
        <div className="bg-white rounded-2xl p-6 sm:p-8 shadow-xl">
          <h2 className="text-xl font-bold text-gray-900 mb-4 pb-2 border-b">
            Danh sách món
          </h2>

          <div className="divide-y divide-gray-100 mb-6">
            {order.OrderItem && order.OrderItem.length > 0 ? (
              order.OrderItem.map((item) => (
                <div key={item.id} className="py-4 flex justify-between items-center">
                  <div>
                    <h3 className="font-bold text-gray-800">
                      {item.Product?.name || `Sản phẩm #${item.productId}`}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                      <span className="bg-gray-100 px-2 py-0.5 rounded font-medium">Size: {item.size}</span>
                      <span>× {item.qty}</span>
                    </div>

                    {/* Hiển thị Toppings nếu có */}
                    {item.OrderItemTopping && item.OrderItemTopping.length > 0 && (
                      <div className="flex flex-wrap items-center gap-1.5 mt-2">
                        <span className="text-xs text-gray-500 font-medium">Topping:</span>
                        {item.OrderItemTopping.map((oit) => (
                          <span
                            key={oit.toppingId}
                            className="text-xs bg-amber-50 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-md font-medium"
                          >
                            +{oit.Topping?.name || `Topping #${oit.toppingId}`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className="font-bold text-gray-900">
                      {Number(item.lineTotal).toLocaleString('vi-VN')}đ
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <p className="text-gray-500 py-4 text-center">Không có món nào trong đơn</p>
            )}
          </div>

          {/* Thông tin thanh toán */}
          {order.Payment && order.Payment.length > 0 && (
            <div className="bg-gray-50 rounded-xl p-4 mb-6">
              <h3 className="text-sm font-bold text-gray-700 mb-2">Thông tin thanh toán:</h3>
              {order.Payment.map((p) => (
                <div key={p.id} className="flex justify-between text-sm text-gray-600">
                  <span>Phương thức: {p.method === 'WALLET' ? 'Ví điện tử' : p.method === 'CARD' ? 'Thẻ ngân hàng' : p.method}</span>
                  <span className="font-semibold text-green-700">Đã ghi nhận</span>
                </div>
              ))}
            </div>
          )}

          {/* Tổng cộng */}
          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
            <span className="text-lg font-bold text-gray-900">Tổng thanh toán:</span>
            <span className="text-2xl font-extrabold text-blue-600">
              {Number(order.total).toLocaleString('vi-VN')}đ
            </span>
          </div>

          {/* Nút hành động */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
            <Link
              href="/orders"
              className="w-full text-center bg-blue-600 hover:bg-blue-700 text-white font-bold py-3.5 px-4 rounded-xl transition shadow"
            >
              Lịch sử đơn
            </Link>
            <Link
              href="/"
              className="w-full text-center bg-gray-100 hover:bg-gray-200 text-gray-800 font-bold py-3.5 px-4 rounded-xl transition border border-gray-300"
            >
              Về trang chủ
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
