'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import {
  RefreshCw,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import { useTopupSSE } from '@/hooks/useTopupSSE';

export default function WalletTopupPage() {
  const router = useRouter();
  const [amount, setAmount] = useState<string>('100000');
  const [paymentMethod, setPaymentMethod] = useState<'payos' | 'momo'>('payos');
  const [loading, setLoading] = useState<boolean>(false);
  const [initError, setInitError] = useState<string | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [txRef, setTxRef] = useState<string | null>(null);
  const [paymentUrl, setPaymentUrl] = useState<string | null>(null);
  const [topupAmount, setTopupAmount] = useState<number | null>(null);

  // Use SSE hook for real-time status updates
  const {
    status: sseStatus,
    isConnected,
    error: sseError,
    reconnect,
  } = useTopupSSE({
    txRef,
    enabled: !!txRef,
    onStatusUpdate: (statusData) => {
      console.log('SSE status update received in topup page:', statusData);
      if (statusData.status === 'confirmed') {
        setSuccessMessage('Thanh toán thành công! Số dư sẽ được cập nhật.');
        setTimeout(() => router.push('/wallet'), 2000);
      } else if (statusData.status === 'failed') {
        setConfirmError('Thanh toán thất bại hoặc đã hủy. Vui lòng thử lại.');
      }
    },
    onError: (error) => {
      console.error('SSE error:', error);
      // Only show error if we're not connected and it's not a temporary connection issue
      if (!isConnected && error.message) {
        // Don't show error immediately - wait a bit to see if connection recovers
        setTimeout(() => {
          if (!isConnected) {
            setConfirmError(
              error.message ||
                'Kết nối bị gián đoạn. Vui lòng kiểm tra kết nối mạng.'
            );
          }
        }, 2000);
      }
    },
  });

  const status = sseStatus?.status || null;

  // Fallback polling if SSE is not connected after 5 seconds
  // This handles the case where webhook and SSE are on different serverless instances
  useEffect(() => {
    if (!txRef) {
      return;
    }

    let pollingTimeout: NodeJS.Timeout | null = null;
    let pollInterval: NodeJS.Timeout | null = null;
    let pollingActive = true;

    // Start polling after 5 seconds if SSE is not connected
    pollingTimeout = setTimeout(() => {
      // Check current status
      const currentStatus = sseStatus?.status || null;

      if (!isConnected && currentStatus === 'pending') {
        console.log(
          'SSE not connected, starting fallback polling for tx_ref:',
          txRef
        );

        let pollCount = 0;
        const maxPolls = 60; // Poll for 3 minutes (60 * 3 seconds)

        const poll = async () => {
          if (!pollingActive) return;

          try {
            const res = await fetch(
              `/api/topup/status?tx_ref=${encodeURIComponent(txRef)}`
            );
            if (res.ok) {
              const data = await res.json();
              console.log('Polling status check result:', data);

              if (data.status === 'confirmed') {
                pollingActive = false;
                if (pollInterval) clearInterval(pollInterval);
                setSuccessMessage(
                  'Thanh toán thành công! Số dư sẽ được cập nhật.'
                );
                setTimeout(() => router.push('/wallet'), 2000);
                return; // Stop polling
              }
              if (data.status === 'failed') {
                pollingActive = false;
                if (pollInterval) clearInterval(pollInterval);
                setConfirmError(
                  'Thanh toán thất bại hoặc đã hủy. Vui lòng thử lại.'
                );
                return; // Stop polling
              }

              // Continue polling if still pending
              pollCount++;
              if (pollCount >= maxPolls || !pollingActive) {
                pollingActive = false;
                if (pollInterval) clearInterval(pollInterval);
              }
            }
          } catch (err) {
            console.error('Polling error:', err);
            pollCount++;
            if (pollCount >= maxPolls || !pollingActive) {
              pollingActive = false;
              if (pollInterval) clearInterval(pollInterval);
            }
          }
        };

        // Start polling immediately, then every 3 seconds
        poll();
        pollInterval = setInterval(poll, 3000);
      }
    }, 5000); // Wait 5 seconds before starting fallback polling

    return () => {
      pollingActive = false;
      if (pollingTimeout) clearTimeout(pollingTimeout);
      if (pollInterval) clearInterval(pollInterval);
    };
  }, [txRef, isConnected, sseStatus?.status, router]);

  const formatCurrency = (v: number) =>
    new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(v);

  const handleInitTopup = async (e: React.FormEvent) => {
    e.preventDefault();
    setInitError(null);
    setConfirmError(null);
    setSuccessMessage(null);
    setLoading(true);
    try {
      const amt = parseInt(amount, 10);
      const res = await fetch('/api/topup/init', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: amt, paymentMethod }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data?.error || 'Khởi tạo nạp tiền thất bại');
      }
      setTxRef(data.txRef);
      setPaymentUrl(data.paymentUrl);
      setTopupAmount(data.amount);
    } catch (err: unknown) {
      setInitError(err instanceof Error ? err.message : 'Có lỗi xảy ra');
    } finally {
      setLoading(false);
    }
  };

  const openPayment = () => {
    if (paymentUrl) {
      window.open(paymentUrl, '_blank', 'noopener,noreferrer');
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Nạp tiền tạm ứng dịch vụ</h1>
          <p className="text-muted-foreground mt-1">
            Sử dụng PayOS hoặc Momo để nạp tiền vào số dư ảo của bạn
          </p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Khởi tạo giao dịch</CardTitle>
            <CardDescription>
              Nhập số tiền và chọn phương thức thanh toán
            </CardDescription>
          </CardHeader>
          <CardContent>
            {initError && (
              <Alert variant="destructive" className="mb-4">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{initError}</AlertDescription>
              </Alert>
            )}
            {successMessage && (
              <Alert className="mb-4">
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>{successMessage}</AlertDescription>
              </Alert>
            )}
            <form onSubmit={handleInitTopup} className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="amount">Số tiền (VND)</Label>
                <Input
                  id="amount"
                  type="number"
                  min={10000}
                  step={1000}
                  required
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  Tối thiểu 10.000đ, tối đa 10.000.000đ
                </p>
              </div>

              <div className="grid gap-2">
                <Label>Phương thức thanh toán</Label>
                <Select
                  value={paymentMethod}
                  onValueChange={(v) => setPaymentMethod(v as 'payos' | 'momo')}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn phương thức" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="payos">PayOS</SelectItem>
                    <SelectItem value="momo">Momo</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center gap-3">
                <Button type="submit" disabled={loading} className="gap-2">
                  {loading && <RefreshCw className="h-4 w-4 animate-spin" />}
                  Tạo liên kết thanh toán
                </Button>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => router.push('/wallet')}
                  disabled={loading}
                >
                  Quay về ví
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>

        {txRef && paymentUrl && (
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Thanh toán</CardTitle>
              <CardDescription>
                Số tiền: {topupAmount ? formatCurrency(topupAmount) : ''} • Mã
                giao dịch: {txRef}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {confirmError && (
                <Alert variant="destructive" className="mb-4">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>{confirmError}</AlertDescription>
                </Alert>
              )}
              <div className="space-y-3">
                <Button onClick={openPayment} className="gap-2">
                  <ExternalLink className="h-4 w-4" />
                  Mở trang thanh toán
                </Button>
                <p className="text-sm text-muted-foreground">
                  Hoàn tất thanh toán trên trang PayOS. Hệ thống sẽ tự động cập
                  nhật trạng thái.
                </p>
                {status === 'pending' && (
                  <div className="text-sm text-muted-foreground flex items-center gap-2">
                    <RefreshCw className="h-4 w-4 animate-spin" /> Đang chờ xác
                    nhận thanh toán...
                    {isConnected && (
                      <span className="text-xs text-green-600">
                        (Đã kết nối)
                      </span>
                    )}
                  </div>
                )}
                {sseError && (
                  <Alert variant="destructive" className="mb-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      <div className="space-y-2">
                        <p>{sseError.message}</p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => reconnect()}
                          >
                            Thử lại kết nối
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={async () => {
                              // Fallback: manually check status
                              try {
                                const res = await fetch(
                                  `/api/topup/status?tx_ref=${encodeURIComponent(txRef || '')}`
                                );
                                const data = await res.json();
                                if (data.status === 'confirmed') {
                                  setSuccessMessage('Thanh toán thành công!');
                                  setTimeout(
                                    () => router.push('/wallet'),
                                    2000
                                  );
                                } else if (data.status === 'failed') {
                                  setConfirmError('Thanh toán thất bại.');
                                } else {
                                  setConfirmError(null);
                                }
                              } catch (err) {
                                console.error('Status check failed:', err);
                                setConfirmError(
                                  'Không thể kiểm tra trạng thái. Vui lòng thử lại.'
                                );
                              }
                            }}
                          >
                            Kiểm tra thủ công
                          </Button>
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {!txRef && (
          <div className="mt-6 text-sm text-muted-foreground">
            Lưu ý: Đây là số dư ảo (tạm ứng dịch vụ). Giao dịch thật diễn ra qua
            PayOS/Momo.
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
