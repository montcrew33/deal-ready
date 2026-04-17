// API Route: POST /api/sessions/[id]/documents — Upload PDF
// Validates file, stores encrypted, triggers processing

import { getAuthUser, getAccessToken, unauthorizedResponse, auditLog } from '@/lib/auth-helpers';
import { createUserClient, createServerClient } from '@/lib/supabase-server';
import { processDocument } from '@/lib/document-processor';

export async function POST(request, { params }) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { id: sessionId } = await params;
  const supabase = createUserClient(getAccessToken(request));

  // Verify session belongs to user (RLS enforces ownership)
  const { data: session, error: sessionError } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .single();

  if (sessionError || !session) {
    return Response.json({ error: 'Session not found' }, { status: 404 });
  }

  // Parse multipart form data
  const formData = await request.formData();
  const file = formData.get('file');

  if (!file) {
    return Response.json({ error: 'No file provided' }, { status: 400 });
  }

  // Validate file type
  if (file.type !== 'application/pdf') {
    return Response.json({ error: 'Only PDF files are accepted' }, { status: 400 });
  }

  // Validate file size (50MB max)
  const MAX_SIZE = 50 * 1024 * 1024;
  if (file.size > MAX_SIZE) {
    return Response.json({ error: 'File too large. Maximum size is 50MB.' }, { status: 400 });
  }

  // Store in Supabase Storage (encrypted at rest)
  // Path: {user_id}/{session_id}/{random_id}.pdf
  const fileId = crypto.randomUUID();
  const storagePath = `${user.id}/${sessionId}/${fileId}.pdf`;

  const serverSupabase = createServerClient();
  const fileBuffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await serverSupabase.storage
    .from('documents')
    .upload(storagePath, fileBuffer, {
      contentType: 'application/pdf',
      cacheControl: '0',
      upsert: false,
    });

  if (uploadError) {
    return Response.json({ error: 'Upload failed' }, { status: 500 });
  }

  // Create document record
  const { data: doc, error: docError } = await serverSupabase
    .from('session_documents')
    .insert({
      session_id: sessionId,
      filename: file.name,
      file_size_bytes: file.size,
      mime_type: file.type,
      storage_path: storagePath,
      processing_status: 'pending',
    })
    .select()
    .single();

  if (docError) {
    return Response.json({ error: 'Failed to create document record' }, { status: 500 });
  }

  // Audit log
  await auditLog(user.id, sessionId, 'document_upload', {
    filename: file.name,
    size_bytes: file.size,
    document_id: doc.id,
  });

  // Trigger async processing (non-blocking)
  processDocument(doc.id, storagePath, sessionId, user.id).catch((err) => {
    console.error('Document processing failed:', err.message);
  });

  return Response.json({
    document: {
      id: doc.id,
      filename: doc.filename,
      processing_status: 'pending',
    },
  }, { status: 201 });
}

export async function GET(request, { params }) {
  const user = await getAuthUser(request);
  if (!user) return unauthorizedResponse();

  const { id } = await params;
  const supabase = createUserClient(getAccessToken(request));

  const { data: docs, error } = await supabase
    .from('session_documents')
    .select('id, filename, file_size_bytes, processing_status, page_count, processed_at, created_at')
    .eq('session_id', id)
    .order('created_at', { ascending: false });

  if (error) {
    return Response.json({ error: 'Failed to fetch documents' }, { status: 500 });
  }

  return Response.json({ documents: docs });
}
