import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen bg-dots flex flex-col">
      {/* Nav */}
      <header className="border-b border-border/60">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-foreground tracking-tight text-sm">DealReady</span>
          <Link
            href="/login"
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            Sign in
          </Link>
        </div>
      </header>

      {/* Hero */}
      <main className="flex-1 flex items-center justify-center px-6 py-24">
        <div className="max-w-2xl mx-auto text-center space-y-8 animate-fade-in">

          {/* Eyebrow */}
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface text-xs font-medium text-muted tracking-wide uppercase">
            <span className="w-1.5 h-1.5 rounded-full bg-primary inline-block" />
            M&amp;A Management Presentation Prep
          </div>

          {/* Wordmark */}
          <div className="space-y-4">
            <h1 className="text-5xl sm:text-6xl font-bold text-foreground tracking-tight leading-none">
              DealReady
            </h1>
            <p className="text-xl text-muted-light leading-relaxed max-w-lg mx-auto">
              Simulate the real buyer panel before you're in the room.
              Serious preparation for serious processes.
            </p>
          </div>

          {/* Feature chips */}
          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              'Buyer risk map',
              'Live mock Q&A',
              'Persona-driven pressure',
              'Final debrief',
            ].map((f) => (
              <span
                key={f}
                className="px-3 py-1 rounded-full bg-surface border border-border text-xs text-muted"
              >
                {f}
              </span>
            ))}
          </div>

          {/* CTA */}
          <div className="pt-2">
            <Link
              href="/login"
              className="btn-primary text-base px-8 py-3 rounded-xl glow-primary-sm"
            >
              Start preparing
            </Link>
          </div>

          {/* Trust note */}
          <p className="text-xs text-muted/60 pt-4">
            Documents encrypted at rest and in transit &nbsp;·&nbsp; Your data never leaves your session
          </p>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border/40 py-5">
        <p className="text-center text-xs text-muted/40">
          DealReady &copy; {new Date().getFullYear()}
        </p>
      </footer>
    </div>
  );
}
