'use client';

// ─── MOCK DESIGN — local preview only, do not commit ─────────────────────────
// Mirrors the Figma reference aesthetic:
//   • Light slate-50/blue-50 gradient background
//   • White glass sidebar (backdrop-blur-xl)
//   • Blue gradient primary (from-blue-500 to-blue-600)
//   • White cards, rounded-2xl, shadow-sm → shadow-xl on hover
//   • Gradient clip text on headings
//   • Colored status badges with borders

import { useState } from 'react';

// ─── Icons ────────────────────────────────────────────────────────────────────

function IcShield({ size = 18 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
    </svg>
  );
}
function IcGrid({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1.5" /><rect x="14" y="3" width="7" height="7" rx="1.5" />
      <rect x="3" y="14" width="7" height="7" rx="1.5" /><rect x="14" y="14" width="7" height="7" rx="1.5" />
    </svg>
  );
}
function IcPlus({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round">
      <path d="M12 5v14M5 12h14" />
    </svg>
  );
}
function IcBook({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z" /><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z" />
    </svg>
  );
}
function IcMic({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="2" width="6" height="12" rx="3" />
      <path d="M5 10a7 7 0 0014 0M12 19v3M9 22h6" />
    </svg>
  );
}
function IcActivity({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
    </svg>
  );
}
function IcTarget({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}
function IcTrend({ size = 16 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" /><polyline points="17 6 23 6 23 12" />
    </svg>
  );
}
function IcChevron({ size = 13 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 18l6-6-6-6" />
    </svg>
  );
}
function IcLogout({ size = 15 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
    </svg>
  );
}
function IcClock({ size = 14 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

// ─── Mock data ────────────────────────────────────────────────────────────────

const MOCK_SESSIONS = [
  {
    id: '1', company_name: 'Meridian Software Co.', industry: 'SaaS', likely_buyer_type: 'pe_firm',
    status: 'part3', created_at: '2026-04-18T10:00:00Z', progress: 60,
  },
  {
    id: '2', company_name: 'BluePeak Capital Services', industry: 'Financial Services', likely_buyer_type: 'strategic',
    status: 'complete', created_at: '2026-04-12T09:00:00Z', progress: 100,
  },
  {
    id: '3', company_name: 'Thornfield Industrial', industry: 'Manufacturing', likely_buyer_type: 'pe_firm',
    status: 'part2', created_at: '2026-04-20T14:00:00Z', progress: 40,
  },
  {
    id: '4', company_name: 'Crestline Health Partners', industry: 'Healthcare', likely_buyer_type: 'strategic',
    status: 'setup', created_at: '2026-04-22T08:00:00Z', progress: 8,
  },
];

const STATUS_META = {
  setup:      { label: 'Setup',      dot: 'bg-slate-300',   badge: 'bg-slate-50 text-slate-600 border-slate-200' },
  processing: { label: 'Processing', dot: 'bg-amber-400',   badge: 'bg-amber-50 text-amber-700 border-amber-200' },
  part1:      { label: 'Analyzing',  dot: 'bg-blue-400',    badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  part2:      { label: 'Analyzing',  dot: 'bg-blue-400',    badge: 'bg-blue-50 text-blue-700 border-blue-200' },
  part3:      { label: 'Q&A Live',   dot: 'bg-cyan-400',    badge: 'bg-cyan-50 text-cyan-700 border-cyan-200' },
  part4:      { label: 'Debriefing', dot: 'bg-violet-400',  badge: 'bg-violet-50 text-violet-700 border-violet-200' },
  complete:   { label: 'Complete',   dot: 'bg-emerald-400', badge: 'bg-green-50 text-green-700 border-green-200' },
};

const STATS = [
  { label: 'Total Sessions',  value: '4',   status: 'All Time',    statusStyle: 'bg-blue-50 text-blue-700 border-blue-200',       icon: IcActivity },
  { label: 'Completed',       value: '1',   status: 'Debriefed',   statusStyle: 'bg-green-50 text-green-700 border-green-200',    icon: IcShield },
  { label: 'Active Sessions', value: '2',   status: 'In Progress', statusStyle: 'bg-cyan-50 text-cyan-700 border-cyan-200',       icon: IcTarget },
  { label: 'Readiness Score', value: '60%', status: 'Approaching', statusStyle: 'bg-purple-50 text-purple-700 border-purple-200', icon: IcTrend },
];

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ activeNav, setActiveNav }) {
  const navItems = [
    { id: 'dashboard',   label: 'Dashboard',     icon: <IcGrid /> },
    { id: 'new',         label: 'New Session',   icon: <IcPlus /> },
    { id: 'blueprint',   label: 'Blueprint',     icon: <IcBook /> },
    { id: 'voice',       label: 'Voice Practice',icon: <IcMic /> },
  ];

  return (
    <aside className="w-64 shrink-0 flex flex-col h-screen sticky top-0 bg-white/80 backdrop-blur-xl border-r border-slate-200/60">

      {/* Logo */}
      <div className="p-6 border-b border-slate-200/60">
        <div className="flex items-center gap-3">
          <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/25">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/40 to-transparent" />
            <span className="text-white relative z-10"><IcShield size={17} /></span>
          </div>
          <span className="text-lg font-semibold bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-transparent">
            DealReady
          </span>
        </div>
      </div>

      {/* Nav */}
      <div className="flex-1 p-4">
        <p className="text-xs text-slate-400 tracking-wide mb-3 px-2">NAVIGATION</p>
        <div className="space-y-1.5">
          {navItems.map(item => {
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id)}
                className={`group w-full px-3 py-2.5 rounded-xl flex items-center gap-3 text-sm transition-all duration-200 ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/25'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <div className={`relative w-7 h-7 rounded-lg flex items-center justify-center transition-all ${
                  isActive
                    ? 'bg-white/20 shadow-inner'
                    : 'bg-slate-100 group-hover:bg-slate-200'
                }`}>
                  {isActive && <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/30 to-transparent" />}
                  <span className="relative z-10">{item.icon}</span>
                </div>
                <span className="flex-1 text-left font-medium">{item.label}</span>
                {isActive && <div className="w-2 h-2 rounded-full bg-white shadow-sm" />}
              </button>
            );
          })}
        </div>
      </div>

      {/* Active session widget */}
      <div className="px-4 pb-3">
        <div className="relative px-3 py-3 rounded-xl border overflow-hidden bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200/60 shadow-sm">
          <div className="absolute inset-0 bg-gradient-to-br from-white/60 to-transparent" />
          <div className="relative z-10">
            <div className="flex items-center gap-2 text-xs text-blue-600 mb-1 font-semibold">
              <IcClock size={13} />
              <span>Active Session</span>
            </div>
            <div className="text-sm font-semibold text-slate-800">Meridian Software Co.</div>
            <div className="text-xs text-slate-500 mt-0.5">Q&A Live — Round 2</div>
          </div>
        </div>
      </div>

      {/* User footer */}
      <div className="p-4 border-t border-slate-200/60">
        <div className="flex items-center gap-3 px-2 py-1.5">
          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-[11px] font-bold text-white shrink-0 shadow-sm">
            J
          </div>
          <span className="text-[12px] text-slate-400 truncate flex-1">j.doran@firm.com</span>
          <button className="text-slate-300 hover:text-slate-600 transition-colors shrink-0" title="Sign out">
            <IcLogout />
          </button>
        </div>
      </div>
    </aside>
  );
}

// ─── Stat card ────────────────────────────────────────────────────────────────

function StatCard({ stat }) {
  const Icon = stat.icon;
  return (
    <div className="group relative rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 transition-all duration-300 overflow-hidden">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50/50 to-white opacity-0 group-hover:opacity-100 transition-opacity" />
      <div className="relative z-10">
        <div className="mb-4">
          <div className="relative w-10 h-10 rounded-xl bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
            <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/60 to-transparent" />
            <span className="relative z-10 text-slate-700"><Icon /></span>
          </div>
        </div>
        <div className="text-3xl font-semibold bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-transparent mb-1.5">
          {stat.value}
        </div>
        <div className="text-sm text-slate-500 mb-3">{stat.label}</div>
        <div className={`inline-flex items-center px-2.5 py-1 rounded-lg text-xs border shadow-sm ${stat.statusStyle}`}>
          {stat.status}
        </div>
      </div>
    </div>
  );
}

// ─── Session card ─────────────────────────────────────────────────────────────

function SessionCard({ session: s }) {
  const meta = STATUS_META[s.status] ?? STATUS_META.setup;

  return (
    <div className="group relative rounded-2xl border border-slate-200/60 bg-white p-6 shadow-sm hover:shadow-xl hover:shadow-slate-200/60 transition-all duration-300 overflow-hidden cursor-pointer flex flex-col h-full">
      <div className="absolute inset-0 bg-gradient-to-br from-white via-slate-50/40 to-white opacity-0 group-hover:opacity-100 transition-opacity" />

      <div className="relative z-10 flex flex-col h-full">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="text-[15px] font-semibold text-slate-800 tracking-tight leading-snug line-clamp-2 flex-1">
            {s.company_name}
          </h3>
          <span className={`shrink-0 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs border shadow-sm whitespace-nowrap ${meta.badge}`}>
            <span className={`w-1.5 h-1.5 rounded-full ${meta.dot}`} />
            {meta.label}
          </span>
        </div>

        {/* Tags */}
        <div className="flex flex-wrap gap-1.5 mb-5">
          {s.industry && (
            <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-0.5 font-medium">
              {s.industry}
            </span>
          )}
          {s.likely_buyer_type && (
            <span className="text-[11px] text-slate-500 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-0.5 font-medium capitalize">
              {s.likely_buyer_type.replace(/_/g, ' ')}
            </span>
          )}
        </div>

        {/* Progress */}
        <div className="mt-auto">
          <div className="flex items-center justify-between mb-2">
            <span className="text-[11px] text-slate-400">Progress</span>
            <span className="text-[11px] font-semibold text-slate-500">{s.progress}%</span>
          </div>
          <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-4">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{
                width: `${s.progress}%`,
                background: s.progress === 100
                  ? 'linear-gradient(90deg, #10b981 0%, #34d399 100%)'
                  : 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 100%)',
              }}
            />
          </div>

          {/* Footer */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            <span className="text-[11px] text-slate-400">{formatDate(s.created_at)}</span>
            <button className="text-[12px] font-semibold text-blue-600 hover:text-blue-700 transition-colors flex items-center gap-1">
              {s.status === 'complete' ? 'View report' : 'Continue'} <IcChevron />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function DashboardV2() {
  const [activeNav, setActiveNav] = useState('dashboard');

  return (
    <div className="flex h-screen overflow-hidden bg-gradient-to-br from-slate-50 via-blue-50/30 to-slate-50">

      <Sidebar activeNav={activeNav} setActiveNav={setActiveNav} />

      <main className="flex-1 overflow-y-auto">
        <div className="max-w-5xl mx-auto px-8 py-10">

          {/* Breadcrumb */}
          <div className="flex items-center gap-2 text-sm text-slate-500 mb-8">
            <span className="flex items-center gap-1.5 cursor-pointer hover:text-slate-800 transition-colors">
              <IcShield size={14} /> DealReady
            </span>
            <IcChevron size={12} />
            <span className="text-slate-800 font-medium">Dashboard</span>
          </div>

          {/* Header */}
          <div className="flex items-end justify-between mb-8">
            <div>
              <div className="relative inline-flex items-center px-3 py-1.5 rounded-lg bg-gradient-to-r from-blue-500 to-blue-600 text-white text-xs shadow-lg shadow-blue-500/25 mb-4 overflow-hidden">
                <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/20 to-transparent" />
                <span className="relative z-10 font-semibold tracking-wide">DEAL PREP PLATFORM</span>
              </div>
              <h1 className="text-4xl font-semibold bg-gradient-to-br from-slate-900 via-slate-800 to-slate-700 bg-clip-text text-transparent mb-2">
                Welcome back
              </h1>
              <p className="text-sm text-slate-500">
                Track your M&amp;A readiness across all active sessions.
              </p>
            </div>
            <button className="relative flex items-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 text-white text-[13px] font-semibold px-6 py-2.5 rounded-xl hover:scale-105 transition-transform duration-300 shadow-lg shadow-blue-500/25 shrink-0 overflow-hidden">
              <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-white/20 to-transparent" />
              <span className="relative z-10 flex items-center gap-2"><IcPlus /> New Session</span>
            </button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-4 gap-4 mb-8">
            {STATS.map(s => <StatCard key={s.label} stat={s} />)}
          </div>

          {/* Sessions header */}
          <div className="flex items-center justify-between mb-5">
            <div className="flex items-center gap-3">
              <p className="text-sm font-semibold text-slate-700">Sessions</p>
              <span className="text-xs text-slate-500 bg-white border border-slate-200 px-2.5 py-0.5 rounded-full shadow-sm">
                {MOCK_SESSIONS.length} total
              </span>
            </div>
            <div className="flex items-center gap-2">
              <button className="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm">
                All statuses
              </button>
              <button className="text-xs text-slate-500 bg-white border border-slate-200 px-3 py-1.5 rounded-lg hover:border-blue-300 hover:text-blue-600 transition-colors shadow-sm">
                Recent ↓
              </button>
            </div>
          </div>

          {/* Session grid */}
          <div className="grid grid-cols-3 gap-4">
            {MOCK_SESSIONS.map(s => <SessionCard key={s.id} session={s} />)}
          </div>

        </div>
      </main>
    </div>
  );
}
