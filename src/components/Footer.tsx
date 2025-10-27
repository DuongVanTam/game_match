import Link from 'next/link';

export function Footer() {
  return (
    <footer className="bg-gray-900 text-white">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Company Info */}
          <div className="col-span-1 md:col-span-2">
            <h3 className="text-xl font-bold mb-4">TFT Match</h3>
            <p className="text-gray-300 mb-4">
              Nền tảng thi đấu kỹ năng Teamfight Tactics với phần thưởng thực
              tế. Chơi game, thể hiện kỹ năng, nhận phần thưởng.
            </p>
            <div className="space-y-2 text-sm text-gray-400">
              <p>
                <strong>Email:</strong> support@tftmatch.com
              </p>
              <p>
                <strong>Hotline:</strong> +84 123 456 789
              </p>
              <p>
                <strong>Địa chỉ:</strong> Hà Nội, Việt Nam
              </p>
            </div>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4">Liên kết nhanh</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link
                  href="/how-it-works"
                  className="text-gray-300 hover:text-white"
                >
                  Cách thức hoạt động
                </Link>
              </li>
              <li>
                <Link
                  href="/matches"
                  className="text-gray-300 hover:text-white"
                >
                  Thi đấu kỹ năng
                </Link>
              </li>
              <li>
                <Link href="/wallet" className="text-gray-300 hover:text-white">
                  Ví tạm ứng
                </Link>
              </li>
              <li>
                <Link href="/faq" className="text-gray-300 hover:text-white">
                  Câu hỏi thường gặp
                </Link>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h4 className="font-semibold mb-4">Pháp lý</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link href="/terms" className="text-gray-300 hover:text-white">
                  Điều khoản dịch vụ
                </Link>
              </li>
              <li>
                <Link
                  href="/privacy"
                  className="text-gray-300 hover:text-white"
                >
                  Chính sách bảo mật
                </Link>
              </li>
              <li>
                <Link
                  href="/contact"
                  className="text-gray-300 hover:text-white"
                >
                  Liên hệ hỗ trợ
                </Link>
              </li>
            </ul>
          </div>
        </div>

        {/* Disclaimer */}
        <div className="border-t border-gray-700 mt-8 pt-8">
          <div className="bg-yellow-900 border border-yellow-700 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-yellow-200 mb-2">
              Tuyên bố miễn trừ trách nhiệm
            </h4>
            <p className="text-sm text-yellow-100">
              TFT Match không liên kết với Riot Games, Inc. Teamfight Tactics là
              thương hiệu của Riot Games, Inc. Chúng tôi chỉ cung cấp nền tảng
              tổ chức giải đấu kỹ năng và không có quyền sở hữu trí tuệ đối với
              game.
            </p>
          </div>

          <div className="bg-blue-900 border border-blue-700 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-200 mb-2">
              Chơi có trách nhiệm
            </h4>
            <p className="text-sm text-blue-100">
              Chúng tôi khuyến khích chơi game một cách có trách nhiệm và trong
              khả năng tài chính của bạn. Nếu bạn cảm thấy mình đang gặp vấn đề
              với việc chơi game, hãy tìm kiếm sự giúp đỡ.
            </p>
          </div>

          <div className="text-center text-sm text-gray-400">
            <p>
              &copy; {new Date().getFullYear()} TFT Match. Tất cả quyền được bảo
              lưu.
            </p>
            <p className="mt-2">
              Dịch vụ chỉ dành cho người từ 18 tuổi trở lên. Chơi game có trách
              nhiệm và tuân thủ pháp luật.
            </p>
          </div>
        </div>
      </div>
    </footer>
  );
}
