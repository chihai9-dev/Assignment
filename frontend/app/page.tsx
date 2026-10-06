"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useCartStore } from "../store/cartStore";
import { useAuthStore } from "../store/authStore";

// Định nghĩa kiểu dữ liệu cho sản phẩm
interface Product {
  id: number; 
  name: string;
  price: number;
  imageUrl: string;
}

export default function MenuPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const router = useRouter();
  // Lấy dữ liệu giỏ hàng từ store
  const { items } = useCartStore();
  const { user } = useAuthStore();

  // Tính tổng số lượng sản phẩm đang có trong giỏ
  const totalItems = items.reduce((sum, item) => sum + Number(item.quantity), 0);

  useEffect(() => {
    // Gọi API từ Backend NestJS
    fetch("http://localhost:3001/api/products")
      .then((res) => res.json())
      .then((data) => {
        console.log("Dữ liệu API:", data);

        setProducts(Array.isArray(data) ? data : data.data || []);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error("Lỗi khi tải dữ liệu:", error);
        setIsLoading(false);
      });
  }, []);

  // Xử lý trạng thái Loading (Đang tải dữ liệu)
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl font-semibold">Đang tải menu...</p>
      </div>
    );
  }

  // Xử lý trạng thái Empty (Không có sản phẩm nào)
  if (products.length === 0) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p className="text-xl font-semibold text-gray-500">
          Hiện chưa có món nào trong menu.
        </p>
      </div>
    );
  }

  // Render lưới sản phẩm
  return (
    <main className="p-8 w-full min-h-screen  bg-[#762626] text-white">
      <div className="max-w-6xl mx-auto">



        {/* --- Header chứa Tiêu đề và Icon Giỏ hàng --- */}
        <div className="flex items-center justify-center relative mb-8">
          <h1 className="text-4xl font-bold text-center">BrewLite Menu</h1>
          
          {/* Thay Link bằng thẻ <a> để có thể dùng onClick tùy chỉnh */}
          <a 
            href="/cart"
            onClick={(e) => {
              e.preventDefault(); // Ngăn hành vi chuyển trang mặc định
              
              // Bắt buộc đăng nhập trước khi vào giỏ hàng
              if (!user) {
                alert("Vui lòng đăng nhập để xem hoặc thêm sản phẩm vào giỏ hàng!");
                router.push(`/login?redirect=/cart`); // Chuyển về trang login và điều hướng lại cart
                return;
              }
              
              router.push("/cart"); // Nếu đã có user thì chuyển sang giỏ hàng
            }}
            className="absolute right-0 top-1/2 -translate-y-1/2 text-white hover:text-gray-300 transition-colors cursor-pointer"
          >
            <div className="relative">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
                <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 3h1.386c.51 0 .955.343 1.087.835l.383 1.437M7.5 14.25a3 3 0 00-3 3h15.75m-12.75-3h11.218c1.121-2.3 2.1-4.684 2.924-7.138a60.114 60.114 0 00-16.536-1.84M7.5 14.25L5.106 5.272M6 20.25a.75.75 0 11-1.5 0 .75.75 0 011.5 0zm12.75 0a.75.75 0 11-1.5 0 .75.75 0 011.5 0z" />
              </svg>

              {totalItems > 0 && (
                <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] font-bold w-5 h-5 flex items-center justify-center rounded-full border border-[#762626]">
                  {totalItems}
                </span>
              )}
            </div>
          </a>
        </div>
        {/* --- Kết thúc phần Header --- */}



        {/* TailwindCSS Grid: 1 cột trên mobile, 3 cột trên màn hình lớn */}
        <div className="grid grid-cols-2 md:grid-cols-3 w-full max-w-[900px] mx-auto gap-4 md:gap-8">
          {products?.map((product) => (
            <div
              key={product.id}
              className="border rounded-xl p-5 shadow-sm hover:shadow-md transition bg-[#f5f5f5] text-black transition-all duration-300 hover:-translate-y-1 hover:shadow-lg hover:shadow-white/30"
            >
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-48 object-cover rounded-lg mb-4 bg-gray-100"
              />
              <h2 className="text-xl font-bold">{product.name}</h2>
              <p className="text-gray-600 mt-2 font-medium">
                {product.price.toLocaleString("vi-VN")} VNĐ
              </p>
              <Link
                href={`/product/${product.id}`}
                className="mt-5 block text-center w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition active:bg-[#10169f]"
              >
                Xem chi tiết
              </Link>
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
