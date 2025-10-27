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
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Shield,
  CreditCard,
  CheckCircle,
  XCircle,
  Clock,
  RefreshCw,
  AlertCircle,
  Download,
  Eye,
  Calendar,
  User,
  DollarSign,
} from 'lucide-react';

interface PayoutRequest {
  id: string;
  user_id: string;
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
  processed_by?: string;
  processed_at?: string;
  proof_tx?: string;
  created_at: string;
  updated_at: string;
  user: {
    full_name: string;
    email: string;
  };
}

export default function AdminPayoutsPage() {
  const [payoutRequests, setPayoutRequests] = useState<PayoutRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedRequest, setSelectedRequest] = useState<PayoutRequest | null>(
    null
  );
  const [actionLoading, setActionLoading] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  const fetchPayoutRequests = async () => {
    try {
      const response = await fetch('/api/admin/payouts');
      if (response.ok) {
        const data = await response.json();
        setPayoutRequests(data);
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
    fetchPayoutRequests();
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

  const handleStatusUpdate = async (
    requestId: string,
    newStatus: string,
    adminNotes?: string,
    proofTx?: string
  ) => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/admin/payouts/${requestId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: newStatus,
          admin_notes: adminNotes,
          proof_tx: proofTx,
        }),
      });

      if (response.ok) {
        await fetchPayoutRequests();
        setSelectedRequest(null);
        alert('Cập nhật trạng thái thành công!');
      } else {
        const error = await response.json();
        alert(`Lỗi: ${error.error}`);
      }
    } catch {
      alert('Có lỗi xảy ra khi cập nhật trạng thái');
    } finally {
      setActionLoading(false);
    }
  };

  const exportToCSV = () => {
    const csvData = payoutRequests.map((request) => ({
      ID: request.id,
      'Người dùng': request.user.full_name,
      Email: request.user.email,
      'Số tiền': request.amount,
      'Phương thức': getPaymentMethodLabel(request.payment_method),
      'Trạng thái': getStatusLabel(request.status),
      'Ngày tạo': formatDate(request.created_at),
      'Ngày xử lý': request.processed_at
        ? formatDate(request.processed_at)
        : '',
      'Ghi chú': request.admin_notes || '',
      'Mã giao dịch': request.proof_tx || '',
    }));

    const csvContent = [
      Object.keys(csvData[0]).join(','),
      ...csvData.map((row) =>
        Object.values(row)
          .map((value) => `"${value}"`)
          .join(',')
      ),
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute(
      'download',
      `payout-requests-${new Date().toISOString().split('T')[0]}.csv`
    );
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const filteredRequests =
    filterStatus === 'all'
      ? payoutRequests
      : payoutRequests.filter((req) => req.status === filterStatus);

  if (loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-8 w-8 animate-spin mx-auto mb-4" />
            <p>Đang tải danh sách yêu cầu rút tiền...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            <div>
              <h1 className="text-3xl font-bold">Quản lý rút tiền</h1>
              <p className="text-muted-foreground">
                Duyệt và xử lý các yêu cầu rút tiền của người dùng
              </p>
            </div>
          </div>
          <Button onClick={exportToCSV} variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Xuất CSV
          </Button>
        </div>
      </div>

      {/* Stats Overview */}
      <div className="grid gap-4 md:grid-cols-5 mb-8">
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold">{payoutRequests.length}</div>
              <div className="text-sm text-muted-foreground">Tổng yêu cầu</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-yellow-600">
                {payoutRequests.filter((r) => r.status === 'pending').length}
              </div>
              <div className="text-sm text-muted-foreground">Chờ duyệt</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-blue-600">
                {payoutRequests.filter((r) => r.status === 'approved').length}
              </div>
              <div className="text-sm text-muted-foreground">Đã duyệt</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-green-600">
                {payoutRequests.filter((r) => r.status === 'completed').length}
              </div>
              <div className="text-sm text-muted-foreground">Hoàn thành</div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-center">
              <div className="text-2xl font-bold text-red-600">
                {payoutRequests.filter((r) => r.status === 'rejected').length}
              </div>
              <div className="text-sm text-muted-foreground">Từ chối</div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <div className="flex items-center gap-4">
            <Label htmlFor="status-filter">Lọc theo trạng thái:</Label>
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tất cả</SelectItem>
                <SelectItem value="pending">Chờ duyệt</SelectItem>
                <SelectItem value="approved">Đã duyệt</SelectItem>
                <SelectItem value="processing">Đang xử lý</SelectItem>
                <SelectItem value="completed">Hoàn thành</SelectItem>
                <SelectItem value="rejected">Từ chối</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Payout Requests List */}
      <div className="space-y-4">
        {filteredRequests.map((request) => (
          <Card key={request.id}>
            <CardContent className="p-6">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-3">
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

                  <div className="grid gap-2 text-sm text-muted-foreground mb-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      <span>
                        {request.user.full_name} ({request.user.email})
                      </span>
                    </div>

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
                  </div>

                  {/* Payment Details */}
                  <div className="bg-gray-50 p-3 rounded-lg mb-4">
                    <h4 className="font-semibold mb-2">
                      Thông tin thanh toán:
                    </h4>
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
                          <span className="text-muted-foreground">
                            Ghi chú:
                          </span>
                          <p className="text-sm mt-1">
                            {request.payment_details.note}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>

                  {request.admin_notes && (
                    <div className="bg-blue-50 p-3 rounded-lg mb-4">
                      <h4 className="font-semibold mb-1">Ghi chú admin:</h4>
                      <p className="text-sm text-blue-800">
                        {request.admin_notes}
                      </p>
                    </div>
                  )}

                  {request.proof_tx && (
                    <div className="bg-green-50 p-3 rounded-lg mb-4">
                      <h4 className="font-semibold mb-1">Mã giao dịch:</h4>
                      <p className="text-sm text-green-800 font-mono">
                        {request.proof_tx}
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSelectedRequest(request)}
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    Chi tiết
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Detail Modal */}
      {selectedRequest && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <Card className="w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Chi tiết yêu cầu rút tiền
              </CardTitle>
              <CardDescription>ID: {selectedRequest.id}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Status Update Form */}
              <div className="space-y-4">
                <div>
                  <Label htmlFor="status">Cập nhật trạng thái</Label>
                  <Select
                    defaultValue={selectedRequest.status}
                    onValueChange={(value) => {
                      setSelectedRequest({
                        ...selectedRequest,
                        status: value as PayoutRequest['status'],
                      });
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Chờ duyệt</SelectItem>
                      <SelectItem value="approved">Đã duyệt</SelectItem>
                      <SelectItem value="processing">Đang xử lý</SelectItem>
                      <SelectItem value="completed">Hoàn thành</SelectItem>
                      <SelectItem value="rejected">Từ chối</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="adminNotes">Ghi chú admin</Label>
                  <Textarea
                    id="adminNotes"
                    placeholder="Nhập ghi chú..."
                    defaultValue={selectedRequest.admin_notes || ''}
                    onChange={(e) => {
                      setSelectedRequest({
                        ...selectedRequest,
                        admin_notes: e.target.value,
                      });
                    }}
                  />
                </div>

                <div>
                  <Label htmlFor="proofTx">Mã giao dịch (nếu có)</Label>
                  <Input
                    id="proofTx"
                    placeholder="Nhập mã giao dịch..."
                    defaultValue={selectedRequest.proof_tx || ''}
                    onChange={(e) => {
                      setSelectedRequest({
                        ...selectedRequest,
                        proof_tx: e.target.value,
                      });
                    }}
                  />
                </div>

                <div className="flex gap-2">
                  <Button
                    onClick={() =>
                      handleStatusUpdate(
                        selectedRequest.id,
                        selectedRequest.status,
                        selectedRequest.admin_notes,
                        selectedRequest.proof_tx
                      )
                    }
                    disabled={actionLoading}
                  >
                    {actionLoading ? (
                      <>
                        <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                        Đang cập nhật...
                      </>
                    ) : (
                      'Cập nhật trạng thái'
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => setSelectedRequest(null)}
                  >
                    Đóng
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
