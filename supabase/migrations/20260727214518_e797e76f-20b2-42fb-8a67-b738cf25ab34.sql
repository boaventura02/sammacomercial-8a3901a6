
-- 1. Add columns to daily_activities
ALTER TABLE public.daily_activities 
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'done' CHECK (status IN ('planned', 'done')),
ADD COLUMN IF NOT EXISTS due_date DATE;

-- Grant permissions (standard procedure for Lovable Cloud)
GRANT ALL ON public.daily_activities TO authenticated;
GRANT ALL ON public.daily_activities TO service_role;
