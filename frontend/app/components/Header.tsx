'use client';

import Link from 'next/link';
import { useCartStore } from '../../store/cartStore';

export default function Header() {
  // Lấy items từ store; badge sẽ tự cập nhật mỗi khi giỏ hàng thay đổi
  const items = useCartStore((state) => state.items);
  const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <header className="sticky top-0 z-10 bg-white border-b shadow-sm">
      <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="text-2xl font-bold text-blue-600">
          BrewLite
        </Link>

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
    </header>
  );
}