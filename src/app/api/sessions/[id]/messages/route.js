// API Route: GET /api/sessions/[id]/messages
// Returns the full conversation history for a session

import { getAuthUser, getAccessToken, unauthorizedResponse } from '@/lib/auth-helpers';
import { createUserClient } from '@/lib/supabase-server';

export async function GET(request, { params }) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { id: sessionId } = await params;
  const supabase = createUserClient(getAccessToken(request));

  // Support ?round=N to fetch a specific round's messages (for Previous Rounds view)
  const url = new URL(request.url);
  const roundParam = url.searchParams.get('round');

  let roundToFetch;
  if (roundParam !== null) {
    const parsed = parseInt(roundParam, 10);
    roundToFetch = Number.isFinite(parsed) && parsed > 0 ? parsed : 1;
  } else {
    // Default: current round from the session
    const { data: session } = await supabase
      .from('sessions')
      .select('current_round')
      .eq('id', sessionId)
      .single();
    roundToFetch = session?.current_round ?? 1;
  }

  // RLS ensures user can only access their own session's messages
  const { data: messages, error } = await supabase
    .from('session_messages')
    .select('id, role, content, phase, speaker, is_voice, created_at')
    .eq('session_id', sessionId)
    .eq('round_number', roundToFetch)
    .order('created_at', { ascending: true });

  if (error) {
    return Response.json({ error: 'Failed to fetch messages' }, { status: 500 });
  }

  return Response.json({ messages: messages ?? [] });
}
