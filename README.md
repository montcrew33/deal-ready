# DealReady — M&A Seller Prep AI

Battle-test your management team before the real management presentation.

## Quick Setup

### 1. Install dependencies
```bash
npm install
```

### 2. Set up Supabase
1. Go to [supabase.com](https://supabase.com) and create a new project (US East region)
2. Go to **SQL Editor** → New Query → paste the contents of `supabase/schema.sql` → Run
3. Go to **Settings** → **API** and copy your keys

### 3. Configure environment
```bash
cp .env.example .env.local
```
Edit `.env.local` with your actual keys:
- `ANTHROPIC_API_KEY` — from [console.anthropic.com](https://console.anthropic.com)
- `OPENAI_API_KEY` — from [platform.openai.com](https://platform.openai.com)
- `NEXT_PUBLIC_SUPABASE_URL` — from Supabase dashboard
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — from Supabase dashboard
- `SUPABASE_SERVICE_ROLE_KEY` — from Supabase dashboard (keep secret!)

### 4. Run the dev server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000)

## Project Structure

```
src/
  app/
    api/
      sessions/           — Session CRUD
      sessions/[id]/
        analyze/          — Part 1-2 Claude analysis (streaming)
        chat/             — Part 3 text Q&A + Part 4 debrief (streaming)
        documents/        — PDF upload + processing
        voice/start/      — OpenAI Realtime session init
    page.jsx              — Landing page
    layout.jsx            — Root layout
  lib/
    promptBuilder.js      — Core prompt logic (from prototype)
    personaProfiles.js    — 6 buyer personas (from prototype)
    personaRouter.js      — Persona keyword routing (from prototype)
    document-processor.js — PDF extraction + section identification
    claude-client.js      — Anthropic API wrapper
    supabase-server.js    — Server-side Supabase client
    supabase-client.js    — Client-side Supabase client
    auth-helpers.js       — Auth middleware + audit logging

supabase/
  schema.sql              — Database schema (run in Supabase SQL Editor)
```

## Security

- All documents encrypted at rest (AES-256) and in transit (TLS 1.3)
- Row Level Security on every database table
- API keys server-side only
- Audit trail on all document operations
- See CLAUDE.md for full security requirements
