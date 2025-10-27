import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Điều khoản dịch vụ
          </h1>
          <p className="text-xl text-gray-600">
            Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>1. Chấp nhận điều khoản</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Bằng việc sử dụng dịch vụ TFT Match, bạn đồng ý tuân thủ các điều
              khoản và điều kiện được nêu trong tài liệu này. Nếu bạn không đồng
              ý với bất kỳ điều khoản nào, vui lòng không sử dụng dịch vụ của
              chúng tôi.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>2. Định nghĩa dịch vụ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Tạm ứng dịch vụ</h3>
              <p className="text-gray-600">
                Tất cả các khoản thanh toán được định nghĩa là &quot;tạm ứng
                dịch vụ&quot; để tham gia các giải đấu kỹ năng. Đây không phải
                là cược, đầu tư hay hình thức cờ bạc.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Thi đấu kỹ năng</h3>
              <p className="text-gray-600">
                Các giải đấu dựa hoàn toàn trên kỹ năng chơi game Teamfight
                Tactics, không phụ thuộc vào yếu tố may mắn.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Hoàn tạm ứng</h3>
              <p className="text-gray-600">
                Người chơi có quyền yêu cầu hoàn lại số tiền tạm ứng chưa sử
                dụng bất kỳ lúc nào.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>3. Điều kiện tham gia</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Độ tuổi</h3>
              <p className="text-gray-600">
                Dịch vụ chỉ dành cho người từ 18 tuổi trở lên. Người chưa đủ
                tuổi cần có sự đồng ý và giám sát của phụ huynh.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Tài khoản Riot Games</h3>
              <p className="text-gray-600">
                Người chơi phải có tài khoản Riot Games hợp lệ và đã chơi
                Teamfight Tactics để tham gia các giải đấu.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Xác minh danh tính</h3>
              <p className="text-gray-600">
                Chúng tôi có quyền yêu cầu xác minh danh tính để đảm bảo tính
                hợp pháp và công bằng của dịch vụ.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>4. Quyền và nghĩa vụ</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Quyền của người chơi</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Tham gia các giải đấu kỹ năng công bằng</li>
                <li>Nhận phần thưởng khi thắng cuộc</li>
                <li>Yêu cầu hoàn tạm ứng bất kỳ lúc nào</li>
                <li>Được bảo vệ thông tin cá nhân</li>
                <li>Khiếu nại về kết quả giải đấu</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Nghĩa vụ của người chơi</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Tuân thủ luật chơi và quy định giải đấu</li>
                <li>Không gian lận hoặc sử dụng phần mềm hỗ trợ</li>
                <li>Cung cấp thông tin chính xác và cập nhật</li>
                <li>Chơi game một cách có trách nhiệm</li>
                <li>Tôn trọng các người chơi khác</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>5. Phí dịch vụ và thanh toán</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Phí dịch vụ</h3>
              <p className="text-gray-600">
                Chúng tôi thu phí dịch vụ từ 10-20% tổng phí tham gia để duy trì
                nền tảng, phân phối phần thưởng và cung cấp dịch vụ hỗ trợ.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Phương thức thanh toán</h3>
              <p className="text-gray-600">
                Chấp nhận thanh toán qua Momo, VietQR, chuyển khoản ngân hàng và
                các phương thức khác được hỗ trợ.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Hoàn tiền</h3>
              <p className="text-gray-600">
                Yêu cầu hoàn tiền sẽ được xử lý trong vòng 1-3 ngày làm việc.
                Phí xử lý có thể áp dụng tùy theo phương thức thanh toán.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>6. Giải quyết tranh chấp</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Khiếu nại</h3>
              <p className="text-gray-600">
                Mọi khiếu nại về kết quả giải đấu phải được gửi trong vòng 24
                giờ sau khi kết thúc trận đấu.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Xử lý tranh chấp</h3>
              <p className="text-gray-600">
                Chúng tôi sẽ xem xét và đưa ra quyết định cuối cùng dựa trên
                bằng chứng và quy định hiện hành.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Trọng tài</h3>
              <p className="text-gray-600">
                Trong trường hợp không thể giải quyết, tranh chấp sẽ được đưa ra
                trọng tài theo pháp luật Việt Nam.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>7. Bảo mật và quyền riêng tư</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Bảo vệ thông tin</h3>
              <p className="text-gray-600">
                Chúng tôi cam kết bảo vệ thông tin cá nhân và tài chính của bạn
                bằng các biện pháp bảo mật tiên tiến.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Sử dụng thông tin</h3>
              <p className="text-gray-600">
                Thông tin cá nhân chỉ được sử dụng để cung cấp dịch vụ và không
                được chia sẻ với bên thứ ba mà không có sự đồng ý của bạn.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>8. Tuyên bố miễn trừ trách nhiệm</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Liên kết với Riot Games</h3>
              <p className="text-gray-600">
                TFT Match không liên kết với Riot Games, Inc. Teamfight Tactics
                là thương hiệu của Riot Games, Inc. Chúng tôi chỉ cung cấp nền
                tảng tổ chức giải đấu kỹ năng.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Giới hạn trách nhiệm</h3>
              <p className="text-gray-600">
                Chúng tôi không chịu trách nhiệm cho bất kỳ tổn thất nào phát
                sinh từ việc sử dụng dịch vụ, ngoại trừ những trường hợp được
                quy định rõ ràng trong điều khoản này.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>9. Thay đổi điều khoản</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Chúng tôi có quyền thay đổi các điều khoản này bất kỳ lúc nào.
              Thay đổi sẽ có hiệu lực ngay sau khi được công bố trên website.
              Việc tiếp tục sử dụng dịch vụ sau khi thay đổi được coi là chấp
              nhận điều khoản mới.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>10. Liên hệ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Nếu bạn có bất kỳ câu hỏi nào về điều khoản dịch vụ, vui lòng liên
              hệ với chúng tôi:
            </p>
            <div className="space-y-2">
              <p className="text-sm">
                <strong>Email:</strong> support@tftmatch.com
              </p>
              <p className="text-sm">
                <strong>Điện thoại:</strong> +84 123 456 789
              </p>
              <p className="text-sm">
                <strong>Địa chỉ:</strong> Hà Nội, Việt Nam
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
