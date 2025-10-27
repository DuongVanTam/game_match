import { Navigation } from '@/components/Navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export default function HowItWorksPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Cách thức hoạt động
          </h1>
          <p className="text-xl text-gray-600">
            Nền tảng thi đấu kỹ năng Teamfight Tactics với phần thưởng thực tế
          </p>
        </div>

        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 mb-8">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="outline">1</Badge>
                Đăng ký tài khoản
              </CardTitle>
              <CardDescription>
                Liên kết với tài khoản Riot Games của bạn
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Xác minh danh tính thông qua tài khoản Riot Games để đảm bảo
                tính công bằng trong thi đấu.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="outline">2</Badge>
                Tạm ứng dịch vụ
              </CardTitle>
              <CardDescription>
                Nạp tiền vào ví tạm ứng để tham gia thi đấu
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Thanh toán phí dịch vụ tạm thời qua Momo, VietQR hoặc chuyển
                khoản ngân hàng.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="outline">3</Badge>
                Tham gia thi đấu
              </CardTitle>
              <CardDescription>
                Đăng ký vào các giải đấu kỹ năng
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Chọn giải đấu phù hợp và đóng phí tham gia từ ví tạm ứng của
                bạn.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="outline">4</Badge>
                Thi đấu và chứng minh
              </CardTitle>
              <CardDescription>Chơi game và upload kết quả</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Hoàn thành trận đấu và upload screenshot kết quả để xác minh
                thắng thua.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="outline">5</Badge>
                Nhận phần thưởng
              </CardTitle>
              <CardDescription>
                Người thắng nhận hoàn tạm ứng + thưởng
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Người thắng nhận lại phí tạm ứng + phần thưởng từ pool giải đấu.
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Badge variant="outline">6</Badge>
                Rút tiền
              </CardTitle>
              <CardDescription>
                Yêu cầu hoàn tạm ứng về tài khoản
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-gray-600">
                Yêu cầu rút tiền về tài khoản cá nhân bất kỳ lúc nào.
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Mô hình kinh doanh</CardTitle>
            <CardDescription>
              Phí dịch vụ và cách thức hoạt động
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold text-lg mb-2">Phí dịch vụ</h3>
              <p className="text-gray-600">
                Chúng tôi thu phí dịch vụ 10-20% từ tổng phí tham gia để duy trì
                nền tảng và phân phối phần thưởng.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Tạm ứng dịch vụ</h3>
              <p className="text-gray-600">
                Tất cả giao dịch được định nghĩa là &quot;tạm ứng dịch vụ&quot;
                - không phải cược hay đầu tư. Kết quả phụ thuộc hoàn toàn vào kỹ
                năng chơi game.
              </p>
            </div>

            <div>
              <h3 className="font-semibold text-lg mb-2">Hoàn tạm ứng</h3>
              <p className="text-gray-600">
                Người chơi có thể yêu cầu hoàn lại số tiền tạm ứng chưa sử dụng
                bất kỳ lúc nào.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>Cam kết của chúng tôi</CardTitle>
            <CardDescription>
              Đảm bảo tính công bằng và minh bạch
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-semibold mb-2">Thi đấu kỹ năng</h3>
                <p className="text-sm text-gray-600">
                  Tất cả giải đấu dựa trên kỹ năng chơi game, không phải may mắn
                  hay cờ bạc.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Minh bạch</h3>
                <p className="text-sm text-gray-600">
                  Mọi giao dịch đều được ghi lại và có thể truy xuất trong lịch
                  sử.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Bảo mật</h3>
                <p className="text-sm text-gray-600">
                  Thông tin cá nhân và tài chính được bảo vệ bằng công nghệ mã
                  hóa hiện đại.
                </p>
              </div>

              <div>
                <h3 className="font-semibold mb-2">Hỗ trợ 24/7</h3>
                <p className="text-sm text-gray-600">
                  Đội ngũ hỗ trợ luôn sẵn sàng giải đáp thắc mắc và xử lý vấn
                  đề.
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Lưu ý quan trọng</CardTitle>
            <CardDescription>
              Thông tin cần biết trước khi tham gia
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
              <h3 className="font-semibold text-yellow-800 mb-2">
                Tuyên bố miễn trừ trách nhiệm
              </h3>
              <p className="text-sm text-yellow-700">
                TFT Match không liên kết với Riot Games, Inc. Teamfight Tactics
                là thương hiệu của Riot Games, Inc.
              </p>
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="font-semibold text-blue-800 mb-2">
                Độ tuổi tham gia
              </h3>
              <p className="text-sm text-blue-700">
                Chỉ dành cho người từ 18 tuổi trở lên. Người chưa đủ tuổi cần có
                sự đồng ý của phụ huynh.
              </p>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h3 className="font-semibold text-green-800 mb-2">
                Chơi có trách nhiệm
              </h3>
              <p className="text-sm text-green-700">
                Chúng tôi khuyến khích chơi game một cách có trách nhiệm và
                trong khả năng tài chính của bạn.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
