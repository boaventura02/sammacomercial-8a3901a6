
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    v_city_id UUID;
    v_city_name TEXT;
    v_role TEXT;
    v_full_name TEXT;
BEGIN
    -- Extract info from metadata with fallbacks
    v_city_name := NEW.raw_user_meta_data->>'city';
    v_role := COALESCE(NEW.raw_user_meta_data->>'role', 'seller');
    v_full_name := COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1));

    -- Handle city creation/lookup for sellers
    IF v_role = 'seller' AND v_city_name IS NOT NULL AND v_city_name <> '' THEN
        -- Try to find existing city by name (case insensitive check)
        SELECT id INTO v_city_id FROM public.cities WHERE LOWER(name) = LOWER(v_city_name) LIMIT 1;
        
        -- If not found, create new one
        IF v_city_id IS NULL THEN
            INSERT INTO public.cities (name, state)
            VALUES (v_city_name, NULL)
            ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name -- Just in case of race conditions
            RETURNING id INTO v_city_id;
        END IF;
    END IF;

    -- Create profile with conflict handling
    INSERT INTO public.profiles (id, name, role, city_id)
    VALUES (
        NEW.id,
        v_full_name,
        v_role,
        v_city_id
    )
    ON CONFLICT (id) DO UPDATE SET
        name = EXCLUDED.name,
        role = EXCLUDED.role,
        city_id = EXCLUDED.city_id,
        updated_at = now();

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
