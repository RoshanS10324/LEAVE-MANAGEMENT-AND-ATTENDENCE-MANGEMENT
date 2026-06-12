import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  ArrowRight,
  Shield,
  Activity,
  Workflow,
  Zap,
  Globe,
  Users,
  Fingerprint,
  Calendar,
  Lock,
  ChevronRight,
  Menu,
  X,
  Database,
  BarChart
} from "lucide-react";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "ROR Technologies — Workforce Platform" },
      {
        name: "description",
        content: "The best way to manage your workforce. Deliver operational excellence at scale.",
      },
    ],
  }),
  component: LandingPage,
});

function LandingPage() {
  return (
    <div className="min-h-screen bg-black text-white selection:bg-white/20 selection:text-white font-sans antialiased overflow-x-hidden">
      {/* Radial glow background */}
      <div className="fixed inset-0 z-0 pointer-events-none flex justify-center pt-[20vh]">
        <div className="w-[800px] h-[600px] bg-white/[0.03] rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 flex flex-col min-h-screen">
        <Header />
        <main className="flex-1 flex flex-col">
          <Hero />
          <TrustBar />
          <Features />
          <DashboardPreview />
          <BottomCTA />
        </main>
        <Footer />
      </div>
    </div>
  );
}

function Logo() {
  return (
    <div className="flex items-center gap-2 z-20">
      <div className="flex h-10 items-center justify-center rounded-lg bg-white px-3 py-1 shadow-sm">
        <img src="/ror-logo.png/rorlogin2026-06-12%20091120.png" alt="ROR Technologies" className="h-6 w-auto object-contain" onError={(e) => { e.currentTarget.style.display = 'none'; e.currentTarget.parentElement!.innerHTML = '<span class="text-black font-bold">ROR Tech</span>'; }} />
      </div>
    </div>
  );
}

function Header() {
  const [open, setOpen] = useState(false);
  const nav = ["Product", "Features", "Customers", "Company"];
  
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-black/40 backdrop-blur-xl border-b border-white/5">
      <div className="mx-auto max-w-[1200px] px-6 h-16 flex items-center justify-between">
        <Logo />
        
        <nav className="hidden lg:flex items-center gap-8">
          {nav.map((n) => (
            <a
              key={n}
              href={`#${n.toLowerCase()}`}
              className="text-sm font-medium text-zinc-400 hover:text-white transition-colors"
            >
              {n}
            </a>
          ))}
        </nav>
        
        <div className="hidden lg:flex items-center gap-6">
          <Link to="/login" className="text-sm font-medium text-zinc-300 hover:text-white transition-colors">
            Log in
          </Link>
          <Button asChild className="bg-white hover:bg-zinc-200 text-black rounded-full px-5 py-2 font-semibold text-sm transition-colors h-9">
            <Link to="/login">Get started</Link>
          </Button>
        </div>

        <button className="lg:hidden text-zinc-400 hover:text-white" onClick={() => setOpen(!open)}>
          {open ? <X /> : <Menu />}
        </button>
      </div>
      
      {/* Mobile Nav */}
      {open && (
        <div className="lg:hidden absolute top-16 left-0 right-0 bg-[#0a0a0a] border-b border-white/10 p-6 flex flex-col gap-4 shadow-2xl">
          {nav.map((n) => (
            <a key={n} href={`#${n.toLowerCase()}`} className="text-lg font-medium text-zinc-300 hover:text-white">
              {n}
            </a>
          ))}
          <div className="h-px bg-white/10 my-2" />
          <Link to="/login" className="text-lg font-medium text-zinc-300 hover:text-white">
            Log in
          </Link>
          <Button className="bg-white text-black rounded-full mt-2 w-full font-semibold">
            Get started
          </Button>
        </div>
      )}
    </header>
  );
}

