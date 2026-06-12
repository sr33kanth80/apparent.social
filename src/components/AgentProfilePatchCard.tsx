import { useMemo, useState } from 'react';
import { Check, ExternalLink, Loader2, X } from 'lucide-react';

import type { AgentProfilePatch } from '@/lib/apparent-types';

type ApplyResult = { ok: boolean; reason?: string };

interface AgentProfilePatchCardProps {
  patch: AgentProfilePatch;
  onApply: (patch: AgentProfilePatch, fields: string[]) => Promise<ApplyResult>;
}

const fallbackLabel = (field: string) =>
  field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (char) => char.toUpperCase())
    .trim();

export const AgentProfilePatchCard = ({ patch, onApply }: AgentProfilePatchCardProps) => {
  const [selected, setSelected] = useState(() => new Set(patch.fields.map((field) => field.field)));
  const [status, setStatus] = useState<'pending' | 'applying' | 'applied' | 'dismissed' | 'error'>('pending');
  const [message, setMessage] = useState('');

  const selectedFields = useMemo(() => Array.from(selected), [selected]);

  const toggle = (field: string) => {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(field)) next.delete(field);
      else next.add(field);
      return next;
    });
  };

  const applyFields = async (fields: string[]) => {
    if (fields.length === 0) return;
    setStatus('applying');
    setMessage('');
    setSelected(new Set(fields));
    const result = await onApply(patch, fields);
    if (result.ok) {
      setStatus('applied');
      setMessage(`${fields.length} field${fields.length === 1 ? '' : 's'} applied.`);
    } else {
      setStatus('error');
      setMessage(result.reason || 'Unable to apply changes.');
    }
  };

  const apply = () => applyFields(selectedFields);

  return (
    <div className="rounded-xl border border-black/10 bg-white p-3">
      <div className="mb-2 flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold text-black">Profile update draft</p>
          <p className="mt-0.5 text-[11px] leading-relaxed text-gray-500">{patch.summary}</p>
        </div>
        {status === 'applied' && (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-ink">
            <Check className="h-3 w-3" /> Applied
          </span>
        )}
        {status === 'applying' && (
          <span className="inline-flex items-center gap-1 text-[11px] text-gray-500">
            <Loader2 className="h-3 w-3 animate-spin" /> Applying
          </span>
        )}
      </div>

      <div className="space-y-2">
        {patch.fields.map((field) => (
          <label key={field.field} className="block rounded-lg border border-black/5 bg-[#f8f6f4] p-2">
            <div className="flex items-start gap-2">
              <input
                checked={selected.has(field.field)}
                className="mt-0.5 h-3.5 w-3.5"
                disabled={status !== 'pending' && status !== 'error'}
                onChange={() => toggle(field.field)}
                type="checkbox"
              />
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <p className="text-[11px] font-semibold text-black">{field.label || fallbackLabel(field.field)}</p>
                  <span className="rounded-full bg-white px-1.5 py-0.5 text-[9px] font-medium uppercase tracking-wide text-gray-400">
                    {field.confidence || 'medium'}
                  </span>
                </div>
                {field.oldValue && (
                  <p className="mt-1 truncate text-[11px] text-gray-400">
                    Was: {field.oldValue}
                  </p>
                )}
                <p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-gray-700">{field.newValue}</p>
                <p className="mt-1 text-[11px] leading-relaxed text-gray-500">{field.reason}</p>
                {field.sourceUrl && (
                  <a
                    className="mt-1 inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-black"
                    href={field.sourceUrl}
                    rel="noreferrer"
                    target="_blank"
                  >
                    <ExternalLink className="h-3 w-3" /> Source
                  </a>
                )}
              </div>
            </div>
          </label>
        ))}
      </div>

      {(patch.sourceUrls.length > 0 || (patch.unavailableSources?.length ?? 0) > 0) && (
        <div className="mt-2 space-y-1 text-[11px] text-gray-500">
          {patch.sourceUrls.length > 0 && <p>Used: {patch.sourceUrls.join(', ')}</p>}
          {(patch.unavailableSources?.length ?? 0) > 0 && (
            <p>Could not read: {patch.unavailableSources?.join(', ')}</p>
          )}
        </div>
      )}

      {message && (
        <p className={`mt-2 text-[11px] ${status === 'error' ? 'text-red-600' : 'text-gray-500'}`}>{message}</p>
      )}

      {(status === 'pending' || status === 'error') && (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button
            className="inline-flex items-center gap-1 rounded-lg bg-charcoal px-2.5 py-1 text-[11px] font-semibold text-white transition-colors hover:bg-black disabled:cursor-not-allowed disabled:opacity-40"
            disabled={selectedFields.length === 0}
            onClick={apply}
            type="button"
          >
            <Check className="h-3 w-3" /> Apply selected
          </button>
          <button
            className="inline-flex items-center gap-1 rounded-lg border border-black/10 px-2.5 py-1 text-[11px] text-gray-600 transition-colors hover:text-black"
            onClick={() => applyFields(patch.fields.map((field) => field.field))}
            type="button"
          >
            Apply all
          </button>
          <button
            className="inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] text-gray-500 transition-colors hover:bg-[#f6f3f1] hover:text-black"
            onClick={() => setStatus('dismissed')}
            type="button"
          >
            <X className="h-3 w-3" /> Dismiss
          </button>
        </div>
      )}

      {status === 'dismissed' && <p className="mt-2 text-[11px] text-gray-500">Dismissed.</p>}
    </div>
  );
};
