import { PERSONA_PROFILES, buildRichPersonaContext, getEscalationContext } from "@/lib/personaProfiles";

/**
 * Extended keyword signals for each persona — expanded to match the deeper profiles.
 * Weighted: primary signals (2 points) vs secondary signals (1 point).
 */
const PERSONA_SIGNALS = {
  pe_partner: {
    primary: [
      "ebitda", "multiple", "irr", "leverage", "lbo", "free cash", "cash conversion",
      "quality of earnings", "qoe", "arr", "nrr", "churn", "recurring revenue",
      "value creation", "exit", "portco", "hold period", "add-on", "platform",
      "adjusted ebitda", "normalized", "management discount", "carry"
    ],
    secondary: [
      "scalab", "kpi", "diligence", "debt", "returns", "post-close",
      "covenant", "sponsor", "management depth", "earn-out", "earnout",
      "retention", "upside case", "base case", "downside", "sensitivity"
    ]
  },

  technical_cfo: {
    primary: [
      "working capital", "capex", "revenue recognition", "deferred revenue",
      "gross margin", "operating margin", "qoe", "audit", "gaap", "restatement",
      "dso", "accounts receivable", "accounts payable", "cash conversion cycle",
      "management accounts", "statutory", "variance", "budget vs actual",
      "backlog", "pipeline conversion", "inventory turns", "close process"
    ],
    secondary: [
      "margin", "depreciation", "amortization", "forecast", "budget",
      "collections", "billing", "financing", "ar", "ap", "nwc",
      "revenue bridge", "ebitda bridge", "peg", "normalisation",
      "accrual", "prepayment", "contract liability"
    ]
  },

  corp_dev: {
    primary: [
      "integration", "synerg", "strategic acqui", "change of control", "portability",
      "cross-sell", "channel overlap", "customer overlap", "cultural fit",
      "product fit", "technology stack", "retention post-close", "key accounts",
      "day 1", "day 90", "100-day", "subsidiary", "parent company"
    ],
    secondary: [
      "brand", "distribution", "market share", "consolidation", "acqui",
      "competitor", "strategic fit", "geographic expansion", "customer transfer",
      "org structure post", "reporting line", "earn-out", "earnout"
    ]
  },

  operating_partner: {
    primary: [
      "operations", "bench strength", "succession", "erp", "crm", "systems maturity",
      "headcount plan", "hiring plan", "attrition", "voluntary turnover",
      "process documentation", "institutional knowledge", "operational scalability",
      "capacity constraint", "bottleneck", "100-day plan", "onboarding"
    ],
    secondary: [
      "talent", "culture", "org structure", "productivity", "efficiency",
      "utilization", "leadership team", "management depth", "retention",
      "process", "operational", "team", "headcount", "hiring"
    ]
  },

  panel_lead: {
    primary: [
      "why us", "why now", "strategic narrative", "competitive advantage", "moat",
      "differentiat", "investable", "track record", "credibility", "vision",
      "mission", "self-aware", "key-man", "founder dependency",
      "management team cohesion", "strategic story"
    ],
    secondary: [
      "why", "overall", "summary", "positioning", "story", "compelling",
      "trust", "conviction", "leadership", "long-term", "board", "sponsor"
    ]
  },

  ops_ai_expert: {
    primary: [
      "oee", "utilization", "lean", "six sigma", "kaizen", "continuous improvement",
      "supply chain", "single source", "otif", "takt time", "throughput",
      "ai readiness", "machine learning", "automation", "iot", "mes",
      "capex", "maintenance capex", "asset base", "plant capacity", "production line",
      "workforce productivity", "labor efficiency", "operational excellence"
    ],
    secondary: [
      "manufacturing", "operations", "plant", "equipment", "inventory", "procurement",
      "vendor", "supplier", "logistics", "digital", "data pipeline", "uptime",
      "bottleneck", "constraint", "process improvement", "ai", "technology stack",
      "deferred maintenance", "asset age", "capacity headroom"
    ]
  }
};

/**
 * Score each persona based on weighted keyword matching.
 */
export function detectPersonaFromContent(content) {
  if (!content) return null;
  const lower = content.toLowerCase();

  const scores = {};
  for (const [persona, { primary, secondary }] of Object.entries(PERSONA_SIGNALS)) {
    const primaryScore = primary.filter(s => lower.includes(s)).length * 2;
    const secondaryScore = secondary.filter(s => lower.includes(s)).length;
    scores[persona] = primaryScore + secondaryScore;
  }

  const maxScore = Math.max(...Object.values(scores));
  if (maxScore < 2) return null; // Require at least one primary signal or two secondary

  const winners = Object.entries(scores).filter(([, s]) => s === maxScore);
  return winners[0][0];
}

/**
 * Get the panel members for a given buyer lens.
 */
export function getPanelForLens(buyerLens) {
  if (buyerLens === "Strategic Acquirer") return ["panel_lead", "corp_dev", "technical_cfo", "ops_ai_expert"];
  if (buyerLens === "Mixed") return ["panel_lead", "pe_partner", "corp_dev", "technical_cfo", "ops_ai_expert"];
  return ["panel_lead", "pe_partner", "technical_cfo", "operating_partner", "ops_ai_expert"];
}

/**
 * Round-robin next speaker, biased toward persona signals in content.
 */
export function getNextSpeaker(currentSpeaker, responseContent, buyerLens) {
  const panel = getPanelForLens(buyerLens);
  const detected = detectPersonaFromContent(responseContent);

  if (detected && panel.includes(detected) && detected !== currentSpeaker) {
    return detected;
  }

  const currentIndex = panel.indexOf(currentSpeaker);
  const nextIndex = (currentIndex + 1) % panel.length;
  return panel[nextIndex];
}

/**
 * Build a rich persona voice context block — uses deep profiles.
 * Pass the previous answer to detect escalation triggers.
 */
export function buildPersonaContext(personaKey, previousAnswer = "") {
  const richContext = buildRichPersonaContext(personaKey);
  const escalation = getEscalationContext(personaKey, previousAnswer);
  return richContext + escalation;
}