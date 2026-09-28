import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';

describe('AuthService', () => {
  let service: AuthService;
  let usersService: UsersService;

  beforeEach(() => {
    usersService = new UsersService();
    service = new AuthService(
      usersService,
      new JwtService({ secret: 'test-secret' }),
    );
  });

  it('đăng ký: mật khẩu được băm, không lưu bản gốc', async () => {
    await service.register({ email: 'a@test.com', password: '123456' });
    const saved = usersService.findByEmail('a@test.com');
    expect(saved?.passwordHash).toBeDefined();
    expect(saved?.passwordHash).not.toBe('123456');
  });

  it('đăng ký trùng email -> ConflictException', async () => {
    await service.register({ email: 'a@test.com', password: '123456' });
    await expect(
      service.register({ email: 'A@test.com', password: '123456' }),
    ).rejects.toThrow(ConflictException);
  });

  it('đăng nhập đúng -> trả về accessToken', async () => {
    await service.register({ email: 'a@test.com', password: '123456' });
    const result = await service.login({ email: 'a@test.com', password: '123456' });
    expect(result.accessToken).toEqual(expect.any(String));
  });

  it('đăng nhập sai mật khẩu hoặc sai email -> UnauthorizedException', async () => {
    await service.register({ email: 'a@test.com', password: '123456' });
    await expect(
      service.login({ email: 'a@test.com', password: 'sai' }),
    ).rejects.toThrow(UnauthorizedException);
    await expect(
      service.login({ email: 'khong@co.com', password: '123456' }),
    ).rejects.toThrow(UnauthorizedException);
  });
});
