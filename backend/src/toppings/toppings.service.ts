import { Injectable } from '@nestjs/common';
import { CreateToppingDto } from './dto/create-topping.dto';
import { UpdateToppingDto } from './dto/update-topping.dto';
import { PrismaService } from '../prisma/prisma.service';
@Injectable()
export class ToppingsService {
  private defaultToppings = [
    { id: 1, name: 'Trân châu', price: 5000 },
    { id: 2, name: 'Thạch trái cây', price: 5000 },
    { id: 3, name: 'Kem cheese', price: 10000 },
  ];

  constructor(private readonly prisma: PrismaService) {}

  async create(createToppingDto: CreateToppingDto) {
    if ((this.prisma as any).topping) {
      return (this.prisma as any).topping.create({ data: createToppingDto });
    }
    const item = { id: this.defaultToppings.length + 1, ...createToppingDto };
    this.defaultToppings.push(item);
    return item;
  }

  async findAll() {
    if ((this.prisma as any).topping) {
      return (this.prisma as any).topping.findMany();
    }
    return this.defaultToppings;
  }

  async findOne(id: number) {
    if ((this.prisma as any).topping) {
      return (this.prisma as any).topping.findUnique({ where: { id } });
    }
    return this.defaultToppings.find((t) => t.id === id);
  }

  async update(id: number, updateToppingDto: UpdateToppingDto) {
    if ((this.prisma as any).topping) {
      return (this.prisma as any).topping.update({
        where: { id },
        data: updateToppingDto,
      });
    }
    return { id, ...updateToppingDto };
  }

  async remove(id: number) {
    if ((this.prisma as any).topping) {
      return (this.prisma as any).topping.delete({
        where: { id },
      });
    }
    return { success: true };
  }
}
