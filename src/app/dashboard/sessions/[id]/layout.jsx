'use client';

import Link from 'next/link';
import { useParams, usePathname } from 'next/navigation';

const NAV_ITEMS = [
  {
    key: 'documents',
    label: 'The Vault',
    sublabel: 'Documents',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M3 7a2 2 0 012-2h4l2 2h8a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
      </svg>
    ),
  },
  {
    key: 'analysis',
    label: 'The War Room',
    sublabel: 'Analysis',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    ),
  },
  {
    key: 'qa',
    label: 'The Hot Seat',
    sublabel: 'Live Q&A',
    icon: (
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
          d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
      </svg>
    ),
  },
];

export default function SessionLayout({ children }) {
  const { id } = useParams();
  const pathname = usePathname();

  return (
    <div className="flex min-h-screen bg-background">

      {/* ── Sidebar ── */}
      <aside className="w-64 shrink-0 sticky top-0 h-screen flex flex-col border-r border-slate-200/80 bg-white/80 backdrop-blur-xl overflow-y-auto z-20">

        {/* Brand bar */}
        <div className="h-14 flex items-center px-5 border-b border-slate-200/80 shrink-0 gap-3">
          <div className="relative w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-[0_2px_8px_rgba(59,130,246,0.30)] shrink-0">
            <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/30 to-transparent" />
            <svg className="w-3.5 h-3.5 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            </svg>
          </div>
          <span className="text-sm font-semibold bg-gradient-to-br from-slate-900 to-slate-700 bg-clip-text text-transparent">DealReady</span>
        </div>

        {/* Back to all sessions */}
        <div className="px-3 pt-3 pb-2 shrink-0">
          <Link
            href="/dashboard"
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-colors duration-150"
          >
            <svg className="w-3.5 h-3.5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            All Sessions
          </Link>
        </div>

        {/* Divider */}
        <div className="mx-4 border-t border-slate-200 mb-3 shrink-0" />

        {/* Section label */}
        <p className="px-6 text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 shrink-0">
          Session
        </p>

        {/* Nav items */}
        <nav className="flex-1 px-3 space-y-0.5">
          {NAV_ITEMS.map(({ key, label, sublabel, icon }) => {
            const href = `/dashboard/sessions/${id}/${key}`;
            const isActive = pathname.startsWith(href);
            return (
              <Link
                key={key}
                href={href}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-150 group ${
                  isActive
                    ? 'bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-[0_2px_8px_rgba(59,130,246,0.25)]'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
                }`}
              >
                {/* Icon box */}
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-150 relative ${
                  isActive
                    ? 'bg-white/20 shadow-inner'
                    : 'bg-slate-100 group-hover:bg-slate-200'
                }`}>
                  {isActive && <div className="absolute inset-0 rounded-lg bg-gradient-to-br from-white/30 to-transparent" />}
                  <span className="relative z-10">{icon}</span>
                </div>

                {/* Labels */}
                <div className="flex-1 min-w-0">
                  <p className={`text-xs font-semibold leading-tight truncate ${
                    isActive ? 'text-white' : 'text-slate-700 group-hover:text-slate-900'
                  }`}>
                    {label}
                  </p>
                  <p className={`text-[10px] leading-tight truncate ${isActive ? 'text-white/70' : 'text-slate-400'}`}>
                    {sublabel}
                  </p>
                </div>

                {/* Active dot */}
                {isActive && (
                  <div className="w-2 h-2 rounded-full bg-white shadow-sm shrink-0" />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-slate-200 shrink-0">
          <p className="text-[10px] text-slate-400 text-center">M&amp;A Prep Platform</p>
        </div>
      </aside>

      {/* ── Main content ── */}
      <div className="flex-1 min-w-0">
        {children}
      </div>

    </div>
  );
}
