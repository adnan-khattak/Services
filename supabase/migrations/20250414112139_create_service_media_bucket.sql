-- Create a bucket for service media if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('service_media', 'service_media', true, false, 10485760, NULL) -- 10MB limit
ON CONFLICT (id) DO NOTHING;

-- Create policies for the service_media bucket
DO $$
BEGIN
  -- Allow authenticated users to upload to service_media
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Allow authenticated users to upload service media'
  ) THEN
    CREATE POLICY "Allow authenticated users to upload service media" ON storage.objects
    FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'service_media');
  END IF;

  -- Allow users to update their own media
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Allow users to update their own service media'
  ) THEN
    CREATE POLICY "Allow users to update their own service media" ON storage.objects
    FOR UPDATE
    TO authenticated
    USING (bucket_id = 'service_media' AND owner = auth.uid());
  END IF;

  -- Allow users to delete their own media
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Allow users to delete their own service media'
  ) THEN
    CREATE POLICY "Allow users to delete their own service media" ON storage.objects
    FOR DELETE
    TO authenticated
    USING (bucket_id = 'service_media' AND owner = auth.uid());
  END IF;

  -- Allow everyone to read media
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'objects' 
    AND policyname = 'Allow public read access to service media'
  ) THEN
    CREATE POLICY "Allow public read access to service media" ON storage.objects
    FOR SELECT
    TO public
    USING (bucket_id = 'service_media');
  END IF;
END
$$;
