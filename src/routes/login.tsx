import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Lock, ArrowRight, ShieldCheck, Eye, EyeOff, Briefcase, MapPin, ChevronLeft, BadgeCheck } from 'lucide-react';
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute('/login')({
  component: Login,
});

type UserProfileType = 'seller' | 'admin' | null;

function Login() {
  const [selectedProfile, setSelectedProfile] = useState<UserProfileType>(null);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [fullName, setFullName] = useState('');
  const [city, setCity] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProfile) return;
    
    setLoading(true);
    try {
      if (isSignUp) {
        if (password !== confirmPassword) {
          toast({
            title: 'Erro no cadastro',
            description: 'As senhas não coincidem.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        if (selectedProfile === 'seller' && !city.trim()) {
          toast({
            title: 'Campo obrigatório',
            description: 'Vendedores devem informar a cidade de atuação.',
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              name: fullName,
              role: selectedProfile,
              city: selectedProfile === 'seller' ? city : null,
            },
          },
        });
        if (error) throw error;
        toast({
          title: 'Conta criada com sucesso!',
          description: 'Verifique seu e-mail para confirmar o cadastro.',
        });
        setIsSignUp(false);
      } else {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) throw error;

        // Security Validation: Check if user profile matches the selected profile
        const { data: profile, error: profileError } = await supabase
          .from('profiles')
          .select('role')
          .eq('id', data.user.id)
          .single();

        if (profileError) {
          await supabase.auth.signOut();
          throw profileError;
        }

        if (profile.role !== selectedProfile) {
          await supabase.auth.signOut();
          toast({
            title: 'Acesso negado',
            description: `Este usuário está cadastrado como ${profile.role === 'admin' ? 'Supervisor' : 'Vendedor'}, não como ${selectedProfile === 'admin' ? 'Supervisor' : 'Vendedor'}.`,
            variant: 'destructive',
          });
          setLoading(false);
          return;
        }

        if (profile.role === 'admin') {
          navigate({ to: '/admin/dashboard' });
        } else {
          navigate({ to: '/seller/dashboard' });
        }
      }
    } catch (error: any) {
      toast({
        title: isSignUp ? 'Erro ao cadastrar' : 'Erro ao entrar',
        description: error.message || 'Ocorreu um erro inesperado.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const renderProfileSelection = () => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-2xl animate-fade-up">
      <Card 
        className="group cursor-pointer border-border/50 bg-card/40 backdrop-blur-2xl hover:bg-primary/5 hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
        onClick={() => setSelectedProfile('seller')}
      >
        <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground">Sou Vendedor</h3>
            <p className="text-muted-foreground text-sm mt-2">Acesse sua cidade, registre atividades e acompanhe suas metas.</p>
          </div>
          <div className="pt-4">
            <Button variant="ghost" className="group-hover:text-primary group-hover:bg-primary/10">
              Selecionar <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card 
        className="group cursor-pointer border-border/50 bg-card/40 backdrop-blur-2xl hover:bg-primary/5 hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-1 overflow-hidden"
        onClick={() => setSelectedProfile('admin')}
      >
        <CardContent className="p-8 flex flex-col items-center text-center space-y-4">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center group-hover:bg-primary/20 transition-colors">
            <ShieldCheck className="w-8 h-8 text-primary" />
          </div>
          <div>
            <h3 className="text-2xl font-bold text-foreground">Sou Supervisor</h3>
            <p className="text-muted-foreground text-sm mt-2">Gerencie equipes, visualize o Kanban de cidades e analise KPIs.</p>
          </div>
          <div className="pt-4">
            <Button variant="ghost" className="group-hover:text-primary group-hover:bg-primary/10">
              Selecionar <ArrowRight className="ml-2 w-4 h-4" />
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4 overflow-hidden bg-background">
      {/* Dynamic Ambient Background */}
      <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-primary/20 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-primary/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
        <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />
      </div>

      {!selectedProfile ? (
        <div className="flex flex-col items-center w-full">
          <div className="text-center mb-12 space-y-4 animate-fade-in">
            <div className="mx-auto w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mb-6 border border-primary/20 shadow-2xl shadow-primary/20">
              <ShieldCheck className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-5xl font-extrabold tracking-tight text-foreground sm:text-6xl">
              SAMMA<span className="text-primary italic">AI</span>
            </h1>
            <p className="text-muted-foreground font-medium uppercase tracking-[0.3em] text-sm">
              Escolha seu perfil para continuar
            </p>
          </div>
          {renderProfileSelection()}
        </div>
      ) : (
        <Card className="relative z-10 w-full max-w-lg border-border/50 bg-card/40 backdrop-blur-2xl shadow-2xl animate-fade-up border">
          <div className="absolute top-4 left-4">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => setSelectedProfile(null)}
              className="text-muted-foreground hover:text-primary gap-2"
            >
              <ChevronLeft className="w-4 h-4" />
              Trocar perfil
            </Button>
          </div>
          
          <div className="absolute top-4 right-4">
            <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 flex items-center gap-1.5 py-1">
              <BadgeCheck className="w-3.5 h-3.5" />
              Acesso: {selectedProfile === 'admin' ? 'Supervisor' : 'Vendedor'}
            </Badge>
          </div>

          <CardHeader className="text-center space-y-1 pt-12 pb-6">
            <div className="mx-auto w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center mb-4 border border-primary/20">
              {selectedProfile === 'admin' ? <ShieldCheck className="w-7 h-7 text-primary" /> : <MapPin className="w-7 h-7 text-primary" />}
            </div>
            <CardTitle className="text-4xl font-bold tracking-tight text-foreground sm:text-5xl">
              SAMMA<span className="text-primary italic">AI</span>
            </CardTitle>
            <CardDescription className="text-muted-foreground font-medium uppercase tracking-[0.2em] text-xs">
              {isSignUp ? 'Solicitação de Acesso' : 'Bem-vindo de volta'}
            </CardDescription>
          </CardHeader>
          
          <CardContent className="px-8 pb-10">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-4">
                {isSignUp && (
                  <>
                    <div className="space-y-2 animate-fade-in">
                      <Label htmlFor="fullName" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                        Nome Completo
                      </Label>
                      <div className="relative group">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                        <Input
                          id="fullName"
                          placeholder="Ex: João Silva"
                          value={fullName}
                          onChange={(e) => setFullName(e.target.value)}
                          required
                          className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 h-12 pl-10 transition-all"
                        />
                      </div>
                    </div>

                    <div className="space-y-2 animate-fade-in opacity-80">
                      <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                        Perfil Selecionado
                      </Label>
                      <div className="relative group">
                        <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground z-10" />
                        <Input
                          value={selectedProfile === 'admin' ? 'Supervisor' : 'Vendedor'}
                          disabled
                          className="bg-background/30 border-border/30 h-12 pl-10 cursor-not-allowed italic"
                        />
                      </div>
                    </div>

                    {selectedProfile === 'seller' && (
                      <div className="space-y-2 animate-fade-in">
                        <Label htmlFor="city" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                          Cidade de Atuação
                        </Label>
                        <div className="relative group">
                          <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                          <Input
                            id="city"
                            placeholder="Ex: São Paulo"
                            value={city}
                            onChange={(e) => setCity(e.target.value)}
                            required
                            className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 h-12 pl-10 transition-all"
                          />
                        </div>
                      </div>
                    )}
                  </>
                )}
                
                <div className="space-y-2">
                  <Label htmlFor="email" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                    E-mail Corporativo
                  </Label>
                  <div className="relative group">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      id="email"
                      type="email"
                      placeholder="voce@empresa.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 h-12 pl-10 transition-all"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="password" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                    Senha
                  </Label>
                  <div className="relative group">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                    <Input
                      id="password"
                      type={showPassword ? "text" : "password"}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 h-12 pl-10 pr-10 transition-all"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-primary transition-colors"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {isSignUp && (
                  <div className="space-y-2 animate-fade-in">
                    <Label htmlFor="confirmPassword" className="text-xs font-semibold uppercase tracking-wider text-muted-foreground ml-1">
                      Confirmar Senha
                    </Label>
                    <div className="relative group">
                      <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-focus-within:text-primary" />
                      <Input
                        id="confirmPassword"
                        type={showPassword ? "text" : "password"}
                        placeholder="••••••••"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        required
                        className="bg-background/50 border-border/50 focus:border-primary/50 focus:ring-primary/20 h-12 pl-10 pr-10 transition-all"
                      />
                    </div>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                disabled={loading}
                className="w-full h-12 bg-primary text-primary-foreground hover:bg-primary/90 font-bold text-sm tracking-widest transition-all shadow-lg shadow-primary/20 group overflow-hidden"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin mr-2" />
                ) : (
                <span className="flex items-center">
                  {isSignUp ? 'FINALIZAR CADASTRO' : 'ACESSAR PLATAFORMA'}
                  <ArrowRight className="w-4 h-4 ml-2 group-hover:translate-x-1 transition-transform" />
                </span>
                )}
              </Button>
              
              <div className="relative py-4">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-transparent px-2 text-muted-foreground">Alternar modo</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                onClick={() => setIsSignUp(!isSignUp)}
                className="w-full h-12 border-border/50 bg-transparent hover:bg-muted/50 hover:text-primary transition-all font-medium text-xs tracking-wider"
              >
                {isSignUp ? 'JÁ POSSUI UMA CONTA? ENTRAR' : 'NOVO POR AQUI? SOLICITAR ACESSO'}
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
