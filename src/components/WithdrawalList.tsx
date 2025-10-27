'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw,
  Eye,
  Calendar,
  CreditCard,
} from 'lucide-react';

interface PayoutRequest {
  id: string;
  amount: number;
  status: 'pending' | 'approved' | 'processing' | 'completed' | 'rejected';
  payment_method: string;
  payment_details: {
    accountNumber: string;
    accountName: string;
    bankName?: string;
    note?: string;
  };
  admin_notes?: string;
  processed_at?: string;
  proof_tx?: string;
  created_at: string;
}

export function WithdrawalList() {
  const [requests, setRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRequests = async () => {
    try {
      const response = await fetch('/api/payouts');
      if (response.ok) {
        const data = await response.json();
        setRequests(data);
      } else {
        setError('Không thể tải danh sách yêu cầu rút tiền');
      }
    } catch {
      setError('Có lỗi xảy ra khi tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-blue-100 text-blue-800',
      processing: 'bg-purple-100 text-purple-800',
      completed: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: 'Chờ duyệt',
      approved: 'Đã duyệt',
      processing: 'Đang xử lý',
      completed: 'Hoàn thành',
      rejected: 'Từ chối',
    };
    return labels[status] || status;
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />;
      case 'approved':
        return <CheckCircle className="h-4 w-4" />;
      case 'processing':
        return <RefreshCw className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'rejected':
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const getPaymentMethodLabel = (method: string) => {
    switch (method) {
      case 'momo':
        return 'Ví MoMo';
      case 'bank_transfer':
        return 'Chuyển khoản ngân hàng';
      case 'vietqr':
        return 'VietQR';
      default:
        return method;
    }
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <RefreshCw className="h-6 w-6 animate-spin mr-2" />
            <span>Đang tải danh sách yêu cầu rút tiền...</span>
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <CreditCard className="h-5 w-5" />
          Lịch sử yêu cầu rút tiền
        </CardTitle>
        <CardDescription>
          Theo dõi trạng thái các yêu cầu rút tiền của bạn
        </CardDescription>
      </CardHeader>
      <CardContent>
        {requests.length === 0 ? (
          <div className="text-center py-8">
            <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Chưa có yêu cầu rút tiền
            </h3>
            <p className="text-muted-foreground">
              Bạn chưa có yêu cầu rút tiền nào. Hãy tạo yêu cầu mới để bắt đầu.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {requests.map((request) => (
              <div
                key={request.id}
                className="border rounded-lg p-4 hover:bg-gray-50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">
                        {formatCurrency(request.amount)}
                      </h3>
                      <Badge className={getStatusColor(request.status)}>
                        <div className="flex items-center gap-1">
                          {getStatusIcon(request.status)}
                          {getStatusLabel(request.status)}
                        </div>
                      </Badge>
                    </div>

                    <div className="grid gap-2 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <CreditCard className="h-4 w-4" />
                        <span>
                          {getPaymentMethodLabel(request.payment_method)}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        <span>Tạo lúc: {formatDate(request.created_at)}</span>
                      </div>

                      {request.processed_at && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4" />
                          <span>
                            Xử lý lúc: {formatDate(request.processed_at)}
                          </span>
                        </div>
                      )}

                      {request.admin_notes && (
                        <div className="mt-2 p-2 bg-blue-50 rounded border border-blue-200">
                          <p className="text-sm text-blue-800">
                            <strong>Ghi chú từ admin:</strong>{' '}
                            {request.admin_notes}
                          </p>
                        </div>
                      )}

                      {request.proof_tx && (
                        <div className="mt-2 p-2 bg-green-50 rounded border border-green-200">
                          <p className="text-sm text-green-800">
                            <strong>Mã giao dịch:</strong> {request.proof_tx}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Eye className="h-4 w-4 mr-1" />
                      Chi tiết
                    </Button>
                  </div>
                </div>

                {/* Payment Details */}
                <div className="mt-3 pt-3 border-t">
                  <div className="grid gap-1 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Số tài khoản:
                      </span>
                      <span className="font-mono">
                        {request.payment_details.accountNumber}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">
                        Tên chủ tài khoản:
                      </span>
                      <span>{request.payment_details.accountName}</span>
                    </div>
                    {request.payment_details.bankName && (
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">
                          Ngân hàng:
                        </span>
                        <span>{request.payment_details.bankName}</span>
                      </div>
                    )}
                    {request.payment_details.note && (
                      <div className="mt-2">
                        <span className="text-muted-foreground">Ghi chú:</span>
                        <p className="text-sm mt-1">
                          {request.payment_details.note}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
