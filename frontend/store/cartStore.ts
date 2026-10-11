import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './authStore';

export interface CartItem {
  cartItemId: string;
  productId: number;
  name: string;
  price: number;
  size: string;
  toppings: string[];
  quantity: number;
}

interface CartStore {
  items: CartItem[];
  cartsByUser: Record<string, CartItem[]>;
  activeUserEmail: string | null;

  addToCart: (newItem: CartItem) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  loadCartForUser: (email: string) => void;
  clearActiveCart: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartsByUser: {},
      activeUserEmail: null,

      // Thêm vào giỏ (hỗ trợ cả khách vãng lai chưa đăng nhập)
      addToCart: (newItem) =>
        set((state) => {
          const authUser = useAuthStore.getState().user;
          const email = authUser?.email;

          const currentItems = state.items;

          const normalizedItem: CartItem = {
            ...newItem,
            productId: Number(newItem.productId),
            price: Number(newItem.price),
            quantity: Number(newItem.quantity),
          };

          const existingItemIndex = currentItems.findIndex(
            (item) => item.cartItemId === normalizedItem.cartItemId
          );

          let updatedItems: CartItem[];

          if (existingItemIndex !== -1) {
            updatedItems = [...currentItems];
            updatedItems[existingItemIndex] = {
              ...updatedItems[existingItemIndex],
              quantity:
                Number(updatedItems[existingItemIndex].quantity) +
                Number(normalizedItem.quantity || 1),
            };
          } else {
            updatedItems = [...currentItems, normalizedItem];
          }

          return {
            items: updatedItems,
            cartsByUser: email
              ? {
                  ...state.cartsByUser,
                  [email]: updatedItems,
                }
              : state.cartsByUser,
            activeUserEmail: email || state.activeUserEmail,
          };
        }),

      // Xóa khỏi giỏ
      removeFromCart: (cartItemId) =>
        set((state) => {
          const updatedItems = state.items.filter(
            (item) => item.cartItemId !== cartItemId
          );

          return {
            items: updatedItems,
            cartsByUser: state.activeUserEmail
              ? {
                  ...state.cartsByUser,
                  [state.activeUserEmail]: updatedItems,
                }
              : state.cartsByUser,
          };
        }),

      // Cập nhật số lượng
      updateQuantity: (cartItemId, quantity) =>
        set((state) => {
          const updatedItems = state.items.map((item) =>
            item.cartItemId === cartItemId
              ? {
                  ...item,
                  quantity: Math.max(1, quantity),
                }
              : item
          );

          return {
            items: updatedItems,
            cartsByUser: state.activeUserEmail
              ? {
                  ...state.cartsByUser,
                  [state.activeUserEmail]: updatedItems,
                }
              : state.cartsByUser,
          };
        }),

      // Load giỏ hàng của tài khoản (giữ lại các món khách vừa chọn trước khi đăng nhập)
      loadCartForUser: (email) =>
        set((state) => {
          const savedUserItems = state.cartsByUser[email] ?? [];
          // Nếu khách đã thêm món vào giỏ trước khi đăng nhập, ưu tiên dùng món hiện có
          const effectiveItems =
            state.items.length > 0 ? state.items : savedUserItems;

          return {
            activeUserEmail: email,
            items: effectiveItems,
            cartsByUser: {
              ...state.cartsByUser,
              [email]: effectiveItems,
            },
          };
        }),

      // Đăng xuất thì bỏ tài khoản đang active nhưng vẫn giữ món
      clearActiveCart: () =>
        set({
          items: [],
        }),
    }),
    {
      name: 'cart-storage',
    }
  )
);

// Kiểm tra tài khoản đang có giỏ hàng
export const getActiveCartUser = () =>
  useCartStore.getState().activeUserEmail;