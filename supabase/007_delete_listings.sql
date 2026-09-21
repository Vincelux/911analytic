-- Allows authenticated users to delete listings (no such policy existed
-- before — deletion was simply impossible from the app).

create policy "Authenticated users can delete listings"
  on public.listings for delete
  to authenticated
  using (true);
