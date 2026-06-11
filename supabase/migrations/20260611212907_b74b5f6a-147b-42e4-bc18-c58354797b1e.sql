
-- Make state column nullable in cities table
ALTER TABLE public.cities ALTER COLUMN state DROP NOT NULL;

-- Update the handle_new_user function to be more robust
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_city_id UUID;
    v_city_name TEXT;
    v_role TEXT;
    v_full_name TEXT;
BEGIN
    -- Extract info from metadata
    v_city_name := NEW.raw_user_meta_data->>'city';
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'seller');
    v_full_name := NEW.raw_user_meta_data->>'name';

    -- Handle city creation/lookup for sellers
    IF v_role = 'seller' AND v_city_name IS NOT NULL AND v_city_name <> '' THEN
        -- Try to find existing city by name (case insensitive check)
        SELECT id INTO v_city_id FROM public.cities WHERE LOWER(name) = LOWER(v_city_name) LIMIT 1;
        
        -- If not found, create new one
        IF v_city_id IS NULL THEN
            INSERT INTO public.cities (name, state)
            VALUES (v_city_name, NULL)
            RETURNING id INTO v_city_id;
        END IF;
    END IF;

    -- Create profile
    INSERT INTO public.profiles (id, name, role, city_id)
    VALUES (
        NEW.id,
        v_full_name,
        v_role,
        v_city_id
    );

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
