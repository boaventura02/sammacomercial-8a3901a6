import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, eachDayOfInterval, format, isSameDay, isSameMonth } from "date-fns";
import { z } from "zod";

export const getSellerAgenda = createServerFn({ method: "GET" })
  .validator((data: { sellerId: string; month: string }) => data)
  .handler(async ({ data: { sellerId, month } }) => {
    const start = startOfMonth(new Date(month));
    const end = endOfMonth(new Date(month));

    // We fetch activities where either activity_date or due_date falls within the month
    // Plus a buffer for the week view if needed, but the client can filter.
    const { data, error } = await supabase
      .from('daily_activities')
      .select(`
        *,
        activity_items(
          *,
          companies(name)
        )
      `)
      .eq('seller_id', sellerId)
      .or(`activity_date.gte.${start.toISOString()},due_date.gte.${start.toISOString()}`)
      .or(`activity_date.lte.${end.toISOString()},due_date.lte.${end.toISOString()}`);

    if (error) throw error;
    return data || [];
  });

export const toggleActivityStatus = createServerFn({ method: "POST" })
  .validator((data: { activityId: string; status: 'planned' | 'done' }) => data)
  .handler(async ({ data: { activityId, status } }) => {
    const update: any = { status };
    
    // If marking as done, we might want to set activity_date to today if it was planned
    if (status === 'done') {
      update.activity_date = new Date().toISOString().split('T')[0];
    }

    const { data, error } = await supabase
      .from('daily_activities')
      .update(update)
      .eq('id', activityId)
      .select()
      .single();

    if (error) throw error;
    return data;
  });
