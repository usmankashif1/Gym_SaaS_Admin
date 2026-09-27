alter table public.gyms
  add column logo_path text;

grant update on public.gyms to authenticated;

create policy "Gym owners can update their gym profile"
  on public.gyms for update to authenticated
  using (public.is_gym_owner(id))
  with check (public.is_gym_owner(id));

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gym-logos',
  'gym-logos',
  true,
  2097152,
  array['image/png', 'image/jpeg', 'image/webp']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Gym logos are publicly readable"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'gym-logos');

create policy "Gym owners can upload their gym logo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'gym-logos'
    and public.is_gym_owner(((storage.foldername(name))[1])::uuid)
  );

create policy "Gym owners can replace their gym logo"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'gym-logos'
    and public.is_gym_owner(((storage.foldername(name))[1])::uuid)
  )
  with check (
    bucket_id = 'gym-logos'
    and public.is_gym_owner(((storage.foldername(name))[1])::uuid)
  );

create policy "Gym owners can delete their gym logo"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'gym-logos'
    and public.is_gym_owner(((storage.foldername(name))[1])::uuid)
  );