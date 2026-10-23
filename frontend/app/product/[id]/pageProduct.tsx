"use client";

import { useParams, useRouter } from "next/navigation";
import { useState, useMemo } from "react";
import Link from "next/link";
// Import dùng chung từ thư mục app/ ngoài cùng
import { useProductDetail } from "../../hooks/useProductDetail";
import { useToppings } from "../../hooks/useToppings";
import { ProductSize, ProductSizeKey } from "../../types";
import { useCartStore } from "../../../store/cartStore"; // Hoặc đường dẫn cartStore của bạn
import {
  ArrowLeftIcon,
  PlusIcon,
  MinusIcon,
  CoffeeCupIcon,
} from "../../components/Icons";

const SIZE_PRICES: Record<ProductSizeKey, number> = {
  [ProductSize.S]: 0,
  [ProductSize.M]: 5000,
  [ProductSize.L]: 10000,
};

export default function ProductDetailPage() {
  const params = useParams();
  const router = useRouter();
  const addToCart = useCartStore((state) => state.addToCart);

  const productIdStr = String(params?.id || "");

  // Gọi hooks dùng chung
  const { product, isLoading, error } = useProductDetail(productIdStr);
  const { toppingsList, selectedToppings, handleToppingToggle } = useToppings();

  const [selectedSize, setSelectedSize] = useState<ProductSizeKey>(
    ProductSize.M,
  );
  const [quantity, setQuantity] = useState<number>(1);
  const [activeImage, setActiveImage] = useState<string>("");
  const [isAddedSuccess, setIsAddedSuccess] = useState<boolean>(false);

  const currentImage = activeImage || product?.imageUrl || "";

  const unitPrice = useMemo(() => {
    if (!product) return 0;
    const base = Number(product.price);
    const sizeExtra = SIZE_PRICES[selectedSize] || 0;
    const toppingsExtra = selectedToppings.reduce((sum, name) => {
      const found = toppingsList.find((t) => t.name === name);
      return sum + (found ? Number(found.price) : 0);
    }, 0);
    return base + sizeExtra + toppingsExtra;
  }, [product, selectedSize, selectedToppings, toppingsList]);

  const totalPrice = unitPrice * quantity;

  const handleAddToCart = () => {
    if (!product) return;

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

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#FBF8F2] flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <div className="w-10 h-10 border-4 border-[#3E2723] border-t-transparent rounded-full animate-spin mx-auto" />
          <p className="text-sm font-semibold text-[#8D6E63]">
            Đang tải dữ liệu sản phẩm...
          </p>
        </div>
      </div>
    );
  }

  if (!product || error) {
    return (
      <div className="min-h-screen bg-[#FBF8F2] flex items-center justify-center p-6 text-center">
        <div className="bg-white p-8 rounded-2xl border border-[#E8DFD8] shadow-sm max-w-md">
          <CoffeeCupIcon className="w-12 h-12 text-[#8D6E63] mx-auto mb-3" />
          <h2 className="text-xl font-bold text-[#3E2723]">
            Không tìm thấy đồ uống
          </h2>
          <p className="text-sm text-gray-500 mt-2 mb-6">
            {error || "Món bạn tìm kiếm không tồn tại hoặc đã ngừng phục vụ."}
          </p>
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
        <div>
          <button
            onClick={() => router.back()}
            className="inline-flex items-center gap-2 text-sm font-semibold text-[#8D6E63] hover:text-[#3E2723] transition-colors cursor-pointer group"
          >
            <ArrowLeftIcon className="w-4 h-4 transition-transform group-hover:-translate-x-1" />
            <span>Quay lại Menu</span>
          </button>
        </div>

        <div className="bg-white border border-[#E8DFD8] rounded-3xl p-6 sm:p-10 shadow-sm grid grid-cols-1 md:grid-cols-12 gap-8 lg:gap-12">
          {/* Ảnh sản phẩm */}
          <div className="md:col-span-5 space-y-4">
            <div className="relative aspect-square w-full rounded-2xl overflow-hidden bg-[#F5F0E6] border border-[#E8DFD8] shadow-inner group">
              <img
                src={currentImage}
                alt={product.name}
                className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
              />
            </div>
          </div>

          {/* Chi tiết & Tùy chọn */}
          <div className="md:col-span-7 flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div>
                <h1 className="text-3xl sm:text-4xl font-extrabold text-[#3E2723] tracking-tight">
                  {product.name}
                </h1>
                <p className="text-2xl sm:text-3xl font-extrabold text-[#3E2723] mt-2">
                  {unitPrice.toLocaleString("vi-VN")}đ
                </p>
                <p className="text-sm text-[#756C65] mt-3 leading-relaxed">
                  {product.description}
                </p>
              </div>

              <hr className="border-[#E8DFD8]" />

              {/* Chọn Size */}
              <div className="space-y-2.5">
                <label className="block text-sm font-bold text-[#3E2723]">
                  Chọn size
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {Object.values(ProductSize).map((size) => {
                    const isSelected = selectedSize === size;
                    const priceDiff = SIZE_PRICES[size];
                    const displayPrice = Number(product.price) + priceDiff;

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
                        <div
                          className={`text-xs mt-0.5 ${
                            isSelected ? "text-white/80" : "text-[#8D6E63]"
                          }`}
                        >
                          {displayPrice.toLocaleString("vi-VN")}đ
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Chọn Topping */}
              {toppingsList.length > 0 && (
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
              )}
            </div>

            {/* Số lượng & Nút thêm giỏ hàng */}
            <div className="pt-6 border-t border-[#E8DFD8] space-y-4">
              <div className="flex items-center gap-4">
                <div className="flex items-center border border-[#E8DFD8] rounded-xl bg-[#FDFBF7] p-1">
                  <button
                    type="button"
                    onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                    disabled={quantity <= 1}
                    className="w-9 h-9 flex items-center justify-center text-[#3E2723] hover:bg-[#F5F0E6] rounded-lg disabled:opacity-30 cursor-pointer"
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

                <button
                  type="button"
                  onClick={handleAddToCart}
                  className="flex-1 bg-[#3E2723] hover:bg-[#2E1C12] text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
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

      {/* Toast thông báo */}
      {isAddedSuccess && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-50 animate-in fade-in slide-in-from-bottom-5">
          <div className="bg-[#24130A]/95 backdrop-blur-md border border-[#5A3825] text-white px-5 py-3.5 rounded-2xl shadow-2xl flex items-center gap-4">
            <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center text-xs font-black">
              ✓
            </span>
            <div className="text-xs sm:text-sm">
              <p className="font-bold">Thêm vào giỏ thành công!</p>
              <p className="text-[#C4B5A5] text-xs">
                {quantity}x {product.name} (Size {selectedSize})
              </p>
            </div>
            <Link
              href="/cart"
              className="bg-[#D7A86E] text-[#24130A] text-xs font-extrabold px-3.5 py-2 rounded-xl"
            >
              Xem giỏ hàng &rarr;
            </Link>
          </div>
        </div>
      )}
    </main>
  );
}
