import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Global() // Thêm @Global() để dùng ở mọi nơi mà không cần import lại nhiều lần
@Module({
  providers: [PrismaService],
  exports: [PrismaService], // Xuất ra để module khác dùng
})
export class PrismaModule {}