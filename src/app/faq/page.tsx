import { Navigation } from '@/components/Navigation';
import { Footer } from '@/components/Footer';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';

// Cache this page for 7 days (604800 seconds)
// Pages are regenerated at most once per week
export const revalidate = 604800;

export default function FAQPage() {
  const faqs = [
    {
      category: 'Tổng quan',
      questions: [
        {
          question: 'TFT Match là gì?',
          answer:
            'TFT Match là nền tảng tổ chức giải đấu kỹ năng Teamfight Tactics với phần thưởng thực tế. Người chơi đóng phí tạm ứng dịch vụ để tham gia thi đấu và nhận phần thưởng khi thắng cuộc.',
        },
        {
          question: 'Có phải đây là cờ bạc không?',
          answer:
            'Không. TFT Match là nền tảng thi đấu kỹ năng, không phải cờ bạc. Kết quả phụ thuộc hoàn toàn vào kỹ năng chơi game của người chơi, không có yếu tố may mắn.',
        },
        {
          question: 'Tôi có cần tài khoản Riot Games không?',
          answer:
            'Có. Bạn cần có tài khoản Riot Games hợp lệ và đã chơi Teamfight Tactics để tham gia các giải đấu. Chúng tôi sẽ xác minh tài khoản của bạn trước khi cho phép tham gia.',
        },
      ],
    },
    {
      category: 'Tài chính',
      questions: [
        {
          question: 'Phí tạm ứng dịch vụ là gì?',
          answer:
            'Phí tạm ứng dịch vụ là khoản tiền bạn nạp vào ví để tham gia các giải đấu. Đây không phải là cược hay đầu tư, mà là phí dịch vụ tạm thời để tổ chức giải đấu.',
        },
        {
          question: 'Làm sao để nạp tiền vào ví?',
          answer:
            'Bạn có thể nạp tiền qua Momo, VietQR, chuyển khoản ngân hàng hoặc các phương thức thanh toán khác được hỗ trợ. Sau khi thanh toán thành công, số tiền sẽ được cộng vào ví tạm ứng của bạn.',
        },
        {
          question: 'Tôi có thể rút tiền bất kỳ lúc nào không?',
          answer:
            'Có. Bạn có thể yêu cầu rút tiền (hoàn tạm ứng) bất kỳ lúc nào. Yêu cầu sẽ được xử lý trong vòng 1-3 ngày làm việc.',
        },
        {
          question: 'Phí dịch vụ là bao nhiêu?',
          answer:
            'Chúng tôi thu phí dịch vụ từ 10-20% tổng phí tham gia để duy trì nền tảng, phân phối phần thưởng và cung cấp dịch vụ hỗ trợ.',
        },
      ],
    },
    {
      category: 'Thi đấu',
      questions: [
        {
          question: 'Làm sao để tham gia giải đấu?',
          answer:
            'Bạn có thể xem danh sách giải đấu đang mở, chọn giải phù hợp và đóng phí tham gia từ ví tạm ứng. Sau khi đủ số người tham gia, giải đấu sẽ bắt đầu.',
        },
        {
          question: 'Tôi có thể rời giải đấu không?',
          answer:
            'Bạn có thể rời giải đấu trước khi bắt đầu và sẽ được hoàn lại phí tham gia. Tuy nhiên, sau khi giải đấu bắt đầu, bạn không thể rời và sẽ mất phí tham gia nếu không hoàn thành.',
        },
        {
          question: 'Làm sao để chứng minh kết quả?',
          answer:
            'Sau khi hoàn thành trận đấu, bạn cần upload screenshot kết quả để chứng minh thắng thua. Kết quả sẽ được xác minh trước khi phân phối phần thưởng.',
        },
        {
          question: 'Điều gì xảy ra nếu có tranh chấp?',
          answer:
            'Mọi tranh chấp sẽ được xem xét bởi đội ngũ admin. Chúng tôi sẽ đưa ra quyết định dựa trên bằng chứng và quy định hiện hành.',
        },
      ],
    },
    {
      category: 'Bảo mật',
      questions: [
        {
          question: 'Thông tin của tôi có an toàn không?',
          answer:
            'Có. Chúng tôi sử dụng mã hóa SSL/TLS và các biện pháp bảo mật tiên tiến để bảo vệ thông tin cá nhân và tài chính của bạn.',
        },
        {
          question: 'Tôi có thể tin tưởng vào tính công bằng không?',
          answer:
            'Có. Chúng tôi có hệ thống xác minh nghiêm ngặt và giám sát liên tục để đảm bảo tính công bằng trong thi đấu. Mọi giao dịch đều được ghi lại và có thể truy xuất.',
        },
        {
          question: 'Làm sao để báo cáo gian lận?',
          answer:
            'Nếu bạn phát hiện gian lận hoặc hoạt động bất thường, hãy liên hệ với chúng tôi qua email tftsupp06t@gmail.com hoặc hotline. Chúng tôi sẽ điều tra và xử lý nghiêm.',
        },
      ],
    },
    {
      category: 'Hỗ trợ',
      questions: [
        {
          question: 'Làm sao để liên hệ hỗ trợ?',
          answer:
            'Bạn có thể liên hệ với chúng tôi qua email tftsupp06t@gmail.com, hotline +84 345842088, hoặc chat trực tiếp trên website. Chúng tôi hỗ trợ 24/7.',
        },
        {
          question: 'Tôi có thể hủy tài khoản không?',
          answer:
            'Có. Bạn có thể yêu cầu hủy tài khoản bất kỳ lúc nào. Chúng tôi sẽ xóa thông tin cá nhân và hoàn lại số dư trong ví tạm ứng (nếu có).',
        },
        {
          question: 'Có phí ẩn nào không?',
          answer:
            'Không. Chúng tôi minh bạch về tất cả các khoản phí. Phí dịch vụ được hiển thị rõ ràng trước khi bạn tham gia giải đấu.',
        },
      ],
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />

      <div className="max-w-4xl mx-auto px-4 py-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Câu hỏi thường gặp
          </h1>
          <p className="text-xl text-gray-600">
            Tìm câu trả lời cho những thắc mắc phổ biến về TFT Match
          </p>
        </div>

        <div className="space-y-8">
          {faqs.map((category, categoryIndex) => (
            <div key={categoryIndex}>
              <h2 className="text-2xl font-bold text-gray-900 mb-6">
                {category.category}
              </h2>

              <div className="space-y-4">
                {category.questions.map((faq, faqIndex) => (
                  <Card key={faqIndex}>
                    <CardHeader>
                      <CardTitle className="text-lg">{faq.question}</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-gray-600">{faq.answer}</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          ))}
        </div>

        <Card className="mt-12">
          <CardHeader>
            <CardTitle>Không tìm thấy câu trả lời?</CardTitle>
            <CardDescription>
              Chúng tôi luôn sẵn sàng hỗ trợ bạn
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-gray-600">
              Nếu bạn không tìm thấy câu trả lời cho câu hỏi của mình, đừng ngần
              ngại liên hệ với chúng tôi. Đội ngũ hỗ trợ sẽ phản hồi trong thời
              gian sớm nhất.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-900 mb-2">Email</h3>
                <p className="text-sm text-blue-700">tftsupp06t@gmail.com</p>
              </div>

              <div className="text-center p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-900 mb-2">Hotline</h3>
                <p className="text-sm text-green-700">+84 345842088</p>
              </div>

              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <h3 className="font-semibold text-purple-900 mb-2">
                  Chat trực tiếp
                </h3>
                <p className="text-sm text-purple-700">24/7 trên website</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Footer />
    </div>
  );
}
