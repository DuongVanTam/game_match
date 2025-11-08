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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Users, Clock, Trophy, Gamepad2, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
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
  match_players?: Array<{
    user_id: string;
    status: string | null;
  }> | null;
  created_by_user?: {
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
  winner_user?: {
    full_name: string | null;
    avatar_url?: string | null;
  } | null;
}

export default function MatchesPage() {
  const router = useRouter();
  const [matches, setMatches] = useState<Match[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('all');
  const [joiningMatchId, setJoiningMatchId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const { user, loading: authLoading } = useAuth();

  useEffect(() => {
    if (!authLoading) {
      setCurrentUserId(user?.id ?? null);
    }
  }, [user, authLoading]);

  useEffect(() => {
    fetchMatches();
  }, []);

  const showNotification = (
    type: 'success' | 'error' | 'info',
    message: string
  ) => setNotification({ type, message });

  const clearNotification = () => setNotification(null);

  const fetchMatches = async () => {
    try {
      if (notification?.type === 'error') {
        clearNotification();
      }
      const response = await fetch('/api/matches');
      if (response.ok) {
        const data = await response.json();
        setMatches(data);
      } else {
        const error = await response.json();
        const message =
          error.message ||
          error.error ||
          'Không thể tải danh sách trận đấu. Vui lòng thử lại.';
        showNotification('error', message);
      }
    } catch (error) {
      console.error('Error fetching matches:', error);
      showNotification(
        'error',
        'Có lỗi xảy ra khi tải danh sách trận đấu. Vui lòng thử lại.'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleJoinMatch = async (matchId: string) => {
    clearNotification();
    setJoiningMatchId(matchId);
    try {
      const response = await fetch(`/api/matches/${matchId}/join`, {
        method: 'POST',
      });

      const result = await response.json();

      if (response.ok) {
        const redirectUrl = `/matches/${matchId}`;
        router.push(redirectUrl);
      } else {
        const message =
          result.message ||
          result.error ||
          'Không thể tham gia trận đấu. Vui lòng thử lại.';
        if (result.error === 'Duplicate join') {
          showNotification('error', 'Bạn đã tham gia trận đấu này rồi.');
        } else {
          showNotification('error', message);
        }
      }
    } catch (error) {
      console.error('Error joining match from list:', error);
      showNotification(
        'error',
        'Có lỗi xảy ra khi tham gia trận đấu. Vui lòng thử lại.'
      );
    } finally {
      setJoiningMatchId(null);
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

  const filteredMatches = matches.filter((match) => {
    switch (activeTab) {
      case 'open':
        return match.status === 'open';
      case 'ongoing':
        return match.status === 'ongoing';
      case 'completed':
        return match.status === 'completed';
      default:
        return true;
    }
  });

  if (loading || authLoading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Navigation />
        <div className="container mx-auto px-4 py-8">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p>Đang tải danh sách trận đấu...</p>
            </div>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      <div className="container mx-auto px-4 py-8">
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold mb-2">Trận Đấu TFT</h1>
              <p className="text-muted-foreground">
                Tham gia các trận đấu kỹ năng và giành giải thưởng
              </p>
            </div>
            <Link href="/matches/create">
              <Button className="flex items-center gap-2">
                <Plus className="h-4 w-4" />
                Tạo trận đấu
              </Button>
            </Link>
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

        <Tabs
          value={activeTab}
          onValueChange={setActiveTab}
          className="space-y-6"
        >
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="all" className="flex items-center gap-2">
              <Gamepad2 className="h-4 w-4" />
              Tất cả
            </TabsTrigger>
            <TabsTrigger value="open" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              Đang mở
            </TabsTrigger>
            <TabsTrigger value="ongoing" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Đang diễn ra
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <Trophy className="h-4 w-4" />
              Hoàn thành
            </TabsTrigger>
          </TabsList>

          <TabsContent value={activeTab} className="space-y-6">
            {filteredMatches.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {filteredMatches.map((match) => (
                  <Card
                    key={match.id}
                    className="hover:shadow-lg transition-shadow"
                  >
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-lg mb-2">
                            {match.title}
                          </CardTitle>
                          <CardDescription className="mb-3">
                            {match.description}
                          </CardDescription>
                        </div>
                        <Badge className={getStatusColor(match.status)}>
                          {getStatusLabel(match.status)}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
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
                        {currentUserId &&
                          match.match_players?.some(
                            (player) =>
                              player.user_id === currentUserId &&
                              player.status === 'active'
                          ) && (
                            <div className="flex items-center justify-between">
                              <span className="text-sm text-muted-foreground">
                                Trạng thái của bạn:
                              </span>
                              <Badge>Đã tham gia</Badge>
                            </div>
                          )}

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
                            Thời gian:
                          </span>
                          <span className="text-sm">
                            {formatDate(match.created_at)}
                          </span>
                        </div>

                        {match.status === 'completed' && match.winner_user && (
                          <div className="flex items-center justify-between">
                            <span className="text-sm text-muted-foreground">
                              Người thắng:
                            </span>
                            <span className="font-semibold text-yellow-600">
                              {match.winner_user?.full_name || 'Đang cập nhật'}
                            </span>
                          </div>
                        )}

                        <div className="pt-3 border-t">
                          {match.status === 'open' ? (
                            <div className="flex flex-col gap-2">
                              {currentUserId &&
                              match.match_players?.some(
                                (player) =>
                                  player.user_id === currentUserId &&
                                  player.status === 'active'
                              ) ? (
                                <Button className="w-full" disabled>
                                  Bạn đã tham gia
                                </Button>
                              ) : (
                                <Button
                                  className="w-full"
                                  onClick={() => handleJoinMatch(match.id)}
                                  disabled={
                                    joiningMatchId === match.id ||
                                    match.current_players >= match.max_players
                                  }
                                >
                                  {joiningMatchId === match.id ? (
                                    <>
                                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                                      Đang tham gia...
                                    </>
                                  ) : match.current_players >=
                                    match.max_players ? (
                                    'Đã đủ người'
                                  ) : (
                                    'Tham gia ngay'
                                  )}
                                </Button>
                              )}
                              <Link href={`/matches/${match.id}`}>
                                <Button className="w-full" variant="outline">
                                  Xem chi tiết
                                </Button>
                              </Link>
                            </div>
                          ) : (
                            <Link href={`/matches/${match.id}`}>
                              <Button
                                className="w-full"
                                variant={
                                  match.status === 'completed'
                                    ? 'outline'
                                    : 'default'
                                }
                                disabled={match.status === 'cancelled'}
                              >
                                {match.status === 'ongoing'
                                  ? 'Đang diễn ra'
                                  : match.status === 'completed'
                                    ? 'Xem kết quả'
                                    : match.status === 'cancelled'
                                      ? 'Đã hủy'
                                      : 'Chi tiết'}
                              </Button>
                            </Link>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="text-center py-12">
                <Gamepad2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">
                  Không có trận đấu nào
                </h3>
                <p className="text-muted-foreground mb-4">
                  {activeTab === 'all'
                    ? 'Chưa có trận đấu nào được tạo'
                    : activeTab === 'open'
                      ? 'Không có trận đấu nào đang mở'
                      : activeTab === 'ongoing'
                        ? 'Không có trận đấu nào đang diễn ra'
                        : 'Không có trận đấu nào đã hoàn thành'}
                </p>
                {activeTab === 'all' && (
                  <Link href="/matches/create">
                    <Button>
                      <Plus className="h-4 w-4 mr-2" />
                      Tạo trận đấu đầu tiên
                    </Button>
                  </Link>
                )}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
      <Footer />
    </div>
  );
}
