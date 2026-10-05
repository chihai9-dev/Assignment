import { Body, Controller, Get, Post, Request, UseGuards } from '@nestjs/common';
import { AuthService } from './auth.service';
import { CreateUserDto } from '../users/dto/create-user.dto';
import { LoginDto } from './dto/login.dto';
import { JwtAuthGuard } from './jwt-auth.guard';

@Controller('api/auth') // Đồng bộ tiền tố "api" với các controller khác trong dự án
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register') // POST /api/auth/register
  register(@Body() dto: CreateUserDto) {
    return this.authService.register(dto);
  }

  @Post('login') // POST /api/auth/login
  login(@Body() dto: LoginDto) {
    return this.authService.login(dto);
  }

  @UseGuards(JwtAuthGuard)
  @Get('me') // GET /api/auth/me - route mẫu để xác nhận guard hoạt động
  me(@Request() req: { user: { userId: number; email: string } }) {
    return req.user;
  }
}
