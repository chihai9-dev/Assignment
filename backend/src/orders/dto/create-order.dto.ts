import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';

export class OrderItemDto {
  @Type(() => Number)
  @IsInt()
  productId: number;

  @IsString()
  @IsNotEmpty()
  size: string; // Vd: 'S', 'M', 'L'

  @Type(() => Number)
  @IsInt()
  @Min(1)
  qty: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  price: number;
}

export class CreateOrderDto {
  // userId không còn nhận từ body nữa — Task 7 đã lấy trực tiếp từ JWT (xem orders.controller.ts)

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}