/**
 * Parse session messages to extract structured performance data
 * for the debrief dashboard visualizations.
 */

// Competency areas and their keyword signals
const COMPETENCY_SIGNALS = {
  "Financial Rigor": [
    "ebitda", "margin", "cash", "revenue", "forecast", "budget", "working capital",
    "p&l", "financial", "numbers", "qoe", "capex", "accounting", "earnings", "profit"
  ],
  "Strategic Vision": [
    "strategy", "vision", "market", "competitive", "positioning", "differentiat",
    "growth", "opportunity", "why now", "narrative", "long-term", "roadmap", "moat"
  ],
  "Operational Excellence": [
    "operations", "process", "systems", "erp", "crm", "efficiency", "headcount",
    "team", "talent", "capacity", "scaling", "infrastructure", "org", "execution"
  ],
  "Commercial Acumen": [
    "customer", "sales", "pipeline", "churn", "retention", "arr", "nrr", "go-to-market",
    "channel", "pricing", "contract", "win rate", "deal", "revenue quality"
  ],
  "Leadership Credibility": [
    "credib", "trust", "track record", "leadership", "experience", "management team",
    "decision", "culture", "confidence", "ownership", "accountab", "self-aware"
  ],
  "Transaction Readiness": [
    "diligence", "qoe", "data room", "transition", "post-close", "earnout",
    "integration", "portab", "change of control", "representation", "warranty"
  ]
};

/**
 * Extract score from a scorecard-style AI message.
 * Looks for patterns like "Score: 6/10", "7/10", "Rating: 8", etc.
 */
function extractScore(content) {
  const patterns = [
    /score[:\s]+(\d+)\s*\/\s*10/i,
    /rating[:\s]+(\d+)\s*\/\s*10/i,
    /(\d+)\s*\/\s*10/,
    /\b([1-9]|10)\/10\b/
  ];
  for (const pat of patterns) {
    const match = content.match(pat);
    if (match) {
      const score = parseInt(match[1]);
      if (score >= 1 && score <= 10) return score;
    }
  }
  return null;
}

/**
 * Extract a short label for the question from an AI message.
 * Uses the first sentence or a bolded topic if present.
 */
function extractQuestionLabel(content) {
  // Try to get bold text (likely the question topic)
  const boldMatch = content.match(/\*\*([^*]{5,60})\*\*/);
  if (boldMatch) return boldMatch[1].substring(0, 40);
  // Fall back to first sentence
  const firstSentence = content.split(/[.!?]/)[0].trim();
  return firstSentence.substring(0, 40) + (firstSentence.length > 40 ? "…" : "");
}

/**
 * Score how well a user answer covers each competency area.
 * Returns a 0-100 score per competency.
 */
function scoreCompetencies(userMessages) {
  const scores = {};
  const counts = {};

  for (const [comp, signals] of Object.entries(COMPETENCY_SIGNALS)) {
    scores[comp] = 0;
    counts[comp] = 0;
  }

  // Count keyword hits across all user answers
  for (const msg of userMessages) {
    const lower = msg.content.toLowerCase();
    for (const [comp, signals] of Object.entries(COMPETENCY_SIGNALS)) {
      const hits = signals.filter(s => lower.includes(s)).length;
      scores[comp] += hits;
      counts[comp]++;
    }
  }

  // Normalize to 0-100
  const maxHits = Math.max(...Object.values(scores), 1);
  const result = {};
  for (const comp of Object.keys(COMPETENCY_SIGNALS)) {
    // Blend: keyword coverage (60%) + a baseline (40% = 45 so even silent areas don't go to 0)
    const raw = scores[comp] / maxHits;
    result[comp] = Math.round(45 + raw * 55);
  }

  return result;
}

/**
 * Extract Must-Fix vulnerabilities from AI critique messages in Part 3.
 * These are AI messages that contain score + critique, paired with a message index.
 */
