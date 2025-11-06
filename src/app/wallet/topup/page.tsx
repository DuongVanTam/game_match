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
  const [status, setStatus] = useState<
    'pending' | 'confirmed' | 'failed' | null
  >(null);

  // Polling to check topup status
  useEffect(() => {
    if (!txRef) {
      return;
    }

    let pollInterval: NodeJS.Timeout | null = null;
    let pollingActive = true;

    console.log('Starting polling for tx_ref:', txRef);

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

          setStatus(data.status);

          if (data.status === 'confirmed') {
            pollingActive = false;
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
            setSuccessMessage('Thanh toán thành công! Số dư sẽ được cập nhật.');
            setTimeout(() => router.push('/wallet'), 2000);
            return; // Stop polling
          }
          if (data.status === 'failed') {
            pollingActive = false;
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
            setConfirmError(
              'Thanh toán thất bại hoặc đã hủy. Vui lòng thử lại.'
            );
            return; // Stop polling
          }

          // Continue polling if still pending
          pollCount++;
          if (pollCount >= maxPolls) {
            console.log('Polling reached max attempts, stopping');
            pollingActive = false;
            if (pollInterval) {
              clearInterval(pollInterval);
              pollInterval = null;
            }
          }
        }
      } catch (err) {
        console.error('Polling error:', err);
        pollCount++;
        if (pollCount >= maxPolls || !pollingActive) {
          pollingActive = false;
          if (pollInterval) {
            clearInterval(pollInterval);
            pollInterval = null;
          }
        }
      }
    };

    // Start polling immediately, then every 3 seconds
    poll();
    pollInterval = setInterval(poll, 3000);

    return () => {
      pollingActive = false;
      if (pollInterval) {
        clearInterval(pollInterval);
        pollInterval = null;
      }
    };
  }, [txRef, router]);

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
                  </div>
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
