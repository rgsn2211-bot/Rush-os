-- Promote the first user who signs up to owner role.
-- This function runs once via the trigger below: the very first profile
-- created gets role = 'owner'. All subsequent users stay 'worker'.
-- After the owner account exists, this trigger does nothing.

create or replace function promote_first_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if not exists (select 1 from profiles where role = 'owner') then
    update profiles set role = 'owner' where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_first_profile_promote
  after insert on profiles
  for each row execute function promote_first_user();
