CREATE POLICY "Admins can view all activity items" ON public.activity_items
FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);