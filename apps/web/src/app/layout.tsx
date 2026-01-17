import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { Providers } from '@/components/providers';
import { Header } from '@/components/header';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'SmartCart - Intelligent Grocery Shopping',
  description: 'Save money and time with SmartCart - compare prices across multiple stores and optimize your grocery shopping.',
  keywords: 'grocery, shopping, price comparison, savings, delivery, meal planning',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <Header />
          {children}
        </Providers>
      </body>
    </html>
  );
}
