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

const RATE_LIMIT_KEY = 'forgot_password_rate_limit';
const RATE_LIMIT_WINDOW = 60 * 60 * 1000; // 1 hour
const MAX_ATTEMPTS = 3; // Max 3 attempts per hour per email

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [retryAfter, setRetryAfter] = useState<number | null>(null);
  const [cooldownTime, setCooldownTime] = useState<number | null>(null);

  const router = useRouter();
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  // Check rate limit on mount
  useEffect(() => {
    if (email) {
      checkRateLimit();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [email]);

  // Update cooldown timer
  useEffect(() => {
    if (!cooldownTime || cooldownTime <= 0) return;

    const interval = setInterval(() => {
      setCooldownTime((prev) => {
        if (!prev || prev <= 1000) {
          setError('');
          return null;
        }
        return prev - 1000;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [cooldownTime]);

  const checkRateLimit = () => {
    if (typeof window === 'undefined') return;

    const stored = localStorage.getItem(`${RATE_LIMIT_KEY}_${email}`);
    if (!stored) return;

    try {
      const data = JSON.parse(stored);
      const now = Date.now();
      const timeRemaining = data.resetTime - now;

      if (timeRemaining > 0 && data.count >= MAX_ATTEMPTS) {
        const minutes = Math.ceil(timeRemaining / (60 * 1000));
        setCooldownTime(timeRemaining);
        setError(
          `Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau ${minutes} phút.`
        );
      } else if (timeRemaining <= 0) {
        // Reset expired entry
        localStorage.removeItem(`${RATE_LIMIT_KEY}_${email}`);
        setCooldownTime(null);
      }
    } catch (err) {
      console.error('Error checking rate limit:', err);
    }
  };

  const updateRateLimit = (email: string) => {
    if (typeof window === 'undefined') return;

    const key = `${RATE_LIMIT_KEY}_${email}`;
    const stored = localStorage.getItem(key);
    const now = Date.now();

    let data;
    if (stored) {
      try {
        data = JSON.parse(stored);
        if (data.resetTime < now) {
          // Reset expired entry
          data = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
        }
      } catch {
        data = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
      }
    } else {
      data = { count: 0, resetTime: now + RATE_LIMIT_WINDOW };
    }

    data.count++;
    localStorage.setItem(key, JSON.stringify(data));
  };

  const parseRetryAfter = (errorMessage: string): number | null => {
    // Try to extract retry-after from error message
    const retryMatch = errorMessage.match(/retry.?after[:\s]+(\d+)/i);
    if (retryMatch) {
      return parseInt(retryMatch[1], 10) * 1000; // Convert to milliseconds
    }

    // Check for common patterns
    if (errorMessage.includes('429')) {
      // Default 1 hour if 429 error
      return 60 * 60 * 1000;
    }

    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess(false);
    setRetryAfter(null);
    setCooldownTime(null);

    // Check client-side rate limit
    const stored = localStorage.getItem(`${RATE_LIMIT_KEY}_${email}`);
    if (stored) {
      try {
        const data = JSON.parse(stored);
        const now = Date.now();
        if (data.resetTime > now && data.count >= MAX_ATTEMPTS) {
          const minutes = Math.ceil((data.resetTime - now) / (60 * 1000));
          setError(
            `Bạn đã yêu cầu quá nhiều lần. Vui lòng thử lại sau ${minutes} phút.`
          );
          setCooldownTime(data.resetTime - now);
          setLoading(false);
          return;
        }
      } catch {
        // Continue if parsing fails
      }
    }

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
        if (
          resetError.message.includes('rate limit') ||
          resetError.message.includes('429') ||
          resetError.status === 429
        ) {
          // Parse retry-after time if available
          const retryTime = parseRetryAfter(resetError.message);
          if (retryTime) {
            setRetryAfter(retryTime);
            const minutes = Math.ceil(retryTime / (60 * 1000));
            setError(
              `Quá nhiều yêu cầu gửi email. Vui lòng thử lại sau ${minutes} phút.`
            );
          } else {
            setError(
              'Quá nhiều yêu cầu. Vui lòng thử lại sau 1 giờ để tránh spam.'
            );
            setRetryAfter(60 * 60 * 1000); // Default 1 hour
          }

          // Update client-side rate limit
          updateRateLimit(email);
        } else if (resetError.message.includes('not found')) {
          // Don't reveal if email exists or not for security
          setSuccess(true); // Show success message even if email doesn't exist
          updateRateLimit(email);
        } else {
          setError(resetError.message);
        }
        setLoading(false);
        return;
      }

      // Success - always show success message (security: don't reveal if email exists)
      updateRateLimit(email);
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
                <AlertDescription>
                  {error}
                  {retryAfter && (
                    <div className="mt-2 text-sm">
                      Thời gian chờ: {Math.ceil(retryAfter / (60 * 1000))} phút
                    </div>
                  )}
                </AlertDescription>
              </Alert>
            )}

            <Button
              type="submit"
              className="w-full"
              disabled={loading || !!cooldownTime}
            >
              {loading
                ? 'Đang gửi...'
                : cooldownTime
                  ? `Vui lòng đợi ${Math.ceil(cooldownTime / (60 * 1000))} phút`
                  : 'Gửi link đặt lại mật khẩu'}
            </Button>

            {cooldownTime && cooldownTime > 0 && (
              <p className="text-xs text-center text-gray-500 mt-2">
                Bảo mật: Giới hạn 3 lần yêu cầu mỗi giờ để tránh spam email
              </p>
            )}
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
