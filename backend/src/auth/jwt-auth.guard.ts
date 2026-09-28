import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// Dùng: @UseGuards(JwtAuthGuard) trên route cần đăng nhập (vd: POST /orders ở Task 6)
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  constructor() {
    super(); // constructor rỗng để Nest không cố inject tham số tùy chọn của AuthGuard
  }
}
