'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async () => {
    setError('');

    if (password !== confirmPassword) {
      setError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setIsLoading(true);
    try {
      const res = await fetch('http://localhost:3001/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(Array.isArray(data.message) ? data.message.join(', ') : data.message);
        return;
      }
      alert('Đăng ký thành công! Hãy đăng nhập.');
      router.push('/login');
    } catch {
      setError('Không kết nối được máy chủ. Hãy kiểm tra backend đã chạy ở cổng 3001 chưa.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="p-8 w-full min-h-screen max-w-md mx-auto bg-white text-black">
      <h1 className="text-3xl font-bold mb-6">Đăng ký tài khoản</h1>
      <div className="space-y-4">
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border rounded-lg p-3"
        />
        <input
          type="password"
          placeholder="Mật khẩu (ít nhất 8 ký tự)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full border rounded-lg p-3"
        />
        <input
          type="password"
          placeholder="Xác nhận mật khẩu"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          className="w-full border rounded-lg p-3"
        />
        {error && <p className="text-red-500 text-sm">{error}</p>}
        <button
          onClick={handleSubmit}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white font-bold py-3 rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
        >
          {isLoading ? 'Đang đăng ký...' : 'Đăng ký'}
        </button>
      </div>
      <p className="mt-6 text-sm text-center">
        Đã có tài khoản?{' '}
        <Link href="/login" className="text-blue-600 hover:underline">Đăng nhập</Link>
      </p>
    </main>
  );
}
