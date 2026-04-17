import { NextRequest } from 'next/server';
import { createServerClient } from '@/lib/supabase-server';
import { auditLog } from '@/lib/auth-helpers';

export async function POST(request: NextRequest) {
  let body: { email?: string; password?: string };

  try {
    body = await request.json();
  } catch {
    return Response.json({ error: 'Invalid request body' }, { status: 400 });
  }

  const { email, password } = body;

  if (!email || !password) {
    return Response.json({ error: 'Email and password are required' }, { status: 400 });
  }

  if (password.length < 8) {
    return Response.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    return Response.json({ error: 'Invalid email address' }, { status: 400 });
  }

  let data, error;
  try {
    const supabase = createServerClient();
    ({ data, error } = await supabase.auth.signUp({ email, password }));
  } catch {
    return Response.json({ error: 'Service unavailable. Check your Supabase configuration.' }, { status: 503 });
  }

  if (error) {
    // Surface auth errors (e.g. "User already registered") but not network internals
    const msg = error.message?.includes('fetch') ? 'Service unavailable. Try again shortly.' : error.message;
    return Response.json({ error: msg }, { status: 400 });
  }

  if (!data.session) {
    // Email confirmation required
    return Response.json(
      { message: 'Check your email to confirm your account before signing in.' },
      { status: 200 }
    );
  }

  await auditLog(data.user!.id, null, 'signup', { email });

  const response = Response.json({ user: { id: data.user!.id, email: data.user!.email } });

  setAuthCookies(response, data.session.access_token, data.session.refresh_token);

  return response;
}

function setAuthCookies(response: Response, accessToken: string, refreshToken: string) {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieOptions = `HttpOnly; Path=/; SameSite=Strict${isProduction ? '; Secure' : ''}`;

  response.headers.append('Set-Cookie', `dr_access_token=${accessToken}; ${cookieOptions}; Max-Age=3600`);
  response.headers.append('Set-Cookie', `dr_refresh_token=${refreshToken}; ${cookieOptions}; Max-Age=604800`);
}
