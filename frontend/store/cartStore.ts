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

  // Trạng thái giữ hàng khi đang trong phiên checkout
  checkoutItems: CartItem[];
  checkoutExpiresAt: number | null; // Timestamp (ms) hết hạn (khoảng 5-6 phút)
  pendingOrderId: number | null; // ID đơn hàng PENDING đã trừ tồn kho ở backend

  setPendingOrderId: (orderId: number | null) => void;
  addToCart: (newItem: CartItem) => void;
  removeFromCart: (cartItemId: string) => void;
  updateQuantity: (cartItemId: string, quantity: number) => void;
  loadCartForUser: (email: string) => void;
  clearActiveCart: () => void;

  // Bắt đầu thanh toán: đưa món từ cart sang checkoutItems, làm rỗng cart ngay lập tức
  startCheckout: (durationMinutes?: number, orderId?: number | null) => void;
  // Hoàn trả các món từ checkoutItems về lại cart khi hết giờ hoặc hủy
  restoreCheckoutToCart: () => void;
  // Xóa checkoutItems khi đơn hàng thanh toán thành công
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

      // Bắt đầu thanh toán: chuyển món từ giỏ hàng sang checkoutItems và làm trống giỏ
      startCheckout: (durationMinutes = CHECKOUT_DURATION_MINUTES, orderId?: number | null) =>
        set((state) => {
          const authUser = useAuthStore.getState().user;
          const email = authUser?.email || state.activeUserEmail;
          const currentItems = state.items && state.items.length > 0 ? state.items : (state.checkoutItems || []);
          const expiresAt = Date.now() + durationMinutes * 60 * 1000;

          return {
            items: [], // Làm rỗng giỏ hàng ngay khi nhấn thanh toán
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

      // Hoàn trả các món từ checkoutItems về lại cart khi hết hạn hoặc hủy
      restoreCheckoutToCart: () =>
        set((state) => {
          const authUser = useAuthStore.getState().user;
          const email = authUser?.email || state.activeUserEmail;

          // Lấy món cần hoàn: ưu tiên checkoutItems, fallback items
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

      // Xóa checkoutItems khi thanh toán hoàn tất thành công
      clearCheckoutItems: () =>
        set({
          checkoutItems: [],
          checkoutExpiresAt: null,
          pendingOrderId: null,
        }),

      // Đăng xuất thì bỏ tài khoản đang active nhưng vẫn giữ món
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

// Kiểm tra tài khoản đang có giỏ hàng
export const getActiveCartUser = () =>
  useCartStore.getState().activeUserEmail;
