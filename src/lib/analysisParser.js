/**
 * analysisParser.js
 *
 * Pure JS — no imports. Safe for use in useMemo on the client.
 *
 * The Part 2 prompt asks Claude to produce four sections:
 *   A. Buyer Risk Map       — numbered vulnerability items with Severity + labeled fields
 *   B. Buyer Persona Lens   — one block per named persona with sub-fields
 *   C. Positioning Guidance — strongest themes, themes needing work, narrative, proof points, mistakes
 *   D. Priority Attack Zones — numbered zones with why/wrong/strong sub-sections
 *
 * Claude wraps numbered list items as "**1. Title**" (bold wraps whole item),
 * uses "- **Field:** value" for sub-fields, and puts persona names in bold headers.
 */

// ─── Severity helpers ─────────────────────────────────────────────────────────

const SEVERITY_PATTERNS = [
  { re: /\bcritical\b/i, level: 'critical' },
  { re: /🔴/,            level: 'critical' },
  { re: /\bhigh\b/i,     level: 'high' },
  { re: /🟠/,            level: 'high' },
  { re: /\bmedium\b|\bmoderate\b/i, level: 'medium' },
  { re: /🟡/,            level: 'medium' },
  { re: /\blow\b/i,      level: 'low' },
  { re: /🟢/,            level: 'low' },
];

function detectSeverity(text) {
  // Check "| Severity | 🔴 Critical |" table row, then "Severity: X" label, then scan top of text
  const severityLine =
    text.match(/\|\s*severity\s*\|\s*([^|\n]{1,40})/i)?.[1] ||
    text.match(/severity[:\s*_]+(.{1,30})/i)?.[1] ||
    '';
  const target = severityLine || text.slice(0, 300);
  for (const { re, level } of SEVERITY_PATTERNS) {
    if (re.test(target)) return level;
  }
  return 'medium';
}

// ─── Section splitter ─────────────────────────────────────────────────────────

function splitIntoSections(text) {
  if (!text) return {};
  const SECTION_KEYS = { A: 'riskMap', B: 'personaLens', C: 'positioning', D: 'attackZones' };

  // Try multiple heading styles per letter, in priority order
  const HEADING_RES = [
    /^#{1,3}\s*([A-D])[\.\)]\s+/,      // ## A. Title
    /^\*\*([A-D])[\.\)]\s+/,           // **A. Title
    /^([A-D])[\.\)]\s+/,               // A. Title  (plain)
    /^SECTION\s+([A-D])\b/i,           // SECTION A
  ];

  const found = [];
  const lines = text.split('\n');

  let charPos = 0;
  for (const line of lines) {
    for (const re of HEADING_RES) {
      const m = re.exec(line);
      if (m) {
        const letter = m[1].toUpperCase();
        if (SECTION_KEYS[letter] && !found.find(f => f.letter === letter)) {
          found.push({ letter, key: SECTION_KEYS[letter], pos: charPos });
        }
        break; // found a match for this line, stop trying other res
      }
    }
    charPos += line.length + 1;
  }

  found.sort((a, b) => a.pos - b.pos);

  const sections = {};
  for (let i = 0; i < found.length; i++) {
    const start = found[i].pos;
    const end = found[i + 1]?.pos ?? text.length;
    sections[found[i].key] = text.slice(start, end).trim();
  }
  return sections;
}

// ─── Numbered item splitter ───────────────────────────────────────────────────

/**
 * Split text into chunks at each numbered list item.
 * Handles all Claude numbered-item formats:
 *   **1. Title**          ← bold wraps whole item (most common)
 *   1. **Title**          ← number plain, title bold
 *   ### 1. Title          ← heading style
 *   1. Title              ← plain
 *   #1 — Title            ← hash+number+em-dash (Claude alt format)
 *   Zone 1 — Title        ← attack zone format
 */
