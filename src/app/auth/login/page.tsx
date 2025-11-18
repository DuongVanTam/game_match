'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const router = useRouter();
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Check for success message from URL params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const message = params.get('message');
    if (message === 'password-reset-success') {
      setSuccess('Mật khẩu đã được đặt lại thành công. Vui lòng đăng nhập.');
      // Clear the message from URL
      router.replace('/auth/login');
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Sign in with password
      const { data, error: signInError } =
        await supabase.auth.signInWithPassword({
          email,
          password,
        });

      if (signInError) {
        // Handle specific error messages
        if (
          signInError.message.includes('Invalid login credentials') ||
          signInError.message.includes('invalid') ||
          signInError.status === 400
        ) {
          setError('Email hoặc mật khẩu không đúng');
        } else if (signInError.message.includes('Email not confirmed')) {
          setError('Vui lòng xác nhận email trước khi đăng nhập');
        } else {
          setError(signInError.message);
        }
        setLoading(false);
        return;
      }

      if (data.session) {
        // Initialize user via API endpoint (creates user + wallet if needed)
        const initResponse = await fetch('/api/auth/initialize-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
        });

        if (!initResponse.ok) {
          console.error('Failed to initialize user');
          setError('Không thể khởi tạo tài khoản người dùng');
          setLoading(false);
          return;
        }

        // Redirect to home
        router.push('/');
      }
    } catch (err) {
      console.error('Login error:', err);
      setError('Đã xảy ra lỗi không mong muốn. Vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Đăng nhập TFT Match</CardTitle>
          <CardDescription>Nhập email và mật khẩu để đăng nhập</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="email@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Mật khẩu</Label>
              <Input
                id="password"
                type="password"
                placeholder="Nhập mật khẩu"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                minLength={6}
              />
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {success && (
              <Alert>
                <AlertDescription>{success}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Đang đăng nhập...' : 'Đăng nhập'}
            </Button>
          </form>

          <div className="mt-6 space-y-2 text-center">
            <p className="text-sm text-gray-600">
              <Button
                variant="link"
                className="p-0 h-auto text-sm"
                onClick={() => router.push('/auth/forgot-password')}
              >
                Quên mật khẩu?
              </Button>
            </p>
            <p className="text-sm text-gray-600">
              Chưa có tài khoản?{' '}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => router.push('/auth/register')}
              >
                Đăng ký ngay
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
