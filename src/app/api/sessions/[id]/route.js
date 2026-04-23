// GET /api/sessions/[id]    — Fetch single session (owned by authed user)
// PATCH /api/sessions/[id]  — Session actions (new_round)
// DELETE /api/sessions/[id] — Delete session and all associated data

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

export async function DELETE(request, { params }) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const userSupabase = createUserClient(getAccessToken(request));

  // Verify ownership via RLS before deleting
  const { data: session } = await userSupabase
    .from('sessions')
    .select('id')
    .eq('id', id)
    .single();

  if (!session) return Response.json({ error: 'Session not found' }, { status: 404 });

  const serverSupabase = createServerClient();

  // Fetch storage paths before deleting documents
  const { data: docs } = await serverSupabase
    .from('session_documents')
    .select('storage_path')
    .eq('session_id', id);

  // Delete storage files
  if (docs?.length) {
    const paths = docs.map(d => d.storage_path).filter(Boolean);
    if (paths.length) {
      await userSupabase.storage.from('documents').remove(paths);
    }
  }

  // Explicitly delete child records to avoid FK constraint failures
  // (handles cases where ON DELETE CASCADE is not set in Supabase)
  await serverSupabase.from('session_messages').delete().eq('session_id', id);
  await serverSupabase.from('session_documents').delete().eq('session_id', id);
  await serverSupabase.from('audit_log').delete().eq('session_id', id);

  // Delete the session itself
  const { error } = await serverSupabase
    .from('sessions')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (error) return Response.json({ error: error.message }, { status: 500 });

  return Response.json({ success: true });
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
