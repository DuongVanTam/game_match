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
import { Plus, Gamepad2, X } from 'lucide-react';
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
  const [joiningMatchId, setJoiningMatchId] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [notification, setNotification] = useState<{
    type: 'success' | 'error' | 'info';
    message: string;
  } | null>(null);
  const [nextCursor, setNextCursor] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(true);
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
      const response = await fetch(
        '/api/matches?status=open&paginated=1&limit=20'
      );
      if (response.ok) {
        const data = await response.json();
        const items: Match[] = data.items ?? [];
        setMatches(items);
        setNextCursor(data.nextCursor ?? null);
        setHasMore(Boolean(data.hasMore));
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

  const loadMore = async () => {
    if (!hasMore || loadingMore) return;
    setLoadingMore(true);
    try {
      const params = new URLSearchParams();
      params.set('status', 'open');
      params.set('paginated', '1');
      params.set('limit', '20');
      if (nextCursor) params.set('cursor', nextCursor);
      const response = await fetch(`/api/matches?${params.toString()}`);
      if (response.ok) {
        const data = await response.json();
        const items: Match[] = data.items ?? [];
        setMatches((prev) => [...prev, ...items]);
        setNextCursor(data.nextCursor ?? null);
        setHasMore(Boolean(data.hasMore));
      }
    } catch (e) {
      console.error('Error loading more matches:', e);
    } finally {
      setLoadingMore(false);
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
                Danh sách phòng đang mở. Tham gia để thi đấu và giành thưởng.
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

        {/* List dạng hàng thay cho card + tabs */}
        {matches.length > 0 ? (
          <div className="overflow-hidden rounded-lg border bg-white">
            <div className="grid grid-cols-12 gap-2 px-4 py-3 text-xs font-medium text-muted-foreground bg-muted/40">
              <div className="col-span-4">Trận đấu</div>
              <div className="col-span-2 text-right">Phí tham gia</div>
              <div className="col-span-2 text-center">Người chơi</div>
              <div className="col-span-2">Người tạo</div>
              <div className="col-span-2 text-right">Thao tác</div>
            </div>
            <div className="divide-y">
              {matches.map((match) => {
                const hasJoined =
                  !!currentUserId &&
                  !!match.match_players?.some(
                    (p) => p.user_id === currentUserId && p.status === 'active'
                  );
                const isFull = match.current_players >= match.max_players;
                return (
                  <div
                    key={match.id}
                    className="grid grid-cols-12 gap-2 px-4 py-4 items-center hover:bg-muted/20"
                  >
                    <div className="col-span-4">
                      <div className="font-medium">{match.title}</div>
                      <div className="text-sm text-muted-foreground line-clamp-1">
                        {match.description}
                      </div>
                      <div className="text-[11px] text-muted-foreground mt-1">
                        Tạo lúc: {formatDate(match.created_at)}
                      </div>
                    </div>
                    <div className="col-span-2 text-right font-semibold text-primary">
                      {formatCurrency(match.entry_fee)}
                    </div>
                    <div className="col-span-2 text-center font-medium">
                      {match.current_players}/{match.max_players}
                      {hasJoined && <Badge className="ml-2">Đã tham gia</Badge>}
                    </div>
                    <div className="col-span-2">
                      <span className="font-medium">
                        {match.created_by_user?.full_name || 'Người chơi'}
                      </span>
                    </div>
                    <div className="col-span-2">
                      {hasJoined ? (
                        <Link href={`/matches/${match.id}`}>
                          <Button className="w-full" variant="outline">
                            Xem chi tiết
                          </Button>
                        </Link>
                      ) : (
                        <div className="flex gap-2 justify-end">
                          <Button
                            variant="outline"
                            onClick={() => router.push(`/matches/${match.id}`)}
                          >
                            Chi tiết
                          </Button>
                          <Button
                            onClick={() => handleJoinMatch(match.id)}
                            disabled={joiningMatchId === match.id || isFull}
                          >
                            {joiningMatchId === match.id
                              ? 'Đang tham gia...'
                              : isFull
                                ? 'Đã đủ người'
                                : 'Tham gia'}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {hasMore && (
                <div className="px-4 py-4">
                  <Button
                    className="w-full"
                    onClick={loadMore}
                    disabled={loadingMore}
                  >
                    {loadingMore ? 'Đang tải...' : 'Tải thêm'}
                  </Button>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="text-center py-12">
            <Gamepad2 className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">
              Không có phòng đang mở
            </h3>
            <p className="text-muted-foreground mb-4">
              Hiện tại chưa có trận đấu nào đang mở. Tạo trận đấu mới để bắt
              đầu.
            </p>
            <Link href="/matches/create">
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Tạo trận đấu đầu tiên
              </Button>
            </Link>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
}
