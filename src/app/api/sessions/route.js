// API Route: GET /api/sessions — List user's sessions
// API Route: POST /api/sessions — Create new session

import { getAuthUser, getAccessToken, unauthorizedResponse, auditLog } from '@/lib/auth-helpers';
import { createUserClient } from '@/lib/supabase-server';

export async function GET(request) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const supabase = createUserClient(getAccessToken(request));

  const { data: sessions, error } = await supabase
    .from('sessions')
    .select('id, company_name, status, created_at, updated_at')
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: 'Failed to fetch sessions' }, { status: 500 });
  }

  return Response.json({ sessions });
}

export async function POST(request) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const body = await request.json();

  // Validate required fields
  if (!body.company_name?.trim()) {
    return Response.json({ error: 'Company name is required' }, { status: 400 });
  }

  const supabase = createUserClient(getAccessToken(request));

  const { data: session, error } = await supabase
    .from('sessions')
    .insert({
      user_id: user.id,
      company_name: body.company_name,
      company_website: body.company_website || null,
      industry: body.industry || null,
      transaction_context: body.transaction_context || 'sale_process',
      likely_buyer_type: body.likely_buyer_type || 'private_equity',
      known_sensitivities: body.known_sensitivities || null,
      management_team: body.management_team || null,
      primary_objective: body.primary_objective || null,
      toggles: body.toggles || {},
      status: 'setup',
    })
    .select()
    .single();

  if (error) {
    return Response.json({ error: 'Failed to create session' }, { status: 500 });
  }

  // Audit log
  await auditLog(user.id, session.id, 'session_create', {
    company_name: body.company_name,
  });

  return Response.json({ session }, { status: 201 });
}
