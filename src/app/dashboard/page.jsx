'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

// ─── Status config ────────────────────────────────────────────────────────────

const STATUS_META = {
  setup:      { label: 'Setup',      glow: 'bg-slate-400',   glowShadow: '',                                             text: 'text-slate-400' },
  processing: { label: 'Processing', glow: 'bg-amber-400',   glowShadow: 'shadow-[0_0_8px_rgba(251,191,36,0.70)]',      text: 'text-amber-600' },
  part1:      { label: 'Analyzing',  glow: 'bg-blue-400',    glowShadow: 'shadow-[0_0_8px_rgba(96,165,250,0.70)]',      text: 'text-blue-600' },
  part2:      { label: 'Analyzing',  glow: 'bg-blue-400',    glowShadow: 'shadow-[0_0_8px_rgba(96,165,250,0.70)]',      text: 'text-blue-600' },
  part3:      { label: 'Q&A Live',   glow: 'bg-cyan-400',    glowShadow: 'shadow-[0_0_8px_rgba(34,211,238,0.70)]',      text: 'text-cyan-600' },
  part4:      { label: 'Debriefing', glow: 'bg-violet-400',  glowShadow: 'shadow-[0_0_8px_rgba(167,139,250,0.70)]',     text: 'text-violet-600' },
  complete:   { label: 'Complete',   glow: 'bg-emerald-400', glowShadow: 'shadow-[0_0_8px_rgba(52,211,153,0.70)]',      text: 'text-emerald-600' },
};

const PHASE_STEPS = ['setup', 'part1', 'part2', 'part3', 'part4', 'complete'];

function getProgress(status) {
  const idx = PHASE_STEPS.indexOf(status);
  return idx < 0 ? 0 : Math.round((idx / (PHASE_STEPS.length - 1)) * 100);
}

function sessionHref(id, status) {
  if (status === 'part1' || status === 'part2') return `/dashboard/sessions/${id}/analysis`;
  if (status === 'part3') return `/dashboard/sessions/${id}/qa`;
  if (status === 'part4' || status === 'complete') return `/dashboard/sessions/${id}/analysis`;
  return `/dashboard/sessions/${id}/documents`;
}

