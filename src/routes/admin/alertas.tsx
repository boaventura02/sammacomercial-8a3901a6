import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertTriangle, Clock, UserX, Calendar, MapPin, User, Building2, Loader2, ArrowRight } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getAdminAlerts } from '@/lib/admin.functions';
import { format, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const Route = createFileRoute('/admin/alertas')({
  component: AdminAlerts,
});

function AdminAlerts() {
  const { data, isLoading } = useQuery({
    queryKey: ['admin-alerts'],
    queryFn: () => getAdminAlerts(),
  });

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-12 animate-fade-in pb-20">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white flex items-center gap-3">
          <AlertTriangle className="h-8 w-8 text-amber-500" />
          Central de Alertas
        </h1>
        <p className="text-muted-foreground">Monitoramento de prazos críticos e inatividade.</p>
      </div>

      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b border-border/50 pb-2">
          <Clock className="h-5 w-5 text-rose-500" />
          <h2 className="text-xl font-bold text-white">Contratos Próximos ao Vencimento</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.expiringContracts.map((company: any, i: number) => {
            const daysLeft = Math.ceil((new Date(company.contract_end_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24));
            const isUrgent = daysLeft <= 7;

            return (
              <Card 
                key={company.id} 
                className={cn(
                  "bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/30 transition-all animate-fade-up overflow-hidden",
                  isUrgent && "border-rose-500/50 shadow-[0_0_20px_rgba(244,63,94,0.1)]"
                )}
                style={{ animationDelay: `${i * 0.05}s` }}
              >
                <div className={cn("h-1 w-full", isUrgent ? "bg-rose-500" : "bg-amber-500")} />
                <CardHeader className="pb-2">
                  <div className="flex justify-between items-start">
                    <Badge variant="outline" className={cn(
                      "text-[10px] font-bold uppercase border-none px-2 py-0.5",
                      isUrgent ? "bg-rose-500/20 text-rose-400" : "bg-amber-500/20 text-amber-400"
                    )}>
                      Vence em {daysLeft} dias
                    </Badge>
                    <Building2 className="h-4 w-4 text-muted-foreground" />
                  </div>
                  <CardTitle className="text-lg font-bold text-white mt-2 leading-tight">
                    {company.name}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 pt-2">
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      <span>{company.cities?.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground">
                      <User className="h-3.5 w-3.5" />
                      <span>Resp: {company.profiles?.name}</span>
                    </div>
                    <div className="flex items-center gap-2 text-muted-foreground font-medium">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Fim: {format(new Date(company.contract_end_date), "dd 'de' MMMM", { locale: ptBR })}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
          
          {data?.expiringContracts.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-white/5 rounded-2xl border border-dashed border-border/50">
              Nenhum contrato vencendo nos próximos 30 dias.
            </div>
          )}
        </div>
      </section>

      <section className="space-y-6">
        <div className="flex items-center gap-2 border-b border-border/50 pb-2">
          <UserX className="h-5 w-5 text-amber-500" />
          <h2 className="text-xl font-bold text-white">Vendedores Inativos (3 dias+)</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {data?.inactiveSellers.map((seller: any, i: number) => (
            <Card 
              key={seller.id} 
              className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-amber-500/30 transition-all animate-fade-up overflow-hidden"
              style={{ animationDelay: `${i * 0.05}s` }}
            >
              <CardContent className="p-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center text-amber-500 text-xl font-bold border border-amber-500/30">
                    {seller.name.charAt(0)}
                  </div>
                  <div className="flex-1">
                    <h3 className="font-bold text-white">{seller.name}</h3>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground mt-1">
                      <MapPin className="h-3 w-3" />
                      {seller.cities?.name}
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-amber-500/10 text-amber-500 border-amber-500/20 font-bold">
                    INATIVO
                  </Badge>
                </div>
                <div className="mt-4 flex items-center justify-between text-xs text-muted-foreground bg-white/5 p-2 rounded-lg">
                  <span>Sem atividade recente</span>
                  <span className="text-amber-400 font-medium">+72h</span>
                </div>
              </CardContent>
            </Card>
          ))}

          {data?.inactiveSellers.length === 0 && (
            <div className="col-span-full py-12 text-center text-muted-foreground bg-white/5 rounded-2xl border border-dashed border-border/50">
              Toda a equipe está ativa e produzindo.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}