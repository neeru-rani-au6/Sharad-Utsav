import { Libre_Baskerville, Source_Sans_3 } from 'next/font/google';
import './globals.css';

const serif = Libre_Baskerville({
  subsets: ['latin'],
  weight: ['400', '700'],
  variable: '--font-serif-loaded',
});

const sans = Source_Sans_3({
  subsets: ['latin'],
  weight: ['400', '600', '700'],
  variable: '--font-sans-loaded',
});

export const metadata = {
  title: 'Sharad Utsav 2026 — Book tickets',
  description:
    'Book tickets for Sharad Utsav 2026 at Radha Krishna Temple, Allen, Texas.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${sans.variable}`}>{children}</body>
    </html>
  );
}
