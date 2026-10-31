/**
 * useCheckoutTimer
 *
 * Single source of truth cho toàn bộ logic thời gian checkout.
 * Chỉ cần thay đổi CHECKOUT_DURATION_MINUTES ở đây là đủ,
 * tất cả frontend sẽ tự động đồng bộ.
 *
 *     Nếu thay đổi CHECKOUT_DURATION_MINUTES, nhớ cập nhật
 *     cùng giá trị tại backend: payments.service.ts
 *     expiredAt: Math.floor(Date.now() / 1000) + CHECKOUT_DURATION_MINUTES * 60
 */

import { useState, useEffect, useCallback } from 'react';
import { useCartStore } from '@/store/cartStore';

// ─── Hằng số thời gian (phút) ────────────────────────────────────────────────
/** Thời gian giữ đơn hàng (phút). Đồng bộ với PayOS expiredAt ở backend. */
export const CHECKOUT_DURATION_MINUTES = 5;

/** Thời gian tính bằng giây (dùng cho useState khởi tạo). */
export const CHECKOUT_DURATION_SECONDS = CHECKOUT_DURATION_MINUTES * 60;

/** Thời gian tính bằng milliseconds (dùng cho Date.now() + ...). */
export const CHECKOUT_DURATION_MS = CHECKOUT_DURATION_MINUTES * 60 * 1000;

// ─── Helpers ─────────────────────────────────────────────────────────────────
/**
 * Định dạng số giây thành chuỗi MM:SS.
 * @example formatTimer(90) → "01:30"
 */
export function formatTimer(totalSeconds: number): string {
  const mins = Math.floor(totalSeconds / 60);
  const secs = totalSeconds % 60;
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

// ─── Hook ─────────────────────────────────────────────────────────────────────
interface UseCheckoutTimerOptions {
  /** Callback gọi khi đồng hồ về 0. */
  onTimeout: () => void | Promise<void>;
  /** Chỉ chạy sau khi Zustand đã hydrate (client-side). */
  enabled: boolean;
}

interface UseCheckoutTimerReturn {
  /** Số giây còn lại. */
  secondsLeft: number;
  /** Chuỗi MM:SS hiển thị. */
  timerDisplay: string;
  /** true khi còn ≤ 60 giây (để đổi màu cảnh báo). */
  isUrgent: boolean;
}

/**
 * Hook quản lý đồng hồ đếm ngược checkout.
 *
 * Sử dụng:
 * ```tsx
 * const { secondsLeft, timerDisplay, isUrgent } = useCheckoutTimer({
 *   enabled: hasHydrated,
 *   onTimeout: handleTimeout,
 * });
 * ```
 */
export function useCheckoutTimer({
  onTimeout,
  enabled,
}: UseCheckoutTimerOptions): UseCheckoutTimerReturn {
  const checkoutExpiresAt = useCartStore((s) => s.checkoutExpiresAt);

  const [secondsLeft, setSecondsLeft] = useState<number>(CHECKOUT_DURATION_SECONDS);

  const stableOnTimeout = useCallback(() => { onTimeout(); }, [onTimeout]);

  useEffect(() => {
    if (!enabled || !checkoutExpiresAt) return;

    const tick = () => {
      const diff = Math.max(0, Math.floor((checkoutExpiresAt - Date.now()) / 1000));
      setSecondsLeft(diff);
      if (diff <= 0) {
        stableOnTimeout();
      }
    };

    tick(); // chạy ngay lần đầu
    const timer = setInterval(tick, 1000);
    return () => clearInterval(timer);
  }, [enabled, checkoutExpiresAt, stableOnTimeout]);

  return {
    secondsLeft,
    timerDisplay: formatTimer(secondsLeft),
    isUrgent: secondsLeft <= 60,
  };
}
