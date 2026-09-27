import { Logo } from './Logo';

/** Shown instead of the app when the Supabase env vars are missing. */
export function SetupNeeded() {
  return (
    <main className="setup">
      <div className="card form-card">
        <Logo size="lg" />
        <h1>Setup needed</h1>
        <p>
          This build has no Supabase connection. Copy <code>.env.example</code> to <code>.env.local</code>, set{' '}
          <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_PUBLISHABLE_KEY</code>, then restart. On a host such as Vercel or
          Netlify, add the same variables in the project settings and redeploy.
        </p>
      </div>
    </main>
  );
}
