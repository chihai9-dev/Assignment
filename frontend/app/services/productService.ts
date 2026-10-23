import { fetchApi, assetUrl } from "../api";
import { Product } from "../types";

interface ApiResponse<T> {
  data?: T;
  message?: string;
}

// 1. Lấy tất cả sản phẩm (Cho Trang Chủ)
export async function fetchAllProducts(): Promise<Product[]> {
  try {
    const res = await fetchApi<ApiResponse<Product[]> | Product[]>("/products");
    const data = (res as ApiResponse<Product[]>).data || (res as Product[]);

    if (!Array.isArray(data)) return [];

    return data.map((p) => ({
      id: Number(p.id),
      name: p.name,
      price: Number(p.price),
      imageUrl: p.imageUrl
        ? p.imageUrl.startsWith("http")
          ? p.imageUrl
          : assetUrl(p.imageUrl)
        : "",
      description: p.description || "",
      categoryId: p.categoryId ? Number(p.categoryId) : undefined,
      category: p.category ? { id: Number(p.category.id), name: p.category.name } : null,
    }));
  } catch (error) {
    console.error("Lỗi khi lấy danh sách sản phẩm:", error);
    return [];
  }
}

// 2. Lấy chi tiết 1 sản phẩm theo ID (Cho Trang Chi Tiết)
export async function fetchProductById(id: string): Promise<Product | null> {
  const res = await fetchApi<ApiResponse<Product> | Product>(`/products/${id}`);
  const p = (res as ApiResponse<Product>).data || (res as Product);

  if (!p || !p.id) return null;

  const imageUrl = p.imageUrl
    ? p.imageUrl.startsWith("http")
      ? p.imageUrl
      : assetUrl(p.imageUrl)
    : "";

  return {
    id: Number(p.id),
    name: p.name,
    price: Number(p.price),
    imageUrl,
    description: p.description || "Chưa có mô tả cho sản phẩm này.",
  };
}
