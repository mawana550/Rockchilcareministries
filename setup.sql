-- Rock ChildCare Ministries: database setup.
-- Paste this whole file into Supabase > SQL Editor > New query, then press RUN. Do it once.

-- 1) Tables -------------------------------------------------------------
create table if not exists kv (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  updated_at timestamptz default now()
);

create table if not exists children (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sub text default '',
  img text not null,
  position int default 0,
  created_at timestamptz default now()
);

create table if not exists gallery (
  id uuid primary key default gen_random_uuid(),
  src text not null,
  caption text default '',
  position int default 0,
  created_at timestamptz default now()
);

create table if not exists before_after (
  id uuid primary key default gen_random_uuid(),
  before_src text not null,
  after_src text not null,
  before_caption text default '',
  after_caption text default '',
  position int default 0,
  created_at timestamptz default now()
);

create table if not exists submissions (
  id uuid primary key default gen_random_uuid(),
  kind text not null,                 -- partner | child | donation
  name text default '',
  data jsonb default '{}'::jsonb,
  status text default 'new',          -- new | done
  created_at timestamptz default now()
);

-- 2) Security: everyone can READ the website content, only the signed-in
--    admin can CHANGE it, and visitors can only SEND (not read) submissions.
alter table kv enable row level security;
alter table children enable row level security;
alter table gallery enable row level security;
alter table before_after enable row level security;
alter table submissions enable row level security;

do $$
declare t text;
begin
  foreach t in array array['kv','children','gallery','before_after'] loop
    execute format('drop policy if exists "public read" on %I', t);
    execute format('create policy "public read" on %I for select using (true)', t);
    execute format('drop policy if exists "admin write" on %I', t);
    execute format('create policy "admin write" on %I for all to authenticated using (true) with check (true)', t);
  end loop;
end $$;

drop policy if exists "visitors can send" on submissions;
create policy "visitors can send" on submissions for insert to anon, authenticated
  with check (status = 'new' and kind in ('partner','child','donation'));

drop policy if exists "admin manages submissions" on submissions;
create policy "admin manages submissions" on submissions for all to authenticated
  using (true) with check (true);

-- 3) Picture storage ------------------------------------------------------
insert into storage.buckets (id, name, public) values ('media', 'media', true)
  on conflict (id) do nothing;

drop policy if exists "public read media" on storage.objects;
create policy "public read media" on storage.objects for select using (bucket_id = 'media');

drop policy if exists "admin upload media" on storage.objects;
create policy "admin upload media" on storage.objects for insert to authenticated with check (bucket_id = 'media');

drop policy if exists "admin update media" on storage.objects;
create policy "admin update media" on storage.objects for update to authenticated using (bucket_id = 'media');

drop policy if exists "admin delete media" on storage.objects;
create policy "admin delete media" on storage.objects for delete to authenticated using (bucket_id = 'media');