function Hero() {
  return (
    <section className="pt-40 pb-20 md:pt-48 md:pb-32 px-6 flex-1 flex flex-col justify-center relative">
      <div className="mx-auto max-w-[1200px] w-full grid lg:grid-cols-[1fr_1fr] gap-16 lg:gap-8 items-center">
        
        {/* Left Content */}
        <div className="max-w-xl z-10 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-white/10 bg-white/5 backdrop-blur-md text-xs font-medium text-zinc-300 mb-8 hover:bg-white/10 transition-colors cursor-pointer group">
            <span className="text-white">Announcing ROR Forward</span>
            <ChevronRight className="h-3.5 w-3.5 text-zinc-500 group-hover:text-white transition-colors" />
          </div>
          
          <h1 className="font-serif text-6xl sm:text-7xl lg:text-[84px] leading-[1.05] tracking-tight text-white mb-6">
            Workforce for<br />
            developers
          </h1>
          
          <p className="text-lg sm:text-xl text-zinc-400 leading-relaxed mb-10 max-w-md">
            The best way to reach humans instead of spam folders. Deliver operational excellence and workforce analytics at scale.
          </p>
          
          <div className="flex flex-wrap items-center gap-4">
            <Button asChild className="bg-white hover:bg-zinc-200 text-black rounded-full px-6 py-6 font-semibold text-base transition-colors shadow-[0_0_20px_rgba(255,255,255,0.15)]">
              <Link to="/login">Get started</Link>
            </Button>
            <Button variant="ghost" className="rounded-full px-6 py-6 font-medium text-base text-zinc-400 hover:text-white hover:bg-white/5 transition-colors">
              Documentation
            </Button>
          </div>
        </div>

        {/* Right Content - 3D Cube Grid */}
        <div className="relative h-[400px] sm:h-[500px] lg:h-[600px] w-full flex items-center justify-center lg:justify-end z-0">
          <ResendCube />
        </div>
      </div>
    </section>
  );
}

function ResendCube() {
  const coords = [-1, 0, 1];

  return (
    <div className="relative w-full h-full flex items-center justify-center pointer-events-none" style={{ perspective: '1200px' }}>
      <div className="relative w-[60px] h-[60px] preserve-3d animate-cube-spin">
        {/* Top Slice (y = -1) */}
        <div className="absolute inset-0 preserve-3d animate-slice-top">
          {coords.map(x => coords.map(z => <Cubelet key={`t-${x}-${z}`} x={x} y={-1} z={z} />))}
        </div>
        
        {/* Middle Slice (y = 0) */}
        <div className="absolute inset-0 preserve-3d">
          {coords.map(x => coords.map(z => <Cubelet key={`m-${x}-${z}`} x={x} y={0} z={z} />))}
        </div>
        
        {/* Bottom Slice (y = 1) */}
        <div className="absolute inset-0 preserve-3d animate-slice-bottom">
          {coords.map(x => coords.map(z => <Cubelet key={`b-${x}-${z}`} x={x} y={1} z={z} />))}
        </div>
      </div>

      <style>{`
        .preserve-3d { transform-style: preserve-3d; }
        
        /* Global slow rotation */
        @keyframes cube-spin {
          0% { transform: rotateX(-20deg) rotateY(0deg); }
          100% { transform: rotateX(-20deg) rotateY(360deg); }
        }
        
        /* Top slice solving animation */
        @keyframes slice-top {
          0%, 15% { transform: rotateY(0deg); }
          25%, 65% { transform: rotateY(90deg); }
          75%, 100% { transform: rotateY(0deg); }
        }
        
        /* Bottom slice solving animation */
        @keyframes slice-bottom {
          0%, 35% { transform: rotateY(0deg); }
          45%, 85% { transform: rotateY(-90deg); }
          95%, 100% { transform: rotateY(0deg); }
        }

        .animate-cube-spin { animation: cube-spin 24s linear infinite; }
        .animate-slice-top { animation: slice-top 10s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite; }
        .animate-slice-bottom { animation: slice-bottom 12s cubic-bezier(0.68, -0.55, 0.265, 1.55) infinite; }
      `}</style>
    </div>
  );
}