function computeReadiness(sessions) {
  if (!sessions.length) return 0;
  const map = { setup: 8, processing: 12, part1: 25, part2: 40, part3: 60, part4: 75, complete: 88 };
  return sessions.reduce((best, s) => Math.max(best, map[s.status] || 0), 0);
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Thin icons (strokeWidth 1.2) ─────────────────────────────────────────────

function IcGrid({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}

function IcPlus({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}

function IcShield({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}

function IcMic({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0014 0M12 19v3M9 22h6" />
    </svg>
  );
}

function IcLogout({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}

function IcChevron({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}

function IcBookOpen({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  );
}

// ─── Readiness ring ───────────────────────────────────────────────────────────

function ReadinessRing({ score }) {
  const r = 52;
  const circ = 2 * Math.PI * r;
  const offset = circ - (score / 100) * circ;
  return (
    <svg width="130" height="130" viewBox="0 0 130 130" style={{ transform: 'rotate(-90deg)' }}>
      <circle cx="65" cy="65" r={r} fill="none" stroke="rgba(226,232,240,0.8)" strokeWidth="6" />
      <circle
        cx="65" cy="65" r={r} fill="none"
        stroke="url(#ringGrad)" strokeWidth="6"
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 1.2s cubic-bezier(0.4,0,0.2,1)' }}
      />
      <defs>
        <linearGradient id="ringGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#818cf8" />
          <stop offset="100%" stopColor="#22d3ee" />
        </linearGradient>
      </defs>
    </svg>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ userEmail, onLogout }) {
  const initial = userEmail?.[0]?.toUpperCase() ?? '?';
  const navItems = [
    { label: 'Dashboard',     icon: <IcGrid />,     href: '/dashboard',     active: true },
    { label: 'New Session',   icon: <IcPlus />,     href: '/dashboard/new', active: false },
    { label: 'Blueprint',     icon: <IcBookOpen />, href: '#',              active: false },
    { label: 'Voice Practice',icon: <IcMic />,      href: '#',              active: false },
  ];

  return (
    <aside
      className="w-[220px] shrink-0 flex flex-col h-screen sticky top-0"
      style={{ borderRight: '1px solid rgba(226,232,240,0.8)' }}
    >
      {/* Logo */}
      <div className="px-5 pt-7 pb-8">
        <span className="text-[15px] font-bold tracking-tight text-slate-900">Deal<span className="text-blue-500">Ready</span></span>
      </div>

      {/* Nav */}
      <nav className="px-3 flex-1 space-y-0.5">
        <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase px-3 mb-3">
          Navigation
        </p>
        {navItems.map(item => (
          <Link key={item.label} href={item.href}>
            <div className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 cursor-pointer ${
              item.active
                ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_2px_8px_rgba(59,130,246,0.30)]'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}>
              <span className="shrink-0">{item.icon}</span>
              <span className="text-[13px] font-medium">{item.label}</span>
            </div>
          </Link>
        ))}
      </nav>

      {/* User footer */}
      <div className="p-4" style={{ borderTop: '1px solid rgba(226,232,240,0.8)' }}>
        <div className="flex items-center gap-3 px-2 py-2">
          <div className="w-7 h-7 rounded-full bg-slate-100/70 border border-slate-200 flex items-center justify-center text-[11px] font-bold text-slate-600 shrink-0">
            {initial}
          </div>
          <span className="text-[12px] text-slate-400 truncate flex-1">{userEmail}</span>
          <button
            onClick={onLogout}
            className="text-slate-300 hover:text-slate-600 transition-colors shrink-0"
            title="Sign out"
          >
            <IcLogout />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ─── Session card ─────────────────────────────────────────────────────────────

function SessionCard({ session: s, onDelete }) {
  const router = useRouter();
  const meta = STATUS_META[s.status] ?? STATUS_META.setup;
  const progress = getProgress(s.status);
  const href = sessionHref(s.id, s.status);
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete(e) {
    e.stopPropagation();
    e.preventDefault();
    if (!confirming) { setConfirming(true); return; }
    setDeleting(true);
    try {
      const res = await fetch(`/api/sessions/${s.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        console.error('Delete failed:', res.status, data);
        toast.error(data.error || 'Delete failed');
        setDeleting(false);
        setConfirming(false);
        return;
      }
      onDelete(s.id);
      toast.success('Session deleted');
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Delete failed');
      setDeleting(false);
      setConfirming(false);
    }
  }

  return (
    <div
      onClick={() => router.push(href)}
      className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6 hover:bg-slate-50 transition-colors duration-300 relative overflow-hidden group cursor-pointer h-full flex flex-col"
    >
      {/* Subtle inner highlight on hover */}
      <div className="absolute inset-0 rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-300"
        style={{ background: 'radial-gradient(ellipse at 50% 0%, rgba(255,255,255,0.5) 0%, transparent 70%)' }} />

      {/* Top row: company name + status + delete */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <h3 className="text-[15px] font-semibold text-slate-800 tracking-tight leading-snug line-clamp-2 flex-1">
          {s.company_name}
        </h3>
        <div className="flex items-center gap-2 shrink-0 mt-0.5">
          <div className="flex items-center gap-1.5">
            <div className={`w-2 h-2 rounded-full shrink-0 ${meta.glow} ${meta.glowShadow}`} />
            <span className={`text-[10px] font-semibold uppercase tracking-widest ${meta.text}`}>
              {meta.label}
            </span>
          </div>
          {/* Delete button */}
          {confirming ? (
            <div className="flex items-center gap-1 ml-1" onClick={e => e.stopPropagation()}>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-[10px] font-semibold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full hover:bg-red-100 transition-colors"
              >
                {deleting ? '…' : 'Confirm'}
              </button>
              <button
                onClick={e => { e.stopPropagation(); setConfirming(false); }}
                className="text-[10px] text-slate-400 hover:text-slate-600 transition-colors px-1"
              >
                Cancel
              </button>
            </div>
          ) : (
            <button
              onClick={handleDelete}
              className="opacity-0 group-hover:opacity-100 transition-opacity text-slate-300 hover:text-red-500 ml-1 p-0.5 rounded"
              title="Delete session"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Tags */}
      <div className="flex flex-wrap gap-1.5 mb-5">
        {s.industry && (
          <span className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-0.5 font-medium">
            {s.industry}
          </span>
        )}
        {s.likely_buyer_type && (
          <span className="text-[10px] text-slate-500 bg-slate-50 border border-slate-200 rounded-full px-2.5 py-0.5 font-medium capitalize">
            {s.likely_buyer_type.replace(/_/g, ' ')}
          </span>
        )}
      </div>

      {/* Divider */}
      <div className="border-t border-slate-200 pt-4 mt-auto">
        {/* Progress */}
        <div className="mb-3.5">
          <div className="h-[1.5px] bg-slate-200 rounded-full overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${progress}%`,
                background: 'linear-gradient(90deg, #818cf8 0%, #22d3ee 100%)',
              }}
            />
          </div>
        </div>

        {/* Date + CTA */}
        <div className="flex items-center justify-between">
          <span className="text-[11px] text-slate-400">{formatDate(s.created_at)}</span>
          <span className="text-[11px] font-semibold text-slate-400 group-hover:text-slate-700 transition-colors flex items-center gap-1">
            {s.status === 'complete' ? 'View report' : 'Continue'} <IcChevron />
          </span>
        </div>
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState() {
  return (
    <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-16 text-center col-span-3 ">
      <div className="w-12 h-12 rounded-2xl bg-slate-50 border border-slate-200 flex items-center justify-center mx-auto mb-5 text-slate-400">
        <IcShield size={20} />
      </div>
      <h2 className="text-[15px] font-semibold text-slate-700 tracking-tight mb-2">No sessions yet</h2>
      <p className="text-[13px] text-slate-400 max-w-[260px] mx-auto leading-relaxed mb-8">
        Create your first session to start preparing for buyer management presentations.
      </p>
      <Link href="/dashboard/new">
        <button className="btn-primary inline-flex items-center gap-2">
          <IcPlus /> New Session
        </button>
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
      const sessRes = await fetch('/api/sessions');
      if (sessRes.ok) {
        const { sessions: list } = await sessRes.json();
        setSessions(list ?? []);
      }
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

  function handleDeleteSession(id) {
    setSessions(prev => prev.filter(s => s.id !== id));
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center"
        style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 55%, #F8FAFC 100%)' }}>
        <div className="w-5 h-5 rounded-full border border-blue-300/50 border-t-blue-500 animate-spin" />
      </div>
    );
  }

  const readiness = computeReadiness(sessions);
  const complete = sessions.filter(s => s.status === 'complete').length;
  const inProgress = sessions.filter(s => !['setup', 'complete'].includes(s.status)).length;

  return (
    <div
      className="flex h-screen overflow-hidden"
      style={{
        fontFamily: 'Inter, system-ui, sans-serif',
        background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 55%, #F8FAFC 100%)',
      }}
    >
      {/* ── Ambient background glows (blue tones) ───────────────────────────── */}
      <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
        <div style={{
          position: 'absolute', top: '-10%', left: '20%',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(59,130,246,0.10) 0%, transparent 65%)',
          filter: 'blur(50px)',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', right: '5%',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(99,102,241,0.08) 0%, transparent 65%)',
          filter: 'blur(50px)',
        }} />
        <div style={{
          position: 'absolute', top: '45%', left: '5%',
          width: '350px', height: '350px',
          background: 'radial-gradient(circle, rgba(6,182,212,0.07) 0%, transparent 65%)',
          filter: 'blur(40px)',
        }} />
      </div>

      {/* ── Sidebar ─────────────────────────────────────────────────────────── */}
      <div className="relative z-10">
        <Sidebar userEmail={user?.email} onLogout={handleLogout} />
      </div>

      {/* ── Main content ────────────────────────────────────────────────────── */}
      <main className="flex-1 overflow-y-auto relative z-10 min-w-0">
        <div className="max-w-5xl mx-auto px-8 py-10">

          {/* Header */}
          <div className="flex items-end justify-between mb-10">
            <div>
              <p className="text-[11px] font-semibold tracking-widest text-slate-400 uppercase mb-2">
                Good morning
              </p>
              <h1 className="text-4xl font-semibold tracking-tight text-slate-800">
                Welcome back, M&amp;A Team
              </h1>
            </div>
            <Link href="/dashboard/new">
              <button className="btn-primary flex items-center gap-2 shrink-0">
                <IcPlus /> New Session
              </button>
            </Link>
          </div>

          {/* Stats row */}
          <div className="grid grid-cols-3 gap-4 mb-8">

            {/* Readiness score card */}
            <div className="col-span-2 bg-white border border-slate-200/80 shadow-sm rounded-3xl p-7  relative overflow-hidden">
              <div className="absolute inset-0 rounded-3xl"
                style={{ background: 'radial-gradient(ellipse at 80% 20%, rgba(245,158,11,0.07) 0%, transparent 60%)' }} />
              <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase mb-5">
                M&amp;A Readiness Score
              </p>
              <div className="flex items-center gap-7">
                {/* Ring */}
                <div className="relative shrink-0">
                  <ReadinessRing score={readiness} />
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-3xl font-semibold tracking-tight text-slate-800 leading-none">{readiness}%</span>
                    <span className="text-[9px] tracking-widest text-slate-400 uppercase mt-1">Ready</span>
                  </div>
                </div>
                {/* Text */}
                <div>
                  <h2 className="text-xl font-semibold tracking-tight text-slate-700 mb-2">
                    {readiness === 0 ? 'Not started'
                      : readiness < 50 ? 'Building readiness'
                      : readiness < 75 ? 'Approaching ready'
                      : 'Well prepared'}
                  </h2>
                  <p className="text-[13px] text-slate-400 leading-relaxed max-w-xs">
                    {readiness === 0
                      ? 'Create a session to begin your M&A preparation.'
                      : readiness < 40
                        ? 'Upload your CIM and run analysis to map buyer risks.'
                        : readiness < 70
                          ? 'Complete Q&A practice rounds and generate your debrief.'
                          : 'Review debrief findings and refine your messaging.'}
                  </p>
                  <div className="flex items-center gap-4 mt-5">
                    <div className="text-center">
                      <p className="text-2xl font-semibold tracking-tight text-slate-700">{sessions.length}</p>
                      <p className="text-[10px] tracking-widest text-slate-400 uppercase">Sessions</p>
                    </div>
                    <div className="w-px h-8 bg-slate-100/70" />
                    <div className="text-center">
                      <p className="text-2xl font-semibold tracking-tight text-emerald-500">{complete}</p>
                      <p className="text-[10px] tracking-widest text-slate-400 uppercase">Complete</p>
                    </div>
                    <div className="w-px h-8 bg-slate-100/70" />
                    <div className="text-center">
                      <p className="text-2xl font-semibold tracking-tight text-indigo-500">{inProgress}</p>
                      <p className="text-[10px] tracking-widest text-slate-400 uppercase">Active</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Blueprint card */}
            <div className="bg-white border border-slate-200/80 shadow-sm rounded-3xl p-6  flex flex-col justify-between relative overflow-hidden">
              <div className="absolute inset-0 rounded-3xl"
                style={{ background: 'radial-gradient(ellipse at 20% 80%, rgba(167,139,250,0.08) 0%, transparent 60%)' }} />
              <div>
                <div className="w-9 h-9 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 mb-4">
                  <IcBookOpen />
                </div>
                <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase mb-2">Resource</p>
                <h3 className="text-[15px] font-semibold text-slate-700 tracking-tight mb-2">
                  Due Diligence Blueprint
                </h3>
                <p className="text-[12px] text-slate-400 leading-relaxed">
                  Gold-standard checklist for management presentation exits.
                </p>
              </div>
              <div className="border-t border-slate-200 pt-4 flex items-center justify-between">
                <span className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">Recommended</span>
                <button className="text-[11px] font-semibold text-slate-400 hover:text-slate-700 transition-colors flex items-center gap-1">
                  Open <IcChevron />
                </button>
              </div>
            </div>
          </div>

          {/* Sessions */}
          <div>
            <div className="flex items-center justify-between mb-5">
              <p className="text-[10px] font-semibold tracking-widest text-slate-400 uppercase">
                Sessions
              </p>
              {sessions.length > 0 && (
                <span className="text-[11px] text-slate-400">{sessions.length} total</span>
              )}
            </div>

            {sessions.length === 0 ? (
              <div className="grid grid-cols-3 gap-4"><EmptyState /></div>
            ) : (
              <div className="grid grid-cols-3 gap-4">
                {sessions.map(s => (
                  <SessionCard key={s.id} session={s} onDelete={handleDeleteSession} />
                ))}
              </div>
            )}
          </div>

        </div>
      </main>
    </div>
  );
}
