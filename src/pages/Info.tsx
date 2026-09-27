import { useState } from 'react';
import type { FormEvent } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ExternalLink } from 'lucide-react';
import { INFO_PAGES } from '../data/info';
import { CONTACT_EMAIL, INFO_LINKS } from '../data/site';
import { validateEmail } from '../lib/validation';
import { NotFound } from './NotFound';

/** Contact & Feedback are honest mailto forms: they open your email app with the message ready. */
function MailForm({ kind }: { kind: 'contact' | 'feedback' }) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const contact = kind === 'contact';

  function submit(e: FormEvent) {
    e.preventDefault();
    const next: Record<string, string> = {};
    if (contact && !name.trim()) next.name = 'Enter your name.';
    if (contact) {
      const v = validateEmail(email);
      if (!v.ok) next.email = v.error ?? 'Enter a valid email.';
    }
    if (!message.trim()) next.message = 'Write a short message.';
    setErrors(next);
    if (Object.keys(next).length) return;
    const subject = contact ? `FRIEND11 contact from ${name.trim()}` : 'FRIEND11 feedback';
    const body = contact ? `${message.trim()}\n\n— ${name.trim()} (${email.trim()})` : message.trim();
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
  }

  return (
    <form className="card form-card" onSubmit={submit} noValidate>
      {contact && (
        <>
          <div className="field-group">
            <label className="label" htmlFor="c-name">Name</label>
            <input id="c-name" className="field" value={name} autoComplete="name" onChange={(e) => setName(e.target.value)} aria-invalid={errors.name ? true : undefined} />
            {errors.name && <p className="form-error" role="alert">{errors.name}</p>}
          </div>
          <div className="field-group">
            <label className="label" htmlFor="c-email">Your email</label>
            <input id="c-email" className="field" type="email" inputMode="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} aria-invalid={errors.email ? true : undefined} />
            {errors.email && <p className="form-error" role="alert">{errors.email}</p>}
          </div>
        </>
      )}
      <div className="field-group">
        <label className="label" htmlFor="c-message">{contact ? 'Message' : 'Your feedback'}</label>
        <textarea id="c-message" className="field" rows={5} value={message} onChange={(e) => setMessage(e.target.value)} aria-invalid={errors.message ? true : undefined} />
        {errors.message && <p className="form-error" role="alert">{errors.message}</p>}
      </div>
      <button type="submit" className="btn btn-primary btn-block">
        <ExternalLink size={18} aria-hidden="true" /> Open in email app
      </button>
      <p className="fine">This opens your email app with the message ready to send to {CONTACT_EMAIL}.</p>
    </form>
  );
}

export function Info() {
  const { slug = '' } = useParams();
  const link = INFO_LINKS.find((l) => l.slug === slug);
  const page = INFO_PAGES[slug];
  const isForm = slug === 'contact' || slug === 'feedback';
  if (!link || (!page && !isForm)) return <NotFound />;

  const title = page?.title ?? link.label;
  const intro = page?.intro ?? (slug === 'contact' ? 'Questions or ideas? Send us a note.' : 'Tell us what would make FRIEND11 better.');

  return (
    <section className="section page">
      <div className="container container-narrow">
        <div className="page-head">
          <h1>{title}</h1>
          <p>{intro}</p>
        </div>
        {isForm ? (
          <MailForm kind={slug as 'contact' | 'feedback'} />
        ) : (
          <article className="card prose">
            {page.sections.map((s, i) => (
              <div key={s.heading ?? i}>
                {s.heading && <h2>{s.heading}</h2>}
                {s.paragraphs.map((p) => (
                  <p key={p}>{p}</p>
                ))}
              </div>
            ))}
          </article>
        )}
        <p className="fine center">
          <Link to="/">Back to home</Link>
        </p>
      </div>
    </section>
  );
}
