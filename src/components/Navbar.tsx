import { Button } from "@/components/ui/button";

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 px-6 md:px-10 py-6 flex items-center justify-between pointer-events-none">
      <div className="font-bold text-2xl tracking-tighter text-foreground pointer-events-auto">
        SAMMA<span className="text-primary">.</span>
      </div>
      
      <div className="hidden md:flex items-center gap-8 pointer-events-auto">
        <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sistema</a>
        <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Cidades</a>
        <a href="#" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sobre</a>
        <Button variant="default" className="bg-primary text-primary-foreground font-bold rounded-sm px-6">
          Acessar
        </Button>
      </div>
    </nav>
  );
}
