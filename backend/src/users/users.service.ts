import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import { PrismaService } from '../prisma/prisma.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { PaginationQueryDto } from './dto/pagination-query.dto';

// Không bao giờ trả passwordHash
const userSelect = {
  id: true,
  email: true,
  loyaltyPoints: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateUserDto) {
    const passwordHash = await bcrypt.hash(dto.password, 10);
    try {
      return await this.prisma.user.create({
        data: { email: dto.email, passwordHash },
        select: userSelect,
      });
    } catch (e) {
      this.handleError(e);
    }
  }

  async findAll({ page, limit }: PaginationQueryDto) {
    const [items, total] = await this.prisma.$transaction([
      this.prisma.user.findMany({
        select: userSelect,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { id: 'desc' },
      }),
      this.prisma.user.count(),
    ]);
    return { items, total, page, limit };
  }

  async findOne(id: number) {
    const user = await this.prisma.user.findUnique({ where: { id }, select: userSelect });
    if (!user) throw new NotFoundException(`User ${id} không tồn tại`);
    return user;
  }

  async update(id: number, dto: UpdateUserDto) {
    const data: Prisma.UserUpdateInput = {};
    if (dto.email) data.email = dto.email;
    if (dto.password) data.passwordHash = await bcrypt.hash(dto.password, 10);

    try {
      return await this.prisma.user.update({ where: { id }, data, select: userSelect });
    } catch (e) {
      this.handleError(e, id);
    }
  }

  async remove(id: number) {
    try {
      await this.prisma.user.delete({ where: { id } });
    } catch (e) {
      this.handleError(e, id);
    }
  }

  // Dùng nội bộ cho Auth module (login cần passwordHash)
  findByEmailWithHash(email: string) {
    return this.prisma.user.findUnique({ where: { email } });
  }

  // Chỉ hệ thống gọi, không có endpoint public
  addLoyaltyPoints(userId: number, points: number) {
    return this.prisma.user.update({
      where: { id: userId },
      data: { loyaltyPoints: { increment: points } },
      select: userSelect,
    });
  }

  private handleError(e: unknown, id?: number): never {
    if (e instanceof Prisma.PrismaClientKnownRequestError) {
      if (e.code === 'P2002') throw new ConflictException('Email đã được sử dụng');
      if (e.code === 'P2025') throw new NotFoundException(`User ${id} không tồn tại`);
      // P2003: xóa user đang có Order (FK) -> nên xử lý riêng nếu cần
    }
    throw e;
  }
}