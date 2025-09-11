import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import { Providers } from '@/lib/providers';
import './globals.css';

const poppins = Poppins({
  variable: '--font-poppins',
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
});

export const metadata: Metadata = {
  title: "CastMatch - Mumbai's Premier Casting Platform",
  description: 'Connect actors with casting directors for OTT projects in Mumbai',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${poppins.variable} antialiased font-poppins`}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
