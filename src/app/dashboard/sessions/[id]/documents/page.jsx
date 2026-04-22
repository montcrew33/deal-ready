'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

const STATUS_META = {
  setup:      { label: 'Setup',          color: 'text-muted bg-surface border-border' },
  processing: { label: 'Processing',     color: 'text-gold bg-gold-dim border-gold/20' },
  part1:      { label: 'Analysis ready', color: 'text-primary bg-primary-dim border-primary/20' },
  part2:      { label: 'Analysis ready', color: 'text-primary bg-primary-dim border-primary/20' },
  part3:      { label: 'In Q&A',         color: 'text-primary bg-primary-dim border-primary/20' },
  part4:      { label: 'Debrief',        color: 'text-primary bg-primary-dim border-primary/20' },
  complete:   { label: 'Complete',       color: 'text-success bg-success-dim border-success/20' },
};

const DOC_STATUS = {
  pending:    { label: 'Queued',       color: 'text-muted',    dot: 'bg-muted' },
  processing: { label: 'Extracting…',  color: 'text-gold',     dot: 'bg-gold animate-pulse' },
  completed:  { label: 'Ready',        color: 'text-success',  dot: 'bg-success' },
  failed:     { label: 'Failed',       color: 'text-danger',   dot: 'bg-danger' },
};

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

// ── Session History helpers ──────────────────────────────────────────────────

function scoreColor(avg) {
  if (avg === null) return 'text-muted';
  const n = parseFloat(avg);
  if (n >= 8) return 'text-success';
  if (n >= 6) return 'text-gold';
  return 'text-danger';
}

