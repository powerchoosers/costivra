create policy "contact inquiries deny client access"
on public.contact_inquiries
for all
to anon, authenticated
using (false)
with check (false);
