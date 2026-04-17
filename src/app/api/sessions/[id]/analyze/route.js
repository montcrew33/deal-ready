// API Route: POST /api/sessions/[id]/analyze
// Runs Part 1 and Part 2 analysis using Claude with full document context

import { getAuthUser, getAccessToken, unauthorizedResponse, auditLog } from '@/lib/auth-helpers';
import { createUserClient, createServerClient } from '@/lib/supabase-server';
import { streamClaude } from '@/lib/claude-client';
import { buildSystemPrompt, buildPart1Prompt, buildPart2Prompt } from '@/lib/promptBuilder';
import { buildDocumentContext } from '@/lib/document-processor';

export async function POST(request, { params }) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { id: sessionId } = await params;
  const supabase = createUserClient(getAccessToken(request));

  // Get session with documents
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }

  const { data: documents } = await supabase
    .from('session_documents')
    .select('*')
    .eq('session_id', sessionId)
    .eq('processing_status', 'completed');

  if (!documents || documents.length === 0) {
    return Response.json({ error: 'No processed documents found. Upload and wait for processing to complete.' }, { status: 400 });
  }

  // Build the full prompt with document context
  const documentContext = buildDocumentContext(documents);

  // Inject document context into session for prompt builder
  const sessionWithDocs = {
    ...session,
    materials_text: documentContext,
  };

  const systemPrompt = buildSystemPrompt(sessionWithDocs);
  const body = await request.json().catch(() => ({}));
  const ALLOWED_PHASES = ['part1', 'part2'];
  const phase = ALLOWED_PHASES.includes(body.phase) ? body.phase : 'part1';

  let userPrompt;
  if (phase === 'part2') {
    userPrompt = buildPart2Prompt(sessionWithDocs);
  } else {
    userPrompt = buildPart1Prompt(sessionWithDocs);
  }

  // Update session status
  const serverSupabase = createServerClient();
  await serverSupabase
    .from('sessions')
    .update({ status: phase === 'part2' ? 'part2' : 'part1' })
    .eq('id', sessionId);

  // Audit log
  await auditLog(user.id, sessionId, 'ai_call', {
    phase,
    document_count: documents.length,
  });

  // Stream the response
  const stream = await streamClaude({
    system: systemPrompt,
    messages: [{ role: 'user', content: userPrompt }],
    maxTokens: 6000,
  });

  // Create a ReadableStream that sends text chunks
  const encoder = new TextEncoder();
  let fullResponse = '';

  const readable = new ReadableStream({
    async start(controller) {
      try {
        for await (const event of stream) {
          if (event.type === 'content_block_delta' && event.delta?.text) {
            const text = event.delta.text;
            fullResponse += text;
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text })}\n\n`));
          }
        }

        // Save the complete analysis output
        const outputField = phase === 'part2' ? 'part2_output' : 'part1_output';
        await serverSupabase
          .from('sessions')
          .update({ [outputField]: fullResponse })
          .eq('id', sessionId);

        // Also save as a message
        await serverSupabase
          .from('session_messages')
          .insert({
            session_id: sessionId,
            role: 'assistant',
            content: fullResponse,
            phase: phase === 'part2' ? 'part2' : 'part1',
          });

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (err) {
        console.error('analyze stream error:', err.message);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: 'Analysis failed. Please try again.' })}\n\n`)
        );
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
