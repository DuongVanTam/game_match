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
import { ArrowLeft, Gamepad2 } from 'lucide-react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';

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
    .min(2, 'Tối thiểu 2 người chơi')
    .max(8, 'Tối đa 8 người chơi'),
});

type CreateMatchFormData = z.infer<typeof createMatchSchema>;

export default function CreateMatchPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    watch,
  } = useForm<CreateMatchFormData>({
    resolver: zodResolver(createMatchSchema),
  });

  const entryFee = watch('entry_fee') || 0;
  const maxPlayers = watch('max_players') || 8;
  const totalPool = entryFee * maxPlayers;
  const serviceFee = totalPool * 0.1; // 10% service fee
  const prizePool = totalPool - serviceFee;

  const onSubmit = async (data: CreateMatchFormData) => {
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
        router.push(`/matches/${result.id}`);
      } else {
        const error = await response.json();
        alert(`Lỗi: ${error.message}`);
      }
    } catch (error) {
      console.error('Error creating match:', error);
      alert('Có lỗi xảy ra khi tạo trận đấu');
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
                      <Input
                        id="max_players"
                        type="number"
                        placeholder="8"
                        defaultValue={8}
                        {...register('max_players', { valueAsNumber: true })}
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

                    <div className="flex items-center justify-between mb-2">
                      <span className="text-sm text-muted-foreground">
                        Phí dịch vụ (10%):
                      </span>
                      <span className="font-semibold text-red-600">
                        -{formatCurrency(serviceFee)}
                      </span>
                    </div>

                    <div className="border-t pt-2">
                      <div className="flex items-center justify-between">
                        <span className="font-semibold">Giải thưởng:</span>
                        <span className="font-bold text-green-600">
                          {formatCurrency(prizePool)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">Lưu ý:</h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Người thắng sẽ nhận toàn bộ giải thưởng</li>
                      <li>• Phí dịch vụ 10% để duy trì platform</li>
                      <li>• Trận đấu sẽ tự động bắt đầu khi đủ người</li>
                      <li>• Có thể rời trận đấu trước khi bắt đầu</li>
                    </ul>
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
