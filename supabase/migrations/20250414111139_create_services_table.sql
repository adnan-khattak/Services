-- Create services table
CREATE TABLE IF NOT EXISTS public.services (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  price TEXT NOT NULL,
  category TEXT NOT NULL,
  location TEXT NOT NULL,
  media TEXT[] DEFAULT '{}'::TEXT[],
  rating NUMERIC(3, 2) DEFAULT 0.0,
  reviews_count INTEGER DEFAULT 0
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$
BEGIN
  -- Allow anyone to read services
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'services' 
    AND policyname = 'Allow public read access'
  ) THEN
    CREATE POLICY "Allow public read access"
    ON public.services
    FOR SELECT
    USING (true);
  END IF;

  -- Allow authenticated users to create services
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'services' 
    AND policyname = 'Allow authenticated users to create services'
  ) THEN
    CREATE POLICY "Allow authenticated users to create services"
    ON public.services
    FOR INSERT
    WITH CHECK (auth.role() = 'authenticated' AND auth.uid() = user_id);
  END IF;

  -- Allow users to update their own services
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'services' 
    AND policyname = 'Allow users to update their own services'
  ) THEN
    CREATE POLICY "Allow users to update their own services"
    ON public.services
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;

  -- Allow users to delete their own services
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'services' 
    AND policyname = 'Allow users to delete their own services'
  ) THEN
    CREATE POLICY "Allow users to delete their own services"
    ON public.services
    FOR DELETE
    USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Create or replace the function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_services_updated_at ON public.services;
CREATE TRIGGER update_services_updated_at
BEFORE UPDATE ON public.services
FOR EACH ROW
EXECUTE FUNCTION update_service_updated_at();

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS services_category_idx ON public.services (category);
CREATE INDEX IF NOT EXISTS services_user_id_idx ON public.services (user_id);
