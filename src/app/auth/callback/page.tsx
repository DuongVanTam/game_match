'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import { Database } from '@/types/database';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

export default function AuthCallbackPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const router = useRouter();
  const searchParams = useSearchParams();
  const supabase = createBrowserClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        const code = searchParams.get('code');
        const type = searchParams.get('type');

        // If we have a code parameter, exchange it for a session
        if (code) {
          const { data, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            setError('Link không hợp lệ hoặc đã hết hạn');
            setLoading(false);
            return;
          }

          // After code exchange, check if we have a session
          const { data: sessionData } = await supabase.auth.getSession();

          if (sessionData?.session) {
            // Check if this is a password recovery flow
            // If type is explicitly 'recovery', redirect to reset password
            if (type === 'recovery') {
              router.push('/auth/reset-password');
              return;
            }

            // If no type specified, try to determine the flow
            // For password reset emails, Supabase creates a temporary session
            // We can check if user email is already verified to distinguish
            const user = sessionData.session.user;
            const isEmailVerified =
              user.email_confirmed_at || user.confirmed_at;

            // If email is already verified and user exists, likely password recovery
            // Otherwise, it's likely a signup/email confirmation
            if (isEmailVerified && !type) {
              // This is likely a password recovery flow
              // Redirect to reset password page
              router.push('/auth/reset-password');
              return;
            }

            // For email confirmation/signup, initialize user
            const initResponse = await fetch('/api/auth/initialize-user', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
              },
            });

            if (!initResponse.ok) {
              console.error('Failed to initialize user');
              setError('Không thể khởi tạo tài khoản người dùng');
              return;
            }

            // User authenticated successfully, redirect to home
            router.push('/');
            return;
          } else {
            setError('Không tìm thấy phiên đăng nhập sau khi xác thực');
            return;
          }
        }

        // Handle password recovery flow by type parameter
        if (type === 'recovery') {
          const { data, error } = await supabase.auth.getSession();

          if (error) {
            setError('Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
            return;
          }

          if (data.session) {
            // Redirect to reset password page
            router.push('/auth/reset-password');
            return;
          } else {
            setError('Không tìm thấy phiên đặt lại mật khẩu');
            return;
          }
        }

        // Handle normal auth flow (signup, email confirmation, etc.)
        const { data, error } = await supabase.auth.getSession();

        if (error) {
          setError('Xác thực thất bại');
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
            return;
          }

          // User authenticated successfully, redirect to home
          router.push('/');
        } else {
          setError('Không tìm thấy phiên đăng nhập');
        }
      } catch (err) {
        console.error('Error in auth callback:', err);
        setError('Đã xảy ra lỗi không mong muốn');
      } finally {
        setLoading(false);
      }
    };

    handleAuthCallback();
  }, [supabase, router, searchParams]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle>Đang xác thực...</CardTitle>
            <CardDescription>
              Vui lòng đợi trong khi chúng tôi xác minh tài khoản của bạn
            </CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-red-600">Lỗi xác thực</CardTitle>
            <CardDescription>{error}</CardDescription>
          </CardHeader>
          <CardContent className="text-center">
            <button
              onClick={() => router.push('/auth/login')}
              className="text-blue-600 hover:text-blue-800 underline"
            >
              Thử lại
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
