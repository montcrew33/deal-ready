// API Route: GET /api/sessions/[id]/messages
// Returns the full conversation history for a session

import { getAuthUser, getAccessToken, unauthorizedResponse } from '@/lib/auth-helpers';
import { createUserClient } from '@/lib/supabase-server';

export async function GET(request, { params }) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { id: sessionId } = await params;
  const supabase = createUserClient(getAccessToken(request));

  // RLS ensures user can only access their own session's messages
  const { data: messages, error } = await supabase
    .from('session_messages')
    .select('id, role, content, phase, speaker, is_voice, created_at')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  if (error) {
    return Response.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }

  return Response.json({ messages: messages ?? [] });
}
