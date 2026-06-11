
-- Drop previous attempt to fix the linter issues if it exists
DROP FUNCTION IF EXISTS public.handle_new_user_registration() CASCADE;

-- Robust function to handle profile creation and city assignment
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
        INSERT INTO public.cities (name)
        VALUES (v_city_name)
        ON CONFLICT (name) DO UPDATE SET name = EXCLUDED.name
        RETURNING id INTO v_city_id;
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

-- Create trigger on auth.users
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Revoke public access to the function to satisfy linter
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM public;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM authenticated;
GRANT EXECUTE ON FUNCTION public.handle_new_user() TO service_role;
