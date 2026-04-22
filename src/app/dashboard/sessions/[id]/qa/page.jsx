'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

// ─── Persona definitions ──────────────────────────────────────────────────────

const PERSONAS = {
  panel_lead:        { name: 'Alexandra Chen',       title: 'Managing Partner',                  initials: 'AC', color: 'bg-violet-500/15 text-violet-300 border-violet-500/25',  ring: 'shadow-[0_0_0_2.5px_rgba(139,92,246,0.5)]' },
  pe_partner:        { name: 'Marcus Webb',           title: 'Senior Partner, Blackridge PE',     initials: 'MW', color: 'bg-blue-500/15 text-blue-300 border-blue-500/25',       ring: 'shadow-[0_0_0_2.5px_rgba(59,130,246,0.5)]' },
  technical_cfo:     { name: 'Diane Foster',          title: 'Operating CFO, Meridian Capital',   initials: 'DF', color: 'bg-cyan-500/15 text-cyan-300 border-cyan-500/25',       ring: 'shadow-[0_0_0_2.5px_rgba(6,182,212,0.5)]' },
  corp_dev:          { name: 'James Okafor',          title: 'Head of Corp Dev',                  initials: 'JO', color: 'bg-amber-500/15 text-amber-300 border-amber-500/25',    ring: 'shadow-[0_0_0_2.5px_rgba(245,158,11,0.5)]' },
  operating_partner: { name: 'Sarah Lindqvist',       title: 'Operating Partner',                 initials: 'SL', color: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/25', ring: 'shadow-[0_0_0_2.5px_rgba(16,185,129,0.5)]' },
  ops_ai_expert:     { name: 'Dr. Ravi Subramaniam', title: 'Operating Principal – AI Practice', initials: 'RS', color: 'bg-rose-500/15 text-rose-300 border-rose-500/25',       ring: 'shadow-[0_0_0_2.5px_rgba(244,63,94,0.5)]' },
};
const DEFAULT_PERSONA = { name: 'Panel', title: 'Buyer Panel', initials: 'P', color: 'bg-muted/15 text-muted border-border', ring: '' };
const PANEL_ORDER = ['panel_lead', 'pe_partner', 'technical_cfo', 'corp_dev', 'operating_partner', 'ops_ai_expert'];

// ─── Parsing helpers ──────────────────────────────────────────────────────────

function extractTopic(content) {
  if (!content) return null;
  // Explicit TAG: prefix
  const tagMatch = content.match(/\bTAG:\s*(.+?)(?:\n|$)/i);
  if (tagMatch) return tagMatch[1].trim().slice(0, 65);
  // First bold phrase (short enough to be a topic)
  const boldMatch = content.match(/\*\*(.{5,55}?)\*\*/);
  if (boldMatch) return boldMatch[1];
  // First question sentence
  const qMatch = content.match(/([A-Z][^.!?\n]{15,75}\?)/);
  if (qMatch) {
    const t = qMatch[1].trim();
    return t.length > 65 ? t.slice(0, 62) + '…' : t;
  }
  // First line fallback
  const first = content.replace(/\*\*/g, '').split('\n')[0].trim();
  return first.length > 65 ? first.slice(0, 62) + '…' : first || null;
}

function parseFeedback(content) {
  if (!content) return null;
  const scoreMatch = content.match(/[Ss]core[:\s]+(\d+(?:\.\d+)?)(?:\s*\/\s*10)?/);
  if (!scoreMatch) return null;
  const score = parseFloat(scoreMatch[1]);

  const workedMatch = content.match(/[Ww]hat\s+worked[:\s*_]+([^\n]+)/);
  const worked = workedMatch ? workedMatch[1].replace(/\*\*/g, '').replace(/^[:\s]+/, '').trim() : '';

  const weakMatch =
    content.match(/[Ww]hat\s+(?:was\s+)?weak[:\s*_]+([^\n]+)/) ||
    content.match(/[Ii]mprov(?:e|ement)[:\s*_]+([^\n]+)/);
  const weak = weakMatch ? weakMatch[1].replace(/\*\*/g, '').replace(/^[:\s]+/, '').trim() : '';

  const direction = /follow.?up/i.test(content) ? 'Follow-up →' : 'Moving on →';
  return { score, worked, weak, direction };
}

function parseAvgScore(messages) {
  const scores = [];
  for (const m of messages) {
    if (m.role !== 'assistant') continue;
    const match = m.content?.match(/[Ss]core[:\s]+(\d+(?:\.\d+)?)(?:\s*\/\s*10)?/);
    if (match) scores.push(parseFloat(match[1]));
  }
  if (!scores.length) return null;
  return (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1);
}

function scoreTrend(messages) {
  const scores = [];
  for (const m of messages) {
    if (m.role !== 'assistant') continue;
    const match = m.content?.match(/[Ss]core[:\s]+(\d+(?:\.\d+)?)(?:\s*\/\s*10)?/);
    if (match) scores.push(parseFloat(match[1]));
  }
  if (scores.length < 3) return null;
  const recent = scores.slice(-2);
  const older = scores.slice(0, -2);
  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
  if (recentAvg > olderAvg + 0.4) return 'up';
  if (recentAvg < olderAvg - 0.4) return 'down';
  return 'flat';
}

function getLastPanelSpeaker(messages) {
  for (let i = messages.length - 1; i >= 0; i--) {
    if (messages[i].role === 'assistant' && messages[i].speaker) return messages[i].speaker;
  }
  return 'panel_lead';
}

// ─── Elapsed timer ────────────────────────────────────────────────────────────

function ElapsedTimer({ active }) {
  const [secs, setSecs] = useState(0);
  const ref = useRef(null);

  useEffect(() => {
    if (!active) return;
    ref.current = setInterval(() => setSecs(s => s + 1), 1000);
    return () => clearInterval(ref.current);
  }, [active]);

  if (!active) return null;
  const m = String(Math.floor(secs / 60)).padStart(2, '0');
  const s = String(secs % 60).padStart(2, '0');
  return (
    <span className="text-xs font-mono text-muted tabular-nums">{m}:{s}</span>
  );
}

// ─── Sidebar ──────────────────────────────────────────────────────────────────

function Sidebar({ currentSpeaker, messages, started }) {
  const avgScore = parseAvgScore(messages);
  const trend = scoreTrend(messages);
  const questionsAsked = messages.filter(m => m.role === 'assistant').length;
  const avg = avgScore ? parseFloat(avgScore) : null;
  const trendLabel = trend === 'up' ? '↑ Improving' : trend === 'down' ? '↓ Declining' : trend === 'flat' ? '→ Steady' : '—';

  return (
    <aside className="hidden lg:flex w-52 shrink-0 border-r border-border/60 flex-col overflow-y-auto">
      <div className="p-4 flex-1">
        <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-3">Buyer Panel</p>
        <div className="space-y-1">
          {PANEL_ORDER.map(key => {
            const p = PERSONAS[key];
            const isActive = key === currentSpeaker;
            return (
              <div
                key={key}
                className={`flex items-center gap-2.5 px-2 py-2 rounded-lg transition-all duration-200 ${
                  isActive ? 'bg-primary/8' : 'opacity-35'
                }`}
              >
                <div
                  className={`w-8 h-8 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0 transition-all duration-200 ${p.color} ${isActive ? p.ring : ''}`}
                >
                  {p.initials}
                </div>
                <div className="min-w-0">
                  <p className={`text-xs font-semibold truncate leading-tight ${isActive ? 'text-foreground' : 'text-muted'}`}>
                    {p.name.split(' ')[0]}
                  </p>
                  {isActive ? (
                    <p className="text-[10px] font-bold text-primary uppercase tracking-wider leading-tight">Speaking</p>
                  ) : (
                    <p className="text-[10px] text-muted/60 truncate leading-tight">{p.title.split(',')[0]}</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {started && (
        <div className="m-3 glass rounded-xl p-3 border border-border/50">
          <p className="text-[10px] font-bold uppercase tracking-wider text-muted mb-2.5">Session</p>
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-muted">Questions</span>
              <span className="text-[11px] font-semibold text-foreground">{questionsAsked}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-muted">Avg Score</span>
              <span className={`text-[11px] font-semibold ${avg === null ? 'text-muted' : avg >= 7 ? 'text-emerald-400' : avg >= 5 ? 'text-amber-400' : 'text-red-400'}`}>
                {avg !== null ? `${avgScore}/10` : '—'}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[11px] text-muted">Trend</span>
              <span className={`text-[11px] font-semibold ${trend === 'up' ? 'text-emerald-400' : trend === 'down' ? 'text-red-400' : 'text-muted'}`}>
                {trendLabel}
              </span>
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

// ─── Message components ───────────────────────────────────────────────────────

function FeedbackCard({ feedback }) {
  const { score, worked, weak, direction } = feedback;
  const scoreColor =
    score >= 7 ? 'bg-emerald-500 text-white' :
    score >= 5 ? 'bg-amber-500 text-white' :
                 'bg-red-500 text-white';

  return (
    <div className="ml-11 mt-2 rounded-xl border border-border/50 bg-surface/60 px-3 py-2.5 flex items-start gap-3">
      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${scoreColor}`}>
        {Number.isInteger(score) ? score : score.toFixed(1)}
      </div>
      <div className="flex-1 min-w-0 space-y-0.5">
        {worked && (
          <p className="text-[11px] text-emerald-400 leading-snug">
            <span className="font-semibold mr-1">✓</span>{worked}
          </p>
        )}
        {weak && (
          <p className="text-[11px] text-amber-400 leading-snug">
            <span className="font-semibold mr-1">△</span>{weak}
          </p>
        )}
        {!worked && !weak && (
          <p className="text-[11px] text-muted">Score recorded</p>
        )}
      </div>
      <span className="text-[10px] text-muted font-medium shrink-0 pt-0.5">{direction}</span>
    </div>
  );
}

function TopicTag({ topic }) {
  if (!topic) return null;
  return (
    <div className="ml-11 mt-1.5">
      <span className="inline-flex items-center gap-1.5 text-[10px] font-medium text-muted/80 border border-border/40 rounded-full px-2.5 py-0.5 bg-surface/40">
        <span className="w-1 h-1 rounded-full bg-primary/50 shrink-0" />
        {topic}
      </span>
    </div>
  );
}

function Message({ role, content, speaker, isStreaming }) {
  const isPanel = role === 'assistant';

  if (!isPanel) {
    return (
      <div className="flex justify-end animate-slide-up">
        <div className="max-w-[78%]">
          <div
            className="rounded-2xl rounded-tr-sm px-4 py-3 border border-white/6"
            style={{ backgroundColor: '#1A2038' }}
          >
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{content}</p>
          </div>
          <p className="text-xs text-muted mt-1.5 text-right">Your answer</p>
        </div>
      </div>
    );
  }

  const persona = PERSONAS[speaker] || DEFAULT_PERSONA;
  const feedback = !isStreaming && content ? parseFeedback(content) : null;
  const topic = !isStreaming && content ? extractTopic(content) : null;

  return (
    <div className="animate-slide-up">
      {/* Persona header */}
      <div className="flex items-center gap-2.5 mb-2">
        <div className={`w-8 h-8 rounded-full border flex items-center justify-center text-[11px] font-bold shrink-0 ${persona.color}`}>
          {persona.initials}
        </div>
        <div className="flex items-baseline gap-2 min-w-0">
          <span className="text-xs font-semibold text-foreground">{persona.name}</span>
          <span className="text-xs text-muted truncate">{persona.title}</span>
        </div>
      </div>

      {/* Message card with blue left border */}
      <div className="ml-11">
        <div className="border-l-2 border-primary/50 pl-3">
          <div className="glass rounded-xl rounded-tl-sm px-4 py-3">
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
              {content}
              {isStreaming && (
                <span className="inline-block w-1.5 h-4 bg-primary animate-pulse ml-0.5 align-middle rounded-sm" />
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Topic tag */}
      {!isStreaming && topic && <TopicTag topic={topic} />}

      {/* Feedback card */}
      {feedback && <FeedbackCard feedback={feedback} />}
    </div>
  );
}

// ─── Previous Rounds modal ────────────────────────────────────────────────────

function PreviousRoundsModal({ rounds, sessionId, currentRound, onClose }) {
  const [expanded, setExpanded] = useState(null);
  const [roundMessages, setRoundMessages] = useState({});
  const [loading, setLoading] = useState(null);

  async function loadMessages(round) {
    if (roundMessages[round]) { setExpanded(round); return; }
    setLoading(round);
    const res = await fetch(`/api/sessions/${sessionId}/messages?round=${round}`);
    if (res.ok) {
      const { messages } = await res.json();
      setRoundMessages(prev => ({
        ...prev,
        [round]: messages.filter(m => m.role === 'user' || m.role === 'assistant'),
      }));
    }
    setExpanded(round);
    setLoading(null);
  }

  const prevRounds = rounds.filter(r => r.round < currentRound);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="rounded-2xl border border-border/60 shadow-2xl w-full max-w-xl mx-4 flex flex-col max-h-[80vh]"
        style={{ background: '#0f172a' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/60 shrink-0">
          <div>
            <h2 className="text-sm font-bold text-foreground">Previous Rounds</h2>
            <p className="text-xs text-muted mt-0.5">{prevRounds.length} round{prevRounds.length !== 1 ? 's' : ''} completed</p>
          </div>
          <button onClick={onClose} className="text-muted hover:text-foreground transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Round list */}
        <div className="overflow-y-auto flex-1 divide-y divide-border/40">
          {prevRounds.length === 0 && (
            <div className="px-6 py-10 text-center text-sm text-muted">No previous rounds yet.</div>
          )}
          {prevRounds.map(r => {
            const isOpen = expanded === r.round;
            const msgs = roundMessages[r.round] || [];
            const isLoading = loading === r.round;
            const scoreColor = r.avgScore === null ? 'text-muted'
              : parseFloat(r.avgScore) >= 7 ? 'text-emerald-400'
              : parseFloat(r.avgScore) >= 5 ? 'text-amber-400'
              : 'text-red-400';

            return (
              <div key={r.round}>
                {/* Round header row */}
                <button
                  onClick={() => isOpen ? setExpanded(null) : loadMessages(r.round)}
                  className="w-full flex items-center justify-between px-6 py-4 hover:bg-surface/40 transition-colors text-left"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                      <span className="text-xs font-bold text-primary">{r.round}</span>
                    </div>
                    <div>
                      <p className="text-xs font-semibold text-foreground">Round {r.round}</p>
                      <p className="text-[10px] text-muted mt-0.5">
                        {new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                        {' · '}{r.questions} question{r.questions !== 1 ? 's' : ''}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    {r.avgScore !== null && (
                      <span className={`text-xs font-semibold ${scoreColor}`}>{r.avgScore}/10</span>
                    )}
                    <svg
                      className={`w-3.5 h-3.5 text-muted transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      fill="none" stroke="currentColor" viewBox="0 0 24 24"
                    >
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </button>

                {/* Transcript accordion */}
                {isOpen && (
                  <div className="px-6 pb-4 space-y-3 border-t border-border/40 pt-3">
                    {isLoading && (
                      <div className="flex items-center gap-2 text-xs text-muted py-4">
                        <div className="w-3.5 h-3.5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                        Loading transcript…
                      </div>
                    )}
                    {!isLoading && msgs.map((m, i) => {
                      const isPanel = m.role === 'assistant';
                      return (
                        <div key={m.id || i} className={`text-[11px] leading-relaxed rounded-lg px-3 py-2 ${
                          isPanel
                            ? 'bg-primary/5 border-l-2 border-primary/40 text-foreground/80'
                            : 'bg-surface/60 text-muted text-right'
                        }`}>
                          {m.content?.slice(0, 300)}{m.content?.length > 300 ? '…' : ''}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// ─── Pause modal ─────────────────────────────────────────────────────────────

function PauseModal({ onResume, onReviewAnalysis, onEnd, streaming }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-fade-in">
      <div
        className="rounded-2xl p-8 max-w-sm w-full mx-4 border border-border/60 shadow-2xl"
        style={{ background: '#0f172a' }}
      >
        {/* Header */}
        <div className="flex items-center gap-3 mb-2">
          <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
          <h2 className="text-base font-bold text-foreground">Session Paused</h2>
        </div>
        <p className="text-xs text-muted mb-7 leading-relaxed pl-5">
          Your Q&A session is preserved. Resume when ready, or step back to review your analysis first.
        </p>

        {/* Actions */}
        <div className="space-y-2.5">
          <button
            onClick={onResume}
            className="btn-primary w-full py-2.5 text-sm rounded-xl"
          >
            Resume Q&A
          </button>
          <button
            onClick={onReviewAnalysis}
            className="w-full py-2.5 text-sm text-foreground-dim hover:text-foreground border border-border/60 hover:border-border rounded-xl transition-colors bg-surface/40 hover:bg-surface-light"
          >
            Review Analysis →
          </button>
          <button
            onClick={onEnd}
            disabled={streaming}
            className="w-full py-2.5 text-sm text-red-400 hover:text-red-300 border border-red-500/20 hover:border-red-500/40 rounded-xl transition-colors disabled:opacity-40"
          >
            End Session &amp; Debrief
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Resume banner ────────────────────────────────────────────────────────────

function ResumeBanner({ qaCount, lastSpeaker, onDebrief, streaming }) {
  const persona = PERSONAS[lastSpeaker] || DEFAULT_PERSONA;
  const textColor = persona.color.split(' ').find(c => c.startsWith('text-')) || 'text-muted';
  return (
    <div className="glass rounded-xl px-4 py-3 border-primary/20 flex items-center justify-between gap-4 mb-2">
      <div className="flex items-center gap-3">
        <div className="w-2 h-2 rounded-full bg-primary animate-pulse shrink-0" />
        <div>
          <p className="text-xs font-semibold text-foreground">
            Resuming — {qaCount} exchange{qaCount !== 1 ? 's' : ''} completed
          </p>
          <p className="text-xs text-muted mt-0.5">
            Last: <span className={`font-medium ${textColor}`}>{persona.name}</span>
            {' '}· Continue below or end for debrief.
          </p>
        </div>
      </div>
      <button
        onClick={onDebrief}
        disabled={streaming}
        className="text-xs text-muted hover:text-red-400 transition-colors shrink-0 disabled:opacity-40"
      >
        End & Debrief
      </button>
    </div>
  );
}

// ─── Voice mode ───────────────────────────────────────────────────────────────
// WebRTC logic is unchanged. Added onSpeakerChange callback + new mic visuals.

function VoiceMode({ sessionId, session, initialSpeaker, onSpeakerChange, onEnd }) {
  const [status, setStatus] = useState('idle');
  const [transcript, setTranscript] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState(initialSpeaker || 'panel_lead');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [userSpeaking, setUserSpeaking] = useState(false);

  const pcRef = useRef(null);
  const dcRef = useRef(null);
  const audioRef = useRef(null);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [transcript]);

  useEffect(() => {
    return () => { disconnect(); };
  }, []);

  async function connect() {
    setStatus('connecting');
    try {
      const res = await fetch(`/api/sessions/${sessionId}/voice/start`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ persona: currentSpeaker }),
      });

      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error || 'Failed to start voice session');
        setStatus('error');
        return;
      }

      const { token } = await res.json();
      if (!token) { toast.error('No session token received'); setStatus('error'); return; }

      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioRef.current = audioEl;
      pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onmessage = (e) => {
        try { handleRealtimeEvent(JSON.parse(e.data)); } catch { /* ignore */ }
      };

      dc.onopen = () => {
        dc.send(JSON.stringify({ type: 'response.create' }));
      };

      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);

      const sdpRes = await fetch('https://api.openai.com/v1/realtime?model=gpt-4o-realtime-preview-2024-12-17', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/sdp',
        },
        body: offer.sdp,
      });

      if (!sdpRes.ok) { toast.error('WebRTC negotiation failed'); setStatus('error'); return; }

      await pc.setRemoteDescription({ type: 'answer', sdp: await sdpRes.text() });
      setStatus('connected');
    } catch (err) {
      console.error('Voice connect error:', err);
      toast.error('Could not access microphone or connect to voice service.');
      setStatus('error');
    }
  }

  function handleRealtimeEvent(event) {
    switch (event.type) {
      case 'response.audio_transcript.delta':
        setIsSpeaking(true);
        setTranscript(prev => {
          const last = prev[prev.length - 1];
          if (last?.role === 'assistant' && last.streaming) {
            return [...prev.slice(0, -1), { ...last, content: last.content + (event.delta || '') }];
          }
          return [...prev, { id: Date.now(), role: 'assistant', speaker: currentSpeaker, content: event.delta || '', streaming: true }];
        });
        break;

      case 'response.audio_transcript.done':
        setIsSpeaking(false);
        setTranscript(prev => prev.map(m => m.streaming ? { ...m, streaming: false } : m));
        if (event.transcript) {
          const lower = event.transcript.toLowerCase();
          for (const [key, p] of Object.entries(PERSONAS)) {
            if (lower.startsWith(p.name.split(' ')[0].toLowerCase() + ':')) {
              setCurrentSpeaker(key);
              onSpeakerChange?.(key);
              break;
            }
          }
        }
        break;

      case 'input_audio_buffer.speech_started':
        setUserSpeaking(true);
        break;

      case 'input_audio_buffer.speech_stopped':
        setUserSpeaking(false);
        break;

      case 'conversation.item.input_audio_transcription.completed':
        if (event.transcript?.trim()) {
          setTranscript(prev => [...prev, { id: Date.now(), role: 'user', content: event.transcript }]);
        }
        break;

      default:
        break;
    }
  }

  function disconnect() {
    dcRef.current?.close();
    pcRef.current?.close();
    if (audioRef.current) audioRef.current.srcObject = null;
    pcRef.current = null;
    dcRef.current = null;
  }

  function handleEnd() {
    disconnect();
    onEnd();
  }

  const persona = PERSONAS[currentSpeaker] || DEFAULT_PERSONA;

  // Idle — large start screen
  if (status === 'idle') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-8 text-center px-6">
        <div className={`w-24 h-24 rounded-2xl border-2 flex items-center justify-center text-2xl font-bold ${persona.color}`}>
          {persona.initials}
        </div>
        <div>
          <p className="text-base font-semibold text-foreground">{persona.name} is ready</p>
          <p className="text-sm text-muted mt-1.5 leading-relaxed max-w-xs mx-auto">
            Your microphone will be used for live conversation. Prior Q&A history is loaded.
          </p>
        </div>
        <button onClick={connect} className="btn-primary px-8 py-3 text-base rounded-xl">
          Start Voice Session
        </button>
        <p className="text-xs text-muted">Say "debrief now" to end Q&A</p>
      </div>
    );
  }

  if (status === 'connecting') {
    return (
      <div className="flex-1 flex items-center justify-center gap-3 text-muted text-sm">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        Connecting to panel…
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center px-6">
        <p className="text-red-400 text-sm">Connection failed. Check microphone permissions and try again.</p>
        <button onClick={() => setStatus('idle')} className="text-sm text-primary hover:underline">
          Try again
        </button>
      </div>
    );
  }

  // Connected
  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Transcript */}
      <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
        {transcript.length === 0 && (
          <div className="text-center text-sm text-muted pt-16">
            <div className="w-8 h-8 border-2 border-primary/30 border-t-primary rounded-full animate-spin mx-auto mb-4" />
            The panel will begin shortly…
          </div>
        )}
        {transcript.map(msg => (
          <Message key={msg.id} role={msg.role} content={msg.content} speaker={msg.speaker} isStreaming={msg.streaming} />
        ))}
        <div ref={bottomRef} />
      </div>

      {/* Voice status bar + mic visual */}
      <div className="border-t border-border/60 bg-surface/40 backdrop-blur-md px-6 py-4 flex items-center justify-between gap-4 shrink-0">
        <p className="text-xs text-muted">Say "debrief now" to end Q&A</p>

        {/* Mic visual */}
        <div className="flex flex-col items-center gap-1.5">
          <div className="relative flex items-center justify-center">
            {/* Gold pulsing ring when user is speaking */}
            {userSpeaking && (
              <span className="absolute inset-0 rounded-full animate-ping bg-amber-400/30" />
            )}
            <div className={`w-14 h-14 rounded-full flex items-center justify-center transition-all duration-200 ${
              userSpeaking
                ? 'bg-amber-500/20 border-2 border-amber-400 shadow-[0_0_16px_rgba(251,191,36,0.35)]'
                : isSpeaking
                ? 'bg-primary/15 border-2 border-primary/50'
                : 'bg-surface-light border-2 border-border/60'
            }`}>
              <svg className={`w-6 h-6 transition-colors ${userSpeaking ? 'text-amber-400' : isSpeaking ? 'text-primary' : 'text-muted'}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                  d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
              </svg>
            </div>
          </div>
          <span className="text-[10px] text-muted">
            {userSpeaking ? 'You\u2019re speaking' : isSpeaking ? 'Panel speaking' : 'Listening\u2026'}
          </span>
        </div>

        <button
          onClick={handleEnd}
          className="text-xs border border-red-500/40 text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors"
        >
          End session
        </button>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QAPage() {
  const router = useRouter();
  const { id } = useParams();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('text');

  const [started, setStarted] = useState(false);
  const [isResuming, setIsResuming] = useState(false);
  const [paused, setPaused] = useState(false);
  const [showPreviousRounds, setShowPreviousRounds] = useState(false);
  const [previousRounds, setPreviousRounds] = useState([]);
  const [focusTopic, setFocusTopic] = useState('');
  const [messages, setMessages] = useState([]);
  const [answer, setAnswer] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState('panel_lead');
  const [ended, setEnded] = useState(false);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const load = useCallback(async () => {
    const [sessionRes, messagesRes] = await Promise.all([
      fetch(`/api/sessions/${id}`),
      fetch(`/api/sessions/${id}/messages`),
    ]);

    if (sessionRes.status === 401) { router.replace('/login'); return; }
    if (!sessionRes.ok) { router.replace('/dashboard'); return; }

    const { session } = await sessionRes.json();
    setSession(session);

    if (messagesRes.ok) {
      const { messages: existing } = await messagesRes.json();
      const part3Messages = (existing || []).filter(m => m.phase === 'part3' || m.phase === 'part4');

      if (part3Messages.length > 0) {
        const displayMessages = part3Messages.filter(m => m.role === 'user' || m.role === 'assistant');
        setMessages(displayMessages);
        setStarted(true);
        if (session.status === 'part4' || session.status === 'complete') {
          setEnded(true);
        } else {
          setIsResuming(true);
        }
        setCurrentSpeaker(getLastPanelSpeaker(displayMessages));
      }
    }

    // Read ?focus= from URL (set by "Practice This →" on attack zone cards)
    const focus = new URLSearchParams(window.location.search).get('focus') || '';
    if (focus) setFocusTopic(decodeURIComponent(focus));

    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  async function streamResponse(action, userMessage) {
    setStreaming(true);
    setIsResuming(false);
    const streamId = Date.now();
    setMessages(prev => [...prev, {
      id: streamId, role: 'assistant', content: '', speaker: currentSpeaker, streaming: true,
    }]);

    try {
      const body = { action, activeSpeaker: currentSpeaker };
      if (userMessage) body.message = userMessage;
      if (action === 'start_qa' && focusTopic) body.focus_topic = focusTopic;

      const res = await fetch(`/api/sessions/${id}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const { error } = await res.json();
        toast.error(error || 'Request failed');
        setMessages(prev => prev.filter(m => m.id !== streamId));
        setStreaming(false);
        return;
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let fullText = '';
      let detectedSpeaker = currentSpeaker;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop();
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          try {
            const data = JSON.parse(line.slice(6));
            if (data.error) { toast.error(data.error); break; }
            if (data.text) {
              fullText += data.text;
              setMessages(prev => prev.map(m => m.id === streamId ? { ...m, content: fullText } : m));
            }
            if (data.done) detectedSpeaker = data.speaker || currentSpeaker;
          } catch { /* skip */ }
        }
      }

      setMessages(prev => prev.map(m =>
        m.id === streamId ? { ...m, content: fullText, speaker: detectedSpeaker, streaming: false } : m
      ));
      setCurrentSpeaker(detectedSpeaker);
    } catch {
      toast.error('Connection lost. Please try again.');
      setMessages(prev => prev.filter(m => m.id !== streamId));
    } finally {
      setStreaming(false);
    }
  }

  async function handleStart() {
    setStarted(true);
    await streamResponse('start_qa');
  }

  async function handleSubmit(e) {
    e?.preventDefault();
    const text = answer.trim();
    if (!text || streaming) return;
    setAnswer('');
    setMessages(prev => [...prev, { id: Date.now(), role: 'user', content: text }]);
    await streamResponse('answer', text);
    setTimeout(() => textareaRef.current?.focus(), 100);
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSubmit(); }
  }

  async function handleNewRound() {
    const res = await fetch(`/api/sessions/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'new_round' }),
    });
    if (!res.ok) { toast.error('Failed to start new round'); return; }
    setMessages([]);
    setStarted(false);
    setEnded(false);
    setIsResuming(false);
    setCurrentSpeaker('panel_lead');
    toast.success('New round — begin when ready');
  }

  async function handleOpenPreviousRounds() {
    const res = await fetch(`/api/sessions/${id}/rounds`);
    if (res.ok) {
      const { rounds } = await res.json();
      setPreviousRounds(rounds);
    }
    setShowPreviousRounds(true);
  }

  function handlePause() {
    setPaused(true);
  }

  function handleResume() {
    setPaused(false);
  }

  function handleReviewAnalysis() {
    router.push(`/dashboard/sessions/${id}/analysis?from=qa`);
  }

  async function handleDebrief() {
    setPaused(false);
    if (!confirm('End the Q&A and generate the full debrief?')) return;
    setEnded(true);
    setIsResuming(false);
    await streamResponse('debrief');
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const qaCount = messages.filter(m => m.role === 'user').length;
  const displayMessages = messages.filter(m => m.role === 'user' || m.role === 'assistant');

  return (
    <div className="h-screen flex flex-col overflow-hidden">

      {/* ── Previous Rounds modal ── */}
      {showPreviousRounds && (
        <PreviousRoundsModal
          rounds={previousRounds}
          sessionId={id}
          currentRound={session?.current_round ?? 1}
          onClose={() => setShowPreviousRounds(false)}
        />
      )}

      {/* ── Pause modal ── */}
      {paused && (
        <PauseModal
          onResume={handleResume}
          onReviewAnalysis={handleReviewAnalysis}
          onEnd={handleDebrief}
          streaming={streaming}
        />
      )}

      {/* ── Top bar ── */}
      <header className="border-b border-border/60 bg-surface/40 backdrop-blur-md shrink-0 z-10">
        <div className="h-14 flex items-center justify-between px-4 gap-3">
          {/* Left: back + company */}
          <div className="flex items-center gap-2.5 min-w-0 flex-1">
            <Link
              href={`/dashboard/sessions/${id}/analysis`}
              className="text-muted hover:text-foreground transition-colors shrink-0"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </Link>
            <span className="text-sm font-semibold text-foreground truncate">{session?.company_name}</span>
          </div>

          {/* Center: badge */}
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs font-semibold text-foreground hidden sm:block">Part 3: Live Q&amp;A</span>
          </div>

          {/* Right: timer + controls */}
          <div className="flex items-center gap-2 flex-1 justify-end">
            <ElapsedTimer active={started && !ended} />

            {/* Previous Rounds — always visible once a session exists */}
            {(session?.current_round ?? 1) > 1 && (
              <button
                onClick={handleOpenPreviousRounds}
                className="text-xs border border-border/60 text-muted hover:text-foreground hover:border-border px-3 py-1.5 rounded-lg transition-colors"
              >
                Rounds ↑
              </button>
            )}

            {started && !ended && mode === 'text' && (
              <>
                <button
                  onClick={handleNewRound}
                  disabled={streaming}
                  className="text-xs border border-border/60 text-muted hover:text-foreground hover:border-border px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                >
                  New Round
                </button>
                <button
                  onClick={handlePause}
                  disabled={streaming}
                  className="text-xs border border-border/60 text-muted hover:text-foreground hover:border-border px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                >
                  Pause
                </button>
                <button
                  onClick={handleDebrief}
                  disabled={streaming}
                  className="text-xs border border-red-500/40 text-red-400 hover:bg-red-500/10 px-3 py-1.5 rounded-lg transition-colors disabled:opacity-40"
                >
                  End Q&A
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* ── Body: sidebar + main ── */}
      <div className="flex flex-1 overflow-hidden">

        {/* Sidebar — always rendered, shows voice speaker when in voice mode */}
        <Sidebar currentSpeaker={currentSpeaker} messages={messages} started={started} />

        {/* ── Main content ── */}
        <div className="flex-1 flex flex-col overflow-hidden">

          {/* Voice mode */}
          {mode === 'voice' && (
            <VoiceMode
              sessionId={id}
              session={session}
              initialSpeaker={currentSpeaker}
              onSpeakerChange={setCurrentSpeaker}
              onEnd={() => setMode('text')}
            />
          )}

          {/* Text mode */}
          {mode === 'text' && (
            <>
              {/* Conversation scroll area */}
              <main className="flex-1 overflow-y-auto">
                <div className="max-w-3xl mx-auto px-6 py-8">

                  {/* Start screen */}
                  {!started && (
                    <div className="flex flex-col items-center justify-center min-h-[55vh] text-center gap-7 animate-fade-in">
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-2">
                          {focusTopic ? 'Focused Practice' : 'Part 3'}
                        </p>
                        <h1 className="text-2xl font-bold text-foreground mb-3">
                          {focusTopic ? 'Targeted Q&A' : 'Live Mock Q&A'}
                        </h1>
                        {focusTopic ? (
                          <div className="max-w-sm mx-auto space-y-2">
                            <p className="text-sm text-muted leading-relaxed">
                              The panel will focus exclusively on:
                            </p>
                            <div className="inline-block border border-primary/40 bg-primary/10 rounded-xl px-4 py-2">
                              <p className="text-sm font-semibold text-primary">{focusTopic}</p>
                            </div>
                            <p className="text-xs text-muted">3–5 deep questions on this topic only.</p>
                          </div>
                        ) : (
                          <p className="text-sm text-muted max-w-sm mx-auto leading-relaxed">
                            The buyer panel will question your team on{' '}
                            <span className="text-foreground font-medium">{session?.company_name}</span>.
                            One question at a time.
                          </p>
                        )}
                      </div>

                      {!focusTopic && (
                        <div className="glass rounded-2xl p-4 flex flex-wrap justify-center gap-2 max-w-md">
                          {PANEL_ORDER.slice(0, 5).map(key => {
                            const p = PERSONAS[key];
                            return (
                              <span key={key} className={`text-xs px-2.5 py-1 rounded-full border font-medium ${p.color}`}>
                                {p.initials} · {p.name.split(' ')[0]}
                              </span>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex gap-3">
                        <button onClick={handleStart} className="btn-primary px-7 py-2.5 text-sm rounded-xl">
                          {focusTopic ? 'Begin Focused Q&A' : 'Begin Q&A (Text)'}
                        </button>
                        {!focusTopic && (
                          <button onClick={() => setMode('voice')} className="btn-ghost px-7 py-2.5 text-sm rounded-xl">
                            Begin Q&A (Voice)
                          </button>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Conversation thread */}
                  {started && (
                    <div className="space-y-6 pb-4">
                      {isResuming && (
                        <ResumeBanner
                          qaCount={qaCount}
                          lastSpeaker={currentSpeaker}
                          onDebrief={handleDebrief}
                          streaming={streaming}
                        />
                      )}

                      {displayMessages.map(msg => (
                        <Message
                          key={msg.id}
                          role={msg.role}
                          content={msg.content}
                          speaker={msg.speaker}
                          isStreaming={msg.streaming}
                        />
                      ))}
                      <div ref={bottomRef} />
                    </div>
                  )}
                </div>
              </main>

              {/* ── Input bar (text mode, active session) ── */}
              {started && !ended && (
                <div className="border-t border-border/60 bg-surface/40 backdrop-blur-md shrink-0">
                  <div className="max-w-3xl mx-auto px-6 pt-3 pb-4">
                    {/* Mode toggle + hint */}
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center bg-surface border border-border/60 rounded-lg p-0.5 text-xs">
                        <button
                          onClick={() => setMode('text')}
                          className={`px-3 py-1 rounded-md transition-all duration-150 ${
                            mode === 'text' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-foreground'
                          }`}
                        >
                          Type
                        </button>
                        <button
                          onClick={() => setMode('voice')}
                          className={`px-3 py-1 rounded-md transition-all duration-150 flex items-center gap-1.5 ${
                            mode === 'voice' ? 'bg-primary text-white shadow-sm' : 'text-muted hover:text-foreground'
                          }`}
                        >
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                              d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                          </svg>
                          Speak
                        </button>
                      </div>
                      <p className="text-[10px] text-muted/70">
                        Say <span className="italic">"debrief now"</span> to end Q&A
                      </p>
                    </div>

                    {/* Text input */}
                    <form onSubmit={handleSubmit} className="flex gap-3 items-end">
                      <textarea
                        ref={textareaRef}
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                        onKeyDown={handleKeyDown}
                        disabled={streaming}
                        rows={3}
                        placeholder="Type your answer… (Enter to send, Shift+Enter for new line)"
                        className="flex-1 input rounded-xl resize-none leading-relaxed"
                      />
                      <button
                        type="submit"
                        disabled={!answer.trim() || streaming}
                        className="btn-primary px-4 py-3 rounded-xl shrink-0 h-[calc(3*1.5rem+1.5rem)]"
                      >
                        {streaming ? (
                          <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        ) : (
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                          </svg>
                        )}
                      </button>
                    </form>
                  </div>
                </div>
              )}

              {/* Debrief complete */}
              {ended && !streaming && (
                <div className="border-t border-border/60 shrink-0">
                  <div className="max-w-3xl mx-auto px-6 py-5 flex items-center justify-between gap-4">
                    <p className="text-sm text-muted">Session complete. Your debrief is above.</p>
                    <div className="flex items-center gap-3">
                      <button onClick={handleNewRound} className="btn-ghost text-xs">
                        New Round →
                      </button>
                      <Link href="/dashboard" className="btn-ghost text-xs">
                        Back to Dashboard
                      </Link>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

        </div>{/* end main */}
      </div>{/* end body */}
    </div>
  );
}
