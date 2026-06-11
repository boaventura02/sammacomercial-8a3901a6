import * as React from "react";
import { Suspense, lazy } from "react";

const Spline = lazy(() => import("@splinetool/react-spline"));

export function HeroSection() {
  return (
    <section className="relative min-h-screen flex items-end bg-[#141414] overflow-hidden">
      {/* Spline 3D Background */}
      <div className="absolute inset-0 z-0">
        <Suspense fallback={<div className="absolute inset-0 bg-[#141414]" />}>
          <Spline
            scene="https://prod.spline.design/Slk6b8kz3LRlKiyk/scene.splinecode"
            className="w-full h-full"
          />
        </Suspense>
      </div>

      {/* Subtle Overlay to ensure readability while keeping Spline visible */}
      <div className="absolute inset-0 bg-black/20 z-[1] pointer-events-none" />

      {/* Content container - Bottom Left aligned */}
      <div className="relative z-10 pointer-events-none w-full max-w-4xl px-8 md:px-16 pb-16 md:pb-24">
        <div className="flex flex-col items-start text-left">
          <h1
            className="text-[clamp(3.5rem,10vw,7.5rem)] font-bold leading-[0.9] tracking-[-0.04em] text-white mb-6 uppercase opacity-0 animate-fade-up"
            style={{ animationDelay: "0.2s" }}
          >
            SENTINEL <span className="text-[#2df42d]">AI</span>
          </h1>

          <p
            className="text-white/90 text-[clamp(1.25rem,3vw,2.25rem)] font-light leading-tight mb-8 max-w-2xl opacity-0 animate-fade-up"
            style={{ animationDelay: "0.4s" }}
          >
            We implement security correctly.
          </p>

          <p
            className="text-gray-400 text-[clamp(1rem,1.8vw,1.4rem)] font-light leading-relaxed mb-10 max-w-xl opacity-0 animate-fade-up"
            style={{ animationDelay: "0.55s" }}
          >
            Enterprise security systems built in days. AI-powered surveillance
            deployed with zero-trust architecture. Smart access control set up
            for your entire facility. All of it done right, not just fast.
          </p>

          <div
            className="flex flex-wrap gap-4 opacity-0 animate-fade-up"
            style={{ animationDelay: "0.7s" }}
          >
            <button 
              onClick={() => window.location.href = '/login'}
              className="pointer-events-auto bg-[#2df42d] text-black px-10 py-5 text-sm font-bold uppercase tracking-widest rounded-sm cursor-pointer hover:bg-[#25cc25] transition-all active:scale-[0.97]"
            >
              Acessar SAMMA
            </button>
            <button className="pointer-events-auto bg-white text-black px-10 py-5 text-sm font-bold uppercase tracking-widest rounded-sm cursor-pointer hover:bg-gray-200 transition-all active:scale-[0.97]">
              Nossas Soluções
            </button>
          </div>

          <div 
            className="flex items-center gap-3 mt-12 opacity-0 animate-fade-up"
            style={{ animationDelay: "0.85s" }}
          >
            <div className="h-[1px] w-8 bg-[#2df42d]/50" />
            <p className="text-gray-500 text-[10px] md:text-xs font-medium uppercase tracking-[0.2em]">
              Trusted security partner • Columbus, OH • 12 systems deployed
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
