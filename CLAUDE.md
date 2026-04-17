# DealReady — Project Instructions for Claude Code

## What This Project Is

DealReady is an M&A seller-prep AI product. It helps business owners and management teams prepare for buyer management presentations by analyzing their deal documents (CIMs, financial summaries) and conducting realistic mock Q&A sessions that simulate how PE firms, strategic acquirers, and other sophisticated buyers would probe the business.

The product runs a 4-phase session:
1. **Part 1 — Situation Framing:** AI reads the full CIM, assesses buyer context and information quality
2. **Part 2 — Pre-Interview Analysis:** Generates buyer risk map, persona lens, management positioning guidance, priority attack zones
3. **Part 3 — Live Mock Q&A:** Voice-first (OpenAI Realtime) or text-based (Claude) back-and-forth where AI personas ask one question at a time, score answers, and follow up
4. **Part 4 — Final Debrief:** Comprehensive readiness assessment, weak answer analysis, improvement plan, model answers

## Architecture

**Dual-model architecture:**
- **Claude API (claude-sonnet-4-6):** Document analysis, deep reasoning, text Q&A fallback, debrief generation (Parts 1, 2, 4, and Part 3 text mode)
- **OpenAI Realtime API:** Live voice conversation for Part 3 Q&A (low latency, natural speech)

**Stack:**
- Frontend: Next.js 14 (App Router) + React 18 + Tailwind CSS
- Backend: Next.js API Routes (server-side)
- Database: Supabase (Postgres with Row Level Security)
- File Storage: Supabase Storage (encrypted at rest, private buckets)
- Auth: Supabase Auth (email/password + magic link)
- PDF Processing: pdf-parse (server-side text extraction)
- Hosting: Vercel

## Security Requirements — CRITICAL

This product handles confidential M&A documents. Security is foundational, not optional.

**Rules that must ALWAYS be followed:**
1. **API keys NEVER in frontend code.** All LLM calls and document processing happen in API routes (server-side only). Environment variables only.
2. **Row Level Security (RLS) on every table.** Every query must be scoped to `user_id = auth.uid()`. No user can ever access another user's data.
3. **Documents processed server-side only.** PDF text extraction happens in API routes, never in the browser.
4. **Audit logging.** Every document upload, access, processing, and deletion must be logged to the audit_log table.
5. **No sensitive content in error logs.** Log metadata (file size, page count, token count) but NEVER log document content, user answers, or AI responses to error tracking.
6. **Validate all uploads.** Check file type (PDF only for v1), file size (50MB max), and reject anything else.
7. **httpOnly cookies for auth tokens.** Never store JWT tokens in localStorage.

## Database Schema

Four tables with RLS enabled on all:

**sessions** — Deal setup, toggles, status, analysis outputs
- `user_id` (FK to auth.users, used for RLS)
- `company_name`, `company_website`, `industry`, `transaction_context`, `likely_buyer_type`
- `known_sensitivities`, `management_team`, `primary_objective`
- `toggles` (JSONB — 15 configuration toggles)
- `status` (enum: setup, processing, part1, part2, part3, part4, complete)
- `part1_output`, `part2_output`, `part4_output` (TEXT — AI analysis results)

**session_messages** — Q&A conversation history
- `session_id` (FK, cascade delete)
- `role` (user/assistant/system), `content`, `phase`, `speaker` (persona key)
- `is_voice` (boolean), `audio_duration_seconds`

**session_documents** — Uploaded documents and extracted content
- `session_id` (FK, cascade delete)
- `filename`, `file_size_bytes`, `mime_type`, `storage_path`
- `extracted_text`, `sections` (JSONB — structured sections identified by Claude)
- `processing_status` (pending/processing/completed/failed)

**audit_log** — Security audit trail
- `user_id`, `session_id`, `action`, `details` (JSONB — metadata only, never content)

## Key Domain Logic Files

These files contain the core product IP — ported from the original prototype:

