'use client';

import React, { useEffect, useState, useCallback } from 'react';
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
  };
  OrderItemTopping?: OrderItemTopping[];
}

interface BaristaOrder {
  id: string | number;
  userId: string | number;
  status: 'PAID' | 'PREPARING' | 'READY' | 'COMPLETED' | string;
  total: string | number;
  createdAt: string;
  OrderItem?: OrderItem[];
  User?: {
    id: string | number;
    email: string;
  };
}

const statusBadgeMap: Record<string, { label: string; badgeClass: string; borderClass: string }> = {
  PAID: {
    label: 'Chờ pha chế (Đã thanh toán)',
    badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40',
    borderClass: 'border-emerald-500/30',
  },
  PREPARING: {
    label: 'Đang pha chế',
    badgeClass: 'bg-amber-500/20 text-amber-300 border border-amber-500/40',
    borderClass: 'border-amber-500/30',
  },
  READY: {
    label: 'Sẵn sàng giao',
    badgeClass: 'bg-purple-500/20 text-purple-300 border border-purple-500/40',
    borderClass: 'border-purple-500/30',
  },
  COMPLETED: {
    label: 'Đã hoàn thành',
    badgeClass: 'bg-gray-500/20 text-gray-300 border border-gray-500/40',
    borderClass: 'border-gray-500/30',
  },
};