function Cubelet({ x, y, z }: { x: number; y: number; z: number }) {
  const size = 64; // 60px cube + 4px gap
  const half = 30;

  // Deterministic shading to simulate metallic ambient light
  const getBg = (faceIndex: number) => {
    // Top faces always catch the light strongly
    if (faceIndex === 5) return "bg-gradient-to-br from-[#3a3a3a] to-[#222]"; 
    // Bottom faces are in pure shadow
    if (faceIndex === 6) return "bg-[#050505]"; 

    // Pseudo-random distribution for sides to give varying metallic reflections
    const hash = Math.abs(Math.sin(x * 12.9898 + y * 78.233 + z * 37.719 + faceIndex * 11) * 43758.5453);
    const isCorner = Math.abs(x) + Math.abs(y) + Math.abs(z) === 3;
    const isEdge = Math.abs(x) === 1 || Math.abs(y) === 1 || Math.abs(z) === 1;

    if (isCorner && hash > 0.7) return "bg-gradient-to-br from-[#2a2a2a] to-[#1a1a1a]"; 
    if (isEdge && hash > 0.4) return "bg-gradient-to-br from-[#1a1a1a] to-[#111]"; 
    return "bg-[#0a0a0a]"; // dark matte core
  };

  const faceBase = "absolute top-0 left-0 w-[60px] h-[60px] border border-white/10 box-border";

  return (
    <div 
      className="absolute top-0 left-0 w-[60px] h-[60px] preserve-3d shadow-2xl"
      style={{ transform: `translate3d(${x * size}px, ${y * size}px, ${z * size}px)` }}
    >
      {/* Front */}
      <div className={`${faceBase} ${getBg(1)}`} style={{ transform: `rotateY(0deg) translateZ(${half}px)` }} />
      {/* Back */}
      <div className={`${faceBase} ${getBg(2)}`} style={{ transform: `rotateY(180deg) translateZ(${half}px)` }} />
      {/* Right */}
      <div className={`${faceBase} ${getBg(3)}`} style={{ transform: `rotateY(90deg) translateZ(${half}px)` }} />
      {/* Left */}
      <div className={`${faceBase} ${getBg(4)}`} style={{ transform: `rotateY(-90deg) translateZ(${half}px)` }} />
      {/* Top */}
      <div className={`${faceBase} ${getBg(5)}`} style={{ transform: `rotateX(90deg) translateZ(${half}px)` }} />
      {/* Bottom */}
      <div className={`${faceBase} ${getBg(6)}`} style={{ transform: `rotateX(-90deg) translateZ(${half}px)` }} />
    </div>
  );
}

