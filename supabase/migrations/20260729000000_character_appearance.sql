-- 20260729000000_character_appearance.sql
alter table public.characters
  add column if not exists appearance jsonb not null default '{}'::jsonb;

create or replace function public.update_appearance(
  p_character_id uuid,
  p_appearance jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  -- Shape guard: object with only known keys, string-or-null values.
  if jsonb_typeof(p_appearance) <> 'object' then
    raise exception 'appearance must be an object';
  end if;
  if exists (
    select 1 from jsonb_each(p_appearance)
    where key not in ('body','skin','hair_style','hair_color','eyes','torso_color','legs_color')
       or jsonb_typeof(value) not in ('string','null')
  ) then
    raise exception 'unknown appearance key or non-string value';
  end if;

  update public.characters
     set appearance = p_appearance
   where id = p_character_id
     and user_id = auth.uid();
  if not found then
    raise exception 'character not found or not owned by caller';
  end if;
end;
$$;

grant execute on function public.update_appearance(uuid, jsonb) to authenticated;
