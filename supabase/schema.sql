-- ════════════════════════════════════════════════════════════════════════
-- FRIEND11 — Supabase schema
--
-- Run once in: Dashboard → SQL Editor → New query → paste → Run.
-- Safe to re-run: everything is idempotent (create if not exists / or
-- replace / drop … if exists), so you can paste an updated copy over an old one.
--
-- What this sets up
--   1. profiles       one row per account (same id as auth.users), username +
--                     avatar + onboarding flag. Auto-created on sign-up.
--   2. rooms          public match rooms. Clients never touch the table
--                     directly; they use three functions (list_rooms,
--                     create_room, delete_my_room). Expiry (exactly 10
--                     minutes) is enforced HERE, from the server's own clock.
--   3. chat_messages  Live Chat. Members only; sender identity is stamped by
--                     the database, never trusted from the browser.
--
-- Security model in one paragraph: every table has Row Level Security on;
-- accounts are keyed by the immutable auth user id (never the username);
-- browsers only ever hold the public "publishable/anon" key; deleting an
-- account is done by an Edge Function (see functions/delete-account).
-- ════════════════════════════════════════════════════════════════════════

-- ── 1. profiles ─────────────────────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  username    text not null,
  avatar_id   integer not null default 1,
  onboarded   boolean not null default false,
  created_at  timestamptz not null default now()
);

alter table public.profiles add column if not exists onboarded boolean not null default false;

-- Same rules as the app (src/lib/validation.ts): 3–20 of A-Z a-z 0-9 _ . -
-- and no reserved/impersonating names. Enforced in the database too so the
-- rules hold even if someone bypasses the website.
alter table public.profiles drop constraint if exists profiles_username_format;
alter table public.profiles add constraint profiles_username_format check (
  username ~ '^[A-Za-z0-9_.-]{3,20}$'
  and username !~* '^(guest[0-9]*|admin|administrator|moderator|support|friend11|konami|efootball|official)$'
);
alter table public.profiles drop constraint if exists profiles_avatar_range;
alter table public.profiles add constraint profiles_avatar_range check (avatar_id between 1 and 20);

-- Case-insensitive uniqueness: "Alex" and "alex" cannot both exist.
create unique index if not exists profiles_username_lower_idx on public.profiles (lower(username));

alter table public.profiles enable row level security;

drop policy if exists "profiles: owner can read" on public.profiles;
create policy "profiles: owner can read" on public.profiles
  for select to authenticated using (auth.uid() = id);

drop policy if exists "profiles: owner can insert" on public.profiles;
create policy "profiles: owner can insert" on public.profiles
  for insert to authenticated with check (auth.uid() = id and onboarded = false);

drop policy if exists "profiles: owner can update" on public.profiles;
create policy "profiles: owner can update" on public.profiles
  for update to authenticated using (auth.uid() = id) with check (auth.uid() = id);

-- Column-level privileges: a person may change only these columns of their
-- own row. id and created_at can never be edited from the browser.
revoke all on public.profiles from anon, authenticated;
grant select on public.profiles to authenticated;
grant insert (id, username, avatar_id, onboarded) on public.profiles to authenticated;
grant update (username, avatar_id, onboarded) on public.profiles to authenticated;

-- Create the profile row the moment an account is created (Google OR email
-- link). The username is a neutral placeholder — NEVER the Google name — and
-- onboarded = false, so the app makes the person choose their own username
-- and avatar before the profile is usable.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, username, avatar_id, onboarded)
  values (new.id, 'player_' || substr(replace(new.id::text, '-', ''), 1, 8), 1, false)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ── 2. rooms ────────────────────────────────────────────────────────────
