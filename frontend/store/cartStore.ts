import { create } from 'zustand';
import { persist } from 'zustand/middleware';
export interface CartItem {
  cartItemId: string; // ID duy nhất kết hợp từ id món + size + topping
  productId: number;
  name: string;
  price: number; // Giá của 1 ly (đã cộng size và topping)
  size: string;
  toppings: string[];
  quantity: number;
}

interface CartState {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      // Thêm vào giỏ
      addToCart: (newItem) => set((state) => {
        // Kiểm tra xem món đó (cùng size, cùng topping) đã có trong giỏ chưa
        const existingItem = state.items.find(item => item.cartItemId === newItem.cartItemId);
        if (existingItem) {
          // Nếu có rồi thì chỉ tăng số lượng
          return {
            items: state.items.map(item =>
              item.cartItemId === newItem.cartItemId
                ? { ...item, quantity: item.quantity + newItem.quantity }
                : item
            )
          };
        }
        // Nếu chưa có thì thêm mới vào mảng
        return { items: [...state.items, newItem] };
      }),
      
      // Xóa khỏi giỏ
      removeFromCart: (cartItemId) => set((state) => ({
        items: state.items.filter(item => item.cartItemId !== cartItemId)
      })),
      
      // Cập nhật số lượng (+ / -)
      updateQuantity: (cartItemId, quantity) => set((state) => ({
        items: state.items.map(item =>
          item.cartItemId === cartItemId
            ? { ...item, quantity: Math.max(1, quantity) } // Đảm bảo số lượng không rớt xuống dưới 1
            : item
        )
      }))
    }),
    {
      name: 'brewlite-cart-storage', // Tên key sẽ lưu trong Local Storage của trình duyệt
    }
  )
);