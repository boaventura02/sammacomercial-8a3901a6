import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

export const getAdminStats = createServerFn({ method: "GET" }).handler(async () => {
  // 1. Total cities with at least one seller
  const { data: activeCitiesData, error: activeCitiesError } = await supabase
    .from('profiles')
    .select('city_id')
    .eq('role', 'seller')
    .not('city_id', 'is', null);

  if (activeCitiesError) throw activeCitiesError;
  const activeCitiesCount = new Set(activeCitiesData.map(p => p.city_id)).size;

  // 2. Total companies
  const { count: totalCompanies, error: companiesCountError } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true });

  if (companiesCountError) throw companiesCountError;

  // 3. Total served companies
  const { count: servedCompanies, error: servedCompaniesError } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .or('samma_status.eq.already_client,won_by_seller.eq.true');

  if (servedCompaniesError) throw servedCompaniesError;

  const attendanceRate = totalCompanies ? (servedCompanies! / totalCompanies!) * 100 : 0;

  // 4. Companies by city for chart
  const { data: cityData, error: cityError } = await supabase
    .from('companies')
    .select('city_id, samma_status, won_by_seller, cities(name)');

  if (cityError) throw cityError;

  const cityMap: Record<string, { name: string; total: number; served: number }> = {};
  cityData.forEach(c => {
    const cityName = c.cities?.name || 'Desconhecido';
    if (!cityMap[cityName]) {
      cityMap[cityName] = { name: cityName, total: 0, served: 0 };
    }
    cityMap[cityName].total++;
    if (c.samma_status === 'already_client' || c.won_by_seller) {
      cityMap[cityName].served++;
    }
  });

  const chartData = Object.values(cityMap).sort((a, b) => b.total - a.total).slice(0, 10);

  // 5. Sellers list with stats
  const sevenDaysAgo = subDays(new Date(), 7).toISOString();
  
  const { data: sellers, error: sellersError } = await supabase
    .from('profiles')
    .select(`
      id,
      name,
      cities(name),
      companies(count),
      daily_activities(count)
    `)
    .eq('role', 'seller');

  if (sellersError) throw sellersError;

  // For the activity count in last 7 days, we need a separate query or better aggregation
  const { data: recentActivities, error: activitiesError } = await supabase
    .from('daily_activities')
    .select('seller_id')
    .gte('activity_date', sevenDaysAgo);

  if (activitiesError) throw activitiesError;

  const activityCounts: Record<string, number> = {};
  recentActivities.forEach(a => {
    activityCounts[a.seller_id] = (activityCounts[a.seller_id] || 0) + 1;
  });

  const sellersList = (sellers as any[]).map(s => ({
    id: s.id,
    name: s.name,
    city: s.cities?.name || 'N/A',
    companiesCount: s.companies?.[0]?.count || 0,
    recentActivities: activityCounts[s.id] || 0
  })).sort((a, b) => b.recentActivities - a.recentActivities);

  return {
    stats: {
      activeCities: activeCitiesCount,
      totalCompanies: totalCompanies || 0,
      servedCompanies: servedCompanies || 0,
      attendanceRate: Math.round(attendanceRate)
    },
    chartData,
    sellersList
  };
});
