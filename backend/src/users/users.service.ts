import { Injectable } from '@nestjs/common';

export interface User {
  id: number;
  email: string;
  passwordHash: string;
  loyaltyPoints: number; // dùng cho Task 10
}

// Lưu tạm trong RAM (giống products). Khi có CSDL thật (Task 6+) chỉ cần thay class này bằng Prisma/TypeORM.
@Injectable()
export class UsersService {
  private readonly users: User[] = [];
  private nextId = 1;

  findByEmail(email: string): User | undefined {
    return this.users.find((u) => u.email === email.toLowerCase());
  }

  findById(id: number): User | undefined {
    return this.users.find((u) => u.id === id);
  }

  create(email: string, passwordHash: string): User {
    const user: User = {
      id: this.nextId++,
      email: email.toLowerCase(),
      passwordHash,
      loyaltyPoints: 0,
    };
    this.users.push(user);
    return user;
  }
}
