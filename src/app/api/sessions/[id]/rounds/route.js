// GET /api/sessions/[id]/rounds
// Returns summary stats for every Q&A round in this session.
// Used by the "Previous Rounds" dropdown in the Q&A view.

import { getAuthUser, getAccessToken, unauthorizedResponse } from '@/lib/auth-helpers';
import { createUserClient } from '@/lib/supabase-server';

export async function GET(request, { params }) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { id: sessionId } = await params;
  const supabase = createUserClient(getAccessToken(request));

  // Fetch all part3 messages across all rounds (role, content, round_number, created_at)
  const { data: messages, error } = await supabase
    .from('session_messages')
    .select('round_number, role, content, created_at')
    .eq('session_id', sessionId)
    .eq('phase', 'part3')
    .order('created_at', { ascending: true });

  if (error) {
    return Response.json({ error: 'Failed to fetch rounds' }, { status: 500 });
  }

  // Group by round_number and compute per-round stats
  const roundMap = {};
  for (const m of messages || []) {
    const r = m.round_number ?? 1;
    if (!roundMap[r]) {
      roundMap[r] = { round: r, questions: 0, scores: [], date: m.created_at, focus: null };
    }
    if (m.role === 'user' && !roundMap[r].focus) {
      // Extract focus topic from focused practice start messages
      const focusMatch = m.content?.match(/Focus EXCLUSIVELY on the following topic: "([^"]+)"/);
      if (focusMatch) roundMap[r].focus = focusMatch[1];
    }
    if (m.role === 'assistant') {
      roundMap[r].questions++;
      // Match "Score: 7", "Score: 7/10", or standalone "7/10"
      const match =
        m.content?.match(/[Ss]core[:\s]+(\d+(?:\.\d+)?)(?:\s*\/\s*10)?/) ||
        m.content?.match(/\b(\d+(?:\.\d+)?)\s*\/\s*10\b/);
      if (match) roundMap[r].scores.push(parseFloat(match[1]));
    }
  }

  const rounds = Object.values(roundMap)
    .sort((a, b) => a.round - b.round)
    .map(({ round, questions, scores, date, focus }) => ({
      round,
      questions,
      avgScore: scores.length
        ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
        : null,
      date,
      focus,
    }));

  return Response.json({ rounds });
}
