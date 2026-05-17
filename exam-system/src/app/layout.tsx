import type { Metadata } from 'next';
import { Sarabun } from 'next/font/google';
import './globals.css';

const sarabun = Sarabun({
  weight: ['300', '400', '500', '600', '700', '800'],
  subsets: ['thai', 'latin'],
  variable: '--font-sarabun',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'ระบบสอบปลายภาคเรียน – โรงเรียนบ้านคำไผ่',
  description: 'ระบบสอบออนไลน์ ปลายภาคเรียนที่ 2 ปีการศึกษา 2568 โรงเรียนบ้านคำไผ่',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <body className={`${sarabun.variable} font-sans antialiased`}>
        {children}
      </body>
    </html>
  );
}
