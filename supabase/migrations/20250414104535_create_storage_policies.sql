-- Create post_media bucket if it doesn't exist
INSERT INTO storage.buckets (id, name, public, avif_autodetection, file_size_limit, allowed_mime_types)
VALUES ('post_media', 'post_media', true, false, 5242880, NULL) -- 5MB limit
ON CONFLICT (id) DO NOTHING;

-- Create policy to allow authenticated users to upload to post_media
CREATE POLICY "Allow authenticated users to upload media" ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'post_media');

-- Create policy to allow users to update their own media
CREATE POLICY "Allow users to update their own media" ON storage.objects
FOR UPDATE
TO authenticated
USING (bucket_id = 'post_media' AND owner = auth.uid());

-- Create policy to allow users to delete their own media
CREATE POLICY "Allow users to delete their own media" ON storage.objects
FOR DELETE
TO authenticated
USING (bucket_id = 'post_media' AND owner = auth.uid());

-- Create policy to allow everyone to read media
CREATE POLICY "Allow public read access to media" ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'post_media');
