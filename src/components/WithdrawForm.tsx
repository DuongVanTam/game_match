'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Wallet,
  ArrowUpRight,
  AlertCircle,
  CheckCircle,
  Loader2,
  CreditCard,
  Smartphone,
  Building2,
} from 'lucide-react';

const withdrawSchema = z.object({
  amount: z
    .number()
    .min(10000, 'Số tiền tối thiểu là 10,000 VND')
    .max(10000000, 'Số tiền tối đa là 10,000,000 VND'),
  paymentMethod: z.literal('bank_transfer'),
  accountNumber: z
    .string()
    .min(1, 'Vui lòng nhập số tài khoản')
    .max(20, 'Số tài khoản không hợp lệ'),
  accountName: z
    .string()
    .min(1, 'Vui lòng nhập tên chủ tài khoản')
    .max(100, 'Tên chủ tài khoản không hợp lệ'),
  bankName: z.string().optional(),
  note: z.string().max(500, 'Ghi chú không được quá 500 ký tự').optional(),
});

export type WithdrawFormData = z.infer<typeof withdrawSchema>;

interface WithdrawFormProps {
  currentBalance: number;
  onWithdraw: (data: WithdrawFormData) => Promise<void>;
  loading?: boolean;
}

export function WithdrawForm({
  currentBalance,
  onWithdraw,
  loading = false,
}: WithdrawFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors },
  } = useForm<WithdrawFormData>({
    resolver: zodResolver(withdrawSchema),
    defaultValues: {
      paymentMethod: 'bank_transfer',
    },
  });

  const selectedPaymentMethod = watch('paymentMethod') as string;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const onSubmit = async (data: WithdrawFormData) => {
    if (data.amount > currentBalance) {
      setError('Số dư không đủ để thực hiện giao dịch');
      return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      await onWithdraw(data);
      setSuccess('Yêu cầu rút tiền đã được gửi thành công!');
    } catch (err) {
      setError(
        err instanceof Error ? err.message : 'Có lỗi xảy ra khi gửi yêu cầu'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'momo':
        return <Smartphone className="h-4 w-4" />;
      case 'bank_transfer':
        return <Building2 className="h-4 w-4" />;
      case 'vietqr':
        return <CreditCard className="h-4 w-4" />;
      default:
        return <Wallet className="h-4 w-4" />;
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

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ArrowUpRight className="h-5 w-5 text-primary" />
          Rút tiền từ ví
        </CardTitle>
        <CardDescription>
          Yêu cầu rút tiền từ số dư hiện tại của bạn
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Current Balance */}
          <div className="bg-green-50 p-4 rounded-lg border border-green-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Wallet className="h-5 w-5 text-green-600" />
                <span className="font-semibold text-green-800">
                  Số dư hiện tại
                </span>
              </div>
              <span className="text-lg font-bold text-green-800">
                {formatCurrency(currentBalance)}
              </span>
            </div>
          </div>

          {/* Amount */}
          <div className="space-y-2">
            <Label htmlFor="amount">Số tiền muốn rút</Label>
            <Input
              id="amount"
              type="number"
              placeholder="Nhập số tiền..."
              {...register('amount', { valueAsNumber: true })}
              className={errors.amount ? 'border-red-500' : ''}
            />
            {errors.amount && (
              <p className="text-sm text-red-600">{errors.amount.message}</p>
            )}
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setValue('amount', Math.floor(currentBalance * 0.25))
                }
              >
                25%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setValue('amount', Math.floor(currentBalance * 0.5))
                }
              >
                50%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() =>
                  setValue('amount', Math.floor(currentBalance * 0.75))
                }
              >
                75%
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setValue('amount', currentBalance)}
              >
                Tất cả
              </Button>
            </div>
          </div>

          {/* Payment Method */}
          <div className="space-y-2">
            <Label htmlFor="paymentMethod">Phương thức thanh toán</Label>
            <Select
              onValueChange={(value) =>
                setValue('paymentMethod', value as 'bank_transfer')
              }
              defaultValue="bank_transfer"
            >
              <SelectTrigger
                className={errors.paymentMethod ? 'border-red-500' : ''}
              >
                <SelectValue placeholder="Chọn phương thức thanh toán" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="bank_transfer">
                  <div className="flex items-center gap-2">
                    <Building2 className="h-4 w-4" />
                    Chuyển khoản ngân hàng
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
            {errors.paymentMethod && (
              <p className="text-sm text-red-600">
                {errors.paymentMethod.message}
              </p>
            )}
          </div>

          {/* Account Details */}
          {selectedPaymentMethod && (
            <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                {getPaymentMethodIcon(selectedPaymentMethod)}
                <span className="font-semibold">
                  Thông tin {getPaymentMethodLabel(selectedPaymentMethod)}
                </span>
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountNumber">
                  {selectedPaymentMethod === 'momo'
                    ? 'Số điện thoại MoMo'
                    : 'Số tài khoản'}
                </Label>
                <Input
                  id="accountNumber"
                  placeholder={
                    selectedPaymentMethod === 'momo'
                      ? 'Nhập số điện thoại MoMo...'
                      : 'Nhập số tài khoản...'
                  }
                  {...register('accountNumber')}
                  className={errors.accountNumber ? 'border-red-500' : ''}
                />
                {errors.accountNumber && (
                  <p className="text-sm text-red-600">
                    {errors.accountNumber.message}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="accountName">Tên chủ tài khoản</Label>
                <Input
                  id="accountName"
                  placeholder="Nhập tên chủ tài khoản..."
                  {...register('accountName')}
                  className={errors.accountName ? 'border-red-500' : ''}
                />
                {errors.accountName && (
                  <p className="text-sm text-red-600">
                    {errors.accountName.message}
                  </p>
                )}
              </div>

              {selectedPaymentMethod === 'bank_transfer' && (
                <div className="space-y-2">
                  <Label htmlFor="bankName">Tên ngân hàng</Label>
                  <Input
                    id="bankName"
                    placeholder="Nhập tên ngân hàng..."
                    {...register('bankName')}
                    className={errors.bankName ? 'border-red-500' : ''}
                  />
                  {errors.bankName && (
                    <p className="text-sm text-red-600">
                      {errors.bankName.message}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Note */}
          <div className="space-y-2">
            <Label htmlFor="note">Ghi chú (tùy chọn)</Label>
            <Input
              id="note"
              placeholder="Nhập ghi chú..."
              {...register('note')}
              className={errors.note ? 'border-red-500' : ''}
            />
            {errors.note && (
              <p className="text-sm text-red-600">{errors.note.message}</p>
            )}
          </div>

          {/* Error Alert */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Success Alert */}
          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                {success}
              </AlertDescription>
            </Alert>
          )}

          {/* Submit Button */}
          <Button
            type="submit"
            className="w-full"
            disabled={isSubmitting || loading}
          >
            {isSubmitting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Đang xử lý...
              </>
            ) : (
              <>
                <ArrowUpRight className="h-4 w-4 mr-2" />
                Gửi yêu cầu rút tiền
              </>
            )}
          </Button>

          {/* Terms */}
          <div className="text-xs text-muted-foreground">
            <p>• Yêu cầu rút tiền sẽ được xử lý trong vòng 24-48 giờ</p>
            <p>• Phí xử lý: Miễn phí</p>
            <p>• Số tiền tối thiểu: 10,000 VND</p>
            <p>• Số tiền tối đa: 10,000,000 VND</p>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
