import { useEffect, useState, type ReactNode } from 'react';
import { X } from 'lucide-react';
import { submitCompany, submitProblemReport } from '@/lib/jobs-service';

/**
 * The two submission forms.
 *
 * "Add your company" is not decoration: our data source gives city-level
 * precision only, so a street address typed by someone who actually works there
 * is the only way a building ever becomes the RIGHT building.
 */

function Modal({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/30 px-4 py-[8vh] backdrop-blur-[2px]"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="w-full max-w-[520px] rounded-xl border border-black/10 bg-white shadow-[0_24px_60px_rgba(0,0,0,0.22)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label={title}
      >
        <div className="flex items-start justify-between gap-4 border-b border-black/8 px-5 py-4">
          <div>
            <h2 className="font-serif text-lg leading-tight text-black">{title}</h2>
            {subtitle && <p className="mt-1 text-xs text-black/50">{subtitle}</p>}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 text-black/40 transition-colors hover:text-black"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="px-5 py-4">{children}</div>
      </div>
    </div>
  );
}

const FIELD =
  'w-full rounded-md border border-black/12 bg-white px-3 py-2 text-sm text-black outline-none transition-colors placeholder:text-black/28 focus:border-[#1d9bf0]';
const LABEL = 'block text-xs font-medium text-black/70';
const HINT = 'mt-1 block text-[11px] font-normal text-black/40';

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="mb-3.5 block">
      <span className={LABEL}>{label}</span>
      {hint && <span className={HINT}>{hint}</span>}
      <span className="mt-1.5 block">{children}</span>
    </label>
  );
}

function Actions({
  submitting,
  submitLabel,
  onCancel,
}: {
  submitting: boolean;
  submitLabel: string;
  onCancel: () => void;
}) {
  return (
    <div className="mt-1 flex items-center justify-end gap-2">
      <button
        type="button"
        onClick={onCancel}
        className="rounded-md px-3.5 py-2 text-sm text-black/55 transition-colors hover:bg-black/5 hover:text-black"
      >
        Cancel
      </button>
      <button
        type="submit"
        disabled={submitting}
        className="rounded-md bg-[#1d9bf0] px-4 py-2 text-sm font-medium text-white transition-opacity hover:opacity-90 disabled:opacity-45"
      >
        {submitting ? 'Sending…' : submitLabel}
      </button>
    </div>
  );
}

export function AddCompanyModal({ onClose }: { onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const data = new FormData(event.currentTarget);

    setSubmitting(true);
    setError('');
    const ok = await submitCompany({
      companyName: String(data.get('companyName') || ''),
      website: String(data.get('website') || ''),
      officeAddress: String(data.get('officeAddress') || ''),
      area: String(data.get('area') || ''),
      careersUrl: String(data.get('careersUrl') || ''),
      description: String(data.get('description') || ''),
      submitterName: String(data.get('submitterName') || ''),
      submitterEmail: String(data.get('submitterEmail') || ''),
    });
    setSubmitting(false);

    if (ok) setDone(true);
    else setError('That did not send. Try again in a moment.');
  };

  return (
    <Modal
      title="Add your company"
      subtitle="Reviewed by a human before it appears."
      onClose={onClose}
    >
      {done ? (
        <div className="py-4 text-center">
          <p className="text-sm text-black/70">Sent for review. Thank you.</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 rounded-md bg-[#1d9bf0] px-4 py-2 text-sm font-medium text-white"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <Field label="Company name">
            <input name="companyName" required className={FIELD} placeholder="Acme" />
          </Field>
          <Field label="Website">
            <input name="website" type="url" required className={FIELD} placeholder="https://acme.com" />
          </Field>
          <Field
            label="Office address"
            hint="A street address gets you placed on the right building rather than the right neighbourhood."
          >
            <textarea name="officeAddress" rows={3} className={`${FIELD} resize-none`} />
          </Field>
          <Field label="Area / neighbourhood">
            <input name="area" className={FIELD} placeholder="Indiranagar" />
          </Field>
          <Field label="Careers page" hint="Lets your open roles show on the map.">
            <input name="careersUrl" type="url" className={FIELD} placeholder="https://acme.com/careers" />
          </Field>
          <Field label="One line about what you do">
            <input name="description" className={FIELD} placeholder="Payments infrastructure for marketplaces" />
          </Field>
          <Field label="Your name">
            <input name="submitterName" className={FIELD} />
          </Field>
          <Field label="Your email" hint="Only used to reach you about this listing.">
            <input name="submitterEmail" type="email" className={FIELD} />
          </Field>

          {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
          <Actions submitting={submitting} submitLabel="Send for review" onCancel={onClose} />
        </form>
      )}
    </Modal>
  );
}

export function ReportProblemModal({ onClose }: { onClose: () => void }) {
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState('');

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const data = new FormData(event.currentTarget);

    setSubmitting(true);
    setError('');
    const ok = await submitProblemReport({
      details: String(data.get('details') || ''),
      email: String(data.get('email') || ''),
    });
    setSubmitting(false);

    if (ok) setDone(true);
    else setError('That did not send. Try again in a moment.');
  };

  return (
    <Modal title="Report a problem" onClose={onClose}>
      {done ? (
        <div className="py-4 text-center">
          <p className="text-sm text-black/70">Report received. Thank you.</p>
          <button
            type="button"
            onClick={onClose}
            className="mt-4 rounded-md bg-[#1d9bf0] px-4 py-2 text-sm font-medium text-white"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit}>
          <Field label="What is wrong?">
            <textarea
              name="details"
              rows={5}
              required
              className={`${FIELD} resize-none`}
              placeholder="A bug, a wrong address, a company that has moved or closed. Every report is read. Naming specific companies saves guessing."
            />
          </Field>
          <Field label="Your email">
            <input
              name="email"
              type="email"
              className={FIELD}
              placeholder="Only if you want a reply. Leave blank to report anonymously."
            />
          </Field>

          <p className="mb-3.5 rounded-md bg-black/[0.03] px-3 py-2 text-[11px] text-black/50">
            No cookies, no location, nothing that identifies you.
          </p>

          {error && <p className="mb-3 text-xs text-red-600">{error}</p>}
          <Actions submitting={submitting} submitLabel="Send report" onCancel={onClose} />
        </form>
      )}
    </Modal>
  );
}
