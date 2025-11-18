'use client';

import { useState } from 'react';
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

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const router = useRouter();
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);

    try {
      // Send password reset email
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
        }
      );

      if (resetError) {
        // Handle specific error messages
        if (resetError.message.includes('rate limit')) {
          setError('Quá nhiều yêu cầu. Vui lòng thử lại sau ít phút.');
        } else if (resetError.message.includes('not found')) {
          // Don't reveal if email exists or not for security
          setSuccess(true); // Show success message even if email doesn't exist
        } else {
          setError(resetError.message);
        }
        setLoading(false);
        return;
      }

      // Success - always show success message (security: don't reveal if email exists)
      setSuccess(true);
    } catch (err) {
      console.error('Forgot password error:', err);
      setError('Đã xảy ra lỗi không mong muốn. Vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl text-green-600">
              Email đã được gửi
            </CardTitle>
            <CardDescription>
              Nếu email tồn tại trong hệ thống, bạn sẽ nhận được link đặt lại
              mật khẩu
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Alert>
              <AlertDescription>
                Vui lòng kiểm tra hộp thư email của bạn và làm theo hướng dẫn để
                đặt lại mật khẩu. Link sẽ hết hạn sau 1 giờ.
              </AlertDescription>
            </Alert>

            <div className="space-y-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => router.push('/auth/login')}
              >
                Quay lại đăng nhập
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">Quên mật khẩu</CardTitle>
          <CardDescription>
            Nhập email của bạn để nhận link đặt lại mật khẩu
          </CardDescription>
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

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Đang gửi...' : 'Gửi link đặt lại mật khẩu'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Nhớ mật khẩu?{' '}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => router.push('/auth/login')}
              >
                Đăng nhập ngay
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
