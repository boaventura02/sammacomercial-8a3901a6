import * as React from "react";
import { Button } from "@/components/ui/button";

const navLinks = ["Services", "About Us", "Projects", "Team", "Contacts"];

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-8 lg:px-16 py-5 bg-transparent">
      <div className="text-foreground text-xl font-semibold tracking-tight">
        SENTINEL
      </div>

      <div className="hidden md:flex gap-8">
        {navLinks.map((link) => (
          <a
            key={link}
            href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}
            className="text-sm text-muted-foreground hover:text-foreground transition-colors uppercase tracking-widest"
          >
            {link}
          </a>
        ))}
      </div>

      <Button
        variant="navCta"
        size="lg"
        className="hidden md:inline-flex rounded-lg uppercase text-xs tracking-widest px-6"
      >
        Get Quote
      </Button>
    </nav>
  );
}