function RoundHistoryCard({ sessionId }) {
  const [rounds, setRounds] = useState([]);
  const [loadingRounds, setLoadingRounds] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [transcripts, setTranscripts] = useState({});
  const [loadingTranscript, setLoadingTranscript] = useState(null);

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/rounds`)
      .then(r => r.ok ? r.json() : { rounds: [] })
      .then(d => { setRounds(d.rounds ?? []); setLoadingRounds(false); });
  }, [sessionId]);

  async function toggleRound(round) {
    if (expanded === round) { setExpanded(null); return; }
    setExpanded(round);
    if (transcripts[round]) return;
    setLoadingTranscript(round);
    const res = await fetch(`/api/sessions/${sessionId}/messages?round=${round}`);
    const data = res.ok ? await res.json() : { messages: [] };
    // Filter out system-injected start prompts (very long user messages)
    const filtered = (data.messages ?? []).filter(m =>
      !(m.role === 'user' && m.content?.length > 600)
    );
    setTranscripts(prev => ({ ...prev, [round]: filtered }));
    setLoadingTranscript(null);
  }

  if (loadingRounds) return null;
  if (rounds.length === 0) return null;

  return (
    <div className="glass rounded-2xl p-6">
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-sm font-semibold text-foreground">Q&amp;A Session History</h2>
          <p className="text-xs text-muted mt-0.5">{rounds.length} round{rounds.length !== 1 ? 's' : ''} completed</p>
        </div>
        <a
          href={`/dashboard/sessions/${sessionId}/qa`}
          className="text-xs text-primary hover:text-primary/80 font-medium transition-colors"
        >
          Open Q&amp;A →
        </a>
      </div>

      <div className="space-y-2">
        {rounds.map(r => (
          <div key={r.round} className="rounded-xl border border-border/60 overflow-hidden">
            {/* Round row */}
            <button
              onClick={() => toggleRound(r.round)}
              className="w-full flex items-center gap-4 px-4 py-3 bg-surface hover:bg-surface-light transition-colors text-left"
            >
              <div className="w-7 h-7 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
                <span className="text-[11px] font-bold text-primary">{r.round}</span>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-foreground">Round {r.round}</p>
                <p className="text-xs text-muted">
                  {formatDate(r.date)} · {r.questions} question{r.questions !== 1 ? 's' : ''}
                </p>
              </div>
              {r.avgScore !== null && (
                <span className={`text-sm font-semibold ${scoreColor(r.avgScore)}`}>
                  {r.avgScore}<span className="text-xs text-muted font-normal">/10</span>
                </span>
              )}
              <svg
                className={`w-4 h-4 text-muted shrink-0 transition-transform duration-200 ${expanded === r.round ? 'rotate-180' : ''}`}
                fill="none" stroke="currentColor" viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {/* Transcript accordion */}
            {expanded === r.round && (
              <div className="border-t border-border/40 bg-surface/60 px-4 py-4 space-y-3 max-h-96 overflow-y-auto">
                {loadingTranscript === r.round ? (
                  <div className="flex items-center justify-center py-6">
                    <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                  </div>
                ) : transcripts[r.round]?.length === 0 ? (
                  <p className="text-xs text-muted text-center py-4">No transcript available</p>
                ) : (
                  transcripts[r.round]?.map((msg, i) => (
                    <div
                      key={i}
                      className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}
                    >
                      <div className={`w-5 h-5 rounded-full shrink-0 flex items-center justify-center text-[9px] font-bold mt-0.5 ${
                        msg.role === 'user'
                          ? 'bg-primary/20 text-primary'
                          : 'bg-surface-light border border-border text-muted'
                      }`}>
                        {msg.role === 'user' ? 'Y' : 'Q'}
                      </div>
                      <div className={`max-w-[85%] px-3 py-2 rounded-xl text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-primary/10 border border-primary/20 text-foreground-dim'
                          : 'bg-surface border border-border/60 text-foreground-dim'
                      }`}>
                        {msg.content}
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function DocumentsPage() {
  const router = useRouter();
  const { id } = useParams();

  const [session, setSession] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  const fetchData = useCallback(async () => {
    const [sessionRes, docsRes] = await Promise.all([
      fetch(`/api/sessions/${id}`),
      fetch(`/api/sessions/${id}/documents`),
    ]);

    if (sessionRes.status === 401) { router.replace('/login'); return; }
    if (!sessionRes.ok) { toast.error('Session not found'); router.replace('/dashboard'); return; }

    const { session } = await sessionRes.json();
    const { documents: docs } = docsRes.ok ? await docsRes.json() : { documents: [] };

    setSession(session);
    setDocuments(docs ?? []);
    setLoading(false);
  }, [id, router]);

  useEffect(() => { fetchData(); }, [fetchData]);

  useEffect(() => {
    const needsPoll = documents.some(d =>
      d.processing_status === 'pending' || d.processing_status === 'processing'
    );

    if (needsPoll && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        const res = await fetch(`/api/sessions/${id}/documents`);
        if (!res.ok) return;
        const { documents: docs } = await res.json();
        setDocuments(docs ?? []);
        const stillPending = docs?.some(d =>
          d.processing_status === 'pending' || d.processing_status === 'processing'
        );
        if (!stillPending) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          const sRes = await fetch(`/api/sessions/${id}`);
          if (sRes.ok) setSession((await sRes.json()).session);
        }
      }, 3000);
    }

    if (!needsPoll && pollRef.current) {
      clearInterval(pollRef.current);
      pollRef.current = null;
    }

    return () => {
      if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null; }
    };
  }, [documents, id]);

  async function uploadFile(file) {
    if (!file) return;
    if (file.type !== 'application/pdf') { toast.error('Only PDF files are accepted'); return; }
    if (file.size > 50 * 1024 * 1024) { toast.error('File too large. Max 50MB.'); return; }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/sessions/${id}/documents`, { method: 'POST', body: formData });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error || 'Upload failed'); return; }
      toast.success('Document uploaded — extraction started');
      setDocuments(prev => [{
        id: data.document.id,
        filename: data.document.filename,
        file_size_bytes: file.size,
        processing_status: 'pending',
        created_at: new Date().toISOString(),
      }, ...prev]);
    } catch {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleFileInput(e) { uploadFile(e.target.files[0]); }
  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    uploadFile(e.dataTransfer.files[0]);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasCompletedDoc = documents.some(d => d.processing_status === 'completed');
  const analysisComplete = !!(session.part2_output);
  const analysisUrl = analysisComplete
    ? `/dashboard/sessions/${id}/analysis`
    : `/dashboard/sessions/${id}/analysis?autostart=1`;
  const analysisLabel = analysisComplete ? 'View Analysis →' : 'Analyze & Prepare →';
  const statusMeta = STATUS_META[session.status] ?? STATUS_META.setup;

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="border-b border-border/60 bg-surface/40 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="flex items-center gap-2 text-sm text-muted hover:text-foreground transition-colors">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Dashboard
          </Link>
          <span className="font-semibold text-foreground tracking-tight text-sm">DealReady</span>
          <div className="w-24" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-6 animate-fade-in">

        {/* Deal header card */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3 flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-xl font-bold text-foreground">{session.company_name}</h1>
                <span className={`badge border ${statusMeta.color}`}>{statusMeta.label}</span>
              </div>

              <div className="flex flex-wrap gap-2">
                {session.industry && (
                  <span className="text-xs text-muted-light bg-surface-light border border-border/60 px-2.5 py-1 rounded-full">
                    {session.industry}
                  </span>
                )}
                {session.likely_buyer_type && (
                  <span className="text-xs text-muted-light bg-surface-light border border-border/60 px-2.5 py-1 rounded-full capitalize">
                    {session.likely_buyer_type.replace(/_/g, ' ')}
                  </span>
                )}
                {session.transaction_context && (
                  <span className="text-xs text-muted-light bg-surface-light border border-border/60 px-2.5 py-1 rounded-full capitalize">
                    {session.transaction_context.replace(/_/g, ' ')}
                  </span>
                )}
                {session.created_at && (
                  <span className="text-xs text-muted/60 px-1 py-1">
                    Created {formatDate(session.created_at)}
                  </span>
                )}
              </div>
            </div>

            <button
              disabled={!hasCompletedDoc}
              onClick={() => router.push(analysisUrl)}
              className="btn-primary shrink-0"
            >
              {analysisLabel}
            </button>
          </div>
        </div>

        {/* Document upload */}
        <div className="glass rounded-2xl p-6">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-sm font-semibold text-foreground">Source Documents</h2>
              <p className="text-xs text-muted mt-0.5">Upload your CIM or information memorandum. PDF only, 50MB max.</p>
            </div>
            {documents.length > 0 && (
              <span className="text-xs text-muted bg-surface-light border border-border px-2 py-1 rounded-full">
                {documents.length} file{documents.length !== 1 ? 's' : ''}
              </span>
            )}
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-all duration-200 ${
              dragOver
                ? 'border-primary bg-primary/5 shadow-glow-sm'
                : 'border-border hover:border-primary/40 hover:bg-surface-light/40'
            } ${uploading ? 'opacity-60 cursor-not-allowed pointer-events-none' : ''}`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="application/pdf"
              className="hidden"
              onChange={handleFileInput}
              disabled={uploading}
            />

            {uploading ? (
              <div className="flex flex-col items-center gap-3">
                <div className="w-7 h-7 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted">Uploading…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-11 h-11 rounded-xl bg-primary/10 border border-primary/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground-dim">
                    {dragOver ? 'Release to upload' : 'Drop your PDF here, or click to browse'}
                  </p>
                  <p className="text-xs text-muted mt-1">PDF · max 50MB</p>
                </div>
              </div>
            )}
          </div>

          {/* Security & Trust Manifest */}
          <div className="mt-4 grid grid-cols-3 gap-3">
            {/* Badge 1 — Encryption */}
            <div
              className="flex flex-col gap-3 px-4 py-4 rounded-xl border"
              style={{ background: '#0f172a', borderColor: 'rgba(79,70,229,0.25)' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.3)' }}
                >
                  <svg className="w-3.5 h-3.5" style={{ color: '#818cf8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                </div>
                <span className="text-[11px] font-semibold tracking-wide" style={{ color: '#818cf8' }}>
                  AES-256 Encrypted
                </span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: '#64748b' }}>
                Documents are isolated in tenant-specific secure storage. No cross-account access is possible.
              </p>
            </div>

            {/* Badge 2 — Zero retention */}
            <div
              className="flex flex-col gap-3 px-4 py-4 rounded-xl border"
              style={{ background: '#0f172a', borderColor: 'rgba(79,70,229,0.25)' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.3)' }}
                >
                  <svg className="w-3.5 h-3.5" style={{ color: '#818cf8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                </div>
                <span className="text-[11px] font-semibold tracking-wide" style={{ color: '#818cf8' }}>
                  Zero Data Retention
                </span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: '#64748b' }}>
                Enterprise API routing guarantees models are never trained on your MNPI. Your materials stay yours.
              </p>
            </div>

            {/* Badge 3 — Ephemeral voice */}
            <div
              className="flex flex-col gap-3 px-4 py-4 rounded-xl border"
              style={{ background: '#0f172a', borderColor: 'rgba(79,70,229,0.25)' }}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: 'rgba(79,70,229,0.15)', border: '1px solid rgba(79,70,229,0.3)' }}
                >
                  <svg className="w-3.5 h-3.5" style={{ color: '#818cf8' }} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                </div>
                <span className="text-[11px] font-semibold tracking-wide" style={{ color: '#818cf8' }}>
                  Ephemeral Voice
                </span>
              </div>
              <p className="text-[11px] leading-relaxed" style={{ color: '#64748b' }}>
                Live audio tokens are generated server-side and expire instantly. Your API keys never touch the client.
              </p>
            </div>
          </div>

          {/* Document list */}
          {documents.length > 0 && (
            <div className="mt-4 space-y-2">
              {documents.map((doc) => {
                const cfg = DOC_STATUS[doc.processing_status] ?? DOC_STATUS.pending;
                return (
                  <div
                    key={doc.id}
                    className="flex items-center gap-4 px-4 py-3 rounded-xl bg-surface border border-border/60"
                  >
                    <div className="shrink-0 w-8 h-8 rounded-lg bg-surface-light border border-border flex items-center justify-center">
                      <svg className="w-4 h-4 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                          d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{doc.filename}</p>
                      <p className="text-xs text-muted">
                        {doc.file_size_bytes ? formatBytes(doc.file_size_bytes) : ''}
                        {doc.page_count ? ` · ${doc.page_count} pages` : ''}
                      </p>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <div className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                      <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Next step CTA */}
        {hasCompletedDoc && (
          <div className="glass rounded-2xl p-5 flex items-center justify-between gap-4 border-primary/20 glow-primary-sm">
            <div>
              <p className="text-sm font-semibold text-foreground">Document ready — run your analysis</p>
              <p className="text-xs text-muted mt-0.5">
                Part 1 frames the buyer context. Part 2 generates the risk map and attack zones.
              </p>
            </div>
            <button
              onClick={() => router.push(analysisUrl)}
              className="btn-primary shrink-0"
            >
              {analysisLabel}
            </button>
          </div>
        )}

        {/* Session History */}
        <RoundHistoryCard sessionId={id} />

      </main>
    </div>
  );
}
