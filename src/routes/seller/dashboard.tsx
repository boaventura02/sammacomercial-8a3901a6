import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  MapPin, 
  Building2, 
  Plus, 
  Edit2, 
  X, 
  Calendar, 
  User, 
  Phone,
  AlertCircle,
  Loader2
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { 
  Sheet, 
  SheetContent, 
  SheetHeader, 
  SheetTitle, 
  SheetFooter,
  SheetClose
} from '@/components/ui/sheet';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO, differenceInDays, isBefore } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

const companySchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  has_outsourced: z.boolean().default(false),
  outsourced_services: z.array(z.string()).min(0),
  contract_end_date: z.string().min(1, "Data de vencimento é obrigatória"),
  responsible_name: z.string().min(2, "Nome do responsável deve ter pelo menos 2 caracteres"),
  responsible_contact: z.string().min(1, "Contato é obrigatório"),
}).refine((data) => {
  if (data.has_outsourced && data.outsourced_services.length === 0) {
    return false;
  }
  return true;
}, {
  message: "Adicione pelo menos um serviço",
  path: ["outsourced_services"],
});

type CompanyFormValues = z.infer<typeof companySchema>;

export const Route = createFileRoute('/seller/dashboard')({
  component: MyCityPage,
});

function MyCityPage() {
  const { profile } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingCompany, setEditingCompany] = useState<any>(null);
  const [serviceInput, setServiceInput] = useState("");

  const { data: companies, isLoading: loadingCompanies } = useQuery({
    queryKey: ['seller-companies', profile?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('seller_id', profile?.id)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.id,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<CompanyFormValues>({
    resolver: zodResolver(companySchema),
    defaultValues: {
      has_outsourced: false,
      outsourced_services: [],
    }
  });

  const hasOutsourced = watch("has_outsourced");
  const outsourcedServices = watch("outsourced_services") || [];
  const contractEndDate = watch("contract_end_date");

  const upsertMutation = useMutation({
    mutationFn: async (values: CompanyFormValues) => {
      const payload = {
        ...values,
        seller_id: profile.id,
        city_id: profile.city_id,
        updated_at: new Date().toISOString(),
      };

      if (editingCompany) {
        const { error } = await supabase
          .from('companies')
          .update(payload)
          .eq('id', editingCompany.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('companies')
          .insert([payload]);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['seller-companies'] });
      toast({
        title: editingCompany ? "Empresa atualizada com sucesso! ✅" : "Empresa cadastrada com sucesso! ✅",
      });
      handleCloseDrawer();
    },
    onError: () => {
      toast({
        title: "Erro ao processar solicitação",
        description: "Tente novamente mais tarde.",
        variant: "destructive",
      });
    }
  });

  const handleOpenDrawer = (company?: any) => {
    if (company) {
      setEditingCompany(company);
      reset({
        name: company.name,
        has_outsourced: company.has_outsourced,
        outsourced_services: company.outsourced_services || [],
        contract_end_date: company.contract_end_date,
        responsible_name: company.responsible_name,
        responsible_contact: company.responsible_contact,
      });
    } else {
      setEditingCompany(null);
      reset({
        name: "",
        has_outsourced: false,
        outsourced_services: [],
        contract_end_date: "",
        responsible_name: "",
        responsible_contact: "",
      });
    }
    setIsDrawerOpen(true);
  };

  const handleCloseDrawer = () => {
    setIsDrawerOpen(false);
    setEditingCompany(null);
    reset();
    setServiceInput("");
  };

  const addService = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && serviceInput.trim()) {
      e.preventDefault();
      if (!outsourcedServices.includes(serviceInput.trim())) {
        setValue("outsourced_services", [...outsourcedServices, serviceInput.trim()], { shouldValidate: true });
      }
      setServiceInput("");
    }
  };

  const removeService = (service: string) => {
    setValue("outsourced_services", outsourcedServices.filter(s => s !== service), { shouldValidate: true });
  };

  const getUrgencyBadge = (dateStr: string) => {
    const date = parseISO(dateStr);
    const today = new Date();
    const days = differenceInDays(date, today);

    if (isBefore(date, today)) {
      return <Badge variant="destructive" className="bg-red-600">Contrato vencido</Badge>;
    }
    if (days < 15) {
      return <Badge variant="destructive" className="bg-red-500">Vencimento crítico</Badge>;
    }
    if (days <= 60) {
      return <Badge variant="secondary" className="bg-yellow-500 text-white">Vence em breve</Badge>;
    }
    return <Badge variant="secondary" className="bg-green-600 text-white">No prazo</Badge>;
  };

  if (loadingCompanies) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="mt-4 text-muted-foreground">Carregando empresas...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-24">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Minha Cidade</h1>
        <p className="text-muted-foreground">Gerencie as empresas e contratos na sua região.</p>
      </div>

      {!companies || companies.length === 0 ? (
        <div className="flex flex-col items-center justify-center min-h-[400px] text-center p-8 bg-card/40 rounded-xl border border-dashed border-border/50">
          <Building2 className="w-16 h-16 text-muted-foreground mb-4 opacity-20" />
          <h2 className="text-xl font-semibold">Nenhuma empresa cadastrada ainda.</h2>
          <p className="text-muted-foreground mb-6">Comece cadastrando sua primeira empresa na região.</p>
          <Button onClick={() => handleOpenDrawer()} className="bg-green-600 hover:bg-green-700">
            Cadastrar primeira empresa
          </Button>
        </div>
      ) : (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {companies.map((company) => (
            <Card key={company.id} className="bg-card/40 backdrop-blur-md border-border/50 flex flex-col group hover:shadow-lg transition-all duration-300">
              <CardHeader className="flex flex-row items-start justify-between pb-2">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-primary" />
                    <CardTitle className="text-lg font-bold">{company.name}</CardTitle>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => handleOpenDrawer(company)}
                  className="hover:bg-primary/10 hover:text-primary transition-colors"
                >
                  <Edit2 className="w-4 h-4" />
                </Button>
              </CardHeader>
              <CardContent className="space-y-4 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground uppercase font-bold tracking-wider">Terceiriza serviço:</span>
                  <Badge variant={company.has_outsourced ? "default" : "outline"} className={cn(company.has_outsourced ? "bg-primary" : "")}>
                    {company.has_outsourced ? "Sim" : "Não"}
                  </Badge>
                </div>

                {company.has_outsourced && company.outsourced_services?.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {company.outsourced_services.map((service: string) => (
                      <Badge key={service} variant="secondary" className="text-[10px] py-0">
                        {service}
                      </Badge>
                    ))}
                  </div>
                )}

                <div className="pt-2 border-t border-border/10 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Calendar className="w-4 h-4" />
                      <span>{format(parseISO(company.contract_end_date), 'dd/MM/yyyy')}</span>
                    </div>
                    {getUrgencyBadge(company.contract_end_date)}
                  </div>

                  <div className="flex items-center gap-2 text-sm">
                    <User className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{company.responsible_name}</span>
                  </div>
                  
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Phone className="w-4 h-4" />
                    <span>{company.responsible_contact}</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Floating Action Button */}
      <Button 
        onClick={() => handleOpenDrawer()}
        className="fixed bottom-20 md:bottom-8 right-8 w-14 h-14 md:w-auto md:h-14 md:px-6 rounded-full shadow-2xl bg-green-600 hover:bg-green-700 transition-all z-40 group"
      >
        <Plus className="w-6 h-6" />
        <span className="hidden md:inline ml-2 font-bold uppercase tracking-wide">Nova Empresa</span>
      </Button>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-[480px] p-0 flex flex-col">
          <SheetHeader className="p-6 border-b">
            <div className="flex items-center justify-between">
              <SheetTitle className="text-2xl font-bold">
                {editingCompany ? "Editar Empresa" : "Nova Empresa"}
              </SheetTitle>
              <SheetClose asChild>
                <Button variant="ghost" size="icon" onClick={handleCloseDrawer}>
                  <X className="w-5 h-5" />
                </Button>
              </SheetClose>
            </div>
          </SheetHeader>

          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            <form id="company-form" onSubmit={handleSubmit((values) => upsertMutation.mutate(values))} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="name">Nome da empresa *</Label>
                <Input 
                  id="name" 
                  {...register("name")} 
                  placeholder="Ex: Empresa de Alimentos S.A."
                  className={errors.name ? "border-destructive" : ""}
                />
                {errors.name && <p className="text-xs text-destructive">{errors.name.message}</p>}
              </div>

              <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                <div className="space-y-0.5">
                  <Label htmlFor="has_outsourced">Terceiriza algum serviço? *</Label>
                  <p className="text-xs text-muted-foreground">Se a empresa utiliza mão de obra externa.</p>
                </div>
                <Switch 
                  id="has_outsourced"
                  checked={hasOutsourced}
                  onCheckedChange={(checked) => setValue("has_outsourced", checked)}
                />
              </div>

              {hasOutsourced && (
                <div className="space-y-2 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label htmlFor="services">Quais serviços terceiriza? *</Label>
                  <div className="flex flex-wrap gap-2 mb-2">
                    {outsourcedServices.map((service) => (
                      <Badge key={service} variant="secondary" className="gap-1 pl-2">
                        {service}
                        <button 
                          type="button" 
                          onClick={() => removeService(service)}
                          className="hover:text-destructive transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <Input 
                    id="services"
                    value={serviceInput}
                    onChange={(e) => setServiceInput(e.target.value)}
                    onKeyDown={addService}
                    placeholder="Digite um serviço e pressione Enter"
                    className={errors.outsourced_services ? "border-destructive" : ""}
                  />
                  {errors.outsourced_services && (
                    <p className="text-xs text-destructive">{errors.outsourced_services.message}</p>
                  )}
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="contract_end_date">Vencimento do contrato *</Label>
                <Input 
                  id="contract_end_date"
                  type="date"
                  {...register("contract_end_date")}
                  className={errors.contract_end_date ? "border-destructive" : ""}
                />
                {contractEndDate && !isBefore(parseISO(contractEndDate), new Date()) && differenceInDays(parseISO(contractEndDate), new Date()) <= 60 && (
                  <div className="flex items-center gap-2 text-yellow-600 text-xs mt-1">
                    <AlertCircle className="w-3 h-3" />
                    <span>⚠️ Este contrato vence em breve.</span>
                  </div>
                )}
                {errors.contract_end_date && <p className="text-xs text-destructive">{errors.contract_end_date.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsible_name">Nome do responsável pelo contrato *</Label>
                <Input 
                  id="responsible_name" 
                  {...register("responsible_name")} 
                  placeholder="Nome completo do responsável"
                  className={errors.responsible_name ? "border-destructive" : ""}
                />
                {errors.responsible_name && <p className="text-xs text-destructive">{errors.responsible_name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label htmlFor="responsible_contact">Contato do responsável *</Label>
                <Input 
                  id="responsible_contact" 
                  {...register("responsible_contact")} 
                  placeholder="Telefone ou e-mail"
                  className={errors.responsible_contact ? "border-destructive" : ""}
                />
                {errors.responsible_contact && <p className="text-xs text-destructive">{errors.responsible_contact.message}</p>}
              </div>
            </form>
          </div>

          <SheetFooter className="p-6 border-t bg-card mt-auto sm:flex-row gap-2">
            <Button variant="ghost" className="flex-1" onClick={handleCloseDrawer}>
              Cancelar
            </Button>
            <Button 
              type="submit" 
              form="company-form" 
              className="flex-1 bg-green-600 hover:bg-green-700"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  {editingCompany ? "Salvando..." : "Cadastrando..."}
                </>
              ) : (
                editingCompany ? "Salvar Alterações" : "Cadastrar Empresa"
              )}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
