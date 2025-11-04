'use client';

import { useEffect, useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import Image from 'next/image';
import { Button } from '@/components/ui/button';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';

function TopupResultContent() {
  const searchParams = useSearchParams();
  const [isClosing, setIsClosing] = useState(false);

  const success = searchParams.get('success') === 'true';
  const cancelled = searchParams.get('cancelled') === 'true';
  const txRef = searchParams.get('tx_ref');

  // Determine status
  const isSuccess = success && !cancelled;
  const isCancelled = cancelled || (!success && !cancelled);

  useEffect(() => {
    // Auto close after 5 seconds if success
    if (isSuccess) {
      const timer = setTimeout(() => {
        setIsClosing(true);
        // Try to go back or close
        if (window.opener && !window.opener.closed) {
          window.opener.focus();
          window.close();
        } else if (window.history.length > 1) {
          window.history.back();
        } else {
          window.location.href = '/wallet';
        }
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [isSuccess]);

  const handleClose = () => {
    setIsClosing(true);

    // Check if this window was opened by another window (popup)
    if (window.opener && !window.opener.closed) {
      // If opened in popup, close this window and focus the opener
      window.opener.focus();
      window.close();
      return;
    }

    // Try to go back in history first
    if (window.history.length > 1) {
      // Check if we can go back (user came from another page)
      try {
        window.history.back();
        // Fallback: if back doesn't work, redirect to wallet
        setTimeout(() => {
          if (!document.hidden) {
            window.location.href = '/wallet';
          }
        }, 500);
      } catch {
        // If history.back() fails, redirect to wallet
        window.location.href = '/wallet';
      }
    } else {
      // No history, redirect to wallet
      window.location.href = '/wallet';
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-xl p-8 text-center">
          {/* Logo and Website Name */}
          <div className="flex flex-col items-center mb-8">
            <Image
              src="/logo.png"
              alt="TFT Match"
              width={64}
              height={64}
              priority
              className="mb-4"
            />
            <h1 className="text-2xl font-bold text-gray-900">TFT Match</h1>
          </div>

          {/* Result Icon */}
          <div className="mb-6 flex justify-center">
            {isSuccess ? (
              <div className="relative">
                <div className="absolute inset-0 bg-green-100 rounded-full animate-ping opacity-75"></div>
                <CheckCircle2 className="relative w-20 h-20 text-green-500" />
              </div>
            ) : isCancelled ? (
              <XCircle className="w-20 h-20 text-red-500" />
            ) : (
              <Loader2 className="w-20 h-20 text-gray-400 animate-spin" />
            )}
          </div>

          {/* Result Message */}
          <div className="mb-8">
            <h2
              className={`text-2xl font-semibold mb-2 ${
                isSuccess ? 'text-green-600' : 'text-red-600'
              }`}
            >
              {isSuccess
                ? 'Thanh toán thành công!'
                : isCancelled
                  ? 'Thanh toán đã hủy'
                  : 'Đang xử lý...'}
            </h2>
            <p className="text-gray-600 mt-2">
              {isSuccess
                ? 'Giao dịch của bạn đã được xử lý thành công. Số dư sẽ được cập nhật trong giây lát.'
                : isCancelled
                  ? 'Bạn đã hủy giao dịch thanh toán. Vui lòng thử lại nếu cần.'
                  : 'Vui lòng đợi trong giây lát...'}
            </p>
            {txRef && (
              <p className="text-sm text-gray-500 mt-4 font-mono">
                Mã giao dịch: {txRef}
              </p>
            )}
          </div>

          {/* Close Button */}
          <Button
            onClick={handleClose}
            disabled={isClosing}
            className={`w-full ${
              isSuccess
                ? 'bg-green-600 hover:bg-green-700'
                : 'bg-gray-600 hover:bg-gray-700'
            } text-white`}
            size="lg"
          >
            {isClosing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Đang đóng...
              </>
            ) : (
              'Quay lại'
            )}
          </Button>

          {/* Help Text */}
          <p className="text-xs text-gray-400 mt-4">
            {isSuccess
              ? 'Cửa sổ này sẽ tự động đóng sau 5 giây'
              : 'Nếu cửa sổ không đóng tự động, vui lòng nhấn nút Quay lại'}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TopupResultPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
          <Loader2 className="w-8 h-8 text-gray-400 animate-spin" />
        </div>
      }
    >
      <TopupResultContent />
    </Suspense>
  );
}
