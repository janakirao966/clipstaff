-- Add missing fields to profiles table to align local migrations with production database
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS professional_subtitle TEXT,
ADD COLUMN IF NOT EXISTS experience JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS education JSONB DEFAULT '[]'::jsonb,
ADD COLUMN IF NOT EXISTS certifications TEXT[] DEFAULT '{}'::text[];
