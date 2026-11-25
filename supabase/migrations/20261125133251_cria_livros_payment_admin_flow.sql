-- Payment and admin flow layered over the Cria Livros baseline.
-- New API access is granted explicitly because Supabase no longer exposes
-- newly created tables to the Data API automatically.

alter table public.reader_contact_profiles
  add column adult_confirmed boolean not null default false;

alter table public.reader_contact_profiles
  alter column adult_attested_at drop default;

alter table public.payment_submissions
  add column amount_cents integer not null default 2000
    constraint payment_submissions_amount_cents_check check (amount_cents = 2000);

create unique index payment_submissions_one_open_or_approved_per_user
  on public.payment_submissions (user_id)
  where status in ('pending_review', 'approved');

create index reader_group_settings_updated_by_idx
  on public.reader_group_settings (updated_by)
  where updated_by is not null;

drop policy if exists "Readers can create their own contact profile"
  on public.reader_contact_profiles;
create policy "Readers can create their own contact profile"
  on public.reader_contact_profiles
  for insert to authenticated
  with check (
    (select auth.uid()) = user_id
    and adult_confirmed is true
    and adult_attested_at is not null
  );

drop policy if exists "Readers can update their own contact profile"
  on public.reader_contact_profiles;
create policy "Readers can update their own contact profile"
  on public.reader_contact_profiles
  for update to authenticated
  using ((select auth.uid()) = user_id)
  with check (
    (select auth.uid()) = user_id
    and adult_confirmed is true
    and adult_attested_at is not null
  );

create policy "Platform admins can view payment submissions"
  on public.payment_submissions
  for select to authenticated
  using (
    exists (
      select 1 from public.platform_admins
      where platform_admins.user_id = (select auth.uid())
    )
  );

create policy "Platform admins can review payment submissions"
  on public.payment_submissions
  for update to authenticated
  using (
    exists (
      select 1 from public.platform_admins
      where platform_admins.user_id = (select auth.uid())
    )
  )
  with check (
    exists (
      select 1 from public.platform_admins
      where platform_admins.user_id = (select auth.uid())
    )
    and status in ('approved', 'rejected')
    and reviewed_at is not null
  );

create policy "Platform admins can view reader contact profiles"
  on public.reader_contact_profiles
  for select to authenticated
  using (
    exists (
      select 1 from public.platform_admins
      where platform_admins.user_id = (select auth.uid())
    )
  );

create policy "Platform admins can view payment proof files"
  on storage.objects
  for select to authenticated
  using (
    bucket_id = 'payment-proofs'
    and exists (
      select 1 from public.platform_admins
      where platform_admins.user_id = (select auth.uid())
    )
  );

update storage.buckets
set file_size_limit = 5242880,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp', 'application/pdf']
where id = 'payment-proofs';

grant select, insert, update on public.reader_contact_profiles to authenticated;
grant select, insert, update on public.payment_submissions to authenticated;
grant select, insert, update on public.reading_profiles to authenticated;
grant select, insert, update, delete on public.book_feedback to authenticated;
grant select on public.platform_admins to authenticated;
grant select, update on public.reader_group_settings to authenticated;

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

-- This trigger is the only route that grants the one authorized master account.
-- It runs only after Supabase Auth confirms ownership of the allowlisted email.
create or replace function app_private.grant_cria_livros_master_admin()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.email_confirmed_at is not null
     and lower(new.email) = 'orange.goncalves@gmail.com' then
    insert into public.platform_admins (user_id)
    values (new.id)
    on conflict (user_id) do nothing;
  end if;
  return new;
end;
$function$;

revoke all on function app_private.grant_cria_livros_master_admin() from public, anon, authenticated;
drop trigger if exists grant_cria_livros_master_admin on auth.users;
create trigger grant_cria_livros_master_admin
  after insert or update on auth.users
  for each row execute function app_private.grant_cria_livros_master_admin();

do $block$
declare
  confirmed_master_id uuid;
begin
  select id into confirmed_master_id
  from auth.users
  where lower(email) = 'orange.goncalves@gmail.com'
    and email_confirmed_at is not null
  limit 1;

  if confirmed_master_id is not null then
    insert into public.platform_admins (user_id)
    values (confirmed_master_id)
    on conflict (user_id) do nothing;
  end if;
end;
$block$;

-- PostgreSQL regular-expression intervals are limited to 255. The previous
-- {6,256} bound made every new community-link validation fail at runtime.
alter table public.reader_group_settings
  drop constraint reader_group_settings_invite_url;
alter table public.reader_group_settings
  add constraint reader_group_settings_invite_url
  check (
    invite_url is null
    or (
      char_length(invite_url) <= 500
      and invite_url ~ '^https://chat[.]whatsapp[.]com/[A-Za-z0-9_-]{6,255}[A-Za-z0-9_-]?([?][A-Za-z0-9_=&%-]*)?$'
    )
  );

update public.reader_group_settings
set invite_url = 'https://chat.whatsapp.com/HLTqdXmVlCsJcaA6P0nNcI?s=qt&p=i&iam=2',
    updated_at = now(),
    updated_by = null;
