import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'MOTO-CRM',
  description: 'Motorcycle service receipt and inquiry manager'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko">
      <body className="min-h-screen">
        <div className="mx-auto max-w-5xl px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
