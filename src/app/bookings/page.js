import Link from 'next/link';
import BookingsList from '@/components/BookingsList';

export const metadata = {
  title: 'Bookings — Sharad Utsav 2026',
  description: 'View completed festival ticket bookings.',
};

export default function BookingsPage() {
  return (
    <main className="page">
      <header className="site-header">
        <p className="eyebrow">Radha Krishna Temple · Allen, Texas</p>
        <h1>Bookings</h1>
        <p className="meta">Tickets that have been paid and confirmed</p>
        <nav className="site-nav">
          <Link href="/">Book tickets</Link>
          <Link href="/bookings" aria-current="page">
            View bookings
          </Link>
        </nav>
      </header>
      <BookingsList />
    </main>
  );
}
