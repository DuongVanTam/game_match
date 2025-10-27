import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
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

export default function ContactPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Liên hệ hỗ trợ
          </h1>
          <p className="text-xl text-gray-600">
            Chúng tôi luôn sẵn sàng hỗ trợ bạn
          </p>
        </div>

        <div className="grid gap-8 md:grid-cols-2">
          {/* Contact Form */}
          <Card>
            <CardHeader>
              <CardTitle>Gửi tin nhắn</CardTitle>
              <CardDescription>
                Điền form bên dưới và chúng tôi sẽ phản hồi trong vòng 24 giờ
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Họ và tên</Label>
                    <Input id="name" placeholder="Nhập họ và tên" />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="your@email.com"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="subject">Chủ đề</Label>
                  <Select>
                    <SelectTrigger>
                      <SelectValue placeholder="Chọn chủ đề" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="general">Câu hỏi chung</SelectItem>
                      <SelectItem value="technical">Vấn đề kỹ thuật</SelectItem>
                      <SelectItem value="payment">Vấn đề thanh toán</SelectItem>
                      <SelectItem value="tournament">Giải đấu</SelectItem>
                      <SelectItem value="account">Tài khoản</SelectItem>
                      <SelectItem value="other">Khác</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Tin nhắn</Label>
                  <Textarea
                    id="message"
                    placeholder="Mô tả chi tiết vấn đề của bạn..."
                    rows={6}
                  />
                </div>

                <Button type="submit" className="w-full">
                  Gửi tin nhắn
                </Button>
              </form>
            </CardContent>
          </Card>

          {/* Contact Information */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Thông tin liên hệ</CardTitle>
                <CardDescription>
                  Các cách thức liên hệ với chúng tôi
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                    <span className="text-blue-600 text-sm">📧</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">Email</h3>
                    <p className="text-sm text-gray-600">
                      support@tftmatch.com
                    </p>
                    <p className="text-xs text-gray-500">
                      Phản hồi trong 24 giờ
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                    <span className="text-green-600 text-sm">📞</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">Hotline</h3>
                    <p className="text-sm text-gray-600">+84 123 456 789</p>
                    <p className="text-xs text-gray-500">
                      Thứ 2 - Chủ nhật: 8:00 - 22:00
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-full flex items-center justify-center">
                    <span className="text-purple-600 text-sm">💬</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">Chat trực tiếp</h3>
                    <p className="text-sm text-gray-600">Trên website</p>
                    <p className="text-xs text-gray-500">Hỗ trợ 24/7</p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                    <span className="text-orange-600 text-sm">📍</span>
                  </div>
                  <div>
                    <h3 className="font-semibold">Địa chỉ</h3>
                    <p className="text-sm text-gray-600">Hà Nội, Việt Nam</p>
                    <p className="text-xs text-gray-500">Trụ sở chính</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Thời gian hỗ trợ</CardTitle>
                <CardDescription>
                  Lịch hoạt động của các kênh hỗ trợ
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Chat trực tiếp</span>
                  <span className="text-sm text-gray-600">24/7</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Email</span>
                  <span className="text-sm text-gray-600">24/7</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Hotline</span>
                  <span className="text-sm text-gray-600">8:00 - 22:00</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm font-medium">Thứ 2 - Chủ nhật</span>
                  <span className="text-sm text-gray-600">Hàng ngày</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Câu hỏi thường gặp</CardTitle>
                <CardDescription>
                  Tìm câu trả lời nhanh cho các vấn đề phổ biến
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-sm mb-1">
                      Làm sao để nạp tiền vào ví?
                    </h4>
                    <p className="text-xs text-gray-600">
                      Bạn có thể nạp tiền qua Momo, VietQR hoặc chuyển khoản
                      ngân hàng...
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-sm mb-1">
                      Tôi có thể rút tiền bất kỳ lúc nào không?
                    </h4>
                    <p className="text-xs text-gray-600">
                      Có, bạn có thể yêu cầu rút tiền bất kỳ lúc nào...
                    </p>
                  </div>

                  <div className="p-3 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-sm mb-1">
                      Làm sao để tham gia giải đấu?
                    </h4>
                    <p className="text-xs text-gray-600">
                      Chọn giải đấu phù hợp và đóng phí tham gia từ ví tạm
                      ứng...
                    </p>
                  </div>
                </div>

                <Button variant="outline" className="w-full mt-4" asChild>
                  <a href="/faq">Xem tất cả câu hỏi</a>
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
