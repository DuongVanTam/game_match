'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/lib/auth';
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

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [gameAccount, setGameAccount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [step, setStep] = useState<'form' | 'otp'>('form');
  const [otp, setOtp] = useState('');
  const [otpError, setOtpError] = useState('');
  const [otpMessage, setOtpMessage] = useState('');
  const [otpLoading, setOtpLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMessage, setResendMessage] = useState('');

  const { signUp, verifySignupOtp, resendSignupOtp } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setResendMessage('');

    try {
      await signUp(email, password, gameAccount);
      setStep('otp');
      setOtp('');
      setOtpError('');
      setOtpMessage(
        'Chúng tôi đã gửi mã OTP 6 chữ số tới email của bạn. Vui lòng nhập mã để xác nhận tài khoản.'
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Đã xảy ra lỗi');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setOtpError('');
    setOtpMessage('');
    setResendMessage('');
    setOtpLoading(true);

    try {
      const normalizedOtp = otp.trim();
      if (normalizedOtp.length !== 6) {
        setOtpError('Vui lòng nhập đủ 6 chữ số của mã OTP');
        setOtpLoading(false);
        return;
      }

      const session = await verifySignupOtp(email, normalizedOtp);

      if (!session) {
        setOtpError('Mã OTP không hợp lệ hoặc đã hết hạn');
        setOtpLoading(false);
        return;
      }

      const initResponse = await fetch('/api/auth/initialize-user', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!initResponse.ok) {
        setOtpError('Không thể khởi tạo tài khoản người dùng');
        setOtpLoading(false);
        return;
      }

      router.push('/');
    } catch (err) {
      setOtpError(
        err instanceof Error
          ? err.message
          : 'Không thể xác minh mã OTP. Vui lòng thử lại.'
      );
    } finally {
      setOtpLoading(false);
    }
  };

  const handleResendOtp = async () => {
    setResendMessage('');
    setOtpError('');
    setResendLoading(true);

    try {
      await resendSignupOtp(email);
      setResendMessage('Đã gửi lại mã OTP. Vui lòng kiểm tra email.');
    } catch (err) {
      setOtpError(
        err instanceof Error
          ? err.message
          : 'Không thể gửi lại mã OTP. Vui lòng thử lại.'
      );
    } finally {
      setResendLoading(false);
    }
  };

  if (step === 'otp') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">Nhập mã xác nhận</CardTitle>
            <CardDescription>
              Mã OTP đã được gửi tới{' '}
              <span className="font-medium">{email}</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp">Mã OTP 6 chữ số</Label>
                <Input
                  id="otp"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]{6}"
                  maxLength={6}
                  placeholder="Nhập mã OTP"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value)}
                  required
                  disabled={otpLoading}
                />
              </div>

              {otpMessage && (
                <Alert>
                  <AlertDescription>{otpMessage}</AlertDescription>
                </Alert>
              )}

              {otpError && (
                <Alert variant="destructive">
                  <AlertDescription>{otpError}</AlertDescription>
                </Alert>
              )}

              {resendMessage && (
                <Alert>
                  <AlertDescription>{resendMessage}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" className="w-full" disabled={otpLoading}>
                {otpLoading ? 'Đang xác minh...' : 'Xác nhận tài khoản'}
              </Button>
            </form>

            <div className="mt-4 space-y-2 text-center">
              <Button
                variant="link"
                className="p-0 h-auto text-sm"
                disabled={resendLoading}
                onClick={handleResendOtp}
              >
                {resendLoading
                  ? 'Đang gửi lại...'
                  : 'Không nhận được mã? Gửi lại'}
              </Button>
              <div>
                <Button
                  variant="link"
                  className="p-0 h-auto text-sm"
                  onClick={() => {
                    setStep('form');
                    setOtp('');
                    setOtpError('');
                    setOtpMessage('');
                    setResendMessage('');
                  }}
                >
                  Nhập email khác
                </Button>
              </div>
            </div>

            <div className="mt-2 text-center">
              <p className="text-xs text-gray-500">
                Bạn có thể mở email và nhập mã OTP trên bất kỳ thiết bị nào.
              </p>
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
          <CardTitle className="text-2xl">Tạo tài khoản</CardTitle>
          <CardDescription>Nhập thông tin của bạn để bắt đầu</CardDescription>
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

            <div className="space-y-2">
              <Label htmlFor="gameAccount">Tài khoản game</Label>
              <Input
                id="gameAccount"
                type="text"
                placeholder="Nhập tên tài khoản game của bạn"
                value={gameAccount}
                onChange={(e) => setGameAccount(e.target.value)}
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
              {loading ? 'Đang tạo...' : 'Tạo tài khoản'}
            </Button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-gray-600">
              Đã có tài khoản?{' '}
              <Button
                variant="link"
                className="p-0 h-auto"
                onClick={() => router.push('/auth/login')}
              >
                Đăng nhập
              </Button>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
