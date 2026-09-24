import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 

@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

  // Lấy danh sách sản phẩm (menu)
  async findAll() {
    return this.prisma.product.findMany({
      // Tuỳ chọn: Chỉ lấy những sản phẩm còn hàng (stock > 0)
      // where: { stock: { gt: 0 } }, 
      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  // Lấy chi tiết một sản phẩm theo ID
  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
    });

    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID ${id}`);
    }

    return product;
  }
}