- `src/lib/promptBuilder.js` — System prompt construction, phase prompts, conversational context analysis. The system prompt dynamically injects deal variables, toggles, persona roster, calibration rules, and document content.
- `src/lib/personaProfiles.js` — 6 detailed buyer personas with backstories, communication styles, hidden agendas, red flags, signature phrases, and escalation triggers.
- `src/lib/personaRouter.js` — Weighted keyword matching to route questions to the contextually appropriate persona.

**When modifying these files:** The prompt logic and persona definitions are the core IP. Changes should be deliberate, not casual. The toggle system, persona voice instructions, and escalation logic are carefully designed — don't simplify them without understanding why they're structured that way.

## API Routes Structure

```
/api/auth/signup          POST  — Create account
/api/auth/login           POST  — Login
/api/auth/logout          POST  — Logout
/api/auth/me              GET   — Current user

/api/sessions             POST  — Create session
/api/sessions             GET   — List user's sessions
/api/sessions/[id]        GET   — Get session detail
/api/sessions/[id]        PATCH — Update session
/api/sessions/[id]        DELETE — Soft-delete session

/api/sessions/[id]/documents      POST   — Upload PDF
/api/sessions/[id]/documents      GET    — List documents
/api/sessions/[id]/documents/[docId] DELETE — Delete document

/api/sessions/[id]/analyze        POST  — Trigger Part 1-2 analysis (Claude)
/api/sessions/[id]/chat           POST  — Send message, stream response (Claude)
/api/sessions/[id]/messages       GET   — Get message history

/api/sessions/[id]/voice/start    POST  — Initialize OpenAI Realtime session
/api/sessions/[id]/voice/end      POST  — End voice session, save transcript
```

## Environment Variables

Required in `.env.local`:
```
ANTHROPIC_API_KEY=sk-ant-...
OPENAI_API_KEY=sk-...
NEXT_PUBLIC_SUPABASE_URL=https://xxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**NEXT_PUBLIC_ prefix:** Only for Supabase URL and anon key (needed for client-side auth).
**All other keys:** Server-side only, never prefixed with NEXT_PUBLIC_.

## Coding Conventions

- Use TypeScript for API routes, JavaScript/JSX for frontend components
- Use `async/await` consistently, not `.then()` chains
- API routes: always validate auth first, then validate input, then process
- Error responses: `{ error: string }` with appropriate HTTP status codes
- Frontend: functional components with hooks, no class components
- Styling: Tailwind utility classes, dark theme (navy/charcoal aesthetic matching the deal-room feel)
- File naming: kebab-case for routes, PascalCase for components

## Build Sequence

Follow this order — each phase builds on the previous:

### Phase 1: Foundation
1. Next.js project setup with Tailwind
2. Supabase project + database schema + RLS policies
3. Auth flow (signup, login, protected routes)
4. Dashboard page (session list)
5. Session setup form (deal info + toggles)

### Phase 2: Document Pipeline
6. Document upload endpoint with validation
7. Server-side PDF text extraction
8. Section identification via Claude
9. Processing status UI

### Phase 3: Claude Analysis
10. Port promptBuilder.js with full document context (no truncation)
11. Part 1 analysis endpoint with streaming
12. Part 2 analysis endpoint with streaming
13. Analysis view UI
14. Part 4 debrief generation

### Phase 4: Text Q&A
15. Chat endpoint with Claude streaming
16. Conversational context logic
17. Text Q&A UI with persona indicators
18. Phase transitions and stop commands

### Phase 5: Voice Q&A
19. Voice session initialization (ephemeral token)
20. WebRTC voice UI component
21. Persona voice mapping
22. Real-time transcript capture
23. Voice/text mode toggle

## What NOT to Build (v1)

Do NOT add these features — they are explicitly deferred:
- Animated avatars or panel view with faces
- PowerPoint or PDF export of debriefs
- Remote participant invites or multi-user sessions
- Demo mode or tutorial overlay
- Competency radar charts or score visualizations
- Multi-language support
- Multi-tenant/workspace architecture
- Stripe billing integration (handle payments manually for first users)
