import { createFileRoute, Link } from '@tanstack/react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  CheckCircle2, 
  Clock, 
  Plus, 
  Loader2,
  CalendarClock,
  LayoutGrid,
  CalendarDays,
  MoreVertical
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { 
  format, 
  startOfWeek, 
  addDays, 
  eachDayOfInterval, 
  isSameDay, 
  startOfMonth, 
  endOfMonth, 
  endOfWeek, 
  isSameMonth, 
  addMonths, 
  subMonths,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetTrigger,
  SheetDescription
} from '@/components/ui/sheet';
import { getSellerAgenda, toggleActivityStatus } from '@/lib/agenda.functions';
import { useServerFn } from '@tanstack/react-start';
import { useToast } from '@/hooks/use-toast';

export const Route = createFileRoute('/seller/agenda')({
  component: AgendaPage,
});

function AgendaPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const fetchAgenda = useServerFn(getSellerAgenda);
  const updateStatus = useServerFn(toggleActivityStatus);

  const { data: activities, isLoading } = useQuery({
    queryKey: ['seller-agenda', profile?.id, format(currentMonth, 'yyyy-MM')],
    queryFn: () => fetchAgenda({ 
      data: {
        sellerId: profile?.id || '', 
        month: currentMonth.toISOString() 
      }
    }),
    enabled: !!profile?.id,
  });

  const mutation = useMutation({
    mutationFn: (vars: { id: string; status: 'planned' | 'done' }) => 
      updateStatus({ 
        data: {
          activityId: vars.id, 
          status: vars.status 
        }
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-agenda'] });
      toast({ title: "Status atualizado! ✅" });
    },
    onError: () => {
      toast({ title: "Erro ao atualizar status", variant: "destructive" });
    }
  });

  // Semana Atual
  const weekDays = useMemo(() => {
    const start = startOfWeek(new Date(), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end: addDays(start, 6) });
  }, []);

  // Calendário Mensal
  const calendarDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentMonth), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(currentMonth), { weekStartsOn: 1 });
    return eachDayOfInterval({ start, end });
  }, [currentMonth]);

  const getActivityForDay = (day: Date) => {
    if (!activities) return [];
    return activities.filter(a => {
      const date = a.status === 'done' ? a.activity_date : (a.due_date || a.activity_date);
      return isSameDay(parseISO(date), day);
    });
  };

  const renderActivityCard = (activity: any) => (
    <div 
      key={activity.id}
      className={cn(
        "p-3 rounded-xl border-l-4 transition-all hover:scale-[1.02] cursor-pointer group relative",
        activity.status === 'done' 
          ? "bg-green-500/10 border-l-green-500 border border-green-500/20 shadow-sm" 
          : "bg-amber-500/10 border-l-amber-500 border border-amber-500/20 shadow-sm"
      )}
      onClick={(e) => {
        if (activity.status === 'planned') {
          mutation.mutate({ id: activity.id, status: 'done' });
        }
      }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-semibold truncate capitalize">
            {activity.activity_types?.join(', ') || 'Atividade'}
          </p>
          <p className="text-[10px] text-muted-foreground truncate">
            {activity.activity_items?.[0]?.companies?.name || 'Sem empresa'}
          </p>
        </div>
        {activity.status === 'done' ? (
          <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
        ) : (
          <Clock className="w-4 h-4 text-amber-500 shrink-0 group-hover:scale-125 transition-transform" />
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-10 max-w-5xl mx-auto pb-24">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <CalendarIcon className="text-primary" />
          Minha Agenda
        </h1>
        <p className="text-sm text-muted-foreground">Gerencie suas atividades planejadas e concluídas.</p>
      </div>

      {/* BLOCO SUPERIOR — Minha Semana */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <CalendarClock className="w-5 h-5 text-primary" />
          <h2 className="font-semibold text-lg">Minha Semana</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
          {weekDays.map((day) => {
            const dayActivities = getActivityForDay(day);
            const isToday = isSameDay(day, new Date());
            
            return (
              <div 
                key={day.toISOString()} 
                className={cn(
                  "flex flex-col gap-3 p-4 rounded-2xl bg-card border transition-all h-full min-h-[160px]",
                  isToday ? "border-primary/50 ring-2 ring-primary/10 shadow-lg shadow-primary/5" : "border-border/50"
                )}
              >
                <div className="text-center border-b border-border/50 pb-2">
                  <p className={cn(
                    "text-[10px] font-bold uppercase tracking-wider",
                    isToday ? "text-primary" : "text-muted-foreground"
                  )}>
                    {format(day, 'EEE', { locale: ptBR })}
                  </p>
                  <p className={cn(
                    "text-lg font-black",
                    isToday ? "text-primary" : ""
                  )}>
                    {format(day, 'dd')}
                  </p>
                </div>
                
                <div className="flex-1 space-y-2">
                  {dayActivities.length > 0 ? (
                    dayActivities.map(renderActivityCard)
                  ) : (
                    <p className="text-[10px] text-muted-foreground text-center py-4 italic">Nenhuma atividade</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* BLOCO INFERIOR — Calendário mensal */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-primary" />
            <h2 className="font-semibold text-lg">Calendário Mensal</h2>
          </div>
          <div className="flex items-center gap-2 bg-card border rounded-lg p-1">
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-bold min-w-[120px] text-center capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <Button variant="ghost" size="icon" onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <Card className="overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
          <CardContent className="p-0">
            {/* Calendar Grid */}
            <div className="grid grid-cols-7 border-b border-border/50">
              {['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'].map(d => (
                <div key={d} className="py-3 text-center text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {calendarDays.map((day, i) => {
                const dayActivities = getActivityForDay(day);
                const isSelected = selectedDay && isSameDay(day, selectedDay);
                const isCurrentMonth = isSameMonth(day, currentMonth);
                const isToday = isSameDay(day, new Date());

                return (
                  <div 
                    key={day.toISOString()}
                    onClick={() => {
                      setSelectedDay(day);
                      setIsSheetOpen(true);
                    }}
                    className={cn(
                      "h-24 md:h-32 p-2 border-r border-b border-border/50 cursor-pointer transition-colors relative group hover:bg-primary/5",
                      !isCurrentMonth && "bg-muted/20 text-muted-foreground/30",
                      isSelected && "bg-primary/5",
                      i % 7 === 6 && "border-r-0"
                    )}
                  >
                    <span className={cn(
                      "text-xs font-bold",
                      isToday && "bg-primary text-primary-foreground w-6 h-6 rounded-full flex items-center justify-center -ml-1 -mt-1"
                    )}>
                      {format(day, 'd')}
                    </span>

                    <div className="mt-2 space-y-1">
                      {dayActivities.slice(0, 3).map(a => (
                        <div 
                          key={a.id} 
                          className={cn(
                            "h-1.5 rounded-full",
                            a.status === 'done' ? "bg-green-500/40" : "bg-amber-500/40"
                          )} 
                        />
                      ))}
                      {dayActivities.length > 3 && (
                        <p className="text-[9px] text-muted-foreground">+{dayActivities.length - 3}</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </section>

      {/* Day Details Sheet */}
      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-md border-l border-border/50 bg-card/95 backdrop-blur-xl">
          <SheetHeader className="mb-6">
            <SheetTitle className="text-2xl font-bold flex items-center gap-3">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                {selectedDay && format(selectedDay, 'dd')}
              </div>
              <div className="flex flex-col items-start leading-tight">
                <span>Atividades do Dia</span>
                <span className="text-sm font-normal text-muted-foreground capitalize">
                  {selectedDay && format(selectedDay, 'EEEE, dd/MM', { locale: ptBR })}
                </span>
              </div>
            </SheetTitle>
          </SheetHeader>

          <div className="space-y-4 overflow-y-auto max-h-[calc(100vh-200px)] pr-2">
            {selectedDay && getActivityForDay(selectedDay).length > 0 ? (
              getActivityForDay(selectedDay).map((activity) => (
                <Card key={activity.id} className="border-border/50 bg-card/50 overflow-hidden group">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between mb-3">
                      <Badge variant={activity.status === 'done' ? 'outline' : 'default'} className={cn(
                        "capitalize",
                        activity.status === 'done' ? "border-green-500 text-green-500" : "bg-amber-500 hover:bg-amber-600"
                      )}>
                        {activity.status === 'done' ? 'Concluído' : 'Planejado'}
                      </Badge>
                      {activity.status === 'planned' && (
                        <Button 
                          size="sm" 
                          variant="ghost" 
                          className="h-8 text-xs text-green-500 hover:text-green-600 hover:bg-green-500/10"
                          onClick={() => mutation.mutate({ id: activity.id, status: 'done' })}
                        >
                          Marcar como concluído
                        </Button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <div>
                        <h4 className="text-sm font-bold capitalize flex items-center gap-2">
                          <LayoutGrid className="w-4 h-4 text-primary" />
                          {activity.activity_types?.join(' & ')}
                        </h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          {activity.description}
                        </p>
                      </div>

                      {activity.activity_items?.map((item: any) => (
                        <div key={item.id} className="flex items-center gap-2 p-2 rounded-lg bg-muted/30 border border-border/30">
                          <Building2 className="w-3 h-3 text-muted-foreground" />
                          <span className="text-[11px] font-medium truncate">
                            {item.companies?.name || 'Empresa não identificada'}
                          </span>
                        </div>
                      ))}

                      {activity.general_notes && (
                        <div className="text-[11px] text-muted-foreground italic border-t border-border/30 pt-2 mt-2">
                          " {activity.general_notes} "
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))
            ) : (
              <div className="text-center py-20 bg-muted/20 rounded-2xl border-2 border-dashed border-border/50">
                <CalendarClock className="w-12 h-12 mx-auto text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground">Nenhuma atividade agendada.</p>
              </div>
            )}
          </div>
          
          <div className="absolute bottom-6 left-6 right-6">
            <Button className="w-full h-12 text-sm font-bold shadow-xl shadow-primary/20" asChild>
              <Link to="/seller/atividades" className="flex items-center">
                <Plus className="w-4 h-4 mr-2" />
                Nova Atividade
              </Link>
            </Button>
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}

function Building2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18" />
      <path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2" />
      <path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2" />
      <path d="M10 6h4" />
      <path d="M10 10h4" />
      <path d="M10 14h4" />
      <path d="M10 18h4" />
    </svg>
  );
}
