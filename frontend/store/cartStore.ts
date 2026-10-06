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

      // Thêm vào giỏ
      addToCart: (newItem) =>
        set((state) => {
          const authUser = useAuthStore.getState().user;
          const email = authUser?.email;

          if (!email) {
            return state;
          }

          const currentItems =
            state.cartsByUser[email] ?? [];

          const normalizedItem: CartItem = {
            ...newItem,
            productId: Number(newItem.productId),
            price: Number(newItem.price),
            quantity: Number(newItem.quantity),
          };

          const existingItemIndex =
            currentItems.findIndex(
              (item) =>
                item.cartItemId ===
                normalizedItem.cartItemId
            );

          let updatedItems: CartItem[];

          if (existingItemIndex !== -1) {
            updatedItems = [...currentItems];

            updatedItems[existingItemIndex] = {
              ...updatedItems[existingItemIndex],
              quantity:
                Number(
                  updatedItems[existingItemIndex].quantity
                ) + 1,
            };
          } else {
            updatedItems = [
              ...currentItems,
              normalizedItem,
            ];
          }

          return {
            activeUserEmail: email,
            items: updatedItems,
            cartsByUser: {
              ...state.cartsByUser,
              [email]: updatedItems,
            },
          };
        }),

      // Xóa khỏi giỏ
      removeFromCart: (cartItemId) =>
        set((state) => {
          if (!state.activeUserEmail) {
            return state;
          }

          const updatedItems = (
            state.cartsByUser[
              state.activeUserEmail
            ] ?? []
          ).filter(
            (item) =>
              item.cartItemId !== cartItemId
          );

          return {
            items: updatedItems,
            cartsByUser: {
              ...state.cartsByUser,
              [state.activeUserEmail]:
                updatedItems,
            },
          };
        }),

      // Cập nhật số lượng
      updateQuantity: (cartItemId, quantity) =>
        set((state) => {
          if (!state.activeUserEmail) {
            return state;
          }

          const updatedItems = (
            state.cartsByUser[
              state.activeUserEmail
            ] ?? []
          ).map((item) =>
            item.cartItemId === cartItemId
              ? {
                  ...item,
                  quantity: Math.max(1, quantity),
                }
              : item
          );

          return {
            items: updatedItems,
            cartsByUser: {
              ...state.cartsByUser,
              [state.activeUserEmail]:
                updatedItems,
            },
          };
        }),

      // Load giỏ hàng của tài khoản
      loadCartForUser: (email) =>
        set((state) => {
          const userItems = state.cartsByUser[email] ?? [];

          return {
            activeUserEmail: email,
            items: userItems,
          };
        }),
      // Đăng xuất thì bỏ tài khoản đang active
      // nhưng KHÔNG xóa cartsByUser
      clearActiveCart: () =>
        set({
          activeUserEmail: null,
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