import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/contexts/AuthContext';
import * as XLSX from 'xlsx';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Upload, FileSpreadsheet, Download } from 'lucide-react';
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
  Loader2,
  CheckCircle2,
  Trophy,
  Hourglass,
  ChevronDown,
  ChevronUp,
  AlertTriangle,
  ExternalLink,
  Target
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
import { useState, useMemo, useRef, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { format, parseISO, differenceInDays, isBefore, addDays } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Progress } from '@/components/ui/progress';
import { 
  Collapsible, 
  CollapsibleContent, 
  CollapsibleTrigger 
} from '@/components/ui/collapsible';
import { 
  Tabs, 
  TabsList, 
  TabsTrigger 
} from '@/components/ui/tabs';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';

const companySchema = z.object({
  name: z.string().min(2, "O nome deve ter pelo menos 2 caracteres"),
  has_outsourced: z.boolean(),
  outsourced_services: z.array(z.string()).min(0),
  contract_end_date: z.string().min(1, "Data de vencimento é obrigatória"),
  responsible_name: z.string().min(2, "Nome do responsável deve ter pelo menos 2 caracteres"),
  responsible_contact: z.string().min(1, "Contato é obrigatório"),
  is_samma_client: z.boolean(),
  won_by_seller: z.boolean().optional(),
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
  const [activeTab, setActiveTab] = useState("all");
  const [isAlertsExpanded, setIsAlertsExpanded] = useState(true);
  const [highlightedId, setHighlightedId] = useState<string | null>(null);
  const gridRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [importOpen, setImportOpen] = useState(false);
  const [importRows, setImportRows] = useState<{ name: string; address: string; cep: string; cidade: string }[]>([]);
  const [importing, setImporting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: companies, isLoading: loadingCompanies } = useQuery({
    queryKey: ['seller-companies', profile?.id],
    queryFn: async () => {
      if (!profile?.id) return [];
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .eq('seller_id', profile.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!profile?.id,
  });

  const sortedCompanies = useMemo(() => {
    if (!companies) return [];
    return [...companies].sort((a, b) => {
      const ta = a.contract_end_date ? new Date(a.contract_end_date).getTime() : Infinity;
      const tb = b.contract_end_date ? new Date(b.contract_end_date).getTime() : Infinity;
      return ta - tb;
    });
  }, [companies]);

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
      is_samma_client: false,
      won_by_seller: false,
    }
  });

  const hasOutsourced = watch("has_outsourced");
  const outsourcedServices = watch("outsourced_services") || [];
  const contractEndDate = watch("contract_end_date");
  const isSammaClient = watch("is_samma_client");

  const upsertMutation = useMutation({
    mutationFn: async (values: CompanyFormValues) => {
      if (!profile?.id || !profile?.city_id) {
        throw new Error("Perfil incompleto");
      }

      const payload = {
        name: values.name,
        has_outsourced: values.has_outsourced,
        outsourced_services: values.outsourced_services,
        contract_end_date: values.contract_end_date,
        responsible_name: values.responsible_name,
        responsible_contact: values.responsible_contact,
        is_samma_client: values.is_samma_client,
        won_by_seller: values.is_samma_client ? values.won_by_seller : false,
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
    onError: (error) => {
      console.error(error);
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
        has_outsourced: !!company.has_outsourced,
        outsourced_services: company.outsourced_services || [],
        contract_end_date: company.contract_end_date,
        responsible_name: company.responsible_name,
        responsible_contact: company.responsible_contact,
        is_samma_client: !!company.is_samma_client,
        won_by_seller: !!company.won_by_seller,
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
        is_samma_client: false,
        won_by_seller: false,
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

  const stats = useMemo(() => {
    if (!companies) return { total: 0, served: 0, won: 0, notServed: 0, percentage: 0 };
    const total = companies.length;
    const served = companies.filter(c => c.is_samma_client).length;
    const won = companies.filter(c => c.is_samma_client && c.won_by_seller).length;
    const notServed = companies.filter(c => !c.is_samma_client).length;
    const percentage = total > 0 ? Number(((served / total) * 100).toFixed(1)) : 0;
    return { total, served, won, notServed, percentage };
  }, [companies]);


  const expiringContracts = useMemo(() => {
    if (!companies) return [];
    const limitDate = addDays(new Date(), 60);
    return companies
      .filter(c => c.contract_end_date && isBefore(parseISO(c.contract_end_date), limitDate))
      .sort((a, b) => new Date(a.contract_end_date!).getTime() - new Date(b.contract_end_date!).getTime());
  }, [companies]);

  const filteredCompanies = useMemo(() => {
    if (!sortedCompanies) return [];
    if (activeTab === 'all') return sortedCompanies;
    if (activeTab === 'served') return sortedCompanies.filter(c => c.is_samma_client);
    if (activeTab === 'won') return sortedCompanies.filter(c => c.is_samma_client && c.won_by_seller);
    if (activeTab === 'not_served') return sortedCompanies.filter(c => !c.is_samma_client);
    return sortedCompanies;
  }, [sortedCompanies, activeTab]);

  const scrollToCompany = (id: string) => {
    const element = gridRefs.current[id];
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'center' });
      setHighlightedId(id);
      setTimeout(() => setHighlightedId(null), 2000);
    }
  };

  const getSammaStatusBadge = (company: any) => {
    if (company.is_samma_client) {
      if (company.won_by_seller) {
        return <Badge variant="outline" className="bg-primary/15 text-primary border-primary/30">Conquistada por mim</Badge>;
      }
      return <Badge variant="secondary" className="bg-secondary text-secondary-foreground">Atendida pela SAMMA</Badge>;
    }
    return <Badge variant="outline" className="bg-muted text-muted-foreground border-transparent">Não atendida</Badge>;
  };

  const getUrgencyInfo = (dateStr: string | null) => {
    if (!dateStr) {
      return { label: "Sem data", color: "secondary", class: "bg-muted text-muted-foreground", days: 0 };
    }
    const date = parseISO(dateStr);
    const today = new Date();
    const days = differenceInDays(date, today);

    if (isBefore(date, today)) {
      return { label: "Vencido", color: "destructive", class: "bg-red-600", days };
    }
    if (days <= 15) {
      return { label: "Crítico", color: "destructive", class: "bg-red-500", days };
    }
    if (days <= 30) {
      return { label: "Atenção", color: "warning", class: "bg-yellow-500 text-white", days };
    }
    if (days <= 60) {
      return { label: "Acompanhar", color: "secondary", class: "bg-muted text-muted-foreground", days };
    }
    return { label: "No prazo", color: "secondary", class: "bg-green-600 text-white", days };
  };

  const normalizeKey = (k: string) =>
    k.toString().trim().toLowerCase()
      .normalize('NFD').replace(/[\u0300-\u036f]/g, '');

  const handleFileSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const buf = await file.arrayBuffer();
      const wb = XLSX.read(buf, { type: 'array' });
      const ws = wb.Sheets[wb.SheetNames[0]];
      const json = XLSX.utils.sheet_to_json<Record<string, any>>(ws, { defval: '' });
      const rows = json.map((r) => {
        const map: Record<string, any> = {};
        Object.keys(r).forEach((k) => { map[normalizeKey(k)] = r[k]; });
        return {
          name: String(map['unidade'] ?? map['nome'] ?? map['sede'] ?? '').trim(),
          address: String(map['endereco'] ?? map['endereço'] ?? map['address'] ?? '').trim(),
          cep: String(map['cep'] ?? '').trim(),
          cidade: String(map['cidade'] ?? '').trim(),
        };
      }).filter((r) => r.name);
      setImportRows(rows);
      if (rows.length === 0) {
        toast({ title: 'Nenhuma sede encontrada na planilha', description: 'Verifique se há a coluna "Unidade".', variant: 'destructive' });
      }
    } catch (err) {
      console.error(err);
      toast({ title: 'Erro ao ler a planilha', description: 'Verifique o formato do arquivo.', variant: 'destructive' });
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleConfirmImport = async () => {
    if (!profile?.id || !profile?.city_id) {
      toast({ title: 'Perfil incompleto', variant: 'destructive' });
      return;
    }
    setImporting(true);
    try {
      const payload = importRows.map((r) => ({
        seller_id: profile.id,
        city_id: profile.city_id!,
        name: r.name,
        address: r.address || null,
        cep: r.cep || null,
        has_outsourced: false,
        outsourced_services: [],
        is_samma_client: false,
        won_by_seller: false,
        samma_status: 'novo',
      }));
      const { error } = await supabase.from('companies').insert(payload);
      if (error) throw error;
      toast({ title: `${payload.length} sede(s) importada(s) com sucesso! ✅` });
      queryClient.invalidateQueries({ queryKey: ['seller-companies'] });
      setImportOpen(false);
      setImportRows([]);
    } catch (err: any) {
      console.error(err);
      toast({ title: 'Erro na importação', description: err.message ?? 'Tente novamente.', variant: 'destructive' });
    } finally {
      setImporting(false);
    }
  };

  const downloadTemplate = () => {
    const ws = XLSX.utils.json_to_sheet([
      { Unidade: 'Ex: Sede Central', 'ENDEREÇO': 'Av. Exemplo, 123 - Centro', CEP: '74000-000', Cidade: 'Goiânia' },
    ]);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Sedes');
    XLSX.writeFile(wb, 'modelo-sedes.xlsx');
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
    <div className="space-y-10 max-w-7xl mx-auto pb-24 px-4 sm:px-6">
      <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex flex-col gap-2">
          <h1 className="text-3xl font-bold tracking-tight">Minha Cidade</h1>
          <p className="text-muted-foreground">Gerencie as empresas e contratos na sua região.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={downloadTemplate} className="gap-2">
            <Download className="w-4 h-4" /> Modelo
          </Button>
          <Button variant="secondary" onClick={() => setImportOpen(true)} className="gap-2">
            <Upload className="w-4 h-4" /> Importar planilha
          </Button>
        </div>
      </div>

      {/* SECTION 1 — STATS OVERVIEW */}
      <div className="space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: "Total de Empresas", value: stats.total, icon: Building2, color: "text-blue-500", delay: 0 },
            { label: "Atendidas pela SAMMA", value: stats.served, icon: CheckCircle2, color: "text-green-500", delay: 0.1 },
            { label: "Conquistadas por mim", value: stats.won, icon: Trophy, color: "text-yellow-500", delay: 0.2 },
            { label: "Ainda não atendidas", value: stats.notServed, icon: Hourglass, color: "text-gray-400", delay: 0.3 }
          ].map((stat, i) => (
            <Card key={i} className="bg-card/40 backdrop-blur-md border-border/50 animate-fade-up" style={{ animationDelay: `${stat.delay}s` }}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-xs font-bold text-muted-foreground uppercase tracking-wider">{stat.label}</CardTitle>
                <stat.icon className={cn("w-4 h-4", stat.color)} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
              </CardContent>
            </Card>
          ))}
        </div>

        <div className="space-y-2">
          {stats.total > 0 ? (
            <>
              <div className="flex justify-between items-center text-sm font-medium">
                <span className="text-muted-foreground">{stats.percentage}% das empresas já são atendidas pela SAMMA</span>
              </div>
              <Progress 
                value={stats.percentage} 
                className={cn(
                  "h-2",
                  stats.percentage >= 70 ? "[&>div]:bg-green-600" : 
                  stats.percentage >= 40 ? "[&>div]:bg-yellow-500" : 
                  "[&>div]:bg-red-600"
                )} 
              />
            </>
          ) : (
            <p className="text-sm text-muted-foreground italic">Nenhuma empresa cadastrada ainda.</p>
          )}
        </div>
      </div>

      {/* SECTION 2 — ALERTA DE CONTRATOS A VENCER */}
      <Card className={cn(
        "bg-card/40 backdrop-blur-md border-border/50 transition-all duration-300",
        expiringContracts.length > 0 ? "border-yellow-500/30" : ""
      )}>
        <Collapsible open={isAlertsExpanded} onOpenChange={setIsAlertsExpanded}>
          <CollapsibleTrigger asChild>
            <Button variant="ghost" className="w-full flex items-center justify-between p-6 hover:bg-transparent">
              <div className="flex items-center gap-2">
                <AlertTriangle className={cn("w-5 h-5", expiringContracts.length > 0 ? "text-yellow-500" : "text-green-500")} />
                <span className="text-lg font-bold">
                  {expiringContracts.length > 0 
                    ? `⚠️ Contratos próximos do vencimento (${expiringContracts.length})`
                    : "✅ Contratos em dia"}
                </span>
              </div>
              {isAlertsExpanded ? <ChevronUp className="w-5 h-5" /> : <ChevronDown className="w-5 h-5" />}
            </Button>
          </CollapsibleTrigger>
          <CollapsibleContent className="px-6 pb-6 space-y-4">
            {expiringContracts.length > 0 ? (
              <div className="space-y-3">
                {expiringContracts.map((company) => {
                  const urgency = getUrgencyInfo(company.contract_end_date);
                  return (
                    <div key={company.id} className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-xl bg-background/40 border border-border/50 gap-4 group hover:border-primary/30 transition-all">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <Building2 className="w-4 h-4 text-primary" />
                          <span className="font-bold">{company.name}</span>
                          <Badge variant={urgency.color as any} className={cn("text-[10px] py-0", urgency.class)}>
                            {urgency.label}
                          </Badge>
                        </div>
                        <div className="text-sm text-muted-foreground flex flex-wrap gap-x-3 gap-y-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Vence em: {company.contract_end_date ? format(parseISO(company.contract_end_date), 'dd/MM/yyyy') : '—'}
                          </span>
                          <span className="font-medium text-primary">
                            · Faltam {urgency.days} dias
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-1">
                          <span className="text-xs text-muted-foreground">Situação:</span>
                          {getSammaStatusBadge(company)}
                        </div>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary hover:text-primary hover:bg-primary/10 font-bold group"
                        onClick={() => scrollToCompany(company.id)}
                      >
                        Ver empresa <ExternalLink className="w-3 h-3 ml-2 group-hover:translate-x-1 transition-transform" />
                      </Button>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-center py-4 italic">
                ✅ Nenhum contrato próximo do vencimento. Tudo certo por aqui!
              </p>
            )}
          </CollapsibleContent>
        </Collapsible>
      </Card>

      {/* SECTION 3 — COMPANY GRID WITH FILTERS */}
      <div className="space-y-6">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="w-full justify-start overflow-x-auto h-auto p-1 bg-background/50 border border-border/50 no-scrollbar">
            <TabsTrigger value="all" className="rounded-md font-bold text-xs uppercase tracking-wider py-2">
              Todas ({stats.total})
            </TabsTrigger>
            <TabsTrigger value="served" className="rounded-md font-bold text-xs uppercase tracking-wider py-2">
              ✅ Atendidas ({stats.served})
            </TabsTrigger>
            <TabsTrigger value="won" className="rounded-md font-bold text-xs uppercase tracking-wider py-2">
              🏆 Conquistadas ({stats.won})
            </TabsTrigger>
            <TabsTrigger value="not_served" className="rounded-md font-bold text-xs uppercase tracking-wider py-2">
              ⏳ Não atendidas ({stats.notServed})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {filteredCompanies.length === 0 ? (
          <div className="flex flex-col items-center justify-center min-h-[300px] text-center p-8 bg-card/40 rounded-xl border border-dashed border-border/50">
            <Building2 className="w-16 h-16 text-muted-foreground mb-4 opacity-20" />
            <h2 className="text-xl font-semibold">Nenhuma empresa encontrada nesta categoria.</h2>
            <p className="text-muted-foreground">Tente mudar o filtro ou cadastrar novas empresas.</p>
          </div>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredCompanies.map((company) => {
              const urgency = getUrgencyInfo(company.contract_end_date);
              return (
                <Card 
                  key={company.id} 
                  ref={(el) => {
                    gridRefs.current[company.id] = el;
                  }}
                  className={cn(
                    "bg-card/40 backdrop-blur-md border-border/50 flex flex-col group hover:shadow-lg transition-all duration-300",
                    highlightedId === company.id ? "ring-2 ring-primary animate-pulse border-primary" : ""
                  )}
                >
                  <CardHeader className="flex flex-row items-start justify-between pb-2">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-primary" />
                        <CardTitle className="text-lg font-bold">{company.name}</CardTitle>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-1">
                        {getSammaStatusBadge(company)}
                        <Badge variant={urgency.color as any} className={cn("text-[10px] py-0", urgency.class)}>
                          {urgency.label}
                        </Badge>
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

                    {company.has_outsourced && company.outsourced_services && (company.outsourced_services as string[]).length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {(company.outsourced_services as string[]).map((service: string) => (
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
                          <span>{company.contract_end_date ? format(parseISO(company.contract_end_date), 'dd/MM/yyyy') : 'Sem data'}</span>
                        </div>
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
              );
            })}
          </div>
        )}
      </div>

      {/* Floating Action Button */}
      <Button 
        onClick={() => handleOpenDrawer()}
        className="fixed bottom-20 md:bottom-8 right-8 w-14 h-14 md:w-auto md:h-14 md:px-6 rounded-full shadow-2xl bg-green-600 hover:bg-green-700 transition-all z-40 group"
      >
        <Plus className="w-6 h-6" />
        <span className="hidden md:inline ml-2 font-bold uppercase tracking-wide">Nova Empresa</span>
      </Button>

      <Sheet open={isDrawerOpen} onOpenChange={setIsDrawerOpen}>
        <SheetContent className="w-full sm:max-w-[480px] p-0 flex flex-col" onPointerDownOutside={(e) => e.preventDefault()}>
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

              <div className="flex items-center justify-between p-4 bg-card rounded-lg border border-border">
                <div className="space-y-0.5">
                  <Label htmlFor="is_samma_client">A empresa é atendida pela SAMMA? *</Label>
                  <p className="text-xs text-muted-foreground">Selecione se esta empresa já é cliente.</p>
                </div>
                <Switch 
                  id="is_samma_client"
                  checked={isSammaClient}
                  onCheckedChange={(checked) => {
                    setValue("is_samma_client", checked);
                    if (!checked) setValue("won_by_seller", false);
                  }}
                />
              </div>

              {isSammaClient && (
                <div className="space-y-3 animate-in fade-in slide-in-from-top-2 duration-300">
                  <Label>Esta empresa foi conquistada por você? *</Label>
                  <RadioGroup 
                    className="grid grid-cols-2 gap-3"
                    value={watch("won_by_seller") ? "yes" : "no"}
                    onValueChange={(val) => setValue("won_by_seller", val === "yes")}
                  >
                    {[
                      { id: 'yes', label: 'Sim', desc: 'Eu conquistei' },
                      { id: 'no', label: 'Não', desc: 'Já era cliente' }
                    ].map((option) => (
                      <Label
                        key={option.id}
                        className={cn(
                          "flex flex-col gap-1 p-3 rounded-xl border-2 cursor-pointer transition-all hover:bg-muted/50",
                          (watch("won_by_seller") ? "yes" : "no") === option.id ? "border-primary bg-primary/5" : "border-border"
                        )}
                      >
                        <div className="flex items-center gap-2">
                          <RadioGroupItem value={option.id} id={option.id} />
                          <span className="font-bold">{option.label}</span>
                        </div>
                      </Label>
                    ))}
                  </RadioGroup>
                </div>
              )}

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

          <SheetFooter className="p-6 border-t bg-card mt-auto flex flex-row gap-2">
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
