'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

const STATUS_META = {
  setup:      { label: 'Setup',      color: 'text-muted bg-surface border-border' },
  processing: { label: 'Processing', color: 'text-gold bg-gold-dim border-gold/20' },
  part1:      { label: 'Analysis',   color: 'text-primary bg-primary-dim border-primary/20' },
  part2:      { label: 'Analysis',   color: 'text-primary bg-primary-dim border-primary/20' },
  part3:      { label: 'Q&A',        color: 'text-primary bg-primary-dim border-primary/20' },
  part4:      { label: 'Debrief',    color: 'text-primary bg-primary-dim border-primary/20' },
  complete:   { label: 'Complete',   color: 'text-success bg-success-dim border-success/20' },
};

const PHASE_STEPS = ['setup', 'part1', 'part2', 'part3', 'part4', 'complete'];

function getProgress(status) {
  const idx = PHASE_STEPS.indexOf(status);
  return idx < 0 ? 0 : Math.round((idx / (PHASE_STEPS.length - 1)) * 100);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
  });
}

function UserInitial({ email }) {
  const initial = email ? email[0].toUpperCase() : '?';
  return (
    <div className="w-8 h-8 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-xs font-semibold text-primary">
      {initial}
    </div>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) { router.replace('/login'); return; }
      const { user: me } = await meRes.json();
      setUser(me);

      const sessionsRes = await fetch('/api/sessions');
      if (!sessionsRes.ok) { toast.error('Failed to load sessions'); return; }
      const { sessions: list } = await sessionsRes.json();
      setSessions(list ?? []);
    } catch {
      toast.error('Failed to connect. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => { load(); }, [load]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Top nav */}
      <header className="border-b border-border/60 bg-surface/40 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-foreground tracking-tight text-sm">DealReady</span>
          <div className="flex items-center gap-3">
            {user && <UserInitial email={user.email} />}
            <span className="text-xs text-muted hidden sm:block">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-xs text-muted hover:text-foreground transition-colors px-2 py-1 rounded border border-transparent hover:border-border"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">
        <div className="flex items-end justify-between mb-8 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">
              Your sessions
            </p>
            <h1 className="text-2xl font-bold text-foreground">
              {sessions.length > 0
                ? `${sessions.length} deal${sessions.length !== 1 ? 's' : ''} in progress`
                : 'No sessions yet'}
            </h1>
          </div>
          <Link href="/dashboard/new" className="btn-primary shrink-0">
            + New Session
          </Link>
        </div>

        {sessions.length === 0 ? (
          <EmptyState />
        ) : (
          <SessionGrid sessions={sessions} />
        )}
      </main>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="glass rounded-2xl p-16 text-center bg-dots">
      <div className="w-14 h-14 rounded-2xl bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto mb-6">
        <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h2 className="text-base font-semibold text-foreground mb-2">No sessions yet</h2>
      <p className="text-sm text-muted mb-8 max-w-xs mx-auto leading-relaxed">
        Create a session to start preparing your team for buyer questions.
      </p>
      <Link href="/dashboard/new" className="btn-primary">
        Create first session
      </Link>
    </div>
  );
}

function SessionGrid({ sessions }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sessions.map((s) => (
        <SessionCard key={s.id} session={s} />
      ))}
    </div>
  );
}

function SessionCard({ session: s }) {
  const meta = STATUS_META[s.status] ?? STATUS_META.setup;
  const progress = getProgress(s.status);

  return (
    <Link href={`/dashboard/sessions/${s.id}`}>
      <div className="glass glass-hover rounded-2xl p-5 h-full flex flex-col gap-4 cursor-pointer">
        {/* Header row */}
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-foreground leading-snug text-sm line-clamp-2">
            {s.company_name}
          </h3>
          <span className={`badge shrink-0 border ${meta.color}`}>
            {meta.label}
          </span>
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-1.5">
          {s.industry && (
            <span className="text-xs text-muted bg-surface-light border border-border/60 px-2 py-0.5 rounded-full">
              {s.industry}
            </span>
          )}
          {s.likely_buyer_type && (
            <span className="text-xs text-muted bg-surface-light border border-border/60 px-2 py-0.5 rounded-full capitalize">
              {s.likely_buyer_type.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {/* Progress bar */}
        <div className="mt-auto space-y-1.5">
          <div className="h-0.5 w-full bg-surface-light rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between">
            <span className="text-xs text-muted/70">{formatDate(s.created_at)}</span>
            <span className="text-xs text-muted/70">{progress}%</span>
          </div>
        </div>
      </div>
    </Link>
  );
}
