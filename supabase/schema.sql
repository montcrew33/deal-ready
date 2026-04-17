-- DealReady Database Schema
-- Run this in your Supabase SQL Editor (Dashboard → SQL Editor → New Query)

-- ============================================
-- 1. SESSIONS TABLE
-- ============================================
CREATE TABLE sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Deal setup
  company_name TEXT NOT NULL,
  company_website TEXT,
  industry TEXT,
  transaction_context TEXT CHECK (transaction_context IN (
    'sale_process', 'recapitalization', 'majority_sale', 'minority_investment', 'other'
  )),
  likely_buyer_type TEXT CHECK (likely_buyer_type IN (
    'private_equity', 'strategic', 'family_office', 'mixed'
  )),
  known_sensitivities TEXT,
  management_team TEXT,
  primary_objective TEXT,
  
  -- Configuration (15 toggles stored as JSON)
  toggles JSONB NOT NULL DEFAULT '{
    "buyer_lens": "Private Equity",
    "pressure_level": "Hard",
    "question_style": "Standard",
    "coaching_mode": "Off during live Q&A",
    "answer_scoring": "On",
    "follow_up_intensity": "Medium",
    "bias_vulnerabilities": "Normal",
    "buyer_personas": "Yes",
    "focus_mode": "Balanced",
    "session_length": "Standard",
    "debrief_depth": "Detailed",
    "model_answers": "On",
    "management_experienced": "Mixed",
    "interrupt_rambling": "Yes",
    "challenge_unsupported": "Yes"
  }'::jsonb,
  
  -- Session state
  status TEXT NOT NULL DEFAULT 'setup' CHECK (status IN (
    'setup', 'processing', 'part1', 'part2', 'part3', 'part4', 'complete'
  )),
  
  -- Analysis outputs (populated by Claude)
  part1_output TEXT,
  part2_output TEXT,
  part4_output TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ -- soft delete
);

-- RLS
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own sessions"
  ON sessions FOR SELECT
  USING (user_id = auth.uid() AND deleted_at IS NULL);

CREATE POLICY "Users can create own sessions"
  ON sessions FOR INSERT
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own sessions"
  ON sessions FOR UPDATE
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete own sessions"
  ON sessions FOR DELETE
  USING (user_id = auth.uid());

-- Updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER sessions_updated_at
  BEFORE UPDATE ON sessions
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();


-- ============================================
-- 2. SESSION MESSAGES TABLE
-- ============================================
CREATE TABLE session_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  phase TEXT,
  speaker TEXT, -- persona key: 'pe_partner', 'technical_cfo', etc.
  
  -- Voice metadata
  is_voice BOOLEAN DEFAULT FALSE,
  audio_duration_seconds INTEGER,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Index for fast lookups
CREATE INDEX idx_session_messages_session_id ON session_messages(session_id);
CREATE INDEX idx_session_messages_phase ON session_messages(session_id, phase);

-- RLS (access through parent session ownership)
ALTER TABLE session_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own session messages"
  ON session_messages FOR SELECT
  USING (session_id IN (
    SELECT id FROM sessions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create messages in own sessions"
  ON session_messages FOR INSERT
  WITH CHECK (session_id IN (
    SELECT id FROM sessions WHERE user_id = auth.uid()
  ));


-- ============================================
-- 3. SESSION DOCUMENTS TABLE
-- ============================================
CREATE TABLE session_documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
  
  -- File metadata
  filename TEXT NOT NULL,
  file_size_bytes INTEGER,
  mime_type TEXT,
  storage_path TEXT, -- path in Supabase Storage
  
  -- Extracted content (populated by processing pipeline)
  extracted_text TEXT,
  sections JSONB, -- { exec_summary, financials, customers, management, ... }
  page_count INTEGER,
  
  -- Processing state
  processing_status TEXT DEFAULT 'pending' CHECK (processing_status IN (
    'pending', 'processing', 'completed', 'failed'
  )),
  error_message TEXT,
  processed_at TIMESTAMPTZ,
  raw_file_deleted_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_session_documents_session_id ON session_documents(session_id);

-- RLS
ALTER TABLE session_documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own documents"
  ON session_documents FOR SELECT
  USING (session_id IN (
    SELECT id FROM sessions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can create documents in own sessions"
  ON session_documents FOR INSERT
  WITH CHECK (session_id IN (
    SELECT id FROM sessions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can update own documents"
  ON session_documents FOR UPDATE
  USING (session_id IN (
    SELECT id FROM sessions WHERE user_id = auth.uid()
  ));

CREATE POLICY "Users can delete own documents"
  ON session_documents FOR DELETE
  USING (session_id IN (
    SELECT id FROM sessions WHERE user_id = auth.uid()
  ));


-- ============================================
-- 4. AUDIT LOG TABLE
-- ============================================
CREATE TABLE audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  session_id UUID,
  
  action TEXT NOT NULL,
  -- Actions: document_upload, document_process, document_delete,
  --          session_create, session_delete, ai_call, voice_session_start
  
  details JSONB, -- metadata only (file size, page count, etc.) — NEVER content
  
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_session_id ON audit_log(session_id);

-- RLS
ALTER TABLE audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own audit log"
  ON audit_log FOR SELECT
  USING (user_id = auth.uid());

CREATE POLICY "System can insert audit entries"
  ON audit_log FOR INSERT
  WITH CHECK (true); -- Inserts come from server-side via service role


-- ============================================
-- 5. STORAGE BUCKET
-- ============================================
-- Run this separately or create via Supabase Dashboard:
-- Go to Storage → Create new bucket → Name: "documents" → Private (not public)

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access their own folder
CREATE POLICY "Users can upload to own folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can view own files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );

CREATE POLICY "Users can delete own files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'documents' AND
    (storage.foldername(name))[1] = auth.uid()::text
  );
