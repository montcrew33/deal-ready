'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

const STATUS_LABELS = {
  setup: 'Setup',
  processing: 'Processing',
  part1: 'Analysis',
  part2: 'Analysis',
  part3: 'Q&A',
  part4: 'Debrief',
  complete: 'Complete',
};

const STATUS_COLORS = {
  setup: 'text-muted bg-muted/10',
  processing: 'text-gold bg-gold/10',
  part1: 'text-primary bg-primary/10',
  part2: 'text-primary bg-primary/10',
  part3: 'text-primary bg-primary/10',
  part4: 'text-primary bg-primary/10',
  complete: 'text-success bg-success/10',
};

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  // Verify auth and load sessions
  const load = useCallback(async () => {
    try {
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.replace('/login');
        return;
      }
      const { user: me } = await meRes.json();
      setUser(me);

      const sessionsRes = await fetch('/api/sessions');
      if (!sessionsRes.ok) {
        toast.error('Failed to load sessions');
        return;
      }
      const { sessions: list } = await sessionsRes.json();
      setSessions(list ?? []);
    } catch {
      toast.error('Failed to connect. Please refresh.');
    } finally {
      setLoading(false);
    }
  }, [router]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleLogout() {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Top nav */}
      <header className="border-b border-border">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-foreground tracking-tight">DealReady</span>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted hidden sm:block">{user?.email}</span>
            <button
              onClick={handleLogout}
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              Sign out
            </button>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Your Sessions</h1>
            <p className="text-sm text-muted mt-1">
              Each session prepares you for a specific deal process.
            </p>
          </div>
          <Link
            href="/dashboard/new"
            className="px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            + Create Session
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
    <div className="glass rounded-xl p-16 text-center">
      <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-5">
        <svg className="w-7 h-7 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold text-foreground mb-2">No sessions yet</h2>
      <p className="text-sm text-muted mb-8 max-w-sm mx-auto leading-relaxed">
        Create your first session to start preparing for your management presentation.
      </p>
      <Link
        href="/dashboard/new"
        className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
      >
        Create Session
      </Link>
    </div>
  );
}

function SessionGrid({ sessions }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {sessions.map((s) => (
        <Link key={s.id} href={`/dashboard/sessions/${s.id}`}>
          <div className="glass rounded-xl p-6 hover:border-primary/40 transition-colors cursor-pointer h-full flex flex-col justify-between gap-4">
            <div>
              <div className="flex items-start justify-between gap-2 mb-2">
                <h3 className="font-semibold text-foreground leading-tight">{s.company_name}</h3>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full shrink-0 ${STATUS_COLORS[s.status] ?? STATUS_COLORS.setup}`}>
                  {STATUS_LABELS[s.status] ?? s.status}
                </span>
              </div>
            </div>
            <p className="text-xs text-muted">{formatDate(s.created_at)}</p>
          </div>
        </Link>
      ))}
    </div>
  );
}
