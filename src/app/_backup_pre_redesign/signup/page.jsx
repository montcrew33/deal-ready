'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';

export default function SignupPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [confirmationSent, setConfirmationSent] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    if (password.length < 8) {
      toast.error('Password must be at least 8 characters');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Signup failed');
        return;
      }

      if (data.message) {
        setConfirmationSent(true);
        return;
      }

      router.push('/dashboard');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  if (confirmationSent) {
    return (
      <div className="min-h-screen bg-dots flex items-center justify-center px-4">
        <div className="w-full max-w-sm animate-slide-up">
          <div className="glass-strong rounded-2xl p-10 text-center space-y-5">
            <div className="w-12 h-12 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center mx-auto">
              <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
              </svg>
            </div>
            <div>
              <h2 className="text-lg font-semibold text-foreground">Check your email</h2>
              <p className="text-sm text-muted mt-2 leading-relaxed">
                Confirmation link sent to{' '}
                <span className="text-foreground-dim font-medium">{email}</span>.
                Click it to activate your account.
              </p>
            </div>
            <Link
              href="/login"
              className="inline-block text-sm text-primary hover:text-primary-light transition-colors font-medium"
            >
              Back to sign in
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-dots flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-sm animate-slide-up">

        {/* Wordmark */}
        <div className="text-center mb-10">
          <Link href="/" className="inline-block group">
            <span className="text-2xl font-bold text-foreground tracking-tight group-hover:text-primary transition-colors">
              DealReady
            </span>
          </Link>
          <p className="mt-2 text-sm text-muted">Create your account</p>
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
                autoComplete="new-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                className="input"
                placeholder="Min. 8 characters"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="confirm-password" className="block text-xs font-semibold text-muted uppercase tracking-wider">
                Confirm password
              </label>
              <input
                id="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
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
                  Creating account…
                </>
              ) : 'Create account'}
            </button>
          </form>

          <p className="mt-5 text-xs text-center text-muted/60 leading-relaxed">
            Documents stored encrypted and accessible only to you.
          </p>
        </div>

        <p className="text-center mt-6 text-sm text-muted">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:text-primary-light transition-colors font-medium">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
