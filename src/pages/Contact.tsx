import { type ChangeEvent, type FormEvent, useState } from 'react';
import { ArrowUpRight, CheckCircle2, Clock, Mail, MapPin, Send } from 'lucide-react';
import { LogoIcon } from '@/components/LogoIcon';
import { isSupabaseConfigured, supabase } from '@/lib/supabase';

const serifDisplay = {
  fontFamily: 'Georgia, "Times New Roman", serif',
};

const CONTACT_EMAIL = 'hello@apparent.dev';

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
  name: '',
  email: '',
  company: '',
  role: 'Founder',
  topic: 'General',
  message: '',
  website: '',
};

const contactNotes = [
  {
    icon: Mail,
    title: 'General questions',
    text: 'Product access, partnerships, support, and anything that needs a human response.',
  },
  {
    icon: MapPin,
    title: 'Founder and investor signal',
    text: 'Tell us what you are building, funding, researching, or trying to find inside Apparent.',
  },
  {
    icon: Clock,
    title: 'Response window',
    text: 'We read every note and route it to the right person as soon as possible.',
  },
];

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
    <main className="overflow-x-hidden bg-[#fbfaf7] text-black">
      <section className="mx-auto max-w-[92rem] px-5 pb-14 pt-14 sm:px-8 md:pt-20">
        <h1
          className="max-w-[86rem] text-[3.45rem] font-normal leading-[0.88] tracking-[-0.055em] sm:text-[7rem] md:text-[8.5rem] lg:text-[10rem]"
          style={serifDisplay}
        >
          Talk to the
          <br />
          Apparent
          <LogoIcon className="mx-3 inline h-[0.62em] w-[0.62em] align-[-0.02em] text-black sm:mx-4" />
          team.
        </h1>
        <p className="mt-10 max-w-3xl text-lg leading-8 text-black/65 md:text-xl">
          Send a note about access, support, partnerships, privacy, or the founder and investor workflows you want to run through Apparent.
        </p>
      </section>

      <section className="mx-auto grid max-w-[92rem] gap-10 border-t border-black/10 px-5 py-16 sm:px-8 lg:grid-cols-[0.82fr_1.18fr] lg:items-start">
        <div className="py-2">
          <p className="mb-12 text-sm font-semibold text-[#42520d]">Contact</p>
          <h2 className="max-w-2xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
            Send the right signal.
          </h2>
          <p className="mt-8 max-w-xl text-base leading-8 text-black/60">
            The more context you include, the faster we can route your message to the right person.
          </p>

          <div className="mt-14 grid gap-8">
            {contactNotes.map((note) => (
              <article key={note.title} className="grid gap-4 sm:grid-cols-[2.5rem_1fr]">
                <note.icon className="mt-1 h-5 w-5 text-[#42520d]" />
                <div>
                  <h3 className="text-lg font-normal tracking-[-0.025em]" style={serifDisplay}>
                    {note.title}
                  </h3>
                  <p className="mt-2 text-sm leading-6 text-black/55">{note.text}</p>
                </div>
              </article>
            ))}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="rounded-[32px] bg-white/72 p-5 shadow-[0_18px_60px_rgba(0,0,0,0.045)] sm:p-8">
          <div className="grid gap-5 md:grid-cols-2">
            <label className="grid gap-2 text-sm font-semibold">
              Name
              <input
                required
                name="name"
                value={values.name}
                onChange={handleChange}
                className="h-12 rounded-2xl border border-black/10 bg-[#fbfaf7] px-4 text-sm font-normal outline-none transition-colors placeholder:text-black/35 focus:border-[#8E9C78]"
                placeholder="Your name"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold">
              Email
              <input
                required
                type="email"
                name="email"
                value={values.email}
                onChange={handleChange}
                className="h-12 rounded-2xl border border-black/10 bg-[#fbfaf7] px-4 text-sm font-normal outline-none transition-colors placeholder:text-black/35 focus:border-[#8E9C78]"
                placeholder="you@company.com"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold">
              Company
              <input
                name="company"
                value={values.company}
                onChange={handleChange}
                className="h-12 rounded-2xl border border-black/10 bg-[#fbfaf7] px-4 text-sm font-normal outline-none transition-colors placeholder:text-black/35 focus:border-[#8E9C78]"
                placeholder="Company or fund"
              />
            </label>

            <label className="grid gap-2 text-sm font-semibold">
              I am a
              <select
                name="role"
                value={values.role}
                onChange={handleChange}
                className="h-12 rounded-2xl border border-black/10 bg-[#fbfaf7] px-4 text-sm font-normal outline-none transition-colors focus:border-[#8E9C78]"
              >
                {roleOptions.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold md:col-span-2">
              Topic
              <select
                name="topic"
                value={values.topic}
                onChange={handleChange}
                className="h-12 rounded-2xl border border-black/10 bg-[#fbfaf7] px-4 text-sm font-normal outline-none transition-colors focus:border-[#8E9C78]"
              >
                {topicOptions.map((topic) => (
                  <option key={topic} value={topic}>
                    {topic}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-semibold md:col-span-2">
              Message
              <textarea
                required
                name="message"
                value={values.message}
                onChange={handleChange}
                className="min-h-44 resize-none rounded-[24px] border border-black/10 bg-[#fbfaf7] px-4 py-3 text-sm font-normal leading-7 outline-none transition-colors placeholder:text-black/35 focus:border-[#8E9C78]"
                placeholder="Tell us what you need, who should follow up, and any relevant context."
              />
            </label>

            <label className="hidden">
              Website
              <input name="website" value={values.website} onChange={handleChange} tabIndex={-1} autoComplete="off" />
            </label>
          </div>

          <div className="mt-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm leading-6 text-black/50">
              By submitting, you agree that Apparent may use your message to respond to your request.
            </p>
            <button
              type="submit"
              disabled={status === 'submitting'}
              className="inline-flex shrink-0 items-center justify-center rounded-full bg-[#8E9C78] px-6 py-3 text-sm font-semibold text-white transition-all hover:-translate-y-0.5 hover:text-black disabled:cursor-not-allowed disabled:opacity-60"
            >
              {status === 'submitting' ? 'Sending...' : 'Send message'}
              {status === 'submitting' ? null : <Send className="ml-2 h-4 w-4" />}
            </button>
          </div>

          {status === 'success' ? (
            <div className="mt-6 flex items-start gap-3 rounded-[22px] bg-[#dcefc7] px-4 py-4 text-sm leading-6 text-black">
              <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
              <p>Your message is in. We will route it to the right person.</p>
            </div>
          ) : null}

          {status === 'fallback' || status === 'error' ? (
            <div className="mt-6 rounded-[22px] bg-[#fbfaf7] px-4 py-4 text-sm leading-6 text-black/60">
              Your email client should open with the message prepared. You can also email{' '}
              <a href={`mailto:${CONTACT_EMAIL}`} className="font-semibold text-black hover:text-[#42520d]">
                {CONTACT_EMAIL}
              </a>
              .
            </div>
          ) : null}
        </form>
      </section>

      <section className="mx-auto max-w-[92rem] border-t border-black/10 px-5 py-20 text-center sm:px-8">
        <Mail className="mx-auto mb-10 h-6 w-6 text-[#02A070]" />
        <h2 className="mx-auto max-w-3xl text-5xl font-normal leading-none tracking-[-0.045em] md:text-7xl" style={serifDisplay}>
          Prefer email?
        </h2>
        <p className="mx-auto mt-8 max-w-2xl text-base leading-8 text-black/55">
          Reach us directly and include the same context you would put in the form.
        </p>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          className="mt-10 inline-flex rounded-full bg-[#dcefc7] px-8 py-3 text-sm font-semibold text-black transition-colors hover:bg-[#cce8ae]"
        >
          Email {CONTACT_EMAIL}
          <ArrowUpRight className="ml-1 inline h-3.5 w-3.5 align-[-2px]" />
        </a>
      </section>
    </main>
  );
};
