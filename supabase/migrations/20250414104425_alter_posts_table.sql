-- Drop media_url column if it exists
ALTER TABLE IF EXISTS public.posts 
DROP COLUMN IF EXISTS media_url;

-- Add media column as TEXT[] array to store multiple media URLs
ALTER TABLE IF EXISTS public.posts 
ADD COLUMN IF NOT EXISTS media TEXT[];
