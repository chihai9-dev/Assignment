'use client';
import { useParams, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useCartStore } from '../../../store/cartStore';

// Định nghĩa kiểu dữ liệu
interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
}

// Bảng giá phụ thu
const SIZE_PRICES = { S: 0, M: 5000, L: 10000 };
const TOPPING_PRICES = { 'Trân châu': 5000, 'Thạch trái cây': 5000, 'Kem cheese': 10000 };

export default function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const addToCart = useCartStore((state) => state.addToCart);
  
  // Các state quản lý dữ liệu và tùy chọn
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<'S' | 'M' | 'L'>('S');
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Gọi API lấy chi tiết 1 sản phẩm
  useEffect(() => {
    fetch(`http://localhost:3001/products/${params.id}`)
      .then((res) => {
        // Nếu backend trả về lỗi (404, 400, 500...), ném ra lỗi để nhảy vào catch
        if (!res.ok) {
          throw new Error('Không thể tải dữ liệu sản phẩm');
        }
        return res.json();
      })
      .then((data) => {
        setProduct(data); // Chỉ set dữ liệu khi chắc chắn đó là Product
        setIsLoading(false);
      })
      .catch((error) => {
        console.error('Lỗi fetch:', error);
        setProduct(null); // Set về null để màn hình hiển thị "Không tìm thấy sản phẩm!"
        setIsLoading(false);
      });
  }, [params.id]);

  // Hàm xử lý chọn/bỏ chọn topping
  const handleToppingChange = (topping: string) => {
    setSelectedToppings(prev => 
      prev.includes(topping) ? prev.filter(t => t !== topping) : [...prev, topping]
    );
  };

  if (isLoading) return <div className="p-10 text-center text-xl font-semibold">Đang tải chi tiết...</div>;
  if (!product) return <div className="p-10 text-center text-xl text-red-500">Không tìm thấy sản phẩm!</div>;

  // Lô-gic tính tổng tiền: Giá gốc + Giá size + Tổng giá topping
  const toppingsTotal = selectedToppings.reduce((total, t) => total + TOPPING_PRICES[t as keyof typeof TOPPING_PRICES], 0);
  const finalPrice = product.price + SIZE_PRICES[selectedSize] + toppingsTotal;

  return (
    <main className="p-8 max-w-2xl mx-auto min-h-screen bg-white text-black">
      <button onClick={() => router.back()} className="mb-6 text-blue-600 font-semibold hover:underline">
        &larr; Quay lại Menu
      </button>
      
      <div className="bg-gray-50 p-6 rounded-2xl shadow-sm border border-gray-200">
        <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
        <p className="text-2xl text-blue-600 font-bold mb-6">Giá gốc: {product.price.toLocaleString('vi-VN')} VNĐ</p>

        {/* Khu vực chọn Size */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Chọn Size (Bắt buộc)</h3>
          <div className="flex gap-4">
            {(['S', 'M', 'L'] as const).map(size => (
              <label key={size} className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg bg-white hover:border-blue-500 has-[:checked]:border-blue-500 has-[:checked]:ring-1 has-[:checked]:ring-blue-500 transition">
                <input 
                  type="radio" 
                  name="size" 
                  value={size} 
                  checked={selectedSize === size} 
                  onChange={() => setSelectedSize(size)} 
                  className="w-4 h-4 text-blue-600"
                />
                <span className="font-medium">Size {size} (+{SIZE_PRICES[size].toLocaleString('vi-VN')}đ)</span>
              </label>
            ))}
          </div>
        </div>

        {/* Khu vực chọn Topping */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3">Thêm Topping (Tùy chọn)</h3>
          <div className="flex flex-col gap-3">
            {Object.entries(TOPPING_PRICES).map(([topping, price]) => (
              <label key={topping} className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg bg-white hover:border-blue-500 has-[:checked]:border-blue-500 transition">
                <input 
                  type="checkbox" 
                  checked={selectedToppings.includes(topping)} 
                  onChange={() => handleToppingChange(topping)} 
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="font-medium">{topping} (+{price.toLocaleString('vi-VN')}đ)</span>
              </label>
            ))}
          </div>
        </div>

        {/* Tổng tiền tạm tính */}
        <div className="border-t pt-6 mt-6">
          <div className="flex justify-between items-center mb-6">
            <span className="text-xl font-bold">Tổng tạm tính:</span>
            <span className="text-3xl font-bold text-blue-600">{finalPrice.toLocaleString('vi-VN')} VNĐ</span>
          </div>
          <button 
            onClick={() => {
                const cartItemId = `${product.id}-${selectedSize}-${selectedToppings.join('-')}`;
                addToCart({
                cartItemId,
                productId: product.id,
                name: product.name,
                price: finalPrice,
                size: selectedSize,
                toppings: selectedToppings,
                quantity: 1
                });
                alert('Đã thêm vào giỏ hàng thành công!');
                router.push('/cart'); // Chuyển hướng sang trang giỏ hàng
            }}
            className="w-full bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition text-lg"
            >
            Thêm vào giỏ hàng
            </button>
        </div>
      </div>
    </main>
  );
}