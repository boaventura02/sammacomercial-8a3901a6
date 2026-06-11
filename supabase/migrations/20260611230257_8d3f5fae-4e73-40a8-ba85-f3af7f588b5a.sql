-- Update daily_activities table
ALTER TABLE public.daily_activities ADD COLUMN IF NOT EXISTS general_notes TEXT;
ALTER TABLE public.daily_activities ADD COLUMN IF NOT EXISTS photo_url TEXT;

-- Create activity_items table
CREATE TABLE IF NOT EXISTS public.activity_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    daily_activity_id UUID NOT NULL REFERENCES public.daily_activities(id) ON DELETE CASCADE,
    type TEXT NOT NULL CHECK (type IN ('visit', 'call', 'negotiation', 'contract_expiring', 'new_company', 'other')),
    company_id UUID REFERENCES public.companies(id),
    negotiation_status TEXT,
    contract_status TEXT,
    other_description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Grant permissions
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_items TO authenticated;
GRANT ALL ON public.activity_items TO service_role;

-- Enable RLS
ALTER TABLE public.activity_items ENABLE ROW LEVEL SECURITY;

-- RLS Policies for daily_activities (ensure they exist and are correct)
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE tablename = 'daily_activities' AND policyname = 'Sellers can manage their own activities'
    ) THEN
        CREATE POLICY "Sellers can manage their own activities" ON public.daily_activities
            FOR ALL USING (auth.uid() = seller_id) WITH CHECK (auth.uid() = seller_id);
    END IF;
END $$;

-- RLS Policies for activity_items
CREATE POLICY "Sellers can manage their own activity items" ON public.activity_items
    FOR ALL USING (
        EXISTS (
            SELECT 1 FROM public.daily_activities 
            WHERE id = activity_items.daily_activity_id AND seller_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.daily_activities 
            WHERE id = activity_items.daily_activity_id AND seller_id = auth.uid()
        )
    );
