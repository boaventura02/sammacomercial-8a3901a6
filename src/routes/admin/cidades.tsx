import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Users, Building2, CheckCircle2, Loader2, ArrowLeft } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { getCitiesAdminData, getCitySellers } from '@/lib/admin.functions';
import { Progress } from "@/components/ui/progress";
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";

export const Route = createFileRoute('/admin/cidades')({
  component: AdminCities,
});

function AdminCities() {
  const [selectedCity, setSelectedCity] = useState<{ id: string, name: string } | null>(null);

  const { data: cities, isLoading, error } = useQuery({
    queryKey: ['admin-cities'],
    queryFn: () => getCitiesAdminData(),
  });

  const { data: citySellers, isLoading: isLoadingSellers } = useQuery({
    queryKey: ['city-sellers', selectedCity?.id],
    queryFn: () => getCitySellers(selectedCity!.id),
    enabled: !!selectedCity,
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
        <h1 className="text-3xl font-bold tracking-tight text-white">Cidades</h1>
        <p className="text-muted-foreground">Gestão e cobertura por região.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {cities?.map((city, i) => (
          <Card 
            key={city.id} 
            className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/40 transition-all cursor-pointer group animate-fade-up overflow-hidden"
            style={{ animationDelay: `${i * 0.05}s` }}
            onClick={() => setSelectedCity({ id: city.id, name: city.name })}
          >
            <CardHeader className="bg-primary/5 pb-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
                  <MapPin className="h-5 w-5 text-primary" />
                  {city.name}
                </CardTitle>
                <div className="text-primary font-bold text-sm bg-primary/10 px-2 py-1 rounded">
                  {city.coverage}% Cobertura
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="grid grid-cols-3 gap-2 text-center">
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Vendedores</p>
                  <div className="flex items-center justify-center gap-1 text-white font-semibold">
                    <Users className="h-3 w-3 text-blue-400" />
                    {city.sellersCount}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Empresas</p>
                  <div className="flex items-center justify-center gap-1 text-white font-semibold">
                    <Building2 className="h-3 w-3 text-purple-400" />
                    {city.totalCompanies}
                  </div>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Atendidas</p>
                  <div className="flex items-center justify-center gap-1 text-white font-semibold">
                    <CheckCircle2 className="h-3 w-3 text-emerald-400" />
                    {city.servedCompanies}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <div className="flex justify-between text-[10px] text-muted-foreground uppercase tracking-widest">
                  <span>Taxa de Atendimento</span>
                  <span>{city.servedCompanies}/{city.totalCompanies}</span>
                </div>
                <Progress value={city.coverage} className="h-1.5 bg-white/5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Sheet open={!!selectedCity} onOpenChange={(open) => !open && setSelectedCity(null)}>
        <SheetContent side="right" className="bg-card border-l border-border/50 w-full sm:max-w-md overflow-y-auto">
          <SheetHeader className="mb-8">
            <SheetTitle className="text-2xl font-bold flex items-center gap-2">
              <MapPin className="text-primary" />
              {selectedCity?.name}
            </SheetTitle>
            <SheetDescription>
              Vendedores responsáveis por esta cidade.
            </SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            {isLoadingSellers ? (
              <div className="py-8 flex justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : citySellers && citySellers.length > 0 ? (
              citySellers.map((seller) => (
                <div key={seller.id} className="flex items-center gap-4 p-4 rounded-xl bg-white/5 border border-white/10 hover:border-primary/30 transition-colors">
                  <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">
                    {seller.name.charAt(0)}
                  </div>
                  <div>
                    <p className="font-semibold text-white">{seller.name}</p>
                    <p className="text-xs text-muted-foreground">Vendedor Ativo</p>
                  </div>
                </div>
              ))
            ) : (
              <div className="py-12 text-center text-muted-foreground italic">
                Nenhum vendedor registrado nesta cidade.
              </div>
            )}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}