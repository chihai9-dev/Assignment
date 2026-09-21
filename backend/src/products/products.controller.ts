import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ProductsService } from './products.service';

@Controller('products') // Đường dẫn cơ sở: /products
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get() // GET /products
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id') // GET /products/:id
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.findOne(id);
  }
}