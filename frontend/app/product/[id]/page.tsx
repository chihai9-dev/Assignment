<<<<<<< HEAD
"use client";

import { useParams, useRouter } from "next/navigation";
import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useCartStore } from "../../../store/cartStore";
import { ArrowLeftIcon, PlusIcon, MinusIcon, CoffeeCupIcon } from "../../components/Icons";

interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  description?: string;
}

interface ToppingItem {
  id: number;
  name: string;
  price: number;
}

// Bảng phụ thu theo size chuẩn
const SIZE_PRICES: Record<"S" | "M" | "L", number> = {
  S: 0,
  M: 5000,
  L: 10000,
};

// Dữ liệu mẫu đồ uống chuẩn theo Mockup #3
const SAMPLE_PRODUCTS: Record<string, Product> = {
  "1": {
    id: 1,
    name: "Cà phê sữa",
    price: 30000,
    imageUrl: "https://images.unsplash.com/photo-1514432324607-a09d9b4aefdd?w=800&auto=format&fit=crop&q=85",
    description: "Hương vị cà phê đậm đà kết hợp cùng vị sữa béo ngậy, tạo nên một thức uống kinh điển và khó quên.",
  },
  "2": {
    id: 2,
    name: "Cà phê đen",
    price: 25000,
    imageUrl: "https://images.unsplash.com/photo-1551030173-122aabc4489c?w=800&auto=format&fit=crop&q=85",
    description: "Cà phê đen đậm vị truyền thống từ hạt cà phê Robusta và Arabica rang mộc, thơm nồng tỉnh táo.",
  },
  "3": {
    id: 3,
    name: "Bạc xỉu",
    price: 35000,
    imageUrl: "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=800&auto=format&fit=crop&q=85",
    description: "Sự hòa quyện ngọt ngào giữa sữa tươi, sữa đặc và một chút cà phê nguyên chất thanh nhẹ.",
  },
  "4": {
    id: 4,
    name: "Trà đào",
    price: 40000,
    imageUrl: "https://images.unsplash.com/photo-1556679343-c7306c1976bc?w=800&auto=format&fit=crop&q=85",
    description: "Trà đen thanh mát kết hợp với những miếng đào giòn tan thơm lừng sảng khoái.",
  },
  "5": {
    id: 5,
    name: "Trà sữa",
    price: 45000,
    imageUrl: "https://images.unsplash.com/photo-1576092768241-dec231879fc3?w=800&auto=format&fit=crop&q=85",
    description: "Hương trà đậm đà cùng vị béo ngậy êm dịu, ngọt ngào hấp dẫn từ ngụm đầu tiên.",
  },
  "6": {
    id: 6,
    name: "Matcha latte",
    price: 45000,
    imageUrl: "https://images.unsplash.com/photo-1536256263959-770b48d82b0a?w=800&auto=format&fit=crop&q=85",
    description: "Bột trà xanh Nhật Bản thượng hạng đánh mịn cùng sữa tươi nóng hoặc đá béo ngậy.",
  },
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const addToCart = useCartStore((state) => state.addToCart);

  const productIdStr = String(params?.id || "1");

  const [product, setProduct] = useState<Product | null>(
    SAMPLE_PRODUCTS[productIdStr] || null
  );
  const [selectedSize, setSelectedSize] = useState<"S" | "M" | "L">("M");
  const [selectedToppings, setSelectedToppings] = useState<string[]>(["Trân châu"]);
  const [quantity, setQuantity] = useState<number>(1);
  const [activeImage, setActiveImage] = useState<string>("");
  const [isAddedSuccess, setIsAddedSuccess] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Danh sách Topping chuẩn từ Mockup Screen 3
  const [toppingsList, setToppingsList] = useState<ToppingItem[]>([
    { id: 1, name: "Trân châu", price: 5000 },
    { id: 2, name: "Thạch cà phê", price: 5000 },
    { id: 3, name: "Nha đam", price: 5000 },
    { id: 4, name: "Kem cheese", price: 7000 },
    { id: 5, name: "Pudding trứng", price: 8000 },
  ]);

  // Tải chi tiết sản phẩm và toppings từ API
  useEffect(() => {
<<<<<<<< HEAD:frontend/app/product/[id]/page.tsx
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
========
    fetch(`http://localhost:3001/api/products/${productIdStr}`)
      .then((res) => {
        if (!res.ok) throw new Error("Product fetch error");
        return res.json();
      })
      .then((data) => {
        const p = data.data ? data.data : data;
        if (p && p.name) {
          setProduct({
            id: Number(p.id),
            name: p.name,
            price: Number(p.price),
            imageUrl: p.imageUrl,
            description:
              p.description ||
              SAMPLE_PRODUCTS[productIdStr]?.description ||
              "Hương vị cà phê tuyệt hảo, được pha chế từ nguồn hạt cà phê chọn lọc của BrewLite.",
          });
          setActiveImage(p.imageUrl);
        }
      })
      .catch(() => {
        // Fallback to sample product if API is offline
        const sample = SAMPLE_PRODUCTS[productIdStr] || SAMPLE_PRODUCTS["1"];
        setProduct(sample);
        setActiveImage(sample.imageUrl);
      })
      .finally(() => {
        setIsLoading(false);
      });

    // Tải danh sách toppings từ backend
    fetch("http://localhost:3001/api/toppings")
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          setToppingsList(data);
        }
      })
      .catch(() => {});
  }, [productIdStr]);
