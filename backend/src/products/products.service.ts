<<<<<<< HEAD
import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service'; 

=======
import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
>>>>>>> 2616c841fe24e488017309b91afe6d645bf87daf
@Injectable()
export class ProductsService {
  constructor(private prisma: PrismaService) {}

<<<<<<< HEAD
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
=======
  async create(createProductDto: CreateProductDto) {
    return this.prisma.product.create({
      data: createProductDto,
      include: { category: true },
    });
  }
  async findAll() {
    return this.prisma.product.findMany({
      where: {status: 'active'},
      orderBy: { createdAt: 'asc' },
      include: { category: true },
    });
  }
   async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!product) {
      throw new NotFoundException(`Không tìm thấy sản phẩm với ID: ${id}`);
    }
    return product;
  }

  async update(id: number, updateProductDto: UpdateProductDto){
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: updateProductDto,
      include: { category: true },
    });
  }
  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.product.update({
      where: { id },
      data: { status: 'inactive' },
    });
>>>>>>> 2616c841fe24e488017309b91afe6d645bf87daf
  }
}