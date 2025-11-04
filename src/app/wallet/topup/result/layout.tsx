import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Kết quả thanh toán | TFT Match',
  description: 'Kết quả giao dịch thanh toán',
  robots: {
    index: false,
    follow: false,
  },
};

export default function TopupResultLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
