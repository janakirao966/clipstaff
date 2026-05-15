-- Create profiles table
CREATE TABLE public.profiles (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    linkedin_url TEXT,
    portfolio_url TEXT,
    location TEXT,
    visa_status TEXT,
    notice_period TEXT,
    is_active BOOLEAN DEFAULT false,
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Create snippets table
CREATE TABLE public.snippets (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    shortcut TEXT NOT NULL,
    text TEXT NOT NULL,
    category TEXT DEFAULT 'General',
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, shortcut)
);

-- Enable RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.snippets ENABLE ROW LEVEL SECURITY;

-- Profiles Policies
CREATE POLICY "Users can create their own profiles"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own profiles"
ON public.profiles FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own profiles"
ON public.profiles FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own profiles"
ON public.profiles FOR DELETE
USING (auth.uid() = user_id);

-- Snippets Policies
CREATE POLICY "Users can create their own snippets"
ON public.snippets FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own snippets"
ON public.snippets FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own snippets"
ON public.snippets FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own snippets"
ON public.snippets FOR DELETE
USING (auth.uid() = user_id);

-- Indexes
CREATE INDEX idx_profiles_user_id ON public.profiles(user_id);
CREATE INDEX idx_profiles_is_active ON public.profiles(is_active);
CREATE INDEX idx_snippets_user_id ON public.snippets(user_id);
CREATE INDEX idx_snippets_shortcut ON public.snippets(shortcut);

-- Function to handle updated_at
CREATE OR REPLACE FUNCTION handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for profiles
CREATE TRIGGER trigger_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW
    EXECUTE PROCEDURE handle_updated_at();
