-- Create likes table to track user likes on posts
CREATE TABLE IF NOT EXISTS public.likes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  UNIQUE(user_id, post_id)
);

-- Add RLS policies
ALTER TABLE public.likes ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to see all likes
CREATE POLICY "Allow read access for all authenticated users" 
ON public.likes
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow authenticated users to like posts (insert their own likes)
CREATE POLICY "Allow users to like posts"
ON public.likes
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to remove their own likes
CREATE POLICY "Allow users to remove their likes"
ON public.likes
FOR DELETE
USING (auth.uid() = user_id);

-- Create comments table if it doesn't exist yet
CREATE TABLE IF NOT EXISTS public.comments (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE NOT NULL,
  content TEXT NOT NULL
);

-- Add RLS policies for comments
ALTER TABLE public.comments ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to see all comments
CREATE POLICY "Allow read access for all authenticated users" 
ON public.comments
FOR SELECT
USING (auth.role() = 'authenticated');

-- Allow authenticated users to comment on posts
CREATE POLICY "Allow users to comment on posts"
ON public.comments
FOR INSERT
WITH CHECK (auth.uid() = user_id);

-- Allow users to delete their own comments
CREATE POLICY "Allow users to delete their comments"
ON public.comments
FOR DELETE
USING (auth.uid() = user_id);

-- Create index to speed up queries
CREATE INDEX IF NOT EXISTS likes_post_id_idx ON public.likes (post_id);
CREATE INDEX IF NOT EXISTS likes_user_id_idx ON public.likes (user_id);
CREATE INDEX IF NOT EXISTS comments_post_id_idx ON public.comments (post_id);
CREATE INDEX IF NOT EXISTS comments_user_id_idx ON public.comments (user_id);
