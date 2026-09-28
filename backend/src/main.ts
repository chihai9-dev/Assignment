import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Thêm dòng này để cho phép Frontend Next.js lấy được dữ liệu
  app.enableCors();

  // Tự động validate dữ liệu đầu vào theo DTO (class-validator), loại bỏ field thừa
  app.useGlobalPipes(new ValidationPipe({ whitelist: true }));

  await app.listen(3000);
}
bootstrap();
