-- aliteraciones-nacionales — schema v2
-- Run this in the Supabase SQL editor. DESTRUCTIVE: drops existing tables.

-- ---------------------------------------------------------------------------
-- Drop in reverse dependency order. Idempotent re-runs are safe.
-- ---------------------------------------------------------------------------
drop trigger if exists trg_auto_grant_editor on auth.users;
drop function if exists auto_grant_editor()  cascade;
drop table if exists alliterations cascade;
drop table if exists songs         cascade;
drop table if exists albums        cascade;
drop table if exists bands         cascade;
drop table if exists editors       cascade;
drop function if exists is_editor()     cascade;
drop function if exists is_superadmin() cascade;

-- ---------------------------------------------------------------------------
-- editors (write access). Roles: 'admin' (default) and 'superadmin'.
-- Superadmins can delete anything; admins can only delete rows they created.
-- ---------------------------------------------------------------------------
create table editors (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  email      text,
  role       text not null default 'admin' check (role in ('admin', 'superadmin')),
  created_at timestamptz not null default now()
);

create or replace function is_editor() returns boolean
language sql stable as $$
  select exists (select 1 from editors where user_id = auth.uid())
$$;

create or replace function is_superadmin() returns boolean
language sql stable as $$
  select exists (select 1 from editors where user_id = auth.uid() and role = 'superadmin')
$$;

-- ---------------------------------------------------------------------------
-- bands
-- ---------------------------------------------------------------------------
create table bands (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  display_order int not null default 0,
  created_by    uuid references auth.users(id) default auth.uid()
);

-- ---------------------------------------------------------------------------
-- albums
-- ---------------------------------------------------------------------------
create table albums (
  id            uuid primary key default gen_random_uuid(),
  band_id       uuid not null references bands(id) on delete cascade,
  slug          text not null,
  name          text not null,
  year          int,
  display_order int not null default 0,
  created_by    uuid references auth.users(id) default auth.uid(),
  unique (band_id, slug)
);

create index albums_band_idx on albums (band_id, display_order);

-- ---------------------------------------------------------------------------
-- songs
-- ---------------------------------------------------------------------------
create table songs (
  id            uuid primary key default gen_random_uuid(),
  album_id      uuid not null references albums(id) on delete cascade,
  slug          text not null,
  title         text not null,
  lyrics        text not null,
  track_number  int,
  created_by    uuid references auth.users(id) default auth.uid(),
  unique (album_id, slug)
);

create index songs_album_idx on songs (album_id, track_number nulls last);

-- ---------------------------------------------------------------------------
-- alliterations — one optional decoration per lyric line, keyed by line_index.
-- songs.lyrics is split by \n on the client; line_index points into that array.
-- ---------------------------------------------------------------------------
create table alliterations (
  id          uuid primary key default gen_random_uuid(),
  song_id     uuid not null references songs(id) on delete cascade,
  line_index  int  not null,
  markup      text not null,
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users(id) default auth.uid(),
  unique (song_id, line_index)
);

create index alliterations_song_idx on alliterations (song_id, line_index);

-- ---------------------------------------------------------------------------
-- RLS — anon/authenticated read everything;
-- any editor can insert/update;
-- delete only by row owner OR superadmin.
-- ---------------------------------------------------------------------------
alter table bands         enable row level security;
alter table albums        enable row level security;
alter table songs         enable row level security;
alter table alliterations enable row level security;
alter table editors       enable row level security;

create policy bands_read         on bands         for select using (true);
create policy albums_read        on albums        for select using (true);
create policy songs_read         on songs         for select using (true);
create policy alliterations_read on alliterations for select using (true);

create policy bands_insert         on bands         for insert with check (is_editor());
create policy albums_insert        on albums        for insert with check (is_editor());
create policy songs_insert         on songs         for insert with check (is_editor());
create policy alliterations_insert on alliterations for insert with check (is_editor());

create policy bands_update         on bands         for update using (is_editor()) with check (is_editor());
create policy albums_update        on albums        for update using (is_editor()) with check (is_editor());
create policy songs_update         on songs         for update using (is_editor()) with check (is_editor());
create policy alliterations_update on alliterations for update using (is_editor()) with check (is_editor());

create policy bands_delete         on bands         for delete using (is_superadmin() or created_by = auth.uid());
create policy albums_delete        on albums        for delete using (is_superadmin() or created_by = auth.uid());
create policy songs_delete         on songs         for delete using (is_superadmin() or created_by = auth.uid());
create policy alliterations_delete on alliterations for delete using (is_superadmin() or created_by = auth.uid());

create policy editors_self_read on editors for select using (user_id = auth.uid());

-- ---------------------------------------------------------------------------
-- Seed: Patricio Rey y sus Redonditos de Ricota + studio discography.
-- These rows have NULL created_by → only superadmin can delete them.
-- ---------------------------------------------------------------------------
insert into bands (slug, name, display_order) values
  ('redonditos', 'Patricio Rey y sus Redonditos de Ricota', 0);

insert into albums (band_id, slug, name, year, display_order)
select b.id, a.slug, a.name, a.year, a.display_order
from bands b
cross join (values
  ('gulp',              'Gulp!',                                1985, 1),
  ('oktubre',           'Oktubre',                              1986, 2),
  ('un-baion',          'Un baión para el ojo idiota',          1988, 3),
  ('bang-bang',         '¡Bang! ¡Bang!… Estás liquidado',       1989, 4),
  ('la-mosca-y-la-sopa','La mosca y la sopa',                   1991, 5),
  ('lobo-suelto',       'Lobo suelto / Cordero atado',          1993, 6),
  ('luzbelito',         'Luzbelito',                            1996, 7),
  ('ultimo-bondi',      'Último bondi a Finisterre',            1998, 8),
  ('momo-sampler',      'Momo Sampler',                         2000, 9)
) as a(slug, name, year, display_order)
where b.slug = 'redonditos';

-- ---------------------------------------------------------------------------
-- Auto-grant editor for a hardcoded allowlist on first sign-in, plus backfill
-- for users who already signed up. The first email becomes superadmin; others
-- in the list (if any) get default 'admin'.
-- ---------------------------------------------------------------------------
create or replace function auto_grant_editor() returns trigger
language plpgsql security definer as $$
begin
  if new.email = 'gutmanjuancamilo@gmail.com' then
    insert into editors (user_id, email, role)
    values (new.id, new.email, 'superadmin')
    on conflict (user_id) do update set role = 'superadmin';
  end if;
  return new;
end $$;

create trigger trg_auto_grant_editor
  after insert on auth.users
  for each row execute function auto_grant_editor();

insert into editors (user_id, email, role)
select id, email, 'superadmin' from auth.users where email = 'gutmanjuancamilo@gmail.com'
on conflict (user_id) do update set role = 'superadmin';
