'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useCartStore } from '../../store/cartStore';
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  PlusIcon,
  MinusIcon,
  TrashIcon,
  CoffeeCupIcon,
  BagIcon
} from '../components/Icons';

export default function CartPage() {
  const router = useRouter();
  const { items, removeFromCart, updateQuantity } = useCartStore();

  const totalItemsCount = items.reduce((sum, item) => sum + Number(item.quantity), 0);
  const subtotal = items.reduce(
    (sum, item) => sum + Number(item.price) * Number(item.quantity),
    0
  );

  const discount = 0;
  const grandTotal = Math.max(0, subtotal - discount);

  if (items.length === 0) {
    return (
      <main className="min-h-screen bg-[#FBF8F2] py-16 px-4 text-center flex items-center justify-center">
        <div className="bg-white border border-[#E8DFD8] rounded-3xl p-8 sm:p-12 max-w-md w-full shadow-sm space-y-5">
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
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-[#FBF8F2] py-8 px-4 sm:px-6 lg:px-8 text-[#1F1F1F]">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Nút quay lại & Tiêu đề Giỏ hàng (3) */}
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
            {items.map((item) => {
              const itemTotal = Number(item.price) * Number(item.quantity);
              return (
                <div
                  key={item.cartItemId}
                  className="bg-white border border-[#E8DFD8] rounded-2xl p-4 sm:p-5 flex items-center justify-between gap-4 shadow-sm hover:shadow-md transition-shadow"
                >
                  {/* Thumbnail & Info */}
                  <div className="flex items-center gap-4 min-w-0">
                    <div className="w-20 h-20 rounded-xl overflow-hidden bg-[#F5F0E6] shrink-0 border border-[#E8DFD8]">
                      <img
                        src={
                          item.imageUrl ||
                          "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=300&auto=format&fit=crop&q=80"
                        }
                        alt={item.name}
                        className="w-full h-full object-cover"
                      />
                    </div>

                    <div className="min-w-0">
                      <h3 className="font-extrabold text-base text-[#2E1810] truncate">
                        {item.name}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-1.5 mt-1 text-xs text-[#756C65]">
                        <span className="bg-[#F5F0E6] text-[#5C4D44] font-semibold px-2 py-0.5 rounded">
                          Size {item.size}
                        </span>
                        {item.toppings && item.toppings.length > 0 && (
                          <span className="truncate">
                            • {item.toppings.join(', ')}
                          </span>
                        )}
                      </div>

                      <p className="font-bold text-[#8D6E63] text-sm mt-1.5">
                        {Number(item.price).toLocaleString('vi-VN')}đ
                      </p>
                    </div>
                  </div>

                  {/* Quantity Stepper & Delete Button */}
                  <div className="flex items-center gap-3 sm:gap-4 shrink-0">
                    {/* Stepper */}
                    <div className="flex items-center border border-[#E8DFD8] rounded-xl bg-[#FDFBF7] p-1">
                      <button
                        type="button"
                        onClick={() => {
                          if (item.quantity > 1) {
                            updateQuantity(item.cartItemId, item.quantity - 1);
                          } else {
                            removeFromCart(item.cartItemId);
                          }
                        }}
                        className="w-7 h-7 flex items-center justify-center text-[#3E2723] hover:bg-[#F5F0E6] rounded-lg cursor-pointer transition-colors"
                        title="Giảm số lượng"
                      >
                        <MinusIcon className="w-3.5 h-3.5" />
                      </button>

                      <span className="w-7 text-center font-bold text-xs text-[#3E2723]">
                        {item.quantity}
                      </span>

                      <button
                        type="button"
                        onClick={() => updateQuantity(item.cartItemId, item.quantity + 1)}
                        className="w-7 h-7 flex items-center justify-center text-[#3E2723] hover:bg-[#F5F0E6] rounded-lg cursor-pointer transition-colors"
                        title="Tăng số lượng"
                      >
                        <PlusIcon className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Trash Delete */}
                    <button
                      type="button"
                      onClick={() => removeFromCart(item.cartItemId)}
                      className="p-2 text-gray-400 hover:text-red-600 rounded-lg transition-colors cursor-pointer"
                      title="Xóa món này"
                    >
                      <TrashIcon className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* CỘT PHẢI: TỔNG KẾT ĐƠN HÀNG (Chuẩn Mockup 4. Giỏ hàng) */}
          <div className="lg:col-span-5 xl:col-span-4 sticky top-24">
            <div className="bg-white border border-[#E8DFD8] rounded-3xl p-6 sm:p-7 shadow-sm space-y-5">
              <h2 className="font-extrabold text-xl text-[#3E2723]">
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
                  <span>Giảm giá</span>
                  <span className="font-semibold text-emerald-600">
                    -{discount.toLocaleString('vi-VN')}đ
                  </span>
                </div>
              </div>

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
                onClick={() => router.push('/checkout')}
                className="w-full bg-[#3E2723] hover:bg-[#2E1C12] text-white font-bold py-3.5 px-4 rounded-xl transition shadow-md shadow-[#3E2723]/20 hover:-translate-y-0.5 active:translate-y-0 text-center flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Thanh toán</span>
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