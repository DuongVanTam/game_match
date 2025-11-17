'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams } from 'next/navigation';
import { createBrowserClient } from '@supabase/ssr';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  ArrowLeft,
  Users,
  Clock,
  Trophy,
  Gamepad2,
  UserPlus,
  UserMinus,
  Camera,
  CheckCircle,
  XCircle,
  X,
  Copy,
  AlertTriangle,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { ImageUpload } from '@/components/ImageUpload';
import { WinnerSelection } from '@/components/WinnerSelection';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/lib/auth';
import { Database } from '@/types/database';
import type { MatchAnalysisResult } from '@/lib/openai';
import { calculatePrize } from '@/lib/match-rewards';

type RoomStatus = 'open' | 'ongoing' | 'completed' | 'cancelled';

interface RoomPlayer {
  id: string;
  user_id: string;
  status: string | null;
  joined_at: string | null;
  user?: {
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
}

interface RoomMatch {
  id: string;
  room_id: string;
  status: 'open' | 'ongoing' | 'completed' | 'cancelled';
  round_number: number;
  entry_fee: number;
  max_players: number;
  created_by: string;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
  proof_image_url?: string | null;
  placements?: Array<{
    userId: string;
    displayName: string;
    rank: number | null;
    confidence: number | null;
    reason: string;
  }> | null;
  winner_user?: {
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
  match_players: RoomPlayer[];
}

interface RoomDetail {
  id: string;
  title: string;
  description: string;
  entry_fee: number;
  max_players: number;
  current_players: number;
  status: RoomStatus;
  created_at: string;
  created_by: string;
  created_by_user?: {
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
  match_players: RoomPlayer[];
  matches: RoomMatch[];
  latest_match?: RoomMatch | null;
}

export default function MatchDetailPage() {
  const params = useParams();
  const roomId = params.id as string;
  const { user } = useAuth();
  const currentUserId = user?.id || null;

  const [room, setRoom] = useState<RoomDetail | null>(null);
  const [loading, setLoading] = useState(true);
  type ActionLoadingState =
    | 'join'
    | 'leave'
    | 'start'
    | 'settle'
    | 'cancel'
    | null;
  const [actionLoading, setActionLoading] = useState<ActionLoadingState>(null);
  const [userJoined, setUserJoined] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [showWinnerSelection, setShowWinnerSelection] = useState(false);
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [analysisLoading, setAnalysisLoading] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [analysisResult, setAnalysisResult] =
    useState<MatchAnalysisResult | null>(null);
  const [suggestedWinnerId, setSuggestedWinnerId] = useState<string | null>(
    null
  );
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [copiedPlayerId, setCopiedPlayerId] = useState<string | null>(null);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [walletBalance, setWalletBalance] = useState<number | null>(null);
  const supabaseClientRef = useRef<ReturnType<
    typeof createBrowserClient<Database>
  > | null>(null);
  const copyAnimationTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null
  );

  useEffect(() => {
    return () => {
      if (copyAnimationTimeoutRef.current) {
        clearTimeout(copyAnimationTimeoutRef.current);
      }
    };
  }, []);

  const handleCopyName = async (
    playerId: string,
    name: string | null | undefined
  ) => {
    if (!name) {
      showNotification('error', 'Không có tên để sao chép.');
      return;
    }

    try {
      if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(name);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = name;
        textArea.style.position = 'fixed';
        textArea.style.opacity = '0';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        document.body.removeChild(textArea);
      }

      setCopiedPlayerId(playerId);
      if (copyAnimationTimeoutRef.current) {
        clearTimeout(copyAnimationTimeoutRef.current);
      }
      copyAnimationTimeoutRef.current = setTimeout(() => {
        setCopiedPlayerId((current) => (current === playerId ? null : current));
        copyAnimationTimeoutRef.current = null;
      }, 600);
    } catch (error) {
      console.error('Copy name error:', error);
      showNotification('error', 'Không thể sao chép tên người chơi.');
    }
  };

  const showNotification = (
    type: 'success' | 'error' | 'info',
    message: string
  ) => {
    setNotification({ type, message });
  };

  const clearNotification = () => setNotification(null);

