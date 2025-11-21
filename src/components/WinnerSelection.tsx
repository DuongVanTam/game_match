'use client';

import { useEffect, useState } from 'react';
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
import { calculatePrize } from '@/lib/match-rewards';

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
  entryFee?: number;
  suggestedWinnerId?: string | null;
  analysisSummary?: {
    placements: Array<{
      userId: string;
      displayName: string;
      rank: number | null;
      confidence: number | null;
      reason: string;
    }>;
    warnings?: string[];
  } | null;
}

export function WinnerSelection({
  players,
  onSelectWinner,
  onCancel,
  disabled = false,
  entryFee = 10000,
  suggestedWinnerId = null,
  analysisSummary = null,
}: WinnerSelectionProps) {
  const [selectedWinner, setSelectedWinner] = useState<string | null>(null);
  const [confirming, setConfirming] = useState(false);

  const activePlayers = players.filter((player) => player.status === 'active');

  useEffect(() => {
    if (
      suggestedWinnerId &&
      activePlayers.some((player) => player.user_id === suggestedWinnerId)
    ) {
      setSelectedWinner(suggestedWinnerId);
    }
  }, [suggestedWinnerId, activePlayers]);

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

  // Get prize recipients based on player count
  const getPrizeBreakdown = () => {
    const playerCount = activePlayers.length;
    const prizes: Array<{ rank: number; amount: number }> = [];

    // 2 players: Top 1
    if (playerCount === 2) {
      prizes.push({ rank: 1, amount: calculatePrize(entryFee, 2, 1) });
    }
    // 3 players: Top 1, Top 2
    else if (playerCount === 3) {
      prizes.push({ rank: 1, amount: calculatePrize(entryFee, 3, 1) });
      prizes.push({ rank: 2, amount: calculatePrize(entryFee, 3, 2) });
    }
    // 4 players: Top 1, Top 2
    else if (playerCount === 4) {
      prizes.push({ rank: 1, amount: calculatePrize(entryFee, 4, 1) });
      prizes.push({ rank: 2, amount: calculatePrize(entryFee, 4, 2) });
    }
    // 8 players: Top 1, Top 2, Top 3, Top 4
    else if (playerCount === 8) {
      prizes.push({ rank: 1, amount: calculatePrize(entryFee, 8, 1) });
      prizes.push({ rank: 2, amount: calculatePrize(entryFee, 8, 2) });
      prizes.push({ rank: 3, amount: calculatePrize(entryFee, 8, 3) });
      prizes.push({ rank: 4, amount: calculatePrize(entryFee, 8, 4) });
    }
    // Fallback for other counts
    else {
      const totalPool = entryFee * playerCount;
      const serviceFee = Math.floor(totalPool * 0.1);
      prizes.push({ rank: 1, amount: totalPool - serviceFee });
    }

    return prizes.filter((p) => p.amount > 0);
  };

  const prizeBreakdown = getPrizeBreakdown();
  const totalPool = entryFee * activePlayers.length;
  const serviceFee = Math.floor(totalPool * 0.1);
  const totalPrizeAmount = prizeBreakdown.reduce((sum, p) => sum + p.amount, 0);

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
            Kết quả trận đấu
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {analysisSummary && analysisSummary.placements.length > 0 && (
              <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                <div className="space-y-2 text-sm text-blue-800">
                  {analysisSummary.placements.map((placement) => {
                    const prizeAmount =
                      placement.rank !== null && placement.rank >= 1
                        ? calculatePrize(
                            entryFee,
                            activePlayers.length,
                            placement.rank
                          )
                        : 0;
                    return (
                      <div
                        key={placement.userId}
                        className="flex items-center justify-between rounded-md border border-blue-100 bg-white/70 p-3"
                      >
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            {placement.rank !== null && placement.rank >= 1 && (
                              <Trophy
                                className={`h-4 w-4 ${
                                  placement.rank === 1
                                    ? 'text-yellow-600'
                                    : placement.rank === 2
                                      ? 'text-gray-400'
                                      : placement.rank === 3
                                        ? 'text-amber-600'
                                        : 'text-blue-600'
                                }`}
                              />
                            )}
                            <p className="font-medium text-blue-900">
                              {placement.displayName}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4 text-right">
                          <div>
                            <p className="text-sm font-semibold text-blue-900">
                              {placement.rank
                                ? `Hạng ${placement.rank}`
                                : 'Không xác định'}
                            </p>
                            {prizeAmount > 0 && (
                              <p className="text-xs font-bold text-green-700">
                                {formatCurrency(prizeAmount)}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                  <div className="mt-3 flex items-center justify-between border-t border-blue-200 pt-3">
                    <span className="text-sm font-semibold text-blue-900">
                      Tổng giải thưởng:
                    </span>
                    <span className="text-base font-bold text-green-700">
                      {formatCurrency(totalPrizeAmount)}
                    </span>
                  </div>
                  {analysisSummary.warnings?.length ? (
                    <div className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                      <p className="font-medium">Cảnh báo:</p>
                      <ul className="list-disc pl-4">
                        {analysisSummary.warnings.map((warning, index) => (
                          <li key={index}>{warning}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                  <p className="text-xs italic text-blue-700">
                    Vui lòng kiểm tra lại trước khi xác nhận và liên hệ nếu có
                    sai sót!
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
