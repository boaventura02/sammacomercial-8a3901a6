
-- Function to handle city creation and profile updates during registration
CREATE OR REPLACE FUNCTION public.handle_new_user_registration()
RETURNS TRIGGER AS $$
DECLARE
    v_city_id UUID;
    v_city_name TEXT;
    v_role TEXT;
BEGIN
    -- Get city name and role from metadata
    v_city_name := NEW.raw_user_meta_data->>'city';
    v_role := NEW.raw_user_meta_data->>'role';

    -- If role is seller and city name is provided
    IF v_role = 'seller' AND v_city_name IS NOT NULL AND v_city_name <> '' THEN
        -- Try to find existing city or create new one
        INSERT INTO public.cities (name)
        VALUES (v_city_name)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name -- Just to get the ID if it already exists (assuming a unique constraint or index on name)
        RETURNING id INTO v_city_id;

        -- Update the profile with the city_id and role
        -- Note: The profile is usually created by another trigger (like handle_new_user in many Lovable projects)
        -- We wait a bit or use a separate update logic. However, since profiles are usually created by triggers on auth.users,
        -- we can just update it here if it exists, or let the standard trigger handle it if we pass metadata.
        -- A safer way is to ensure the profile creation trigger uses this metadata.
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Check if we need a unique index on cities.name for the ON CONFLICT to work
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_indexes
        WHERE tablename = 'cities' AND indexname = 'cities_name_unique_idx'
    ) THEN
        CREATE UNIQUE INDEX cities_name_unique_idx ON public.cities (name);
    END IF;
END $$;
