import { create } from 'zustand';

export interface CartItem {
  cartItemId: string; // ID duy nhất kết hợp từ id món + size + topping
  productId: number;
  name: string;
  price: number; // Giá của 1 ly (đã cộng size và topping)
  size: string;
  toppings: string[];
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  addToCart: (item: CartItem) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
}

export const useCartStore = create<CartStore>((set) => ({
  items: [],
  
  // Thêm vào giỏ
  addToCart: (newItem) => set((state) => {
    const existingItemIndex = state.items.findIndex(item => item.cartItemId === newItem.cartItemId);
    if (existingItemIndex !== -1) {
      // Nếu món y hệt đã có trong giỏ -> Tăng số lượng
      const updatedItems = [...state.items];
      updatedItems[existingItemIndex].quantity += 1;
      return { items: updatedItems };
    }
    // Nếu là món mới -> Thêm mới
    return { items: [...state.items, newItem] };
  }),

  // Xóa khỏi giỏ
  removeFromCart: (cartItemId) => set((state) => ({
    items: state.items.filter(item => item.cartItemId !== cartItemId)
  })),

  // Cập nhật số lượng
  updateQuantity: (cartItemId, quantity) => set((state) => ({
    items: state.items.map(item => 
      item.cartItemId === cartItemId ? { ...item, quantity: Math.max(1, quantity) } : item
    )
  })),
}));