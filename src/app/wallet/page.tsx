'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Wallet,
  ArrowUpRight,
  CreditCard,
  TrendingUp,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { WithdrawForm } from '@/components/WithdrawForm';
import { WithdrawalList } from '@/components/WithdrawalList';
import { BalanceHistory } from '@/components/BalanceHistory';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

interface WalletData {
  balance: number;
  transactions: Transaction[];
}

export default function WalletPage() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchWalletData = async () => {
    try {
      const response = await fetch('/api/wallet/balance');
      if (response.ok) {
        const data = await response.json();
        setWalletData(data);
      } else {
        setError('Không thể tải thông tin ví');
      }
    } catch {
      setError('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchWalletData();
  }, []);

  const handleWithdraw = async (withdrawData: {
    amount: number;
    paymentMethod: string;
    accountNumber: string;
    accountName: string;
    bankName?: string;
    note?: string;
  }) => {
    try {
      const response = await fetch('/api/payouts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(withdrawData),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(
          errorData.error || 'Có lỗi xảy ra khi tạo yêu cầu rút tiền'
        );
      }

      // Refresh wallet data after successful withdrawal request
      await fetchWalletData();
    } catch (err) {
      throw err;
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
              <p>Đang tải thông tin ví...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        </div>
        <Footer />
      </div>
    );
  }

  if (!walletData) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>Không tìm thấy thông tin ví</AlertDescription>
          </Alert>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Wallet className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Ví của tôi</h1>
          </div>
          <p className="text-muted-foreground">
            Quản lý số dư và các giao dịch của bạn
          </p>
        </div>

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Tổng quan</TabsTrigger>
            <TabsTrigger value="withdraw">Rút tiền</TabsTrigger>
            <TabsTrigger value="requests">Yêu cầu rút tiền</TabsTrigger>
            <TabsTrigger value="history">Lịch sử</TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Balance Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Số dư hiện tại
                </CardTitle>
                <CardDescription>
                  Số tiền có sẵn trong ví của bạn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8">
                  <div className="text-4xl font-bold text-primary mb-2">
                    {formatCurrency(walletData.balance)}
                  </div>
                  <p className="text-muted-foreground">Số dư khả dụng</p>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <ArrowUpRight className="h-5 w-5 text-primary" />
                    Rút tiền
                  </CardTitle>
                  <CardDescription>
                    Rút tiền từ ví về tài khoản của bạn
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Yêu cầu rút tiền sẽ được xử lý trong vòng 24-48 giờ
                    </p>
                    <button
                      onClick={() => setActiveTab('withdraw')}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-md transition-colors"
                    >
                      Tạo yêu cầu rút tiền
                    </button>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    Nạp tiền
                  </CardTitle>
                  <CardDescription>
                    Nạp tiền vào ví để tham gia trận đấu
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="text-center py-4">
                    <p className="text-sm text-muted-foreground mb-4">
                      Nạp tiền nhanh chóng và an toàn
                    </p>
                    <button
                      onClick={() => (window.location.href = '/wallet/topup')}
                      className="w-full bg-green-600 text-white hover:bg-green-700 px-4 py-2 rounded-md transition-colors"
                    >
                      Nạp tiền ngay
                    </button>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Recent Transactions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Giao dịch gần đây
                </CardTitle>
                <CardDescription>5 giao dịch mới nhất của bạn</CardDescription>
              </CardHeader>
              <CardContent>
                {walletData.transactions &&
                walletData.transactions.length > 0 ? (
                  <div className="space-y-3">
                    {walletData.transactions.slice(0, 5).map((transaction) => (
                      <div
                        key={transaction.id}
                        className="flex items-center justify-between p-3 border rounded-lg"
                      >
                        <div>
                          <p className="font-semibold">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {new Date(transaction.created_at).toLocaleString(
                              'vi-VN'
                            )}
                          </p>
                        </div>
                        <div
                          className={`font-semibold ${
                            transaction.amount > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {transaction.amount > 0 ? '+' : ''}
                          {formatCurrency(transaction.amount)}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Chưa có giao dịch nào
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="withdraw">
            <WithdrawForm
              currentBalance={walletData.balance}
              onWithdraw={handleWithdraw}
            />
          </TabsContent>

          <TabsContent value="requests">
            <WithdrawalList />
          </TabsContent>

          <TabsContent value="history">
            <BalanceHistory />
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
