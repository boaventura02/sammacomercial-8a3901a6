import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
  Loader2,
  ClipboardList,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Camera,
  Calendar,
  Search
} from 'lucide-react';
import { useState, useMemo } from 'react';
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { format, parseISO, isBefore, addDays } from 'date-fns';

export const Route = createFileRoute('/seller/atividades')({
  component: ActivityPage,
});

type ActivityType = 'visit' | 'call' | 'negotiation' | 'contract_expiring' | 'new_company' | 'other';

interface ActivityTypeConfig {
  id: ActivityType;
  icon: any;
  label: string;
  description: string;
}

const ACTIVITY_TYPES: ActivityTypeConfig[] = [
  { id: 'visit', icon: Building2, label: 'Visita Presencial', description: 'Fui até a empresa' },
  { id: 'call', icon: Phone, label: 'Ligação', description: 'Contatei por telefone' },
  { id: 'negotiation', icon: Handshake, label: 'Negociação', description: 'Avancei em uma proposta' },
  { id: 'new_company', icon: Plus, label: 'Nova Empresa', description: 'Encontrei empresa para cadastrar' },
  { id: 'contract_expiring', icon: AlertTriangle, label: 'Contrato Vencendo', description: 'Tratei de contrato próximo do fim' },
  { id: 'other', icon: MessageSquare, label: 'Outra Atividade', description: 'Algo fora do padrão' },
];

function ActivityPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isWizardOpen, setIsWizardOpen] = useState(false);
  const [step, setStep] = useState(1);
  const [selectedTypes, setSelectedTypes] = useState<ActivityType[]>([]);
  
  // Step 2 Data
  const [formValues, setFormValues] = useState<Record<string, any>>({});
  const [generalNotes, setGeneralNotes] = useState("");
  const [photo, setPhoto] = useState<string | null>(null);

  const { data: companies } = useQuery({
    queryKey: ['seller-companies', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('seller_id', profile?.id || '')
        .order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const { data: activities, isLoading: loadingActivities } = useQuery({
    queryKey: ['seller-activities', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('daily_activities')
        .select(`
          *,
          activity_items (*)
        `)
        .eq('seller_id', profile?.id || '')
        .order('activity_date', { ascending: false })
        .limit(10);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const mutation = useMutation({
    mutationFn: async () => {
      if (!profile?.id || !profile?.city_id) throw new Error("Perfil incompleto");

      // 1. Create Daily Activity
      const { data: activity, error: activityError } = await supabase
        .from('daily_activities')
        .insert([{
          seller_id: profile.id,
          city_id: profile.city_id,
          activity_date: new Date().toISOString().split('T')[0],
          general_notes: generalNotes,
          photo_url: photo,
          activity_types: selectedTypes as string[],
          description: "Atividade registrada via assistente"
        }])
        .select()
        .single();

      if (activityError) throw activityError;

      // 2. Create Items and update companies/contacts
      for (const type of selectedTypes) {
        let companyId = formValues[`${type}_company_id`];
        
        // Handle new company creation
        if (type === 'new_company') {
          const { data: newCompany, error: companyError } = await supabase
            .from('companies')
            .insert([{
              name: formValues.new_company_name,
              has_outsourced: formValues.new_company_has_outsourced,
              outsourced_services: formValues.new_company_services || [],
              contract_end_date: formValues.new_company_contract_end_date,
              responsible_name: formValues.new_company_responsible_name,
              responsible_contact: formValues.new_company_responsible_contact,
              seller_id: profile.id,
              city_id: profile.city_id
            }])
            .select()
            .single();
          
          if (companyError) throw companyError;
          companyId = newCompany.id;
        }

        const { error: itemError } = await supabase
            .from('activity_items')
            .insert([{
                daily_activity_id: activity.id,
                type: type as string,
                company_id: companyId,
                negotiation_status: formValues[`${type}_status`],
                contract_status: formValues[`${type}_contract_status`],
                other_description: formValues.other_description
            }]);
        
        if (itemError) throw itemError;

        // Create contact record
        if (companyId) {
            await supabase.from('contacts').insert([{
                company_id: companyId,
                seller_id: profile.id,
                contact_type: type as string,
                contact_date: new Date().toISOString().split('T')[0]
            }]);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-activities'] });
      toast({ title: "Atividade registrada! ✅" });
      resetWizard();
    },
    onError: () => {
      toast({ title: "Erro ao registrar. Tente novamente.", variant: "destructive" });
    }
  });

  const resetWizard = () => {
    setIsWizardOpen(false);
    setStep(1);
    setSelectedTypes([]);
    setFormValues({});
    setGeneralNotes("");
    setPhoto(null);
  };

  const toggleType = (typeId: ActivityType) => {
    setSelectedTypes(prev => 
      prev.includes(typeId) ? prev.filter(t => t !== typeId) : [...prev, typeId]
    );
  };

  const isStepValid = useMemo(() => {
    if (step === 1) return selectedTypes.length > 0;
    if (step === 2) {
      for (const type of selectedTypes) {
        if (['visit', 'call', 'negotiation'].includes(type) && !formValues[`${type}_company_id`]) return false;
        if (type === 'negotiation' && !formValues.negotiation_status) return false;
        if (type === 'contract_expiring') {
            if (!formValues.contract_expiring_company_id) return false;
            if (!formValues.contract_expiring_contract_status) return false;
        }
        if (type === 'other' && !formValues.other_description) return false;
        if (type === 'new_company') {
            if (!formValues.new_company_name) return false;
            if (!formValues.new_company_contract_end_date) return false;
            if (!formValues.new_company_responsible_name) return false;
            if (!formValues.new_company_responsible_contact) return false;
        }
      }
      return true;
    }
    return true;
  }, [step, selectedTypes, formValues]);

  const expiringCompanies = useMemo(() => {
    if (!companies) return [];
    const limitDate = addDays(new Date(), 60);
    return companies.filter(c => isBefore(parseISO(c.contract_end_date), limitDate));
  }, [companies]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto pb-24">
      <h1 className="text-2xl font-bold">Atividades</h1>

      {/* Entry Point */}
      <Card className="border-l-4 border-l-green-600 hover:shadow-md transition-all cursor-pointer" onClick={() => setIsWizardOpen(true)}>
        <CardContent className="p-6 flex items-center justify-between">
          <div className="space-y-1">
            <h2 className="font-semibold text-lg">Registrar Atividade</h2>
            <p className="text-sm text-muted-foreground">Logue seu trabalho em campo em menos de 1 minuto.</p>
          </div>
          <Button className="bg-green-600 hover:bg-green-700 h-12 w-12 rounded-full p-0">
            <Plus className="w-6 h-6" />
          </Button>
        </CardContent>
      </Card>

      {/* History */}
      <div className="space-y-4">
        {loadingActivities ? (
          <div className="flex justify-center p-8">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : activities && activities.length > 0 ? (
          activities.map((activity: any) => (
            <Card key={activity.id} className="bg-card/50 overflow-hidden border-border/50">
              <CardContent className="p-4 space-y-4">
                <div className="flex justify-between items-center border-b border-border/10 pb-2">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <Calendar className="w-4 h-4 text-muted-foreground" />
                    {format(parseISO(activity.activity_date), 'dd/MM/yyyy')}
                  </div>
                  <div className="flex flex-wrap gap-1">
                    {activity.activity_types?.map((type: string) => (
                        <Badge key={type} variant="secondary" className="text-[10px] capitalize">
                            {type}
                        </Badge>
                    ))}
                  </div>
                </div>
                
                <div className="space-y-3">
                  {activity.activity_items?.map((item: any) => (
                    <div key={item.id} className="flex flex-col gap-1 p-2 rounded-lg bg-background/40">
                      <div className="flex items-center gap-2 text-sm font-medium">
                        {(() => {
                          const config = ACTIVITY_TYPES.find(t => t.id === item.type);
                          const Icon = config?.icon;
                          return Icon ? <Icon className="w-4 h-4 text-primary" /> : null;
                        })()}
                        <span className="capitalize">{ACTIVITY_TYPES.find(t => t.id === item.type)?.label || item.type}</span>
                        {item.company_id && (
                          <span className="text-muted-foreground">→ {companies?.find((c: any) => c.id === item.company_id)?.name || 'Empresa'}</span>
                        )}
                      </div>
                      {item.negotiation_status && (
                        <p className="text-xs text-muted-foreground ml-6 italic">Status: {item.negotiation_status}</p>
                      )}
                      {item.other_description && (
                        <p className="text-xs text-muted-foreground ml-6">{item.other_description}</p>
                      )}
                    </div>
                  ))}
                </div>

                {activity.general_notes && (
                    <div className="pt-2 border-t border-border/10">
                        <p className="text-sm text-muted-foreground">💬 {activity.general_notes}</p>
                    </div>
                )}
              </CardContent>
            </Card>
          ))
        ) : (
          <div className="text-center py-20 bg-card/40 rounded-2xl border-2 border-dashed border-border/50">
            <ClipboardList className="w-16 h-16 mx-auto text-muted-foreground/30 mb-4" />
            <h3 className="text-lg font-medium text-muted-foreground">Nenhuma atividade registrada ainda.</h3>
            <p className="text-sm text-muted-foreground/60 max-w-xs mx-auto">Suas atividades de campo aparecerão aqui assim que você começar a registrar.</p>
          </div>
        )}
      </div>

      {/* Wizard Modal */}
      <Dialog open={isWizardOpen} onOpenChange={(open) => !open && resetWizard()}>
        <DialogContent className="max-w-[560px] p-0 overflow-hidden flex flex-col h-[90vh] md:h-auto">
          <DialogHeader className="p-4 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle>Step {step} of 3</DialogTitle>
              <div className="flex gap-1">
                {[1, 2, 3].map(s => (
                  <div key={s} className={cn("h-1.5 w-8 rounded-full transition-all", step >= s ? "bg-green-600" : "bg-muted")} />
                ))}
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto p-6">
            {step === 1 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="text-center space-y-1">
                  <h2 className="text-xl font-bold">O que você fez hoje?</h2>
                  <p className="text-sm text-muted-foreground">Selecione uma ou mais atividades.</p>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  {ACTIVITY_TYPES.map((type) => {
                    const isSelected = selectedTypes.includes(type.id);
                    return (
                      <button
                        key={type.id}
                        onClick={() => toggleType(type.id)}
                        className={cn(
                          "flex flex-col items-center p-4 rounded-xl border-2 transition-all text-center gap-2 group relative",
                          isSelected ? "border-green-600 bg-green-50/50" : "border-border hover:border-green-300 hover:bg-green-50/20"
                        )}
                      >
                        {isSelected && (
                          <div className="absolute top-2 right-2 bg-green-600 text-white rounded-full p-0.5">
                            <Check className="w-3 h-3" />
                          </div>
                        )}
                        <type.icon className={cn("w-8 h-8", isSelected ? "text-green-600" : "text-muted-foreground group-hover:text-green-600")} />
                        <span className="font-bold text-sm">{type.label}</span>
                        <span className="text-[10px] text-muted-foreground leading-tight">{type.description}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                <div className="text-center">
                  <h2 className="text-xl font-bold">Me conte mais</h2>
                </div>

                {selectedTypes.map((type) => (
                  <div key={type} className="space-y-4 p-4 rounded-lg bg-card border border-border">
                    <div className="flex items-center gap-2 border-b border-border pb-2">
                      {(() => {
                        const config = ACTIVITY_TYPES.find(t => t.id === type);
                        const Icon = config?.icon;
                        return (
                          <>
                            {Icon && <Icon className="w-4 h-4 text-primary" />}
                            <span className="font-semibold text-sm text-primary">{config?.label}</span>
                          </>
                        );
                      })()}
                    </div>
                    
                    {['visit', 'call', 'negotiation'].includes(type) && (
                      <div className="space-y-2">
                        <Label>Qual empresa?</Label>
                        <select 
                          className="w-full h-10 px-3 rounded-md border border-input bg-background"
                          value={formValues[`${type}_company_id`] || ""}
                          onChange={(e) => setFormValues({...formValues, [`${type}_company_id`]: e.target.value})}
                        >
                          <option value="">Selecione uma empresa</option>
                          {companies?.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                        </select>
                      </div>
                    )}

                    {type === 'negotiation' && (
                        <div className="space-y-2">
                            <Label>Como está a negociação?</Label>
                            <div className="flex flex-wrap gap-2">
                                {['Iniciada', 'Em andamento', 'Proposta enviada', 'Fechando', 'Perdida'].map(s => (
                                    <button
                                        key={s}
                                        onClick={() => setFormValues({...formValues, negotiation_status: s})}
                                        className={cn(
                                            "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                            formValues.negotiation_status === s ? "bg-green-600 border-green-600 text-white" : "border-border hover:bg-muted"
                                        )}
                                    >
                                        {s}
                                    </button>
                                ))}
                            </div>
                        </div>
                    )}

                    {type === 'contract_expiring' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Qual empresa tem contrato vencendo?</Label>
                                <select 
                                    className="w-full h-10 px-3 rounded-md border border-input bg-background"
                                    value={formValues.contract_expiring_company_id || ""}
                                    onChange={(e) => setFormValues({...formValues, contract_expiring_company_id: e.target.value})}
                                >
                                    <option value="">Selecione uma empresa (vence em breve)</option>
                                    {expiringCompanies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                                </select>
                            </div>
                            <div className="space-y-2">
                                <Label>Qual foi o encaminhamento?</Label>
                                <div className="flex flex-wrap gap-2">
                                    {['Renovação em andamento', 'Aguardando retorno', 'Contrato renovado', 'Risco de perda'].map(s => (
                                        <button
                                            key={s}
                                            onClick={() => setFormValues({...formValues, contract_expiring_contract_status: s})}
                                            className={cn(
                                                "px-3 py-1.5 rounded-full text-xs font-medium border transition-all",
                                                formValues.contract_expiring_contract_status === s ? "bg-green-600 border-green-600 text-white" : "border-border hover:bg-muted"
                                            )}
                                        >
                                            {s}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    )}

                    {type === 'new_company' && (
                        <div className="space-y-4">
                            <div className="space-y-2">
                                <Label>Nome da empresa *</Label>
                                <Input 
                                    value={formValues.new_company_name || ""} 
                                    onChange={(e) => setFormValues({...formValues, new_company_name: e.target.value})} 
                                />
                            </div>
                            <div className="flex items-center justify-between">
                                <Label>Terceiriza serviço?</Label>
                                <Switch 
                                    checked={formValues.new_company_has_outsourced || false}
                                    onCheckedChange={(checked) => setFormValues({...formValues, new_company_has_outsourced: checked})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Vencimento do contrato *</Label>
                                <Input 
                                    type="date"
                                    value={formValues.new_company_contract_end_date || ""}
                                    onChange={(e) => setFormValues({...formValues, new_company_contract_end_date: e.target.value})}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Responsável e Contato *</Label>
                                <Input 
                                    placeholder="Nome do responsável" 
                                    className="mb-2"
                                    value={formValues.new_company_responsible_name || ""}
                                    onChange={(e) => setFormValues({...formValues, new_company_responsible_name: e.target.value})}
                                />
                                <Input 
                                    placeholder="Telefone ou e-mail" 
                                    value={formValues.new_company_responsible_contact || ""}
                                    onChange={(e) => setFormValues({...formValues, new_company_responsible_contact: e.target.value})}
                                />
                            </div>
                        </div>
                    )}

                    {type === 'other' && (
                        <div className="space-y-2">
                            <Label>Descreva o que você fez *</Label>
                            <Textarea 
                                maxLength={300}
                                value={formValues.other_description || ""}
                                onChange={(e) => setFormValues({...formValues, other_description: e.target.value})}
                            />
                            <p className="text-[10px] text-right text-muted-foreground">{(formValues.other_description?.length || 0)}/300</p>
                        </div>
                    )}
                  </div>
                ))}

                <div className="space-y-4 pt-4 border-t">
                    <div className="space-y-2">
                        <Label>Observações gerais (opcional)</Label>
                        <Textarea 
                            maxLength={300}
                            value={generalNotes}
                            onChange={(e) => setGeneralNotes(e.target.value)}
                        />
                    </div>
                    <div className="space-y-2">
                        <Label>Adicionar foto (opcional)</Label>
                        <div className="flex gap-2">
                            <Button variant="outline" className="flex-1 gap-2" disabled>
                                <Camera className="w-4 h-4" /> Camera
                            </Button>
                            <Button variant="outline" className="flex-1 gap-2" disabled>
                                <Search className="w-4 h-4" /> Galeria
                            </Button>
                        </div>
                    </div>
                </div>
              </div>
            )}

            {step === 3 && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
                    <div className="text-center">
                        <h2 className="text-xl font-bold">Confirmar registro</h2>
                    </div>

                    <Card className="bg-muted/30">
                        <CardContent className="p-6 space-y-4">
                            <div className="flex justify-between items-center border-b pb-2">
                                <span className="font-semibold">📋 Resumo da Atividade</span>
                                <span className="text-sm text-muted-foreground">{format(new Date(), 'dd/MM/yyyy')}</span>
                            </div>

                            <div className="space-y-4">
                                {selectedTypes.map(type => (
                                    <div key={type} className="space-y-1">
                                        <div className="flex items-center gap-2">
                                            <Badge variant="outline" className="bg-green-100 text-green-700 border-green-200">
                                                {ACTIVITY_TYPES.find(t => t.id === type)?.label}
                                            </Badge>
                                        </div>
                                        {['visit', 'call', 'negotiation'].includes(type) && (
                                            <p className="text-sm ml-2">→ Empresa: {companies?.find((c: any) => c.id === formValues[`${type}_company_id`])?.name}</p>
                                        )}
                                        {type === 'negotiation' && (
                                            <p className="text-sm ml-2">→ Status: {formValues.negotiation_status}</p>
                                        )}
                                        {type === 'new_company' && (
                                            <p className="text-sm ml-2">→ Empresa: {formValues.new_company_name}</p>
                                        )}
                                    </div>
                                ))}

                                {generalNotes && (
                                    <div className="pt-2">
                                        <p className="text-sm font-medium">💬 Observações:</p>
                                        <p className="text-sm text-muted-foreground ml-2">{generalNotes}</p>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
          </div>

          <DialogFooter className="p-4 border-t flex flex-row gap-3 bg-muted/5">
            {step > 1 && (
              <Button variant="ghost" onClick={() => setStep(step - 1)} className="flex-1">
                <ChevronLeft className="w-4 h-4 mr-2" /> Voltar
              </Button>
            )}
            {step < 3 ? (
              <Button 
                onClick={() => setStep(step + 1)} 
                disabled={!isStepValid}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Próximo <ChevronRight className="w-4 h-4 ml-2" />
              </Button>
            ) : (
              <Button 
                onClick={() => mutation.mutate()} 
                disabled={mutation.isPending}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                {mutation.isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Check className="w-4 h-4 mr-2" />}
                {mutation.isPending ? "Registrando..." : "Registrar Atividade"}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