>>>>>>>> 2616c841fe24e488017309b91afe6d645bf87daf:frontend/app/product/[id]/pageProduct.tsx

  // Gallery hình ảnh phụ (theo Mockup #3 có 3 thumbnail dưới ảnh chính)
  const thumbnails = useMemo(() => {
    if (!product) return [];
    return [
      product.imageUrl,
      "https://images.unsplash.com/photo-1534778101976-62847782c213?w=400&auto=format&fit=crop&q=80",
      "https://images.unsplash.com/photo-1461023058943-07fcbe16d735?w=400&auto=format&fit=crop&q=80",
    ];
  }, [product]);

  // Cập nhật topping checkbox
  const handleToppingToggle = (name: string) => {
    setSelectedToppings((prev) =>
      prev.includes(name) ? prev.filter((t) => t !== name) : [...prev, name]
    );
  };

  // Tính giá đơn vị sản phẩm: Giá gốc + Size + Toppings
  const unitPrice = useMemo(() => {
    if (!product) return 0;
    const base = Number(product.price);
    const sizeExtra = SIZE_PRICES[selectedSize];
    const toppingsExtra = selectedToppings.reduce((sum, name) => {
      const found = toppingsList.find((t) => t.name === name);
      return sum + (found ? Number(found.price) : 5000);
    }, 0);
    return base + sizeExtra + toppingsExtra;
  }, [product, selectedSize, selectedToppings, toppingsList]);

  // Tổng tiền cho số lượng
  const totalPrice = unitPrice * quantity;

  // Thêm vào giỏ hàng
  const handleAddToCart = () => {
    if (!product) return;

    // Sắp xếp toppings để tạo key giỏ hàng duy nhất
    const sortedToppings = [...selectedToppings].sort();
    const cartItemId = `${product.id}-${selectedSize}-${sortedToppings.join("-")}`;

    addToCart({
      cartItemId,
      productId: product.id,
      name: product.name,
      price: unitPrice,
      size: selectedSize,
      toppings: sortedToppings,
      quantity: quantity,
      imageUrl: product.imageUrl,
    });

    setIsAddedSuccess(true);
    setTimeout(() => {
      setIsAddedSuccess(false);
    }, 3000);
  };

  if (!product && !isLoading) {
    return (
      <div className="min-h-screen bg-[#FBF8F2] flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl border border-[#E8DFD8] shadow-sm max-w-md">
          <CoffeeCupIcon className="w-12 h-12 text-[#8D6E63] mx-auto mb-3" />
          <h2 className="text-xl font-bold text-[#3E2723]">Không tìm thấy đồ uống</h2>
          <p className="text-sm text-gray-500 mt-2 mb-6">Món bạn tìm kiếm không tồn tại hoặc đã ngừng phục vụ.</p>
          <Link
            href="/"
            className="inline-block bg-[#3E2723] text-white px-6 py-2.5 rounded-xl font-semibold text-sm hover:bg-[#2E1C12]"
          >
            Quay lại Menu
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-[#FBF8F2] py-8 px-4 sm:px-6 lg:px-8 text-[#1F1F1F]">
      <div className="max-w-6xl mx-auto space-y-6">
        
        {/* Nút quay lại */}
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#8D6E63] hover:text-[#3E2723] transition-colors cursor-pointer group"
          >
            <ArrowLeftIcon className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Quay lại Menu</span>
          </button>
        </div>



        {/* =========================================================
            CHI TIẾT SẢN PHẨM (Theo Mockup 3. Chi tiết sản phẩm)
        ========================================================= */}
        <div className="bg-white border border-[#E8DFD8] rounded-3xl p-6 sm:p-10 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          
          {/* CỘT TRÁI: HÌNH ẢNH SẢN PHẨM & THUMBNAILS */}
          <div className="md:col-span-5 space-y-4">
            {/* Ảnh chính */}
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#F5F0E6] border border-[#E8DFD8] shadow-inner group">
              <img
                src={activeImage || product?.imageUrl}
                alt={product?.name || "Coffee"}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>

            {/* 3 Thumbnails ảnh phụ */}
            <div className="grid grid-cols-3 gap-3">
              {thumbnails.map((imgUrl, idx) => {
                const isSelected = (activeImage || product?.imageUrl) === imgUrl;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActiveImage(imgUrl)}
                    className={`aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer ${
                      isSelected
                        ? "border-[#3E2723] ring-2 ring-[#3E2723]/20"
                        : "border-[#E8DFD8] hover:border-[#8D6E63] opacity-80 hover:opacity-100"
                    }`}
                  >
                    <img
                      src={imgUrl}
                      alt={`Thumbnail ${idx + 1}`}
                      className="w-full h-full object-cover"
                    />
                  </button>
                );
              })}
            </div>
          </div>

          {/* CỘT PHẢI: TÙY CHỌN & GIÁ */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              {/* Tiêu đề & Giá */}
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-[#3E2723] tracking-tight">
                  {product?.name}
                </h1>
                <p className="text-2xl sm:text-3xl font-extrabold text-[#3E2723] mt-2">
                  {unitPrice.toLocaleString("vi-VN")}đ
                </p>
                <p className="text-sm text-[#756C65] mt-3 leading-relaxed">
                  {product?.description}
                </p>
              </div>

              <hr className="border-[#E8DFD8]" />

              {/* KHU VỰC CHỌN SIZE */}
              <div className="space-y-2.5">
                <label className="block text-sm font-bold text-[#3E2723]">
                  Chọn size
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {(["S", "M", "L"] as const).map((size) => {
                    const isSelected = selectedSize === size;
                    const priceDiff = SIZE_PRICES[size];
                    const displayPrice =
                      Number(product?.price || 0) + priceDiff;

                    return (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setSelectedSize(size)}
                        className={`p-3 rounded-xl border text-center transition-all cursor-pointer ${
                          isSelected
                            ? "bg-[#3E2723] text-white border-[#3E2723] shadow-md shadow-[#3E2723]/20"
                            : "bg-[#FDFBF7] text-[#5C4D44] border-[#E8DFD8] hover:bg-[#F5F0E6] hover:border-[#8D6E63]"
                        }`}
                      >
                        <div className="font-extrabold text-base">{size}</div>
                        <div className={`text-xs mt-0.5 ${isSelected ? "text-white/80" : "text-[#8D6E63]"}`}>
                          {displayPrice.toLocaleString("vi-VN")}đ
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* KHU VỰC CHỌN TOPPING */}
              <div className="space-y-2.5 pt-2">
                <label className="block text-sm font-bold text-[#3E2723]">
                  Chọn topping
                </label>
                <div className="space-y-2">
                  {toppingsList.map((topping) => {
                    const isChecked = selectedToppings.includes(topping.name);
                    return (
                      <label
                        key={topping.id}
                        className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${
                          isChecked
                            ? "bg-[#F5F0E6]/60 border-[#D7A86E]"
                            : "bg-[#FDFBF7] border-[#E8DFD8] hover:bg-white"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => handleToppingToggle(topping.name)}
                            className="w-4.5 h-4.5 text-[#3E2723] rounded border-gray-300 focus:ring-[#8D6E63] accent-[#3E2723] cursor-pointer"
                          />
                          <span className="text-sm font-medium text-[#2E1810]">
                            {topping.name}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-[#8D6E63]">
                          +{Number(topping.price).toLocaleString("vi-VN")}đ
                        </span>
                      </label>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* BOTTOM ACTIONS: SỐ LƯỢNG & NÚT THÊM GIỎ HÀNG */}
            <div className="pt-6 border-t border-[#E8DFD8] space-y-4">
              <div className="flex items-center gap-4">
                {/* Bộ điều khiển số lượng */}
                <div className="flex items-center border border-[#E8DFD8] rounded-xl bg-[#FDFBF7] p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-9 h-9 flex items-center justify-center text-[#3E2723] hover:bg-[#F5F0E6] rounded-lg disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                  >
                    <MinusIcon className="w-3.5 h-3.5" />
                  </button>
                  <span className="w-10 text-center font-bold text-sm text-[#3E2723]">
                    {quantity}
                  </span>
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => q + 1)}
                    className="w-9 h-9 flex items-center justify-center text-[#3E2723] hover:bg-[#F5F0E6] rounded-lg cursor-pointer"
                  >
                    <PlusIcon className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Nút thêm vào giỏ hàng */}
                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex-1 bg-[#3E2723] hover:bg-[#2E1C12] text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md shadow-[#3E2723]/20 hover:-translate-y-0.5 active:translate-y-0 cursor-pointer flex items-center justify-center gap-2"
                >
                  <span>Thêm vào giỏ hàng</span>
                  <span>•</span>
                  <span>{totalPrice.toLocaleString("vi-VN")}đ</span>
                </button>
              </div>
            </div>

          </div>

        </div>

      </div>

      {/* Toast thông báo thêm giỏ hàng thành công (Cố định ở phía dưới màn hình) */}
      {isAddedSuccess && (
        <div className="fixed bottom-20 md:bottom-8 left-1/2 -translate-x-1/2 z-50 max-w-lg w-[calc(100%-2rem)] sm:w-auto animate-in fade-in slide-in-from-bottom-5 duration-300">
          <div className="bg-[#24130A]/95 backdrop-blur-md border border-[#5A3825] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center justify-between gap-4 sm:gap-6">
            <div className="flex items-center gap-3 text-xs sm:text-sm">
              <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black shrink-0 shadow-sm">
                ✓
              </span>
              <div className="leading-tight">
                <p className="font-bold text-white">Thêm vào giỏ thành công!</p>
                <p className="text-[#C4B5A5] text-xs mt-0.5">
                  {quantity}x {product?.name} (Size {selectedSize})
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <Link
                href="/cart"
                className="bg-[#D7A86E] hover:bg-[#C5965C] text-[#24130A] text-xs font-extrabold px-3.5 py-2 rounded-xl transition-all shadow-sm flex items-center gap-1 cursor-pointer"
              >
                <span>Xem giỏ hàng</span>
                <span>&rarr;</span>
              </Link>
              <button
                type="button"
                onClick={() => setIsAddedSuccess(false)}
                className="w-7 h-7 rounded-lg hover:bg-white/10 text-[#C4B5A5] hover:text-white flex items-center justify-center text-xs transition cursor-pointer"
                aria-label="Đóng thông báo"
              >
                ✕
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
=======
export { default } from "./pageProduct";
>>>>>>> 2616c841fe24e488017309b91afe6d645bf87daf
