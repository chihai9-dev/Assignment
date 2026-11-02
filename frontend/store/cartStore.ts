import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { useAuthStore } from './authStore';
import { CHECKOUT_DURATION_MINUTES } from '@/hooks/useCheckoutTimer';

export interface CartItem {
  cartItemId: string;
  productId: number;
  name: string;
  price: number;
  size: string;
  toppings: string[];
  quantity: number;
  imageUrl?: string;
}

interface CartStore {
  items: CartItem[];
  cartsByUser: Record<string, CartItem[]>;
  activeUserEmail: string | null;

  checkoutItems: CartItem[];
  checkoutExpiresAt: number | null;
  pendingOrderId: number | null;

  setPendingOrderId: (orderId: number | null) => void;
  addToCart: (newItem: CartItem) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  loadCartForUser: (email: string) => void;
  clearActiveCart: () => void;

  startCheckout: (durationMinutes?: number, orderId?: number | null) => void;
  restoreCheckoutToCart: () => void;
  clearCheckoutItems: () => void;
}

export const useCartStore = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      cartsByUser: {},
      activeUserEmail: null,
      checkoutItems: [],
      checkoutExpiresAt: null,
      pendingOrderId: null,

      setPendingOrderId: (orderId) => set({ pendingOrderId: orderId }),

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

      loadCartForUser: (email) =>
        set((state) => {
          const savedUserItems = state.cartsByUser[email] ?? [];
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

      startCheckout: (durationMinutes = CHECKOUT_DURATION_MINUTES, orderId?: number | null) =>
        set((state) => {
          const authUser = useAuthStore.getState().user;
          const email = authUser?.email || state.activeUserEmail;
          const currentItems = state.items && state.items.length > 0 ? state.items : (state.checkoutItems || []);
          const expiresAt = Date.now() + durationMinutes * 60 * 1000;

          return {
            items: [],
            checkoutItems: [...currentItems],
            checkoutExpiresAt: expiresAt,
            pendingOrderId: orderId !== undefined ? orderId : state.pendingOrderId,
            cartsByUser: email
              ? {
                  ...state.cartsByUser,
                  [email]: [],
                }
              : state.cartsByUser,
          };
        }),

      restoreCheckoutToCart: () =>
        set((state) => {
          const authUser = useAuthStore.getState().user;
          const email = authUser?.email || state.activeUserEmail;

          const source = (state.checkoutItems && state.checkoutItems.length > 0) ? state.checkoutItems : state.items;
          if (!source || source.length === 0) {
            return state;
          }

          const restoredItems = [...source];

          return {
            items: restoredItems,
            checkoutItems: [],
            checkoutExpiresAt: null,
            pendingOrderId: null,
            cartsByUser: email
              ? {
                  ...state.cartsByUser,
                  [email]: restoredItems,
                }
              : state.cartsByUser,
          };
        }),

      clearCheckoutItems: () =>
        set({
          checkoutItems: [],
          checkoutExpiresAt: null,
          pendingOrderId: null,
        }),

      clearActiveCart: () =>
        set({
          items: [],
        }),
    }),
    {
      name: 'cart-storage',
      partialize: (state) => ({
        items: state.items,
        cartsByUser: state.cartsByUser,
        activeUserEmail: state.activeUserEmail,
        checkoutItems: state.checkoutItems,
        checkoutExpiresAt: state.checkoutExpiresAt,
        pendingOrderId: state.pendingOrderId,
      }),
    }
  )
);

export const getActiveCartUser = () =>
  useCartStore.getState().activeUserEmail;
