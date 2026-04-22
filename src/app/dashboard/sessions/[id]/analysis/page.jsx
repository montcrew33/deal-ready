'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { parseAnalysis } from '@/lib/analysisParser';

// ─── Severity config ──────────────────────────────────────────────────────────

function sev(level) {
  switch (level) {
    case 'critical': return { label: 'Critical', dot: 'bg-red-500',    border: 'border-l-red-500',    badge: 'bg-red-50 text-red-700 border-red-200',    icon: '⊘' };
    case 'high':     return { label: 'High',     dot: 'bg-amber-500',  border: 'border-l-amber-500',  badge: 'bg-amber-50 text-amber-700 border-amber-200', icon: '⊘' };
    case 'medium':   return { label: 'Medium',   dot: 'bg-yellow-500', border: 'border-l-yellow-500', badge: 'bg-yellow-50 text-yellow-700 border-yellow-200', icon: '⊘' };
    default:         return { label: 'Low',      dot: 'bg-slate-400',  border: 'border-l-slate-400',  badge: 'bg-slate-100 text-slate-600 border-slate-200',  icon: '⊘' };
  }
}

// ─── Markdown-safe inline renderer ───────────────────────────────────────────

function InlineText({ text }) {
  if (!text) return null;
  return <span>{text.replace(/\*\*(.+?)\*\*/g, '$1')}</span>;
}

