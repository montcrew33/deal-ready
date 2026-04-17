'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

const PERSONAS = {
  panel_lead:        { name: 'Alexandra Chen',       title: 'Managing Partner',                  initials: 'AC', color: 'bg-purple-500/20 text-purple-300 border-purple-500/30' },
  pe_partner:        { name: 'Marcus Webb',           title: 'Senior Partner, Blackridge PE',     initials: 'MW', color: 'bg-blue-500/20 text-blue-300 border-blue-500/30' },
  technical_cfo:     { name: 'Diane Foster',          title: 'Operating CFO, Meridian Capital',   initials: 'DF', color: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30' },
  corp_dev:          { name: 'James Okafor',          title: 'Head of Corp Dev',                  initials: 'JO', color: 'bg-amber-500/20 text-amber-300 border-amber-500/30' },
  operating_partner: { name: 'Sarah Lindqvist',       title: 'Operating Partner',                 initials: 'SL', color: 'bg-green-500/20 text-green-300 border-green-500/30' },
  ops_ai_expert:     { name: 'Dr. Ravi Subramaniam', title: 'Operating Principal – AI Practice', initials: 'RS', color: 'bg-rose-500/20 text-rose-300 border-rose-500/30' },
};
const DEFAULT_PERSONA = { name: 'Panel', title: 'Buyer Panel', initials: '?', color: 'bg-muted/20 text-muted border-border' };

// ─── Text Q&A helpers ────────────────────────────────────────────────────────

function PersonaBadge({ speakerKey, streaming }) {
  const p = PERSONAS[speakerKey] || DEFAULT_PERSONA;
  return (
    <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-medium ${p.color}`}>
      <span className="font-bold">{p.initials}</span>
      <span>{p.name}</span>
      {streaming && <span className="opacity-60">· speaking…</span>}
    </div>
  );
}

function Message({ role, content, speaker, isStreaming }) {
  const isPanel = role === 'assistant';
  if (!isPanel) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[75%]">
          <div className="bg-primary/10 border border-primary/20 rounded-2xl rounded-tr-sm px-4 py-3">
            <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{content}</p>
          </div>
          <p className="text-xs text-muted mt-1 text-right">Your answer</p>
        </div>
      </div>
    );
  }
  const persona = PERSONAS[speaker] || DEFAULT_PERSONA;
  return (
    <div className="flex gap-3">
      <div className={`shrink-0 w-8 h-8 rounded-full border flex items-center justify-center text-xs font-bold ${persona.color}`}>
        {persona.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-foreground">{persona.name}</span>
          <span className="text-xs text-muted">{persona.title}</span>
        </div>
        <div className="glass rounded-2xl rounded-tl-sm px-4 py-3">
          <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">
            {content}
            {isStreaming && <span className="inline-block w-2 h-4 bg-primary animate-pulse ml-1 align-middle" />}
          </p>
        </div>
      </div>
    </div>
  );
}

// ─── Voice mode component ─────────────────────────────────────────────────────

function VoiceMode({ sessionId, session, onEnd }) {
  const [status, setStatus] = useState('idle'); // idle | connecting | connected | error
  const [transcript, setTranscript] = useState([]);
  const [currentSpeaker, setCurrentSpeaker] = useState('panel_lead');
  const [isSpeaking, setIsSpeaking] = useState(false); // AI speaking
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
      // Get ephemeral token from our backend
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

      // WebRTC setup
      const pc = new RTCPeerConnection();
      pcRef.current = pc;

      // Remote audio → speaker
      const audioEl = document.createElement('audio');
      audioEl.autoplay = true;
      audioRef.current = audioEl;
      pc.ontrack = (e) => { audioEl.srcObject = e.streams[0]; };

      // Local mic
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach(t => pc.addTrack(t, stream));

      // Data channel for events
      const dc = pc.createDataChannel('oai-events');
      dcRef.current = dc;

      dc.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          handleRealtimeEvent(event);
        } catch { /* ignore */ }
      };

      // Once data channel opens, trigger the AI to speak first
      dc.onopen = () => {
        dc.send(JSON.stringify({ type: 'response.create' }));
      };

      // SDP offer → OpenAI
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

      if (!sdpRes.ok) {
        toast.error('WebRTC negotiation failed');
        setStatus('error');
        return;
      }

      const answer = { type: 'answer', sdp: await sdpRes.text() };
      await pc.setRemoteDescription(answer);

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
        // AI is speaking — update last assistant transcript entry
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
        // Detect speaker from transcript
        if (event.transcript) {
          const lower = event.transcript.toLowerCase();
          for (const [key, p] of Object.entries(PERSONAS)) {
            if (lower.startsWith(p.name.split(' ')[0].toLowerCase() + ':')) {
              setCurrentSpeaker(key);
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
    if (audioRef.current) { audioRef.current.srcObject = null; }
    pcRef.current = null;
    dcRef.current = null;
  }

  function handleEnd() {
    disconnect();
    onEnd();
  }

  const persona = PERSONAS[currentSpeaker] || DEFAULT_PERSONA;

  return (
    <div className="flex flex-col h-full">
      {/* Voice status bar */}
      <div className="flex items-center justify-between px-6 py-3 border-b border-border">
        <PersonaBadge speakerKey={currentSpeaker} streaming={isSpeaking} />
        <div className="flex items-center gap-3">
          {status === 'connected' && (
            <div className="flex items-center gap-1.5 text-xs text-muted">
              {userSpeaking
                ? <><div className="w-2 h-2 rounded-full bg-success animate-pulse" /> You're speaking</>
                : isSpeaking
                  ? <><div className="w-2 h-2 rounded-full bg-primary animate-pulse" /> Panel speaking</>
                  : <><div className="w-2 h-2 rounded-full bg-border" /> Listening…</>
              }
            </div>
          )}
          {status === 'connected' && (
            <button onClick={handleEnd} className="text-xs text-muted hover:text-danger transition-colors">
              End session
            </button>
          )}
        </div>
      </div>

      {/* Connect screen */}
      {status === 'idle' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center px-6">
          <div className={`w-20 h-20 rounded-full border-2 flex items-center justify-center text-2xl font-bold ${persona.color}`}>
            {persona.initials}
          </div>
          <div>
            <p className="text-foreground font-medium">{persona.name} is ready</p>
            <p className="text-sm text-muted mt-1">Your microphone will be used for the live session.</p>
          </div>
          <button
            onClick={connect}
            className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors"
          >
            Start Voice Session
          </button>
        </div>
      )}

      {status === 'connecting' && (
        <div className="flex-1 flex items-center justify-center gap-3 text-muted">
          <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          Connecting…
        </div>
      )}

      {status === 'error' && (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
          <p className="text-danger text-sm">Connection failed. Check your microphone permissions and try again.</p>
          <button onClick={() => setStatus('idle')} className="text-sm text-primary hover:underline">Try again</button>
        </div>
      )}

      {/* Live transcript */}
      {status === 'connected' && (
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          {transcript.length === 0 && (
            <div className="text-center text-sm text-muted pt-10">
              The panel will begin speaking shortly…
            </div>
          )}
          {transcript.map(msg => (
            <Message key={msg.id} role={msg.role} content={msg.content} speaker={msg.speaker} isStreaming={msg.streaming} />
          ))}
          <div ref={bottomRef} />
        </div>
      )}
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function QAPage() {
  const router = useRouter();
  const { id } = useParams();

  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mode, setMode] = useState('text'); // 'text' | 'voice'

  // Text Q&A state
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState([]);
  const [answer, setAnswer] = useState('');
  const [streaming, setStreaming] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState('panel_lead');
  const [ended, setEnded] = useState(false);

  const bottomRef = useRef(null);
  const textareaRef = useRef(null);

  const load = useCallback(async () => {
    const res = await fetch(`/api/sessions/${id}`);
    if (res.status === 401) { router.replace('/login'); return; }
    if (!res.ok) { router.replace('/dashboard'); return; }
    const { session } = await res.json();
    setSession(session);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { load(); }, [load]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, streaming]);

  async function streamResponse(action, userMessage) {
    setStreaming(true);
    const streamId = Date.now();
    setMessages(prev => [...prev, { id: streamId, role: 'assistant', content: '', speaker: currentSpeaker, streaming: true }]);

    try {
      const body = { action, activeSpeaker: currentSpeaker };
      if (userMessage) body.message = userMessage;

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
          const payload = line.slice(6);
          try {
            const data = JSON.parse(payload);
            if (data.error) { toast.error(data.error); break; }
            if (data.text) {
              fullText += data.text;
              setMessages(prev => prev.map(m => m.id === streamId ? { ...m, content: fullText } : m));
            }
            if (data.done) detectedSpeaker = data.speaker || currentSpeaker;
          } catch { /* skip */ }
        }
      }

      setMessages(prev => prev.map(m => m.id === streamId ? { ...m, content: fullText, speaker: detectedSpeaker, streaming: false } : m));
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

  async function handleDebrief() {
    if (!confirm('End the Q&A and generate the full debrief?')) return;
    setEnded(true);
    await streamResponse('debrief');
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Nav */}
      <header className="border-b border-border shrink-0">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href={`/dashboard/sessions/${id}/analysis`} className="text-sm text-muted hover:text-foreground transition-colors">
            ← Analysis
          </Link>
          <div className="flex items-center gap-3">
            <span className="font-semibold text-foreground tracking-tight">Part 3 — Live Q&A</span>
            {/* Mode toggle */}
            <div className="flex items-center bg-surface border border-border rounded-lg p-0.5 text-xs">
              <button
                onClick={() => setMode('text')}
                className={`px-2.5 py-1 rounded-md transition-colors ${mode === 'text' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'}`}
              >
                Text
              </button>
              <button
                onClick={() => setMode('voice')}
                className={`px-2.5 py-1 rounded-md transition-colors ${mode === 'voice' ? 'bg-primary text-white' : 'text-muted hover:text-foreground'}`}
              >
                🎙 Voice
              </button>
            </div>
          </div>
          {mode === 'text' && started && !ended ? (
            <button onClick={handleDebrief} disabled={streaming} className="text-xs text-muted hover:text-danger transition-colors disabled:opacity-40">
              End & Debrief
            </button>
          ) : <div className="w-20" />}
        </div>
      </header>

      {/* Voice mode */}
      {mode === 'voice' && (
        <div className="flex-1 flex flex-col">
          <VoiceMode sessionId={id} session={session} onEnd={() => setMode('text')} />
        </div>
      )}

      {/* Text mode */}
      {mode === 'text' && (
        <>
          <main className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-8">
              {!started ? (
                <div className="flex flex-col items-center justify-center min-h-[60vh] text-center gap-6">
                  <div>
                    <h1 className="text-2xl font-bold text-foreground mb-2">Live Mock Q&A</h1>
                    <p className="text-sm text-muted max-w-md leading-relaxed">
                      The buyer panel will ask one question at a time based on the analysis of{' '}
                      <span className="text-foreground font-medium">{session?.company_name}</span>.
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2 max-w-lg">
                    {Object.entries(PERSONAS).slice(0, 5).map(([key, p]) => (
                      <span key={key} className={`text-xs px-2.5 py-1 rounded-full border ${p.color}`}>{p.name}</span>
                    ))}
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleStart} className="px-6 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 transition-colors">
                      Begin Q&A (Text)
                    </button>
                    <button onClick={() => setMode('voice')} className="px-6 py-3 glass border border-border text-foreground rounded-xl font-medium hover:border-primary/50 transition-colors">
                      🎙 Begin Q&A (Voice)
                    </button>
                  </div>
                </div>
              ) : (
                <div className="space-y-6 pb-4">
                  {messages.map(msg => (
                    <Message key={msg.id} role={msg.role} content={msg.content} speaker={msg.speaker} isStreaming={msg.streaming} />
                  ))}
                  <div ref={bottomRef} />
                </div>
              )}
            </div>
          </main>

          {started && !ended && (
            <div className="border-t border-border shrink-0">
              <div className="max-w-3xl mx-auto px-6 py-4">
                <div className="flex items-center gap-2 mb-2">
                  <PersonaBadge speakerKey={currentSpeaker} streaming={streaming} />
                </div>
                <form onSubmit={handleSubmit} className="flex gap-3 items-end">
                  <textarea
                    ref={textareaRef}
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    onKeyDown={handleKeyDown}
                    disabled={streaming}
                    rows={3}
                    placeholder="Type your answer… (Enter to send, Shift+Enter for new line)"
                    className="flex-1 px-4 py-3 rounded-xl bg-surface border border-border text-foreground placeholder:text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 resize-none transition"
                  />
                  <button
                    type="submit"
                    disabled={!answer.trim() || streaming}
                    className="px-4 py-3 bg-primary text-white rounded-xl font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
                  >
                    {streaming
                      ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      : <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" /></svg>
                    }
                  </button>
                </form>
              </div>
            </div>
          )}

          {ended && !streaming && (
            <div className="border-t border-border shrink-0">
              <div className="max-w-3xl mx-auto px-6 py-4 text-center">
                <p className="text-sm text-muted mb-3">Session complete. Your debrief is above.</p>
                <Link href="/dashboard" className="inline-block px-5 py-2 bg-surface border border-border text-foreground rounded-lg text-sm font-medium hover:border-primary/50 transition-colors">
                  Back to Dashboard
                </Link>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
