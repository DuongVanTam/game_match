INSERT INTO storage.buckets (id, name, public)
SELECT 'match-proofs', 'match-proofs', true
WHERE NOT EXISTS (
  SELECT 1 FROM storage.buckets WHERE id = 'match-proofs'
);

-- Ensure public read policy
CREATE POLICY "Public read for match proofs"
  ON storage.objects
  FOR SELECT
  USING (bucket_id = 'match-proofs');

-- Allow authenticated users to insert files
CREATE POLICY "Users can upload match proofs"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'match-proofs' AND owner = auth.uid());

CREATE POLICY "Users can update own match proofs"
  ON storage.objects
  FOR UPDATE
  TO authenticated
  USING (bucket_id = 'match-proofs' AND owner = auth.uid());

-- Allow users to delete own uploads (optional, currently disabled)