-- A room belongs to EITHER a signed-in account (owner_user_id) OR an
-- anonymous browser (owner_guest_key, a random id kept in that browser's
-- localStorage). Creating a room needs no login.
create table if not exists public.rooms (
  id              uuid primary key default gen_random_uuid(),
  owner_user_id   uuid references auth.users (id) on delete cascade,
  owner_guest_key text,
  username        text not null,
  avatar_id       integer not null default 1 check (avatar_id between 1 and 20),
  country         text not null check (country in
                    ('India','Brazil','Argentina','United Kingdom','Germany','United States','Indonesia','Japan','Malaysia','Other')),
  mode            text not null check (mode in
                    ('1v1 Dream Team','1v1 Authentic Team','Co-op Friendly','Tournament (4)','Tournament (8)')),
  code            text not null check (char_length(code) between 1 and 20),
  message         text not null default '' check (char_length(message) <= 140),
  created_at      timestamptz not null default now(),   -- the ONLY clock for expiry
  constraint rooms_exactly_one_owner check ((owner_user_id is not null) <> (owner_guest_key is not null))
);

-- One active room per account, and one per anonymous browser.
create unique index if not exists rooms_one_per_user  on public.rooms (owner_user_id)   where owner_user_id is not null;
create unique index if not exists rooms_one_per_guest on public.rooms (owner_guest_key) where owner_guest_key is not null;
create index if not exists rooms_created_at_idx on public.rooms (created_at desc);

-- No policies + no grants = the browser cannot read or write this table
-- directly. Everything goes through the functions below (which never expose
-- owner ids or guest keys).
alter table public.rooms enable row level security;
revoke all on public.rooms from anon, authenticated;

-- Live rooms, newest first. Deletes expired rows first (so there is no need
-- for a scheduled job) and returns the server clock so browsers can show an
-- accurate countdown even if their own clock is wrong.
create or replace function public.list_rooms(p_guest_key text default null)
returns table (
  id uuid, username text, avatar_id integer, country text, mode text, code text,
  message text, created_at timestamptz, server_now timestamptz, is_mine boolean
)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  uid uuid := auth.uid();
begin
  delete from public.rooms r where r.created_at <= now() - interval '10 minutes';

  return query
    select r.id, r.username, r.avatar_id, r.country, r.mode, r.code, r.message, r.created_at,
           now() as server_now,
           coalesce((uid is not null and r.owner_user_id = uid)
                 or (p_guest_key is not null and r.owner_guest_key = p_guest_key), false) as is_mine
    from public.rooms r
    where r.created_at > now() - interval '10 minutes'
    order by r.created_at desc
    limit 200;
end;
$$;

