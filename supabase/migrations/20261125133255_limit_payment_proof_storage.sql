-- Storage uploads and payment rows are separate API calls, so enforce the
-- per-user limit before Storage accepts another receipt file.
create or replace function app_private.payment_proof_upload_allowed()
returns boolean
language plpgsql
security definer
set search_path = ''
as $function$
declare
  current_user_id uuid := auth.uid();
  recent_uploads integer;
begin
  if current_user_id is null then
    return false;
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(current_user_id::text, 2));
  select pg_catalog.count(*) into recent_uploads
  from storage.objects
  where bucket_id = 'payment-proofs'
    and owner_id = current_user_id::text
    and created_at >= pg_catalog.now() - interval '24 hours';

  return recent_uploads < 5;
end;
$function$;

revoke all on function app_private.payment_proof_upload_allowed() from public, anon, authenticated;
grant usage on schema app_private to authenticated;
grant execute on function app_private.payment_proof_upload_allowed() to authenticated;

drop policy if exists "Readers can upload their own payment proofs"
  on storage.objects;
create policy "Readers can upload their own payment proofs"
  on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = (select (auth.uid())::text)
    and name ~* '[.](jpg|jpeg|png|webp)$'
    and coalesce(metadata ->> 'mimetype', '') in ('image/jpeg', 'image/png', 'image/webp')
    and coalesce(metadata ->> 'size', '') ~ '^[0-9]+$'
    and (metadata ->> 'size')::bigint <= 5242880
    and app_private.payment_proof_upload_allowed()
  );

-- Permit cleanup when Storage succeeds but the corresponding payment row is
-- rejected by a database check. Submitted evidence cannot be removed.
drop policy if exists "Readers can remove unsubmitted payment proofs"
  on storage.objects;
create policy "Readers can remove unsubmitted payment proofs"
  on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'payment-proofs'
    and (storage.foldername(name))[1] = (select (auth.uid())::text)
    and not exists (
      select 1
      from public.payment_submissions
      where payment_submissions.receipt_path = name
        and payment_submissions.user_id = (select auth.uid())
    )
  );

-- Do not trust client-provided timestamps or paths to nonexistent files.
create or replace function app_private.limit_payment_proof_attempts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  recent_attempts integer;
begin
  new.submitted_at := pg_catalog.now();

  if not exists (
    select 1
    from storage.objects
    where bucket_id = 'payment-proofs'
      and name = new.receipt_path
      and owner_id = new.user_id::text
      and coalesce(metadata ->> 'mimetype', '') in ('image/jpeg', 'image/png', 'image/webp')
      and coalesce(metadata ->> 'size', '') ~ '^[0-9]+$'
      and (metadata ->> 'size')::bigint <= 5242880
  ) then
    raise exception using errcode = '22023', message = 'Envie um arquivo de imagem válido para continuar.';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(new.user_id::text, 0));
  select pg_catalog.count(*) into recent_attempts
  from public.payment_submissions
  where user_id = new.user_id
    and submitted_at >= pg_catalog.now() - interval '24 hours';

  if recent_attempts >= 5 then
    raise exception using errcode = 'P0001', message = 'Limite de 5 envios de comprovante em 24 horas atingido.';
  end if;
  return new;
end;
$function$;

revoke all on function app_private.limit_payment_proof_attempts() from public, anon, authenticated;
