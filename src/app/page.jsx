import Link from 'next/link';

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 50%, #F8FAFC 100%)' }}>
      {/* Nav */}
      <header className="border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="relative w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-[0_2px_8px_rgba(59,130,246,0.30)] shrink-0">
              <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/30 to-transparent" />
              <svg className="w-3.5 h-3.5 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              </svg>
            </div>
            <span className="text-sm font-semibold bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-transparent">DealReady</span>
          </div>
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
            <h1 className="text-5xl sm:text-6xl font-bold bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-transparent tracking-tight leading-none">
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
