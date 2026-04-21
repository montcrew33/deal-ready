'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';
import { parseAnalysis } from '@/lib/analysisParser';

// ─── Helpers ────────────────────────────────────────────────────────────────

function severityConfig(severity) {
  switch (severity) {
    case 'critical': return { label: 'Critical', dot: 'bg-red-400', border: 'border-red-500/30', bg: 'bg-red-500/8', text: 'text-red-400' };
    case 'high':     return { label: 'High',     dot: 'bg-amber-400', border: 'border-amber-500/30', bg: 'bg-amber-500/8', text: 'text-amber-400' };
    case 'medium':   return { label: 'Medium',   dot: 'bg-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/8', text: 'text-yellow-400' };
    case 'low':      return { label: 'Low',      dot: 'bg-slate-400', border: 'border-slate-500/30', bg: 'bg-slate-500/8', text: 'text-slate-400' };
    default:         return { label: 'Medium',   dot: 'bg-yellow-400', border: 'border-yellow-500/30', bg: 'bg-yellow-500/8', text: 'text-yellow-400' };
  }
}

function priorityConfig(priority) {
  switch (priority) {
    case 'critical': return { label: 'Critical', color: 'text-red-400 bg-red-500/10 border-red-500/20' };
    case 'high':     return { label: 'High',     color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' };
    case 'medium':   return { label: 'Medium',   color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' };
    case 'low':      return { label: 'Low',       color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' };
    default:         return { label: 'Medium',   color: 'text-yellow-400 bg-yellow-500/10 border-yellow-500/20' };
  }
}

// Persona role → initials color
function personaColor(index) {
  const colors = [
    'bg-violet-500/20 text-violet-300 border-violet-500/30',
    'bg-blue-500/20 text-blue-300 border-blue-500/30',
    'bg-teal-500/20 text-teal-300 border-teal-500/30',
    'bg-amber-500/20 text-amber-300 border-amber-500/30',
    'bg-rose-500/20 text-rose-300 border-rose-500/30',
    'bg-green-500/20 text-green-300 border-green-500/30',
  ];
  return colors[index % colors.length];
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function TabBar({ tabs, active, onChange }) {
  return (
    <div className="flex items-center gap-1 p-1 glass rounded-xl border border-border/60 mb-6">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={`flex-1 px-3 py-2 rounded-lg text-xs font-semibold transition-all duration-200 ${
            active === tab.id
              ? 'bg-primary text-white shadow-sm'
              : 'text-muted hover:text-foreground hover:bg-surface-light'
          }`}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}

function RiskCard({ item, defaultOpen = false }) {
  const [open, setOpen] = useState(defaultOpen);
  const cfg = severityConfig(item.severity);

  return (
    <div className={`rounded-xl border ${cfg.border} ${cfg.bg} overflow-hidden transition-all duration-200`}>
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3.5 gap-3 text-left"
      >
        <div className="flex items-center gap-3 min-w-0">
          <span className={`w-2 h-2 rounded-full shrink-0 ${cfg.dot}`} />
          <span className="text-sm font-semibold text-foreground truncate">{item.title}</span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <span className={`text-[10px] font-bold uppercase tracking-wider ${cfg.text}`}>{cfg.label}</span>
          <svg
            className={`w-4 h-4 text-muted transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
      </button>
      {open && item.description && (
        <div className="px-4 pb-4 pt-0">
          <div className="h-px bg-white/5 mb-3" />
          <p className="text-sm text-foreground/70 leading-relaxed whitespace-pre-wrap">{item.description}</p>
        </div>
      )}
    </div>
  );
}

function PersonaCard({ card, index }) {
  const [open, setOpen] = useState(false);
  const color = personaColor(index);
  const initials = card.name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();

  return (
    <div className="glass rounded-xl overflow-hidden border border-border/60 hover:border-primary/30 transition-colors duration-200">
      <button onClick={() => setOpen(o => !o)} className="w-full text-left p-4">
        <div className="flex items-start gap-3">
          <div className={`w-9 h-9 rounded-lg border flex items-center justify-center text-xs font-bold shrink-0 ${color}`}>
            {initials}
          </div>
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-foreground text-sm truncate">{card.name}</p>
            {card.role && <p className="text-xs text-muted mt-0.5 truncate">{card.role}</p>}
          </div>
          <svg
            className={`w-4 h-4 text-muted transition-transform duration-200 shrink-0 mt-0.5 ${open ? 'rotate-180' : ''}`}
            fill="none" stroke="currentColor" viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>
        {card.agenda && !open && (
          <p className="text-xs text-muted mt-2.5 pl-12 line-clamp-2 leading-relaxed">{card.agenda}</p>
        )}
      </button>

      {open && (
        <div className="px-4 pb-4 space-y-3">
          <div className="h-px bg-white/5" />
          {card.style && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">Style</p>
              <p className="text-sm text-foreground/75 leading-relaxed">{card.style}</p>
            </div>
          )}
          {card.agenda && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">Agenda / Focus</p>
              <p className="text-sm text-foreground/75 leading-relaxed">{card.agenda}</p>
            </div>
          )}
          {card.expect && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-1">Expect to Ask</p>
              <p className="text-sm text-foreground/75 leading-relaxed">{card.expect}</p>
            </div>
          )}
          {!card.style && !card.agenda && !card.expect && (
            <RenderText text={card.rawText} compact />
          )}
        </div>
      )}
    </div>
  );
}

function AttackZoneRow({ zone, index }) {
  const [open, setOpen] = useState(false);
  const cfg = priorityConfig(zone.priority);

  return (
    <div className="glass rounded-xl overflow-hidden border border-border/60">
      <button
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center gap-4 px-5 py-4 text-left"
      >
        <span className="text-xs font-bold text-muted w-5 shrink-0">{index + 1}</span>
        <span className="flex-1 font-semibold text-foreground text-sm">{zone.zone}</span>
        <span className={`text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border ${cfg.color} shrink-0`}>
          {cfg.label}
        </span>
        <svg
          className={`w-4 h-4 text-muted transition-transform duration-200 shrink-0 ${open ? 'rotate-180' : ''}`}
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="px-5 pb-5 space-y-4">
          <div className="h-px bg-white/5" />
          {zone.questions.length > 0 && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">Sample Questions</p>
              <div className="space-y-1.5">
                {zone.questions.map((q, i) => (
                  <div key={i} className="flex gap-2.5 items-start">
                    <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <p className="text-sm text-foreground/75 leading-relaxed italic">"{q}"</p>
                  </div>
                ))}
              </div>
            </div>
          )}
          {zone.coaching && (
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">Coaching Note</p>
              <p className="text-sm text-foreground/70 leading-relaxed">{zone.coaching}</p>
            </div>
          )}
          {zone.questions.length === 0 && !zone.coaching && (
            <RenderText text={zone.rawText} compact />
          )}
        </div>
      )}
    </div>
  );
}

function RenderText({ text, compact = false }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className={`space-y-1.5 ${compact ? 'text-xs' : ''}`}>
      {lines.map((line, i) => {
        if (/^#{1,2}\s/.test(line)) {
          const content = line.replace(/^#{1,2}\s/, '');
          return (
            <p key={i} className="text-foreground font-semibold text-sm mt-5 mb-1 first:mt-0 section-accent">
              {content}
            </p>
          );
        }
        if (/^###\s/.test(line)) {
          return (
            <p key={i} className="text-foreground-dim font-semibold text-xs mt-4 mb-1 uppercase tracking-wider">
              {line.replace(/^###\s/, '')}
            </p>
          );
        }
        if (/^\*\*(.+)\*\*$/.test(line)) {
          return (
            <p key={i} className="text-foreground font-semibold text-sm">
              {line.replace(/\*\*/g, '')}
            </p>
          );
        }
        if (/^[-•]\s/.test(line)) {
          return (
            <div key={i} className="flex gap-2.5 items-start">
              <span className="text-primary shrink-0 mt-1.5 w-1 h-1 rounded-full bg-primary block" />
              <span className="text-foreground/80 text-sm leading-relaxed">
                {line.replace(/^[-•]\s/, '').replace(/\*\*(.+?)\*\*/g, '$1')}
              </span>
            </div>
          );
        }
        if (line.trim() === '') return <div key={i} className="h-1.5" />;
        return (
          <p key={i} className="text-foreground/80 text-sm leading-relaxed">
            {line.replace(/\*\*(.+?)\*\*/g, '$1')}
          </p>
        );
      })}
    </div>
  );
}

function EmptyState({ message }) {
  return (
    <div className="py-16 text-center">
      <div className="w-10 h-10 rounded-xl bg-surface-light flex items-center justify-center mx-auto mb-3">
        <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>
      <p className="text-sm text-muted">{message}</p>
    </div>
  );
}

// ─── Phase blocks (pre-Part 2) ───────────────────────────────────────────────

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
          {done && (
            <span className="badge border text-success bg-success-dim border-success/20">Complete</span>
          )}
        </div>
      </div>

      {(output || streaming) ? (
        <div className="px-6 py-6">
          <RenderText text={output || ''} />
          {streaming && (
            <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-middle rounded-sm" />
          )}
          <div ref={endRef} />
        </div>
      ) : (
        <div className="px-6 py-12 text-center">
          <p className="text-sm text-muted">
            {canRun
              ? `Click "Run ${phase === 'part1' ? 'Part 1' : 'Part 2'}" to begin analysis.`
              : 'Complete Part 1 first.'}
          </p>
        </div>
      )}
    </div>
  );
}

// ─── Tab views ───────────────────────────────────────────────────────────────

function RiskMapTab({ parsed, rawSection }) {
  const { riskMap } = parsed;

  if (riskMap.length === 0) {
    return rawSection
      ? <div className="glass rounded-xl p-6"><RenderText text={rawSection} /></div>
      : <EmptyState message="No structured risk items detected — check the Full Report tab." />;
  }

  const bySeverity = { critical: [], high: [], medium: [], low: [] };
  for (const item of riskMap) {
    (bySeverity[item.severity] || bySeverity.medium).push(item);
  }

  return (
    <div className="space-y-6">
      {['critical', 'high', 'medium', 'low'].map(sev => {
        const items = bySeverity[sev];
        if (!items.length) return null;
        const cfg = severityConfig(sev);
        return (
          <div key={sev}>
            <div className="flex items-center gap-2 mb-3">
              <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
              <p className={`text-xs font-bold uppercase tracking-wider ${cfg.text}`}>{cfg.label} Risk</p>
              <span className="text-xs text-muted">({items.length})</span>
            </div>
            <div className="space-y-2">
              {items.map((item, i) => (
                <RiskCard key={i} item={item} defaultOpen={sev === 'critical' && i === 0} />
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function BuyerPanelTab({ parsed, rawSection }) {
  const { buyerPanel } = parsed;

  if (buyerPanel.length === 0) {
    return rawSection
      ? <div className="glass rounded-xl p-6"><RenderText text={rawSection} /></div>
      : <EmptyState message="No persona cards detected — check the Full Report tab." />;
  }

  return (
    <div>
      <p className="text-xs text-muted mb-4">
        {buyerPanel.length} buyer persona{buyerPanel.length !== 1 ? 's' : ''} active in this session. Click to expand.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {buyerPanel.map((card, i) => (
          <PersonaCard key={i} card={card} index={i} />
        ))}
      </div>
    </div>
  );
}

function PositioningTab({ parsed, rawSection }) {
  const { positioning } = parsed;
  const hasStructured = (positioning.strengths?.length || positioning.vulnerabilities?.length || positioning.recommendations?.length);

  if (!hasStructured) {
    return rawSection
      ? <div className="glass rounded-xl p-6"><RenderText text={rawSection} /></div>
      : <EmptyState message="No positioning data detected — check the Full Report tab." />;
  }

  return (
    <div className="space-y-5">
      {positioning.narrative && (
        <div className="glass rounded-xl p-5 border-primary/20">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-2">Core Narrative</p>
          <p className="text-sm text-foreground leading-relaxed italic">"{positioning.narrative}"</p>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {positioning.strengths?.length > 0 && (
          <div className="glass rounded-xl p-5 border border-green-500/20 bg-green-500/5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              <p className="text-xs font-bold uppercase tracking-wider text-green-400">Strengths</p>
            </div>
            <div className="space-y-1.5">
              {positioning.strengths.map((s, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-green-400 shrink-0 mt-1.5" />
                  <p className="text-sm text-foreground/80 leading-relaxed">{s}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {positioning.vulnerabilities?.length > 0 && (
          <div className="glass rounded-xl p-5 border border-red-500/20 bg-red-500/5">
            <div className="flex items-center gap-2 mb-3">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-xs font-bold uppercase tracking-wider text-red-400">Vulnerabilities</p>
            </div>
            <div className="space-y-1.5">
              {positioning.vulnerabilities.map((v, i) => (
                <div key={i} className="flex gap-2 items-start">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 shrink-0 mt-1.5" />
                  <p className="text-sm text-foreground/80 leading-relaxed">{v}</p>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {positioning.recommendations?.length > 0 && (
        <div className="glass rounded-xl p-5 border border-primary/20">
          <div className="flex items-center gap-2 mb-3">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <p className="text-xs font-bold uppercase tracking-wider text-primary">Recommendations</p>
          </div>
          <div className="space-y-1.5">
            {positioning.recommendations.map((r, i) => (
              <div key={i} className="flex gap-2 items-start">
                <span className="w-1.5 h-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                <p className="text-sm text-foreground/80 leading-relaxed">{r}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function AttackZonesTab({ parsed, rawSection }) {
  const { attackZones } = parsed;

  if (attackZones.length === 0) {
    return rawSection
      ? <div className="glass rounded-xl p-6"><RenderText text={rawSection} /></div>
      : <EmptyState message="No attack zones detected — check the Full Report tab." />;
  }

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted mb-4">
        {attackZones.length} priority zone{attackZones.length !== 1 ? 's' : ''} identified. Click to see sample questions and coaching notes.
      </p>
      {attackZones.map((zone, i) => (
        <AttackZoneRow key={i} zone={zone} index={i} />
      ))}
    </div>
  );
}

function FullReportTab({ part1Output, part2Output }) {
  return (
    <div className="space-y-5">
      {part1Output && (
        <div className="glass rounded-xl p-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-4">Part 1 — Situation Framing</p>
          <RenderText text={part1Output} />
        </div>
      )}
      {part2Output && (
        <div className="glass rounded-xl p-6">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-muted mb-4">Part 2 — Risk Map & Attack Zones</p>
          <RenderText text={part2Output} />
        </div>
      )}
      {!part1Output && !part2Output && (
        <EmptyState message="No analysis generated yet." />
      )}
    </div>
  );
}

// ─── Main page ───────────────────────────────────────────────────────────────

const TABS = [
  { id: 'riskMap',     label: 'Risk Map' },
  { id: 'buyerPanel',  label: 'Buyer Panel' },
  { id: 'positioning', label: 'Positioning' },
  { id: 'attackZones', label: 'Attack Zones' },
  { id: 'fullReport',  label: 'Full Report' },
];

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

  const abortRef = useRef(null);

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

  // Parse Part 2 output whenever it changes
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
            if (phase === 'part1') setPart1Done(true);
            if (phase === 'part2') { setPart2Done(true); setActiveTab('riskMap'); }
            setStreaming(null);
            break;
          }
          try {
            const { text, error } = JSON.parse(payload);
            if (error) { toast.error(error); setStreaming(null); break; }
            if (text) {
              if (phase === 'part1') setPart1Output(prev => prev + text);
              if (phase === 'part2') setPart2Output(prev => prev + text);
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
      {/* Nav */}
      <header className="border-b border-border/60 bg-surface/40 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href={`/dashboard/sessions/${id}`}
            className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {session?.company_name}
          </Link>
          <span className="font-semibold text-foreground tracking-tight text-sm">DealReady</span>
          <div className="w-28" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 animate-fade-in">
        {/* Page header */}
        <div className="mb-8">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Pre-Interview</p>
          <h1 className="text-2xl font-bold text-foreground">Analysis</h1>
          <p className="text-sm text-muted mt-1.5">
            Part 1 frames the buyer context. Part 2 generates the full risk map and attack zones.
          </p>
        </div>

        {/* If Part 2 is done → tabbed structured view */}
        {part2Done && parsed ? (
          <div>
            {/* Status strip */}
            <div className="flex items-center gap-3 mb-6">
              <span className="badge border text-success bg-success-dim border-success/20">Part 1 Complete</span>
              <span className="badge border text-success bg-success-dim border-success/20">Part 2 Complete</span>
              {parsed.parseError && (
                <span className="text-xs text-amber-400">
                  Some sections rendered as raw text (parsing partial)
                </span>
              )}
            </div>

            {/* Tab bar */}
            <TabBar tabs={TABS} active={activeTab} onChange={setActiveTab} />

            {/* Tab content */}
            <div className="animate-fade-in">
              {activeTab === 'riskMap' && (
                <RiskMapTab parsed={parsed} rawSection={parsed.sections?.riskMap} />
              )}
              {activeTab === 'buyerPanel' && (
                <BuyerPanelTab parsed={parsed} rawSection={parsed.sections?.buyerPanel} />
              )}
              {activeTab === 'positioning' && (
                <PositioningTab parsed={parsed} rawSection={parsed.sections?.positioning} />
              )}
              {activeTab === 'attackZones' && (
                <AttackZonesTab parsed={parsed} rawSection={parsed.sections?.attackZones} />
              )}
              {activeTab === 'fullReport' && (
                <FullReportTab part1Output={part1Output} part2Output={part2Output} />
              )}
            </div>

            {/* Start Q&A CTA */}
            <div className="mt-8 glass rounded-2xl p-5 flex items-center justify-between gap-4 border-primary/20 glow-primary-sm">
              <div className="flex items-center gap-4">
                <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">Analysis complete — ready for live Q&A</p>
                  <p className="text-xs text-muted mt-0.5">
                    Part 3 simulates the real management presentation. One question at a time.
                  </p>
                </div>
              </div>
              <button
                onClick={() => router.push(`/dashboard/sessions/${id}/qa`)}
                className="btn-primary shrink-0"
              >
                Start Q&A →
              </button>
            </div>
          </div>
        ) : (
          /* Part 2 not done yet — show phase blocks */
          <div className="space-y-5">
            <PhaseBlock
              phase="part1"
              number="1"
              label="Situation Framing & Information Quality"
              output={part1Output}
              streaming={streaming === 'part1'}
              done={part1Done}
              canRun={!streaming}
              onRun={() => runPhase('part1')}
            />

            <PhaseBlock
              phase="part2"
              number="2"
              label="Buyer Risk Map, Persona Lens & Attack Zones"
              output={part2Output}
              streaming={streaming === 'part2'}
              done={part2Done}
              canRun={part1Done && !streaming}
              onRun={() => runPhase('part2')}
            />

            {/* Q&A CTA if part2 just finished but parsed isn't ready yet */}
            {part2Done && !parsed && (
              <div className="glass rounded-2xl p-5 flex items-center justify-between gap-4 border-primary/20 glow-primary-sm animate-slide-up">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                    <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                        d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">Analysis complete — ready for live Q&A</p>
                    <p className="text-xs text-muted mt-0.5">
                      Part 3 simulates the real management presentation. One question at a time.
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => router.push(`/dashboard/sessions/${id}/qa`)}
                  className="btn-primary shrink-0"
                >
                  Start Q&A →
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
