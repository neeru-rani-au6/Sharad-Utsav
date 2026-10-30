import './globals.css';

export const metadata = {
  title: 'Sharad Utsav 2026 — Book tickets',
  description:
    'Book tickets for Sharad Utsav 2026 at Radha Krishna Temple, Allen, Texas.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
