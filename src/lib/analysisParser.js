// analysisParser.js
// Pure JS — no imports. Safe for client-side use via useMemo.
// Parses the Part 2 markdown output into structured data for the tabbed UI.
// Every section falls back gracefully — parsing failures never throw.

/**
 * Split raw text into named sections by detecting header patterns like:
 *   A. SECTION TITLE
 *   ## SECTION TITLE
 *   **SECTION TITLE**
 * Returns an object: { sectionKey: rawText }
 */
function splitSections(text) {
  const sections = {};

  // Patterns that mark section boundaries (case-insensitive)
  const SECTION_PATTERNS = [
    { key: 'riskMap',     re: /^[A-Z][\.\)]\s*(BUYER RISK MAP|RISK MAP|RISK PROFILE|KEY RISKS?|RISK REGISTER)/im },
    { key: 'buyerPanel',  re: /^[A-Z][\.\)]\s*(BUYER PANEL|PANEL|PERSONA LENS|BUYER PERSONAS?|PANEL COMPOSITION)/im },
    { key: 'positioning', re: /^[A-Z][\.\)]\s*(POSITIONING|MANAGEMENT POSITIONING|NARRATIVE|RECOMMENDED POSITIONING)/im },
    { key: 'attackZones', re: /^[A-Z][\.\)]\s*(ATTACK ZONES?|PRIORITY ATTACK|PRIORITY QUESTION ZONES?|ATTACK VECTORS?|QUESTION ZONES?)/im },
  ];

  // Find match positions for each section
  const found = [];
  for (const { key, re } of SECTION_PATTERNS) {
    const match = re.exec(text);
    if (match) {
      found.push({ key, index: match.index, length: match[0].length });
    }
  }

  // Sort by position in document
  found.sort((a, b) => a.index - b.index);

  // Slice text between boundaries
  for (let i = 0; i < found.length; i++) {
    const start = found[i].index;
    const end = found[i + 1]?.index ?? text.length;
    sections[found[i].key] = text.slice(start, end).trim();
  }

  return sections;
}

/**
 * Parse individual risk items from a section block.
 * Looks for numbered bold patterns like:
 *   1. **Risk Title** — description
 *   **1. Risk Title**
 * Returns array of { title, description, severity, rawText }
 */
function parseRiskItems(block) {
  if (!block) return [];

  const items = [];

  // Split on numbered list items: "1.", "2.", etc. at start of line
  const chunks = block.split(/\n(?=\d+[\.\)]\s)/);

  for (const chunk of chunks) {
    if (!chunk.trim()) continue;

    // Extract title from bold or first line
    const titleMatch =
      chunk.match(/\*\*(.+?)\*\*/) ||
      chunk.match(/^\d+[\.\)]\s+(.+?)(?:\n|$)/);

    const title = titleMatch ? titleMatch[1].replace(/^\d+[\.\)]\s*/, '').trim() : '';
    if (!title) continue;

    // Detect severity from keywords in the chunk
    const lower = chunk.toLowerCase();
    let severity = 'medium';
    if (/\bcritical\b/.test(lower)) severity = 'critical';
    else if (/\bhigh\b/.test(lower)) severity = 'high';
    else if (/\blow\b/.test(lower)) severity = 'low';
    else if (/\bmedium\b|\bmoderate\b/.test(lower)) severity = 'medium';

    // Body text: everything after the title line
    const bodyLines = chunk.split('\n').slice(1).join('\n').trim();

    items.push({
      title: title.replace(/\*\*/g, '').replace(/^\d+[\.\)]\s*/, ''),
      description: bodyLines.replace(/\*\*(.+?)\*\*/g, '$1'),
      severity,
      rawText: chunk.trim(),
    });
  }

  return items;
}

/**
 * Parse buyer persona cards from the Buyer Panel section.
 * Looks for persona headers like:
 *   **Alexandra Chen — Panel Lead**
 *   ### Marcus Webb
 * Returns array of { name, role, style, agenda, rawText }
 */