  const fetchRoom = useCallback(async () => {
    try {
      const response = await fetch(`/api/matches/${roomId}`, {
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        setRoom(data);
        // Check if current user has joined this room
        if (currentUserId) {
          setUserJoined(
            data.match_players.some(
              (player: { user_id: string; status: string | null }) =>
                player.user_id === currentUserId && player.status === 'active'
            )
          );
        }
      }
    } catch (error) {
      console.error('Error fetching match:', error);
      showNotification(
        'error',
        'Không thể tải thông tin trận đấu. Vui lòng thử lại sau.'
      );
    } finally {
      setLoading(false);
    }
  }, [roomId, currentUserId]);

  useEffect(() => {
    if (roomId) {
      fetchRoom();
    }
  }, [roomId, fetchRoom]);

  // Realtime subscription handles updates; polling removed

  useEffect(() => {
    if (!roomId) return;

    if (!supabaseClientRef.current) {
      supabaseClientRef.current = createBrowserClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
      );
    }

    const supabaseClient = supabaseClientRef.current;

    const channel = supabaseClient
      .channel(`room-${roomId}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'room_players',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchRoom();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'matches',
          filter: `room_id=eq.${roomId}`,
        },
        () => {
          fetchRoom();
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'rooms',
          filter: `id=eq.${roomId}`,
        },
        () => {
          fetchRoom();
        }
      )
      .subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          // Optionally fetch latest data to ensure sync
          fetchRoom();
        }
      });

    return () => {
      supabaseClient.removeChannel(channel);
    };
  }, [roomId, fetchRoom]);

  const handleJoinRoom = async () => {
    clearNotification();
    setActionLoading('join');
    try {
      const response = await fetch(`/api/matches/${roomId}/join`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        setUserJoined(true);
        setRoom((prev) =>
          prev
            ? {
                ...prev,
                current_players:
                  result.current_players ?? prev.current_players + 1,
              }
            : prev
        );
        showNotification('success', 'Tham gia trận đấu thành công!');
        fetchRoom(); // Refresh room data
      } else {
        const error = await response.json();
        const message =
          error.message || error.error || 'Không thể tham gia trận đấu.';
        showNotification('error', message);
      }
    } catch (error) {
      console.error('Error joining match:', error);
      showNotification(
        'error',
        'Có lỗi xảy ra khi tham gia trận đấu. Vui lòng thử lại.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleLeaveRoom = async () => {
    clearNotification();
    setActionLoading('leave');
    try {
      const response = await fetch(`/api/matches/${roomId}/leave`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        setUserJoined(false);
        setRoom((prev) =>
          prev
            ? {
                ...prev,
                current_players:
                  result.current_players ??
                  Math.max(prev.current_players - 1, 0),
                match_players: currentUserId
                  ? prev.match_players.filter(
                      (player) => player.user_id !== currentUserId
                    )
                  : prev.match_players,
              }
            : prev
        );
        showNotification('success', 'Bạn đã rời trận đấu.');
        fetchRoom(); // Refresh room data
      } else {
        const error = await response.json();
        const message =
          error.message || error.error || 'Không thể rời trận đấu.';
        showNotification('error', message);
      }
    } catch (error) {
      console.error('Error leaving match:', error);
      showNotification(
        'error',
        'Có lỗi xảy ra khi rời trận đấu. Vui lòng thử lại.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  // Prune underfunded players before settlement actions
  const pruneUnderfundedPlayers = useCallback(async () => {
    try {
      const response = await fetch(`/api/rooms/${roomId}/prune-underfunded`, {
        method: 'POST',
      });
      if (!response.ok) {
        const error = await response.json().catch(() => null);
        const message =
          error?.message ||
          error?.error ||
          'Không thể kiểm tra số dư người chơi. Vui lòng thử lại.';
        showNotification('error', message);
        return { kicked: [] as string[] };
      }
      const data = await response.json();
      const kickedCount = (data?.kicked?.length as number) || 0;
      if (kickedCount > 0) {
        showNotification(
          'info',
          `Đã loại ${kickedCount} người chơi vì không đủ số dư.`
        );
      }
      // Refresh room to reflect removals
      fetchRoom();
      return data as { kicked: string[] };
    } catch (err) {
      console.error('Prune underfunded players error:', err);
      showNotification(
        'error',
        'Không thể kiểm tra số dư người chơi. Vui lòng thử lại.'
      );
      return { kicked: [] as string[] };
    }
  }, [roomId, fetchRoom]);

  const handleStartSettlement = async () => {
    if (!ongoingMatch) {
      showNotification(
        'error',
        'Hiện không có trận đấu đang diễn ra để hoàn tất.'
      );
      return;
    }
    // Remove players who no longer have enough balance before settlement
    setShowSettlement(true);
    setShowWinnerSelection(true);
    setAnalysisResult(null);
    setAnalysisError(null);
    setSuggestedWinnerId(null);
  };

  const handleStartMatch = async () => {
    clearNotification();
    setActionLoading('start');
    try {
      const response = await fetch(`/api/rooms/${roomId}/start-match`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        showNotification(
          'success',
          result.message || 'Trận đấu mới đã được tạo và bắt đầu.'
        );
        fetchRoom();
      } else {
        const error = await response.json();
        const message =
          error.message || error.error || 'Không thể bắt đầu trận đấu.';
        showNotification('error', message);
      }
    } catch (error) {
      console.error('Error starting match:', error);
      showNotification(
        'error',
        'Có lỗi xảy ra khi bắt đầu trận đấu. Vui lòng thử lại.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancelSettlement = () => {
    setShowSettlement(false);
    setShowWinnerSelection(false);
    setProofImageUrl(null);
    setAnalysisResult(null);
    setAnalysisError(null);
    setSuggestedWinnerId(null);
  };

  const handleSelectWinner = async (
    winnerId: string,
    placementsOverride?: MatchAnalysisResult['placements'] | null,
    proofImageUrlOverride?: string | null
  ) => {
    clearNotification();
    const imageUrl = proofImageUrlOverride ?? proofImageUrl;
    if (!imageUrl) {
      showNotification(
        'error',
        'Vui lòng upload hình ảnh bằng chứng trước khi chọn người thắng.'
      );
      return;
    }

    const latestMatchId = room?.latest_match?.id;
    if (!latestMatchId || room.latest_match?.status !== 'ongoing') {
      showNotification(
        'error',
        'Không có trận đấu đang diễn ra để hoàn tất kết quả.'
      );
      return;
    }

    const placementsPayload =
      placementsOverride ?? analysisResult?.placements ?? null;

    setActionLoading('settle');
    try {
      // Ensure all players still have enough balance right before settlement
      await pruneUnderfundedPlayers();
      const response = await fetch(`/api/matches/${latestMatchId}/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          winnerId,
          proofImageUrl: imageUrl,
          placements: placementsPayload,
        }),
      });

