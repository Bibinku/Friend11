// FRIEND11 — delete-account Edge Function
//
// Deploy (Supabase CLI, from the project root):
//   supabase login
//   supabase link --project-ref <your-project-ref>
//   supabase functions deploy delete-account
//
// Why a server function: deleting an auth user needs the project's privileged
// secret key, which must never reach the browser. Supabase injects it into
// every Edge Function's environment — there is nothing to configure.
//
// Security: the user to delete comes ONLY from the caller's own verified
// access token, never from the request body, so a person can only ever delete
// themselves. Deleting the auth user cascades (ON DELETE CASCADE) to their
// profile, room and chat messages.

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' } });
}

/** Supports both the legacy SUPABASE_SERVICE_ROLE_KEY and the newer
 * SUPABASE_SECRET_KEYS JSON map, so it keeps working through the transition. */
function readSecretKey(): string {
  const legacy = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  if (legacy) return legacy;
  const map = Deno.env.get('SUPABASE_SECRET_KEYS');
  if (map) {
    const parsed = JSON.parse(map) as Record<string, string>;
    if (parsed.default) return parsed.default;
  }
  throw new Error('No Supabase secret key found in this function’s environment.');
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
  if (req.method !== 'POST') return json({ error: 'Method not allowed' }, 405);

  const authHeader = req.headers.get('Authorization');
  if (!authHeader) return json({ error: 'Missing Authorization header' }, 401);

  const url = Deno.env.get('SUPABASE_URL')!;
  const secret = readSecretKey();

  // 1) Who is calling? Resolved from their own token.
  const caller = createClient(url, secret, {
    global: { headers: { Authorization: authHeader } },
    auth: { persistSession: false },
  });
  const { data, error } = await caller.auth.getUser();
  if (error || !data.user) return json({ error: 'Invalid or expired session' }, 401);

  // 2) Delete exactly that user with the privileged client.
  const admin = createClient(url, secret, { auth: { persistSession: false } });
  const { error: deleteError } = await admin.auth.admin.deleteUser(data.user.id);
  if (deleteError) return json({ error: deleteError.message }, 500);

  return json({ success: true });
});
