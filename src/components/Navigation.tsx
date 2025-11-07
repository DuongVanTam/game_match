'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useAuth } from '@/lib/auth';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export function Navigation() {
  const { user, signOut } = useAuth();
  const router = useRouter();

  const handleSignOut = async () => {
    await signOut();
    router.push('/');
  };

  return (
    <nav className="border-b bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link href="/" className="flex-shrink-0 flex items-center gap-2">
              <Image
                src="/logo.png"
                alt="TFT Match"
                width={38}
                height={38}
                priority
              />
              <span className="text-xl font-bold text-gray-900">TFT Match</span>
            </Link>

            <div className="hidden md:ml-6 md:flex md:space-x-8">
              <Link
                href="/matches"
                className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                Thi đấu kỹ năng
              </Link>
              <Link
                href="/wallet"
                className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                Ví tạm ứng
              </Link>
              <Link
                href="/how-it-works"
                className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                Cách hoạt động
              </Link>
              <Link
                href="/faq"
                className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium"
              >
                FAQ
              </Link>
              {user?.role === 'admin' && (
                <Link
                  href="/admin"
                  className="text-gray-500 hover:text-gray-900 px-3 py-2 text-sm font-medium"
                >
                  Quản trị
                </Link>
              )}
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {user ? (
              <>
                <span className="text-sm text-gray-700">{user.email}</span>
                <Button variant="outline" size="sm" onClick={handleSignOut}>
                  Đăng xuất
                </Button>
              </>
            ) : (
              <div className="flex space-x-2">
                <Button variant="outline" size="sm" asChild>
                  <Link href="/auth/login">Đăng nhập</Link>
                </Button>
                <Button size="sm" asChild>
                  <Link href="/auth/register">Đăng ký</Link>
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
