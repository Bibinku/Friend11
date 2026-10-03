import { CONTACT_EMAIL, DISCLAIMER } from './site';

export interface InfoSection {
  heading?: string;
  paragraphs: string[];
}
export interface InfoPageData {
  title: string;
  intro: string;
  sections: InfoSection[];
}

/** Static pages. "contact" and "feedback" are rendered with forms by the page component. */
export const INFO_PAGES: Record<string, InfoPageData> = {
  about: {
    title: 'About Us',
    intro: 'FRIEND11 is a simple place to find friendly eFootball matches.',
    sections: [
      {
        paragraphs: [
          'Players post their eFootball room code, everyone can see it, and anyone can copy it and enter it in the game. No follow lists, no friend requests, no waiting around in group chats.',
          'Every room lives for exactly 10 minutes, so the list always shows people who are ready to play right now.',
        ],
      },
      { heading: 'Independent and community-run', paragraphs: [DISCLAIMER] },
    ],
  },
  'how-it-works': {
    title: 'How It Works',
    intro: 'From opening the site to kick-off in a few taps.',
    sections: [
      {
        heading: 'Hosting a match',
        paragraphs: [
          'Open Create Match, enter the room code from eFootball, pick a mode, and publish. Signing in is not required. You can add a short message for players who join.',
          'Your room is public for exactly 10 minutes, then disappears. Publishing a new room replaces your current one and starts a fresh 10 minutes.',
        ],
      },
      {
        heading: 'Joining a match',
        paragraphs: [
          'Open Join Match to see live rooms. Search by player or code, or filter by mode and country. Tap Copy Code, then enter the code manually inside eFootball. FRIEND11 never connects to the game for you.',
        ],
      },
      {
        heading: 'Live Chat',
        paragraphs: ['Signed-in players can use Live Chat to arrange games and say hello. Browsing rooms and copying codes never needs an account.'],
      },
    ],
  },
  help: {
    title: 'Help / FAQ',
    intro: 'Quick answers to common questions.',
    sections: [
      { heading: 'How long does a room last?', paragraphs: ['Exactly 10 minutes from the moment it is published. Refreshing the page or copying the code never changes that.'] },
      { heading: 'Can I have more than one room?', paragraphs: ['No. Publishing a new room replaces your current room and starts a new 10-minute timer.'] },
      { heading: 'Do I need an account?', paragraphs: ['Not to browse, copy codes, or create rooms. You only need one for Live Chat and to keep a profile with a username and avatar.'] },
      { heading: 'Is my email public?', paragraphs: ['No. Your email is only shown to you on your own profile page.'] },
      { heading: 'Does signing out delete my account?', paragraphs: ['No. Signing out only ends the session on this device. Sign in again and everything is exactly as you left it. Delete Account on your profile is the only way to remove it permanently.'] },
      { heading: 'The sign-in link didn’t work', paragraphs: ['Links expire and can only be used once. Request a fresh link and open the newest email. If your mail app opens links in its own browser, copy the link into the browser you normally use.'] },
    ],
  },
  privacy: {
    title: 'Privacy Policy',
    intro: 'What FRIEND11 stores, why, and who can see it.',
    sections: [
      {
        heading: 'What we collect',
        paragraphs: [
          'When you sign in: your email address, the username and avatar you choose, and the date your account was created. If you use Google sign-in we receive your Google account email but do not use your Google name as your username.',
          'When you publish a room: the room code, mode and optional message, plus your username and avatar (or a generated guest name), and your country if you are signed in and have set one. Rooms are public for 10 minutes and then deleted.',
          'When you use Live Chat: the messages you send, with your username and avatar, the emoji reactions you leave, and which @mentions of you you have read.',
        ],
      },
      {
        heading: 'What is public',
        paragraphs: ['Room cards and chat messages are visible as described above. Your email address is never shown publicly.'],
      },
      {
        heading: 'Service providers',
        paragraphs: ['Sign-in, the database and Live Chat are provided by Supabase. Google is used for “Continue with Google”, and Google Fonts serves the site’s typefaces. If the site operator enables sign-in logging, your username, email and sign-in time may be added to a spreadsheet the operator controls.'],
      },
      {
        heading: 'Your choices',
        paragraphs: [`You can change your username and avatar or permanently delete your account, profile, rooms and messages from your profile. Questions? Email ${CONTACT_EMAIL}.`],
      },
    ],
  },
  terms: {
    title: 'Terms of Service',
    intro: 'The basics of using FRIEND11.',
    sections: [
      {
        paragraphs: [
          'By using FRIEND11 you agree to post accurate room information and to treat other players with respect. Do not post offensive content, spam, or anyone else’s personal information.',
          'Matches are played inside eFootball, outside this website. FRIEND11 is not responsible for the conduct of players or the outcome of matches.',
          'We may remove rooms, messages or accounts that break these rules, and may change or discontinue the service at any time.',
        ],
      },
      { heading: 'Trademarks', paragraphs: [DISCLAIMER] },
    ],
  },
  cookies: {
    title: 'Cookie Policy',
    intro: 'FRIEND11 uses browser storage, not advertising cookies.',
    sections: [
      {
        paragraphs: [
          'Signing in stores a session token in your browser so you stay signed in. Your Light/Dark preference is stored so the site doesn’t flash the wrong theme. If you create a room without an account, a random guest identifier is stored so only you can delete your own room.',
          'We don’t use advertising or cross-site tracking cookies. Clearing your browser data removes all of the above.',
        ],
      },
    ],
  },
};
