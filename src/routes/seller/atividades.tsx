import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Building2, 
  Phone, 
  MessageSquare, 
  Handshake, 
  Plus, 
  AlertTriangle, 
  MoreHorizontal,
  Loader2 
} from 'lucide-react';

export const Route = createFileRoute('/seller/atividades')({
  component: ActivityPage,
});

function ActivityPage() {
  const { profile } = useAuth();

  const { data: activities, isLoading } = useQuery({
    queryKey: ['seller-activities', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_activities')
        .select(`
          *,
          activity_items (*)
        `)
        .eq('seller_id', profile?.id)
        .order('activity_date', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-24">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Atividades</h1>
      </div>

      {/* Entry Point */}
      <Card className="border-l-4 border-l-green-600">
        <CardContent className="p-6 flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="font-semibold text-lg">Registrar Atividade</h2>
            <p className="text-sm text-muted-foreground">Logue seu trabalho em campo em menos de 1 minuto.</p>
          </div>
          <Button className="bg-green-600 hover:bg-green-700">
            <Plus className="w-4 h-4 mr-2" />
            Nova
          </Button>
        </CardContent>
      </Card>

      {/* Activity History */}
      <div className="space-y-4">
        {isLoading ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activities && activities.length > 0 ? (
          activities.map((activity) => (
            <Card key={activity.id} className="bg-card/50">
              <CardContent className="p-4 space-y-3">
                <div className="flex justify-between items-center text-sm text-muted-foreground">
                  <span>{new Date(activity.activity_date).toLocaleDateString()}</span>
                </div>
                <div className="space-y-2">
                  {activity.activity_items.map((item: any) => (
                    <div key={item.id} className="flex items-center gap-2 text-sm">
                      {item.type === 'visit' && <Building2 className="w-4 h-4 text-blue-500" />}
                      {item.type === 'call' && <Phone className="w-4 h-4 text-green-500" />}
                      {item.type === 'negotiation' && <Handshake className="w-4 h-4 text-orange-500" />}
                      <span>{item.type.toUpperCase()}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-12 border rounded-xl border-dashed">
            <ClipboardList className="w-12 h-12 mx-auto text-muted-foreground mb-3 opacity-30" />
            <p className="text-muted-foreground">Nenhuma atividade registrada ainda.</p>
          </div>
        )}
      </div>
    </div>
  );
}
