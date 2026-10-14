"use client";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useCartStore } from "../../../store/cartStore";

// Định nghĩa kiểu dữ liệu
interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
}

interface ToppingItem {
  id: number;
  name: string;
  price: number;
}

// Bảng giá phụ thu Size
const SIZE_PRICES = { S: 0, M: 5000, L: 10000 };

export default function ProductDetail() {
  const params = useParams();
  const router = useRouter();
  const addToCart = useCartStore((state) => state.addToCart);

  // Các state quản lý dữ liệu và tùy chọn
  const [product, setProduct] = useState<Product | null>(null);
  const [selectedSize, setSelectedSize] = useState<"S" | "M" | "L">("S");
  const [selectedToppings, setSelectedToppings] = useState<string[]>([]);
  const [toppingsList, setToppingsList] = useState<ToppingItem[]>([
    { id: 1, name: "Trân châu", price: 5000 },
    { id: 2, name: "Thạch trái cây", price: 5000 },
    { id: 3, name: "Kem cheese", price: 10000 },
    { id: 4, name: "Pudding trứng", price: 8000 },
    { id: 5, name: "Thạch dừa", price: 5000 },
  ]);
  const [isLoading, setIsLoading] = useState(true);

  // Gọi API lấy chi tiết 1 sản phẩm
  useEffect(() => {
    fetch(`http://localhost:3001/api/products/${params.id}`)
      .then((res) => res.json())
      .then((data) => {
        const productData = data.data ? data.data : data;
        setProduct(productData);
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));

    // Lấy danh sách Topping từ DB
    fetch('http://localhost:3001/api/toppings')
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setToppingsList(data);
        }
      })
      .catch(() => {});
  }, [params.id]);

  // Hàm xử lý chọn/bỏ chọn topping
  const handleToppingChange = (topping: string) => {
    setSelectedToppings((prev) =>
      prev.includes(topping)
        ? prev.filter((t) => t !== topping)
        : [...prev, topping],
    );
  };

  if (isLoading)
    return (
      <div className="p-10 text-center text-xl font-semibold">
        Đang tải chi tiết...
      </div>
    );
  if (!product)
    return (
      <div className="p-10 text-center text-xl text-red-500">
        Không tìm thấy sản phẩm!
      </div>
    );

  // Lô-gic tính tổng tiền: Giá gốc + Giá size + Tổng giá topping
  const toppingsTotal = selectedToppings.reduce((total, toppingName) => {
    const t = toppingsList.find((item) => item.name === toppingName);
    return total + (t ? Number(t.price) : 0);
  }, 0);
  const finalPrice = Number(product.price) + Number(SIZE_PRICES[selectedSize]) + Number(toppingsTotal);

  return (
    <main className="p-8 w-full min-h-screen bg-[#fff4c5] text-black">
      <button onClick={() => router.back()} className="mb-6 text-blue-600 font-semibold hover:underline">
        &larr; Quay lại Menu
      </button>
      
      <div className="w-full md:w-3/5 mx-auto bg-gray-50 p-6 rounded-2xl shadow-sm border border-gray-200">
        <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
        <p className="text-2xl text-blue-600 font-bold mb-6">
          Giá gốc: {product.price.toLocaleString("vi-VN")} VNĐ
        </p>

        {/* Khu vực chọn Size */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-3">Chọn Size (Bắt buộc)</h3>
          <div className="flex flex-wrap gap-4">
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
                <span className="font-medium">
                  Size {size} (+{SIZE_PRICES[size].toLocaleString("vi-VN")}đ)
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Khu vực chọn Topping */}
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3">
            Thêm Topping (Tùy chọn)
          </h3>
          <div className="flex flex-col gap-3">
            {toppingsList.map((t) => (
              <label
                key={t.id}
                className="flex items-center gap-2 cursor-pointer border p-3 rounded-lg bg-white hover:border-blue-500 has-[:checked]:border-blue-500 transition"
              >
                <input
                  type="checkbox"
                  checked={selectedToppings.includes(t.name)}
                  onChange={() => handleToppingChange(t.name)}
                  className="w-4 h-4 text-blue-600 rounded"
                />
                <span className="font-medium">
                  {t.name} (+{Number(t.price).toLocaleString("vi-VN")}đ)
                </span>
              </label>
            ))}
          </div>
        </div>

        {/* Tổng tiền tạm tính */}
        <div className="border-t pt-6 mt-6">
          <div className="flex justify-between items-center mb-6">
            <span className="text-xl font-bold">Tổng tạm tính:</span>
            <span className="text-3xl font-bold text-blue-600">
              {finalPrice.toLocaleString("vi-VN")} VNĐ
            </span>
          </div>
          <div className="flex gap-4">
          <button
            onClick={() => {
              const cartItemId = `${product.id}-${selectedSize}-${selectedToppings.join("-")}`;
              addToCart({
                cartItemId,
                productId: product.id,
                name: product.name,
                price: finalPrice,
                size: selectedSize,
                toppings: selectedToppings,
                quantity: 1,
              });
              alert("Đã thêm vào giỏ hàng thành công!");
              router.push("/cart"); // Chuyển hướng sang trang giỏ hàng
            }}
            className="flex-1 bg-blue-600 text-white font-bold py-3.5 rounded-xl hover:bg-blue-700 transition text-lg"
          >
            Thêm vào giỏ hàng
          </button>
          
          </div>
        </div>
      </div>
    </main>
  );
}