function parsePersonaCards(block) {
  if (!block) return [];

  const cards = [];

  // Known persona names to anchor splits
  const PERSONA_NAMES = [
    'Alexandra', 'Marcus', 'Diane', 'James', 'Sarah', 'Ravi',
    'Panel Lead', 'PE Partner', 'CFO', 'Corp Dev', 'Operating Partner', 'Ops',
  ];

  // Split on lines containing bold persona-like headers
  const namePattern = new RegExp(
    `\\n(?=\\*\\*(?:${PERSONA_NAMES.join('|')})[^\\n]*\\*\\*|###\\s*(?:${PERSONA_NAMES.join('|')}))`,
    'i'
  );

  const chunks = block.split(namePattern);

  for (const chunk of chunks) {
    if (!chunk.trim()) continue;

    // Extract name/role from header
    const headerMatch =
      chunk.match(/^\*\*(.+?)\*\*/) ||
      chunk.match(/^###\s*(.+?)(?:\n|$)/m);

    if (!headerMatch) continue;

    const header = headerMatch[1].trim();
    const [namePart, rolePart] = header.split(/[—–-]/).map(s => s.trim());

    // Extract key fields from body
    const styleMatch = chunk.match(/(?:style|approach|tone)[:\s]+([^\n]+)/i);
    const agendaMatch = chunk.match(/(?:agenda|focus|obsess|priority|concern)[:\s]+([^\n]+)/i);
    const expectMatch = chunk.match(/(?:expect|will ask|question)[:\s]+([^\n]+)/i);

    cards.push({
      name: namePart || header,
      role: rolePart || '',
      style: styleMatch ? styleMatch[1].replace(/\*\*/g, '').trim() : '',
      agenda: agendaMatch ? agendaMatch[1].replace(/\*\*/g, '').trim() : '',
      expect: expectMatch ? expectMatch[1].replace(/\*\*/g, '').trim() : '',
      rawText: chunk.trim(),
    });
  }

  return cards;
}

/**
 * Parse the Positioning section into theme panels.
 * Returns { strengths[], vulnerabilities[], recommendations[], rawText }
 */
function parsePositioning(block) {
  if (!block) return { strengths: [], vulnerabilities: [], recommendations: [], rawText: '' };

  const extract = (pattern) => {
    const match = block.match(pattern);
    if (!match) return [];
    const sectionText = match[1];
    // Extract bullet points
    return sectionText
      .split('\n')
      .filter(l => /^[-•*]\s/.test(l.trim()) || /^\d+[\.\)]\s/.test(l.trim()))
      .map(l => l.replace(/^[-•*\d\.\)]\s+/, '').replace(/\*\*(.+?)\*\*/g, '$1').trim())
      .filter(Boolean);
  };

  const strengths = extract(/(?:strength|advantage|positive)[s]?[:\s\*]*\n([\s\S]+?)(?=\n(?:vuln|weakness|risk|recommend|$))/i);
  const vulnerabilities = extract(/(?:vuln|weakness|risk|gap)[s]?[:\s\*]*\n([\s\S]+?)(?=\n(?:strength|recommend|improve|$))/i);
  const recommendations = extract(/(?:recommend|action|improve|position)[s]?[:\s\*]*\n([\s\S]+?)(?=\n[A-Z]|$)/i);

  // Pull out any key value statements like "Narrative: ..."
  const narrativeMatch = block.match(/(?:narrative|positioning statement)[:\s]+([^\n]+)/i);
  const narrative = narrativeMatch ? narrativeMatch[1].replace(/\*\*/g, '').trim() : '';

  return {
    narrative,
    strengths,
    vulnerabilities,
    recommendations,
    rawText: block.trim(),
  };
}

/**
 * Parse Attack Zones into accordion items.
 * Returns array of { zone, priority, questions[], coaching, rawText }
 */
function parseAttackZones(block) {
  if (!block) return [];

  const zones = [];
  const chunks = block.split(/\n(?=\d+[\.\)]\s|\*\*\d+[\.\)]\s)/);

  for (const chunk of chunks) {
    if (!chunk.trim()) continue;

    const titleMatch =
      chunk.match(/^\*\*\d+[\.\)]\s*(.+?)\*\*/) ||
      chunk.match(/^\d+[\.\)]\s*\*\*(.+?)\*\*/) ||
      chunk.match(/^\d+[\.\)]\s+(.+?)(?:\n|$)/);

    if (!titleMatch) continue;

    const zone = titleMatch[1].replace(/\*\*/g, '').trim();

    // Extract priority
    const priorityMatch = chunk.match(/(?:priority|severity)[:\s]+(\w+)/i);
    const lower = chunk.toLowerCase();
    let priority = 'medium';
    if (priorityMatch) {
      priority = priorityMatch[1].toLowerCase();
    } else if (/\bhigh\b/.test(lower)) {
      priority = 'high';
    } else if (/\bcritical\b/.test(lower)) {
      priority = 'critical';
    } else if (/\blow\b/.test(lower)) {
      priority = 'low';
    }

    // Extract sample questions
    const questions = chunk
      .split('\n')
      .filter(l => /^[-•]\s/.test(l.trim()) && /\?/.test(l))
      .map(l => l.replace(/^[-•]\s+/, '').replace(/\*\*(.+?)\*\*/g, '$1').trim())
      .filter(Boolean);

    // Coaching notes
    const coachMatch = chunk.match(/(?:coach|guid|prep|how to answer|management should)[:\s]+([^\n]+)/i);
    const coaching = coachMatch ? coachMatch[1].replace(/\*\*/g, '').trim() : '';

    zones.push({ zone, priority, questions, coaching, rawText: chunk.trim() });
  }

  return zones;
}

/**
 * Main entry point.
 * @param {string} part2Text — raw Part 2 output from Claude
 * @returns {{ riskMap, buyerPanel, positioning, attackZones, parseError }}
 */
export function parseAnalysis(part2Text) {
  if (!part2Text || typeof part2Text !== 'string') {
    return { riskMap: [], buyerPanel: [], positioning: {}, attackZones: [], parseError: 'No analysis text provided' };
  }

  try {
    const sections = splitSections(part2Text);

    const riskMap = parseRiskItems(sections.riskMap || '');
    const buyerPanel = parsePersonaCards(sections.buyerPanel || '');
    const positioning = parsePositioning(sections.positioning || '');
    const attackZones = parseAttackZones(sections.attackZones || '');

    return {
      riskMap,
      buyerPanel,
      positioning,
      attackZones,
      sections, // raw section text for fallback rendering
      parseError: null,
    };
  } catch (err) {
    return {
      riskMap: [],
      buyerPanel: [],
      positioning: {},
      attackZones: [],
      sections: {},
      parseError: err.message || 'Parse failed',
    };
  }
}
