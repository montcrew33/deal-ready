'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

// Markdown-like renderer with premium typography
function RenderText({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-1.5">
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

function PhaseBlock({ phase, label, number, output, streaming, onRun, canRun, done }) {
  const endRef = useRef(null);

  useEffect(() => {
    if (streaming) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [output, streaming]);

  return (
    <div className={`glass rounded-2xl overflow-hidden transition-all duration-300 ${done ? 'border-primary/20' : ''}`}>
      {/* Header */}
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
          <div>
            <h2 className="font-semibold text-foreground text-sm">{label}</h2>
          </div>
        </div>
        <div>
          {!done && !streaming && (
            <button
              onClick={onRun}
              disabled={!canRun}
              className="btn-primary text-xs px-3 py-1.5"
            >
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

      {/* Output */}
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
            if (phase === 'part2') setPart2Done(true);
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
          <Link href={`/dashboard/sessions/${id}`} className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {session?.company_name}
          </Link>
          <span className="font-semibold text-foreground tracking-tight text-sm">DealReady</span>
          <div className="w-28" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-5 animate-fade-in">
        <div className="mb-6">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Pre-Interview</p>
          <h1 className="text-2xl font-bold text-foreground">Analysis</h1>
          <p className="text-sm text-muted mt-1.5">
            Part 1 frames the buyer context. Part 2 generates the full risk map and attack zones.
          </p>
        </div>

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

        {/* Start Q&A CTA */}
        {part2Done && (
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
      </main>
    </div>
  );
}
