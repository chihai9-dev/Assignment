export enum ProductSize {
  S = "S",
  M = "M",
  L = "L",
}

export type ProductSizeKey = keyof typeof ProductSize;

export interface Product {
  id: number;
  name: string;
  price: number;
  imageUrl: string;
  description?: string;
  categoryId?: number;
}

export interface ToppingItem {
  id: number;
  name: string;
  price: number;
}
export enum UserRole {
  CUSTOMER = "customer",
  BARISTA = "barista",
}

export interface AuthUser {
  id: number;
  email: string;
  role?: UserRole | string;
  loyaltyPoints?: number;
}