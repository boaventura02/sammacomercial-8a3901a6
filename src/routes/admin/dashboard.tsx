import { createFileRoute } from '@tanstack/react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Building2, MapPin, Users, CheckCircle2 } from 'lucide-react';

export const Route = createFileRoute('/admin/dashboard')({
  component: AdminDashboard,
});

function AdminDashboard() {
  const stats = [
    { label: "Cidades Ativas", value: "12", icon: MapPin, color: "text-blue-400" },
    { label: "Empresas Cadastradas", value: "450", icon: Building2, color: "text-purple-400" },
    { label: "Atendidas pela SAMMA", value: "280", icon: CheckCircle2, color: "text-primary" },
    { label: "Média de Atendimento", value: "62%", icon: Users, color: "text-warning" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Visão Geral</h1>
        <p className="text-muted-foreground">Bem-vindo, Júlio. Veja o desempenho da equipe.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat, i) => (
          <Card key={stat.label} className="bg-card border-border hover:border-primary/40 transition-all animate-fade-up" style={{ animationDelay: `${i * 0.1}s` }}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{stat.label}</CardTitle>
              <stat.icon className={cn("h-4 w-4", stat.color)} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold tracking-tight">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Placeholder para gráficos */}
        <Card className="bg-card border-border h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground italic">Gráfico de Atendimento por Cidade</p>
        </Card>
        <Card className="bg-card border-border h-[400px] flex items-center justify-center">
          <p className="text-muted-foreground italic">Alertas Recentes</p>
        </Card>
      </div>
    </div>
  );
}

import { cn } from "@/lib/utils";