function RenderLines({ text }) {
  if (!text) return null;
  return (
    <div className="space-y-1.5">
      {text.split('\n').map((line, i) => {
        const s = line.trim();
        if (!s) return <div key={i} className="h-1" />;
        if (/^#{1,3}\s/.test(line)) return <p key={i} className="text-foreground font-semibold text-sm mt-4 mb-1 section-accent">{s.replace(/^#+\s/, '')}</p>;
        if (/^\*\*(.+)\*\*$/.test(s)) return <p key={i} className="text-foreground font-semibold text-sm mt-3">{s.replace(/\*\*/g, '')}</p>;
        if (/^[-•*]\s/.test(s)) return (
          <div key={i} className="flex gap-2 items-start">
            <span className="w-1.5 h-1.5 rounded-full bg-primary/60 shrink-0 mt-1.5" />
            <span className="text-foreground/80 text-sm leading-relaxed">{s.replace(/^[-•*]\s/, '').replace(/\*\*(.+?)\*\*/g, '$1')}</span>
          </div>
        );
        return <p key={i} className="text-foreground/80 text-sm leading-relaxed">{s.replace(/\*\*(.+?)\*\*/g, '$1')}</p>;
      })}
    </div>
  );
}

// ─── Raw fallback ─────────────────────────────────────────────────────────────

function RawFallback({ text, label }) {
  if (!text) return (
    <div className="py-12 text-center">
      <p className="text-sm text-muted">No data available — run analysis first.</p>
    </div>
  );
  return (
    <div className="glass rounded-xl p-5">
      {label && <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-3">{label}</p>}
      <RenderLines text={text} />
    </div>
  );
}

// ─── Stat cards row ───────────────────────────────────────────────────────────

function StatBar({ parsed }) {
  const { riskMap, personaLens, attackZones } = parsed;
  const totalRisks = riskMap?.items?.length || 0;
  const criticalRisks = riskMap?.items?.filter(i => i.severity === 'critical').length || 0;
  const personaCount = personaLens?.length || 0;
  const zoneCount = attackZones?.length || 0;

  const stats = [
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      value: `${totalRisks} Vulnerabilities`,
      sub: criticalRisks > 0 ? `${criticalRisks} CRITICAL` : 'MAPPED',
      subColor: criticalRisks > 0 ? 'text-red-600' : 'text-muted',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
      value: `${personaCount} Buyer Personas`,
      sub: personaCount > 0 ? 'PANEL READY' : 'NOT PARSED',
      subColor: personaCount > 0 ? 'text-emerald-600' : 'text-muted',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
        </svg>
      ),
      value: `${zoneCount} Attack Zones`,
      sub: zoneCount > 0 ? 'IDENTIFIED' : 'NOT PARSED',
      subColor: zoneCount > 0 ? 'text-primary' : 'text-muted',
    },
    {
      icon: (
        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      value: 'Analysis Ready',
      sub: 'PROCEED TO Q&A',
      subColor: 'text-emerald-600',
    },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
      {stats.map((s, i) => (
        <div key={i} className="glass rounded-xl p-4 border border-border/50">
          <div className="text-muted mb-2">{s.icon}</div>
          <p className="text-sm font-semibold text-foreground leading-tight">{s.value}</p>
          <p className={`text-[11px] font-bold uppercase tracking-wider mt-0.5 ${s.subColor}`}>{s.sub}</p>
        </div>
      ))}
    </div>
  );
}

// ─── Tab bar ──────────────────────────────────────────────────────────────────

const TABS = [
  { id: 'riskMap',     label: 'Risk Map' },
  { id: 'buyerPanel',  label: 'Buyer Panel' },
  { id: 'positioning', label: 'Positioning' },
  { id: 'attackZones', label: 'Attack Zones' },
];

function TabBar({ active, onChange }) {
  return (
    <div className="border-b border-border/60 mb-6">
      <div className="flex items-center gap-1">
        {TABS.map(tab => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`px-4 py-2.5 text-xs font-semibold transition-all duration-150 border-b-2 -mb-px ${
              active === tab.id
                ? 'border-primary text-primary'
                : 'border-transparent text-muted hover:text-foreground'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ─── Risk Map tab ─────────────────────────────────────────────────────────────

function RiskCard({ item, index }) {
  const [open, setOpen] = useState(index === 0);
  const cfg = sev(item.severity);

  return (
    <div className={`rounded-xl border-l-4 ${cfg.border} bg-surface/60 border border-border/50 border-l-4 overflow-hidden transition-all`}
      style={{ borderLeftWidth: '4px' }}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-start gap-3 px-4 py-3.5 text-left"
      >
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.badge}`}>
              {cfg.icon} {cfg.label}
            </span>
          </div>
          <p className="text-sm font-semibold text-foreground leading-snug">{item.title}</p>
          {!open && item.description && (
            <p className="text-xs text-muted mt-1 line-clamp-1 leading-relaxed">{item.description}</p>
          )}
        </div>
        <svg
          className={`w-4 h-4 text-muted shrink-0 mt-0.5 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-4 pb-4 pt-0 space-y-3">
          <div className="h-px bg-slate-200" />
          {item.description && (
            <p className="text-sm text-foreground/75 leading-relaxed">
              {item.buyerFear ? <><span className="text-muted font-medium">Buyer fear: </span>{item.description}</> : item.description}
            </p>
          )}
          {item.whyItMatters && item.whyItMatters !== item.description && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">Why it matters</p>
              <p className="text-sm text-foreground/70 leading-relaxed">{item.whyItMatters}</p>
            </div>
          )}
          {item.conclusion && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">If handled poorly</p>
              <p className="text-sm text-foreground/70 leading-relaxed">{item.conclusion}</p>
            </div>
          )}
          {item.priority && (
            <p className="text-[10px] text-muted">Prep priority: <span className="font-semibold text-foreground">{item.priority}</span></p>
          )}
        </div>
      )}
    </div>
  );
}

function RiskMapTab({ parsed, rawSection, positioning }) {
  const { items, infoGaps } = parsed.riskMap || { items: [], infoGaps: [] };
  const { narrative, proofPoints } = positioning || {};

  if (items.length === 0) {
    return <RawFallback text={rawSection} label="Showing raw analysis — structured view coming soon." />;
  }

  return (
    <div className="space-y-6">
      <h2 className="text-base font-bold text-foreground">Buyer Risk Map — Top Vulnerabilities</h2>

      <div className="lg:grid lg:grid-cols-[1fr_340px] gap-6">
        {/* Risk list */}
        <div className="space-y-2">
          {items.map((item, i) => <RiskCard key={i} item={item} index={i} />)}
        </div>

        {/* Right panel: narrative + proof points */}
        <div className="space-y-4 mt-6 lg:mt-0">
          {narrative && (
            <div className="glass rounded-xl p-5 border border-primary/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-3">Most Credible Narrative</p>
              <p className="text-sm text-foreground/85 leading-relaxed italic">"{narrative}"</p>
              <button
                onClick={() => { navigator.clipboard?.writeText(narrative); toast.success('Copied'); }}
                className="mt-3 flex items-center gap-1.5 text-[11px] text-muted hover:text-foreground transition-colors border border-border/50 rounded-lg px-2.5 py-1"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
                Copy
              </button>
            </div>
          )}

          {proofPoints && proofPoints.length > 0 && (
            <div className="glass rounded-xl p-5 border border-border/50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-3">Must-Land Proof Points</p>
              <div className="space-y-2.5">
                {proofPoints.map((pt, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-full border border-border/60 flex items-center justify-center text-[10px] text-muted shrink-0 font-bold">{i + 1}</span>
                    <p className="text-sm text-foreground/80 leading-relaxed">{pt.title}{pt.description ? ` — ${pt.description}` : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Info gaps */}
      {infoGaps.length > 0 && (
        <div>
          <p className="text-xs font-semibold text-muted mb-2">Key Information Gaps</p>
          <div className="flex flex-wrap gap-2">
            {infoGaps.map((gap, i) => (
              <span key={i} className="text-xs border border-red-200 text-red-600 bg-red-50 rounded-full px-3 py-1">
                {gap}
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Buyer Panel tab ──────────────────────────────────────────────────────────

function PersonaDossier({ persona }) {
  return (
    <div className="glass rounded-xl border border-border/60 overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className={`w-12 h-12 rounded-xl border-2 flex items-center justify-center text-sm font-bold shrink-0 ${persona.color}`}>
            {persona.initials}
          </div>
          <div>
            <p className="font-bold text-foreground text-base">{persona.full}</p>
            <p className="text-xs text-muted mt-0.5">{persona.role}</p>
          </div>
        </div>
      </div>

      <div className="p-5 space-y-4">
        {/* Core obsessions */}
        {persona.obsessions?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Core Obsessions</p>
            <div className="space-y-1">
              {persona.obsessions.map((o, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                  <p className="text-sm text-foreground/80 leading-relaxed">{o}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Hidden agenda */}
        {persona.hiddenAgenda && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Hidden Agenda</p>
            <p className="text-sm text-foreground/70 leading-relaxed italic border-l-2 border-border/60 pl-3">{persona.hiddenAgenda}</p>
          </div>
        )}

        {/* 2 hardest questions */}
        {persona.questions?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2">Their {persona.questions.length} Hardest Questions</p>
            <div className="space-y-2">
              {persona.questions.map((q, i) => (
                <div key={i} className="glass rounded-lg px-3 py-2.5 border border-border/40">
                  <div className="flex gap-2.5 items-start">
                    <span className="text-[10px] font-bold text-primary shrink-0 mt-0.5">{i + 1}.</span>
                    <p className="text-sm text-foreground/85 leading-relaxed">"{q}"</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Red flags */}
        {persona.redFlags?.length > 0 && (
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 mb-2">
              <span className="mr-1">⚠</span>Red Flags Watching For
            </p>
            <div className="flex flex-wrap gap-1.5">
              {persona.redFlags.map((f, i) => (
                <span key={i} className="text-[11px] border border-red-200 text-red-600 bg-red-50 rounded-full px-2.5 py-0.5">
                  {f}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Fallback if no structured data */}
        {!persona.obsessions?.length && !persona.hiddenAgenda && !persona.questions?.length && (
          <RenderLines text={persona.rawText} />
        )}
      </div>
    </div>
  );
}

function BuyerPanelTab({ parsed, rawSection }) {
  const { personaLens } = parsed;

  if (!personaLens?.length) {
    return <RawFallback text={rawSection} label="Showing raw analysis — structured view coming soon." />;
  }

  return (
    <div>
      <p className="text-xs text-muted mb-5">{personaLens.length} buyer persona{personaLens.length !== 1 ? 's' : ''} active in this session.</p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {personaLens.map((persona, i) => (
          <PersonaDossier key={i} persona={persona} />
        ))}
      </div>
    </div>
  );
}

// ─── Positioning tab ──────────────────────────────────────────────────────────

function ThemeCard({ theme, index }) {
  return (
    <div className="glass rounded-lg px-4 py-3 border border-border/40">
      <p className="text-sm font-semibold text-foreground">{theme.title}</p>
      {theme.description && (
        <p className="text-xs text-muted mt-0.5 leading-relaxed">{theme.description}</p>
      )}
    </div>
  );
}

function PositioningTab({ parsed, rawSection }) {
  const { positioning } = parsed;
  const { leadWith = [], fixBefore = [], narrative = '', proofPoints = [], mistakes = [], rawText = '' } = positioning || {};

  const hasData = leadWith.length > 0 || fixBefore.length > 0 || narrative;

  if (!hasData) {
    return <RawFallback text={rawSection || rawText} label="Showing raw analysis — structured view coming soon." />;
  }

  const [copied, setCopied] = useState(false);

  function copyNarrative() {
    navigator.clipboard?.writeText(narrative);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-6">
      {/* Lead With + Fix Before */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Lead With */}
        {leadWith.length > 0 && (
          <div className="glass rounded-xl border border-emerald-500/25 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/40">
              <svg className="w-4 h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-bold text-foreground">Lead With These Themes</p>
            </div>
            <div className="p-4 space-y-2">
              {leadWith.map((t, i) => <ThemeCard key={i} theme={t} index={i} />)}
            </div>
          </div>
        )}

        {/* Fix Before */}
        {fixBefore.length > 0 && (
          <div className="glass rounded-xl border border-amber-500/25 overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3.5 border-b border-border/40">
              <svg className="w-4 h-4 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-sm font-bold text-foreground">Fix Before Presenting</p>
            </div>
            <div className="p-4 space-y-2">
              {fixBefore.map((t, i) => <ThemeCard key={i} theme={t} index={i} />)}
            </div>
          </div>
        )}
      </div>

      {/* Narrative */}
      {narrative && (
        <div className="glass rounded-xl border border-primary/20 p-5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-primary mb-3">Your Single Most Credible Narrative</p>
          <div className="border-l-2 border-primary/40 pl-4">
            <p className="text-sm text-foreground/90 leading-relaxed italic">"{narrative}"</p>
          </div>
          <div className="flex items-center justify-between mt-4">
            <button
              onClick={copyNarrative}
              className="flex items-center gap-1.5 text-[11px] text-muted hover:text-foreground transition-colors border border-border/50 rounded-lg px-2.5 py-1"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
              </svg>
              {copied ? 'Copied!' : 'Copy to clipboard'}
            </button>
            <p className="text-[10px] text-muted">Note: Every answer in the room should reinforce one of these elements.</p>
          </div>
        </div>
      )}

      {/* Proof points + Mistakes */}
      {(proofPoints.length > 0 || mistakes.length > 0) && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {proofPoints.length > 0 && (
            <div className="glass rounded-xl p-5 border border-border/50">
              <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-3">Must-Land Proof Points</p>
              <div className="space-y-2.5">
                {proofPoints.map((pt, i) => (
                  <div key={i} className="flex gap-3 items-start">
                    <span className="w-5 h-5 rounded-full border border-border/60 flex items-center justify-center text-[10px] text-muted shrink-0 font-bold">{i + 1}</span>
                    <p className="text-sm text-foreground/80 leading-relaxed">{pt.title}{pt.description ? ` — ${pt.description}` : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {mistakes.length > 0 && (
            <div className="glass rounded-xl p-5 border border-red-500/20">
              <p className="text-[10px] font-bold uppercase tracking-wider text-red-600 mb-3">
                <span className="mr-1">⊘</span>Credibility Mistakes to Avoid
              </p>
              <div className="space-y-2">
                {mistakes.map((m, i) => (
                  <div key={i} className="flex gap-2 items-start">
                    <svg className="w-3.5 h-3.5 text-red-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                    <p className="text-sm text-foreground/75 leading-relaxed">{m.title}{m.description ? ` — ${m.description}` : ''}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Attack Zones tab ─────────────────────────────────────────────────────────

function AttackZoneCard({ zone, index, sessionId }) {
  const [open, setOpen] = useState(index === 0);

  return (
    <div className="glass rounded-xl border border-border/60 overflow-hidden">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold shrink-0 ${
          open ? 'bg-primary text-white' : 'bg-surface-light text-muted'
        }`}>
          {index + 1}
        </div>
        <div className="flex-1 min-w-0">
          <p className={`font-semibold text-sm leading-snug ${open ? 'text-primary' : 'text-foreground'}`}>{zone.title}</p>
          {zone.subtitle && <p className="text-xs text-muted mt-0.5 leading-snug">{zone.subtitle}</p>}
          {!open && zone.whyMatters && (
            <p className="text-xs text-muted mt-1 line-clamp-1">{zone.whyMatters}</p>
          )}
        </div>
        <svg
          className={`w-5 h-5 text-muted shrink-0 transition-transform ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          <div className="h-px bg-slate-200" />

          {/* Why it matters */}
          {zone.whyMatters && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-3.5 h-3.5 text-primary/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <p className="text-[10px] font-bold uppercase tracking-wider text-muted">Why It Matters</p>
              </div>
              <div className="glass rounded-lg px-4 py-3 border border-border/30">
                <p className="text-sm text-foreground/80 leading-relaxed">{zone.whyMatters}</p>
              </div>
            </div>
          )}

          {/* Weak vs Strong */}
          {(zone.weakTeams?.length > 0 || zone.strongAnswer?.length > 0) && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {zone.weakTeams?.length > 0 && (
                <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg className="w-3.5 h-3.5 text-amber-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-amber-700">What Weak Teams Get Wrong</p>
                  </div>
                  <div className="space-y-1.5">
                    {zone.weakTeams.map((w, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <svg className="w-3.5 h-3.5 text-amber-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01" />
                        </svg>
                        <p className="text-xs text-foreground/75 leading-relaxed">{w}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {zone.strongAnswer?.length > 0 && (
                <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                  <div className="flex items-center gap-1.5 mb-2">
                    <svg className="w-3.5 h-3.5 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-700">What a Strong Answer Requires</p>
                  </div>
                  <div className="space-y-1.5">
                    {zone.strongAnswer.map((s, i) => (
                      <div key={i} className="flex gap-2 items-start">
                        <svg className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <p className="text-xs text-foreground/75 leading-relaxed">{s}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Fallback if nothing parsed */}
          {!zone.whyMatters && !zone.weakTeams?.length && !zone.strongAnswer?.length && (
            <RenderLines text={zone.rawText} />
          )}

          {/* Practice CTA */}
          <div className="flex justify-end pt-1">
            <Link
              href={`/dashboard/sessions/${sessionId}/qa?focus=${encodeURIComponent(zone.title)}`}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary border border-primary/30 hover:bg-primary/10 px-3 py-1.5 rounded-lg transition-colors"
            >
              Practice This →
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}

function AttackZonesTab({ parsed, rawSection, sessionId }) {
  const { attackZones } = parsed;

  if (!attackZones?.length) {
    return <RawFallback text={rawSection} label="Showing raw analysis — structured view coming soon." />;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-baseline justify-between mb-4">
        <div>
          <h2 className="text-base font-bold text-foreground">Primary Attack Zones</h2>
          <p className="text-xs text-muted mt-0.5">The {attackZones.length} critical ambush points buyers will exploit during live diligence.</p>
        </div>
      </div>
      {attackZones.map((zone, i) => (
        <AttackZoneCard key={i} zone={zone} index={i} sessionId={sessionId} />
      ))}
    </div>
  );
}

// ─── Full Report tab ──────────────────────────────────────────────────────────

function FullReportTab({ part1Output, part2Output }) {
  return (
    <div className="space-y-5">
      {part1Output && (
        <div className="glass rounded-xl p-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-4">Part 1 — Situation Framing</p>
          <RenderLines text={part1Output} />
        </div>
      )}
      {part2Output && (
        <div className="glass rounded-xl p-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-4">Part 2 — Risk Map & Attack Zones</p>
          <RenderLines text={part2Output} />
        </div>
      )}
      {!part1Output && !part2Output && (
        <div className="py-12 text-center">
          <p className="text-sm text-muted">No analysis generated yet.</p>
        </div>
      )}
    </div>
  );
}

// ─── Analysis loading state (replaces streaming text blobs) ──────────────────

function AnalyzingState({ part1Done, part2Done, streaming, onStart }) {
  const steps = [
    {
      id: 'part1',
      label: 'Situation Framing',
      sub: 'Reading documents, identifying buyer context and information quality',
      done: part1Done,
      active: streaming === 'part1',
    },
    {
      id: 'part2',
      label: 'Risk Map & War Room',
      sub: 'Building buyer risk map, persona panel, positioning guidance, and attack zones',
      done: part2Done,
      active: streaming === 'part2',
    },
  ];

  const nothingStarted = !part1Done && !part2Done && !streaming;

  return (
    <div className="glass rounded-2xl p-8 space-y-6">
      <div className="space-y-4">
        {steps.map((step, i) => (
          <div key={step.id} className="flex items-start gap-4">
            {/* Status icon */}
            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 transition-all duration-300 ${
              step.done
                ? 'bg-primary text-white'
                : step.active
                  ? 'bg-primary/20 border-2 border-primary'
                  : 'bg-surface-light border-2 border-border'
            }`}>
              {step.done ? (
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              ) : step.active ? (
                <div className="w-2.5 h-2.5 rounded-full bg-primary animate-pulse" />
              ) : (
                <span className="text-xs font-bold text-muted">{i + 1}</span>
              )}
            </div>

            {/* Label */}
            <div className="flex-1 min-w-0 pt-0.5">
              <p className={`text-sm font-semibold transition-colors ${
                step.done ? 'text-primary' : step.active ? 'text-foreground' : 'text-muted'
              }`}>
                {step.label}
                {step.done && <span className="ml-2 text-xs font-normal text-primary/70">Complete</span>}
                {step.active && <span className="ml-2 text-xs font-normal text-primary animate-pulse">Generating…</span>}
              </p>
              <p className="text-xs text-muted mt-0.5 leading-relaxed">{step.sub}</p>

              {/* Progress bar while active */}
              {step.active && (
                <div className="mt-2 h-0.5 w-full bg-surface-light rounded-full overflow-hidden">
                  <div className="h-full bg-primary rounded-full animate-[progress_3s_ease-in-out_infinite]"
                    style={{ width: '60%', animation: 'pulse 2s ease-in-out infinite' }} />
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Connector line between steps */}
      {nothingStarted && (
        <div className="pt-2">
          <button
            onClick={onStart}
            disabled={!!streaming}
            className="btn-primary w-full"
          >
            Begin Analysis →
          </button>
          <p className="text-xs text-muted text-center mt-3">
            Part 1 and Part 2 will run automatically in sequence. Takes 60–90 seconds.
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Phase blocks (pre-Part 2) — kept for reference, replaced by AnalyzingState ──

function PhaseBlock({ phase, label, number, output, streaming, onRun, canRun, done }) {
  const endRef = useRef(null);
  useEffect(() => {
    if (streaming) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [output, streaming]);

  return (
    <div className={`glass rounded-2xl overflow-hidden transition-all duration-300 ${done ? 'border-primary/20' : ''}`}>
      <div className="flex items-center justify-between px-6 py-4 border-b border-border/60">
        <div className="flex items-center gap-3">
          <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold transition-colors ${
            done ? 'bg-primary text-white' : streaming ? 'bg-primary/20 text-primary' : 'bg-surface-light text-muted'
          }`}>
            {done ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
            ) : number}
          </div>
          <h2 className="font-semibold text-foreground text-sm">{label}</h2>
        </div>
        <div>
          {!done && !streaming && (
            <button onClick={onRun} disabled={!canRun} className="btn-primary text-xs px-3 py-1.5">
              Run {phase === 'part1' ? 'Part 1' : 'Part 2'}
            </button>
          )}
          {streaming && (
            <div className="flex items-center gap-2 text-xs text-primary">
              <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              Generating…
            </div>
          )}
          {done && <span className="badge border text-success bg-success-dim border-success/20">Complete</span>}
        </div>
      </div>
      {(output || streaming) ? (
        <div className="px-6 py-6">
          <RenderLines text={output || ''} />
          {streaming && <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-middle rounded-sm" />}
          <div ref={endRef} />
        </div>
      ) : (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-muted">
            {canRun ? `Click "Run ${phase === 'part1' ? 'Part 1' : 'Part 2'}" to begin analysis.` : 'Complete Part 1 first.'}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function AnalysisPage() {
  const router = useRouter();
  const { id } = useParams();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [part1Output, setPart1Output] = useState('');
  const [part2Output, setPart2Output] = useState('');
  const [part1Done, setPart1Done] = useState(false);
  const [part2Done, setPart2Done] = useState(false);
  const [streaming, setStreaming] = useState(null);
  const [activeTab, setActiveTab] = useState('riskMap');
  const [fromQA, setFromQA] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFromQA(params.get('from') === 'qa');
  }, []);

  const abortRef = useRef(null);
  const shouldAutoChain = useRef(false);

  const load = useCallback(async () => {
    const res = await fetch(`/api/sessions/${id}`);
    if (res.status === 401) { router.replace('/login'); return; }
    if (!res.ok) { router.replace('/dashboard'); return; }
    const { session } = await res.json();
    setSession(session);
    if (session.part1_output) { setPart1Output(session.part1_output); setPart1Done(true); }
    if (session.part2_output) { setPart2Output(session.part2_output); setPart2Done(true); }
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  // Autostart: when navigated from documents page with ?autostart=1, kick off Part 1 immediately
  useEffect(() => {
    if (loading) return; // wait for DB data to load first
    const autostart = new URLSearchParams(window.location.search).get('autostart') === '1';
    if (autostart && !part1Done && !part2Done && !streaming) {
      runPhase('part1');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading]);

  // Auto-chain: when Part 1 finishes, automatically start Part 2
  useEffect(() => {
    if (streaming === null && shouldAutoChain.current && !part2Done) {
      shouldAutoChain.current = false;
      toast.success('Part 1 complete — starting Part 2 analysis…');
      runPhase('part2');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streaming]);

  const parsed = useMemo(() => {
    if (!part2Output) return null;
    return parseAnalysis(part2Output);
  }, [part2Output]);

  async function runPhase(phase) {
    if (streaming) return;
    setStreaming(phase);
    if (phase === 'part1') { setPart1Output(''); setPart1Done(false); }
    if (phase === 'part2') { setPart2Output(''); setPart2Done(false); }

    const controller = new AbortController();
    abortRef.current = controller;

    try {
      const res = await fetch(`/api/sessions/${id}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phase }),
        signal: controller.signal,
      });

      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error || 'Analysis failed');
        setStreaming(null);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6);
          if (payload === '[DONE]') {
            if (phase === 'part1') {
              setPart1Done(true);
              shouldAutoChain.current = true; // signal auto-chain after state settles
            }
            if (phase === 'part2') { setPart2Done(true); setActiveTab('riskMap'); }
            setStreaming(null);
            break;
          }
          try {
            const { text, error } = JSON.parse(payload);
            if (error) { toast.error(error); setStreaming(null); break; }
            if (text) {
              if (phase === 'part1') setPart1Output(p => p + text);
              if (phase === 'part2') setPart2Output(p => p + text);
            }
          } catch { /* skip */ }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') toast.error('Connection lost. Please try again.');
      setStreaming(null);
    }
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
      <header className="border-b border-border/60 bg-surface/40 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href={`/dashboard/sessions/${id}`} className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {session?.company_name}
          </Link>
          <span className="font-bold tracking-tight text-sm text-slate-900">Deal<span className="text-blue-500">Ready</span></span>
          {fromQA ? (
            <Link
              href={`/dashboard/sessions/${id}/qa`}
              className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:text-primary/80 border border-primary/30 hover:border-primary/50 px-3 py-1.5 rounded-lg transition-colors"
            >
              Return to Q&amp;A →
            </Link>
          ) : (
            <div className="w-28" />
          )}
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8 animate-fade-in">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Pre-Interview</p>
          <h1 className="text-2xl font-bold text-foreground">Analysis</h1>
          <p className="text-sm text-muted mt-1.5">
            Part 1 frames the buyer context. Part 2 generates the full risk map and attack zones.
          </p>
        </div>

        {/* Part 2 done → tabbed view */}
        {part2Done && parsed ? (
          <div>
            <StatBar parsed={parsed} />
            <TabBar active={activeTab} onChange={setActiveTab} />

            <div className="animate-fade-in">
              {activeTab === 'riskMap' && (
                <RiskMapTab parsed={parsed} rawSection={parsed.sections?.riskMap || part2Output} positioning={parsed.positioning} />
              )}
              {activeTab === 'buyerPanel' && (
                <BuyerPanelTab parsed={parsed} rawSection={parsed.sections?.personaLens || part2Output} />
              )}
              {activeTab === 'positioning' && (
                <PositioningTab parsed={parsed} rawSection={parsed.sections?.positioning || part2Output} />
              )}
              {activeTab === 'attackZones' && (
                <AttackZonesTab parsed={parsed} rawSection={parsed.sections?.attackZones || part2Output} sessionId={id} />
              )}
            </div>

            <div className="mt-8 glass rounded-2xl p-5 flex items-center justify-between gap-4 border-primary/20 glow-primary-sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Analysis complete — ready for live Q&A</p>
                  <p className="text-xs text-muted mt-0.5">Part 3 simulates the real management presentation. One question at a time.</p>
                </div>
              </div>
              <button onClick={() => router.push(`/dashboard/sessions/${id}/qa`)} className="btn-primary shrink-0">
                Start Q&A →
              </button>
            </div>
          </div>
        ) : (
          <AnalyzingState
            part1Done={part1Done}
            part2Done={part2Done}
            streaming={streaming}
            onStart={() => runPhase('part1')}
          />
        )}
      </main>
    </div>
  );
}
