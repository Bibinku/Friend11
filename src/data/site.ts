export const SITE_NAME = 'FRIEND11';
export const CONTACT_EMAIL = 'friend11official@gmail.com';
export const DISCLAIMER =
  'FRIEND11 is an independent community website. It is not affiliated with, endorsed by, or sponsored by KONAMI or eFootball™. eFootball is a trademark of its respective owner.';

export interface InfoLink {
  slug: string;
  label: string;
}

export const INFO_LINKS: readonly InfoLink[] = [
  { slug: 'about', label: 'About Us' },
  { slug: 'contact', label: 'Contact Us' },
  { slug: 'feedback', label: 'Feedback' },
  { slug: 'how-it-works', label: 'How It Works' },
  { slug: 'help', label: 'Help / FAQ' },
  { slug: 'privacy', label: 'Privacy Policy' },
  { slug: 'terms', label: 'Terms of Service' },
  { slug: 'cookies', label: 'Cookie Policy' },
];
