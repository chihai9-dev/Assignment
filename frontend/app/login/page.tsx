'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useAuthStore } from '../../store/authStore';
import PasswordInput from '../components/PasswordInput';

export default function LoginPage() {
  const router = useRouter();
  const login = useAuthStore((state) => state.login);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');
    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        // Backend có thể trả message là chuỗi hoặc mảng (lỗi validate)
        setError(Array.isArray(data.message) ? data.message.join(', ') : data.message);
        return;
      }
      login(data.accessToken, data.user);
      router.push('/');
    } catch {
      setError('Không kết nối được máy chủ. Hãy kiểm tra backend đã chạy chưa.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="p-8 max-w-md mx-auto bg-white text-black">
      <h1 className="text-3xl font-bold mb-6">Đăng nhập</h1>
      <div className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg p-3"
        />
        <PasswordInput
          placeholder="Mật khẩu"
          value={password}
          onChange={setPassword}
          onEnter={handleSubmit}
        />
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
