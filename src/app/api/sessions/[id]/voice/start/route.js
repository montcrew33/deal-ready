// API Route: POST /api/sessions/[id]/voice/start
// Initializes an OpenAI Realtime session and returns an ephemeral token
// The API key stays server-side — client gets a scoped temporary token

import { getAuthUser, getAccessToken, unauthorizedResponse, auditLog } from '@/lib/auth-helpers';
import { createUserClient, createServerClient } from '@/lib/supabase-server';
import { buildSystemPrompt, buildConversationalContext } from '@/lib/promptBuilder';
import { buildPersonaContext } from '@/lib/personaRouter';
import { buildDocumentContext } from '@/lib/document-processor';

// Voice mapping for personas
const PERSONA_VOICES = {
  panel_lead: 'shimmer',       // Alexandra — authoritative female
  pe_partner: 'ash',           // Marcus — measured male
  technical_cfo: 'coral',      // Diane — precise female
  corp_dev: 'ballad',          // James — calm male
  operating_partner: 'sage',   // Sarah — warm female
  ops_ai_expert: 'ash',        // Ravi — thoughtful male
};

export async function POST(request, { params }) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { id: sessionId } = await params;
  const supabase = createUserClient(getAccessToken(request));

  // Get session with analysis
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }

  // Get documents
  const { data: documents } = await supabase
    .from('session_documents')
    .select('sections, extracted_text')
    .eq('session_id', sessionId)
    .eq('processing_status', 'completed');

  // Get existing Q&A conversation history — scoped to current round
  const currentRound = session.current_round ?? 1;
  const { data: existingMessages } = await supabase
    .from('session_messages')
    .select('role, content, speaker, phase, is_voice')
    .eq('session_id', sessionId)
    .eq('round_number', currentRound)
    .order('created_at', { ascending: true });

  const documentContext = buildDocumentContext(documents || []);
  const sessionWithDocs = { ...session, materials_text: documentContext };

  // Build the voice session system prompt
  const basePrompt = buildSystemPrompt(sessionWithDocs);

  const priorMessages = (existingMessages || []).filter(
    m => (m.role === 'user' || m.role === 'assistant') && m.phase === 'part3'
  );

  // Use the same framework functions as the text chat route (fixes the persona bypass)
  // Slice to last 6 exchanges to prevent OpenAI Realtime context bloat
  const conversationalCtx = buildConversationalContext(priorMessages.slice(-6));
  const lastUserAnswer = priorMessages.filter(m => m.role === 'user').slice(-1)[0]?.content || '';

  const body = await request.json().catch(() => ({}));
  const persona = body.persona || 'panel_lead';
  const personaCtx = buildPersonaContext(persona, lastUserAnswer);

  const presenterName = session.management_team || 'the management team';

  const voiceInstructions = `${basePrompt}

===== ANALYSIS CONTEXT (from prior document review) =====
${session.part2_output || 'No prior analysis available. Conduct the Q&A based on available materials.'}

${conversationalCtx}

${personaCtx}

===== VOICE SESSION RULES =====
You are now conducting the live mock management presentation Q&A (Part 3) as a VOICE session.

CRITICAL — WHO YOU ARE SPEAKING TO:
You are speaking DIRECTLY and EXCLUSIVELY to ${presenterName}.
Never address, reference, or speak to other panel members (Marcus, Diane, James, Sarah, Ravi, Alexandra, etc.) in your speech.
Do not say things like "Marcus raises a good point", "As Diane mentioned", or "I agree with my colleague".
You are a single voice in this conversation. Direct every question and comment to the presenter.

Rules for this voice session:
- Ask ONE question at a time. Wait for the management team's verbal response.
- After each answer, briefly score it (if scoring toggle is on) and provide concise critique.
- Then ask the next question or a follow-up.
- Be conversational and natural — this is a spoken dialogue, not a written exchange.
- Keep your responses concise (30-60 seconds of speech per turn).
- Reference specific points from the analysis above to make questions targeted.
- If the user says "stop", "end now", or "debrief now", acknowledge and end the Q&A.
- Do NOT use markdown, bullet points, or formatting — speak naturally.
- ${priorMessages.length > 0 ? `There are already ${priorMessages.length} exchanges on record. Briefly acknowledge this is a continuation and ask your next question — do NOT start over from the beginning.` : 'Begin by introducing yourself briefly and asking your first question.'}`;

  const voice = PERSONA_VOICES[persona] || 'shimmer';

  // Create ephemeral token via OpenAI Realtime API
  const openaiResponse = await fetch('https://api.openai.com/v1/realtime/sessions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'gpt-4o-realtime-preview-2024-12-17',
      voice: voice,
      instructions: voiceInstructions,
      input_audio_transcription: {
        model: 'whisper-1',
      },
      turn_detection: {
        type: 'server_vad',
        threshold: 0.5,
        prefix_padding_ms: 300,
        silence_duration_ms: 700,
      },
    }),
  });

  if (!openaiResponse.ok) {
    const errorData = await openaiResponse.json().catch(() => ({}));
    console.error('OpenAI Realtime session creation failed:', errorData);
    return Response.json(
      { error: 'Failed to create voice session' },
      { status: 500 }
    );
  }

  const realtimeSession = await openaiResponse.json();

  // Update session status
  const serverSupabase = createServerClient();
  await serverSupabase
    .from('sessions')
    .update({ status: 'part3' })
    .eq('id', sessionId);

  // Audit log
  await auditLog(user.id, sessionId, 'voice_session_start', {
    persona,
    voice,
  });

  // Return ephemeral token — client connects directly to OpenAI
  return Response.json({
    token: realtimeSession.client_secret?.value,
    session_id: realtimeSession.id,
    voice,
    persona,
  });
}
