-- Add password column to profiles table
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS password TEXT;
