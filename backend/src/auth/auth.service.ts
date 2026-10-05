import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../users/users.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  // Dùng lại UsersService.create(): đã băm mật khẩu bằng bcrypt + tự ném
  // ConflictException nếu email trùng (xem users.service.ts -> handleError, mã P2002)
  async register(dto: CreateUserDto) {
    return this.usersService.create(dto);
  }

  async login(dto: LoginDto) {
    const user = await this.usersService.findByEmailWithHash(dto.email);
    const isMatch = user ? await bcrypt.compare(dto.password, user.passwordHash) : false;

    if (!user || !isMatch) {
      // Dùng chung 1 thông báo cho cả 2 trường hợp để tránh lộ email nào đã tồn tại
      throw new UnauthorizedException('Sai email hoặc mật khẩu');
    }

    const payload = { sub: user.id, email: user.email };
    return {
      access_token: await this.jwtService.signAsync(payload),
      user: { id: user.id, email: user.email, loyaltyPoints: user.loyaltyPoints },
    };
  }
}
