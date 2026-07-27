import { createServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { subDays } from "date-fns";

export const getAdminStats = createServerFn({ method: "GET" }).handler(async () => {
  const { data: activeCitiesData, error: activeCitiesError } = await supabase
    .from('profiles')
    .select('city_id')
    .eq('role', 'seller')
    .not('city_id', 'is', null);

  if (activeCitiesError) throw activeCitiesError;
  const activeCitiesCount = new Set(activeCitiesData.map(p => p.city_id)).size;

  const { count: totalCompanies, error: companiesCountError } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true });

  if (companiesCountError) throw companiesCountError;

  const { count: servedCompanies, error: servedCompaniesError } = await supabase
    .from('companies')
    .select('*', { count: 'exact', head: true })
    .or('samma_status.eq.already_client,won_by_seller.eq.true');

  if (servedCompaniesError) throw servedCompaniesError;

  const attendanceRate = totalCompanies ? (servedCompanies! / totalCompanies!) * 100 : 0;

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

export const getCitiesAdminData = createServerFn({ method: "GET" }).handler(async () => {
  const { data: cities, error: citiesError } = await supabase
    .from('cities')
    .select(`
      id,
      name,
      profiles(id, role),
      companies(id, samma_status, won_by_seller)
    `);

  if (citiesError) throw citiesError;

  return cities.map(city => {
    const sellersCount = city.profiles.filter(p => p.role === 'seller').length;
    const totalCompanies = city.companies.length;
    const servedCompanies = city.companies.filter(c => c.samma_status === 'already_client' || c.won_by_seller).length;
    const coverage = totalCompanies ? (servedCompanies / totalCompanies) * 100 : 0;

    return {
      id: city.id,
      name: city.name,
      sellersCount,
      totalCompanies,
      servedCompanies,
      coverage: Math.round(coverage)
    };
  }).sort((a, b) => b.totalCompanies - a.totalCompanies);
});

export const getSellersAdminData = createServerFn({ method: "GET" }).handler(async () => {
  const sevenDaysAgo = subDays(new Date(), 7).toISOString();
  
  const { data: sellers, error: sellersError } = await supabase
    .from('profiles')
    .select(`
      id,
      name,
      role,
      city_id,
      cities(name),
      companies(count),
      daily_activities(
        id,
        activity_date,
        description,
        activity_types,
        activity_items(
          id,
          type,
          other_description
        )
      )
    `)
    .eq('role', 'seller');

  if (sellersError) throw sellersError;

  const sellersWithStats = sellers.map(seller => {
    const recentActivities = seller.daily_activities.filter(a => a.activity_date >= sevenDaysAgo);
    const lastActivity = seller.daily_activities.length > 0 
      ? seller.daily_activities.sort((a, b) => new Date(b.activity_date).getTime() - new Date(a.activity_date).getTime())[0].activity_date
      : null;

    return {
      id: seller.id,
      name: seller.name,
      city: (seller as any).cities?.name || 'N/A',
      cityId: seller.city_id,
      companiesCount: (seller as any).companies?.[0]?.count || 0,
      recentActivitiesCount: recentActivities.length,
      lastActivityDate: lastActivity
    };
  }).sort((a, b) => b.recentActivitiesCount - a.recentActivitiesCount);

  return sellersWithStats;
});

export const getSellerDetails = createServerFn({ method: "GET" })
  .validator((id: string) => id)
  .handler(async ({ data: id }) => {
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', id)
      .single();

    if (profileError) throw profileError;

    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('*')
      .eq('seller_id', id);

    if (companiesError) throw companiesError;

    const { data: activities, error: activitiesError } = await supabase
      .from('daily_activities')
      .select('*, activity_items(*)')
      .eq('seller_id', id)
      .order('activity_date', { ascending: false })
      .limit(10);

    if (activitiesError) throw activitiesError;

    return {
      name: profile.name,
      companies,
      activities
    };
  });

export const getCitySellers = createServerFn({ method: "GET" })
  .validator((cityId: string) => cityId)
  .handler(async ({ data: cityId }) => {
    const { data: sellers, error: sellersError } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('city_id', cityId)
      .eq('role', 'seller');

    if (sellersError) throw sellersError;
    return sellers;
  });

export const getAdminActivities = createServerFn({ method: "GET" })
  .validator((filters: { cityId?: string; sellerId?: string; period?: 'today' | '7d' | '30d' | 'all' }) => filters)
  .handler(async ({ data: filters }) => {
    let query = supabase
      .from('daily_activities')
      .select(`
        *,
        profiles(name, city_id, cities(name)),
        activity_items(
          *,
          companies(name)
        )
      `)
      .order('activity_date', { ascending: false });

    if (filters.cityId) {
      query = query.eq('city_id', filters.cityId);
    }
    if (filters.sellerId) {
      query = query.eq('seller_id', filters.sellerId);
    }

    const now = new Date();
    if (filters.period === 'today') {
      const startOfDay = new Date(now.setHours(0, 0, 0, 0)).toISOString();
      query = query.gte('activity_date', startOfDay);
    } else if (filters.period === '7d') {
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      query = query.gte('activity_date', sevenDaysAgo);
    } else if (filters.period === '30d') {
      const thirtyDaysAgo = subDays(new Date(), 30).toISOString();
      query = query.gte('activity_date', thirtyDaysAgo);
    }

    const { data, error } = await query;
    if (error) throw error;
    return data;
  });

export const getAdminAlerts = createServerFn({ method: "GET" }).handler(async () => {
  const thirtyDaysFromNow = new Date();
  thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
  
  // 1. Expiring contracts
  const { data: expiringContracts, error: contractsError } = await supabase
    .from('companies')
    .select('*, profiles(name), cities(name)')
    .neq('samma_status', 'already_client')
    .not('contract_end_date', 'is', null)
    .lte('contract_end_date', thirtyDaysFromNow.toISOString())
    .order('contract_end_date', { ascending: true });

  if (contractsError) throw contractsError;

  // 2. Inactive sellers (no activity in last 3 days)
  const threeDaysAgo = subDays(new Date(), 3).toISOString();
  
  const { data: allSellers, error: sellersError } = await supabase
    .from('profiles')
    .select('id, name, cities(name)')
    .eq('role', 'seller');

  if (sellersError) throw sellersError;

  const { data: recentActivities, error: activitiesError } = await supabase
    .from('daily_activities')
    .select('seller_id')
    .gte('activity_date', threeDaysAgo);

  if (activitiesError) throw activitiesError;

  const activeSellerIds = new Set(recentActivities.map(a => a.seller_id));
  const inactiveSellers = allSellers.filter(s => !activeSellerIds.has(s.id));

  return {
    expiringContracts,
    inactiveSellers
  };
});

export const getFilterOptions = createServerFn({ method: "GET" }).handler(async () => {
  const { data: cities } = await supabase.from('cities').select('id, name');
  const { data: sellers } = await supabase.from('profiles').select('id, name').eq('role', 'seller');
  
  return {
    cities: cities || [],
    sellers: sellers || []
  };
});
