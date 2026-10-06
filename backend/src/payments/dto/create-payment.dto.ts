import {
  IsEnum,
  IsInt,
  IsNotEmpty,
  IsString,
  Min,
} from 'class-validator';

export enum PaymentMethod {
  WALLET = 'WALLET',
  CARD = 'CARD',
}

export class CreatePaymentDto {
  @IsInt()
  @IsNotEmpty()
  @Min(1)
  orderId: number;

  @IsInt()
  @IsNotEmpty()
  @Min(0)
  amount: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsString()
  @IsNotEmpty()
  idempotencyKey: string;
}