function splitNumberedItems(text) {
  if (!text) return [];

  // Detect table-based formats Claude sometimes uses
  // - VULNERABILITY N: Title
  // - RISK N: Title
  // - ATTACK ZONE N: Title
  // Sometimes the entire header line is bold-wrapped: **VULNERABILITY 1: ...**
  if (/(?:\*{1,2}\s*)?(?:VULNERABILITY|RISK|ATTACK\s+ZONE)\s+\d+[:\.\)]/i.test(text)) {
    // Split on --- horizontal rules between items, OR on header lines
    return text
      .split(/\n-{3,}\n|\n(?=\s*\*{0,2}\s*(?:VULNERABILITY|RISK|ATTACK\s+ZONE)\s+\d+[:\.\)]\s)/i)
      .map(p => p.trim())
      .filter(Boolean);
  }

  // Detect "#N — Title" format (hash + number + em-dash/hyphen)
  // Allow optional space after "#", optional markdown wrappers, and optional leading headings
  if (/#\s*\d+\s*[—–-]/.test(text)) {
    return text
      .split(/\n-{3,}\n|\n(?=\s*(?:#{1,3}\s*)?\*{0,2}#\s*\d+\s*[—–-])/)
      .map(p => p.trim())
      .filter(Boolean);
  }

  // Detect "Zone N — Title" format
  // Allow optional markdown wrappers and headings, and tolerate "ZONE" casing
  if (/^\s*(?:#{1,3}\s*)?\*{0,2}Zone\s+\d+\s*[—–-]/im.test(text)) {
    return text
      .split(/\n-{3,}\n|\n(?=\s*(?:#{1,3}\s*)?\*{0,2}Zone\s+\d+\s*[—–-])/i)
      .map(p => p.trim())
      .filter(Boolean);
  }

  // Standard numbered list: **1. Title**, 1. Title, ### 1. Title
  const parts = text.split(/\n(?=\s*(?:\*{1,2}\s*)?\d+[\.\)]\s|\s*#{1,3}\s+\d+[\.\)]\s)/);
  return parts.map(p => p.trim()).filter(Boolean);
}

/**
 * Extract the title from a numbered chunk.
 * Returns the clean title string (no markdown, no leading number).
 */
function extractItemTitle(chunk) {
  const patterns = [
    // VULNERABILITY/RISK/ATTACK ZONE headers, sometimes bold-wrapped
    /^\s*\*{0,2}\s*(?:VULNERABILITY|RISK|ATTACK\s+ZONE)\s+\d+[:\.\)]\s+(.+?)(?:\n|$)/i,
    // "# 1 — Title" (optionally wrapped in **...** or preceded by ###)
    /^\s*(?:#{1,3}\s*)?\*{0,2}#\s*\d+\s*[—–-]\s*(.+?)(?:\n|$)/i, // #1 — Title
    // "Zone 1 — Title" (optionally wrapped in **...** or preceded by ###)
    /^\s*(?:#{1,3}\s*)?\*{0,2}Zone\s+\d+\s*[—–-]\s*(.+?)(?:\n|$)/i, // Zone 1 — Title
    /^\s*\*\*\d+[\.\)]\s+(.+?)\*\*/,                            // **1. Title**
    /^\s*\d+[\.\)]\s+\*\*(.+?)\*\*/,                            // 1. **Title**
    /^\s*#{1,3}\s*\d+[\.\)]\s+\*\*(.+?)\*\*/,                  // ### 1. **Title**
    /^\s*#{1,3}\s*\d+[\.\)]\s+(.+?)(?:\n|$)/,                  // ### 1. Title
    /^\s*\d+[\.\)]\s+(.+?)(?:\n|$)/,                            // 1. Title
  ];
  for (const re of patterns) {
    const m = chunk.match(re);
    if (m) return m[1].replace(/\*\*/g, '').trim();
  }
  return '';
}

// ─── Field extractors ─────────────────────────────────────────────────────────

/** Extract a single labeled field value.
 *  Handles both "**Label:** value" prose format and "| Label | value |" table format. */
function extractField(text, labelVariants) {
  for (const label of labelVariants) {
    // Table row: | Label | value | — try this first since it's unambiguous
    const tableRe = new RegExp(`\\|[^|]*${label}[^|]*\\|\\s*([^|\\n]{5,400})`, 'i');
    const tableMatch = tableRe.exec(text);
    if (tableMatch) {
      return tableMatch[1].replace(/\*\*/g, '').replace(/\|.*$/, '').trim();
    }
    // Prose format: **Label:** value  or  Label: value
    const re = new RegExp(`\\*{0,2}${label}\\*{0,2}[:\\s]+([^\\n]{5,400})`, 'i');
    const m = re.exec(text);
    if (m) return m[1].replace(/\*\*/g, '').replace(/^[-•*]\s*/, '').trim();
  }
  return '';
}

/** Extract a bullet list that appears after a labeled header */
function extractBulletListAfterLabel(text, labelPattern, maxItems = 6) {
  const labelRe = new RegExp(
    `\\*{0,2}${labelPattern}\\*{0,2}[:\\s]*(?:\\([^)]+\\))?[:\\s]*\\n?`,
    'i'
  );
  const labelMatch = labelRe.exec(text);
  if (!labelMatch) return [];

  const afterText = text.slice(labelMatch.index + labelMatch[0].length);
  const items = [];

  for (const line of afterText.split('\n')) {
    const s = line.trim();
    if (!s) { if (items.length > 0) break; continue; }
    // Stop at next bold section header or new numbered item
    if (/^\*\*[A-Z][\.\)]/.test(s) && items.length > 0) break;
    if (/^#{1,3}\s/.test(s) && items.length > 0) break;
    // Bullet or numbered line
    if (/^[-•*]\s/.test(s) || /^\d+[\.\)]\s/.test(s)) {
      const rawContent = s.replace(/^[-•*\d\.\)]+\s+/, '');
      // Stop if this bullet IS a bold section header like "- **What a strong answer requires:**"
      if (/^\*\*[A-Z].+\*\*:?\s*$/.test(rawContent) && items.length > 0) break;
      const content = rawContent.replace(/\*\*/g, '').trim();
      if (content) items.push(content);
      if (items.length >= maxItems) break;
    } else if (s && items.length > 0 && !/^\*\*/.test(s)) {
      // Continuation of last item
      items[items.length - 1] += ' ' + s.replace(/\*\*/g, '');
    }
  }
  return items.filter(Boolean);
}

// ─── A. Risk Map ──────────────────────────────────────────────────────────────

export function parseRiskMap(sectionText) {
  if (!sectionText) return { items: [], infoGaps: [] };

  const chunks = splitNumberedItems(sectionText);
  const items = [];

  for (const chunk of chunks) {
    if (!chunk.trim()) continue;

    const rawTitle = extractItemTitle(chunk);
    if (!rawTitle) continue;
    // Skip if it looks like a sub-field label, not a risk title
    if (/^(severity|why|how|what|preparation|buyer|key info)/i.test(rawTitle)) continue;

    const severity = detectSeverity(chunk);

    const buyerFear = extractField(chunk, [
      'buyer fear', 'buyer.?s fear', 'how a buyer frames it', 'framing'
    ]);
    const whyItMatters = extractField(chunk, [
      'why a buyer cares', 'why buyers care', 'why it matters', 'buyer concern'
    ]);
    const conclusion = extractField(chunk, [
      'what they conclude', 'conclusion', 'if handled poorly'
    ]);
    const priority = extractField(chunk, ['preparation priority', 'priority']);

    // Description = best available field, fallback to "Issue" table cell, then chunk body text
    const issueField = extractField(chunk, ['issue', 'the issue']);
    const description = buyerFear || whyItMatters || issueField ||
      chunk.split('\n')
        .slice(1)
        .map(l => l.replace(/\*\*/g, '').replace(/^[-•*\s]+/, '').trim())
        .filter(l => l && !/^severity|^why|^how|^what|^prep|^\|[-|]+\|/i.test(l))
        .filter(l => !l.startsWith('|---'))
        .join(' ')
        .slice(0, 300);

    items.push({
      title: rawTitle,
      severity,
      description,
      buyerFear,
      whyItMatters,
      conclusion,
      priority,
      rawText: chunk.trim(),
    });
  }

  // Extract "Key Information Gaps" or similar from section
  const gapsMatch = sectionText.match(
    /(?:key information gaps?|missing information|information gaps?)[:\s*\n]+([\s\S]+?)(?=\n#{1,3}|\n\*\*[A-D][\.\)]|\n[A-D][\.\)]|$)/i
  );
  let infoGaps = [];
  if (gapsMatch) {
    infoGaps = gapsMatch[1]
      .split(/\n|,/)
      .map(l => l.replace(/^[-•*\d\.\)]+\s*/, '').replace(/\*\*/g, '').trim())
      .filter(l => l.length > 3 && l.length < 80);
  }

  return { items, infoGaps };
}

// ─── B. Persona Lens ──────────────────────────────────────────────────────────

const KNOWN_PERSONAS = [
  { key: 'panel_lead',        first: 'Alexandra', full: 'Alexandra Chen',        initials: 'AC', role: 'Managing Partner',                color: 'bg-violet-100 text-violet-700 border-violet-300' },
  { key: 'pe_partner',        first: 'Marcus',    full: 'Marcus Webb',           initials: 'MW', role: 'Senior Partner — Blackridge PE',  color: 'bg-blue-100 text-blue-700 border-blue-300' },
  { key: 'technical_cfo',     first: 'Diane',     full: 'Diane Foster',          initials: 'DF', role: 'Operating CFO — Meridian Capital', color: 'bg-cyan-100 text-cyan-700 border-cyan-300' },
  { key: 'corp_dev',          first: 'James',     full: 'James Okafor',          initials: 'JO', role: 'Head of Corp Dev',                color: 'bg-amber-100 text-amber-700 border-amber-300' },
  { key: 'operating_partner', first: 'Sarah',     full: 'Sarah Lindqvist',       initials: 'SL', role: 'Operating Partner',               color: 'bg-emerald-100 text-emerald-700 border-emerald-300' },
  { key: 'ops_ai_expert',     first: 'Ravi',      full: 'Dr. Ravi Subramaniam',  initials: 'RS', role: 'Operating Principal — AI Practice', color: 'bg-rose-100 text-rose-700 border-rose-300' },
];

function splitPersonaBlocks(text) {
  if (!text) return [];
  const splits = [];
  const lines = text.split('\n');
  let charPos = 0;

  for (const line of lines) {
    for (const persona of KNOWN_PERSONAS) {
      // Match persona's first name at the start of a line (possibly after ** or ##)
      const re = new RegExp(`^(?:\\*{1,2}|#{1,3}\\s*)?(?:Dr\\.?\\s*)?${persona.first}\\s+\\w`, 'i');
      if (re.test(line.trim())) {
        if (!splits.find(s => s.persona.key === persona.key)) {
          splits.push({ persona, pos: charPos });
        }
        break;
      }
    }
    charPos += line.length + 1;
  }

  splits.sort((a, b) => a.pos - b.pos);

  return splits.map(({ persona, pos }, i) => ({
    persona,
    text: text.slice(pos, splits[i + 1]?.pos ?? text.length).trim(),
  }));
}

function extractPersonaQuestions(blockText) {
  // Find the questions sub-section
  const questionsSection = blockText.match(
    /(?:most dangerous|hardest|2 (?:most )?dangerous|their (?:2|two)|2 hardest)[^\n]*\n([\s\S]{0,800})/i
  )?.[1] || blockText;

  const questions = [];

  // Match quoted strings — allow both ? and . endings (some are imperative form)
  // Use multiple quote styles: ASCII " and typographic " "
  const quoteRe = /[""]([^"""]{10,250}?)[""]|"([^"]{10,250}?)"/g;
  let m;
  const searchIn = questionsSection;
  while ((m = quoteRe.exec(searchIn)) !== null) {
    const q = (m[1] || m[2]).trim();
    if (q.length > 10) questions.push(q);
    if (questions.length >= 2) break;
  }

  // Fallback: grab numbered lines that look like questions
  if (questions.length === 0) {
    for (const line of questionsSection.split('\n')) {
      const s = line.replace(/^\d+[\.\)]\s+/, '').replace(/^[-•*]\s+/, '').replace(/\*\*/g, '').trim()
        .replace(/^[""]/, '').replace(/[""]$/, '');
      if ((s.endsWith('?') || s.endsWith('.')) && s.length > 15) {
        questions.push(s);
        if (questions.length >= 2) break;
      }
    }
  }

  return questions.slice(0, 2);
}

function extractRedFlags(blockText) {
  // Handle inline comma-separated: "Red flags watching for: item1, item2"
  const inlineMatch = blockText.match(/(?:red flags?|watching for)[^\n]*?:\s*([^\n]+)/i);
  if (inlineMatch) {
    const items = inlineMatch[1]
      .split(',')
      .map(s => s.replace(/\*\*/g, '').trim())
      .filter(l => l.length > 2);
    if (items.length > 0) return items.slice(0, 4);
  }

  // Handle multi-line bullet list
  const section = blockText.match(
    /(?:red flags?|watching for|loses? (?:their )?confidence)[^\n]*\n([\s\S]{0,400})/i
  )?.[1] || '';

  return section
    .split('\n')
    .map(l => l.replace(/^[-•*\d\.\)]+\s*/, '').replace(/\*\*/g, '').trim())
    .filter(l => l.length > 5 && l.length < 120)
    .slice(0, 4);
}

export function parsePersonaLens(sectionText) {
  if (!sectionText) return [];
  const blocks = splitPersonaBlocks(sectionText);
  if (!blocks.length) return [];

  return blocks.map(({ persona, text: blockText }) => {
    const obsessions = extractBulletListAfterLabel(
      blockText, 'tests? hardest|core obsessions?|what (?:he|she|they) test'
    );
    const confidence = extractBulletListAfterLabel(
      blockText, 'loses? (?:their |his |her )?confidence|what loses'
    );
    const questions = extractPersonaQuestions(blockText);
    const redFlags = extractRedFlags(blockText);

    const hiddenAgendaMatch = blockText.match(
      /(?:hidden agenda|agenda)[:\s*\n]+([^\n]{20,300})/i
    );
    const hiddenAgenda = hiddenAgendaMatch
      ? hiddenAgendaMatch[1].replace(/\*\*/g, '').replace(/^[""]|[""]$/g, '').trim()
      : '';

    return { ...persona, obsessions, confidence, questions, redFlags, hiddenAgenda, rawText: blockText };
  });
}

// ─── C. Positioning ───────────────────────────────────────────────────────────

/**
 * Extract a numbered/bulleted list, returning [{title, description}].
 * Strips the leading number from titles.
 */
function extractListItems(text, afterLabelPattern, maxItems = 6) {
  const labelRe = new RegExp(
    `\\*{0,2}${afterLabelPattern}\\*{0,2}[:\\s]*(?:\\([^)]+\\))?[:\\s]*\\n?`,
    'i'
  );
  const labelMatch = labelRe.exec(text);
  if (!labelMatch) return [];

  const afterText = text.slice(labelMatch.index + labelMatch[0].length);
  const items = [];

  for (const line of afterText.split('\n')) {
    const s = line.trim();
    if (!s) { if (items.length > 0) break; continue; }
    if (/^#{1,3}\s/.test(s) && items.length > 0) break;
    if (/^\*\*[A-D][\.\)]/.test(s) && items.length > 0) break;
    // Stop at the next major bolded section header (not a list item)
    if (/^\*\*[A-Z][a-z]/.test(s) && !/^\*\*\d/.test(s) && items.length > 0) break;

    if (/^[-•*]\s/.test(s) || /^\d+[\.\)]\s/.test(s)) {
      // Strip leading number/bullet
      let content = s.replace(/^(?:\d+[\.\)]\s+|[-•*]\s+)/, '').replace(/\*\*/g, '').trim();
      // Split on " — " for title/description
      const dashIdx = content.indexOf(' — ');
      if (dashIdx > 0) {
        items.push({ title: content.slice(0, dashIdx).trim(), description: content.slice(dashIdx + 3).trim() });
      } else {
        items.push({ title: content, description: '' });
      }
      if (items.length >= maxItems) break;
    } else if (s && items.length > 0 && !/^\*\*/.test(s) && !/^#{1,3}/.test(s)) {
      // Continuation: becomes description of the last item
      if (!items[items.length - 1].description) {
        items[items.length - 1].description = s.replace(/\*\*/g, '').trim();
      }
    }
  }
  return items;
}

function extractNarrative(text) {
  // Blockquote: "> text"
  const bq = text.match(/^>\s*"?(.+?)"?\s*$/m);
  if (bq) return bq[1].trim();

  // After "most credible narrative" label, grab the quoted text
  const afterLabel = text.match(
    /(?:most credible narrative|single most credible|your narrative)[^\n]*\n\s*[""]?([^"\n]{30,500})[""]?/i
  );
  if (afterLabel) return afterLabel[1].replace(/\*\*/g, '').trim();

  // A standalone quoted string anywhere in the section
  const quote = text.match(/"([^"]{40,500})"/);
  if (quote) return quote[1].trim();

  return '';
}

export function parsePositioning(sectionText) {
  if (!sectionText) return { leadWith: [], fixBefore: [], narrative: '', proofPoints: [], mistakes: [], rawText: '' };

  const leadWith   = extractListItems(sectionText, 'strongest themes?|lead with|themes? (?:to )?lead', 7);
  const fixBefore  = extractListItems(sectionText, 'themes? needing work|fix before|work on|needs? work|areas? (?:to )?improve', 7);
  const narrative  = extractNarrative(sectionText);
  const proofPoints = extractListItems(sectionText, 'must.?land proof points?|proof points?|must memorize', 5);
  const mistakes   = extractListItems(sectionText, 'credibility mistakes?|mistakes? to avoid|avoid', 5);

  return { leadWith, fixBefore, narrative, proofPoints, mistakes, rawText: sectionText.trim() };
}

// ─── D. Attack Zones ─────────────────────────────────────────────────────────

export function parseAttackZones(sectionText) {
  if (!sectionText) return [];

  const chunks = splitNumberedItems(sectionText);
  const zones = [];

  for (const chunk of chunks) {
    if (!chunk.trim()) continue;

    const rawTitle = extractItemTitle(chunk);
    if (!rawTitle) continue;

    // Split title on " — " for title/subtitle
    const dashIdx = rawTitle.indexOf(' — ');
    const title    = dashIdx > 0 ? rawTitle.slice(0, dashIdx).trim() : rawTitle;
    const subtitle = dashIdx > 0 ? rawTitle.slice(dashIdx + 3).trim() : '';

    const whyMatters  = extractField(chunk, ['why it matters', 'why this matters', 'why buyers probe', 'why']);
    const weakTeams   = extractBulletListAfterLabel(chunk, 'what weak teams get wrong|weak teams?|wrong approach');
    const strongAnswer = extractBulletListAfterLabel(chunk, 'what (?:a )?strong (?:answer )?requires?|strong answer|what is required|what buyers need');

    zones.push({ title, subtitle, whyMatters, weakTeams, strongAnswer, rawText: chunk.trim() });
  }

  return zones;
}

// ─── Main entry ───────────────────────────────────────────────────────────────

export function parseAnalysis(part2Text) {
  if (!part2Text || typeof part2Text !== 'string') {
    return { riskMap: { items: [], infoGaps: [] }, personaLens: [], positioning: {}, attackZones: [], sections: {}, parseError: 'No text' };
  }

  try {
    const sections = splitIntoSections(part2Text);

    // Use isolated section text when available, fall back to full text
    const riskMap     = parseRiskMap(sections.riskMap     || part2Text);
    const personaLens = parsePersonaLens(sections.personaLens || part2Text);
    const positioning = parsePositioning(sections.positioning || part2Text);
    const attackZones = parseAttackZones(sections.attackZones || part2Text);

    return { riskMap, personaLens, positioning, attackZones, sections, parseError: null };
  } catch (err) {
    return {
      riskMap: { items: [], infoGaps: [] },
      personaLens: [],
      positioning: {},
      attackZones: [],
      sections: {},
      parseError: err.message || 'Parse failed',
    };
  }
}