      if (response.ok) {
        await response.json(); // Consume the response
        showNotification('success', 'Trận đấu đã được hoàn tất thành công!');
        // Refresh immediately
        fetchRoom();
        // Also refresh after a short delay to ensure database commit
        setTimeout(() => {
          fetchRoom();
        }, 500);
        setShowSettlement(false);
        setShowWinnerSelection(false);
        setProofImageUrl(null);
        setAnalysisResult(null);
        setAnalysisError(null);
        setSuggestedWinnerId(null);
      } else {
        const error = await response.json();
        const message =
          error.message || error.error || 'Không thể hoàn tất trận đấu.';
        showNotification('error', message);
      }
    } catch (error) {
      console.error('Error settling match:', error);
      showNotification(
        'error',
        'Có lỗi xảy ra khi hoàn tất trận đấu. Vui lòng thử lại.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleProofUpload = (url: string) => {
    setProofImageUrl(url);
    showNotification('success', 'Đã tải lên hình ảnh bằng chứng.');
    setAnalysisResult(null);
    setAnalysisError(null);
    setSuggestedWinnerId(null);
    void handleAnalyzeMatch({ autoSettle: true, imageUrlOverride: url });
  };

  const handleProofUploadError = (error: string) => {
    clearNotification();
    console.error('Proof upload error:', error);
    showNotification('error', `Lỗi upload hình ảnh: ${error}`);
    setAnalysisResult(null);
    setAnalysisError(null);
    setSuggestedWinnerId(null);
  };

  const handleAnalyzeMatch = async (options?: {
    autoSettle?: boolean;
    imageUrlOverride?: string;
  }) => {
    clearNotification();
    const targetImageUrl = options?.imageUrlOverride ?? proofImageUrl;

    if (!targetImageUrl) {
      setAnalysisError('Vui lòng tải lên hình ảnh bằng chứng trước.');
      return;
    }

    if (!ongoingMatch) {
      setAnalysisError('Không tìm thấy trận đấu đang diễn ra để phân tích.');
      return;
    }

    if (!room) {
      setAnalysisError('Không tìm thấy thông tin phòng đấu để phân tích.');
      return;
    }

    setAnalysisLoading(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/ai/analyze-match', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageUrl: targetImageUrl,
          players: ongoingMatch.match_players.map((player) => ({
            userId: player.user_id,
            displayName: player.user?.full_name || 'Người chơi',
          })),
          matchId: ongoingMatch.id,
          roomId: room.id,
          matchTitle: room.title,
          roundNumber: ongoingMatch.round_number,
        }),
      });

      if (!response.ok) {
        const error = await response.json().catch(() => null);
        const message =
          error?.error ||
          error?.message ||
          'Không thể phân tích hình ảnh. Vui lòng thử lại sau.';
        setAnalysisError(message);
        return;
      }

      const data = await response.json();
      const analysis: MatchAnalysisResult | undefined = data?.analysis;

      if (!analysis) {
        setAnalysisError('AI không trả về dữ liệu hợp lệ. Vui lòng thử lại.');
        return;
      }

      setAnalysisResult(analysis);

      const bestCandidate = [...analysis.placements]
        .filter((placement) => typeof placement.rank === 'number')
        .sort((a, b) => (a.rank ?? 99) - (b.rank ?? 99))[0];

      if (bestCandidate?.userId) {
        setSuggestedWinnerId(bestCandidate.userId);
        if (options?.autoSettle) {
          try {
            await handleSelectWinner(
              bestCandidate.userId,
              analysis.placements ?? null,
              targetImageUrl
            );
          } catch (error) {
            console.error('Auto settle failed:', error);
            setAnalysisError(
              'Không thể hoàn tất trận đấu tự động. Vui lòng thử lại hoặc chọn thủ công.'
            );
          }
        } else {
          showNotification(
            'success',
            `Người thắng: ${bestCandidate.displayName} (hạng ${
              bestCandidate.rank
            }). Vui lòng xác nhận lại trước khi hoàn tất.`
          );
        }
      } else {
        setSuggestedWinnerId(null);
        showNotification(
          'info',
          'Không xác định được người thắng rõ ràng. Vui lòng kiểm tra và chọn thủ công.'
        );
      }
    } catch (error) {
      console.error('Error analyzing match screenshot:', error);
      setAnalysisError(
        'Có lỗi xảy ra khi phân tích hình ảnh. Vui lòng thử lại sau.'
      );
    } finally {
      setAnalysisLoading(false);
    }
  };

  const handleCancelRoom = async () => {
    clearNotification();
    setShowCancelConfirm(false);
    setActionLoading('cancel');
    try {
      const response = await fetch(`/api/matches/${roomId}/cancel`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        showNotification(
          'success',
          result.message || `Phòng đấu đã được hủy thành công.`
        );
        fetchRoom(); // Refresh room data
      } else {
        const error = await response.json();
        const message =
          error.message || error.error || 'Không thể hủy trận đấu.';
        showNotification('error', message);
      }
    } catch (error) {
      console.error('Error cancelling match:', error);
      showNotification(
        'error',
        'Có lỗi xảy ra khi hủy trận đấu. Vui lòng thử lại.'
      );
    } finally {
      setActionLoading(null);
    }
  };

  const handleOpenCancelConfirm = () => {
    clearNotification();
    setShowCancelConfirm(true);
  };

  const handleCloseCancelConfirm = () => {
    setShowCancelConfirm(false);
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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      open: 'bg-green-100 text-green-800',
      ongoing: 'bg-blue-100 text-blue-800',
      completed: 'bg-purple-100 text-purple-800',
      cancelled: 'bg-red-100 text-red-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      open: 'Mở',
      ongoing: 'Đang diễn ra',
      completed: 'Hoàn thành',
      cancelled: 'Đã hủy',
    };
    return labels[status] || status;
  };

  // Fetch current user's wallet balance
  const fetchWalletBalance = useCallback(async () => {
    if (!currentUserId) {
      setWalletBalance(null);
      return;
    }
    try {
      const res = await fetch('/api/wallet/balance', { cache: 'no-store' });
      if (!res.ok) return;
      const data = await res.json();
      const bal =
        typeof data?.balance === 'number'
          ? data.balance
          : Number(data?.balance ?? 0);
      setWalletBalance(bal);
    } catch {
      // ignore silently; UI will just omit balance
    }
  }, [currentUserId]);

  useEffect(() => {
    void fetchWalletBalance();
  }, [fetchWalletBalance]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Đang tải thông tin trận đấu...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  if (!room) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="text-center py-12">
            <Gamepad2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Không tìm thấy trận đấu
            </h3>
            <p className="text-muted-foreground mb-4">
              Trận đấu này không tồn tại hoặc đã bị xóa
            </p>
            <Link href="/matches">
              <Button>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Quay lại danh sách
              </Button>
            </Link>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const totalPool = room.entry_fee * room.max_players;
  const serviceFee = totalPool * 0.1;
  const prizePool = totalPool - serviceFee;
  const latestMatch = room.latest_match ?? null;
  const ongoingMatch =
    latestMatch && latestMatch.status === 'ongoing' ? latestMatch : null;

  // Calculate prizes for each rank based on player count
  const getPrizeBreakdown = () => {
    const breakdown: Array<{ rank: number; prize: number }> = [];
    if (room.max_players === 2) {
      breakdown.push({ rank: 1, prize: calculatePrize(room.entry_fee, 2, 1) });
    } else if (room.max_players === 3) {
      breakdown.push({ rank: 1, prize: calculatePrize(room.entry_fee, 3, 1) });
      breakdown.push({ rank: 2, prize: calculatePrize(room.entry_fee, 3, 2) });
    } else if (room.max_players === 4) {
      breakdown.push({ rank: 1, prize: calculatePrize(room.entry_fee, 4, 1) });
      breakdown.push({ rank: 2, prize: calculatePrize(room.entry_fee, 4, 2) });
    } else if (room.max_players === 8) {
      breakdown.push({ rank: 1, prize: calculatePrize(room.entry_fee, 8, 1) });
      breakdown.push({ rank: 2, prize: calculatePrize(room.entry_fee, 8, 2) });
      breakdown.push({ rank: 3, prize: calculatePrize(room.entry_fee, 8, 3) });
      breakdown.push({ rank: 4, prize: calculatePrize(room.entry_fee, 8, 4) });
    }
    return breakdown;
  };

  const prizeBreakdown = getPrizeBreakdown();
  const totalPrizeAmount = prizeBreakdown.reduce(
    (sum, item) => sum + item.prize,
    0
  );

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

          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h1 className="text-3xl font-bold">{room.title}</h1>
                <Badge className={getStatusColor(room.status)}>
                  {getStatusLabel(room.status)}
                </Badge>
              </div>
              <p className="text-muted-foreground text-lg">
                {room.description}
              </p>
            </div>
          </div>
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
          <div className="lg:col-span-2 space-y-6">
            {/* Match Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Gamepad2 className="h-5 w-5" />
                  Thông tin trận đấu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Phí tham gia:
                      </span>
                      <span className="font-semibold text-primary">
                        {formatCurrency(room.entry_fee)}
                      </span>
                    </div>
                    {walletBalance !== null && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Số dư của bạn:
                        </span>
                        <span
                          className={`font-semibold ${
                            walletBalance >= room.entry_fee
                              ? 'text-green-600'
                              : 'text-red-600'
                          }`}
                          title={
                            walletBalance >= room.entry_fee
                              ? 'Đủ số dư để tham gia và hoàn tất'
                              : 'Số dư không đủ, có thể bị loại khi hoàn tất'
                          }
                        >
                          {formatCurrency(walletBalance)}
                        </span>
                      </div>
                    )}

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Người chơi:
                      </span>
                      <span className="font-semibold">
                        {room.current_players}/{room.max_players}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Người tạo:
                      </span>
                      <span className="font-semibold">
                        {room.created_by_user?.full_name || 'Người chơi'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Thời gian tạo:
                      </span>
                      <span className="text-sm">
                        {formatDate(room.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Tổng pool:
                      </span>
                      <span className="font-semibold text-primary">
                        {formatCurrency(totalPool)}
                      </span>
                    </div>

                    <div className="border-t pt-2 mt-2">
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
                            Không có giải thưởng
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
                </div>

                {/* Settlement Section - Only show when match is ongoing */}
                {ongoingMatch && (
                  <div className="mt-6 border-t pt-6 space-y-4">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Camera className="h-5 w-5" />
                          Hoàn tất trận đấu
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Upload hình ảnh chứng minh kết quả trận đấu
                        </p>
                      </div>
                      {!showSettlement && (
                        <Button
                          onClick={handleStartSettlement}
                          disabled={Boolean(actionLoading)}
                          variant="outline"
                        >
                          <Camera className="h-4 w-4 mr-2" />
                          Bắt đầu hoàn tất
                        </Button>
                      )}
                    </div>

                    {showSettlement && (
                      <div className="space-y-4">
                        {currentUserId && (
                          <ImageUpload
                            userId={currentUserId}
                            matchId={ongoingMatch.id}
                            onUploadComplete={handleProofUpload}
                            onUploadError={handleProofUploadError}
                            disabled={Boolean(actionLoading) || analysisLoading}
                          />
                        )}

                        <div className="rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-800">
                          {analysisLoading ? (
                            <div className="flex items-center gap-2">
                              <div className="h-4 w-4 animate-spin rounded-full border-b-2 border-blue-500"></div>
                              <span>
                                Đang phân tích ảnh để xác định thứ hạng...
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <Sparkles className="h-4 w-4" />
                              <span>
                                Ảnh sẽ được xử lý tự động ngay sau khi tải lên
                                để xác định người thắng cuộc.
                              </span>
                            </div>
                          )}
                        </div>

                        {analysisError && (
                          <Alert variant="destructive">
                            <AlertTitle>Có lỗi xảy ra</AlertTitle>
                            <AlertDescription className="space-y-3">
                              <p>{analysisError}</p>
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  handleAnalyzeMatch({ autoSettle: true })
                                }
                                disabled={analysisLoading || !proofImageUrl}
                              >
                                Thử phân tích lại
                              </Button>
                            </AlertDescription>
                          </Alert>
                        )}

                        {showWinnerSelection && (
                          <WinnerSelection
                            players={ongoingMatch.match_players}
                            onSelectWinner={(winnerId) =>
                              handleSelectWinner(
                                winnerId,
                                analysisResult?.placements ?? null,
                                proofImageUrl ?? null
                              )
                            }
                            onCancel={handleCancelSettlement}
                            disabled={Boolean(actionLoading) || !proofImageUrl}
                            entryFee={ongoingMatch.entry_fee ?? room.entry_fee}
                            suggestedWinnerId={suggestedWinnerId}
                            analysisSummary={
                              analysisResult
                                ? {
                                    placements: analysisResult.placements,
                                    warnings: analysisResult.warnings,
                                  }
                                : null
                            }
                          />
                        )}
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Players List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Danh sách người chơi ({room.current_players}/
                  {room.max_players})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {room.match_players.length > 0 ? (
                  <div className="space-y-3">
                    {room.match_players
                      .filter((player) => player.status === 'active')
                      .map((player) => (
                        <div
                          key={player.id}
                          className="flex items-center gap-3 p-3 border rounded-lg"
                        >
                          <Avatar>
                            <AvatarImage
                              src={player.user?.avatar_url || undefined}
                            />
                            <AvatarFallback>
                              {player.user?.full_name
                                ? player.user.full_name.charAt(0).toUpperCase()
                                : 'N'}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <p className="font-semibold">
                              {player.user?.full_name || 'Người chơi'}
                            </p>
                            <p className="text-sm text-muted-foreground">
                              Tham gia:{' '}
                              {player.joined_at
                                ? formatDate(player.joined_at)
                                : 'N/A'}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className={`h-8 w-8 transition-transform ${
                                copiedPlayerId === player.id
                                  ? 'text-primary scale-110 animate-pulse'
                                  : ''
                              }`}
                              onClick={() =>
                                handleCopyName(
                                  player.id,
                                  player.user?.full_name
                                )
                              }
                              aria-label="Sao chép tên người chơi"
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                            {player.user_id === currentUserId &&
                              ['open', 'ongoing'].includes(room.status) && (
                                <Button
                                  type="button"
                                  size="sm"
                                  variant="outline"
                                  onClick={handleLeaveRoom}
                                  disabled={Boolean(actionLoading)}
                                  className="whitespace-nowrap"
                                >
                                  {actionLoading === 'leave' ? (
                                    <>
                                      <div className="mr-2 h-3.5 w-3.5 animate-spin rounded-full border-b-2 border-current"></div>
                                      Đang rời...
                                    </>
                                  ) : (
                                    <>
                                      <UserMinus className="mr-1.5 h-3.5 w-3.5" />
                                      Rời phòng
                                    </>
                                  )}
                                </Button>
                              )}
                          </div>
                          <Badge variant="outline">Đã tham gia</Badge>
                        </div>
                      ))}

                    {/* Empty slots */}
                    {Array.from({
                      length: room.max_players - room.current_players,
                    }).map((_, index) => (
                      <div
                        key={`empty-${index}`}
                        className="flex items-center gap-3 p-3 border border-dashed rounded-lg"
                      >
                        <Avatar>
                          <AvatarFallback className="bg-muted">
                            <UserPlus className="h-4 w-4" />
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="text-muted-foreground">Vị trí trống</p>
                          <p className="text-sm text-muted-foreground">
                            Chờ người chơi tham gia
                          </p>
                        </div>
                        <Badge
                          variant="outline"
                          className="text-muted-foreground"
                        >
                          Trống
                        </Badge>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                    <p className="text-muted-foreground">
                      Chưa có người chơi nào tham gia
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Hành động</CardTitle>
                <CardDescription>Tham gia hoặc rời phòng đấu</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {room.status === 'open' && (
                    <>
                      {userJoined ? (
                        <Button
                          onClick={handleLeaveRoom}
                          disabled={Boolean(actionLoading)}
                          variant="outline"
                          className="w-full"
                        >
                          {actionLoading === 'leave' ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                              Đang rời...
                            </>
                          ) : (
                            <>
                              <UserMinus className="h-4 w-4 mr-2" />
                              Rời phòng đấu
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={handleJoinRoom}
                          disabled={
                            Boolean(actionLoading) ||
                            room.current_players >= room.max_players
                          }
                          className="w-full"
                        >
                          {actionLoading === 'join' ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Đang tham gia...
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Tham gia phòng đấu
                            </>
                          )}
                        </Button>
                      )}

                      {/* Start and cancel buttons for room creator */}
                      {room.created_by === currentUserId && (
                        <div className="space-y-2">
                          <Button
                            onClick={handleStartMatch}
                            disabled={
                              Boolean(actionLoading) || room.current_players < 2
                            }
                            className="w-full"
                            variant="default"
                          >
                            {actionLoading === 'start' ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Đang bắt đầu...
                              </>
                            ) : (
                              <>
                                <Gamepad2 className="h-4 w-4 mr-2" />
                                Bắt đầu trận đấu
                              </>
                            )}
                          </Button>
                          <Button
                            onClick={handleOpenCancelConfirm}
                            disabled={Boolean(actionLoading)}
                            variant="destructive"
                            className="w-full"
                          >
                            {actionLoading === 'cancel' ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Đang hủy...
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                Hủy phòng đấu
                              </>
                            )}
                          </Button>
                        </div>
                      )}
                    </>
                  )}

                  {room.status === 'ongoing' && (
                    <div className="space-y-4">
                      <div className="text-center py-4">
                        <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <p className="font-semibold text-blue-600">
                          Trận đấu đang diễn ra
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Không thể thêm người chơi mới vào phòng lúc này.
                        </p>
                        {userJoined && (
                          <p className="text-sm text-muted-foreground">
                            Bạn vẫn có thể rời phòng để tham gia trận đấu khác.
                          </p>
                        )}
                      </div>

                      {userJoined && (
                        <Button
                          onClick={handleLeaveRoom}
                          disabled={Boolean(actionLoading)}
                          variant="outline"
                          className="w-full"
                        >
                          {actionLoading === 'leave' ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                              Đang rời...
                            </>
                          ) : (
                            <>
                              <UserMinus className="h-4 w-4 mr-2" />
                              Rời phòng đấu
                            </>
                          )}
                        </Button>
                      )}

                      {/* Cancel button for room creator */}
                      {room.created_by === currentUserId && (
                        <Button
                          onClick={handleOpenCancelConfirm}
                          disabled={Boolean(actionLoading)}
                          variant="destructive"
                          className="w-full"
                        >
                          {actionLoading === 'cancel' ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Đang hủy...
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 mr-2" />
                              Hủy phòng đấu
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  )}

                  {room.status === 'cancelled' && (
                    <div className="text-center py-4">
                      <p className="font-semibold text-red-600">
                        Phòng đấu đã bị hủy
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Không thể tham gia phòng đấu này
                      </p>
                    </div>
                  )}

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      Quy tắc:
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Có thể rời phòng đấu trước khi bắt đầu trận</li>
                      <li>• Phí tham gia sẽ trừ khi bắt đầu trận đấu</li>
                      <li>
                        • Chủ phòng sẽ bấm &quot;Bắt đầu trận đấu&quot; khi đủ
                        người
                      </li>
                      <li className="mt-2 pt-2 border-t border-blue-200">
                        <span className="font-semibold">
                          Quy chế giải thưởng:
                        </span>
                        {room.max_players === 2 && (
                          <ul className="mt-1 space-y-0.5 pl-4">
                            <li>
                              - Hạng 1:{' '}
                              {formatCurrency(
                                calculatePrize(room.entry_fee, 2, 1)
                              )}
                            </li>
                          </ul>
                        )}
                        {room.max_players === 3 && (
                          <ul className="mt-1 space-y-0.5 pl-4">
                            <li>
                              - Hạng 1:{' '}
                              {formatCurrency(
                                calculatePrize(room.entry_fee, 3, 1)
                              )}
                            </li>
                            <li>
                              - Hạng 2:{' '}
                              {formatCurrency(
                                calculatePrize(room.entry_fee, 3, 2)
                              )}
                            </li>
                          </ul>
                        )}
                        {room.max_players === 4 && (
                          <ul className="mt-1 space-y-0.5 pl-4">
                            <li>
                              - Hạng 1:{' '}
                              {formatCurrency(
                                calculatePrize(room.entry_fee, 4, 1)
                              )}
                            </li>
                            <li>
                              - Hạng 2:{' '}
                              {formatCurrency(
                                calculatePrize(room.entry_fee, 4, 2)
                              )}
                            </li>
                          </ul>
                        )}
                        {room.max_players === 8 && (
                          <ul className="mt-1 space-y-0.5 pl-4">
                            <li>
                              - Hạng 1:{' '}
                              {formatCurrency(
                                calculatePrize(room.entry_fee, 8, 1)
                              )}
                            </li>
                            <li>
                              - Hạng 2:{' '}
                              {formatCurrency(
                                calculatePrize(room.entry_fee, 8, 2)
                              )}
                            </li>
                            <li>
                              - Hạng 3:{' '}
                              {formatCurrency(
                                calculatePrize(room.entry_fee, 8, 3)
                              )}
                            </li>
                            <li>
                              - Hạng 4:{' '}
                              {formatCurrency(
                                calculatePrize(room.entry_fee, 8, 4)
                              )}
                            </li>
                          </ul>
                        )}
                      </li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {showCancelConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
            <Card className="w-full max-w-md">
              <CardHeader className="space-y-2">
                <div className="flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-5 w-5" />
                  <CardTitle>Hủy phòng đấu?</CardTitle>
                </div>
                <CardDescription>
                  Tất cả người chơi sẽ được giải phóng khỏi phòng đấu và không
                  thể tham gia các trận trong phòng này nữa.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3 text-sm text-muted-foreground">
                <p>Hành động này không thể hoàn tác.</p>
                <ul className="list-inside space-y-1">
                  <li>• Người chơi nhận lại phí tham gia.</li>
                  <li>• Trận đấu không thể tham gia tiếp.</li>
                </ul>
              </CardContent>
              <CardFooter className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseCancelConfirm}
                  disabled={Boolean(actionLoading)}
                >
                  Giữ phòng đấu
                </Button>
                <Button
                  type="button"
                  variant="destructive"
                  onClick={handleCancelRoom}
                  disabled={Boolean(actionLoading)}
                >
                  {actionLoading === 'cancel' ? (
                    <>
                      <div className="mr-2 h-4 w-4 animate-spin rounded-full border-b-2 border-white"></div>
                      Đang hủy...
                    </>
                  ) : (
                    'Hủy ngay'
                  )}
                </Button>
              </CardFooter>
            </Card>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
