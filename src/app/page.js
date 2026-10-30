import Link from 'next/link';
import BookingForm from '@/components/BookingForm';

export default function HomePage() {
  return (
    <main className="page">
      <header className="site-header">
        <p className="eyebrow">Radha Krishna Temple · Allen, Texas</p>
        <h1>Sharad Utsav 2026</h1>
        <p className="meta">Tue 10 Nov → Sat 14 Nov 2026 · Book for your whole family</p>
        <nav className="site-nav">
          <Link href="/" aria-current="page">
            Book tickets
          </Link>
          <Link href="/bookings">View bookings</Link>
        </nav>
      </header>
      <BookingForm />
    </main>
  );
}
