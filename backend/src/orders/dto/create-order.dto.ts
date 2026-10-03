import { Type } from 'class-transformer';
import { IsArray, IsInt, IsNotEmpty, IsString, Min, ValidateNested } from 'class-validator';

export class OrderItemDto {
  @IsInt()
  productId: number;

  @IsString()
  @IsNotEmpty()
  size: string; // Vd: 'S', 'M', 'L'

  @IsInt()
  @Min(1)
  qty: number;

  @IsInt()
  price: number;
}

export class CreateOrderDto {
  @IsInt()
  userId: number; // Tạm thời nhận từ body, sau này Task 7 sẽ lấy từ JWT

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => OrderItemDto)
  items: OrderItemDto[];
}