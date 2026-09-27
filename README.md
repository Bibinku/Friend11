# FRIEND11

Find a friendly. Copy the code. Play. — a mobile-first site where eFootball players post a room code for exactly 10 minutes and others copy it.

React 18 · TypeScript · Vite · Supabase (Auth, Postgres, Realtime, Edge Functions)

> FRIEND11 is an independent community site. It is not affiliated with, endorsed by, or sponsored by KONAMI or eFootball™.

---

## 1. Run it locally

```bash
npm install
cp .env.example .env.local     # then fill in the two Supabase values
npm run dev                    # http://localhost:5173  (also on your LAN for phone testing)
```

Other scripts: `npm run build` (typecheck + production build), `npm run preview`, `npm run typecheck`.

Without the two Supabase variables the app shows a **Setup needed** screen instead of failing silently.

## 2. Set up Supabase (10 minutes, one time)

**a. Create the project**, then copy *Project URL* and the *publishable (anon) key* from **Settings → API** into `.env.local`. Never put a secret / `service_role` key in the frontend or in any `VITE_` variable.

**b. Create tables and functions.** SQL Editor → New query → paste all of `supabase/schema.sql` → Run. It is safe to re-run. It creates `profiles`, `rooms`, `chat_messages`, Row Level Security, the sign-up trigger, the three room functions and the Realtime publication.

**c. Google sign-in.**
1. Google Cloud Console → *APIs & Services → Credentials → Create OAuth client ID → Web application*.
2. Add this **Authorized redirect URI**: `https://<your-project-ref>.supabase.co/auth/v1/callback`
3. Supabase → **Authentication → Providers → Google**: enable, paste the Client ID and Secret.

**d. Redirect URLs — the step that most often breaks sign-in.**
Supabase → **Authentication → URL Configuration**

| Field | Value |
|---|---|
| **Site URL** | your production address, e.g. `https://friend11.example.com` |
| **Redirect URLs** | add **both** forms for every address you use: |
| | `https://friend11.example.com` and `https://friend11.example.com/**` |
| | `http://localhost:5173` and `http://localhost:5173/**` |
| | (testing on a phone over Wi-Fi) `http://192.168.x.x:5173` and `http://192.168.x.x:5173/**` |

The exact address *and* the `/**` wildcard are both needed. If the address the app sends people back to is not on this list, Supabase quietly falls back to the Site URL and the browser comes back **not signed in**. The Site URL is also where email links point, so a wrong value here is the usual reason a sign-in email opens the wrong host or "can't be reached".

**e. Email magic links.** Enabled by default (Authentication → Providers → Email). The built-in mail sender is heavily rate-limited and meant for testing; for real users set up your own SMTP under *Authentication → Emails → SMTP Settings*. Some mail providers pre-open links to scan them, which uses up a one-time link; if people report "link already used", custom SMTP with a link-scanner-safe domain, or Google sign-in, avoids it.

**f. Account deletion function** (the only place a privileged key is used, server-side):
```bash
npm i -g supabase             # or: npx supabase …
supabase login
supabase link --project-ref <your-project-ref>
supabase functions deploy delete-account
```

**g. Realtime for chat.** `schema.sql` adds `chat_messages` to the `supabase_realtime` publication. Check *Database → Publications* if messages from others only appear after a refresh (chat falls back to polling every 8 s, so it still works).

## 3. Deploy

Any static host works. Set the same environment variables in the host's settings, and set
`VITE_SITE_URL=https://your-domain` so Google and email redirects always target the real site.
`vercel.json` and `public/_redirects` (Netlify/Cloudflare Pages) already contain the single-page-app rewrite.

Before launch: change `CONTACT_EMAIL` in `src/data/site.ts`, and have someone read the Privacy / Terms / Cookie text in `src/data/info.ts`. It describes what this app actually does but is not legal advice.

---

## What's in the box

- **Auth**: Google and email link. Session persists across reloads (`persistSession`, `autoRefreshToken`, `detectSessionInUrl`), redirects come from config (never hardcoded), and a failed return from Google / an email link shows a plain-language message instead of silently doing nothing. Logout ends only this device's session.
- **First-time profile**: after the first sign-in a non-dismissable step asks for a unique username and one of 20 avatars. The Google name is never used. Uniqueness is case-insensitive and enforced by the database.
- **Rooms**: five modes (1v1 Dream Team, 1v1 Authentic Team, Co-op Friendly, Tournament 4, Tournament 8; "All modes" exists only as a filter). No login needed to create one, including the message. Expiry is `created_at + 10 min` on the **server clock**; refreshing or copying never changes it; expired rooms are removed by the database. One live room per account/browser; publishing another replaces it after confirmation.
- **Join**: public codes with Copy Code, search by player or code, filter by mode and country, live countdown.
- **Live Chat**: signed-in members only. Sender name/avatar are stamped by the database, one message per second per person.
- **Profile**: username, email, member-since, active room + Delete Room, change avatar (draft until *Done*), change username, Logout, Delete Account.
- **Light / Dark**: dark by default; the choice is applied by a tiny inline script before first paint so there is no flash.

## Security notes

- Row Level Security is on for every table. Accounts are keyed by the immutable auth user id, never by username.
- `rooms` is not readable or writable by the browser at all; the three functions never return owner ids or guest keys.
- Browsers hold only the publishable key. The secret key exists only inside the Edge Function's server environment, which derives the user to delete from the caller's own verified token.
- Known limit: anyone can create rooms as a guest, so a determined spammer can flood the list. If that happens, add a CAPTCHA (e.g. Cloudflare Turnstile) in front of `create_room`, or require sign-in for room creation.

## Project layout

```
src/
  lib/        supabase client, storage (the only localStorage touchpoint), validation, room timing, auth errors
  services/   profile / room / chat calls to Supabase
  context/    Auth, Rooms (+ server-corrected clock), Theme, Toast, UI
  components/ Modal, Header, Drawer, RoomCard, ChatPanel, LoginModal, OnboardingModal …
  pages/      Home, Join, Create, Profile, Info, NotFound
  data/       avatars, countries, modes, static page copy
  styles/     tokens.css (themes), ui.css (primitives), app.css (layout)
supabase/
  schema.sql                     tables, RLS, functions, trigger
  functions/delete-account/      Edge Function
```
