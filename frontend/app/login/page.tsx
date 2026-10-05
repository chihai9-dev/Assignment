'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense, useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import { useCartStore } from '../../store/cartStore';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectTo = searchParams.get('redirect') || '/';

  const login = useAuthStore((state) => state.login);
  const loadCartForUser = useCartStore((state) => state.loadCartForUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Backend có thể trả message dạng chuỗi hoặc mảng (lỗi validate)
        setError(Array.isArray(data.message) ? data.message.join(', ') : data.message);
        return;
      }
      login(data.access_token, data.user);
      loadCartForUser(data.user.email); // nạp đúng giỏ hàng đã lưu của tài khoản này
      router.push(redirectTo);
    } catch {
      setError('Không kết nối được máy chủ. Hãy kiểm tra backend đã chạy ở cổng 3001 chưa.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="p-8 w-full min-h-screen max-w-md mx-auto bg-white text-black">
      <h1 className="text-3xl font-bold mb-6">Đăng nhập</h1>
      <div className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg p-3"
        />

        {/* Chỉ riêng ô mật khẩu ở trang đăng nhập mới có nút hiện/ẩn mật khẩu */}
        <div className="relative">
          <input
            type={showPassword ? 'text' : 'password'}
            placeholder="Mật khẩu"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
            className="w-full border rounded-lg p-3 pr-16"
          />
          <button
            type="button"
            onClick={() => setShowPassword((prev) => !prev)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-gray-500 hover:text-blue-600"
          >
            {showPassword ? 'Ẩn' : 'Hiện'}
          </button>
        </div>

        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {isLoading ? 'Đang đăng nhập...' : 'Đăng nhập'}
        </button>
      </div>
      <p className="mt-6 text-sm text-center">
        Chưa có tài khoản?{' '}
        <Link href="/register" className="text-blue-600 hover:underline">Đăng ký</Link>
      </p>
    </main>
  );
}

export default function LoginPage() {
  // Bọc Suspense vì dùng useSearchParams (yêu cầu của Next.js App Router)
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
