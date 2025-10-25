'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Wallet, Plus, History, CreditCard } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Validation schemas
const topupSchema = z.object({
  amount: z
    .number({ message: 'Số tiền là bắt buộc' })
    .min(10000, 'Số tiền tối thiểu là 10,000 VNĐ')
    .max(10000000, 'Số tiền tối đa là 10,000,000 VNĐ'),
  paymentMethod: z.enum(['momo', 'payos'], {
    message: 'Vui lòng chọn phương thức thanh toán',
  }),
});

type TopupFormData = z.infer<typeof topupSchema>;

interface WalletData {
  balance: number;
  user: {
    full_name: string;
    email: string;
  };
}

interface Transaction {
  id: string;
  transaction_type: string;
  amount: number;
  balance_after: number;
  description: string;
  created_at: string;
}

export default function WalletPage() {
  const [walletData, setWalletData] = useState<WalletData | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [topupLoading, setTopupLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<TopupFormData>({
    resolver: zodResolver(topupSchema),
  });

  // Fetch wallet data
  useEffect(() => {
    fetchWalletData();
    fetchTransactions();
  }, []);

  const fetchWalletData = async () => {
    try {
      const response = await fetch('/api/wallet/balance');
      if (response.ok) {
        const data = await response.json();
        setWalletData(data);
      }
    } catch (error) {
      console.error('Error fetching wallet data:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/wallet/transactions');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('Error fetching transactions:', error);
    }
  };

  const onSubmitTopup = async (data: TopupFormData) => {
    setTopupLoading(true);
    try {
      const response = await fetch('/api/topup/init', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        // Redirect to payment or show payment link
        if (result.paymentUrl) {
          window.open(result.paymentUrl, '_blank');
        }
        reset();
      } else {
        const error = await response.json();
        alert(`Lỗi: ${error.message}`);
      }
    } catch (error) {
      console.error('Error initiating topup:', error);
      alert('Có lỗi xảy ra khi tạo giao dịch nạp tiền');
    } finally {
      setTopupLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const getTransactionTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      topup: 'Nạp tiền',
      join_match: 'Tham gia trận đấu',
      leave_match: 'Rời trận đấu',
      win_prize: 'Thắng giải',
      service_fee: 'Phí dịch vụ',
      withdraw: 'Rút tiền',
    };
    return labels[type] || type;
  };

  const getTransactionTypeColor = (type: string) => {
    const colors: Record<string, string> = {
      topup: 'bg-green-100 text-green-800',
      join_match: 'bg-blue-100 text-blue-800',
      leave_match: 'bg-yellow-100 text-yellow-800',
      win_prize: 'bg-purple-100 text-purple-800',
      service_fee: 'bg-red-100 text-red-800',
      withdraw: 'bg-orange-100 text-orange-800',
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Đang tải thông tin ví...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Ví Tạm Ứng Dịch Vụ</h1>
        <p className="text-muted-foreground">
          Quản lý số dư và giao dịch của bạn
        </p>
      </div>

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <Wallet className="h-4 w-4" />
            Tổng quan
          </TabsTrigger>
          <TabsTrigger value="topup" className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nạp tiền
          </TabsTrigger>
          <TabsTrigger value="history" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Lịch sử
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Balance Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Wallet className="h-5 w-5" />
                  Số dư hiện tại
                </CardTitle>
                <CardDescription>Số dư tạm ứng dịch vụ của bạn</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">
                  {walletData ? formatCurrency(walletData.balance) : '0 ₫'}
                </div>
                <p className="text-sm text-muted-foreground mt-2">
                  Có thể sử dụng để tham gia các trận đấu
                </p>
              </CardContent>
            </Card>

            {/* User Info Card */}
            <Card>
              <CardHeader>
                <CardTitle>Thông tin tài khoản</CardTitle>
                <CardDescription>Thông tin cá nhân của bạn</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <div>
                    <Label className="text-sm font-medium">Họ tên</Label>
                    <p className="text-sm text-muted-foreground">
                      {walletData?.user.full_name || 'Chưa cập nhật'}
                    </p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium">Email</Label>
                    <p className="text-sm text-muted-foreground">
                      {walletData?.user.email || 'Chưa cập nhật'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Recent Transactions */}
          <Card>
            <CardHeader>
              <CardTitle>Giao dịch gần đây</CardTitle>
              <CardDescription>5 giao dịch mới nhất</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.slice(0, 5).map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          className={getTransactionTypeColor(
                            transaction.transaction_type
                          )}
                        >
                          {getTransactionTypeLabel(
                            transaction.transaction_type
                          )}
                        </Badge>
                        <div>
                          <p className="font-medium">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(transaction.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-medium ${
                            transaction.amount > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {transaction.amount > 0 ? '+' : ''}
                          {formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Số dư: {formatCurrency(transaction.balance_after)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Chưa có giao dịch nào
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="topup" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5" />
                Nạp tiền vào ví
              </CardTitle>
              <CardDescription>
                Nạp tiền tạm ứng dịch vụ để tham gia các trận đấu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form
                onSubmit={handleSubmit(onSubmitTopup)}
                className="space-y-6"
              >
                <div className="space-y-2">
                  <Label htmlFor="amount">Số tiền (VNĐ)</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Nhập số tiền muốn nạp"
                    {...register('amount', { valueAsNumber: true })}
                  />
                  {errors.amount && (
                    <p className="text-sm text-red-600">
                      {errors.amount.message}
                    </p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Phương thức thanh toán</Label>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="momo"
                        value="momo"
                        {...register('paymentMethod')}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="momo">Momo</Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <input
                        type="radio"
                        id="payos"
                        value="payos"
                        {...register('paymentMethod')}
                        className="h-4 w-4"
                      />
                      <Label htmlFor="payos">PayOS</Label>
                    </div>
                  </div>
                  {errors.paymentMethod && (
                    <p className="text-sm text-red-600">
                      {errors.paymentMethod.message}
                    </p>
                  )}
                </div>

                <Button
                  type="submit"
                  className="w-full"
                  disabled={topupLoading}
                >
                  {topupLoading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Đang xử lý...
                    </>
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Nạp tiền
                    </>
                  )}
                </Button>
              </form>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Lịch sử giao dịch</CardTitle>
              <CardDescription>Tất cả giao dịch của bạn</CardDescription>
            </CardHeader>
            <CardContent>
              {transactions.length > 0 ? (
                <div className="space-y-4">
                  {transactions.map((transaction) => (
                    <div
                      key={transaction.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <Badge
                          className={getTransactionTypeColor(
                            transaction.transaction_type
                          )}
                        >
                          {getTransactionTypeLabel(
                            transaction.transaction_type
                          )}
                        </Badge>
                        <div>
                          <p className="font-medium">
                            {transaction.description}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            {formatDate(transaction.created_at)}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p
                          className={`font-medium ${
                            transaction.amount > 0
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                        >
                          {transaction.amount > 0 ? '+' : ''}
                          {formatCurrency(transaction.amount)}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Số dư: {formatCurrency(transaction.balance_after)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-center text-muted-foreground py-8">
                  Chưa có giao dịch nào
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
