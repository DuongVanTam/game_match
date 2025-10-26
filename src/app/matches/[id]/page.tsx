'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
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
import {
  ArrowLeft,
  Users,
  Clock,
  Trophy,
  Gamepad2,
  UserPlus,
  UserMinus,
} from 'lucide-react';
import Link from 'next/link';

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
  created_by_user: {
    full_name: string;
    avatar_url?: string;
  };
  winner_user?: {
    full_name: string;
    avatar_url?: string;
  };
  match_players: Array<{
    id: string;
    user_id: string;
    status: string | null;
    joined_at: string | null;
    user: {
      full_name: string;
      avatar_url?: string;
    };
  }>;
}

export default function MatchDetailPage() {
  const params = useParams();
  const matchId = params.id as string;

  const [match, setMatch] = useState<Match | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [userJoined, setUserJoined] = useState(false);

  const fetchMatch = async () => {
    try {
      const response = await fetch(`/api/matches/${matchId}`);
      if (response.ok) {
        const data = await response.json();
        setMatch(data);
        // Check if current user has joined this match
        setUserJoined(
          data.match_players.some(
            (player: { status: string | null }) => player.status === 'active'
          )
        );
      }
    } catch (error) {
      console.error('Error fetching match:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (matchId) {
      fetchMatch();
    }
  }, [matchId]);

  const handleJoinMatch = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/matches/${matchId}/join`, {
        method: 'POST',
      });

      if (response.ok) {
        setUserJoined(true);
        fetchMatch(); // Refresh match data
      } else {
        const error = await response.json();
        alert(`Lỗi: ${error.message}`);
      }
    } catch (error) {
      console.error('Error joining match:', error);
      alert('Có lỗi xảy ra khi tham gia trận đấu');
    } finally {
      setActionLoading(false);
    }
  };

  const handleLeaveMatch = async () => {
    setActionLoading(true);
    try {
      const response = await fetch(`/api/matches/${matchId}/leave`, {
        method: 'POST',
      });

      if (response.ok) {
        setUserJoined(false);
        fetchMatch(); // Refresh match data
      } else {
        const error = await response.json();
        alert(`Lỗi: ${error.message}`);
      }
    } catch (error) {
      console.error('Error leaving match:', error);
      alert('Có lỗi xảy ra khi rời trận đấu');
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
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
            <p>Đang tải thông tin trận đấu...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!match) {
    return (
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
    );
  }

  const totalPool = match.entry_fee * match.max_players;
  const serviceFee = totalPool * 0.1;
  const prizePool = totalPool - serviceFee;

  return (
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
            <p className="text-muted-foreground text-lg">{match.description}</p>
          </div>
        </div>
      </div>

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
                      {match.created_by_user.full_name}
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
                        {match.winner_user.full_name}
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
                          <AvatarImage src={player.user.avatar_url} />
                          <AvatarFallback>
                            {player.user.full_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <p className="font-semibold">
                            {player.user.full_name}
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
                  </>
                )}

                {match.status === 'ongoing' && (
                  <div className="text-center py-4">
                    <Clock className="h-8 w-8 text-blue-600 mx-auto mb-2" />
                    <p className="font-semibold text-blue-600">
                      Trận đấu đang diễn ra
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Không thể tham gia hoặc rời trận đấu
                    </p>
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
                        Người thắng: {match.winner_user.full_name}
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
                  <h4 className="font-semibold text-blue-900 mb-2">Quy tắc:</h4>
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
    </div>
  );
}
