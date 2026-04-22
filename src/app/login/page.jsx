'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Login failed');
        return;
      }

      router.push('/dashboard');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4" style={{ background: 'linear-gradient(135deg, #F8FAFC 0%, #EFF6FF 50%, #F8FAFC 100%)' }}>
      <div className="w-full max-w-sm animate-slide-up">

        {/* Wordmark */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block">
            <span className="text-2xl font-bold tracking-tight text-slate-900">Deal<span className="text-blue-500">Ready</span></span>
          </Link>
          <p className="mt-2 text-sm text-muted">Sign in to your account</p>
        </div>

        {/* Card */}
        <div className="glass-strong rounded-2xl p-8">
          <form onSubmit={handleSubmit} className="space-y-5" noValidate>
            <div className="space-y-1.5">
              <label htmlFor="email" className="block text-xs font-semibold text-muted uppercase tracking-wider">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                className="input"
                placeholder="you@company.com"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="password" className="block text-xs font-semibold text-muted uppercase tracking-wider">
                Password
              </label>
              <input
                id="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="input"
                placeholder="••••••••"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="btn-primary w-full mt-2"
            >
              {loading ? (
                <>
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Signing in…
                </>
              ) : 'Sign in'}
            </button>
          </form>
        </div>

        <p className="text-center mt-6 text-sm text-muted">
          No account?{' '}
          <Link href="/signup" className="text-primary hover:text-primary-light transition-colors font-medium">
            Create one
          </Link>
        </p>

        {/* Security badge */}
        <div className="flex items-center justify-center gap-2 mt-10">
          <svg className="w-3.5 h-3.5 text-muted/50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
          </svg>
          <span className="text-xs text-muted/50">Documents encrypted at rest and in transit</span>
        </div>
      </div>
    </div>
  );
}
