'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

// Minimal markdown-like renderer: bold, headers, bullet points
function RenderText({ text }) {
  if (!text) return null;
  const lines = text.split('\n');
  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        if (/^#{1,3}\s/.test(line)) {
          const content = line.replace(/^#{1,3}\s/, '');
          return <p key={i} className="text-foreground font-semibold mt-4 mb-1 first:mt-0">{content}</p>;
        }
        if (/^\*\*(.+)\*\*$/.test(line)) {
          return <p key={i} className="text-foreground font-semibold">{line.replace(/\*\*/g, '')}</p>;
        }
        if (/^[-•]\s/.test(line)) {
          return (
            <div key={i} className="flex gap-2">
              <span className="text-primary shrink-0 mt-0.5">·</span>
              <span className="text-foreground/90 text-sm leading-relaxed">
                {line.replace(/^[-•]\s/, '').replace(/\*\*(.+?)\*\*/g, '$1')}
              </span>
            </div>
          );
        }
        if (line.trim() === '') return <div key={i} className="h-2" />;
        return (
          <p key={i} className="text-foreground/90 text-sm leading-relaxed">
            {line.replace(/\*\*(.+?)\*\*/g, '$1')}
          </p>
        );
      })}
    </div>
  );
}

function PhaseBlock({ phase, label, output, streaming, onRun, canRun, done }) {
  const endRef = useRef(null);

  useEffect(() => {
    if (streaming) endRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [output, streaming]);

  return (
    <div className="glass rounded-xl overflow-hidden">
      {/* Phase header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-3">
          <div className={`w-2 h-2 rounded-full ${done ? 'bg-success' : streaming ? 'bg-primary animate-pulse' : 'bg-border'}`} />
          <h2 className="font-semibold text-foreground">{label}</h2>
        </div>
        {!done && !streaming && (
          <button
            onClick={onRun}
            disabled={!canRun}
            className="px-4 py-1.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Run {phase === 'part1' ? 'Part 1' : 'Part 2'}
          </button>
        )}
        {streaming && (
          <div className="flex items-center gap-2 text-sm text-primary">
            <div className="w-3 h-3 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Generating…
          </div>
        )}
        {done && (
          <span className="text-xs font-medium text-success bg-success/10 px-2 py-0.5 rounded-full">Complete</span>
        )}
      </div>

      {/* Output area */}
      {(output || streaming) ? (
        <div className="px-6 py-5">
          <RenderText text={output || ''} />
          {streaming && (
            <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1 align-middle" />
          )}
          <div ref={endRef} />
        </div>
      ) : (
        <div className="px-6 py-10 text-center text-sm text-muted">
          {canRun
            ? `Click "Run ${phase === 'part1' ? 'Part 1' : 'Part 2'}" to begin.`
            : 'Complete Part 1 first.'}
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
  const [streaming, setStreaming] = useState(null); // 'part1' | 'part2' | null

  const abortRef = useRef(null);

  // Load session and any existing outputs
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
        buffer = lines.pop(); // keep incomplete line

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
          } catch { /* skip malformed chunk */ }
        }
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        toast.error('Connection lost. Please try again.');
      }
      setStreaming(null);
    }
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
      {/* Nav */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link
            href={`/dashboard/sessions/${id}`}
            className="text-sm text-muted hover:text-foreground transition-colors"
          >
            ← {session?.company_name}
          </Link>
          <span className="font-semibold text-foreground tracking-tight">DealReady</span>
          <div className="w-28" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6">
        <div className="mb-2">
          <h1 className="text-2xl font-bold text-foreground">Pre-Interview Analysis</h1>
          <p className="text-sm text-muted mt-1">
            Run Part 1 to frame the buyer context, then Part 2 for the full risk map and attack zones.
          </p>
        </div>

        {/* Part 1 */}
        <PhaseBlock
          phase="part1"
          label="Part 1 — Situation Framing & Information Quality"
          output={part1Output}
          streaming={streaming === 'part1'}
          done={part1Done}
          canRun={!streaming}
          onRun={() => runPhase('part1')}
        />

        {/* Part 2 */}
        <PhaseBlock
          phase="part2"
          label="Part 2 — Buyer Risk Map, Persona Lens & Attack Zones"
          output={part2Output}
          streaming={streaming === 'part2'}
          done={part2Done}
          canRun={part1Done && !streaming}
          onRun={() => runPhase('part2')}
        />

        {/* Start Q&A — only after Part 2 */}
        {part2Done && (
          <div className="glass rounded-xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Analysis complete — ready for live Q&A</p>
              <p className="text-xs text-muted mt-0.5">
                Part 3 simulates the real management presentation. One question at a time.
              </p>
            </div>
            <button
              onClick={() => router.push(`/dashboard/sessions/${id}/qa`)}
              className="shrink-0 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Start Q&A →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
