import { Link } from 'react-router-dom';
import { CONTACT_EMAIL, DISCLAIMER, INFO_LINKS } from '../data/site';
import { Logo } from './Logo';

const GROUPS = [
  { title: 'Play', links: [{ to: '/', label: 'Home' }, { to: '/create', label: 'Create Match' }, { to: '/join', label: 'Join Match' }] },
  { title: 'Company', links: ['about', 'contact', 'feedback'].map((s) => ({ to: `/info/${s}`, label: INFO_LINKS.find((l) => l.slug === s)?.label ?? s })) },
  { title: 'Help', links: ['how-it-works', 'help'].map((s) => ({ to: `/info/${s}`, label: INFO_LINKS.find((l) => l.slug === s)?.label ?? s })) },
  { title: 'Legal', links: ['privacy', 'terms', 'cookies'].map((s) => ({ to: `/info/${s}`, label: INFO_LINKS.find((l) => l.slug === s)?.label ?? s })) },
];

export function Footer() {
  return (
    <footer className="footer">
      <div className="container">
        <div className="footer-top">
          <div className="footer-brand">
            <Logo size="lg" />
            <p>Find a friendly. Copy the code. Play.</p>
            <a href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>
          </div>
          <nav className="footer-nav" aria-label="Footer">
            {GROUPS.map((g) => (
              <div key={g.title}>
                <h2 className="footer-heading">{g.title}</h2>
                <ul>
                  {g.links.map((l) => (
                    <li key={l.to}>
                      <Link to={l.to}>{l.label}</Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </nav>
        </div>
        <p className="footer-disclaimer">{DISCLAIMER}</p>
        <p className="footer-copy">© {new Date().getFullYear()} FRIEND11</p>
      </div>
    </footer>
  );
}
