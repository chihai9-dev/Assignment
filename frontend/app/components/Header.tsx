'use client';

import Link from 'next/link';
import { useEffect } from 'react';
import { useCartStore } from '../../store/cartStore';
import { useAuthStore } from '../../store/authStore';

export default function Header() {
  // Lấy items từ store; badge sẽ tự cập nhật mỗi khi giỏ hàng thay đổi
  const items = useCartStore((state) => state.items);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  const { user, hydrated, hydrate, logout } = useAuthStore();

  // Khôi phục trạng thái đăng nhập từ localStorage khi tải trang
  useEffect(() => {
    hydrate();
  }, [hydrate]);

  return (
    <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          BrewLite
        </Link>

        <div className="flex items-center gap-6">
          {/* Chỉ hiển thị sau khi đọc xong localStorage để tránh nháy giao diện */}
          {hydrated &&
            (user ? (
              <div className="flex items-center gap-3 text-sm text-gray-700">
                <span>Xin chào, <b>{user.email}</b></span>
                <button onClick={logout} className="text-red-500 hover:text-red-700 font-semibold">
                  Đăng xuất
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-4 text-sm font-semibold">
                <Link href="/login" className="text-gray-700 hover:text-blue-600">Đăng nhập</Link>
                <Link href="/register" className="text-blue-600 hover:underline">Đăng ký</Link>
              </div>
            ))}

          <Link
            href="/cart"
            className="relative flex items-center gap-2 font-semibold text-gray-700 hover:text-blue-600 transition"
          >
            <span>🛒 Giỏ hàng</span>
            {totalQuantity > 0 && (
              <span className="absolute -top-2 -right-3 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                {totalQuantity}
              </span>
            )}
          </Link>
        </div>
      </div>
    </header>
  );
}
