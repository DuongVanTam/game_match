'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Trophy, Users, AlertCircle, CheckCircle } from 'lucide-react';

interface Player {
  id: string;
  user_id: string;
  status: string | null;
  user?: {
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
}

interface WinnerSelectionProps {
  players: Player[];
  onSelectWinner: (winnerId: string) => void;
  onCancel: () => void;
  disabled?: boolean;
}

export function WinnerSelection({
  players,
  onSelectWinner,
  onCancel,
  disabled = false,
}: WinnerSelectionProps) {
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const activePlayers = players.filter((player) => player.status === 'active');

  const handleWinnerSelect = (playerId: string) => {
    if (disabled || confirming) return;
    setSelectedWinner(playerId);
  };

  const handleConfirmWinner = async () => {
    if (!selectedWinner || disabled || confirming) return;

    setConfirming(true);
    try {
      await onSelectWinner(selectedWinner);
    } catch (error) {
      console.error('Error selecting winner:', error);
    } finally {
      setConfirming(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
    }).format(amount);
  };

  const calculatePrize = () => {
    const entryFee = 10000; // This should come from match data
    const totalPool = entryFee * activePlayers.length;
    const serviceFee = Math.floor(totalPool * 0.1);
    return totalPool - serviceFee;
  };

  if (activePlayers.length === 0) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          Không có người chơi nào trong trận đấu này.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Trophy className="h-5 w-5 text-yellow-600" />
            Chọn người thắng cuộc
          </CardTitle>
          <CardDescription>
            Chọn người chơi thắng cuộc để hoàn tất trận đấu và phân phối giải
            thưởng
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Prize Information */}
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-semibold text-green-800">Giải thưởng</h4>
                  <p className="text-sm text-green-600">
                    {activePlayers.length} người chơi × {formatCurrency(10000)}{' '}
                    = {formatCurrency(10000 * activePlayers.length)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-green-800">
                    {formatCurrency(calculatePrize())}
                  </p>
                  <p className="text-xs text-green-600">
                    (Trừ phí dịch vụ 10%)
                  </p>
                </div>
              </div>
            </div>

            {/* Players List */}
            <div className="space-y-3">
              <h4 className="font-semibold flex items-center gap-2">
                <Users className="h-4 w-4" />
                Người chơi tham gia ({activePlayers.length})
              </h4>

              <div className="grid gap-3">
                {activePlayers.map((player) => {
                  const displayName = player.user?.full_name || 'Người chơi';
                  const avatarInitial = displayName.charAt(0).toUpperCase();

                  return (
                    <div
                      key={player.id}
                      className={`
                      flex items-center gap-3 p-4 border rounded-lg cursor-pointer transition-all
                      ${
                        selectedWinner === player.user_id
                          ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                          : 'border-muted hover:border-primary/50'
                      }
                      ${disabled || confirming ? 'opacity-50 cursor-not-allowed' : ''}
                    `}
                      onClick={() => handleWinnerSelect(player.user_id)}
                    >
                      <Avatar className="h-12 w-12">
                        <AvatarImage
                          src={player.user?.avatar_url || undefined}
                        />
                        <AvatarFallback>{avatarInitial}</AvatarFallback>
                      </Avatar>

                      <div className="flex-1">
                        <p className="font-semibold">{displayName}</p>
                        <p className="text-sm text-muted-foreground">
                          Người chơi tích cực
                        </p>
                      </div>

                      {selectedWinner === player.user_id && (
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-5 w-5 text-primary" />
                          <Badge variant="default">Được chọn</Badge>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3 pt-4">
              <Button
                onClick={handleConfirmWinner}
                disabled={!selectedWinner || disabled || confirming}
                className="flex-1"
              >
                {confirming ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Đang xác nhận...
                  </>
                ) : (
                  <>
                    <Trophy className="h-4 w-4 mr-2" />
                    Xác nhận người thắng
                  </>
                )}
              </Button>

              <Button
                variant="outline"
                onClick={onCancel}
                disabled={disabled || confirming}
              >
                Hủy
              </Button>
            </div>

            {selectedWinner && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  Bạn đã chọn người thắng cuộc. Sau khi xác nhận, trận đấu sẽ
                  được hoàn tất và giải thưởng sẽ được chuyển vào ví của người
                  thắng.
                </AlertDescription>
              </Alert>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
