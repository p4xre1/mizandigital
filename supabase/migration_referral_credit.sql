-- Mizan Referral, Credits, and Daily Reset Migration
-- Run this migration in Supabase SQL Editor.

-- 1. Add referral and credits fields to the profiles table.
alter table public.profiles
  add column if not exists referral_code text unique default substring(md5(gen_random_uuid()::text), 1, 12),
  add column if not exists referred_by uuid references auth.users,
  add column if not exists referral_count int default 0 check (referral_count >= 0),
  add column if not exists daily_credits int default 3 check (daily_credits >= 0),
  add column if not exists bonus_credits int default 0 check (bonus_credits >= 0),
  add column if not exists created_at timestamptz default now();

-- 2. Ensure authenticated users can keep their own profile credits updated.
drop policy if exists "Users can update own profile" on public.profiles;
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id) with check (auth.uid() = id);

-- 3. Refresh the user profile creation trigger to populate referral_code.
create or replace function public.generate_referral_code()
returns text as $$
declare
  code text;
begin
  loop
    code := substring(md5(random()::text || clock_timestamp()::text), 1, 12);
    exit when not exists (select 1 from public.profiles where referral_code = code);
  end loop;
  return code;
end;
$$ language plpgsql security definer;

create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, role, tier, referral_code)
  values (new.id, 'user', 'free', public.generate_referral_code());
  return new;
end;
$$ language plpgsql security definer;

-- 4. Referral reward system.
create or replace function public.apply_referral_code(referred_user uuid, referral_code text)
returns jsonb as $$
declare
  inviter_id uuid;
  inviter_referral_count int;
begin
  select id, referral_count into inviter_id, inviter_referral_count
  from public.profiles
  where referral_code = referral_code
  limit 1;

  if inviter_id is null or inviter_id = referred_user then
    return jsonb_build_object('success', false, 'reason', 'invalid_referral_code');
  end if;

  update public.profiles
  set bonus_credits = bonus_credits + 2,
      referred_by = inviter_id
  where id = referred_user;

  if inviter_referral_count < 10 then
    update public.profiles
    set bonus_credits = bonus_credits + 5,
        referral_count = referral_count + 1
    where id = inviter_id;
  end if;

  return jsonb_build_object('success', true);
end;
$$ language plpgsql security definer;

-- 5. Credit deduction helper.
create or replace function public.deduct_credit(user_id uuid)
returns jsonb as $$
declare
  current_daily int;
  current_bonus int;
  used text;
begin
  select daily_credits, bonus_credits into current_daily, current_bonus
  from public.profiles
  where id = user_id
  for update;

  if current_daily is null then
    return jsonb_build_object('success', false, 'reason', 'profile_not_found', 'daily_credits', 0, 'bonus_credits', 0);
  end if;

  if current_daily + current_bonus <= 0 then
    return jsonb_build_object('success', false, 'reason', 'insufficient_credits', 'daily_credits', current_daily, 'bonus_credits', current_bonus);
  end if;

  if current_daily > 0 then
    update public.profiles
    set daily_credits = daily_credits - 1
    where id = user_id;
    used := 'daily';
  else
    update public.profiles
    set bonus_credits = bonus_credits - 1
    where id = user_id;
    used := 'bonus';
  end if;

  select daily_credits, bonus_credits into current_daily, current_bonus
  from public.profiles
  where id = user_id;

  return jsonb_build_object(
    'success', true,
    'used', used,
    'daily_credits', current_daily,
    'bonus_credits', current_bonus
  );
end;
$$ language plpgsql security definer;

create or replace function public.add_bonus_credits(user_id uuid, amount int)
returns jsonb as $$
declare
  current_daily int;
  current_bonus int;
begin
  if amount < 1 then
    raise exception 'amount must be positive';
  end if;

  update public.profiles
  set bonus_credits = bonus_credits + amount
  where id = user_id;

  select daily_credits, bonus_credits into current_daily, current_bonus
  from public.profiles
  where id = user_id;

  return jsonb_build_object(
    'success', true,
    'daily_credits', current_daily,
    'bonus_credits', current_bonus,
    'total', current_daily + current_bonus
  );
end;
$$ language plpgsql security definer;

-- 6. Midnight daily credit reset using pg_cron.
create extension if not exists pg_cron;
select cron.schedule('mizan_reset_daily_credits', '0 0 * * *', $$select public.reset_daily_credits();$$);

create or replace function public.reset_daily_credits()
returns void as $$
begin
  update public.profiles
  set daily_credits = 3;
end;
$$ language plpgsql security definer;
