drop policy if exists "Readers can view their own payment submissions"
  on public.payment_submissions;
drop policy if exists "Platform admins can view payment submissions"
  on public.payment_submissions;
create policy "Readers and admins can view payment submissions"
  on public.payment_submissions
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.platform_admins
      where platform_admins.user_id = (select auth.uid())
    )
  );

drop policy if exists "Readers can view their own contact profile"
  on public.reader_contact_profiles;
drop policy if exists "Platform admins can view reader contact profiles"
  on public.reader_contact_profiles;
create policy "Readers and admins can view contact profiles"
  on public.reader_contact_profiles
  for select to authenticated
  using (
    (select auth.uid()) = user_id
    or exists (
      select 1 from public.platform_admins
      where platform_admins.user_id = (select auth.uid())
    )
  );
