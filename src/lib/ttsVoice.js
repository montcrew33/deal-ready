/**
 * TTS voice selector — picks the most natural-sounding available voice
 * for each persona, preferring neural/natural voices (Google, Microsoft).
 *
 * Persona gender map:
 *   Female: panel_lead (Alexandra), technical_cfo (Diane), operating_partner (Sarah)
 *   Male:   pe_partner (Marcus), corp_dev (James), ops_ai_expert (Ravi)
 */

const PERSONA_GENDER = {
  panel_lead:       "female",
  technical_cfo:    "female",
  operating_partner:"female",
  pe_partner:       "male",
  corp_dev:         "male",
  ops_ai_expert:    "male",
};

// Preferred voice name substrings, ordered by quality preference
// Neural/HD voices first — these are the most natural sounding
const PREFERRED_FEMALE = [
  // Microsoft Edge Neural (highest quality available in browsers)
  "microsoft aria", "aria online", "aria (natural)",
  "microsoft jenny", "jenny online", "jenny (natural)",
  "microsoft michelle", "michelle online",
  "microsoft sonia", "sonia online", "sonia (natural)",
  "microsoft natasha", "natasha online",
  "microsoft claire", "claire online",
  "microsoft libby", "libby online",
  "microsoft mia", "mia online",
  // Google high-quality
  "google uk english female",
  "google us english",
  // macOS neural
  "samantha (enhanced)", "karen (enhanced)", "tessa (enhanced)",
  "samantha", "karen", "tessa", "moira",
  // Generic fallbacks
  "aria", "jenny", "michelle", "sonia", "natasha", "claire", "zira",
  "female", "woman",
];

const PREFERRED_MALE = [
  // Microsoft Edge Neural
  "microsoft guy", "guy online", "guy (natural)",
  "microsoft ryan", "ryan online", "ryan (natural)",
  "microsoft eric", "eric online",
  "microsoft brian", "brian online",
  "microsoft andrew", "andrew online",
  "microsoft william", "william online",
  "microsoft liam", "liam online",
  // Google high-quality
  "google uk english male",
  // macOS neural
  "daniel (enhanced)", "alex (enhanced)", "oliver (enhanced)",
  "daniel", "alex", "oliver", "fred",
  // Generic fallbacks
  "guy", "ryan", "eric", "brian", "james", "ravi",
  "male", "man",
];

function getVoices() {
  return new Promise((resolve) => {
    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) { resolve(voices); return; }
    const handler = () => {
      resolve(window.speechSynthesis.getVoices());
      window.speechSynthesis.removeEventListener("voiceschanged", handler);
    };
    window.speechSynthesis.addEventListener("voiceschanged", handler);
    setTimeout(() => resolve(window.speechSynthesis.getVoices()), 1500);
  });
}

function scoreVoice(voice, preferred) {
  const name = voice.name.toLowerCase();
  // Bonus for "online", "natural", "neural", "enhanced" — these are higher quality
  const qualityBonus = /online|natural|neural|enhanced|hd/.test(name) ? 5 : 0;
  for (let i = 0; i < preferred.length; i++) {
    if (name.includes(preferred[i])) return (preferred.length - i) + qualityBonus;
  }
  // Small bonus even for unlisted voices that sound high quality
  return qualityBonus > 0 ? 0.5 : -1;
}

export async function getBestVoice(persona) {
  if (!window.speechSynthesis) return null;

  const voices = await getVoices();
  if (!voices.length) return null;

  const gender = PERSONA_GENDER[persona] || "female";
  const preferred = gender === "female" ? PREFERRED_FEMALE : PREFERRED_MALE;
  const oppositePreferred = gender === "female" ? PREFERRED_MALE : PREFERRED_FEMALE;

  // Filter to English voices only
  const englishVoices = voices.filter(v => v.lang && (v.lang.startsWith("en-US") || v.lang.startsWith("en-GB") || v.lang.startsWith("en-AU")));
  const pool = englishVoices.length > 0 ? englishVoices : voices.filter(v => v.lang?.startsWith("en"));

  let best = null;
  let bestScore = -Infinity;

  for (const voice of pool) {
    const s = scoreVoice(voice, preferred);
    if (s > bestScore) { bestScore = s; best = voice; }
  }

  // If nothing matched primary preference, try opposite
  if (bestScore < 0) {
    for (const voice of pool) {
      const s = scoreVoice(voice, oppositePreferred);
      if (s > bestScore) { bestScore = s; best = voice; }
    }
  }

  return best || pool[0] || voices[0];
}

/**
 * Persona-tuned speech parameters for natural delivery.
 * Slightly slower rates + natural pitch variation per persona character.
 * volume: slightly under 1.0 sounds warmer on most TTS engines.
 */
