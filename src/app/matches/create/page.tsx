'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
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
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Gamepad2, X } from 'lucide-react';
import Link from 'next/link';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { calculatePrize } from '@/lib/match-rewards';

// Validation schema
const createMatchSchema = z.object({
  title: z
    .string()
    .min(1, 'Tiêu đề là bắt buộc')
    .max(100, 'Tiêu đề không được quá 100 ký tự'),
  description: z
    .string()
    .min(1, 'Mô tả là bắt buộc')
    .max(500, 'Mô tả không được quá 500 ký tự'),
  entry_fee: z
    .number({ message: 'Phí tham gia là bắt buộc' })
    .min(10000, 'Phí tham gia tối thiểu là 10,000 VNĐ')
    .max(1000000, 'Phí tham gia tối đa là 1,000,000 VNĐ'),
  max_players: z
    .number({ message: 'Số người chơi là bắt buộc' })
    .refine((val) => [2, 3, 4, 8].includes(val), {
      message: 'Số người chơi chỉ có thể là 2, 3, 4 hoặc 8',
    }),
});

type CreateMatchFormData = z.infer<typeof createMatchSchema>;

export default function CreateMatchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (
    type: 'success' | 'error' | 'info',
    message: string
  ) => setNotification({ type, message });

  const clearNotification = () => setNotification(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
    control,
  } = useForm<CreateMatchFormData>({
    resolver: zodResolver(createMatchSchema),
    defaultValues: {
      max_players: 8,
    },
  });

  const entryFee = watch('entry_fee') || 0;
  const maxPlayers = watch('max_players') || 8;
  const totalPool = entryFee * maxPlayers;
  const serviceFee = totalPool * 0.1; // 10% service fee
  const prizePool = totalPool - serviceFee;

  // Calculate prizes for each rank based on player count
  const getPrizeBreakdown = () => {
    if (!entryFee || entryFee < 10000) {
      return [];
    }
    const breakdown: Array<{ rank: number; prize: number }> = [];
    if (maxPlayers === 2) {
      breakdown.push({ rank: 1, prize: calculatePrize(entryFee, 2, 1) });
    } else if (maxPlayers === 3) {
      breakdown.push({ rank: 1, prize: calculatePrize(entryFee, 3, 1) });
      breakdown.push({ rank: 2, prize: calculatePrize(entryFee, 3, 2) });
    } else if (maxPlayers === 4) {
      breakdown.push({ rank: 1, prize: calculatePrize(entryFee, 4, 1) });
      breakdown.push({ rank: 2, prize: calculatePrize(entryFee, 4, 2) });
    } else if (maxPlayers === 8) {
      breakdown.push({ rank: 1, prize: calculatePrize(entryFee, 8, 1) });
      breakdown.push({ rank: 2, prize: calculatePrize(entryFee, 8, 2) });
      breakdown.push({ rank: 3, prize: calculatePrize(entryFee, 8, 3) });
      breakdown.push({ rank: 4, prize: calculatePrize(entryFee, 8, 4) });
    }
    return breakdown;
  };

  const prizeBreakdown = getPrizeBreakdown();
  const totalPrizeAmount = prizeBreakdown.reduce(
    (sum, item) => sum + item.prize,
    0
  );

  const onSubmit = async (data: CreateMatchFormData) => {
    clearNotification();
    setLoading(true);
    try {
      const response = await fetch('/api/matches', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      if (response.ok) {
        const result = await response.json();
        showNotification('success', 'Tạo trận đấu thành công!');
        router.push(`/matches/${result.id}`);
      } else {
        const error = await response.json();
        const message =
          error.message ||
          error.error ||
          'Không thể tạo trận đấu. Vui lòng thử lại.';
        showNotification('error', message);
      }
    } catch (error) {
      console.error('Error creating match:', error);
      showNotification(
        'error',
        'Có lỗi xảy ra khi tạo trận đấu. Vui lòng thử lại sau.'
      );
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <Link
            href="/matches"
            className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground mb-4"
          >
            <ArrowLeft className="h-4 w-4" />
            Quay lại danh sách trận đấu
          </Link>
          <h1 className="text-3xl font-bold mb-2">Tạo Trận Đấu Mới</h1>
          <p className="text-muted-foreground">
            Tạo trận đấu TFT và mời người chơi khác tham gia
          </p>
        </div>

        {notification && (
          <Alert
            variant={notification.type === 'error' ? 'destructive' : 'default'}
            className={`mb-6 ${
              notification.type === 'success'
                ? 'border-green-200 bg-green-50 text-green-800'
                : notification.type === 'info'
                  ? 'border-blue-200 bg-blue-50 text-blue-800'
                  : ''
            }`}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <AlertTitle>
                  {notification.type === 'error'
                    ? 'Có lỗi xảy ra'
                    : notification.type === 'success'
                      ? 'Thành công'
                      : 'Thông báo'}
                </AlertTitle>
                <AlertDescription>{notification.message}</AlertDescription>
              </div>
              <button
                type="button"
                onClick={clearNotification}
                className="text-muted-foreground transition-colors hover:text-foreground"
                aria-label="Đóng thông báo"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </Alert>
        )}

        <div className="grid gap-8 lg:grid-cols-3">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5" />
                  Thông tin trận đấu
                </CardTitle>
                <CardDescription>
                  Điền thông tin chi tiết về trận đấu của bạn
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Tiêu đề trận đấu</Label>
                    <Input
                      id="title"
                      placeholder="Ví dụ: Trận đấu TFT hạng vàng"
                      {...register('title')}
                    />
                    {errors.title && (
                      <p className="text-sm text-red-600">
                        {errors.title.message}
                      </p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Mô tả</Label>
                    <Textarea
                      id="description"
                      placeholder="Mô tả chi tiết về trận đấu, quy tắc, thời gian..."
                      rows={4}
                      {...register('description')}
                    />
                    {errors.description && (
                      <p className="text-sm text-red-600">
                        {errors.description.message}
                      </p>
                    )}
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="entry_fee">Phí tham gia (VNĐ)</Label>
                      <Input
                        id="entry_fee"
                        type="number"
                        placeholder="100000"
                        {...register('entry_fee', { valueAsNumber: true })}
                      />
                      {errors.entry_fee && (
                        <p className="text-sm text-red-600">
                          {errors.entry_fee.message}
                        </p>
                      )}
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="max_players">Số người chơi tối đa</Label>
                      <Controller
                        name="max_players"
                        control={control}
                        render={({ field }) => (
                          <Select
                            value={field.value?.toString()}
                            onValueChange={(value) =>
                              field.onChange(parseInt(value, 10))
                            }
                          >
                            <SelectTrigger id="max_players">
                              <SelectValue placeholder="Chọn số người chơi" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="2">2 người</SelectItem>
                              <SelectItem value="3">3 người</SelectItem>
                              <SelectItem value="4">4 người</SelectItem>
                              <SelectItem value="8">8 người</SelectItem>
                            </SelectContent>
                          </Select>
                        )}
                      />
                      {errors.max_players && (
                        <p className="text-sm text-red-600">
                          {errors.max_players.message}
                        </p>
                      )}
                    </div>
                  </div>

                  <Button type="submit" className="w-full" disabled={loading}>
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Đang tạo trận đấu...
                      </>
                    ) : (
                      <>
                        <Gamepad2 className="h-4 w-4 mr-2" />
                        Tạo trận đấu
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin giải thưởng</CardTitle>
                <CardDescription>
                  Phân tích chi tiết về giải thưởng
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Phí tham gia:
                    </span>
                    <span className="font-semibold">
                      {formatCurrency(entryFee)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                      Số người chơi:
                    </span>
                    <span className="font-semibold">{maxPlayers}</span>
                  </div>

                  <div className="border-t pt-4">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        Tổng pool:
                      </span>
                      <span className="font-semibold text-primary">
                        {formatCurrency(totalPool)}
                      </span>
                    </div>

                    <div className="border-t pt-2 mt-3">
                      <h4 className="text-sm font-semibold mb-2">
                        Phân bổ giải thưởng:
                      </h4>
                      <div className="space-y-1.5">
                        {prizeBreakdown.length > 0 ? (
                          prizeBreakdown.map((item) => (
                            <div
                              key={item.rank}
                              className="flex items-center justify-between text-sm"
                            >
                              <span className="text-muted-foreground">
                                Hạng {item.rank}:
                              </span>
                              <span className="font-semibold text-green-600">
                                {formatCurrency(item.prize)}
                              </span>
                            </div>
                          ))
                        ) : (
                          <p className="text-sm text-muted-foreground">
                            Vui lòng nhập phí tham gia và chọn số người chơi
                          </p>
                        )}
                      </div>
                      <div className="border-t pt-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="text-sm font-semibold">
                            Tổng giải thưởng:
                          </span>
                          <span className="font-bold text-green-600">
                            {formatCurrency(totalPrizeAmount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      Quy chế giải thưởng:
                    </h4>
                    {entryFee >= 10000 ? (
                      <ul className="text-sm text-blue-800 space-y-1">
                        {maxPlayers === 2 && (
                          <li>
                            • Hạng 1:{' '}
                            {formatCurrency(calculatePrize(entryFee, 2, 1))}
                          </li>
                        )}
                        {maxPlayers === 3 && (
                          <>
                            <li>
                              • Hạng 1:{' '}
                              {formatCurrency(calculatePrize(entryFee, 3, 1))}
                            </li>
                            <li>
                              • Hạng 2:{' '}
                              {formatCurrency(calculatePrize(entryFee, 3, 2))}
                            </li>
                          </>
                        )}
                        {maxPlayers === 4 && (
                          <>
                            <li>
                              • Hạng 1:{' '}
                              {formatCurrency(calculatePrize(entryFee, 4, 1))}
                            </li>
                            <li>
                              • Hạng 2:{' '}
                              {formatCurrency(calculatePrize(entryFee, 4, 2))}
                            </li>
                          </>
                        )}
                        {maxPlayers === 8 && (
                          <>
                            <li>
                              • Hạng 1:{' '}
                              {formatCurrency(calculatePrize(entryFee, 8, 1))}
                            </li>
                            <li>
                              • Hạng 2:{' '}
                              {formatCurrency(calculatePrize(entryFee, 8, 2))}
                            </li>
                            <li>
                              • Hạng 3:{' '}
                              {formatCurrency(calculatePrize(entryFee, 8, 3))}
                            </li>
                            <li>
                              • Hạng 4:{' '}
                              {formatCurrency(calculatePrize(entryFee, 8, 4))}
                            </li>
                          </>
                        )}
                        <li>• Trận đấu sẽ tự động bắt đầu khi đủ người</li>
                        <li>• Có thể rời trận đấu trước khi bắt đầu</li>
                      </ul>
                    ) : (
                      <p className="text-sm text-blue-800">
                        Vui lòng nhập phí tham gia (tối thiểu 10,000 VNĐ) để xem
                        quy chế giải thưởng
                      </p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
