// Auth middleware for API routes
// Validates JWT from httpOnly cookie (primary) or Authorization header (fallback)

import { createServerClient } from './supabase-server';

// Extract raw access token from request (cookie-first)
export function getAccessToken(request) {
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(/(?:^|;\s*)dr_access_token=([^;]+)/);
  if (match) return match[1];

  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.replace('Bearer ', '');
  }

  return null;
}

export async function getAuthUser(request) {
  const token = getAccessToken(request);

  if (!token) {
    return null;
  }

  const supabase = createServerClient();
  const { data: { user }, error } = await supabase.auth.getUser(token);

  if (error || !user) {
    return null;
  }

  return user;
}

// Helper to return 401 response
export function unauthorizedResponse() {
  return Response.json(
    { error: 'Unauthorized' },
    { status: 401 }
  );
}

// Helper to log audit events — fire-and-forget, never throws
export async function auditLog(userId, sessionId, action, details = {}) {
  try {
    const supabase = createServerClient();
    await supabase.from('audit_log').insert({
      user_id: userId,
      session_id: sessionId,
      action,
      details,
    });
  } catch {
    // Audit failures must not break the request
  }
}
