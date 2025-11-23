import type { Metadata } from 'next';
import { Geist, Geist_Mono } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata: Metadata = {
  title: 'TFT Match - Skill-Based Tournaments',
  description: 'Compete in Teamfight Tactics tournaments with real rewards',
  icons: {
    icon: '/logo.png',
    apple: '/logo.png',
  },
  openGraph: {
    title: 'TFT Match - Skill-Based Tournaments',
    description:
      'Tham gia các giải đấu Teamfight Tactics dựa trên kỹ năng. Thắng giải thưởng thật từ mỗi trận đấu!',
    siteName: 'TFT Match',
    images: [
      {
        url: '/YasuoBG.avif',
        width: 1200,
        height: 630,
        alt: 'TFT Match - Skill-Based Tournaments',
      },
    ],
    locale: 'vi_VN',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TFT Match - Skill-Based Tournaments',
    description:
      'Tham gia các giải đấu Teamfight Tactics dựa trên kỹ năng. Thắng giải thưởng thật từ mỗi trận đấu!',
    images: ['/YasuoBG.avif'],
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  );
}
