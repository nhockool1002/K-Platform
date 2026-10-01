import type { Metadata } from 'next';
import { Fraunces, IBM_Plex_Sans, IBM_Plex_Mono } from 'next/font/google';
import './globals.css';

const fraunces = Fraunces({
  variable: '--font-display',
  subsets: ['latin', 'vietnamese'],
  style: ['normal', 'italic'],
});

const plexSans = IBM_Plex_Sans({
  variable: '--font-ui',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600', '700'],
});

const plexMono = IBM_Plex_Mono({
  variable: '--font-ledger',
  subsets: ['latin', 'vietnamese'],
  weight: ['400', '500', '600'],
});

export const metadata: Metadata = {
  title: 'K-Point Platform',
  description: 'Nền tảng kết nối Khảo sát & Trải nghiệm Thực tế',
};

export default function RootLayout({ children }: LayoutProps<'/'>) {
  return (
    <html
      lang="vi"
      className={`${fraunces.variable} ${plexSans.variable} ${plexMono.variable} h-full antialiased`}
    >
      <body className="bg-paper text-ink min-h-full">{children}</body>
    </html>
  );
}
