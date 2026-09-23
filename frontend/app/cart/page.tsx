'use client';

import Link from 'next/link';
import { useCartStore } from '../../store/cartStore';

export default function CartPage() {
  const { items, removeFromCart, updateQuantity } = useCartStore();

  const totalAmount = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  if (items.length === 0) {
    return (
      <div className="p-10 text-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Giỏ hàng của bạn đang trống</h1>
        <Link href="/" className="text-blue-600 hover:underline">← Quay lại Menu</Link>
      </div>
    );
  }

  return (
    <main className="p-8 max-w-4xl mx-auto min-h-screen">
      <h1 className="text-3xl font-bold mb-8">Giỏ hàng của bạn</h1>
      
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 space-y-4">
          {items.map(item => (
            <div key={item.cartItemId} className="flex items-center justify-between p-4 border rounded-xl shadow-sm">
              <div>
                <h3 className="font-bold text-lg">{item.name}</h3>
                <p className="text-sm text-gray-500">Size {item.size} {item.toppings.length > 0 && `+ ${item.toppings.join(', ')}`}</p>
                <p className="font-semibold text-blue-600 mt-1">{item.price.toLocaleString('vi-VN')}đ</p>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center border rounded-lg">
                  <button onClick={() => updateQuantity(item.cartItemId, item.quantity - 1)} className="px-3 py-1 bg-gray-100 hover:bg-gray-200">-</button>
                  <span className="px-4 font-medium">{item.quantity}</span>
                  <button onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)} className="px-3 py-1 bg-gray-100 hover:bg-gray-200">+</button>
                </div>
                <button onClick={() => removeFromCart(item.cartItemId)} className="text-red-500 hover:text-red-700 font-bold">Xóa</button>
              </div>
            </div>
          ))}
        </div>

        <div className="bg-gray-50 p-6 rounded-xl border h-fit">
          <h2 className="text-xl font-bold mb-4">Thanh toán</h2>
          <div className="flex justify-between font-bold text-xl mb-6">
            <span>Tổng cộng:</span>
            <span className="text-blue-600">{totalAmount.toLocaleString('vi-VN')}đ</span>
          </div>
          <button className="w-full bg-green-600 text-white font-bold py-3 rounded-lg hover:bg-green-700 transition">
            Tiến hành đặt đơn
          </button>
          <Link href="/" className="block text-center mt-4 text-blue-600 hover:underline text-sm">
            Tiếp tục mua hàng
          </Link>
        </div>
      </div>
    </main>
  );
}