import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center space-y-6 max-w-lg px-6">
        <h1 className="text-4xl font-bold text-foreground tracking-tight">
          DealReady
        </h1>
        <p className="text-lg text-muted">
          Battle-test your management team before the real presentation.
        </p>
        <div className="flex gap-4 justify-center pt-4">
          <Link
            href="/login"
            className="px-6 py-3 bg-primary text-white rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Get Started
          </Link>
        </div>
        <p className="text-sm text-muted pt-8">
          Your documents are encrypted at rest and in transit.
          <br />
          <Link href="/security" className="text-primary hover:underline">
            Learn about our security practices →
          </Link>
        </p>
      </div>
    </div>
  );
}
