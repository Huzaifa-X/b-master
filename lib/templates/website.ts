import { TemplateDefinition } from './index';

export const websiteTemplate: TemplateDefinition = {
  id: "website",
  name: "Website",
  description: "Modern landing page with hero, features, testimonials, and CTA sections using Tailwind CSS",
  category: "Marketing",
  icon: "Globe",
  files: {
    "package.json": JSON.stringify(
      {
        name: "website-landing",
        private: true,
        version: "0.0.0",
        type: "module",
        scripts: {
          dev: "vite",
          build: "vite build",
          preview: "vite preview",
        },
        dependencies: {
          react: "^18.2.0",
          "react-dom": "^18.2.0",
          "lucide-react": "^0.344.0",
          "framer-motion": "^11.0.8",
        },
        devDependencies: {
          "@vitejs/plugin-react": "^4.2.1",
          vite: "^5.0.8",
          tailwindcss: "^3.4.1",
          postcss: "^8.4.35",
          autoprefixer: "^10.4.17",
        },
      },
      null,
      2
    ),

    "index.html": `<!DOCTYPE html>
<html lang="en" class="scroll-smooth">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
    <title>Stellar - Future of Workflow</title>
  </head>
  <body class="bg-[#020617] text-slate-200">
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,

    "tailwind.config.js": `/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Outfit"', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          50: '#f5f3ff',
          100: '#ede9fe',
          200: '#ddd6fe',
          300: '#c4b5fd',
          400: '#a78bfa',
          500: '#8b5cf6',
          600: '#7c3aed',
          700: '#6d28d9',
          800: '#5b21b6',
          900: '#4c1d95',
          950: '#2e1065',
        },
      },
    },
  },
  plugins: [],
}`,

    "postcss.config.js": `export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
}`,

    "vite.config.js": `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,

    "src/index.css": `@tailwind base;
@tailwind components;
@tailwind utilities;

@layer base {
  body {
    @apply antialiased bg-[#020617] text-slate-200 selection:bg-primary-500 selection:text-white;
    font-family: 'Outfit', sans-serif;
  }
}

.glass-nav {
  @apply bg-[#020617]/40 backdrop-blur-2xl border-b border-white/5;
}

.glass-card {
  @apply bg-white/[0.03] backdrop-blur-3xl border border-white/10 shadow-2xl;
}

@keyframes slow-ping {
  0% { transform: scale(1); opacity: 0.8; }
  50% { transform: scale(1.2); opacity: 0.2; }
  100% { transform: scale(1); opacity: 0.8; }
}

.animate-slow-ping {
  animation: slow-ping 3s cubic-bezier(0, 0, 0.2, 1) infinite;
}`,

    "src/main.jsx": `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,

    // --- COMPONENTS ---
    "src/components/layout/Navbar.jsx": `import { useState } from 'react'
