'use client';

import { useEffect, useState } from 'react';

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

  useEffect(() => {
    // Gọi API từ Backend NestJS
    fetch('http://localhost:3000/products')
      .then((res) => res.json())
      .then((data) => {
        setProducts(data);
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Lỗi khi tải dữ liệu:', error);
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
        <p className="text-xl font-semibold text-gray-500">Hiện chưa có món nào trong menu.</p>
      </div>
    );
  }

  // Render lưới sản phẩm
  return (
    <main className="p-8 max-w-6xl mx-auto min-h-screen bg-white text-black">
      <h1 className="text-4xl font-bold mb-8 text-center">BrewLite Menu</h1>
      
      {/* TailwindCSS Grid: 1 cột trên mobile, 3 cột trên màn hình lớn */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {products.map((product) => (
          <div key={product.id} className="border rounded-xl p-5 shadow-sm hover:shadow-md transition">
            <img 
              src={product.imageUrl} 
              alt={product.name} 
              className="w-full h-48 object-cover rounded-lg mb-4 bg-gray-100"
            />
            <h2 className="text-xl font-bold">{product.name}</h2>
            <p className="text-gray-600 mt-2 font-medium">
              {product.price.toLocaleString('vi-VN')} VNĐ
            </p>
            <button className="mt-5 w-full bg-blue-600 text-white font-semibold py-2.5 rounded-lg hover:bg-blue-700 transition">
              Xem chi tiết
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}