create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  email text unique,
  avatar_url text,
  provider text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

alter table public.profiles
add column if not exists is_admin boolean not null default false;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles
    where id = auth.uid()
      and is_admin = true
  );
$$;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  subject_type text not null check (subject_type in ('person', 'pet')),
  style_id text,
  style_name text,
  status text not null default 'pending',
  total_amount numeric(10, 2) not null,
  preview_image_path text,
  reference_image_path text,
  prompt_snapshot text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

drop trigger if exists profiles_set_updated_at on public.profiles;
create trigger profiles_set_updated_at
before update on public.profiles
for each row
execute procedure public.set_updated_at();

drop trigger if exists orders_set_updated_at on public.orders;
create trigger orders_set_updated_at
before update on public.orders
for each row
execute procedure public.set_updated_at();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, avatar_url, provider)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name'),
    new.email,
    coalesce(new.raw_user_meta_data ->> 'avatar_url', new.raw_user_meta_data ->> 'picture'),
    new.raw_app_meta_data ->> 'provider'
  )
  on conflict (id) do update
  set
    full_name = coalesce(excluded.full_name, public.profiles.full_name),
    email = coalesce(excluded.email, public.profiles.email),
    avatar_url = coalesce(excluded.avatar_url, public.profiles.avatar_url),
    provider = coalesce(excluded.provider, public.profiles.provider),
    updated_at = timezone('utc', now());

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
after insert on auth.users
for each row
execute procedure public.handle_new_user();

grant execute on function public.is_admin() to authenticated;

alter table public.profiles enable row level security;
alter table public.orders enable row level security;

drop policy if exists "profiles_select_own" on public.profiles;
create policy "profiles_select_own"
on public.profiles
for select
using (auth.uid() = id or public.is_admin());

drop policy if exists "profiles_insert_own" on public.profiles;
create policy "profiles_insert_own"
on public.profiles
for insert
with check (auth.uid() = id);

drop policy if exists "profiles_update_own" on public.profiles;
create policy "profiles_update_own"
on public.profiles
for update
using (auth.uid() = id)
with check (auth.uid() = id);

drop policy if exists "orders_select_own" on public.orders;
create policy "orders_select_own"
on public.orders
for select
using (auth.uid() = user_id or public.is_admin());

drop policy if exists "orders_insert_own" on public.orders;
create policy "orders_insert_own"
on public.orders
for insert
with check (auth.uid() = user_id);

drop policy if exists "orders_update_admin" on public.orders;
create policy "orders_update_admin"
on public.orders
for update
using (public.is_admin())
with check (public.is_admin());

insert into storage.buckets (id, name, public)
values ('bonecos', 'bonecos', false)
on conflict (id) do nothing;

drop policy if exists "bonecos_select_own" on storage.objects;
create policy "bonecos_select_own"
on storage.objects
for select
to authenticated
using (
  bucket_id = 'bonecos'
  and (
    (storage.foldername(name))[1] = auth.uid()::text
    or public.is_admin()
  )
);

drop policy if exists "bonecos_insert_own" on storage.objects;
create policy "bonecos_insert_own"
on storage.objects
for insert
to authenticated
with check (
  bucket_id = 'bonecos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "bonecos_update_own" on storage.objects;
create policy "bonecos_update_own"
on storage.objects
for update
to authenticated
using (
  bucket_id = 'bonecos'
  and (storage.foldername(name))[1] = auth.uid()::text
)
with check (
  bucket_id = 'bonecos'
  and (storage.foldername(name))[1] = auth.uid()::text
);

drop policy if exists "bonecos_delete_own" on storage.objects;
create policy "bonecos_delete_own"
on storage.objects
for delete
to authenticated
using (
  bucket_id = 'bonecos'
  and (storage.foldername(name))[1] = auth.uid()::text
);
