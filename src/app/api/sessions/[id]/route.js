// GET /api/sessions/[id]   — Fetch single session (owned by authed user)
// PATCH /api/sessions/[id] — Session actions (new_round)

import { getAuthUser, getAccessToken, unauthorizedResponse } from '@/lib/auth-helpers';
import { createUserClient, createServerClient } from '@/lib/supabase-server';

export async function GET(request, { params }) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const supabase = createUserClient(getAccessToken(request));

  const { data: session, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', id)
    .single();

  if (error || !session) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }

  return Response.json({ session });
}

export async function PATCH(request, { params }) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const body = await request.json();

  if (body.action !== 'new_round') {
    return Response.json({ error: 'Invalid action' }, { status: 400 });
  }

  // Verify ownership via RLS-scoped client
  const userSupabase = createUserClient(getAccessToken(request));
  const { data: session } = await userSupabase
    .from('sessions')
    .select('id, current_round')
    .eq('id', id)
    .single();

  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });

  const nextRound = (session.current_round ?? 1) + 1;

  // Use service role for the write
  const serverSupabase = createServerClient();
  await serverSupabase
    .from('sessions')
    .update({ current_round: nextRound, status: 'part3' })
    .eq('id', id);

  return Response.json({ current_round: nextRound });
}
