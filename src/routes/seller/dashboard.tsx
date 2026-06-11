import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Building2, Users } from 'lucide-react';

export const Route = createFileRoute('/seller/dashboard')({
  component: MyCityPage,
});

function MyCityPage() {
  const { profile } = useAuth();

  const { data: city, isLoading: loadingCity } = useQuery({
    queryKey: ['city', profile?.city_id],
    queryFn: async () => {
      if (!profile?.city_id) return null;
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('id', profile.city_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.city_id,
  });

  const { data: stats } = useQuery({
    queryKey: ['city-stats', profile?.city_id],
    queryFn: async () => {
      if (!profile?.city_id) return null;
      
      const { count: companiesCount } = await supabase
        .from('companies')
        .select('*', { count: 'exact', head: true })
        .eq('city_id', profile.city_id);

      const { count: contactsCount } = await supabase
        .from('contacts')
        .select('*', { count: 'exact', head: true })
        .eq('seller_id', profile.id);

      return {
        companies: companiesCount || 0,
        contacts: contactsCount || 0
      };
    },
    enabled: !!profile?.city_id && !!profile?.id,
  });

  if (loadingCity) {
    return <div className="p-8">Carregando informações da cidade...</div>;
  }

  if (!city) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8">
        <MapPin className="w-12 h-12 text-muted-foreground mb-4 opacity-20" />
        <h2 className="text-xl font-semibold">Cidade não vinculada</h2>
        <p className="text-muted-foreground">Seu perfil ainda não possui uma cidade de atuação cadastrada.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto">
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MapPin className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{city.name}</h1>
        </div>
        <p className="text-muted-foreground">Visão geral da sua região de atuação em {city.state || 'Estado não informado'}.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        <Card className="bg-card/40 backdrop-blur-md border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Empresas na Cidade</CardTitle>
            <Building2 className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.companies || 0}</div>
            <p className="text-xs text-muted-foreground">Cadastradas na sua região</p>
          </CardContent>
        </Card>

        <Card className="bg-card/40 backdrop-blur-md border-border/50">
          <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
            <CardTitle className="text-sm font-medium">Meus Contatos Realizados</CardTitle>
            <Users className="w-4 h-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats?.contacts || 0}</div>
            <p className="text-xs text-muted-foreground">Total de interações registradas</p>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-card/40 backdrop-blur-md border-border/50">
        <CardHeader>
          <CardTitle>Sobre a Região</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="prose prose-sm dark:prose-invert max-w-none">
            <p>
              Você está visualizando as informações da cidade de <strong>{city.name}</strong>. 
              Como vendedor responsável por esta área, você pode gerenciar empresas, 
              registrar contatos e acompanhar suas atividades diárias através do menu lateral.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
