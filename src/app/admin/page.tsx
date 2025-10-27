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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Shield,
  Users,
  Gamepad2,
  Trophy,
  DollarSign,
  CreditCard,
} from 'lucide-react';

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
  winner_id?: string;
  proof_image_url?: string;
  created_by_user: {
    full_name: string;
    avatar_url?: string;
  };
  winner_user?: {
    full_name: string;
    avatar_url?: string;
  };
}

interface User {
  id: string;
  email: string;
  full_name: string;
  avatar_url?: string;
  role: 'user' | 'admin';
  created_at: string;
}

interface DashboardStats {
  totalUsers: number;
  totalMatches: number;
  completedMatches: number;
  totalRevenue: number;
  activeMatches: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [matches, setMatches] = useState<Match[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const fetchDashboardData = async () => {
    try {
      // Fetch stats
      const statsResponse = await fetch('/api/admin/stats');
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        setStats(statsData);
      }

      // Fetch recent matches
      const matchesResponse = await fetch('/api/admin/matches');
      if (matchesResponse.ok) {
        const matchesData = await matchesResponse.json();
        setMatches(matchesData);
      }

      // Fetch recent users
      const usersResponse = await fetch('/api/admin/users');
      if (usersResponse.ok) {
        const usersData = await usersResponse.json();
        setUsers(usersData);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

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
            <p>Đang tải dashboard...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Admin Dashboard</h1>
        </div>
        <p className="text-muted-foreground">
          Quản lý và giám sát hệ thống TFT Tournament
        </p>
      </div>

      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-6"
      >
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="overview">Tổng quan</TabsTrigger>
          <TabsTrigger value="matches">Trận đấu</TabsTrigger>
          <TabsTrigger value="users">Người dùng</TabsTrigger>
          <TabsTrigger value="payouts">Rút tiền</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          {/* Stats Cards */}
          {stats && (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Tổng người dùng
                  </CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalUsers}</div>
                  <p className="text-xs text-muted-foreground">
                    +12% từ tháng trước
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Tổng trận đấu
                  </CardTitle>
                  <Gamepad2 className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{stats.totalMatches}</div>
                  <p className="text-xs text-muted-foreground">
                    {stats.activeMatches} đang hoạt động
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Trận đã hoàn thành
                  </CardTitle>
                  <Trophy className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {stats.completedMatches}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {Math.round(
                      (stats.completedMatches / stats.totalMatches) * 100
                    )}
                    % tổng số
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">
                    Doanh thu
                  </CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {formatCurrency(stats.totalRevenue)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Phí dịch vụ từ trận đấu
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Recent Activity */}
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Trận đấu gần đây</CardTitle>
                <CardDescription>
                  Các trận đấu được tạo trong 7 ngày qua
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {matches.slice(0, 5).map((match) => (
                    <div key={match.id} className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={match.created_by_user.avatar_url} />
                        <AvatarFallback>
                          {match.created_by_user.full_name
                            .charAt(0)
                            .toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">{match.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {formatDate(match.created_at)}
                        </p>
                      </div>
                      <Badge className={getStatusColor(match.status)}>
                        {getStatusLabel(match.status)}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Người dùng mới</CardTitle>
                <CardDescription>
                  Người dùng đăng ký trong 7 ngày qua
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {users.slice(0, 5).map((user) => (
                    <div key={user.id} className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={user.avatar_url} />
                        <AvatarFallback>
                          {user.full_name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold truncate">
                          {user.full_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {user.email}
                        </p>
                      </div>
                      <Badge
                        variant={user.role === 'admin' ? 'default' : 'outline'}
                      >
                        {user.role === 'admin' ? 'Admin' : 'User'}
                      </Badge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="matches" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quản lý trận đấu</CardTitle>
              <CardDescription>
                Xem và quản lý tất cả trận đấu trong hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {matches.map((match) => (
                  <div key={match.id} className="border rounded-lg p-4">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-semibold">{match.title}</h3>
                        <p className="text-sm text-muted-foreground mb-2">
                          {match.description}
                        </p>
                        <div className="flex items-center gap-4 text-sm">
                          <span>Phí: {formatCurrency(match.entry_fee)}</span>
                          <span>
                            Người chơi: {match.current_players}/
                            {match.max_players}
                          </span>
                          <span>
                            Tạo bởi: {match.created_by_user.full_name}
                          </span>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge className={getStatusColor(match.status)}>
                          {getStatusLabel(match.status)}
                        </Badge>
                        <Button variant="outline" size="sm">
                          Xem chi tiết
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="users" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Quản lý người dùng</CardTitle>
              <CardDescription>
                Xem và quản lý tất cả người dùng trong hệ thống
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {users.map((user) => (
                  <div key={user.id} className="border rounded-lg p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar>
                          <AvatarImage src={user.avatar_url} />
                          <AvatarFallback>
                            {user.full_name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="font-semibold">{user.full_name}</p>
                          <p className="text-sm text-muted-foreground">
                            {user.email}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            user.role === 'admin' ? 'default' : 'outline'
                          }
                        >
                          {user.role === 'admin' ? 'Admin' : 'User'}
                        </Badge>
                        <span className="text-sm text-muted-foreground">
                          {formatDate(user.created_at)}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="payouts" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCard className="h-5 w-5 text-primary" />
                Quản lý rút tiền
              </CardTitle>
              <CardDescription>
                Duyệt và xử lý các yêu cầu rút tiền của người dùng
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-center py-8">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground mb-4">
                  Quản lý tất cả các yêu cầu rút tiền
                </p>
                <Button
                  onClick={() => (window.location.href = '/admin/payouts')}
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Mở trang quản lý rút tiền
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
