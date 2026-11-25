-- Harden direct Data API and Storage calls as well as the Angular interface.

-- Keep the stored genre values aligned with all 14 choices shown in Angular.
alter table public.reading_profiles
  drop constraint reading_profiles_preferred_genres_check,
  drop constraint reading_profiles_known_genres;

alter table public.reading_profiles
  add constraint reading_profiles_preferred_genres_check
    check (cardinality(preferred_genres) <= 14),
  add constraint reading_profiles_known_genres
    check (preferred_genres <@ array[
      'Romance', 'Fantasia', 'Ficção científica', 'Suspense e mistério',
      'Drama', 'Desenvolvimento pessoal', 'Psicologia', 'Filosofia',
      'História', 'Biografias', 'Poesia', 'Clássicos', 'Outros',
      'Quero descobrir'
    ]::text[]);

create or replace function app_private.enforce_reader_profile_integrity()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  profile_keys text[] := array['explorador', 'imersivo', 'investigador', 'contemplativo'];
  genre_choices text[] := array[
    'Romance', 'Fantasia', 'Ficção científica', 'Suspense e mistério',
    'Drama', 'Desenvolvimento pessoal', 'Psicologia', 'Filosofia',
    'História', 'Biografias', 'Poesia', 'Clássicos', 'Outros', 'Quero descobrir'
  ];
  scores integer[] := array[0, 0, 0, 0];
  genres text[];
  leaders text[] := array[]::text[];
  score_index integer;
  maximum_score integer;
  question_index integer;
  answer_value text;
begin
  if new.answers is null or pg_catalog.jsonb_typeof(new.answers) is distinct from 'object' then
    raise exception using errcode = '22023', message = 'As respostas precisam ser um objeto.';
  end if;

  if exists (
    select 1
    from pg_catalog.jsonb_object_keys(new.answers) as answer_key(name)
    where answer_key.name !~ '^q([1-9]|1[0-9]|2[01])$'
  ) then
    raise exception using errcode = '22023', message = 'O mapeamento contém uma pergunta desconhecida.';
  end if;

  for question_index in 1..12 loop
    answer_value := new.answers ->> ('q' || question_index::text);
    if answer_value = 'A' then
      score_index := 1;
    elsif answer_value = 'B' then
      score_index := 2;
    elsif answer_value = 'C' then
      score_index := 3;
    elsif answer_value = 'D' then
      score_index := 4;
    else
      raise exception using errcode = '22023', message = 'Responda às 12 perguntas pontuadas.';
    end if;
    scores[score_index] := scores[score_index] + 1;
  end loop;

  if pg_catalog.jsonb_typeof(new.answers -> 'q13') is distinct from 'array' then
    raise exception using errcode = '22023', message = 'Escolha ao menos um gênero literário.';
  end if;

  select pg_catalog.array_agg(choice.genre order by choice.ordinality)
    into genres
    from pg_catalog.jsonb_array_elements_text(new.answers -> 'q13') with ordinality
      as choice(genre, ordinality);

  if coalesce(pg_catalog.cardinality(genres), 0) < 1
     or pg_catalog.cardinality(genres) > 14 then
    raise exception using errcode = '22023', message = 'A lista de gêneros contém opções inválidas ou repetidas.';
  end if;

  if exists (
    select 1 from pg_catalog.unnest(genres) as selected(genre)
    where not (selected.genre = any(genre_choices))
  ) or pg_catalog.cardinality(genres) <> (
    select pg_catalog.count(distinct selected.genre)
    from pg_catalog.unnest(genres) as selected(genre)
  ) then
    raise exception using errcode = '22023', message = 'A lista de gêneros contém opções inválidas ou repetidas.';
  end if;

  if new.answers ->> 'q14' is null or new.answers ->> 'q14' not in ('curto', 'medio', 'longo', 'sem-preferencia')
     or new.answers ->> 'q15' is null or new.answers ->> 'q15' not in ('comecando', 'ocasional', 'frequente', 'sempre-gostei', 'retomar')
     or new.answers ->> 'q16' is null or new.answers ->> 'q16' not in ('ate-15', '15-30', '30-60', 'mais-60', 'sem-rotina')
     or new.answers ->> 'q19' is null or new.answers ->> 'q19' not in ('surpresa', 'participar', 'motivo') then
    raise exception using errcode = '22023', message = 'Responda às perguntas complementares obrigatórias.';
  end if;

  if (new.answers ? 'q17') and (
       pg_catalog.jsonb_typeof(new.answers -> 'q17') is distinct from 'string'
       or pg_catalog.char_length(new.answers ->> 'q17') > 500
     ) then
    raise exception using errcode = '22023', message = 'A resposta q17 excede o tamanho permitido.';
  end if;
  if (new.answers ? 'q18') and (
       pg_catalog.jsonb_typeof(new.answers -> 'q18') is distinct from 'string'
       or pg_catalog.char_length(new.answers ->> 'q18') > 500
     ) then
    raise exception using errcode = '22023', message = 'A resposta q18 excede o tamanho permitido.';
  end if;
  if (new.answers ? 'q20') and (
       pg_catalog.jsonb_typeof(new.answers -> 'q20') is distinct from 'string'
       or pg_catalog.char_length(new.answers ->> 'q20') > 500
     ) then
    raise exception using errcode = '22023', message = 'A resposta q20 excede o tamanho permitido.';
  end if;
  if (new.answers ? 'q21') and (
       pg_catalog.jsonb_typeof(new.answers -> 'q21') is distinct from 'string'
       or pg_catalog.char_length(new.answers ->> 'q21') > 120
     ) then
    raise exception using errcode = '22023', message = 'A resposta q21 excede o tamanho permitido.';
  end if;

  maximum_score := greatest(scores[1], scores[2], scores[3], scores[4]);
  for score_index in 1..4 loop
    if scores[score_index] = maximum_score then
      leaders := pg_catalog.array_append(leaders, profile_keys[score_index]);
    end if;
  end loop;

  new.profile_scores := pg_catalog.jsonb_build_object(
    'explorador', scores[1],
    'imersivo', scores[2],
    'investigador', scores[3],
    'contemplativo', scores[4]
  );
  new.profile_leaders := leaders;
  new.preferred_genres := genres;
  new.avoided_topics := pg_catalog.left(coalesce(new.answers ->> 'q17', ''), 500);
  return new;
