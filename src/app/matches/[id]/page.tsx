'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
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
} from 'lucide-react';
import Link from 'next/link';
import { ImageUpload } from '@/components/ImageUpload';
import { WinnerSelection } from '@/components/WinnerSelection';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { useAuth } from '@/lib/auth';

interface Match {
  id: string;
  title: string;
  description: string;
  entry_fee: number;
  max_players: number;
  current_players: number;
  status: 'open' | 'ongoing' | 'completed' | 'cancelled';
  created_at: string;
  created_by: string;
  proof_image_url?: string | null;
  created_by_user?: {
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
  winner_user?: {
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
  match_players: Array<{
    id: string;
    user_id: string;
    status: string | null;
    joined_at: string | null;
    user?: {
      full_name: string | null;
      avatar_url?: string | null;
    } | null;
  }>;
}

export default function MatchDetailPage() {
  const params = useParams();
  const matchId = params.id as string;
  const { user } = useAuth();
  const currentUserId = user?.id || null;

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [userJoined, setUserJoined] = useState(false);
  const [showSettlement, setShowSettlement] = useState(false);
  const [showWinnerSelection, setShowWinnerSelection] = useState(false);
  const [proofImageUrl, setProofImageUrl] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);

  const showNotification = (
    type: 'success' | 'error' | 'info',
    message: string
  ) => {
    setNotification({ type, message });
  };

  const clearNotification = () => setNotification(null);

  const fetchMatch = useCallback(async () => {
    try {
      const response = await fetch(`/api/matches/${matchId}`, {
        cache: 'no-store',
      });
      if (response.ok) {
        const data = await response.json();
        setMatch(data);
        // Check if current user has joined this match
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
  }, [matchId, currentUserId]);

  useEffect(() => {
    if (matchId) {
      fetchMatch();
    }
  }, [matchId, fetchMatch]);

  const handleJoinMatch = async () => {
    clearNotification();
    setActionLoading(true);
    try {
      const response = await fetch(`/api/matches/${matchId}/join`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        setUserJoined(true);
        setMatch((prev) =>
          prev
            ? {
                ...prev,
                current_players:
                  result.current_players ?? prev.current_players + 1,
              }
            : prev
        );
        showNotification('success', 'Tham gia trận đấu thành công!');
        fetchMatch(); // Refresh match data
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
      setActionLoading(false);
    }
  };

  const handleLeaveMatch = async () => {
    clearNotification();
    setActionLoading(true);
    try {
      const response = await fetch(`/api/matches/${matchId}/leave`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        setUserJoined(false);
        setMatch((prev) =>
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
        fetchMatch(); // Refresh match data
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
      setActionLoading(false);
    }
  };

  const handleStartSettlement = () => {
    setShowSettlement(true);
    setShowWinnerSelection(true);
  };

  const handleCancelSettlement = () => {
    setShowSettlement(false);
    setShowWinnerSelection(false);
    setProofImageUrl(null);
  };

  const handleSelectWinner = async (winnerId: string) => {
    clearNotification();
    if (!proofImageUrl) {
      showNotification(
        'error',
        'Vui lòng upload hình ảnh bằng chứng trước khi chọn người thắng.'
      );
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/matches/${matchId}/settle`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          winnerId,
          proofImageUrl,
        }),
      });

      if (response.ok) {
        await response.json(); // Consume the response
        showNotification('success', 'Trận đấu đã được hoàn tất thành công!');
        fetchMatch(); // Refresh match data
        setShowSettlement(false);
        setShowWinnerSelection(false);
        setProofImageUrl(null);
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
      setActionLoading(false);
    }
  };

  const handleProofUpload = (url: string) => {
    setProofImageUrl(url);
    showNotification('success', 'Đã tải lên hình ảnh bằng chứng.');
  };

  const handleProofUploadError = (error: string) => {
    clearNotification();
    console.error('Proof upload error:', error);
    showNotification('error', `Lỗi upload hình ảnh: ${error}`);
  };

  const handleCancelMatch = async () => {
    clearNotification();
    if (
      !confirm(
        'Bạn có chắc chắn muốn hủy trận đấu này? Tất cả người chơi sẽ được hoàn phí tham gia.'
      )
    ) {
      return;
    }

    setActionLoading(true);
    try {
      const response = await fetch(`/api/matches/${matchId}/cancel`, {
        method: 'POST',
      });

      if (response.ok) {
        const result = await response.json();
        showNotification(
          'success',
          `Trận đấu đã được hủy thành công. Đã hoàn phí cho ${result.refundedPlayers} người chơi.`
        );
        fetchMatch(); // Refresh match data
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
      setActionLoading(false);
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

  if (!match) {
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

  const totalPool = match.entry_fee * match.max_players;
  const serviceFee = totalPool * 0.1;
  const prizePool = totalPool - serviceFee;

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
                <h1 className="text-3xl font-bold">{match.title}</h1>
                <Badge className={getStatusColor(match.status)}>
                  {getStatusLabel(match.status)}
                </Badge>
              </div>
              <p className="text-muted-foreground text-lg">
                {match.description}
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
                        {formatCurrency(match.entry_fee)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Người chơi:
                      </span>
                      <span className="font-semibold">
                        {match.current_players}/{match.max_players}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Người tạo:
                      </span>
                      <span className="font-semibold">
                        {match.created_by_user?.full_name || 'Người chơi'}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Thời gian tạo:
                      </span>
                      <span className="text-sm">
                        {formatDate(match.created_at)}
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

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Phí dịch vụ (10%):
                      </span>
                      <span className="font-semibold text-red-600">
                        -{formatCurrency(serviceFee)}
                      </span>
                    </div>

                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">
                        Giải thưởng:
                      </span>
                      <span className="font-bold text-green-600">
                        {formatCurrency(prizePool)}
                      </span>
                    </div>

                    {match.status === 'completed' && match.winner_user && (
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                          Người thắng:
                        </span>
                        <span className="font-bold text-yellow-600">
                          {match.winner_user.full_name || 'Đang cập nhật'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Players List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Danh sách người chơi ({match.current_players}/
                  {match.max_players})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {match.match_players.length > 0 ? (
                  <div className="space-y-3">
                    {match.match_players
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
                          <Badge variant="outline">Đã tham gia</Badge>
                        </div>
                      ))}

                    {/* Empty slots */}
                    {Array.from({
                      length: match.max_players - match.current_players,
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
                <CardDescription>Tham gia hoặc rời trận đấu</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {match.status === 'open' && (
                    <>
                      {userJoined ? (
                        <Button
                          onClick={handleLeaveMatch}
                          disabled={actionLoading}
                          variant="outline"
                          className="w-full"
                        >
                          {actionLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                              Đang rời...
                            </>
                          ) : (
                            <>
                              <UserMinus className="h-4 w-4 mr-2" />
                              Rời trận đấu
                            </>
                          )}
                        </Button>
                      ) : (
                        <Button
                          onClick={handleJoinMatch}
                          disabled={
                            actionLoading ||
                            match.current_players >= match.max_players
                          }
                          className="w-full"
                        >
                          {actionLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Đang tham gia...
                            </>
                          ) : (
                            <>
                              <UserPlus className="h-4 w-4 mr-2" />
                              Tham gia trận đấu
                            </>
                          )}
                        </Button>
                      )}

                      {/* Cancel button for match creator */}
                      {match.created_by === currentUserId && (
                        <Button
                          onClick={handleCancelMatch}
                          disabled={actionLoading}
                          variant="destructive"
                          className="w-full"
                        >
                          {actionLoading ? (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                              Đang hủy...
                            </>
                          ) : (
                            <>
                              <XCircle className="h-4 w-4 mr-2" />
                              Hủy trận đấu
                            </>
                          )}
                        </Button>
                      )}
                    </>
                  )}

                  {match.status === 'ongoing' && (
                    <div className="space-y-4">
                      <div className="text-center py-4">
                        <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                        <p className="font-semibold text-blue-600">
                          Trận đấu đang diễn ra
                        </p>
                        <p className="text-sm text-muted-foreground">
                          Không thể tham gia hoặc rời trận đấu
                        </p>
                      </div>

                      {/* Settlement button for match creator */}
                      {match.created_by === currentUserId && (
                        <>
                          <Button
                            onClick={handleStartSettlement}
                            disabled={actionLoading}
                            className="w-full"
                            variant="outline"
                          >
                            <Camera className="h-4 w-4 mr-2" />
                            Hoàn tất trận đấu
                          </Button>

                          {/* Cancel button for match creator */}
                          <Button
                            onClick={handleCancelMatch}
                            disabled={actionLoading}
                            variant="destructive"
                            className="w-full"
                          >
                            {actionLoading ? (
                              <>
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                                Đang hủy...
                              </>
                            ) : (
                              <>
                                <XCircle className="h-4 w-4 mr-2" />
                                Hủy trận đấu
                              </>
                            )}
                          </Button>
                        </>
                      )}
                    </div>
                  )}

                  {match.status === 'completed' && (
                    <div className="text-center py-4">
                      <Trophy className="h-8 w-8 text-yellow-600 mx-auto mb-2" />
                      <p className="font-semibold text-yellow-600">
                        Trận đấu đã hoàn thành
                      </p>
                      {match.winner_user && (
                        <p className="text-sm text-muted-foreground">
                          Người thắng:{' '}
                          {match.winner_user.full_name || 'Đang cập nhật'}
                        </p>
                      )}
                    </div>
                  )}

                  {match.status === 'cancelled' && (
                    <div className="text-center py-4">
                      <p className="font-semibold text-red-600">
                        Trận đấu đã bị hủy
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Không thể tham gia trận đấu này
                      </p>
                    </div>
                  )}

                  <div className="bg-blue-50 p-4 rounded-lg">
                    <h4 className="font-semibold text-blue-900 mb-2">
                      Quy tắc:
                    </h4>
                    <ul className="text-sm text-blue-800 space-y-1">
                      <li>• Có thể rời trận đấu trước khi bắt đầu</li>
                      <li>• Phí tham gia sẽ được hoàn lại khi rời</li>
                      <li>• Trận đấu tự động bắt đầu khi đủ người</li>
                      <li>• Người thắng nhận toàn bộ giải thưởng</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Settlement Components */}
        {showSettlement && (
          <div className="mt-8 space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Camera className="h-5 w-5" />
                  Upload bằng chứng thắng cuộc
                </CardTitle>
                <CardDescription>
                  Upload hình ảnh chứng minh kết quả trận đấu (ví dụ: screenshot
                  kết quả game)
                </CardDescription>
              </CardHeader>
              <CardContent>
                {currentUserId && (
                  <ImageUpload
                    userId={currentUserId}
                    matchId={matchId}
                    onUploadComplete={handleProofUpload}
                    onUploadError={handleProofUploadError}
                    disabled={actionLoading}
                  />
                )}
              </CardContent>
            </Card>

            {showWinnerSelection && match && (
              <WinnerSelection
                players={match.match_players}
                onSelectWinner={handleSelectWinner}
                onCancel={handleCancelSettlement}
                disabled={actionLoading || !proofImageUrl}
              />
            )}
          </div>
        )}

        {/* Match Result Display */}
        {match?.status === 'completed' && match.proof_image_url && (
          <div className="mt-8">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <CheckCircle className="h-5 w-5 text-green-600" />
                  Kết quả trận đấu
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="text-center">
                    <img
                      src={match.proof_image_url}
                      alt="Match result proof"
                      className="max-w-full h-auto rounded-lg border mx-auto"
                      style={{ maxHeight: '400px' }}
                    />
                  </div>
                  <div className="text-center">
                    <p className="text-sm text-muted-foreground">
                      Bằng chứng kết quả trận đấu
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
