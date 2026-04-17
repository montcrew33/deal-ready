// Document processing pipeline
// Runs server-side only — extracts text from PDF, identifies sections via Claude

import { createServerClient } from './supabase-server';
import { callClaude } from './claude-client';
import { auditLog } from './auth-helpers';

export async function processDocument(docId, storagePath, sessionId, userId) {
  const supabase = createServerClient();

  // Update status to processing
  await supabase
    .from('session_documents')
    .update({ processing_status: 'processing' })
    .eq('id', docId);

  try {
    // 1. Download file from storage
    const { data: fileData, error: downloadError } = await supabase.storage
      .from('documents')
      .download(storagePath);

    if (downloadError) {
      throw new Error(`Download failed: ${downloadError.message}`);
    }

    // 2. Extract text from PDF
    const pdfParse = (await import('pdf-parse')).default;
    const buffer = Buffer.from(await fileData.arrayBuffer());
    const pdf = await pdfParse(buffer);

    const fullText = pdf.text;
    const pageCount = pdf.numpages;

    if (!fullText || fullText.trim().length < 100) {
      throw new Error('PDF appears to be empty or image-only (no extractable text)');
    }

    // 3. Identify sections using Claude
    const sections = await identifySections(fullText);

    // 4. Update document record with extracted content
    await supabase
      .from('session_documents')
      .update({
        extracted_text: fullText,
        sections: sections,
        page_count: pageCount,
        processing_status: 'completed',
        processed_at: new Date().toISOString(),
      })
      .eq('id', docId);

    // 5. Audit log
    await auditLog(userId, sessionId, 'document_process', {
      document_id: docId,
      page_count: pageCount,
      text_length: fullText.length,
      sections_found: Object.keys(sections).filter(k => sections[k] !== null).length,
    });

  } catch (error) {
    // Update status to failed
    await supabase
      .from('session_documents')
      .update({
        processing_status: 'failed',
        error_message: error.message,
      })
      .eq('id', docId);

    await auditLog(userId, sessionId, 'document_process_failed', {
      document_id: docId,
      error: error.message,
    });

    throw error;
  }
}

async function identifySections(fullText) {
  // Truncate to ~100K chars for section identification (Claude can handle this)
  const text = fullText.substring(0, 100000);

  const result = await callClaude({
    system: `You are a document structure analyzer specializing in M&A deal documents (CIMs, management presentations, financial summaries).

Given the extracted text of a deal document, identify and extract the key sections. Return ONLY valid JSON, no markdown, no explanation.

Required format:
{
  "executive_summary": "full text of executive summary section or null",
  "business_description": "full text of business/company overview or null",
  "products_services": "full text of products/services description or null",
  "market_industry": "full text of market/industry analysis or null",
  "customers": "full text of customer information or null",
  "financial_overview": "full text of financial data, income statements, balance sheets or null",
  "management_team": "full text of management/team information or null",
  "growth_strategy": "full text of growth plans/opportunities or null",
  "operations": "full text of operational details, facilities, equipment or null",
  "risk_factors": "full text of risks, sensitivities, concerns or null",
  "transaction_overview": "full text of deal structure, process, timeline or null",
  "other": "any other important content not fitting above categories or null"
}

Include the FULL text of each section, not summaries. If a section doesn't exist in the document, use null.`,
    messages: [{ role: 'user', content: text }],
    maxTokens: 8000,
  });

  try {
    // Parse the JSON response, handling potential markdown wrapping
    const cleaned = result.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
    return JSON.parse(cleaned);
  } catch (e) {
    // If Claude's response isn't valid JSON, return the full text as a single section
    console.error('Section identification failed to parse:', e.message);
    return {
      executive_summary: null,
      business_description: null,
      products_services: null,
      market_industry: null,
      customers: null,
      financial_overview: null,
      management_team: null,
      growth_strategy: null,
      operations: null,
      risk_factors: null,
      transaction_overview: null,
      other: fullText,
    };
  }
}

// Build document context for injection into prompts
// Replaces the old 6K character truncation with full structured content
export function buildDocumentContext(documents) {
  if (!documents || documents.length === 0) {
    return 'No materials uploaded. Use the company website and public information if available.';
  }

  const doc = documents[0]; // v1: single document per session
  const sections = doc.sections || {};

  const sectionTexts = Object.entries(sections)
    .filter(([key, val]) => val !== null && val.trim().length > 0)
    .map(([key, val]) => {
      const label = key.replace(/_/g, ' ').toUpperCase();
      return `--- ${label} ---\n${val}`;
    })
    .join('\n\n');

  if (sectionTexts.length === 0 && doc.extracted_text) {
    // Fallback: use full extracted text if section identification failed
    return `The following materials have been provided:\n\n${doc.extracted_text}`;
  }

  return `The following materials have been provided:\n\n${sectionTexts}`;
}
