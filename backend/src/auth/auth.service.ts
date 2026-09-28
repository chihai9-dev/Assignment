import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcryptjs';
import { UsersService } from '../users/users.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async register(dto: RegisterDto) {
    if (this.usersService.findByEmail(dto.email)) {
      throw new ConflictException('Email đã được đăng ký');
    }
    const passwordHash = await bcrypt.hash(dto.password, 10); // băm mật khẩu, không lưu bản gốc
    const user = this.usersService.create(dto.email, passwordHash);
    return { id: user.id, email: user.email };
  }

  async login(dto: LoginDto) {
    const user = this.usersService.findByEmail(dto.email);
    const ok = user && (await bcrypt.compare(dto.password, user.passwordHash));
    if (!user || !ok) {
      // Cùng một thông báo cho cả "sai email" và "sai mật khẩu" để tránh lộ email nào đã tồn tại
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    const payload = { sub: user.id, email: user.email };
    return {
      accessToken: await this.jwtService.signAsync(payload),
      user: { id: user.id, email: user.email },
    };
  }
}