export default function BaristaDashboardPage() {
  const router = useRouter();
  const { token, user } = useAuthStore();
  const [orders, setOrders] = useState<BaristaOrder[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | number | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [filterStatus, setFilterStatus] = useState<string>('ALL');

  const fetchQueue = useCallback(async (isSilent = false) => {
    if (!token) {
      setLoading(false);
      return;
    }

    try {
      if (!isSilent) setLoading(true);
      setError(null);
      const res = await fetch('http://localhost:3001/api/orders/barista/queue', {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Không thể tải hàng đợi pha chế');
      }

      const data: BaristaOrder[] = await res.json();
      setOrders(data);
      setLastUpdated(new Date());
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Lỗi khi tải danh sách đơn');
    } finally {
      if (!isSilent) setLoading(false);
    }
  }, [token]);

  // Initial load
  useEffect(() => {
    fetchQueue(false);
  }, [fetchQueue]);

  // Auto-refresh every 10 seconds
  useEffect(() => {
    if (!token) return;

    const intervalId = setInterval(() => {
      fetchQueue(true);
    }, 10000);

    return () => clearInterval(intervalId);
  }, [token, fetchQueue]);

  // Handle status transitions
  const handleUpdateStatus = async (
    orderId: string | number,
    action: 'prepare' | 'ready' | 'complete'
  ) => {
    if (!token) return;
    try {
      setUpdatingId(orderId);
      const res = await fetch(
        `http://localhost:3001/api/orders/barista/${orderId}/${action}`,
        {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.message || 'Cập nhật trạng thái thất bại');
      }

      // Re-fetch queue silently to update UI
      await fetchQueue(true);
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Có lỗi khi cập nhật');
    } finally {
      setUpdatingId(null);
    }
  };

  if (!token) {
    return (
      <main className="min-h-screen bg-[#1a1a2e] p-8 text-white flex items-center justify-center">
        <div className="bg-[#16213e] border border-gray-700 text-white p-8 rounded-2xl shadow-2xl max-w-md w-full text-center">
          <div className="w-16 h-16 bg-blue-900/50 text-blue-400 rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold">
            ☕
          </div>
          <h2 className="text-2xl font-bold mb-2">Barista Dashboard</h2>
          <p className="text-gray-400 mb-6">
            Vui lòng đăng nhập với tài khoản nhân viên / quản lý để truy cập màn hình pha chế.
          </p>
          <button
            onClick={() => router.push('/login?redirect=/barista')}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-xl transition"
          >
            Đăng nhập
          </button>
        </div>
      </main>
    );
  }

  const filteredOrders = orders.filter((o) => {
    if (filterStatus === 'ALL') return true;
    return o.status === filterStatus;
  });

  const paidCount = orders.filter((o) => o.status === 'PAID').length;
  const preparingCount = orders.filter((o) => o.status === 'PREPARING').length;
  const readyCount = orders.filter((o) => o.status === 'READY').length;

  return (
    <main className="min-h-screen bg-[#1a1a2e] text-white py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-gray-800 gap-4">
          <div>
            <div className="flex items-center gap-3">
              <span className="text-3xl">☕</span>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
                Barista Dashboard - Quản lý đơn hàng
              </h1>
            </div>
            <p className="text-gray-400 text-sm mt-1">
              Hàng đợi pha chế thời gian thực • Tự động làm mới mỗi 10 giây (Lần cuối:{' '}
              {lastUpdated.toLocaleTimeString('vi-VN')})
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => fetchQueue(false)}
              disabled={loading}
              className="bg-[#0f3460] hover:bg-[#16213e] text-blue-300 border border-blue-500/30 px-4 py-2 rounded-xl text-sm font-semibold transition flex items-center gap-2 disabled:opacity-50"
            >
              <svg
                className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
              Làm mới
            </button>
            <Link
              href="/"
              className="bg-gray-800 hover:bg-gray-700 text-gray-300 px-4 py-2 rounded-xl text-sm font-semibold transition"
            >
              Về Menu
            </Link>
          </div>
        </div>

        {/* Status Counters & Tabs */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <button
            onClick={() => setFilterStatus('ALL')}
            className={`p-4 rounded-xl border text-left transition ${
              filterStatus === 'ALL'
                ? 'bg-[#0f3460] border-blue-500 text-white shadow-lg'
                : 'bg-[#16213e]/70 border-gray-800 text-gray-300 hover:bg-[#16213e]'
            }`}
          >
            <div className="text-xs uppercase font-bold text-gray-400 tracking-wider">Tất cả trong hàng</div>
            <div className="text-2xl font-black mt-1">{orders.length}</div>
          </button>

          <button
            onClick={() => setFilterStatus('PAID')}
            className={`p-4 rounded-xl border text-left transition ${
              filterStatus === 'PAID'
                ? 'bg-emerald-950/60 border-emerald-500 text-white shadow-lg'
                : 'bg-[#16213e]/70 border-gray-800 text-emerald-400 hover:bg-[#16213e]'
            }`}
          >
            <div className="text-xs uppercase font-bold text-emerald-400/80 tracking-wider">Chờ nhận đơn</div>
            <div className="text-2xl font-black mt-1 text-emerald-400">{paidCount}</div>
          </button>

          <button
            onClick={() => setFilterStatus('PREPARING')}
            className={`p-4 rounded-xl border text-left transition ${
              filterStatus === 'PREPARING'
                ? 'bg-amber-950/60 border-amber-500 text-white shadow-lg'
                : 'bg-[#16213e]/70 border-gray-800 text-amber-300 hover:bg-[#16213e]'
            }`}
          >
            <div className="text-xs uppercase font-bold text-amber-300/80 tracking-wider">Đang pha chế</div>
            <div className="text-2xl font-black mt-1 text-amber-300">{preparingCount}</div>
          </button>

          <button
            onClick={() => setFilterStatus('READY')}
            className={`p-4 rounded-xl border text-left transition ${
              filterStatus === 'READY'
                ? 'bg-purple-950/60 border-purple-500 text-white shadow-lg'
                : 'bg-[#16213e]/70 border-gray-800 text-purple-300 hover:bg-[#16213e]'
            }`}
          >
            <div className="text-xs uppercase font-bold text-purple-300/80 tracking-wider">Chờ giao khách</div>
            <div className="text-2xl font-black mt-1 text-purple-300">{readyCount}</div>
          </button>
        </div>

        {error && (
          <div className="bg-red-900/50 border border-red-700 text-red-200 p-4 rounded-xl text-sm">
            {error}
          </div>
        )}

        {/* Loading */}
        {loading && orders.length === 0 && (
          <div className="py-20 flex flex-col items-center justify-center text-gray-400">
            <div className="w-10 h-10 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mb-4" />
            <p>Đang tải hàng đợi...</p>
          </div>
        )}

        {/* Empty state */}
        {!loading && filteredOrders.length === 0 && (
          <div className="bg-[#16213e]/60 border border-gray-800 rounded-2xl p-16 text-center">
            <div className="w-20 h-20 bg-gray-800/80 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              🎉
            </div>
            <h2 className="text-xl font-bold text-white mb-2">Hàng đợi trống</h2>
            <p className="text-gray-400 max-w-md mx-auto">
              {filterStatus === 'ALL'
                ? 'Hiện không có đơn hàng nào cần xử lý. Tuyệt vời!'
                : `Hiện không có đơn hàng nào ở trạng thái ${filterStatus}.`}
            </p>
          </div>
        )}

        {/* Grid Orders */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredOrders.map((order) => {
            const config = statusBadgeMap[order.status] || {
              label: order.status,
              badgeClass: 'bg-gray-700 text-gray-300',
              borderClass: 'border-gray-700',
            };

            const orderDate = new Date(order.createdAt).toLocaleTimeString('vi-VN', {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            });

            const isUpdating = updatingId === order.id;

            return (
              <div
                key={order.id}
                className={`bg-[#16213e] rounded-2xl border ${config.borderClass} p-5 shadow-xl flex flex-col justify-between transition hover:border-gray-500`}
              >
                <div>
                  {/* Card Header */}
                  <div className="flex justify-between items-start pb-3 border-b border-gray-800">
                    <div>
                      <span className="text-xs uppercase tracking-wider font-semibold text-gray-400">
                        Đơn hàng
                      </span>
                      <h3 className="text-xl font-black text-white">#{order.id}</h3>
                    </div>
                    <div className="text-right">
                      <span className="text-xs text-gray-400 block">{orderDate}</span>
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-bold mt-1 ${config.badgeClass}`}
                      >
                        {config.label}
                      </span>
                    </div>
                  </div>

                  {/* Customer Info if available */}
                  {order.User?.email && (
                    <div className="py-2 text-xs text-gray-400 border-b border-gray-800/50">
                      Khách: <span className="text-gray-200 font-medium">{order.User.email}</span>
                    </div>
                  )}

                  {/* Danh sách món */}
                  <div className="py-4 space-y-3">
                    <h4 className="text-xs uppercase font-bold text-gray-400 tracking-wider">
                      Món cần pha chế:
                    </h4>
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {order.OrderItem && order.OrderItem.length > 0 ? (
                        order.OrderItem.map((item) => (
                          <div
                            key={item.id}
                            className="bg-[#0f3460]/40 rounded-lg p-2.5 flex justify-between items-center text-sm border border-gray-800"
                          >
                            <div>
                              <p className="font-bold text-white">
                                {item.Product?.name || `Món #${item.productId}`}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5 mt-1">
                                <span className="inline-block text-xs bg-gray-800 text-amber-300 font-semibold px-2 py-0.5 rounded">
                                  Size: {item.size}
                                </span>
                                {item.OrderItemTopping && item.OrderItemTopping.length > 0 &&
                                  item.OrderItemTopping.map((oit) => (
                                    <span
                                      key={oit.toppingId}
                                      className="inline-block text-xs bg-amber-950/80 text-amber-300 border border-amber-600/50 font-bold px-2 py-0.5 rounded shadow-sm"
                                    >
                                      ★ {oit.Topping?.name || `Topping #${oit.toppingId}`}
                                    </span>
                                  ))}
                              </div>
                            </div>
                            <div className="text-right">
                              <span className="text-base font-extrabold text-blue-400">
                                × {item.qty}
                              </span>
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-gray-500 text-xs italic">Không có chi tiết món</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Bottom Total & Actions */}
                <div className="pt-4 border-t border-gray-800 space-y-4">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-gray-400">Tổng thanh toán:</span>
                    <span className="text-lg font-bold text-emerald-400">
                      {Number(order.total).toLocaleString('vi-VN')}đ
                    </span>
                  </div>

                  {/* Action Buttons */}
                  <div>
                    {order.status === 'PAID' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'prepare')}
                        disabled={isUpdating}
                        className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg"
                      >
                        {isUpdating ? (
                          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          '🔥'
                        )}
                        <span>Nhận đơn</span>
                      </button>
                    )}

                    {order.status === 'PREPARING' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'ready')}
                        disabled={isUpdating}
                        className="w-full bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg"
                      >
                        {isUpdating ? (
                          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          '✅'
                        )}
                        <span>Pha chế xong</span>
                      </button>
                    )}

                    {order.status === 'READY' && (
                      <button
                        onClick={() => handleUpdateStatus(order.id, 'complete')}
                        disabled={isUpdating}
                        className="w-full bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold py-3 px-4 rounded-xl transition flex items-center justify-center gap-2 shadow-lg"
                      >
                        {isUpdating ? (
                          <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        ) : (
                          '📦'
                        )}
                        <span>Giao khách</span>
                      </button>
                    )}

                    {order.status === 'COMPLETED' && (
                      <div className="text-center py-2 text-xs text-gray-500 font-semibold">
                        Đơn đã hoàn thành
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}
