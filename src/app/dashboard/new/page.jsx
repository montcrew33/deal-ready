'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { toast } from 'sonner';

// Default toggle values derived from promptBuilder defaults
const DEFAULT_TOGGLES = {
  buyer_lens: 'Private Equity',
  pressure_level: 'Hard',
  question_style: 'Standard',
  coaching_mode: 'Off during live Q&A',
  answer_scoring: 'On',
  follow_up_intensity: 'Medium',
  bias_vulnerabilities: 'Normal',
  buyer_personas: 'Yes',
  focus_mode: 'Balanced',
  session_length: 'Standard',
  debrief_depth: 'Detailed',
  model_answers: 'On',
  management_experienced: 'Mixed',
  interrupt_rambling: 'Yes',
  challenge_unsupported: 'Yes',
};

function Field({ label, hint, children }) {
  return (
    <div>
      <label className="block text-sm font-medium text-foreground mb-1">{label}</label>
      {hint && <p className="text-xs text-muted mb-1.5">{hint}</p>}
      {children}
    </div>
  );
}

function Select({ value, onChange, options, disabled }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 transition"
    >
      {options.map(({ value: v, label: l }) => (
        <option key={v} value={v}>{l}</option>
      ))}
    </select>
  );
}

function Toggle({ label, hint, value, onToggle, disabled }) {
  const isOn = value === 'Yes' || value === 'On';
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border last:border-0">
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-foreground">{label}</p>
        {hint && <p className="text-xs text-muted mt-0.5">{hint}</p>}
      </div>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        className={`relative shrink-0 w-10 h-5 rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 ${
          isOn ? 'bg-primary' : 'bg-border'
        }`}
        aria-checked={isOn}
        role="switch"
      >
        <span
          className={`absolute top-0.5 left-0.5 w-4 h-4 rounded-full bg-white transition-transform ${
            isOn ? 'translate-x-5' : 'translate-x-0'
          }`}
        />
      </button>
    </div>
  );
}

