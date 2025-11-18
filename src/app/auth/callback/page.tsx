'use client';

import { useEffect, useState, Suspense } from 'react';
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

function AuthCallbackContent() {
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

        // Handle password recovery flow first (before code exchange)
        // For password recovery, Supabase automatically creates a session when user clicks the link
        // We don't need to exchange code for password recovery
        if (type === 'recovery') {
          console.log('Password recovery flow detected');

          // Check if we already have a session (Supabase creates it automatically)
          const { data: sessionData, error: sessionError } =
            await supabase.auth.getSession();

          if (sessionError) {
            console.error('Session error:', sessionError);
            setError('Không thể kiểm tra phiên đăng nhập');
            setLoading(false);
            return;
          }

          if (sessionData?.session) {
            console.log('Recovery session found:', {
              user: sessionData.session.user?.email,
            });
            router.push('/auth/reset-password');
            return;
          } else {
            // If no session but we have code, try to verify OTP instead
            if (code) {
              console.log('No session found, trying verifyOtp for recovery');
              const { data: otpData, error: otpError } =
                await supabase.auth.verifyOtp({
                  token_hash: code,
                  type: 'recovery',
                });

              if (otpError) {
                console.error('OTP verification error:', otpError);
                setError(
                  'Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn. Vui lòng yêu cầu link mới.'
                );
                setLoading(false);
                return;
              }

              if (otpData?.session) {
                console.log('OTP verified, session created');
                router.push('/auth/reset-password');
                return;
              }
            }

            setError(
              'Không tìm thấy phiên đặt lại mật khẩu. Vui lòng yêu cầu link mới.'
            );
            setLoading(false);
            return;
          }
        }

        // If we have a code parameter for non-recovery flows, exchange it for a session
        if (code) {
          console.log('Exchanging code for session:', { code, type });

          const { data: exchangeData, error: exchangeError } =
            await supabase.auth.exchangeCodeForSession(code);

          if (exchangeError) {
            console.error('Code exchange error:', exchangeError);

            // Handle specific error cases
            if (
              exchangeError.message.includes('expired') ||
              exchangeError.message.includes('invalid')
            ) {
              setError(
                'Link đã hết hạn hoặc không hợp lệ. Vui lòng yêu cầu link mới.'
              );
            } else if (exchangeError.message.includes('already been used')) {
              setError('Link này đã được sử dụng. Vui lòng yêu cầu link mới.');
            } else if (exchangeError.message.includes('code verifier')) {
              // For PKCE flow, try verifyOtp instead
              console.log('PKCE error detected, trying verifyOtp');
              const { data: otpData, error: otpError } =
                await supabase.auth.verifyOtp({
                  token_hash: code,
                  type: 'email', // Default to email for non-recovery flows
                });

              if (otpError || !otpData?.session) {
                setError(
                  'Link không hợp lệ: ' +
                    (otpError?.message || exchangeError.message)
                );
                setLoading(false);
                return;
              }

              // OTP verified successfully
              console.log('OTP verified successfully');
              const { data: sessionData } = await supabase.auth.getSession();

              if (sessionData?.session) {
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

                router.push('/');
                return;
              }
            } else {
              setError(`Link không hợp lệ: ${exchangeError.message}`);
            }
            setLoading(false);
            return;
          }

          console.log('Code exchanged successfully:', exchangeData);

          // After code exchange, check if we have a session
          const { data: sessionData, error: sessionError } =
            await supabase.auth.getSession();

          if (sessionError) {
            console.error('Session error:', sessionError);
            setError('Không thể lấy phiên đăng nhập');
            setLoading(false);
            return;
          }

          if (sessionData?.session) {
            console.log('Session created:', {
              user: sessionData.session.user?.email,
              type,
            });

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
            console.error('No session found after code exchange');
            setError('Không tìm thấy phiên đăng nhập sau khi xác thực');
            return;
          }
        }

        // This section is now handled above (before code exchange)

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

export default function AuthCallbackPage() {
  return (
    <Suspense
      fallback={
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
      }
    >
      <AuthCallbackContent />
    </Suspense>
  );
}
