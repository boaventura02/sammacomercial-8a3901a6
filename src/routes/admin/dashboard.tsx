import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, MapPin, Users, CheckCircle2, Loader2, TrendingUp } from 'lucide-react';
import { cn } from "@/lib/utils";
import { useQuery } from '@tanstack/react-query';
import { getAdminStats } from '@/lib/admin.functions';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer
} from 'recharts';

export const Route = createFileRoute('/admin/dashboard')({
  component: AdminDashboard,
});

function AdminDashboard() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: () => getAdminStats(),
  });

  if (isLoading) {
    return (
      <div className="flex h-[80vh] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-8 text-center text-destructive">
        Erro ao carregar dados do dashboard. Por favor, tente novamente.
      </div>
    );
  }

  const stats = [
    { label: "Cidades Ativas", value: data?.stats.activeCities.toString() || "0", icon: MapPin, color: "text-blue-400" },
    { label: "Empresas Cadastradas", value: data?.stats.totalCompanies.toString() || "0", icon: Building2, color: "text-purple-400" },
    { label: "Atendidas pela SAMMA", value: data?.stats.servedCompanies.toString() || "0", icon: CheckCircle2, color: "text-primary" },
    { label: "Taxa de Atendimento", value: `${data?.stats.attendanceRate}%`, icon: TrendingUp, color: "text-yellow-400" },
  ];

  return (
    <div className="space-y-8 animate-fade-in">
      <div>
        <h1 className="text-3xl font-bold tracking-tight text-white">Visão Geral</h1>
        <p className="text-muted-foreground">Monitoramento em tempo real da operação SAMMA.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={stat.label} className="bg-card/50 backdrop-blur-sm border-border/50 hover:border-primary/40 transition-all animate-fade-up shadow-lg" style={{ animationDelay: `${i * 0.1}s` }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight text-white">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">Atendimento por Cidade</CardTitle>
          </CardHeader>
          <CardContent className="h-[400px] w-full pt-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" vertical={false} />
                <XAxis 
                  dataKey="name" 
                  stroke="#888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                />
                <YAxis 
                  stroke="#888" 
                  fontSize={12} 
                  tickLine={false} 
                  axisLine={false}
                  tickFormatter={(value) => `${value}`}
                />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.05)' }}
                  contentStyle={{ backgroundColor: '#1a1a1a', border: '1px solid #333', borderRadius: '8px' }}
                />
                <Legend iconType="circle" />
                <Bar name="Total" dataKey="total" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                <Bar name="Atendidas" dataKey="served" fill="#10b981" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="bg-card/50 backdrop-blur-sm border-border/50 shadow-xl overflow-hidden">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-white">Performance dos Vendedores</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-muted-foreground border-b border-border/50">
                    <th className="pb-3 font-medium">Vendedor</th>
                    <th className="pb-3 font-medium">Cidade</th>
                    <th className="pb-3 font-medium text-center">Empresas</th>
                    <th className="pb-3 font-medium text-right">Atividades (7d)</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30">
                  {data?.sellersList.map((seller) => (
                    <tr key={seller.id} className="group hover:bg-white/5 transition-colors">
                      <td className="py-4 font-medium text-white">{seller.name}</td>
                      <td className="py-4 text-muted-foreground">{seller.city}</td>
                      <td className="py-4 text-center text-white">{seller.companiesCount}</td>
                      <td className="py-4 text-right">
                        <span className={cn(
                          "px-2 py-1 rounded-full text-xs font-semibold",
                          seller.recentActivities > 5 ? "bg-emerald-500/10 text-emerald-400" : 
                          seller.recentActivities > 0 ? "bg-amber-500/10 text-amber-400" : 
                          "bg-slate-500/10 text-slate-400"
                        )}>
                          {seller.recentActivities}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {data?.sellersList.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-muted-foreground italic">
                        Nenhum vendedor encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

