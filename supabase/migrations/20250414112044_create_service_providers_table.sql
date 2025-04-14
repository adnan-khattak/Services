-- Create service_providers table
CREATE TABLE IF NOT EXISTS public.service_providers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  business_name TEXT NOT NULL,
  address TEXT NOT NULL,
  work_type TEXT NOT NULL,
  years_of_experience INTEGER DEFAULT 0,
  experience_country TEXT,
  bio TEXT,
  contact_phone TEXT,
  contact_email TEXT,
  UNIQUE(user_id)
);

-- Set up Row Level Security (RLS)
ALTER TABLE public.service_providers ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$
BEGIN
  -- Allow anyone to read service provider profiles
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'service_providers' 
    AND policyname = 'Allow public read access'
  ) THEN
    CREATE POLICY "Allow public read access"
    ON public.service_providers
    FOR SELECT
    USING (true);
  END IF;

  -- Allow authenticated users to create their own service provider profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'service_providers' 
    AND policyname = 'Allow users to create their own provider profile'
  ) THEN
    CREATE POLICY "Allow users to create their own provider profile"
    ON public.service_providers
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Allow users to update their own service provider profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'service_providers' 
    AND policyname = 'Allow users to update their own provider profile'
  ) THEN
    CREATE POLICY "Allow users to update their own provider profile"
    ON public.service_providers
    FOR UPDATE
    USING (auth.uid() = user_id);
  END IF;
END
$$;

-- Create or replace the function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_service_provider_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists and recreate it
DROP TRIGGER IF EXISTS update_service_providers_updated_at ON public.service_providers;
CREATE TRIGGER update_service_providers_updated_at
BEFORE UPDATE ON public.service_providers
FOR EACH ROW
EXECUTE FUNCTION update_service_provider_updated_at();

-- Create index for faster searches
CREATE INDEX IF NOT EXISTS service_providers_user_id_idx ON public.service_providers (user_id);
