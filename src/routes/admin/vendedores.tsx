import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, MapPin, Building2, Calendar, ClipboardList, Loader2, Search } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getSellersAdminData, getSellerDetails } from '@/lib/admin.functions';
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useState } from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute('/admin/vendedores')({
  component: AdminSellers,
});

function AdminSellers() {
  const [selectedSellerId, setSelectedSellerId] = useState<string | null>(null);

  const { data: sellers, isLoading } = useQuery({
    queryKey: ['admin-sellers'],
    queryFn: () => getSellersAdminData(),
  });

  const { data: sellerDetails, isLoading: isLoadingDetails } = useQuery({
    queryKey: ['seller-details', selectedSellerId],
    queryFn: () => getSellerDetails(selectedSellerId!),
    enabled: !!selectedSellerId,
  });

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Vendedores</h1>
        <p className="text-muted-foreground">Performance e atividade recente da equipe.</p>
      </div>

      <div className="grid grid-cols-1 gap-4">
        <div className="overflow-hidden rounded-2xl border border-border/50 bg-card/50 backdrop-blur-sm shadow-xl">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-border/50 bg-white/5 text-muted-foreground text-xs uppercase tracking-widest">
                <th className="px-6 py-4 font-semibold">Vendedor</th>
                <th className="px-6 py-4 font-semibold">Cidade</th>
                <th className="px-6 py-4 font-semibold text-center">Empresas</th>
                <th className="px-6 py-4 font-semibold text-center">Atividades (7d)</th>
                <th className="px-6 py-4 font-semibold text-right">Última Atividade</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30">
              {sellers?.map((seller) => (
                <tr 
                  key={seller.id} 
                  className="group hover:bg-white/5 cursor-pointer transition-colors"
                  onClick={() => setSelectedSellerId(seller.id)}
                >
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold border border-primary/20">
                        {seller.name.charAt(0)}
                      </div>
                      <span className="font-semibold text-white group-hover:text-primary transition-colors">{seller.name}</span>
                    </div>
                  </td>
                  <td className="px-6 py-5">
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <MapPin className="h-3.5 w-3.5" />
                      {seller.city}
                    </div>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <Badge variant="secondary" className="bg-purple-500/10 text-purple-400 border-none font-bold">
                      {seller.companiesCount}
                    </Badge>
                  </td>
                  <td className="px-6 py-5 text-center">
                    <span className={cn(
                      "inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-bold",
                      seller.recentActivitiesCount > 5 ? "bg-emerald-500/20 text-emerald-400" : 
                      seller.recentActivitiesCount > 0 ? "bg-amber-500/20 text-amber-400" : 
                      "bg-slate-500/10 text-slate-400"
                    )}>
                      {seller.recentActivitiesCount}
                    </span>
                  </td>
                  <td className="px-6 py-5 text-right text-sm text-muted-foreground">
                    {seller.lastActivityDate ? (
                      format(new Date(seller.lastActivityDate), "dd 'de' MMM", { locale: ptBR })
                    ) : (
                      "Nunca"
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={!!selectedSellerId} onOpenChange={(open) => !open && setSelectedSellerId(null)}>
        <SheetContent side="right" className="bg-card border-l border-border/50 w-full sm:max-w-2xl overflow-y-auto">
          <SheetHeader className="mb-8">
            <div className="flex items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-primary/20 flex items-center justify-center text-primary text-xl font-bold border-2 border-primary/30">
                {sellerDetails?.name.charAt(0)}
              </div>
              <div>
                <SheetTitle className="text-2xl font-bold">{sellerDetails?.name}</SheetTitle>
                <SheetDescription>Detalhamento de empresas e atividades.</SheetDescription>
              </div>
            </div>
          </SheetHeader>

          {isLoadingDetails ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <div className="space-y-8 pb-10">
              <section>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <Building2 className="h-5 w-5 text-primary" />
                  Empresas Cadastradas ({sellerDetails?.companies.length})
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {sellerDetails?.companies.map((company: any) => (
                    <div key={company.id} className="p-3 rounded-xl bg-white/5 border border-white/10">
                      <p className="font-medium text-white text-sm truncate">{company.name}</p>
                      <p className="text-[10px] text-muted-foreground uppercase tracking-wider mt-1">{company.samma_status}</p>
                    </div>
                  ))}
                  {sellerDetails?.companies.length === 0 && (
                    <p className="text-muted-foreground italic text-sm py-4">Nenhuma empresa cadastrada.</p>
                  )}
                </div>
              </section>

              <Separator className="bg-border/30" />

              <section>
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <ClipboardList className="h-5 w-5 text-primary" />
                  Atividades Recentes
                </h3>
                <div className="space-y-4">
                  {sellerDetails?.activities.map((activity: any) => (
                    <div key={activity.id} className="p-4 rounded-xl bg-white/5 border border-white/10 space-y-3">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-2 text-primary">
                          <Calendar className="h-4 w-4" />
                          <span className="text-sm font-bold">
                            {format(new Date(activity.activity_date), "dd/MM/yyyy")}
                          </span>
                        </div>
                        <Badge variant="outline" className="border-primary/30 text-primary">
                          {activity.activity_types[0]}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{activity.description}</p>
                      {activity.activity_items && activity.activity_items.length > 0 && (
                        <div className="flex flex-wrap gap-2 pt-1">
                          {activity.activity_items.map((item: any) => (
                            <span key={item.id} className="text-[10px] bg-primary/10 text-primary px-2 py-0.5 rounded-full border border-primary/20">
                              {item.type}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                  {sellerDetails?.activities.length === 0 && (
                    <p className="text-muted-foreground italic text-sm py-4">Nenhuma atividade registrada.</p>
                  )}
                </div>
              </section>
            </div>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
}