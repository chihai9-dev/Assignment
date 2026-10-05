import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common/pipes/index.js';

(BigInt.prototype as any).toJSON = function () {
  return this.toString();
};
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.useGlobalPipes(
  new ValidationPipe({
    whitelist: true,            // tự bỏ field không có trong DTO
    forbidNonWhitelisted: true, // gửi field lạ (vd loyaltyPoints) -> 400
    transform: true,            // tự ép kiểu theo DTO
  }),
);
  app.enableCors({
    origin: 'http://localhost:3000',
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
  })
  await app.listen(process.env.PORT || 3001);
}
bootstrap();

