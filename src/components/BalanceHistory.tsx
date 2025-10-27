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
  TrendingUp,
  RefreshCw,
  AlertCircle,
  Calendar,
  CreditCard,
  Gamepad2,
  ArrowUpRight,
  ArrowDownLeft,
  DollarSign,
} from 'lucide-react';

interface Transaction {
  id: string;
  transaction_type:
    | 'topup'
    | 'join_match'
    | 'leave_match'
    | 'win_prize'
    | 'service_fee'
    | 'withdraw';
  amount: number;
  balance_after: number;
  description: string | null;
  reference_id: string | null;
  reference_type: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export function BalanceHistory() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/wallet/transactions');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data.transactions || []);
        setCurrentBalance(data.balance || 0);
      } else {
        setError('Không thể tải lịch sử giao dịch');
      }
    } catch {
      setError('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('vi-VN');
  };

  const getTransactionIcon = (type: string) => {
    switch (type) {
      case 'topup':
        return <ArrowDownLeft className="h-4 w-4 text-green-600" />;
      case 'join_match':
        return <Gamepad2 className="h-4 w-4 text-blue-600" />;
      case 'leave_match':
        return <ArrowUpRight className="h-4 w-4 text-orange-600" />;
      case 'win_prize':
        return <TrendingUp className="h-4 w-4 text-yellow-600" />;
      case 'service_fee':
        return <DollarSign className="h-4 w-4 text-red-600" />;
      case 'withdraw':
        return <ArrowUpRight className="h-4 w-4 text-purple-600" />;
      default:
        return <CreditCard className="h-4 w-4" />;
    }
  };

  const getTransactionLabel = (type: string) => {
    switch (type) {
      case 'topup':
        return 'Nạp tiền';
      case 'join_match':
        return 'Tham gia trận đấu';
      case 'leave_match':
        return 'Rời trận đấu';
      case 'win_prize':
        return 'Thắng giải thưởng';
      case 'service_fee':
        return 'Phí dịch vụ';
      case 'withdraw':
        return 'Rút tiền';
      default:
        return type;
    }
  };

  const getTransactionColor = (type: string, amount: number) => {
    if (amount > 0) {
      return 'text-green-600';
    } else {
      return 'text-red-600';
    }
  };

  const getTransactionSign = (amount: number) => {
    return amount > 0 ? '+' : '';
  };

  // Filter transactions by type
  const topupTransactions = transactions.filter(
    (t) => t.transaction_type === 'topup'
  );
  const matchTransactions = transactions.filter((t) =>
    ['join_match', 'leave_match', 'win_prize'].includes(t.transaction_type)
  );
  const withdrawTransactions = transactions.filter(
    (t) => t.transaction_type === 'withdraw'
  );

  // Calculate statistics
  const totalTopup = topupTransactions.reduce((sum, t) => sum + t.amount, 0);
  const totalWinnings = transactions
    .filter((t) => t.transaction_type === 'win_prize')
    .reduce((sum, t) => sum + t.amount, 0);
  const totalWithdraw = withdrawTransactions.reduce(
    (sum, t) => sum + Math.abs(t.amount),
    0
  );
  const totalSpent = transactions
    .filter((t) => ['join_match', 'service_fee'].includes(t.transaction_type))
    .reduce((sum, t) => sum + Math.abs(t.amount), 0);

  // Suppress unused variable warning
  void totalSpent;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Đang tải lịch sử giao dịch...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Alert variant="destructive">
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    );
  }

  const renderTransactionList = (transactionList: Transaction[]) => {
    if (transactionList.length === 0) {
      return (
        <div className="text-center py-8">
          <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <p className="text-muted-foreground">Chưa có giao dịch nào</p>
        </div>
      );
    }

    return (
      <div className="space-y-3">
        {transactionList.map((transaction) => (
          <div
            key={transaction.id}
            className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
          >
            <div className="flex-shrink-0">
              {getTransactionIcon(transaction.transaction_type)}
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <p className="font-semibold truncate">
                  {getTransactionLabel(transaction.transaction_type)}
                </p>
                <p
                  className={`font-semibold ${getTransactionColor(transaction.transaction_type, transaction.amount)}`}
                >
                  {getTransactionSign(transaction.amount)}
                  {formatCurrency(Math.abs(transaction.amount))}
                </p>
              </div>

              {transaction.description && (
                <p className="text-sm text-muted-foreground truncate">
                  {transaction.description}
                </p>
              )}

              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                <span>{formatDate(transaction.created_at)}</span>
                <span>•</span>
                <span>Số dư: {formatCurrency(transaction.balance_after)}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="space-y-6">
      {/* Balance Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Wallet className="h-5 w-5" />
            Tổng quan số dư
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
            <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
              <div className="text-2xl font-bold text-green-600">
                {formatCurrency(currentBalance)}
              </div>
              <div className="text-sm text-green-800">Số dư hiện tại</div>
            </div>

            <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="text-2xl font-bold text-blue-600">
                {formatCurrency(totalTopup)}
              </div>
              <div className="text-sm text-blue-800">Tổng nạp tiền</div>
            </div>

            <div className="text-center p-4 bg-yellow-50 rounded-lg border border-yellow-200">
              <div className="text-2xl font-bold text-yellow-600">
                {formatCurrency(totalWinnings)}
              </div>
              <div className="text-sm text-yellow-800">Tổng thắng giải</div>
            </div>

            <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
              <div className="text-2xl font-bold text-purple-600">
                {formatCurrency(totalWithdraw)}
              </div>
              <div className="text-sm text-purple-800">Tổng rút tiền</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Transaction History */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Lịch sử giao dịch
          </CardTitle>
          <CardDescription>
            Chi tiết tất cả các giao dịch trong tài khoản của bạn
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="all" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="all">Tất cả</TabsTrigger>
              <TabsTrigger value="topup">Nạp tiền</TabsTrigger>
              <TabsTrigger value="matches">Trận đấu</TabsTrigger>
              <TabsTrigger value="withdraw">Rút tiền</TabsTrigger>
            </TabsList>

            <TabsContent value="all" className="mt-4">
              {renderTransactionList(transactions)}
            </TabsContent>

            <TabsContent value="topup" className="mt-4">
              {renderTransactionList(topupTransactions)}
            </TabsContent>

            <TabsContent value="matches" className="mt-4">
              {renderTransactionList(matchTransactions)}
            </TabsContent>

            <TabsContent value="withdraw" className="mt-4">
              {renderTransactionList(withdrawTransactions)}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
