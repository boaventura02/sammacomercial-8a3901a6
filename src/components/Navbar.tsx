import * as React from "react";
import { Button } from "@/components/ui/button";

const navLinks = ["Services", "About Us", "Projects", "Team", "Contacts"];

export function Navbar() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 flex justify-between items-center px-8 lg:px-16 py-8 bg-transparent">
      <div className="text-white text-2xl font-bold tracking-tighter uppercase italic">
        Sentinel<span className="text-[#2df42d]">.</span>
      </div>

      <div className="hidden md:flex gap-10">
        {navLinks.map((link) => (
          <a
            key={link}
            href={`#${link.toLowerCase().replace(/\s+/g, "-")}`}
            className="text-[11px] font-bold text-gray-400 hover:text-white transition-colors uppercase tracking-[0.25em]"
          >
            {link}
          </a>
        ))}
      </div>

      <Button
        variant="navCta"
        onClick={() => window.location.href = '/login'}
        className="hidden md:inline-flex rounded-none uppercase text-[10px] font-bold tracking-[0.2em] px-8 py-6 bg-white text-black hover:bg-[#2df42d] hover:text-black transition-all border-none"
      >
        Entrar
      </Button>
    </nav>
  );
}
