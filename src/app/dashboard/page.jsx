'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

// ─── Status config ────────────────────────────────────────────────────────────

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

// Placeholder readiness score — derived from best session progress, not real scoring logic
function computeReadinessScore(sessions) {
  if (!sessions.length) return 0;
  const phaseScore = { setup: 8, processing: 12, part1: 25, part2: 40, part3: 60, part4: 75, complete: 88 };
  return sessions.reduce((best, s) => Math.max(best, phaseScore[s.status] || 0), 0);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ─── Circular progress ring ───────────────────────────────────────────────────

function CircularScore({ score }) {
  const radius = 38;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center">
      <svg width="100" height="100" viewBox="0 0 100 100" className="-rotate-90">
        {/* Track */}
        <circle cx="50" cy="50" r={radius} fill="none" stroke="rgba(36,43,61,0.8)" strokeWidth="7" />
        {/* Fill */}
        <circle
          cx="50" cy="50" r={radius} fill="none"
          stroke="#0D9488" strokeWidth="7"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className="transition-all duration-1000"
        />
      </svg>
      {/* Label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center rotate-0">
        <span className="text-xl font-bold text-foreground leading-none">{score}%</span>
        <span className="text-[10px] text-muted uppercase tracking-wider mt-0.5">Ready</span>
      </div>
    </div>
  );
}

// ─── M&A Readiness Score card ─────────────────────────────────────────────────

function ReadinessCard({ score }) {
  const label =
    score === 0 ? 'Create a session to begin your assessment.' :
    score < 30  ? 'Early stage — upload your CIM and run Part 1 analysis.' :
    score < 55  ? 'Making progress — complete the risk map and Q&A prep.' :
    score < 75  ? 'Good foundation — sharpen your answers and run the debrief.' :
                  'Strong preparation — review debrief findings and refine messaging.';

  return (
    <div className="glass glass-hover rounded-2xl p-6 flex flex-col justify-between gap-6 col-span-2">
      <div className="flex items-start justify-between gap-6">
        <div className="flex-1">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
            M&amp;A Readiness Score
          </p>
          <h2 className="text-lg font-bold text-foreground mb-2">
            {score === 0 ? 'Not started' : score < 50 ? 'Building readiness' : score < 75 ? 'Approaching ready' : 'Well prepared'}
          </h2>
          <p className="text-sm text-muted leading-relaxed max-w-xs">{label}</p>
        </div>

        <div className="flex items-center gap-5 shrink-0">
          <CircularScore score={score} />
          {/* Shield icon */}
          <div className="w-14 h-14 rounded-2xl bg-primary/8 border border-primary/15 flex items-center justify-center hidden sm:flex">
            <svg className="w-7 h-7 text-primary/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
          </div>
        </div>
      </div>

      {score > 0 && (
        <button className="self-start flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary-light transition-colors tracking-wide uppercase">
          Improve score
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}
    </div>
  );
}

// ─── Due Diligence Blueprint card ─────────────────────────────────────────────

function BlueprintCard() {
  return (
    <div className="glass glass-hover rounded-2xl p-6 flex flex-col justify-between gap-4 cursor-pointer">
      <div className="space-y-3">
        <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
          <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        </div>
        <div>
          <h3 className="text-sm font-bold text-foreground">Due Diligence Blueprint</h3>
          <p className="text-xs text-muted mt-1 leading-relaxed">
            Access our gold-standard checklist for management presentation exits.
          </p>
        </div>
      </div>
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-primary/70 uppercase tracking-wider">Recommended</span>
        <div className="w-7 h-7 rounded-lg bg-surface-light border border-border flex items-center justify-center">
          <svg className="w-3.5 h-3.5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7v10" />
          </svg>
        </div>
      </div>
    </div>
  );
}

// ─── Session cards ────────────────────────────────────────────────────────────

function SessionCard({ session: s }) {
  const meta = STATUS_META[s.status] ?? STATUS_META.setup;
  const progress = getProgress(s.status);

  return (
    <Link href={`/dashboard/sessions/${s.id}`}>
      <div className="glass glass-hover rounded-2xl p-5 h-full flex flex-col gap-4 cursor-pointer">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-foreground leading-snug text-sm line-clamp-2">
            {s.company_name}
          </h3>
          <span className={`badge shrink-0 border ${meta.color}`}>
            + {meta.label}
          </span>
        </div>

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

        <div className="mt-auto space-y-1.5">
          <div className="h-0.5 w-full bg-surface-light rounded-full overflow-hidden">
            <div
              className="h-full bg-primary rounded-full transition-all duration-700"
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

// ─── Team Bench (floating) ────────────────────────────────────────────────────

function TeamBench({ userEmail }) {
  const initial = userEmail ? userEmail[0].toUpperCase() : '?';
  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-20">
      <div className="glass-strong rounded-full px-4 py-2.5 flex items-center gap-3 border-border shadow-card">
        {/* Label */}
        <div className="flex items-center gap-2 text-xs font-semibold text-muted uppercase tracking-wider">
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          Team Bench
        </div>

        <div className="w-px h-4 bg-border" />

        {/* Avatars */}
        <div className="flex items-center -space-x-2">
          {/* User */}
          <div className="w-7 h-7 rounded-full bg-primary/15 border-2 border-background flex items-center justify-center text-[11px] font-bold text-primary z-10">
            {initial}
          </div>
          {/* Placeholder slots */}
          {[0, 1].map(i => (
            <div
              key={i}
              className="w-7 h-7 rounded-full bg-surface-light border-2 border-background flex items-center justify-center text-[11px] text-muted"
            >
              ?
            </div>
          ))}
          {/* Add button */}
          <button className="w-7 h-7 rounded-full bg-surface-hover border-2 border-border flex items-center justify-center text-muted hover:text-primary hover:border-primary/40 transition-colors">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

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

// ─── Main page ────────────────────────────────────────────────────────────────

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

  const readinessScore = computeReadinessScore(sessions);

  return (
    <div className="min-h-screen pb-24">
      {/* Nav */}
      <header className="border-b border-border/60 bg-surface/40 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <span className="font-semibold text-foreground tracking-tight text-sm">DealReady</span>
          <div className="flex items-center gap-3">
            {/* Deal Team pill */}
            <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full border border-border bg-surface text-xs font-medium text-muted">
              <div className="w-5 h-5 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-[10px] font-bold text-primary">
                {user?.email?.[0]?.toUpperCase() ?? '?'}
              </div>
              Deal Team
            </div>

            {/* User + logout */}
            <div className="flex items-center gap-2 pl-1">
              <div className="w-7 h-7 rounded-full bg-primary/15 border border-primary/25 flex items-center justify-center text-xs font-bold text-primary">
                {user?.email?.[0]?.toUpperCase() ?? '?'}
              </div>
              <span className="text-xs text-muted hidden md:block max-w-[160px] truncate">{user?.email}</span>
              <button
                onClick={handleLogout}
                className="text-muted hover:text-foreground transition-colors p-1"
                title="Sign out"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10 animate-fade-in">

        {/* Page header */}
        <div className="flex items-end justify-between mb-7 gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Your sessions</p>
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

        {/* Feature row — Readiness + Blueprint */}
        <div className="grid grid-cols-3 gap-4 mb-5">
          <ReadinessCard score={readinessScore} />
          <BlueprintCard />
        </div>

        {/* Session grid */}
        {sessions.length === 0 ? (
          <EmptyState />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {sessions.map((s) => (
              <SessionCard key={s.id} session={s} />
            ))}
          </div>
        )}
      </main>

      {/* Floating Team Bench */}
      <TeamBench userEmail={user?.email} />
    </div>
  );
}
