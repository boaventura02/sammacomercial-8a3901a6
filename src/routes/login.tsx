import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useState, useEffect, Suspense, lazy } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useAuth } from "@/contexts/AuthContext";

const Spline = lazy(() => import("@splinetool/react-spline"));

export const Route = createFileRoute("/login")({
  component: LoginPage,
});

function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { profile, loading: authLoading } = useAuth();

  useEffect(() => {
    if (profile && !authLoading) {
      navigate({ to: profile.role === "admin" ? "/admin/dashboard" : "/seller/dashboard" });
    }
  }, [profile, authLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError("Credenciais inválidas");
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-[#141414] overflow-hidden font-sora">
      {/* Spline 3D Background */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={<div className="absolute inset-0 bg-[#141414]" />}>
          <Spline
            scene="https://prod.spline.design/Slk6b8kz3LRlKiyk/scene.splinecode"
            className="w-full h-full"
          />
        </Suspense>
      </div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black/60 z-[1] backdrop-blur-[2px]" />

      <Card className="relative w-full max-w-md p-8 z-10 border-white/10 bg-black/40 backdrop-blur-xl animate-fade-up border-[0.5px]">
        <div className="flex flex-col items-center mb-8">
          <Link to="/" className="text-3xl font-bold tracking-tighter text-white uppercase italic mb-2 hover:opacity-80 transition-opacity">
            SAMMA<span className="text-primary">.</span>
          </Link>
          <p className="text-gray-400 text-xs uppercase tracking-[0.2em] font-medium">
            Gestão de Equipes de Vendas
          </p>
        </div>

        <form onSubmit={handleLogin} className="space-y-6">
          <div className="space-y-2">
            <Input 
              type="email" 
              placeholder="E-MAIL CORPORATIVO" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              required 
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-none h-12 uppercase text-[10px] tracking-widest focus:border-primary/50 focus:ring-0"
            />
          </div>
          <div className="space-y-2">
            <Input 
              type="password" 
              placeholder="SENHA" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              required 
              className="bg-white/5 border-white/10 text-white placeholder:text-gray-500 rounded-none h-12 uppercase text-[10px] tracking-widest focus:border-primary/50 focus:ring-0"
            />
          </div>
          
          {error && (
            <div className="bg-destructive/10 border border-destructive/20 p-3">
              <p className="text-destructive text-[10px] uppercase tracking-widest text-center font-bold">{error}</p>
            </div>
          )}

          <Button 
            type="submit" 
            className="w-full bg-primary text-primary-foreground hover:bg-primary/90 rounded-none h-12 font-bold uppercase tracking-[0.2em] text-[11px] transition-all" 
            disabled={loading}
          >
            {loading ? "PROCESSANDO..." : "ACESSAR SISTEMA"}
          </Button>
        </form>

        <div className="mt-8 pt-6 border-t border-white/5 flex justify-center">
          <p className="text-gray-600 text-[9px] uppercase tracking-[0.3em]">
            Sentinel AI Infrastructure
          </p>
        </div>
      </Card>
    </div>
  );
}