function SectionHeader({ title, description }) {
  return (
    <div className="mb-5">
      <h2 className="text-base font-semibold text-foreground">{title}</h2>
      {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
    </div>
  );
}

export default function NewSessionPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const [fields, setFields] = useState({
    company_name: '',
    company_website: '',
    industry: '',
    transaction_context: 'sale_process',
    likely_buyer_type: 'private_equity',
    known_sensitivities: '',
    management_team: '',
    primary_objective: '',
  });

  const [toggles, setToggles] = useState(DEFAULT_TOGGLES);

  function setField(key, value) {
    setFields((f) => ({ ...f, [key]: value }));
  }

  function setToggle(key, value) {
    setToggles((t) => ({ ...t, [key]: value }));
  }

  function flipBool(key) {
    setToggles((t) => {
      const cur = t[key];
      const isOn = cur === 'Yes' || cur === 'On';
      const offVal = key === 'answer_scoring' || key === 'model_answers' ? 'Off' : 'No';
      const onVal = key === 'answer_scoring' || key === 'model_answers' ? 'On' : 'Yes';
      return { ...t, [key]: isOn ? offVal : onVal };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!fields.company_name.trim()) {
      toast.error('Company name is required');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...fields, toggles }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || 'Failed to create session');
        return;
      }

      toast.success('Session created');
      router.push('/dashboard');
    } catch {
      toast.error('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  const inputClass =
    'w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 transition';

  const textareaClass =
    'w-full px-3 py-2 rounded-lg bg-surface border border-border text-foreground placeholder:text-muted text-sm focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent disabled:opacity-50 transition resize-none';

  return (
    <div className="min-h-screen">
      {/* Top nav */}
      <header className="border-b border-border">
        <div className="max-w-3xl mx-auto px-6 h-14 flex items-center justify-between">
          <Link href="/dashboard" className="text-sm text-muted hover:text-foreground transition-colors">
            ← Dashboard
          </Link>
          <span className="font-semibold text-foreground tracking-tight">DealReady</span>
          <div className="w-20" />
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-foreground">New Session</h1>
          <p className="text-sm text-muted mt-1">
            Configure your deal context. The AI will use these details to calibrate its buyer persona and line of questioning.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8" noValidate>
          {/* ── Deal Information ────────────────────────────── */}
          <div className="glass rounded-xl p-6">
            <SectionHeader
              title="Deal Information"
              description="Basic facts about the company being sold."
            />
            <div className="space-y-5">
              <Field label="Company name *">
                <input
                  type="text"
                  required
                  value={fields.company_name}
                  onChange={(e) => setField('company_name', e.target.value)}
                  disabled={loading}
                  placeholder="Acme Corp"
                  className={inputClass}
                />
              </Field>

              <Field label="Company website" hint="Used to find public information about the business.">
                <input
                  type="url"
                  value={fields.company_website}
                  onChange={(e) => setField('company_website', e.target.value)}
                  disabled={loading}
                  placeholder="https://acme.com"
                  className={inputClass}
                />
              </Field>

              <Field label="Industry / end markets" hint="e.g. B2B SaaS, industrial distribution, healthcare services">
                <input
                  type="text"
                  value={fields.industry}
                  onChange={(e) => setField('industry', e.target.value)}
                  disabled={loading}
                  placeholder="B2B software — HR tech"
                  className={inputClass}
                />
              </Field>
            </div>
          </div>

          {/* ── Transaction Context ──────────────────────────── */}
          <div className="glass rounded-xl p-6">
            <SectionHeader
              title="Transaction Context"
              description="Who will be in the room and what kind of process this is."
            />
            <div className="space-y-5">
              <Field label="Transaction type">
                <Select
                  value={fields.transaction_context}
                  onChange={(v) => setField('transaction_context', v)}
                  disabled={loading}
                  options={[
                    { value: 'sale_process', label: 'Formal sale process (banker-run)' },
                    { value: 'majority_sale', label: 'Majority sale / MBO' },
                    { value: 'recapitalization', label: 'Recapitalization / minority recap' },
                    { value: 'minority_investment', label: 'Minority / growth equity investment' },
                    { value: 'other', label: 'Other' },
                  ]}
                />
              </Field>

              <Field label="Likely buyer type">
                <Select
                  value={fields.likely_buyer_type}
                  onChange={(v) => setField('likely_buyer_type', v)}
                  disabled={loading}
                  options={[
                    { value: 'private_equity', label: 'Private equity' },
                    { value: 'strategic', label: 'Strategic acquirer' },
                    { value: 'mixed', label: 'Mixed (PE + strategic)' },
                    { value: 'family_office', label: 'Family office' },
                  ]}
                />
              </Field>

              <Field label="Known sensitivities" hint="Topics that are delicate or need careful handling. The AI will probe these directly.">
                <textarea
                  rows={3}
                  value={fields.known_sensitivities}
                  onChange={(e) => setField('known_sensitivities', e.target.value)}
                  disabled={loading}
                  placeholder="e.g. Customer concentration (top client = 35% of revenue), CEO succession plan"
                  className={textareaClass}
                />
              </Field>
            </div>
          </div>

          {/* ── Management Team ──────────────────────────────── */}
          <div className="glass rounded-xl p-6">
            <SectionHeader
              title="Management Team"
              description="Who will be presenting. Helps the AI calibrate its expectations."
            />
            <div className="space-y-5">
              <Field label="Team members being tested" hint="Names and roles of people who will be in the session.">
                <textarea
                  rows={3}
                  value={fields.management_team}
                  onChange={(e) => setField('management_team', e.target.value)}
                  disabled={loading}
                  placeholder="e.g. John Smith (CEO), Sarah Lee (CFO), Mike Chen (CRO)"
                  className={textareaClass}
                />
              </Field>

              <Field label="Primary objective" hint="What do you most want to get out of this session?">
                <textarea
                  rows={2}
                  value={fields.primary_objective}
                  onChange={(e) => setField('primary_objective', e.target.value)}
                  disabled={loading}
                  placeholder="e.g. Sharpen our financial narrative and prepare for EBITDA quality questions"
                  className={textareaClass}
                />
              </Field>
            </div>
          </div>

          {/* ── Session Configuration (Toggles) ─────────────── */}
          <div className="glass rounded-xl p-6">
            <SectionHeader
              title="Session Configuration"
              description="Calibrate how the AI buyer panel behaves. Defaults are optimised for full prep."
            />

            <div className="space-y-6">
              {/* Buyer perspective */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Buyer Perspective</p>
                <div className="grid sm:grid-cols-2 gap-4">
                  <Field label="Buyer lens">
                    <Select
                      value={toggles.buyer_lens}
                      onChange={(v) => setToggle('buyer_lens', v)}
                      disabled={loading}
                      options={[
                        { value: 'Private Equity', label: 'Private equity' },
                        { value: 'Strategic Acquirer', label: 'Strategic acquirer' },
                        { value: 'Mixed', label: 'Mixed' },
                      ]}
                    />
                  </Field>
                  <Field label="Focus mode">
                    <Select
                      value={toggles.focus_mode}
                      onChange={(v) => setToggle('focus_mode', v)}
                      disabled={loading}
                      options={[
                        { value: 'Balanced', label: 'Balanced' },
                        { value: 'Financial', label: 'Heavy financial' },
                        { value: 'Operations', label: 'Heavy operations' },
                        { value: 'Growth', label: 'Heavy growth / go-to-market' },
                        { value: 'Team', label: 'Heavy management team' },
                      ]}
                    />
                  </Field>
                </div>
              </div>

              {/* Pressure & style */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Pressure & Style</p>
                <div className="grid sm:grid-cols-3 gap-4">
                  <Field label="Pressure level">
                    <Select
                      value={toggles.pressure_level}
                      onChange={(v) => setToggle('pressure_level', v)}
                      disabled={loading}
                      options={[
                        { value: 'Light', label: 'Light' },
                        { value: 'Medium', label: 'Medium' },
                        { value: 'Hard', label: 'Hard' },
                        { value: 'Very Hard', label: 'Very hard' },
                      ]}
                    />
                  </Field>
                  <Field label="Question style">
                    <Select
                      value={toggles.question_style}
                      onChange={(v) => setToggle('question_style', v)}
                      disabled={loading}
                      options={[
                        { value: 'Standard', label: 'Standard' },
                        { value: 'Open-Ended', label: 'Open-ended' },
                        { value: 'Rapid Fire', label: 'Rapid fire' },
                      ]}
                    />
                  </Field>
                  <Field label="Follow-up intensity">
                    <Select
                      value={toggles.follow_up_intensity}
                      onChange={(v) => setToggle('follow_up_intensity', v)}
                      disabled={loading}
                      options={[
                        { value: 'Low', label: 'Low' },
                        { value: 'Medium', label: 'Medium' },
                        { value: 'High', label: 'High' },
                      ]}
                    />
                  </Field>
                </div>
              </div>

              {/* Session length & debrief */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-3">Session & Debrief</p>
                <div className="grid sm:grid-cols-3 gap-4">
                  <Field label="Session length">
                    <Select
                      value={toggles.session_length}
                      onChange={(v) => setToggle('session_length', v)}
                      disabled={loading}
                      options={[
                        { value: 'Short', label: 'Short (~30 min)' },
                        { value: 'Standard', label: 'Standard (~60 min)' },
                        { value: 'Long', label: 'Long (~90 min)' },
                      ]}
                    />
                  </Field>
                  <Field label="Debrief depth">
                    <Select
                      value={toggles.debrief_depth}
                      onChange={(v) => setToggle('debrief_depth', v)}
                      disabled={loading}
                      options={[
                        { value: 'Summary', label: 'Summary' },
                        { value: 'Detailed', label: 'Detailed' },
                        { value: 'Comprehensive', label: 'Comprehensive' },
                      ]}
                    />
                  </Field>
                  <Field label="Management experience">
                    <Select
                      value={toggles.management_experienced}
                      onChange={(v) => setToggle('management_experienced', v)}
                      disabled={loading}
                      options={[
                        { value: 'Experienced', label: 'Experienced (PE veterans)' },
                        { value: 'Mixed', label: 'Mixed' },
                        { value: 'Junior', label: 'First-time process' },
                      ]}
                    />
                  </Field>
                </div>
              </div>

              {/* Boolean toggles */}
              <div>
                <p className="text-xs font-semibold uppercase tracking-wider text-muted mb-1">Behaviour Switches</p>
                <div className="rounded-lg border border-border divide-y divide-border overflow-hidden">
                  <Toggle
                    label="Answer scoring"
                    hint="AI scores each answer on rigor, specificity, and credibility."
                    value={toggles.answer_scoring}
                    onToggle={() => flipBool('answer_scoring')}
                    disabled={loading}
                  />
                  <Toggle
                    label="Model answers in debrief"
                    hint="AI provides model answers for questions that were handled poorly."
                    value={toggles.model_answers}
                    onToggle={() => flipBool('model_answers')}
                    disabled={loading}
                  />
                  <Toggle
                    label="Use buyer personas"
                    hint="Each question is voiced by a specific named buyer persona."
                    value={toggles.buyer_personas}
                    onToggle={() => flipBool('buyer_personas')}
                    disabled={loading}
                  />
                  <Toggle
                    label="Interrupt rambling answers"
                    hint="AI cuts off unfocused answers and redirects."
                    value={toggles.interrupt_rambling}
                    onToggle={() => flipBool('interrupt_rambling')}
                    disabled={loading}
                  />
                  <Toggle
                    label="Challenge unsupported claims"
                    hint="AI immediately challenges any claim not backed by data."
                    value={toggles.challenge_unsupported}
                    onToggle={() => flipBool('challenge_unsupported')}
                    disabled={loading}
                  />
                  <Toggle
                    label="Bias toward vulnerabilities"
                    hint="AI spends more time on identified weak areas."
                    value={toggles.bias_vulnerabilities}
                    onToggle={() =>
                      setToggle(
                        'bias_vulnerabilities',
                        toggles.bias_vulnerabilities === 'High' ? 'Normal' : 'High'
                      )
                    }
                    disabled={loading}
                  />
                  <Toggle
                    label="Coaching mode during Q&A"
                    hint="AI offers constructive guidance after each answer instead of pure pressure."
                    value={toggles.coaching_mode}
                    onToggle={() =>
                      setToggle(
                        'coaching_mode',
                        toggles.coaching_mode === 'On' ? 'Off during live Q&A' : 'On'
                      )
                    }
                    disabled={loading}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Submit */}
          <div className="flex items-center justify-between pt-2 pb-10">
            <Link
              href="/dashboard"
              className="text-sm text-muted hover:text-foreground transition-colors"
            >
              Cancel
            </Link>
            <button
              type="submit"
              disabled={loading}
              className="px-6 py-2.5 bg-primary text-white rounded-lg text-sm font-medium hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? 'Creating…' : 'Create session'}
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