function TrustBar() {
  const logos = [
    "Vercel", "Raycast", "Linear", "Supabase", "Dub", "Arc"
  ];
  return (
    <section id="customers" className="py-12 border-y border-white/5 bg-black/50 relative z-10">
      <div className="mx-auto max-w-[1200px] px-6">
        <p className="text-center text-sm font-medium text-zinc-500 mb-8">
          Trusted by the best modern teams
        </p>
        <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-8 opacity-50 grayscale hover:grayscale-0 transition-all duration-700">
          {logos.map(l => (
            <div key={l} className="text-xl font-bold tracking-tight text-white/80 hover:text-white transition-colors cursor-default">
              {l}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function Features() {
  const feats = [
    {
      icon: Shield,
      title: "Enterprise Security",
      desc: "Bank-grade encryption, SOC2 compliance, and fine-grained RBAC out of the box."
    },
    {
      icon: Zap,
      title: "Lightning Fast",
      desc: "Built on edge infrastructure to deliver sub-50ms responses globally."
    },
    {
      icon: Workflow,
      title: "Powerful Automations",
      desc: "Create complex approval matrices and logic flows without writing code."
    },
    {
      icon: Fingerprint,
      title: "Biometric Sync",
      desc: "Native integrations with top biometric hardware for real-time attendance."
    },
    {
      icon: BarChart,
      title: "Real-time Analytics",
      desc: "Live dashboards that turn raw operational data into actionable insights."
    },
    {
      icon: Globe,
      title: "Global Scale",
      desc: "Designed to handle millions of events for global enterprises seamlessly."
    }
  ];

  return (
    <section id="features" className="py-32 px-6 relative z-10">
      <div className="mx-auto max-w-[1200px]">
        <div className="max-w-2xl mb-20">
          <h2 className="font-serif text-4xl md:text-5xl tracking-tight text-white mb-6">
            Everything you need<br />to scale your team.
          </h2>
          <p className="text-lg text-zinc-400 leading-relaxed">
            A comprehensive suite of tools designed specifically for modern HR and operational teams who demand performance and reliability.
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {feats.map((f, i) => (
            <div 
              key={i} 
              className="group p-8 rounded-3xl bg-[#0a0a0a] border border-white/5 hover:border-white/10 hover:bg-[#111] transition-all duration-300"
            >
              <div className="h-12 w-12 rounded-xl bg-white/5 border border-white/10 grid place-items-center mb-6 group-hover:bg-white/10 transition-colors">
                <f.icon className="h-6 w-6 text-white opacity-80" strokeWidth={1.5} />
              </div>
              <h3 className="text-xl font-semibold text-white mb-3">{f.title}</h3>
              <p className="text-zinc-400 leading-relaxed text-sm">
                {f.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function DashboardPreview() {
  return (
    <section id="product" className="py-24 px-6 relative z-10 overflow-hidden">
      <div className="mx-auto max-w-[1200px]">
        <div className="rounded-[2.5rem] p-px bg-gradient-to-b from-white/15 to-transparent">
          <div className="rounded-[2.5rem] bg-[#050505] p-4 sm:p-8 lg:p-12 overflow-hidden relative">
            
            {/* Inner glowing orb */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[300px] bg-white/[0.04] blur-[100px] rounded-full pointer-events-none" />

            <div className="relative z-10 flex flex-col lg:flex-row gap-12 items-center">
              <div className="lg:w-1/3">
                <h2 className="font-serif text-3xl md:text-4xl tracking-tight text-white mb-4">
                  Beautifully designed.
                </h2>
                <p className="text-zinc-400 leading-relaxed mb-8">
                  A dark-mode first interface that reduces eye strain and looks incredible on any display. Fully responsive and lightning fast.
                </p>
                <ul className="space-y-4">
                  {["Keyboard shortcuts", "Command palette", "Custom views", "Dark mode first"].map(item => (
                    <li key={item} className="flex items-center gap-3 text-sm text-zinc-300">
                      <div className="h-5 w-5 rounded-full bg-white/10 flex items-center justify-center">
                        <div className="h-1.5 w-1.5 rounded-full bg-white" />
                      </div>
                      {item}
                    </li>
                  ))}
                </ul>
              </div>
              
              <div className="lg:w-2/3 w-full">
                {/* Mockup Window */}
                <div className="rounded-2xl border border-white/10 bg-[#0a0a0a] shadow-2xl overflow-hidden transform lg:translate-x-12 lg:scale-110 origin-left">
                  <div className="h-10 border-b border-white/5 flex items-center px-4 gap-2 bg-[#111]">
                    <div className="flex gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-white/10" />
                      <div className="w-3 h-3 rounded-full bg-white/10" />
                      <div className="w-3 h-3 rounded-full bg-white/10" />
                    </div>
                    <div className="mx-auto text-[10px] uppercase tracking-widest text-zinc-500 font-medium font-mono">
                      lams.app / dashboard
                    </div>
                  </div>
                  <div className="p-6 grid grid-cols-3 gap-4">
                    <div className="col-span-3 lg:col-span-2 space-y-4">
                      <div className="h-32 rounded-xl border border-white/5 bg-white/[0.02] p-4 flex flex-col justify-between">
                        <div className="text-xs text-zinc-500 font-medium">TOTAL REQUESTS</div>
                        <div className="text-4xl font-light text-white">8,249</div>
                      </div>
                      <div className="h-48 rounded-xl border border-white/5 bg-white/[0.02] p-4 relative overflow-hidden">
                        <div className="text-xs text-zinc-500 font-medium mb-4">ACTIVITY</div>
                        <div className="absolute bottom-0 left-0 right-0 h-24 bg-gradient-to-t from-white/5 to-transparent" />
                        <svg viewBox="0 0 100 40" className="w-full h-full preserve-aspect-ratio-none stroke-white/20 fill-transparent" strokeWidth="0.5">
                          <path d="M0 40 L 10 30 L 20 35 L 30 15 L 40 25 L 50 5 L 60 20 L 70 10 L 80 15 L 90 0 L 100 20" />
                        </svg>
                      </div>
                    </div>
                    <div className="col-span-3 lg:col-span-1 space-y-4">
                      {[1,2,3].map(i => (
                        <div key={i} className="h-24 rounded-xl border border-white/5 bg-white/[0.02] p-4 flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-white/5 border border-white/10" />
                          <div>
                            <div className="w-20 h-2.5 bg-white/20 rounded-full mb-2" />
                            <div className="w-12 h-2 bg-white/10 rounded-full" />
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function BottomCTA() {
  return (
    <section className="py-32 px-6 relative z-10 text-center">
      <div className="mx-auto max-w-2xl">
        <h2 className="font-serif text-4xl md:text-5xl tracking-tight text-white mb-6">
          Ready to transform your workforce?
        </h2>
        <p className="text-zinc-400 mb-10 text-lg">
          Join hundreds of modern enterprises already using ROR Technologies to scale their operations.
        </p>
        <Button asChild className="bg-white hover:bg-zinc-200 text-black rounded-full px-8 py-6 font-semibold text-base transition-colors shadow-[0_0_30px_rgba(255,255,255,0.15)]">
          <Link to="/login">Get started for free</Link>
        </Button>
      </div>
    </section>
  );
}

function Footer() {
  return (
    <footer id="company" className="border-t border-white/5 bg-[#050505] pt-16 pb-8 px-6 relative z-10">
      <div className="mx-auto max-w-[1200px] grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-8 mb-16">
        <div className="col-span-2 lg:col-span-2">
          <Logo />
          <p className="mt-4 text-sm text-zinc-500 max-w-xs">
            The operational backbone for modern enterprises. Designed with precision, built for scale.
          </p>
        </div>
        
        <div>
          <h4 className="text-white font-medium mb-4 text-sm">Product</h4>
          <ul className="space-y-3 text-sm text-zinc-500">
            <li><a href="#" className="hover:text-white transition-colors">Features</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Integrations</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Pricing</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Changelog</a></li>
          </ul>
        </div>
        
        <div>
          <h4 className="text-white font-medium mb-4 text-sm">Company</h4>
          <ul className="space-y-3 text-sm text-zinc-500">
            <li><a href="#" className="hover:text-white transition-colors">About Us</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Careers</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Blog</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Contact</a></li>
          </ul>
        </div>
        
        <div>
          <h4 className="text-white font-medium mb-4 text-sm">Legal</h4>
          <ul className="space-y-3 text-sm text-zinc-500">
            <li><a href="#" className="hover:text-white transition-colors">Privacy Policy</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Terms of Service</a></li>
            <li><a href="#" className="hover:text-white transition-colors">Security</a></li>
          </ul>
        </div>
      </div>
      
      <div className="mx-auto max-w-[1200px] pt-8 border-t border-white/5 flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-zinc-600">
        <p>© {new Date().getFullYear()} ROR Technologies. All rights reserved.</p>
        <div className="flex gap-4">
          <a href="#" className="hover:text-zinc-300">Twitter</a>
          <a href="#" className="hover:text-zinc-300">GitHub</a>
          <a href="#" className="hover:text-zinc-300">Discord</a>
        </div>
      </div>
    </footer>
  );
}