export function getPersonaSpeechParams(persona) {
  const params = {
    panel_lead:        { rate: 0.90, pitch: 1.0,  volume: 0.95 },  // Alexandra — measured authority
    pe_partner:        { rate: 0.85, pitch: 0.88, volume: 0.95 },  // Marcus — slow, deliberate, low
    technical_cfo:     { rate: 0.93, pitch: 1.05, volume: 0.95 },  // Diane — precise, focused
    corp_dev:          { rate: 0.91, pitch: 0.94, volume: 0.95 },  // James — calm, collegial
    operating_partner: { rate: 0.94, pitch: 1.06, volume: 0.95 },  // Sarah — practical, warm
    ops_ai_expert:     { rate: 0.88, pitch: 0.92, volume: 0.95 },  // Ravi — thoughtful, methodical
  };
  return params[persona] || { rate: 0.90, pitch: 1.0, volume: 0.95 };
}

/**
 * Clean and prepare text for natural-sounding TTS.
 * - Removes markdown
 * - Expands common abbreviations that TTS mispronounces
 * - Keeps sentences intact (no mid-sentence truncation)
 * - Limits to a sensible length
 */
export function cleanTextForSpeech(text, maxChars = 700) {
  let clean = text
    // Remove markdown
    .replace(/\*\*(.*?)\*\*/g, "$1")
    .replace(/\*(.*?)\*/g, "$1")
    .replace(/[#_`~]/g, "")
    .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1")
    // Remove persona label prefixes like "**Marcus:**" or "[Marcus Webb]:"
    .replace(/^\[?[A-Z][a-z]+(?: [A-Z][a-z]+)?\]?:\s*/gm, "")
    // Expand abbreviations TTS mangles
    .replace(/\bEBITDA\b/g, "EBEETDA")
    .replace(/\bQofE\b/g, "Q of E")
    .replace(/\bOEE\b/g, "O E E")
    .replace(/\bOTIF\b/g, "O-TIF")
    .replace(/\bKPIs?\b/g, "KPIs")
    .replace(/\bCFO\b/g, "CFO")
    .replace(/\bCEO\b/g, "CEO")
    .replace(/\bCOO\b/g, "COO")
    .replace(/\bP&L\b/g, "P and L")
    .replace(/\bM&A\b/g, "M and A")
    .replace(/\bLBO\b/g, "L B O")
    .replace(/\bIRR\b/g, "I R R")
    .replace(/\bARR\b/g, "A R R")
    .replace(/\bNRR\b/g, "N R R")
    .replace(/\bDSO\b/g, "D S O")
    .replace(/\bERP\b/g, "E R P")
    .replace(/\bCRM\b/g, "C R M")
    .replace(/\bLoI\b/gi, "letter of intent")
    // Remove bullet/list markers
    .replace(/^[-•·]\s+/gm, "")
    // Normalize whitespace
    .replace(/\s+/g, " ")
    .trim();

  if (clean.length <= maxChars) return clean;

  // Truncate at a sentence boundary
  const truncated = clean.substring(0, maxChars);
  const lastSentence = Math.max(
    truncated.lastIndexOf(". "),
    truncated.lastIndexOf("? "),
    truncated.lastIndexOf("! ")
  );
  return lastSentence > maxChars * 0.6
    ? truncated.substring(0, lastSentence + 1)
    : truncated;
}

/**
 * Detect which persona is speaking based on name mentions at the start of AI output.
 * The AI prefixes responses with "Marcus: ..." or "**Diane:**" etc. per system prompt.
 * Returns persona key or null if not detected.
 */
export function detectSpeakerFromText(text) {
  // Check the first 80 chars — that's where the speaker prefix lives
  const prefix = text.replace(/\*\*/g, "").trim().substring(0, 80).toLowerCase();

  // Ordered so "dr. ravi" matches before "ravi"
  const NAMES = [
    ["dr. ravi", "ops_ai_expert"],
    ["dr ravi", "ops_ai_expert"],
    ["ravi", "ops_ai_expert"],
    ["marcus", "pe_partner"],
    ["diane", "technical_cfo"],
    ["alexandra", "panel_lead"],
    ["james", "corp_dev"],
    ["sarah", "operating_partner"],
  ];

  for (const [name, key] of NAMES) {
    // Require the name to appear right at the start or as "Name:" pattern
    const startsWithName = prefix.startsWith(name);
    const hasColonPattern = new RegExp(`^[^a-z]{0,3}${name}[^a-z]{0,3}:`).test(prefix);
    if (startsWithName || hasColonPattern) return key;
  }
  return null;
}