import { Menu, X, Zap, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function Navbar({ onGetStarted }) {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <nav className="fixed top-0 left-0 right-0 z-[100] glass-nav">
      <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between">
        <div className="flex items-center gap-3 group cursor-pointer">
          <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center shadow-lg shadow-primary-600/20 group-hover:rotate-12 transition-transform">
            <Zap className="text-white" size={20} fill="currentColor" strokeWidth={0} />
          </div>
          <span className="text-xl font-black tracking-tight text-white uppercase italic">Stellar</span>
        </div>

        <div className="hidden md:flex items-center gap-10">
          <a href="#features" className="text-sm font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest">Architect</a>
          <a href="#testimonials" className="text-sm font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest">Social</a>
          <a href="#pricing" className="text-sm font-bold text-slate-400 hover:text-white transition-colors uppercase tracking-widest">Protocol</a>
          <button 
            onClick={onGetStarted}
            className="px-6 py-2.5 bg-white text-black rounded-full font-black text-xs uppercase tracking-widest hover:bg-primary-500 hover:text-white active:scale-95 transition-all shadow-xl shadow-white/5"
          >
            Launch System
          </button>
        </div>

        <button onClick={() => setIsOpen(!isOpen)} className="md:hidden p-2 text-slate-400 active:scale-95 transition-transform">
          {isOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="absolute top-20 left-0 right-0 bg-[#020617]/95 backdrop-blur-3xl border-b border-white/5 p-8 flex flex-col gap-6 md:hidden"
          >
            <a href="#features" className="text-lg font-black text-white italic uppercase tracking-tighter" onClick={() => setIsOpen(false)}>Architect</a>
            <a href="#testimonials" className="text-lg font-black text-white italic uppercase tracking-tighter" onClick={() => setIsOpen(false)}>Social</a>
            <a href="#pricing" className="text-lg font-black text-white italic uppercase tracking-tighter" onClick={() => setIsOpen(false)}>Protocol</a>
            <button className="w-full py-4 bg-primary-600 text-white rounded-2xl font-black uppercase tracking-widest" onClick={onGetStarted}>Launch System</button>
          </motion.div>
        )}
      </AnimatePresence>
    </nav>
  )
}`,

    "src/components/layout/Footer.jsx": `import { Zap, Github, Twitter, Linkedin, ChevronRight } from 'lucide-react'

export default function Footer() {
  return (
    <footer className="relative z-10 py-20 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-6 grid grid-cols-1 md:grid-cols-4 gap-12 lg:gap-20">
        <div className="col-span-1 md:col-span-1">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center">
              <Zap className="text-white" size={16} fill="currentColor" strokeWidth={0} />
            </div>
            <span className="text-lg font-black text-white uppercase italic">Stellar</span>
          </div>
          <p className="text-sm font-medium text-slate-500 leading-relaxed mb-8">
            The neural interface for global workflow automation. Build with velocity, scale without limits.
          </p>
          <div className="flex items-center gap-4">
            {[Twitter, Github, Linkedin].map((Icon, i) => (
                <button key={i} className="w-10 h-10 rounded-xl bg-white/5 border border-white/5 flex items-center justify-center text-slate-500 hover:bg-white/10 hover:text-white transition-all">
                    <Icon size={18} />
                </button>
            ))}
          </div>
        </div>
        
        <div className="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-10">
            <div>
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] mb-6">Platform</h4>
                <ul className="space-y-4">
                    {['Automate', 'Integrate', 'Develop', 'Enterprise'].map(link => (
                        <li key={link}><a href="#" className="text-sm font-bold text-slate-500 hover:text-primary-400 transition-colors uppercase tracking-tighter">{link}</a></li>
                    ))}
                </ul>
            </div>
            <div>
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] mb-6">Connect</h4>
                <ul className="space-y-4">
                    {['Documentation', 'Community', 'Support', 'Status'].map(link => (
                        <li key={link}><a href="#" className="text-sm font-bold text-slate-500 hover:text-primary-400 transition-colors uppercase tracking-tighter">{link}</a></li>
                    ))}
                </ul>
            </div>
            <div className="col-span-2 sm:col-span-1">
                <h4 className="text-[10px] font-black text-white uppercase tracking-[0.3em] mb-6">Stay Synced</h4>
                <div className="relative group">
                    <input type="email" placeholder="NEURAL_MAIL@PRO.COM" className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-xs font-bold text-white outline-none focus:border-primary-500 transition-all placeholder:text-slate-700" />
                    <button className="absolute right-2 top-2 w-8 h-8 bg-primary-600 rounded-lg flex items-center justify-center text-white active:scale-90 transition-transform"><ChevronRight size={16} /></button>
                </div>
            </div>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 mt-20 pt-8 border-t border-white/5 text-center flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-[10px] font-black uppercase tracking-[0.4em] text-slate-700">© 2024 STELLAR_PROTOCOL. ALL SYSTEMS OPERATIONAL.</p>
          <div className="flex gap-8">
              <a href="#" className="text-[9px] font-black uppercase tracking-widest text-slate-700 hover:text-slate-400 transition-colors">Privacy_v2.1</a>
              <a href="#" className="text-[9px] font-black uppercase tracking-widest text-slate-700 hover:text-slate-400 transition-colors">Terms_Gen-X</a>
          </div>
      </div>
    </footer>
  )
}`,

    "src/components/sections/Hero.jsx": `import { ArrowRight, Star, Sparkles, Play } from 'lucide-react'
