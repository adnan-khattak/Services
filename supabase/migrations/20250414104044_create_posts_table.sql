CREATE TABLE IF NOT EXISTS public.posts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL,
  media TEXT[],
  likes INTEGER DEFAULT 0 NOT NULL,
  comments INTEGER DEFAULT 0 NOT NULL
);

-- Add RLS policies
ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

-- Policy to allow read access to all authenticated users
CREATE POLICY "Allow read access for all authenticated users" 
ON public.posts
FOR SELECT
USING (auth.role() = 'authenticated');

-- Policy to allow insert for authenticated users (for their own posts)
CREATE POLICY "Allow insert for authenticated users"
ON public.posts
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Policy to allow update for post owners
CREATE POLICY "Allow update for post owners"
ON public.posts
FOR UPDATE
USING (auth.uid() = user_id);

-- Policy to allow delete for post owners
CREATE POLICY "Allow delete for post owners"
ON public.posts
FOR DELETE
USING (auth.uid() = user_id);
