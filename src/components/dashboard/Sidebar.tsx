import { cn } from "@/lib/utils";
import { 
  LayoutDashboard, 
  Map, 
  Users, 
  ClipboardList, 
  AlertTriangle, 
  Building2, 
  LogOut,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import { Link, useRouter } from "@tanstack/react-router";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";

interface SidebarProps {
  role: 'admin' | 'seller';
  name: string;
}

export function Sidebar({ role, name }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const router = useRouter();
  const { signOut } = useAuth();
  const currentPath = router.state.location.pathname;

  const adminLinks = [
    { label: "Cidades", icon: Map, href: "/admin/cidades" },
    { label: "Visão Geral", icon: LayoutDashboard, href: "/admin/dashboard" },
    { label: "Vendedores", icon: Users, href: "/admin/vendedores" },
    { label: "Atividades", icon: ClipboardList, href: "/admin/atividades" },
    { label: "Alertas", icon: AlertTriangle, href: "/admin/alertas" },
  ];

  const sellerLinks = [
    { label: "Minha Cidade", icon: Map, href: "/seller/dashboard" },
    { label: "Empresas", icon: Building2, href: "/seller/empresas" },
    { label: "Atividades", icon: ClipboardList, href: "/seller/atividades" },
    { label: "Alertas", icon: AlertTriangle, href: "/seller/alertas" },
  ];

  const links = role === 'admin' ? adminLinks : sellerLinks;

  return (
    <>
      {/* Desktop Sidebar */}
      <aside 
        className={cn(
          "hidden md:flex flex-col bg-card border-r border-border transition-all duration-300 z-30",
          collapsed ? "w-20" : "w-64"
        )}
      >
        <div className="p-6 flex items-center justify-between">
          {!collapsed && (
            <div className="font-bold text-2xl tracking-tighter">
              SAMMA<span className="text-primary">.</span>
            </div>
          )}
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setCollapsed(!collapsed)}
            className="hover:bg-primary/10 hover:text-primary"
          >
            {collapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
          </Button>
        </div>

        <nav className="flex-1 px-3 space-y-1">
          {links.map((link) => {
            const isActive = currentPath === link.href;
            return (
              <Link
                key={link.href}
                to={link.href as any}
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-lg transition-all group",
                  isActive 
                    ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
                    : "text-muted-foreground hover:bg-primary/10 hover:text-primary"
                )}
              >
                <link.icon size={20} className={cn(isActive ? "" : "group-hover:scale-110 transition-transform")} />
                {!collapsed && <span className="font-medium">{link.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border mt-auto">
          <div className={cn("flex items-center gap-3", collapsed ? "justify-center" : "")}>
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold border border-primary/30">
              {name.charAt(0)}
            </div>
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold truncate">{name}</p>
                <p className="text-xs text-muted-foreground capitalize">{role}</p>
              </div>
            )}
          </div>
          <Button 
            variant="ghost" 
            onClick={signOut}
            className={cn(
              "w-full mt-4 justify-start gap-3 text-destructive hover:bg-destructive/10 hover:text-destructive",
              collapsed ? "px-2" : ""
            )}
          >
            <LogOut size={18} />
            {!collapsed && <span>Sair</span>}
          </Button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-card border-t border-border flex items-center justify-around z-50 px-2 pb-safe">
        {links.slice(0, 4).map((link) => {
          const isActive = currentPath === link.href;
          return (
            <Link
              key={link.href}
              to={link.href as any}
              className={cn(
                "flex flex-col items-center gap-1 transition-all px-2 py-1 rounded-md",
                isActive ? "text-primary scale-110" : "text-muted-foreground"
              )}
            >
              <link.icon size={20} />
              <span className="text-[10px] font-medium">{link.label.split(' ')[0]}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