import { motion } from 'framer-motion'

export default function Hero({ onGetStarted }) {
  return (
    <section className="relative pt-40 pb-32 overflow-hidden">
      {/* Neural Background Components */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-primary-600/10 blur-[150px] rounded-full -translate-y-1/2 pointer-events-none" />
      <div className="absolute top-[20%] right-0 w-[400px] h-[400px] bg-purple-600/5 blur-[120px] rounded-full pointer-events-none" />
      
      <div className="max-w-7xl mx-auto px-6 text-center relative z-10">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8 }}
          className="inline-flex items-center gap-2 px-4 py-2 bg-white/5 border border-white/10 rounded-full mb-10 shadow-2xl backdrop-blur-xl"
        >
          <span className="w-2 h-2 rounded-full bg-primary-500 animate-slow-ping" />
          <span className="text-[10px] font-black uppercase tracking-[0.25em] text-primary-400 italic">v2.0_The_Singularity_Release</span>
        </motion.div>

        <motion.h1 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.2 }}
          className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tighter text-white leading-[0.9] mb-8 uppercase italic"
        >
          Architect your<br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary-400 via-purple-400 to-primary-500 drop-shadow-2xl">future_state</span>
        </motion.h1>

        <motion.p 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.8, delay: 0.4 }}
          className="text-lg md:text-xl font-bold text-slate-400 max-w-2xl mx-auto mb-12 leading-relaxed"
        >
          The all-in-one solution for modern hyper-growth businesses. Streamline neural inputs, boost global productivity, and scale with infinite confidence.
        </motion.p>

        <motion.div 
           initial={{ opacity: 0, y: 20 }}
           animate={{ opacity: 1, y: 0 }}
           transition={{ duration: 0.8, delay: 0.6 }}
           className="flex flex-col sm:flex-row items-center justify-center gap-6 mb-20"
        >
          <button 
            onClick={onGetStarted}
            className="w-full sm:w-auto px-10 py-5 bg-primary-600 text-white rounded-[1.5rem] font-black text-base uppercase tracking-widest shadow-2xl shadow-primary-600/30 hover:bg-primary-500 hover:translate-y-[-4px] transition-all flex items-center justify-center gap-3 animate-pulse-slow"
          >
            Start Free Trial <ArrowRight size={20} className="rotate-[-45deg]" />
          </button>
          <button className="w-full sm:w-auto px-10 py-5 bg-white/5 border border-white/10 text-white rounded-[1.5rem] font-black text-base uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-3 group">
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center group-hover:bg-primary-500 transition-colors"><Play size={14} fill="currentColor" className="ml-0.5" /></div>
            Watch Demo
          </button>
        </motion.div>

        <motion.div 
           initial={{ opacity: 0 }}
           animate={{ opacity: 1 }}
           transition={{ duration: 1.5, delay: 1 }}
           className="flex flex-col items-center gap-6"
        >
          <div className="flex -space-x-3">
            {[1,2,3,4,5].map(i => {
              const rotations = ['-rotate-12', '-rotate-6', 'rotate-0', 'rotate-6', 'rotate-12'];
              return (
                <div key={i} className={\`w-12 h-12 rounded-2xl border-2 border-[#020617] bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-[10px] font-black uppercase text-white shadow-xl shadow-black/40 \${rotations[i-1]}\`}>
                  U{i}
                </div>
              );
            })}
            <div className="w-12 h-12 rounded-2xl border-2 border-[#020617] bg-primary-500 flex items-center justify-center text-xs font-black text-white shadow-xl shadow-primary-500/20 z-10">
                +10K
            </div>
          </div>
          <div className="flex items-center gap-3 bg-white/5 py-2 px-4 rounded-full border border-white/5">
            <div className="flex gap-0.5">
                {[1,2,3,4,5].map(i => <Star key={i} size={14} className="text-amber-500 fill-amber-500" />)}
            </div>
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Trusted by Global Entities</span>
          </div>
        </motion.div>
      </div>

      {/* Hero Visual Mockup */}
      <div className="max-w-6xl mx-auto px-6 mt-24">
          <div className="glass-card rounded-[3rem] p-4 lg:p-6 rotate-1 hover:rotate-0 transition-transform duration-1000 shadow-well">
              <div className="bg-[#0b0f1a] rounded-[2.5rem] aspect-[16/9] overflow-hidden flex flex-col">
                  {/* Internal Mockup Header */}
                  <div className="h-14 border-b border-white/5 px-8 flex items-center justify-between">
                      <div className="flex gap-2">
                          <div className="w-2 h-2 rounded-full bg-rose-500/50" />
                          <div className="w-2 h-2 rounded-full bg-amber-500/50" />
                          <div className="w-2 h-2 rounded-full bg-emerald-500/50" />
                      </div>
                      <div className="w-32 h-2 bg-white/5 rounded-full" />
                      <div className="w-10 h-6 bg-primary-600/20 rounded-lg border border-primary-500/30" />
                  </div>
                  {/* Internal Mockup Content */}
                  <div className="flex-1 p-10 grid grid-cols-12 gap-8">
                      <div className="col-span-3 space-y-4">
                          {[1,2,3,4,5,6].map(i => <div key={i} className="h-8 bg-white/5 rounded-xl border border-white/5" />)}
                      </div>
                      <div className="col-span-9 glass-card rounded-3xl p-8 relative overflow-hidden">
                          <div className="w-20 h-20 bg-primary-500/20 blur-3xl absolute top-0 right-0 rounded-full" />
                          <div className="h-4 bg-white/10 rounded-full w-40 mb-10" />
                          <div className="grid grid-cols-2 gap-6">
                              <div className="h-40 bg-white/5 rounded-2xl border border-white/5" />
                              <div className="h-40 bg-white/5 rounded-2xl border border-white/5" />
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      </div>
    </section>
  )
}`,

    "src/components/sections/Features.jsx": `import { Zap, Shield, BarChart3, Fingerprint, Network, Cpu } from 'lucide-react'

export default function Features() {
  const features = [
    {
      icon: Zap,
      name: "Neural Acceleration",
      desc: "Protocol-level optimization for cross-chain execution speeds.",
      color: "text-amber-400 bg-amber-400/10",
      target: "zap"
    },
    {
      icon: Shield,
      name: "Encrypted Ledger",
      desc: "Post-quantum security layer for persistent data integrity.",
      color: "text-emerald-400 bg-emerald-400/10",
      target: "Shield"
    },
    {
      icon: BarChart3,
      name: "Insight Engine",
      desc: "Deep-learning visualizations mapped to real-time telemetry.",
      color: "text-primary-400 bg-primary-400/10",
      target: "BarChart3"
    },
    {
       icon: Fingerprint,
       name: "Identity Protocol",
       desc: "Zero-knowledge proofs for autonomous user authentication.",
       color: "text-rose-400 bg-rose-400/10",
       target: "Fingerprint"
    },
    {
       icon: Network,
       name: "Sync Mesh",
       desc: "Self-healing network architecture for global availability.",
       color: "text-blue-400 bg-blue-400/10",
       target: "Network"
    },
    {
       icon: Cpu,
       name: "Core Logic",
       desc: "Deterministic logic flows powered by decentralized computation.",
       color: "text-purple-400 bg-purple-400/10",
       target: "Cpu"
    }
  ]

  return (
    <section id="features" className="py-32 relative">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex flex-col md:flex-row items-end justify-between gap-10 mb-20 border-b border-white/5 pb-14">
          <div className="max-w-xl">
            <h2 className="text-[10px] font-black text-primary-500 uppercase tracking-[0.4em] mb-4">Functional Suite</h2>
            <h3 className="text-4xl md:text-5xl font-black text-white italic tracking-tighter uppercase leading-none">
              Everything required for <span className="text-slate-500">global_dominance</span>
            </h3>
          </div>
          <p className="text-sm font-bold text-slate-500 max-w-sm leading-relaxed mb-1 italic">
            A comprehensive stack of modular tools designed to enhance operational capability across the corporate grid.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, i) => (
            <div key={i} className="glass-card rounded-[2.5rem] p-10 hover:bg-white/[0.05] hover:-translate-y-2 transition-all duration-500 group">
              <div className={\`w-14 h-14 \${feature.color} rounded-2xl flex items-center justify-center mb-8 border border-white/5 group-hover:scale-110 group-hover:rotate-12 transition-transform\`}>
                <feature.icon size={26} strokeWidth={2.5} />
              </div>
              <h4 className="text-lg font-black text-white uppercase italic tracking-tight mb-4 group-hover:text-primary-400 transition-colors">
                  {feature.name}
              </h4>
              <p className="text-sm font-medium text-slate-500 leading-relaxed">
                  {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}`,

    "src/components/sections/Testimonials.jsx": `import { Star, Quote } from 'lucide-react'

export default function Testimonials() {
  const testimonials = [
    {
      quote: "The interface mapped directly to our cognitive workflow. Velocity increased by an average of 42% in sector-7.",
      author: "SARAH_J",
      role: "Lead Architect, NEXUS",
      avatarCat: "gradient-to-tr from-pink-500 to-rose-500"
    },
    {
      quote: "Deployment reliability has hit 100% since protocol integration. The best investment this cycle.",
      author: "M_CHEN",
      role: "CTO, OMEGA_CORP",
      avatarCat: "gradient-to-tr from-blue-500 to-indigo-500"
    },
    {
      quote: "Simple. Brutalist. Powerful. STELLAR is exactly what was needed for the next phase of our expansion.",
      author: "E.DAVIS",
      role: "Strategic Ops, GRID",
      avatarCat: "gradient-to-tr from-emerald-500 to-teal-500"
    }
  ]

  return (
    <section id="testimonials" className="py-32 relative bg-white/[0.01]">
      <div className="max-w-7xl mx-auto px-6">
        <div className="text-center mb-24">
            <div className="w-16 h-16 bg-white/5 border border-white/10 rounded-3xl flex items-center justify-center mx-auto mb-8">
                <Quote className="text-primary-500" size={32} fill="currentColor" />
            </div>
            <h2 className="text-4xl md:text-5xl font-black text-white uppercase italic tracking-tighter leading-none mb-6">Social_Feedback_Loop</h2>
            <p className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Verified Signals from Leading Entities</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-20">
          {testimonials.map((t, index) => (
            <div key={index} className="glass-card rounded-[3rem] p-10 flex flex-col justify-between relative">
              <div className="flex gap-0.5 mb-8">
                {[1,2,3,4,5].map(i => <Star key={i} size={12} className="text-primary-500 fill-primary-500" />)}
              </div>
              <p className="text-lg font-bold text-white leading-snug italic mb-10 text-pretty">
                "{t.quote}"
              </p>
              <div className="flex items-center gap-4 border-t border-white/5 pt-8">
                <div className={\`w-12 h-12 rounded-2xl bg-gradient-to-tr \${t.avatarCat} shadow-lg shadow-black/40 rotate-6\`} />
                <div>
                  <div className="text-xs font-black text-white uppercase tracking-widest leading-none mb-1">{t.author}</div>
                  <div className="text-[10px] font-black text-slate-500 uppercase tracking-tighter italic">{t.role}</div>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="flex flex-wrap justify-center items-center gap-x-16 gap-y-10 opacity-20 grayscale hover:grayscale-0 transition-all duration-700">
            {['LOGOS', 'ORACLE', 'PRIME', 'AETHER', 'ZENITH'].map(logo => (
                <span key={logo} className="text-xl font-black uppercase italic tracking-[0.2em]">{logo}</span>
            ))}
        </div>
      </div>
    </section>
  )
}`,

    "src/components/sections/CTA.jsx": `import { ArrowRight, Sparkles, Binary } from 'lucide-react'

export default function CTA({ onGetStarted }) {
  return (
    <section className="py-32 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-primary-600/5 blur-[120px] rounded-full translate-x-1/2 -translate-y-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-600/5 blur-[120px] rounded-full -translate-x-1/2 translate-y-1/2 pointer-events-none" />

      <div className="max-w-7xl mx-auto px-6">
        <div className="glass-card rounded-[4rem] p-12 lg:p-24 text-center relative overflow-hidden group">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary-500 to-transparent opacity-50" />
          
          <div className="relative z-10 max-w-3xl mx-auto">
            <div className="w-20 h-20 bg-primary-600 rounded-[2rem] flex items-center justify-center mx-auto mb-10 shadow-2xl shadow-primary-600/20 group-hover:rotate-[360deg] transition-transform duration-1000">
                <Binary className="text-white" size={32} strokeWidth={2.5} />
            </div>

            <h2 className="text-4xl md:text-6xl font-black text-white uppercase italic tracking-tighter leading-[0.9] mb-8">Ready to initiate the <span className="text-primary-500 underline decoration-white/10 underline-offset-8">next_phase</span> of expansion?</h2>
            <p className="text-lg font-bold text-slate-500 mb-14 text-pretty">
                Join the network of 10,000+ top-tier businesses automating their operations with the Stellar Protocol. Infinite scalability awaits.
            </p>
            
            <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <button 
                onClick={onGetStarted}
                className="w-full sm:w-auto px-12 py-6 bg-white text-black rounded-[2rem] font-black text-lg uppercase tracking-widest shadow-2xl hover:bg-primary-600 hover:text-white hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-3 group/btn"
                >
                Finalize Onboarding <Sparkles size={20} className="group-hover/btn:rotate-12 transition-transform" />
                </button>
                <button className="w-full sm:w-auto px-10 py-5 bg-white/5 border border-white/10 text-white rounded-[2rem] font-black text-sm uppercase tracking-widest hover:bg-white/10 transition-all">
                    Inquire Protocol
                </button>
            </div>

            <div className="mt-14 flex items-center justify-center gap-8 opacity-40">
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> No Card Required</div>
                <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest"><div className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Cancel Anytime</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}`,

    "src/components/LeadForm.jsx": `import { useState } from 'react'
import { X, Sparkles, Send, ShieldCheck } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

export default function LeadForm({ onClose }) {
  const [step, setStep] = useState('form')
  const [formData, setFormData] = useState({ name: '', email: '', company: '' })

  const handleSubmit = (e) => {
    e.preventDefault()
    setStep('success')
  }

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-[#020617]/80 backdrop-blur-3xl"
        onClick={onClose}
      />
      
      <motion.div 
        initial={{ opacity: 0, scale: 0.9, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.9, y: 20 }}
        className="relative w-full max-w-lg glass-card rounded-[3rem] p-10 lg:p-14 overflow-hidden"
      >
        <button onClick={onClose} className="absolute top-8 right-8 text-slate-500 hover:text-white transition-colors">
          <X size={24} />
        </button>

        <AnimatePresence mode="wait">
          {step === 'form' ? (
            <motion.div 
              key="form"
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <div className="mb-10">
                <div className="w-14 h-14 bg-primary-600 rounded-2xl flex items-center justify-center mb-6 shadow-xl shadow-primary-600/20">
                    <Sparkles size={28} className="text-white" fill="white" />
                </div>
                <h2 className="text-3xl font-black text-white italic uppercase tracking-tighter leading-[0.9] mb-4">Request Access</h2>
                <p className="text-slate-500 font-bold text-sm uppercase tracking-widest">Protocol Version_Active</p>
              </div>

              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Full Identity</label>
                    <input 
                        required
                        type="text" 
                        placeholder="John_Doe"
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-bold text-white outline-none focus:border-primary-500 transition-all placeholder:text-slate-800"
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Neural Mail</label>
                    <input 
                        required
                        type="email" 
                        placeholder="JD@ORG.GLOBAL"
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-bold text-white outline-none focus:border-primary-500 transition-all placeholder:text-slate-800"
                        value={formData.email}
                        onChange={e => setFormData({...formData, email: e.target.value})}
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-[0.2em] pl-1">Entitiy Handle</label>
                    <input 
                        type="text" 
                        placeholder="CORP_HUB"
                        className="w-full h-14 bg-white/5 border border-white/10 rounded-2xl px-6 text-sm font-bold text-white outline-none focus:border-primary-500 transition-all placeholder:text-slate-800"
                        value={formData.company}
                        onChange={e => setFormData({...formData, company: e.target.value})}
                    />
                </div>

                <div className="pt-6">
                    <button type="submit" className="w-full py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-primary-500 hover:text-white active:scale-95 transition-all shadow-xl shadow-white/5 flex items-center justify-center gap-3">
                        Initiate Sequence <Send size={18} />
                    </button>
                    <div className="mt-8 flex items-center justify-center gap-2 text-[8px] font-black text-slate-700 uppercase tracking-widest">
                        <ShieldCheck size={12} className="text-emerald-500" /> TLS_256_SECURED CONNECTION_ENABLED
                    </div>
                </div>
              </form>
            </motion.div>
          ) : (
            <motion.div 
               key="success"
               initial={{ opacity: 0, scale: 0.9 }}
               animate={{ opacity: 1, scale: 1 }}
               className="text-center py-10"
            >
              <div className="w-20 h-20 bg-emerald-500/10 text-emerald-500 rounded-3xl flex items-center justify-center mx-auto mb-10 border border-emerald-500/20 shadow-2xl shadow-emerald-500/10">
                <Send size={40} strokeWidth={2.5} />
              </div>
              <h2 className="text-4xl font-black text-white italic uppercase tracking-tighter leading-[0.9] mb-4">Transmission Received</h2>
              <p className="text-slate-400 font-bold mb-10 text-pretty">We have indexed your identity protocol. An autonomous onboarding specialist will initiate contact within 24 hours.</p>
              <button 
                onClick={onClose}
                className="w-full py-5 bg-white text-black rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-emerald-500 hover:text-white transition-all shadow-xl shadow-white/5"
              >
                Return to Matrix
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    </div>
  )
}`,

    "src/App.jsx": `import React, { useState } from 'react'
import Navbar from './components/layout/Navbar'
import Hero from './components/sections/Hero'
import Features from './components/sections/Features'
import Testimonials from './components/sections/Testimonials'
import CTA from './components/sections/CTA'
import Footer from './components/layout/Footer'
import LeadForm from './components/LeadForm'
import { AnimatePresence } from 'framer-motion'

export default function App() {
  const [showLead, setShowLead] = useState(false)

  const openModal = () => {
    setShowLead(true)
    document.body.style.overflow = 'hidden'
  }

  const closeModal = () => {
    setShowLead(false)
    document.body.style.overflow = 'auto'
  }

  return (
    <div className="bg-[#020617] text-slate-200">
      <Navbar onGetStarted={openModal} />
      
      <main>
        <Hero onGetStarted={openModal} />
        <Features />
        <Testimonials />
        <CTA onGetStarted={openModal} />
      </main>

      <Footer />

      <AnimatePresence>
        {showLead && <LeadForm onClose={closeModal} />}
      </AnimatePresence>
      
      {/* Global Grain/Noise Overlay */}
      <div className="fixed inset-0 pointer-events-none opacity-[0.03] bg-[url('https://grainy-gradients.vercel.app/noise.svg')] mix-blend-overlay z-[300]" />
    </div>
  )
}
`,
  }
};
