'use client';

import { useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/lib/auth';

function HomeContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Handle auth code from Supabase (password reset, email confirmation, etc.)
    const code = searchParams.get('code');
    if (code) {
      // Check if type parameter exists, if not, we need to determine the flow
      const type = searchParams.get('type');

      // Redirect to callback page to handle the code exchange
      // If no type specified, callback will determine based on session state
      const callbackUrl = type
        ? `/auth/callback?code=${code}&type=${type}`
        : `/auth/callback?code=${code}`;
      router.replace(callbackUrl);
    }
  }, [searchParams, router]);

  const handleGetStarted = () => {
    if (user) {
      router.push('/matches');
    } else {
      router.push('/auth/register');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      {/* Hero Section */}
      <section
        className="relative text-white bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: 'url(/YasuoBG.avif)',
        }}
      >
        {/* Overlay for text readability */}
        <div className="absolute inset-0 bg-black/50"></div>
        <div className="relative max-w-7xl mx-auto px-4 py-20">
          <div className="text-center">
            <h1 className="text-5xl font-bold mb-6">Thi đấu kỹ năng TFT</h1>
            <p className="text-xl mb-8 max-w-3xl mx-auto">
              Thể hiện kỹ năng Teamfight Tactics của bạn và nhận phần thưởng
              thực tế. Nền tảng thi đấu công bằng, minh bạch và an toàn.
            </p>
            <div className="flex gap-4 justify-center">
              <Button size="lg" onClick={handleGetStarted}>
                Bắt đầu ngay
              </Button>
              <Button
                size="lg"
                variant="outline"
                className="text-white border-white bg-blue hover:bg-white hover:text-blue-600"
                asChild
              >
                <Link href="/how-it-works">Tìm hiểu thêm</Link>
              </Button>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Tại sao chọn TFT Match?
            </h2>
            <p className="text-xl text-gray-600">
              Nền tảng thi đấu kỹ năng hàng đầu với những ưu điểm vượt trội
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-3">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="outline">🎯</Badge>
                  Thi đấu kỹ năng
                </CardTitle>
                <CardDescription>
                  Dựa hoàn toàn trên kỹ năng chơi game
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Kết quả phụ thuộc vào kỹ năng và chiến thuật của bạn, không có
                  yếu tố may mắn hay cờ bạc.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="outline">💰</Badge>
                  Phần thưởng thực tế
                </CardTitle>
                <CardDescription>Nhận tiền thật khi thắng cuộc</CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Người thắng nhận lại phí tạm ứng + phần thưởng từ pool giải
                  đấu.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Badge variant="outline">🔒</Badge>
                  An toàn & Minh bạch
                </CardTitle>
                <CardDescription>
                  Bảo mật cao và công bằng tuyệt đối
                </CardDescription>
              </CardHeader>
              <CardContent>
                <p className="text-gray-600">
                  Mọi giao dịch được ghi lại, mã hóa bảo mật và có thể truy
                  xuất.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">
              Cách thức hoạt động
            </h2>
            <p className="text-xl text-gray-600">
              Quy trình đơn giản từ đăng ký đến nhận thưởng
            </p>
          </div>

          <div className="grid gap-8 md:grid-cols-4">
            <div className="text-center">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-blue-600">1</span>
              </div>
              <h3 className="font-semibold mb-2">Đăng ký</h3>
              <p className="text-sm text-gray-600">
                Liên kết tài khoản Riot Games
              </p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-green-600">2</span>
              </div>
              <h3 className="font-semibold mb-2">Nạp tiền</h3>
              <p className="text-sm text-gray-600">Tạm ứng dịch vụ vào ví</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-purple-600">3</span>
              </div>
              <h3 className="font-semibold mb-2">Thi đấu</h3>
              <p className="text-sm text-gray-600">Tham gia giải đấu kỹ năng</p>
            </div>

            <div className="text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <span className="text-2xl font-bold text-orange-600">4</span>
              </div>
              <h3 className="font-semibold mb-2">Nhận thưởng</h3>
              <p className="text-sm text-gray-600">
                Hoàn tạm ứng + phần thưởng
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-gray-900 text-white">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-3xl font-bold mb-4">Sẵn sàng tham gia?</h2>
          <p className="text-xl text-gray-300 mb-8">
            Tham gia ngay để trải nghiệm thi đấu kỹ năng TFT với phần thưởng
            thực tế
          </p>
          <div className="flex gap-4 justify-center">
            <Button
              size="lg"
              variant="outline"
              className="text-white border-white bg-blue hover:bg-white hover:text-gray-900"
              onClick={handleGetStarted}
            >
              {user ? 'Xem giải đấu' : 'Đăng ký miễn phí'}
            </Button>
            {!user && (
              <Button
                size="lg"
                variant="outline"
                className="text-white border-white bg-blue hover:bg-white hover:text-gray-900"
                asChild
              >
                <Link href="/matches">Xem giải đấu</Link>
              </Button>
            )}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}

export default function Home() {
  return (
    <Suspense
      fallback={<div className="min-h-screen bg-gray-50">Loading...</div>}
    >
      <HomeContent />
    </Suspense>
  );
}
