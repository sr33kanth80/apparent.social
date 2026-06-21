import { type ChangeEvent, type FormEvent, useState } from 'react';
import { EditorialNavbar } from '@/components/editorial/EditorialNavbar';
import { EditorialFooter } from '@/components/editorial/EditorialFooter';
import { LogoIcon } from '@/components/LogoIcon';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const CONTACT_EMAIL = 'hello@apparent.social';

type ContactFormValues = {
  name: string;
  email: string;
  company: string;
  role: string;
  topic: string;
  message: string;
  website: string;
};

const initialValues: ContactFormValues = {
  name: '', email: '', company: '', role: 'Founder', topic: 'General', message: '', website: '',
};

const topicOptions = ['General', 'Founder access', 'Investor access', 'Partnerships', 'Support', 'Privacy'];
const roleOptions = ['Founder', 'Investor', 'Operator', 'Partner', 'Press', 'Other'];

const buildMailto = (values: ContactFormValues) => {
  const subject = encodeURIComponent(`Apparent contact: ${values.topic}`);
  const body = encodeURIComponent(
    [
      `Name: ${values.name}`,
      `Email: ${values.email}`,
      `Company: ${values.company || 'Not provided'}`,
      `Role: ${values.role}`,
      `Topic: ${values.topic}`,
      '',
      values.message,
    ].join('\n'),
  );
  return `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
};

export const Contact = () => {
  const [values, setValues] = useState<ContactFormValues>(initialValues);
  const [status, setStatus] = useState<'idle' | 'submitting' | 'success' | 'fallback' | 'error'>('idle');

  const handleChange = (event: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = event.target;
    setValues((current) => ({ ...current, [name]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (values.website.trim()) {
      setStatus('success');
      return;
    }
    setStatus('submitting');

    if (isSupabaseConfigured && supabase) {
      const { error } = await supabase.from('contact_messages').insert({
        name: values.name.trim(),
        email: values.email.trim(),
        company: values.company.trim() || null,
        role: values.role,
        topic: values.topic,
        message: values.message.trim(),
        page_url: window.location.href,
      });
      if (!error) {
        setValues(initialValues);
        setStatus('success');
        return;
      }
    }

    window.location.href = buildMailto(values);
    setStatus(isSupabaseConfigured ? 'error' : 'fallback');
  };

  return (
    <div className="ed-page">
      <EditorialNavbar />
      <main>
        {/* HERO */}
        <section className="ed-subhero ed-inner">
          <h1 className="ed-display">Talk to the Apparent <em>team.</em></h1>
          <p className="ed-lede">Send a note about access, support, partnerships, privacy, or the founder and investor workflows you want to run through Apparent.</p>
        </section>

        {/* CONTACT GRID */}
        <section className="ed-sec ed-divider">
          <div className="ed-inner ed-contact-grid">
            <div>
              <h2 className="ed-sec-title" style={{ maxWidth: '14ch' }}>Send the right signal.</h2>
              <p className="ed-lead" style={{ maxWidth: '38ch' }}>The more context you include, the faster we can route your message to the right person.</p>
              <div className="ed-notes">
                <div className="ed-note">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" /></svg>
                  <div><h3>General questions</h3><p>Product access, partnerships, support, and anything that needs a human response.</p></div>
                </div>
                <div className="ed-note">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M12 21s-7-5.2-7-11a7 7 0 0 1 14 0c0 5.8-7 11-7 11Z" /><circle cx="12" cy="10" r="2.5" /></svg>
                  <div><h3>Founder and investor signal</h3><p>Tell us what you are building, funding, researching, or trying to find inside Apparent.</p></div>
                </div>
                <div className="ed-note">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" /></svg>
                  <div><h3>Response window</h3><p>We read every note and route it to the right person as soon as possible.</p></div>
                </div>
              </div>
            </div>

            <form className="ed-form" onSubmit={handleSubmit} noValidate>
              <div className="ed-field-two">
                <div className="ed-field"><label htmlFor="name">Name</label><input id="name" name="name" required value={values.name} onChange={handleChange} placeholder="Your name" /></div>
                <div className="ed-field"><label htmlFor="email">Email</label><input id="email" name="email" type="email" required value={values.email} onChange={handleChange} placeholder="you@company.com" /></div>
              </div>
              <div className="ed-field-two">
                <div className="ed-field"><label htmlFor="company">Company</label><input id="company" name="company" value={values.company} onChange={handleChange} placeholder="Company or fund" /></div>
                <div className="ed-field">
                  <label htmlFor="role">I am a</label>
                  <select id="role" name="role" value={values.role} onChange={handleChange}>
                    {roleOptions.map((r) => (<option key={r} value={r}>{r}</option>))}
                  </select>
                </div>
              </div>
              <div className="ed-field">
                <label htmlFor="topic">Topic</label>
                <select id="topic" name="topic" value={values.topic} onChange={handleChange}>
                  {topicOptions.map((t) => (<option key={t} value={t}>{t}</option>))}
                </select>
              </div>
              <div className="ed-field">
                <label htmlFor="message">Message</label>
                <textarea id="message" name="message" required value={values.message} onChange={handleChange} placeholder="Tell us what you need, who should follow up, and any relevant context." />
              </div>
              <label className="ed-hp">Website<input name="website" value={values.website} onChange={handleChange} tabIndex={-1} autoComplete="off" /></label>
              <div className="ed-form-row">
                <p className="ed-foot-note">By submitting, you agree that Apparent may use your message to respond to your request.</p>
                <button type="submit" className="ed-btn ed-btn-filled" disabled={status === 'submitting'}>
                  {status === 'submitting' ? 'Sending...' : 'Send message'}
                </button>
              </div>
              {status === 'success' && (
                <div className="ed-sent">Your message is in. We will route it to the right person.</div>
              )}
              {(status === 'fallback' || status === 'error') && (
                <div className="ed-sent">Your email client should open with the message prepared. You can also email {CONTACT_EMAIL}.</div>
              )}
            </form>
          </div>
        </section>

        {/* PREFER EMAIL */}
        <section className="ed-sec ed-divider ed-final">
          <div className="ed-inner">
            <LogoIcon className="ed-mark" />
            <h2>Prefer email?</h2>
            <p>Reach us directly and include the same context you would put in the form.</p>
            <div className="ed-cta">
              <a className="ed-btn ed-btn-filled" href={`mailto:${CONTACT_EMAIL}`}>Email {CONTACT_EMAIL}</a>
            </div>
          </div>
        </section>
      </main>
      <EditorialFooter />
    </div>
  );
};
