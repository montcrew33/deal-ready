// Claude API client for server-side use only
// NEVER import this in client-side components

import Anthropic from '@anthropic-ai/sdk';

let client = null;

export function getClaudeClient() {
  if (!client) {
    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      throw new Error('ANTHROPIC_API_KEY not set');
    }
    client = new Anthropic({ apiKey });
  }
  return client;
}

// Standard non-streaming call (for document section identification)
export async function callClaude({ system, messages, maxTokens = 4000 }) {
  const claude = getClaudeClient();
  
  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system,
    messages,
  });

  return response.content[0].text;
}

// Streaming call (for analysis and Q&A)
export async function streamClaude({ system, messages, maxTokens = 4000 }) {
  const claude = getClaudeClient();
  
  const stream = claude.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    system,
    messages,
  });

  return stream;
}
