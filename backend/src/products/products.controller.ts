import { Controller, Get, Post, Body, Patch, Param, Delete, ParseIntPipe } from '@nestjs/common';
import { ProductsService } from './products.service';
<<<<<<< HEAD

@Controller('products')
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Get()
=======
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
@Controller('api/products') // Đường dẫn cơ sở: api/products
export class ProductsController {
  constructor(private readonly productsService: ProductsService) {}

  @Post() // POST /products
  create(@Body() createProductDto: CreateProductDto) {
    return this.productsService.create(createProductDto);
  }
  @Get() // GET /products
>>>>>>> 2616c841fe24e488017309b91afe6d645bf87daf
  findAll() {
    return this.productsService.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    // ParseIntPipe đảm bảo id truyền từ URL sẽ được ép kiểu về số nguyên
    return this.productsService.findOne(id);
  }
  @Patch(':id') // PATCH /products/:id
  update(@Param('id', ParseIntPipe) id: number, @Body() updateProductDto: UpdateProductDto) {
    return this.productsService.update(id, updateProductDto);
  }
  @Delete(':id') // DELETE /products/:id
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.productsService.remove(id);
  }
}