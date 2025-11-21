import { Navigation } from '@/components/Navigation';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

// Cache this page for 7 days (604800 seconds)
// Pages are regenerated at most once per week
export const revalidate = 604800;

export default function PrivacyPolicyPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Chính sách bảo mật
          </h1>
          <p className="text-xl text-gray-600">
            Cập nhật lần cuối: {new Date().toLocaleDateString('vi-VN')}
          </p>
        </div>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>1. Giới thiệu</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              TFT Match cam kết bảo vệ quyền riêng tư và thông tin cá nhân của
              người dùng. Chính sách này giải thích cách chúng tôi thu thập, sử
              dụng, lưu trữ và bảo vệ thông tin của bạn khi sử dụng dịch vụ của
              chúng tôi.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>2. Thông tin chúng tôi thu thập</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Thông tin cá nhân</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Địa chỉ email để xác thực tài khoản</li>
                <li>Tên hiển thị và thông tin hồ sơ</li>
                <li>Số điện thoại (nếu cung cấp)</li>
                <li>Thông tin tài khoản Riot Games (summoner name, region)</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Thông tin tài chính</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Lịch sử giao dịch và số dư ví tạm ứng</li>
                <li>Thông tin thanh toán (được mã hóa)</li>
                <li>Lịch sử rút tiền và yêu cầu hoàn tạm ứng</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Thông tin sử dụng</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Dữ liệu truy cập website và ứng dụng</li>
                <li>Lịch sử tham gia giải đấu</li>
                <li>Kết quả thi đấu và bằng chứng</li>
                <li>Thông tin thiết bị và trình duyệt</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>3. Cách chúng tôi sử dụng thông tin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Cung cấp dịch vụ</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Xác thực và quản lý tài khoản người dùng</li>
                <li>Tổ chức và quản lý các giải đấu</li>
                <li>Xử lý thanh toán và hoàn tiền</li>
                <li>Cung cấp hỗ trợ khách hàng</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Cải thiện dịch vụ</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Phân tích và cải thiện trải nghiệm người dùng</li>
                <li>Phát triển tính năng mới</li>
                <li>Ngăn chặn gian lận và lạm dụng</li>
                <li>Đảm bảo tính công bằng trong thi đấu</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Tuân thủ pháp luật</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Tuân thủ các quy định pháp luật hiện hành</li>
                <li>Hợp tác với cơ quan chức năng khi cần thiết</li>
                <li>Bảo vệ quyền lợi hợp pháp của người dùng</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>4. Chia sẻ thông tin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">
                Chúng tôi KHÔNG chia sẻ thông tin cá nhân với:
              </h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Bên thứ ba để mục đích tiếp thị</li>
                <li>Các công ty quảng cáo</li>
                <li>Nhà cung cấp dịch vụ không liên quan</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">
                Chúng tôi CÓ THỂ chia sẻ thông tin trong trường hợp:
              </h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Có sự đồng ý rõ ràng của bạn</li>
                <li>Tuân thủ yêu cầu pháp lý</li>
                <li>Bảo vệ quyền lợi và an toàn của người dùng</li>
                <li>Ngăn chặn gian lận hoặc hoạt động bất hợp pháp</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>5. Bảo mật thông tin</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Biện pháp bảo mật</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Mã hóa SSL/TLS cho tất cả giao dịch</li>
                <li>Mã hóa dữ liệu nhạy cảm trong cơ sở dữ liệu</li>
                <li>Xác thực đa yếu tố cho tài khoản quan trọng</li>
                <li>Giám sát và phát hiện hoạt động bất thường</li>
                <li>Backup và khôi phục dữ liệu định kỳ</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Bảo vệ vật lý</h3>
              <p className="text-gray-600">
                Máy chủ của chúng tôi được đặt tại các trung tâm dữ liệu có bảo
                mật cao, với kiểm soát truy cập nghiêm ngặt và giám sát 24/7.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>6. Quyền của người dùng</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Bạn có quyền:</h3>
              <ul className="list-disc list-inside text-gray-600 space-y-1">
                <li>Truy cập và xem thông tin cá nhân của mình</li>
                <li>Chỉnh sửa và cập nhật thông tin không chính xác</li>
                <li>Yêu cầu xóa tài khoản và dữ liệu cá nhân</li>
                <li>Xuất dữ liệu cá nhân dưới dạng có thể đọc được</li>
                <li>Rút lại sự đồng ý xử lý dữ liệu</li>
                <li>Khiếu nại về cách xử lý dữ liệu</li>
              </ul>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Cách thực hiện quyền</h3>
              <p className="text-gray-600">
                Để thực hiện các quyền trên, vui lòng liên hệ với chúng tôi qua
                email tftsupp06t@gmail.com. Chúng tôi sẽ phản hồi trong vòng 30
                ngày.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>7. Cookie và công nghệ theo dõi</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Cookie cần thiết</h3>
              <p className="text-gray-600">
                Chúng tôi sử dụng cookie để duy trì phiên đăng nhập, ghi nhớ tùy
                chọn người dùng và đảm bảo website hoạt động bình thường.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Cookie phân tích</h3>
              <p className="text-gray-600">
                Chúng tôi có thể sử dụng cookie để phân tích cách người dùng
                tương tác với website, giúp cải thiện trải nghiệm và hiệu suất.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Quản lý cookie</h3>
              <p className="text-gray-600">
                Bạn có thể quản lý cookie thông qua cài đặt trình duyệt. Tuy
                nhiên, việc tắt cookie có thể ảnh hưởng đến chức năng của
                website.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>8. Lưu trữ dữ liệu</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Thời gian lưu trữ</h3>
              <p className="text-gray-600">
                Chúng tôi lưu trữ thông tin cá nhân trong thời gian cần thiết để
                cung cấp dịch vụ và tuân thủ các nghĩa vụ pháp lý. Thông tin tài
                chính được lưu trữ ít nhất 5 năm theo quy định về kế toán.
              </p>
            </div>

            <div>
              <h3 className="font-semibold mb-2">Xóa dữ liệu</h3>
              <p className="text-gray-600">
                Khi bạn xóa tài khoản, chúng tôi sẽ xóa thông tin cá nhân trong
                vòng 30 ngày, trừ những thông tin cần thiết để tuân thủ pháp
                luật.
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>9. Trẻ em</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Dịch vụ của chúng tôi không dành cho trẻ em dưới 13 tuổi. Chúng
              tôi không cố ý thu thập thông tin cá nhân từ trẻ em dưới 13 tuổi.
              Nếu chúng tôi phát hiện đã thu thập thông tin từ trẻ em dưới 13
              tuổi, chúng tôi sẽ xóa thông tin đó ngay lập tức.
            </p>
          </CardContent>
        </Card>

        <Card className="mb-8">
          <CardHeader>
            <CardTitle>10. Thay đổi chính sách</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600">
              Chúng tôi có thể cập nhật chính sách bảo mật này theo thời gian.
              Khi có thay đổi quan trọng, chúng tôi sẽ thông báo qua email hoặc
              thông báo trên website. Việc tiếp tục sử dụng dịch vụ sau khi thay
              đổi được coi là chấp nhận chính sách mới.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>11. Liên hệ</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-600 mb-4">
              Nếu bạn có câu hỏi về chính sách bảo mật này, vui lòng liên hệ với
              chúng tôi:
            </p>
            <div className="space-y-2">
              <p className="text-sm">
                <strong>Email:</strong> privacy@tftmatch.com
              </p>
              <p className="text-sm">
                <strong>Điện thoại:</strong> +84 345842088
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
