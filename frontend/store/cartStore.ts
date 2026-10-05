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

interface CartStore {
  items: CartItem[]; // giỏ hàng đang hiển thị (luôn = cartsByUser[activeUserEmail])

  // Lưu giỏ hàng riêng cho từng tài khoản, key là email. Dữ liệu này được
  // persist xuống localStorage nên tắt trình duyệt/đăng xuất rồi vào lại
  // vẫn giữ đúng giỏ hàng của từng người.
  cartsByUser: Record<string, CartItem[]>;
  activeUserEmail: string | null;

  addToCart: (item: CartItem) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;

  // Gọi khi đăng nhập thành công: nạp đúng giỏ hàng đã lưu của tài khoản đó
  loadCartForUser: (email: string) => void;
  // Gọi khi đăng xuất: ẩn giỏ hàng đi (dữ liệu vẫn còn trong cartsByUser, chờ đăng nhập lại)
  clearActiveCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartsByUser: {},
      activeUserEmail: null,

      // Thêm vào giỏ
      addToCart: (newItem) => set((state) => {
        if (!state.activeUserEmail) return state; // an toàn: chưa đăng nhập thì không có giỏ để thêm

        const currentItems = state.cartsByUser[state.activeUserEmail] ?? [];
        const existingItemIndex = currentItems.findIndex(item => item.cartItemId === newItem.cartItemId);

        let updatedItems: CartItem[];
        if (existingItemIndex !== -1) {
          // Nếu món y hệt đã có trong giỏ -> Tăng số lượng
          updatedItems = [...currentItems];
          updatedItems[existingItemIndex] = {
            ...updatedItems[existingItemIndex],
            quantity: updatedItems[existingItemIndex].quantity + 1,
          };
        } else {
          // Nếu là món mới -> Thêm mới
          updatedItems = [...currentItems, newItem];
        }

        return {
          items: updatedItems,
          cartsByUser: { ...state.cartsByUser, [state.activeUserEmail]: updatedItems },
        };
      }),

      // Xóa khỏi giỏ
      removeFromCart: (cartItemId) => set((state) => {
        if (!state.activeUserEmail) return state;
        const updatedItems = (state.cartsByUser[state.activeUserEmail] ?? []).filter(
          item => item.cartItemId !== cartItemId,
        );
        return {
          items: updatedItems,
          cartsByUser: { ...state.cartsByUser, [state.activeUserEmail]: updatedItems },
        };
      }),

      // Cập nhật số lượng
      updateQuantity: (cartItemId, quantity) => set((state) => {
        if (!state.activeUserEmail) return state;
        const updatedItems = (state.cartsByUser[state.activeUserEmail] ?? []).map(item =>
          // Giữ nguyên logic không cho giảm số lượng dưới 1
          item.cartItemId === cartItemId ? { ...item, quantity: Math.max(1, quantity) } : item,
        );
        return {
          items: updatedItems,
          cartsByUser: { ...state.cartsByUser, [state.activeUserEmail]: updatedItems },
        };
      }),

      loadCartForUser: (email) => set((state) => ({
        activeUserEmail: email,
        items: state.cartsByUser[email] ?? [],
      })),

      clearActiveCart: () => set({ activeUserEmail: null, items: [] }),
    }),
    {
      name: 'cart-storage', // Tên key sẽ được lưu trữ trong trình duyệt (gồm cả cartsByUser)
    }
  )
);

// Hàm tiện ích: kiểm tra đã đăng nhập chưa trước khi cho thêm vào giỏ (dùng ở trang chi tiết sản phẩm)
export const getActiveCartUser = () => useCartStore.getState().activeUserEmail;
