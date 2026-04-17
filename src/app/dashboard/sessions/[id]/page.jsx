'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

const STATUS_LABELS = {
  setup: 'Setup',
  processing: 'Processing',
  part1: 'Analysis ready',
  part2: 'Analysis ready',
  part3: 'Q&A',
  part4: 'Debrief',
  complete: 'Complete',
};

const STATUS_COLORS = {
  setup: 'text-muted bg-muted/10',
  processing: 'text-gold bg-gold/10',
  part1: 'text-primary bg-primary/10',
  part2: 'text-primary bg-primary/10',
  part3: 'text-primary bg-primary/10',
  part4: 'text-primary bg-primary/10',
  complete: 'text-success bg-success/10',
};

const DOC_STATUS_CONFIG = {
  pending:    { label: 'Queued',      color: 'text-muted',   dot: 'bg-muted' },
  processing: { label: 'Processing…', color: 'text-gold',    dot: 'bg-gold animate-pulse' },
  completed:  { label: 'Ready',       color: 'text-success', dot: 'bg-success' },
  failed:     { label: 'Failed',      color: 'text-danger',  dot: 'bg-danger' },
};

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
}

export default function SessionPage() {
  const router = useRouter();
  const { id } = useParams();

  const [session, setSession] = useState(null);
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef(null);
  const pollRef = useRef(null);

  // Fetch session + documents
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

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Poll while any doc is pending/processing
  useEffect(() => {
    const needsPoll = documents.some(d => d.processing_status === 'pending' || d.processing_status === 'processing');

    if (needsPoll && !pollRef.current) {
      pollRef.current = setInterval(async () => {
        const res = await fetch(`/api/sessions/${id}/documents`);
        if (!res.ok) return;
        const { documents: docs } = await res.json();
        setDocuments(docs ?? []);
        const stillPending = docs?.some(d => d.processing_status === 'pending' || d.processing_status === 'processing');
        if (!stillPending) {
          clearInterval(pollRef.current);
          pollRef.current = null;
          // Refresh session status too
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

    if (file.type !== 'application/pdf') {
      toast.error('Only PDF files are accepted');
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      toast.error('File is too large. Maximum size is 50MB.');
      return;
    }

    setUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch(`/api/sessions/${id}/documents`, {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Upload failed');
        return;
      }

      toast.success('Document uploaded — processing started');
      // Add optimistic entry, then real poll will update it
      setDocuments(prev => [
        {
          id: data.document.id,
          filename: data.document.filename,
          file_size_bytes: file.size,
          processing_status: 'pending',
          created_at: new Date().toISOString(),
        },
        ...prev,
      ]);
    } catch {
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }

  function handleFileInput(e) {
    uploadFile(e.target.files[0]);
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragOver(false);
    uploadFile(e.dataTransfer.files[0]);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const hasCompletedDoc = documents.some(d => d.processing_status === 'completed');

  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="border-b border-border">
        <div className="max-w-4xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-muted hover:text-foreground transition-colors">
            ← Dashboard
          </Link>
          <span className="font-semibold text-foreground tracking-tight">DealReady</span>
          <div className="w-24" />
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6 py-10 space-y-8">
        {/* Session header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h1 className="text-2xl font-bold text-foreground">{session.company_name}</h1>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[session.status] ?? STATUS_COLORS.setup}`}>
                {STATUS_LABELS[session.status] ?? session.status}
              </span>
            </div>
            <p className="text-sm text-muted">
              {[session.industry, session.likely_buyer_type?.replace(/_/g, ' ')].filter(Boolean).join(' · ')}
              {session.created_at && ` · Created ${formatDate(session.created_at)}`}
            </p>
          </div>

          {/* Run Analysis button — enabled only when a doc is ready */}
          <button
            disabled={!hasCompletedDoc}
            onClick={() => router.push(`/dashboard/sessions/${id}/analysis`)}
            className="shrink-0 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
          >
            Run Analysis →
          </button>
        </div>

        {/* Document upload */}
        <div className="glass rounded-xl p-6">
          <h2 className="text-base font-semibold text-foreground mb-1">Documents</h2>
          <p className="text-sm text-muted mb-5">
            Upload your CIM or information memorandum. PDF only, 50MB max.
          </p>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !uploading && fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-10 text-center cursor-pointer transition-colors ${
              dragOver
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-primary/50 hover:bg-surface-light/30'
            } ${uploading ? 'opacity-60 cursor-not-allowed' : ''}`}
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
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-sm text-muted">Uploading…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
                  <svg className="w-6 h-6 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                      d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">
                    {dragOver ? 'Drop to upload' : 'Drop your PDF here, or click to browse'}
                  </p>
                  <p className="text-xs text-muted mt-1">PDF · max 50MB</p>
                </div>
              </div>
            )}
          </div>

          {/* Document list */}
          {documents.length > 0 && (
            <div className="mt-5 space-y-2">
              {documents.map((doc) => {
                const cfg = DOC_STATUS_CONFIG[doc.processing_status] ?? DOC_STATUS_CONFIG.pending;
                return (
                  <div key={doc.id} className="flex items-center gap-4 px-4 py-3 rounded-lg bg-surface border border-border">
                    <div className="shrink-0">
                      <svg className="w-5 h-5 text-muted" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
                      <div className={`w-2 h-2 rounded-full ${cfg.dot}`} />
                      <span className={`text-xs font-medium ${cfg.color}`}>{cfg.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Next step hint */}
        {hasCompletedDoc && (
          <div className="glass rounded-xl p-5 flex items-center justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-foreground">Document ready — run your analysis</p>
              <p className="text-xs text-muted mt-0.5">
                Part 1 reads the CIM and frames the buyer context. Part 2 generates the risk map and attack zones.
              </p>
            </div>
            <button
              onClick={() => router.push(`/dashboard/sessions/${id}/analysis`)}
              className="shrink-0 px-4 py-2 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 transition-colors"
            >
              Run Analysis →
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
