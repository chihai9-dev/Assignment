import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Thêm dòng này để cho phép Frontend Next.js lấy được dữ liệu
  app.enableCors(); 
  
  await app.listen(3001);
}
bootstrap();