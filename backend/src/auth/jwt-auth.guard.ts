import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Dùng: @UseGuards(JwtAuthGuard) trên route cần đăng nhập, ví dụ POST /api/orders
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor() {
    super(); // constructor rỗng, tránh lỗi Nest cố inject tham số tùy chọn của AuthGuard
  }
}