function extractVulnerabilities(messages) {
  const vulns = [];

  const part3AiMessages = messages.filter(
    m => m.role === "assistant" && (m.phase === "part3" || m.phase === "part4")
  );

  for (let i = 0; i < part3AiMessages.length; i++) {
    const msg = part3AiMessages[i];
    const content = msg.content;
    const lower = content.toLowerCase();

    // Look for weakness/critique signals
    const weaknessSignals = [
      "weak answer", "insufficient", "not convincing", "vague", "failed to",
      "missed", "concern", "red flag", "poor", "inadequate", "evasive",
      "unsupported", "didn't address", "avoided", "score: [1-5]", "must fix",
      "critical gap", "dangerous", "significant risk"
    ];

    const hasWeakness = weaknessSignals.some(s => lower.includes(s));
    const score = extractScore(content);
    const isLowScore = score !== null && score <= 6;

    if (hasWeakness || isLowScore) {
      // Extract topic: look for bold labels, section headers, or first line
      let topic = "";
      const boldMatch = content.match(/\*\*([^*]{4,60})\*\*/);
      if (boldMatch) topic = boldMatch[1];
      else topic = content.split("\n")[0].replace(/[#*]/g, "").trim().substring(0, 60);

      // Extract brief description: first critique sentence
      let description = "";
      const critiquePatterns = [
        /critique[:\s]+([^.\n]{20,120})/i,
        /weakness[:\s]+([^.\n]{20,120})/i,
        /concern[:\s]+([^.\n]{20,120})/i,
        /([A-Z][^.\n]{30,100}(vague|weak|insufficient|missing|unsupported|evasive)[^.\n]{0,60})/i
      ];
      for (const pat of critiquePatterns) {
        const m = content.match(pat);
        if (m) { description = m[1].trim(); break; }
      }
      if (!description) {
        // fallback: second sentence
        const sentences = content.split(/[.!?]/).filter(s => s.trim().length > 20);
        description = sentences[1]?.trim().substring(0, 120) || "";
      }

      // Find the original message index in the full messages array
      const msgIndex = messages.findIndex(m => m === msg);

      vulns.push({
        id: `vuln-${i}`,
        topic: topic || `Exchange ${i + 1}`,
        description: description || "Weak or unconvincing response identified.",
        score: score,
        severity: score !== null ? (score <= 3 ? "critical" : score <= 5 ? "high" : "medium") : "high",
        messageIndex: msgIndex,
        phase: msg.phase
      });
    }
  }

  // Deduplicate by topic similarity, keep max 8
  const seen = new Set();
  return vulns
    .filter(v => {
      const key = v.topic.toLowerCase().substring(0, 20);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
}

/**
 * Build time-series score data from Part 3 AI messages.
 * Each point = one scored exchange.
 */
function buildScoreTimeline(messages) {
  const timeline = [];
  let exchangeNum = 0;

  const part3Messages = messages.filter(m => m.phase === "part3" && m.role === "assistant");

  for (const msg of part3Messages) {
    const score = extractScore(msg.content);
    if (score !== null) {
      exchangeNum++;
      timeline.push({
        exchange: exchangeNum,
        label: `Q${exchangeNum}`,
        score,
        topic: extractQuestionLabel(msg.content),
        messageIndex: messages.findIndex(m => m === msg)
      });
    }
  }

  return timeline;
}

/**
 * Master function: parse full session into dashboard data.
 */
export function parseSessionForDashboard(messages) {
  const userPart3 = messages.filter(m => m.phase === "part3" && m.role === "user");
  const scoreTimeline = buildScoreTimeline(messages);
  const competencyScores = scoreCompetencies(userPart3);
  const vulnerabilities = extractVulnerabilities(messages);

  // Overall score: average of scored exchanges or fallback
  const avgScore = scoreTimeline.length > 0
    ? Math.round(scoreTimeline.reduce((s, p) => s + p.score, 0) / scoreTimeline.length * 10) / 10
    : null;

  // Score trend: compare first half vs second half
  let trend = "neutral";
  if (scoreTimeline.length >= 4) {
    const mid = Math.floor(scoreTimeline.length / 2);
    const firstHalf = scoreTimeline.slice(0, mid).reduce((s, p) => s + p.score, 0) / mid;
    const secondHalf = scoreTimeline.slice(mid).reduce((s, p) => s + p.score, 0) / (scoreTimeline.length - mid);
    trend = secondHalf > firstHalf + 0.5 ? "improving" : secondHalf < firstHalf - 0.5 ? "declining" : "stable";
  }

  return {
    scoreTimeline,
    competencyScores,
    vulnerabilities,
    avgScore,
    trend,
    totalExchanges: scoreTimeline.length,
    criticalCount: vulnerabilities.filter(v => v.severity === "critical").length
  };
}