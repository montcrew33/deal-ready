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
    temperature: 0.7,
    system,
    messages,
  });

  return response.content[0].text;
}

// Tool Use call — forces Claude to populate a strict schema, returns parsed JS object
// Use this instead of callClaude whenever you need structured JSON output
export async function callClaudeWithTool({ system, messages, tool, maxTokens = 4000 }) {
  const claude = getClaudeClient();

  const response = await claude.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    temperature: 0.7,
    system,
    messages,
    tools: [tool],
    tool_choice: { type: 'tool', name: tool.name },
  });

  const toolUse = response.content.find(block => block.type === 'tool_use');
  if (!toolUse) throw new Error(`Claude did not invoke tool: ${tool.name}`);
  return toolUse.input; // already a parsed JS object — no JSON.parse needed
}

// Streaming call (for analysis and Q&A)
export async function streamClaude({ system, messages, maxTokens = 4000 }) {
  const claude = getClaudeClient();

  const stream = claude.messages.stream({
    model: 'claude-sonnet-4-6',
    max_tokens: maxTokens,
    temperature: 0.7,
    system,
    messages,
  });

  return stream;
}