end;
$function$;

revoke all on function app_private.enforce_reader_profile_integrity() from public, anon, authenticated;
drop trigger if exists enforce_reader_profile_integrity on public.reading_profiles;
create trigger enforce_reader_profile_integrity
  before insert or update on public.reading_profiles
  for each row execute function app_private.enforce_reader_profile_integrity();

-- Allow one submit attempt per user every 24 hours, with a bounded retry budget.
create or replace function app_private.limit_payment_proof_attempts()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
declare
  recent_attempts integer;
begin
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
drop trigger if exists limit_payment_proof_attempts on public.payment_submissions;
create trigger limit_payment_proof_attempts
  before insert on public.payment_submissions
  for each row execute function app_private.limit_payment_proof_attempts();

-- Preserve the payment identity and the submitted receipt after creation.
create or replace function app_private.prevent_payment_identity_changes()
returns trigger
language plpgsql
security definer
set search_path = ''
as $function$
begin
  if new.user_id is distinct from old.user_id
     or new.receipt_path is distinct from old.receipt_path
     or new.amount_cents is distinct from old.amount_cents
     or old.status <> 'pending_review' then
    raise exception using errcode = '42501', message = 'O envio e a identidade do comprovante são imutáveis após o envio.';
  end if;
  return new;
end;
$function$;

revoke all on function app_private.prevent_payment_identity_changes() from public, anon, authenticated;
drop trigger if exists prevent_payment_identity_changes on public.payment_submissions;
create trigger prevent_payment_identity_changes
  before update on public.payment_submissions
  for each row execute function app_private.prevent_payment_identity_changes();

alter table public.payment_submissions
  add column verified_amount_cents integer,
  add column recipient_verified boolean not null default false,
  add column transfer_settled boolean not null default false,
  add column reviewed_by uuid references auth.users (id),
  add constraint payment_submissions_verified_amount_check
    check (verified_amount_cents is null or verified_amount_cents = 2000),
  add constraint payment_submissions_approved_requires_verification
    check (
      status <> 'approved'
      or (
        verified_amount_cents = 2000
        and recipient_verified is true
        and transfer_settled is true
        and reviewed_at is not null
        and reviewed_by is not null
      )
    );

drop policy if exists "Platform admins can review payment submissions"
  on public.payment_submissions;
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
    and reviewed_by = (select auth.uid())
    and (
      status <> 'approved'
      or (
        verified_amount_cents = 2000
        and recipient_verified is true
        and transfer_settled is true
      )
    )
  );

-- Keep the master-role table read-only to signed-in clients; role creation is
-- performed only by the trusted auth.users confirmation trigger.
revoke all on public.platform_admins from public, anon, authenticated;
grant select on public.platform_admins to authenticated;

-- Restrict the private receipt bucket to photo formats; PDFs are not needed.
update storage.buckets
set allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id = 'payment-proofs';

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
  );
