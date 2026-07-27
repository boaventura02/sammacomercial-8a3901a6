import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ClipboardList, Filter, Calendar, MapPin, User, Building2, Search, Loader2 } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getAdminActivities, getFilterOptions } from '@/lib/admin.functions';
import { useState } from 'react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute('/admin/atividades')({
  component: AdminActivities,
});

function AdminActivities() {
  const [filters, setFilters] = useState({
    cityId: 'all',
    sellerId: 'all',
    period: '7d' as const
  });

  const { data: options } = useQuery({
    queryKey: ['filter-options'],
    queryFn: () => getFilterOptions(),
  });

  const { data: activities, isLoading } = useQuery({
    queryKey: ['admin-activities', filters],
    queryFn: () => getAdminActivities({ 
      data: {
        cityId: filters.cityId === 'all' ? undefined : filters.cityId,
        sellerId: filters.sellerId === 'all' ? undefined : filters.sellerId,
        period: filters.period
      }
    }),
  });

  return (
    <div className="space-y-8 animate-fade-in pb-10">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-white">Feed de Atividades</h1>
          <p className="text-muted-foreground">Monitore o trabalho de campo da equipe.</p>
        </div>
      </div>

      <Card className="bg-card/50 backdrop-blur-sm border-border/50">
        <CardContent className="p-4 md:p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <MapPin className="h-3 w-3" /> Cidade
              </label>
              <Select value={filters.cityId} onValueChange={(v) => setFilters(f => ({ ...f, cityId: v }))}>
                <SelectTrigger className="bg-white/5 border-border/50">
                  <SelectValue placeholder="Todas as cidades" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as cidades</SelectItem>
                  {options?.cities.map(city => (
                    <SelectItem key={city.id} value={city.id}>{city.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <User className="h-3 w-3" /> Vendedor
              </label>
              <Select value={filters.sellerId} onValueChange={(v) => setFilters(f => ({ ...f, sellerId: v }))}>
                <SelectTrigger className="bg-white/5 border-border/50">
                  <SelectValue placeholder="Todos os vendedores" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos os vendedores</SelectItem>
                  {options?.sellers.map(seller => (
                    <SelectItem key={seller.id} value={seller.id}>{seller.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-muted-foreground uppercase tracking-widest flex items-center gap-2">
                <Calendar className="h-3 w-3" /> Período
              </label>
              <Select value={filters.period} onValueChange={(v: any) => setFilters(f => ({ ...f, period: v }))}>
                <SelectTrigger className="bg-white/5 border-border/50">
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Hoje</SelectItem>
                  <SelectItem value="7d">Últimos 7 dias</SelectItem>
                  <SelectItem value="30d">Últimos 30 dias</SelectItem>
                  <SelectItem value="all">Todo o período</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : (
        <div className="space-y-6">
          {activities?.map((activity: any, i) => (
            <Card 
              key={activity.id} 
              className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all animate-fade-up overflow-hidden"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <CardHeader className="bg-white/5 pb-4">
                <div className="flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold border border-primary/20">
                      {activity.profiles?.name?.charAt(0)}
                    </div>
                    <div>
                      <p className="font-bold text-white leading-tight">{activity.profiles?.name}</p>
                      <p className="text-xs text-muted-foreground flex items-center gap-1">
                        <MapPin className="h-3 w-3" />
                        {activity.profiles?.cities?.name}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="text-sm font-bold text-white">
                        {format(new Date(activity.activity_date), "dd/MM/yyyy")}
                      </p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-tighter">
                        {format(new Date(activity.activity_date), "EEEE", { locale: ptBR })}
                      </p>
                    </div>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold uppercase text-[10px]">
                      {activity.activity_types[0]}
                    </Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground leading-relaxed mb-6">
                  {activity.description}
                </p>
                
                {activity.activity_items && activity.activity_items.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Itens da Atividade</h4>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {activity.activity_items.map((item: any) => (
                        <div key={item.id} className="p-3 rounded-xl bg-white/5 border border-white/10 flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="text-[10px] font-bold text-primary uppercase">{item.type}</span>
                            {item.companies && (
                              <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
                                <Building2 className="h-3 w-3" />
                                {item.companies.name}
                              </div>
                            )}
                          </div>
                          {item.other_description && (
                            <p className="text-xs text-white/80 line-clamp-2">{item.other_description}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
          
          {activities?.length === 0 && (
            <div className="text-center py-20 bg-card/50 rounded-2xl border border-dashed border-border/50">
              <ClipboardList className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
              <p className="text-muted-foreground">Nenhuma atividade encontrada com estes filtros.</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}