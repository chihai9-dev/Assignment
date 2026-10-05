'use client';

import Link from 'next/link';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';

// Thanh điều hướng tối giản chỉ phục vụ đăng nhập/đăng ký.
// Nếu sau này làm Header đầy đủ (logo, badge giỏ hàng...) có thể gộp phần này vào.
export default function AuthNav() {
  const { user, logout } = useAuthStore();
  const clearActiveCart = useCartStore((state) => state.clearActiveCart);

  const handleLogout = () => {
    logout();
    clearActiveCart(); // ẩn giỏ hàng đi; dữ liệu vẫn được giữ, đăng nhập lại sẽ thấy lại ngay
  };

  return (
    <div className="w-full bg-white border-b px-6 py-3 flex items-center justify-between text-sm">
      <Link href="/" className="font-bold text-blue-600">BrewLite</Link>

      {user ? (
        <div className="flex items-center gap-3 text-gray-700">
          <span>Xin chào, <b>{user.email}</b></span>
          <button onClick={handleLogout} className="text-red-500 hover:text-red-700 font-semibold">
            Đăng xuất
          </button>
        </div>
      ) : (
        <div className="flex items-center gap-4 font-semibold">
          <Link href="/login" className="text-gray-700 hover:text-blue-600">Đăng nhập</Link>
          <Link href="/register" className="text-blue-600 hover:underline">Đăng ký</Link>
        </div>
      )}
    </div>
  );
}
