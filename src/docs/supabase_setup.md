# Supabase Setup Guide for Services App

This document outlines the necessary steps to set up Supabase for the Services App project.

## Database Tables

### 1. profiles
```sql
create table profiles (
  id uuid references auth.users on delete cascade primary key,
  username text not null,
  phone text,
  role text not null default 'user',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Set up Row Level Security (RLS)
alter table profiles enable row level security;

-- Create policies
create policy "Public profiles are viewable by everyone"
  on profiles for select
  using (true);

create policy "Users can update their own profile"
  on profiles for update
  using (auth.uid() = id);
```

### 2. service_providers
```sql
create table service_providers (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  business_name text not null,
  address text not null,
  work_type text not null,
  years_of_experience integer not null,
  experience_country text not null,
  approval_status text not null default 'pending',
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Set up Row Level Security (RLS)
alter table service_providers enable row level security;

-- Create policies
create policy "Service providers are viewable by everyone"
  on service_providers for select
  using (true);

create policy "Users can insert their own service provider profile"
  on service_providers for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own service provider profile"
  on service_providers for update
  using (auth.uid() = user_id);
```

### 3. services
```sql
create table services (
  id uuid primary key default uuid_generate_v4(),
  provider_id uuid references service_providers(id) on delete cascade not null,
  title text not null,
  description text not null,
  price text not null,
  category text not null,
  location text not null,
  media jsonb default '[]'::jsonb,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Set up Row Level Security (RLS)
alter table services enable row level security;

-- Create policies
create policy "Services are viewable by everyone"
  on services for select
  using (true);

create policy "Service providers can create services"
  on services for insert
  with check (
    auth.uid() in (
      select user_id from service_providers 
      where id = provider_id and approval_status = 'approved'
    )
  );

create policy "Service providers can update their own services"
  on services for update
  using (
    auth.uid() in (
      select user_id from service_providers where id = provider_id
    )
  );

create policy "Service providers can delete their own services"
  on services for delete
  using (
    auth.uid() in (
      select user_id from service_providers where id = provider_id
    )
  );
```

### 4. posts
```sql
create table posts (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  media jsonb default '[]'::jsonb,
  likes integer default 0,
  comments integer default 0,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Set up Row Level Security (RLS)
alter table posts enable row level security;

-- Create policies
create policy "Posts are viewable by everyone"
  on posts for select
  using (true);

create policy "Users can create posts"
  on posts for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own posts"
  on posts for update
  using (auth.uid() = user_id);

create policy "Users can delete their own posts"
  on posts for delete
  using (auth.uid() = user_id);
```

### 5. comments
```sql
create table comments (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references posts(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  content text not null,
  created_at timestamp with time zone default now(),
  updated_at timestamp with time zone default now()
);

-- Set up Row Level Security (RLS)
alter table comments enable row level security;

-- Create policies
create policy "Comments are viewable by everyone"
  on comments for select
  using (true);

create policy "Users can create comments"
  on comments for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own comments"
  on comments for update
  using (auth.uid() = user_id);

create policy "Users can delete their own comments"
  on comments for delete
  using (auth.uid() = user_id);
```

### 6. likes
```sql
create table likes (
  id uuid primary key default uuid_generate_v4(),
  post_id uuid references posts(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  created_at timestamp with time zone default now(),
  unique(post_id, user_id)
);

-- Set up Row Level Security (RLS)
alter table likes enable row level security;

-- Create policies
create policy "Likes are viewable by everyone"
  on likes for select
  using (true);

create policy "Users can like"
  on likes for insert
  with check (auth.uid() = user_id);

create policy "Users can remove likes"
  on likes for delete
  using (auth.uid() = user_id);
```

## Storage Buckets

Create the following storage buckets:

1. **service_media**: For storing service images and videos
2. **post_media**: For storing post images and videos

### Storage Bucket Policies

For the service_media bucket:

```sql
-- Anyone can view service media
CREATE POLICY "Service media are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'service_media');

-- Only service providers can insert their own media
CREATE POLICY "Service providers can upload service media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'service_media' AND
  auth.uid() IN (
    SELECT user_id FROM service_providers WHERE approval_status = 'approved'
  )
);

-- Service providers can update their own media
CREATE POLICY "Service providers can update their service media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'service_media' AND
  auth.uid() IN (
    SELECT user_id FROM service_providers
  )
);
```

For the post_media bucket:

```sql
-- Anyone can view post media
CREATE POLICY "Post media are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'post_media');

-- Any authenticated user can upload post media
CREATE POLICY "Authenticated users can upload post media"
ON storage.objects FOR INSERT
WITH CHECK (
  bucket_id = 'post_media' AND
  auth.role() = 'authenticated'
);

-- Users can update their own media
CREATE POLICY "Users can update their own post media"
ON storage.objects FOR UPDATE
USING (
  bucket_id = 'post_media' AND
  auth.uid()::text = (storage.foldername(name))[1]
);
```

## Database Functions

Create helper functions for incrementing and decrementing counts:

```sql
CREATE OR REPLACE FUNCTION increment(row_count integer)
RETURNS integer AS $$
BEGIN
  RETURN row_count + 1;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION decrement(row_count integer)
RETURNS integer AS $$
BEGIN
  RETURN GREATEST(0, row_count - 1);
END;
$$ LANGUAGE plpgsql;
```

## Triggers

Create a trigger to update profile role when service provider application is approved:

```sql
CREATE OR REPLACE FUNCTION update_profile_role()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.approval_status = 'approved' AND OLD.approval_status != 'approved' THEN
    UPDATE profiles
    SET role = 'service_provider'
    WHERE id = NEW.user_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_role_on_approval
AFTER UPDATE ON service_providers
FOR EACH ROW
EXECUTE FUNCTION update_profile_role();
```

Create a trigger to update comment counts on posts:

```sql
CREATE OR REPLACE FUNCTION update_comment_count()
RETURNS TRIGGER AS $$
BEGIN
  IF (TG_OP = 'INSERT') THEN
    UPDATE posts
    SET comments = comments + 1
    WHERE id = NEW.post_id;
  ELSIF (TG_OP = 'DELETE') THEN
    UPDATE posts
    SET comments = GREATEST(0, comments - 1)
    WHERE id = OLD.post_id;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_comment_count_trigger
AFTER INSERT OR DELETE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_comment_count();
```

## Auth Setup

1. Enable email/password authentication in the Supabase dashboard.
2. Configure email templates for verification and password reset.
3. Set up appropriate redirect URLs for your app.

## API Security

1. Create a public API key with appropriate permissions.
2. Keep the API key secure within your app's environment variables.
3. Set up CORS configurations to allow only your app domains.

## Testing

After setting up, test the following:

1. User registration and login
2. Profile updates
3. Service provider application
4. Service creation and management
5. Post creation and interaction
6. Media uploads

This completes the Supabase setup for the Services App. Adjust the policies and configurations as needed based on your specific requirements. 