-- Allow authenticated users (via edge function) to insert/update holidays
CREATE POLICY "Authenticated can insert holidays"
ON public.holidays FOR INSERT
TO authenticated
WITH CHECK (true);