-- Publish a room (replacing the caller's existing one). Signed-in + onboarded
-- callers are posted under their profile; everyone else as "Guest####".
create or replace function public.create_room(
  p_code text, p_mode text, p_country text, p_message text,
  p_guest_key text default null, p_guest_username text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  uid        uuid := auth.uid();
  prof       public.profiles%rowtype;
  v_code     text := btrim(coalesce(p_code, ''));
  v_message  text := btrim(coalesce(p_message, ''));
  v_username text;
  v_avatar   integer := 1;
  v_member   boolean := false;
  v_id       uuid;
begin
  if char_length(v_code) not between 1 and 20 then
    raise exception 'Invalid room code' using errcode = '22023';
  end if;
  if char_length(v_message) > 140 then
    raise exception 'Message too long' using errcode = '22023';
  end if;
  if p_mode not in ('1v1 Dream Team','1v1 Authentic Team','Co-op Friendly','Tournament (4)','Tournament (8)') then
    raise exception 'Invalid mode' using errcode = '22023';
  end if;
  if p_country not in ('India','Brazil','Argentina','United Kingdom','Germany','United States','Indonesia','Japan','Malaysia','Other') then
    raise exception 'Invalid country' using errcode = '22023';
  end if;
  if p_guest_key is not null and char_length(p_guest_key) not between 16 and 64 then
    raise exception 'Invalid guest key' using errcode = '22023';
  end if;

  if uid is not null then
    select * into prof from public.profiles where id = uid;
    if found and prof.onboarded then
      v_member := true;
      v_username := prof.username;
      v_avatar := prof.avatar_id;
    end if;
  end if;

  if not v_member then
    if p_guest_key is null then
      raise exception 'Guest key required' using errcode = '22023';
    end if;
    -- Only generated-style guest names are accepted; anything else is replaced.
    if p_guest_username ~ '^Guest[0-9]{4}$' then
      v_username := p_guest_username;
    else
      v_username := 'Guest' || lpad((floor(random() * 10000))::integer::text, 4, '0');
    end if;
  end if;

  -- One room per person: drop this account's room and this browser's guest room.
  delete from public.rooms r
   where (uid is not null and r.owner_user_id = uid)
      or (p_guest_key is not null and r.owner_guest_key = p_guest_key);

  insert into public.rooms (owner_user_id, owner_guest_key, username, avatar_id, country, mode, code, message)
  values (
    case when v_member then uid else null end,
    case when v_member then null else p_guest_key end,
    v_username, v_avatar, p_country, p_mode, v_code, v_message
  )
  returning id into v_id;

  return v_id;
end;
$$;

create or replace function public.delete_my_room(p_guest_key text default null)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  delete from public.rooms r
   where (uid is not null and r.owner_user_id = uid)
      or (p_guest_key is not null and r.owner_guest_key = p_guest_key);
end;
$$;

revoke all on function public.list_rooms(text) from public;
revoke all on function public.create_room(text, text, text, text, text, text) from public;
revoke all on function public.delete_my_room(text) from public;
grant execute on function public.list_rooms(text) to anon, authenticated;
grant execute on function public.create_room(text, text, text, text, text, text) to anon, authenticated;
grant execute on function public.delete_my_room(text) to anon, authenticated;

-- ── 3. chat_messages ────────────────────────────────────────────────────
create table if not exists public.chat_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users (id) on delete cascade,
  username    text not null,
  avatar_id   integer not null,
  body        text not null check (char_length(btrim(body)) between 1 and 280),
  created_at  timestamptz not null default now()
);
create index if not exists chat_messages_created_at_idx on public.chat_messages (created_at desc);

alter table public.chat_messages enable row level security;

-- Members = signed in AND finished their profile.
drop policy if exists "chat: members can read" on public.chat_messages;
create policy "chat: members can read" on public.chat_messages
  for select to authenticated
  using (exists (select 1 from public.profiles p where p.id = auth.uid() and p.onboarded));

drop policy if exists "chat: members can post as themselves" on public.chat_messages;
create policy "chat: members can post as themselves" on public.chat_messages
  for insert to authenticated
  with check (user_id = auth.uid()
              and exists (select 1 from public.profiles p where p.id = auth.uid() and p.onboarded));

revoke all on public.chat_messages from anon, authenticated;
grant select on public.chat_messages to authenticated;
grant insert (body) on public.chat_messages to authenticated;  -- browsers send ONLY the text

-- Stamp who sent it from the database (not from the browser), throttle to one
-- message per second per person, and prune anything older than 7 days.
create or replace function public.stamp_chat_message()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  prof public.profiles%rowtype;
begin
  select * into prof from public.profiles where id = auth.uid();
  if not found or not prof.onboarded then
    raise exception 'Finish your profile to use chat' using errcode = '42501';
  end if;
  if exists (select 1 from public.chat_messages m
              where m.user_id = auth.uid() and m.created_at > clock_timestamp() - interval '1 second') then
    raise exception 'Slow down' using errcode = '54000';
  end if;
  new.user_id   := auth.uid();
  new.username  := prof.username;
  new.avatar_id := prof.avatar_id;
  new.body      := regexp_replace(btrim(new.body), '\s+', ' ', 'g');
  new.created_at := clock_timestamp();
  if random() < 0.05 then
    delete from public.chat_messages m where m.created_at < now() - interval '7 days';
  end if;
  return new;
end;
$$;

drop trigger if exists chat_messages_stamp on public.chat_messages;
create trigger chat_messages_stamp
  before insert on public.chat_messages
  for each row execute function public.stamp_chat_message();

revoke all on function public.stamp_chat_message() from public, anon, authenticated;

-- Live delivery (Realtime). Guarded so re-running doesn't error.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
     where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
  ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end;
$$;
