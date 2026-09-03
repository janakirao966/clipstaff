-- Migration: Add Security Question Recovery Table & Functions
-- Allows password recovery without requiring external email SMTP infrastructure

-- 1. Create user_recovery table
CREATE TABLE IF NOT EXISTS public.user_recovery (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    security_question TEXT NOT NULL,
    security_answer_hash TEXT NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT now(),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.user_recovery ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view & update their own recovery info
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies WHERE tablename = 'user_recovery' AND policyname = 'Users can manage their own recovery info'
    ) THEN
        CREATE POLICY "Users can manage their own recovery info"
        ON public.user_recovery
        FOR ALL
        USING (auth.uid() = user_id)
        WITH CHECK (auth.uid() = user_id);
    END IF;
END $$;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_user_recovery_email ON public.user_recovery(lower(email));
CREATE INDEX IF NOT EXISTS idx_user_recovery_user_id ON public.user_recovery(user_id);

-- 2. Function to fetch security question for any email (SECURITY DEFINER, returns only question, NEVER the answer)
CREATE OR REPLACE FUNCTION public.get_user_security_question(p_email TEXT)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, pg_temp
AS $$
DECLARE
    v_question TEXT;
BEGIN
    SELECT security_question INTO v_question
    FROM public.user_recovery
    WHERE lower(email) = lower(trim(p_email))
    LIMIT 1;
    
    IF v_question IS NULL THEN
        -- Check auth.users user_metadata as fallback
        SELECT raw_user_meta_data->>'security_question' INTO v_question
        FROM auth.users
        WHERE lower(email) = lower(trim(p_email))
        LIMIT 1;
    END IF;

    RETURN v_question;
END;
$$;

-- Grant public execution on get_user_security_question
GRANT EXECUTE ON FUNCTION public.get_user_security_question(TEXT) TO anon, authenticated, service_role;

-- 3. Function to verify answer & reset password (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION public.reset_password_with_security_answer(
    p_email TEXT,
    p_answer TEXT,
    p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, auth, extensions, pg_temp
AS $$
DECLARE
    v_user_id UUID;
    v_stored_answer TEXT;
    v_clean_answer TEXT;
    v_clean_email TEXT;
BEGIN
    v_clean_email := lower(trim(p_email));
    v_clean_answer := lower(trim(p_answer));

    IF v_clean_email IS NULL OR v_clean_email = '' OR v_clean_answer IS NULL OR v_clean_answer = '' THEN
        RETURN jsonb_build_object('success', false, 'message', 'Email and answer are required');
    END IF;

    IF length(p_new_password) < 6 THEN
        RETURN jsonb_build_object('success', false, 'message', 'Password must be at least 6 characters');
    END IF;

    -- Check user_recovery table first
    SELECT user_id, security_answer_hash INTO v_user_id, v_stored_answer
    FROM public.user_recovery
    WHERE lower(email) = v_clean_email
    LIMIT 1;

    IF v_stored_answer IS NOT NULL AND lower(trim(v_stored_answer)) = v_clean_answer THEN
        -- Password update in auth.users
        UPDATE auth.users
        SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
            updated_at = now()
        WHERE id = v_user_id;

        RETURN jsonb_build_object('success', true, 'message', 'Password updated successfully');
    END IF;

    -- Fallback check user metadata
    SELECT id, raw_user_meta_data->>'security_answer' INTO v_user_id, v_stored_answer
    FROM auth.users
    WHERE lower(email) = v_clean_email
    LIMIT 1;

    IF v_stored_answer IS NOT NULL AND lower(trim(v_stored_answer)) = v_clean_answer THEN
        UPDATE auth.users
        SET encrypted_password = crypt(p_new_password, gen_salt('bf')),
            updated_at = now()
        WHERE id = v_user_id;

        RETURN jsonb_build_object('success', true, 'message', 'Password updated successfully');
    END IF;

    RETURN jsonb_build_object('success', false, 'message', 'Incorrect security answer. Please try again.');
END;
$$;

-- Grant public execution on reset_password_with_security_answer
GRANT EXECUTE ON FUNCTION public.reset_password_with_security_answer(TEXT, TEXT, TEXT) TO anon, authenticated, service_role;
