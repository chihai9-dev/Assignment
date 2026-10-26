export const ProductSize = { S: "S", M: "M", L: "L" } as const;
export type ProductSizeKey = (typeof ProductSize)[keyof typeof ProductSize];

export const OrderStatus = {
  PENDING: "PENDING",
  PAID: "PAID",
  PREPARING: "PREPARING",
  READY: "READY",
  COMPLETED: "COMPLETED",
  PAYMENT_FAILED: "PAYMENT_FAILED",
  CANCELLED: "CANCELLED",
} as const;
export type OrderStatusType = (typeof OrderStatus)[keyof typeof OrderStatus];

export const PaymentMethod = { WALLET: "WALLET", CARD: "CARD" } as const;
export type PaymentMethodType = (typeof PaymentMethod)[keyof typeof PaymentMethod];

export const ProductStatus = { ACTIVE: "active", INACTIVE: "inactive" } as const;
export type ProductStatusType = (typeof ProductStatus)[keyof typeof ProductStatus];

export const UserRole = { CUSTOMER: "customer", BARISTA: "barista" } as const;
export type UserRoleType = (typeof UserRole)[keyof typeof UserRole];


export interface ProductSizeOption {
  key: ProductSizeKey;
  label?: string;
  extraPrice: number;
}

export interface Category {
  id: number;
  name: string;
}

export interface Product {
  id: number; 
  name: string;
  price: number; 
  imageUrl?: string;
  stock?: number;
  status?: ProductStatusType;
  description?: string; 
  sizes?: ProductSizeOption[];
  categoryId?: number | null;
  category?: Category | null;
}

export interface ToppingItem {
  id: number;
  name: string;
  price: number;
  isAvailable?: boolean;
}

export interface AuthUser {
  id: number;
  email: string;
  role?: UserRoleType;
  loyaltyPoints?: number;
}