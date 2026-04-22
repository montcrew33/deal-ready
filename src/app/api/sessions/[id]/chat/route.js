// API Route: POST /api/sessions/[id]/chat
// Handles text-based Q&A (Part 3 fallback) and debrief generation (Part 4)

import { getAuthUser, getAccessToken, unauthorizedResponse, auditLog } from '@/lib/auth-helpers';
import { createUserClient, createServerClient } from '@/lib/supabase-server';
import { streamClaude } from '@/lib/claude-client';
import {
  buildSystemPrompt,
  buildPart3StartPrompt,
  buildPart4Prompt,
  buildConversationalContext,
} from '@/lib/promptBuilder';
import { buildDocumentContext } from '@/lib/document-processor';
import { getNextSpeaker, buildPersonaContext } from '@/lib/personaRouter';
import { detectSpeakerFromText } from '@/lib/ttsVoice';

export async function POST(request, { params }) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { id: sessionId } = await params;
  const supabase = createUserClient(getAccessToken(request));

  // Get session
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }

  const body = await request.json();
  const ALLOWED_ACTIONS = ['start_qa', 'answer', 'debrief'];
  const action = ALLOWED_ACTIONS.includes(body.action) ? body.action : 'answer';
  const message = typeof body.message === 'string' ? body.message.slice(0, 8000) : '';
  // focus_topic: optional, only valid on start_qa, max 300 chars
  const focusTopic = action === 'start_qa' && typeof body.focus_topic === 'string'
    ? body.focus_topic.trim().slice(0, 300)
    : '';

  if (action === 'answer' && !message.trim()) {
    return Response.json({ error: 'Message is required' }, { status: 400 });
  }

  const serverSupabase = createServerClient();

  // Get documents for context
  const { data: documents } = await supabase
    .from('session_documents')
    .select('sections, extracted_text')
    .eq('session_id', sessionId)
    .eq('processing_status', 'completed');

  const documentContext = buildDocumentContext(documents || []);
  const sessionWithDocs = { ...session, materials_text: documentContext };
  const systemPrompt = buildSystemPrompt(sessionWithDocs);

  // Get conversation history
  const { data: existingMessages } = await supabase
    .from('session_messages')
    .select('role, content, phase, speaker')
    .eq('session_id', sessionId)
    .order('created_at', { ascending: true });

  const messages = existingMessages || [];

  // Build the prompt based on action
  let userContent;
  let phase = session.status;

  const roundNumber = session.current_round ?? 1;

  if (action === 'start_qa') {
    userContent = buildPart3StartPrompt();
    // Append focus instruction AFTER the base prompt — promptBuilder.js is not modified
    if (focusTopic) {
      userContent += `\n\nFOCUSED PRACTICE INSTRUCTION: This is a targeted practice round. Focus EXCLUSIVELY on the following topic: "${focusTopic}". Ask 3-5 deep, probing questions specifically about this area only. Do not move to other topics until this area has been thoroughly tested. Make your questions progressively harder.`;
    }
    phase = 'part3';
    await serverSupabase.from('sessions').update({ status: 'part3' }).eq('id', sessionId);
    // Save the start prompt so re-entry sees it in conversation history
    await serverSupabase.from('session_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: userContent,
      phase: 'part3',
      round_number: roundNumber,
    });
  } else if (action === 'debrief') {
    userContent = buildPart4Prompt();
    phase = 'part4';
    await serverSupabase.from('sessions').update({ status: 'part4' }).eq('id', sessionId);
    // Save the debrief prompt so history is complete
    await serverSupabase.from('session_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: userContent,
      phase: 'part4',
      round_number: roundNumber,
    });
  } else {
    userContent = message;
    // Save user message
    await serverSupabase.from('session_messages').insert({
      session_id: sessionId,
      role: 'user',
      content: message,
      phase: session.status,
      round_number: roundNumber,
    });
  }

  // Build conversational context for Part 3 and Part 4 (debrief needs pattern observations too)
  const conversationalCtx = (phase === 'part3' || phase === 'part4') ? buildConversationalContext(messages) : '';
  const activeSpeaker = body.activeSpeaker || 'panel_lead';
  const personaCtx = phase === 'part3' ? buildPersonaContext(activeSpeaker, message || '') : '';

  // Build messages array for Claude API (proper message format)
  const claudeMessages = [];

  // Include conversation history
  for (const msg of messages) {
    if (msg.role === 'user' || msg.role === 'assistant') {
      claudeMessages.push({ role: msg.role, content: msg.content });
    }
  }

  // Add current user input
  claudeMessages.push({ role: 'user', content: userContent });

  // Full system prompt with conversational context
  const fullSystem = `${systemPrompt}\n\n${conversationalCtx}\n\n${personaCtx}`;

  // Audit log
  await auditLog(user.id, sessionId, 'ai_call', { phase, action });

  // Stream response
  const stream = await streamClaude({
    system: fullSystem,
    messages: claudeMessages,
    maxTokens: phase === 'part4' ? 8000 : 2000,
  });

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

        // Detect speaker from response
        const detectedSpeaker = detectSpeakerFromText(fullResponse);
        const nextSpeaker = detectedSpeaker ||
          getNextSpeaker(activeSpeaker, fullResponse, session.toggles?.buyer_lens || 'Private Equity');

        // Save assistant message
        await serverSupabase.from('session_messages').insert({
          session_id: sessionId,
          role: 'assistant',
          content: fullResponse,
          phase,
          speaker: nextSpeaker,
          round_number: roundNumber,
        });

        // If Part 4, save the debrief output
        if (phase === 'part4') {
          await serverSupabase
            .from('sessions')
            .update({ part4_output: fullResponse, status: 'complete' })
            .eq('id', sessionId);
        }

        // Send the detected speaker with the done signal
        controller.enqueue(encoder.encode(
          `data: ${JSON.stringify({ done: true, speaker: nextSpeaker })}\n\n`
        ));
        controller.close();
      } catch (err) {
        console.error('chat stream error:', err.message);
        controller.enqueue(
          encoder.encode(`data: ${JSON.stringify({ error: 'Response failed. Please try again.' })}\n\n`)
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
