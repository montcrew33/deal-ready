// Document processing pipeline
// Runs server-side only — extracts text from PDF, identifies sections via Claude

import { createServerClient } from './supabase-server';
import { callClaudeWithTool } from './claude-client';
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

const SECTION_TOOL = {
  name: 'extract_document_sections',
  description: 'Extract and categorise the key sections of an M&A deal document (CIM, management presentation, financial summary). Include the full text of each section found. Set a field to null if that section does not appear in the document.',
  input_schema: {
    type: 'object',
    properties: {
      executive_summary:    { type: ['string', 'null'], description: 'Full text of the executive summary section' },
      business_description: { type: ['string', 'null'], description: 'Full text of the business or company overview section' },
      products_services:    { type: ['string', 'null'], description: 'Full text of the products and/or services description' },
      market_industry:      { type: ['string', 'null'], description: 'Full text of the market or industry analysis section' },
      customers:            { type: ['string', 'null'], description: 'Full text of the customer or client information section' },
      financial_overview:   { type: ['string', 'null'], description: 'Full text of financial data including income statements, balance sheets, and KPIs' },
      management_team:      { type: ['string', 'null'], description: 'Full text of management team or organisational information' },
      growth_strategy:      { type: ['string', 'null'], description: 'Full text of growth plans, opportunities, or strategic initiatives' },
      operations:           { type: ['string', 'null'], description: 'Full text of operational details including facilities, equipment, and processes' },
      risk_factors:         { type: ['string', 'null'], description: 'Full text of risks, sensitivities, or known concerns' },
      transaction_overview: { type: ['string', 'null'], description: 'Full text of deal structure, process, or timeline information' },
      other:                { type: ['string', 'null'], description: 'Any other important content that does not fit the above categories' },
    },
    required: [
      'executive_summary', 'business_description', 'products_services',
      'market_industry', 'customers', 'financial_overview', 'management_team',
      'growth_strategy', 'operations', 'risk_factors', 'transaction_overview', 'other',
    ],
  },
};

async function identifySections(fullText) {
  return callClaudeWithTool({
    system: 'You are a document structure analyser specialising in M&A deal documents. Extract every section using the provided tool. Include the full text of each section — do not summarise.',
    messages: [{ role: 'user', content: fullText }],
    tool: SECTION_TOOL,
    maxTokens: 8000,
  });
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
