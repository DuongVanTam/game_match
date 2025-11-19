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

        // If we have a code parameter for non-recovery flows (email confirmation, signup)
        // For email-based flows, Supabase may not support PKCE, so we try verifyOtp first
        if (code) {
          console.log('Processing code for non-recovery flow:', { code, type });

          // First, check if we already have a session (Supabase may create it automatically)
          const { data: existingSession } = await supabase.auth.getSession();

          if (existingSession?.session) {
            console.log('Session already exists:', {
              user: existingSession.session.user?.email,
            });

            // Initialize user if needed
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

            router.push('/');
            return;
          }

          // Try verifyOtp first (for email confirmation flows)
          console.log('Trying verifyOtp for email confirmation');
          const { data: otpData, error: otpError } =
            await supabase.auth.verifyOtp({
              token_hash: code,
              type: 'email', // For signup/email confirmation
            });

          if (!otpError && otpData?.session) {
            console.log('OTP verified successfully:', {
              user: otpData.session.user?.email,
            });

            // Initialize user
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

            router.push('/');
            return;
          }

          // If verifyOtp fails, try exchangeCodeForSession as fallback
          console.log('verifyOtp failed, trying exchangeCodeForSession');
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
            } else if (
              exchangeError.message.includes('code verifier') ||
              exchangeError.message.includes('non-empty')
            ) {
              // PKCE error - verifyOtp already tried above, show error
              setError(
                'Link xác nhận không hợp lệ. Vui lòng kiểm tra email và thử lại.'
              );
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
