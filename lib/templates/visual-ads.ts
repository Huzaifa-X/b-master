import { TemplateDefinition } from './index';

export const visualAdsTemplate: TemplateDefinition = {
  id: "visual-ads",
  name: "Visual Ads",
  description: "AI-powered marketing visual creator for stunning ads and banners using Tailwind CSS",
  category: "Marketing",
  icon: "Image",
  files: {
    "package.json": JSON.stringify(
      {
        name: "visual-ads-creator",
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
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <link rel="icon" type="image/svg+xml" href="/vite.svg" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Unbounded:wght@400;500;600;700;800;900&family=Public+Sans:ital,wght@0,300;0,400;0,700;0,900;1,900&display=swap" rel="stylesheet">
    <title>AdStudio - Visual Ads Creator</title>
  </head>
  <body class="bg-[#050505] text-white">
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
        sans: ['"Public Sans"', 'system-ui', 'sans-serif'],
        display: ['"Unbounded"', 'system-ui', 'sans-serif'],
      },
      aspectRatio: {
        'story': '9/16',
        'banner': '728/90',
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
    @apply antialiased bg-[#050505] text-white selection:bg-pink-500 selection:text-white;
    font-family: 'Public Sans', sans-serif;
  }
}

.neo-blur {
  @apply bg-white/5 backdrop-blur-3xl border border-white/10;
}

.spinning {
  animation: spin 3s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes float {
  0%, 100% { transform: translateY(0) scale(1); }
  50% { transform: translateY(-20px) scale(1.05); }
}

.animate-float {
  animation: float 10s ease-in-out infinite;
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

    // --- DATA ---
    "src/data/constants.js": `import { Square, RectangleVertical, RectangleHorizontal, Monitor } from 'lucide-react'

export const formats = [
  { id: 'square', name: 'Square', icon: Square, size: '1080x1080', platform: 'Instagram Post' },
  { id: 'story', name: 'Story', icon: RectangleVertical, size: '1080x1920', platform: 'Instagram/TikTok' },
  { id: 'landscape', name: 'Landscape', icon: RectangleHorizontal, size: '1200x628', platform: 'Facebook/LinkedIn' },
  { id: 'banner', name: 'Banner', icon: Monitor, size: '728x90', platform: 'Web Display' },
]

export const colorThemes = [
  { id: 'sunset', name: 'Sunset', colors: ['#FF6B6B', '#FFA07A', '#FFD93D'] },
  { id: 'ocean', name: 'Ocean', colors: ['#4FACFE', '#00F2FE', '#43E97B'] },
  { id: 'royal', name: 'Royal', colors: ['#667EEA', '#764BA2', '#F093FB'] },
  { id: 'nature', name: 'Nature', colors: ['#11998E', '#38EF7D', '#56CCF2'] },
  { id: 'midnight', name: 'Midnight', colors: ['#232526', '#414345', '#5C5C5C'] },
  { id: 'candy', name: 'Candy', colors: ['#FF0080', '#FF8C00', '#40E0D0'] },
]

export const templates = [
  { id: 1, name: 'Product Showcase', category: 'E-commerce', preview: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' },
  { id: 2, name: 'Flash Sale', category: 'Promotion', preview: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)' },
  { id: 3, name: 'App Launch', category: 'Tech', preview: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)' },
  { id: 4, name: 'Event Promo', category: 'Events', preview: 'linear-gradient(135deg, #11998e 0%, #38ef7d 100%)' },
]`,

    // --- COMPONENTS ---
    "src/components/AdPreview.jsx": `import { formats, colorThemes } from '../data/constants'

export default function AdPreview({ format, theme, headline, subtext }) {
  const selectedFormat = formats.find(f => f.id === format)
  const selectedTheme = colorThemes.find(t => t.id === theme)

  const getAspectClass = () => {
    switch (format) {
      case 'square': return 'aspect-square max-h-[500px]'
      case 'story': return 'aspect-story max-h-[600px]'
      case 'landscape': return 'aspect-video w-full'
      case 'banner': return 'aspect-banner w-full'
      default: return 'aspect-square max-h-[500px]'
    }
  }

  const gradientStyle = selectedTheme
    ? \`linear-gradient(135deg, \${selectedTheme.colors[0]} 0%, \${selectedTheme.colors[1]} 50%, \${selectedTheme.colors[2] || selectedTheme.colors[1]} 100%)\`
    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'

  return (
    <div className={\`relative overflow-hidden flex flex-col items-center justify-center p-8 text-center shadow-2xl rounded-3xl mx-auto transition-all duration-700 \${getAspectClass()}\`}>
      <div className="absolute inset-0 transition-all duration-700" style={{ background: gradientStyle }} />
      
      {/* Decorative Blobs */}
      <div className="absolute top-0 left-0 w-64 h-64 bg-white/20 blur-[100px] rounded-full -translate-x-1/2 -translate-y-1/2 animate-pulse" />
      <div className="absolute bottom-0 right-0 w-80 h-80 bg-black/10 blur-[120px] rounded-full translate-x-1/3 translate-y-1/3" />
      
      <div className="relative z-10 flex flex-col items-center gap-6 max-w-sm">
        <h2 className="text-4xl md:text-5xl font-black font-display tracking-tight text-white leading-[0.9] drop-shadow-2xl">
            {headline || 'YOUR HEADLINE HERE'}
        </h2>
        <p className="text-white/80 font-bold text-sm md:text-base leading-snug drop-shadow-lg italic">
            {subtext || 'Add compelling subtext to capture attention and drive final engagement metrics.'}
        </p>
        <button className="mt-4 px-8 py-3 bg-white text-black rounded-full font-black uppercase text-xs tracking-widest shadow-xl hover:scale-105 transition-transform active:scale-95">
            Get Started Now
        </button>
      </div>

      <div className="absolute bottom-6 left-6 px-3 py-1 bg-black/20 backdrop-blur-md rounded-lg text-[8px] font-black uppercase tracking-[0.2em] text-white/50 border border-white/5">
        Format: {selectedFormat?.size}
      </div>
    </div>
  )
}`,

    "src/components/TemplateCard.jsx": `import { Eye, ArrowUpRight } from 'lucide-react'

export default function TemplateCard({ template, onClick }) {
  return (
    <button 
        onClick={onClick} 
        className="group relative h-40 overflow-hidden rounded-2xl bg-white/5 border border-white/10 hover:border-pink-500/50 transition-all"
    >
      <div className="absolute inset-0 opacity-40 group-hover:opacity-80 transition-opacity" style={{ background: template.preview }} />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex flex-col justify-end p-4 text-left">
          <span className="text-[8px] font-black uppercase tracking-widest text-white/50 mb-1">{template.category}</span>
          <h4 className="text-xs font-black text-white uppercase tracking-tighter group-hover:text-pink-400 transition-colors">{template.name}</h4>
      </div>
      <div className="absolute top-4 right-4 w-8 h-8 rounded-full bg-white/10 backdrop-blur-md border border-white/10 flex items-center justify-center opacity-0 group-hover:opacity-100 group-hover:translate-x-0 translate-x-4 transition-all duration-300">
        <ArrowUpRight size={14} className="text-white" />
      </div>
    </button>
  )
}`,

    // --- MAIN APP ---
    "src/App.jsx": `import { useState } from 'react'
import {
  Image, Sparkles, Download, RefreshCw, Palette, Type, Layout,
  Layers, Wand2, Check, ChevronRight, Zap, Share2, MousePointer2, Settings, Bell, Circle
} from 'lucide-react'
import { formats, colorThemes, templates } from './data/constants'
import AdPreview from './components/AdPreview'
import TemplateCard from './components/TemplateCard'

export default function App() {
  const [selectedFormat, setSelectedFormat] = useState('square')
  const [selectedTheme, setSelectedTheme] = useState('sunset')
  const [headline, setHeadline] = useState('DROP 01')
  const [subtext, setSubtext] = useState('The limited release. Available 12.01')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [notification, setNotification] = useState(null)

  const handleGenerate = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setIsGenerating(false)
      showNotification('AI Engine: Visual Strategy Applied')
    }, 2000)
  }

  const handleExport = () => {
    setIsExporting(true)
    setTimeout(() => {
      setIsExporting(false)
      showNotification('Asset exported to cloud storage')
    }, 2500)
  }

  const showNotification = (msg) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  return (
    <div className="max-w-[1600px] mx-auto min-h-screen py-8 px-6 lg:px-12 flex flex-col overflow-hidden">
        
      {/* Top Header */}
      <header className="flex items-center justify-between mb-12 relative z-50">
        <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-2xl shadow-white/5 group active:scale-90 transition-transform">
                <Image className="text-black group-hover:rotate-12 transition-transform" size={24} strokeWidth={2.5} />
            </div>
            <div>
                <h1 className="text-xl font-black font-display tracking-tight text-white leading-none mb-1">ADSTUDIO</h1>
                <p className="text-[8px] font-black uppercase tracking-[0.5em] text-white/30">Visual Intelligence Engine</p>
            </div>
        </div>

        <nav className="hidden md:flex items-center gap-8 px-8 py-3 neo-blur rounded-2xl relative">
            {['Canvas', 'Assets', 'Protocols', 'History'].map((item) => (
                <button key={item} className="text-[10px] font-black uppercase tracking-widest text-white/40 hover:text-white transition-colors">{item}</button>
            ))}
            <div className="absolute bottom-0 left-8 w-8 h-0.5 bg-pink-500 rounded-full" />
        </nav>

        <div className="flex items-center gap-4">
            <button className="w-10 h-10 flex items-center justify-center text-white/30 hover:text-white hover:bg-white/5 rounded-xl transition-all"><Bell size={18} /></button>
            <button className="flex items-center gap-2 px-5 py-2.5 bg-pink-500 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-pink-600 transition-all shadow-xl shadow-pink-500/20">
                Upgrade Pro
            </button>
        </div>
      </header>

      <main className="grid grid-cols-1 lg:grid-cols-12 gap-8 relative items-start">
        
        {/* Floating background elements */}
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-pink-500/5 blur-[150px] rounded-full -translate-y-1/2 translate-x-1/2 pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-[400px] h-[400px] bg-blue-500/5 blur-[120px] rounded-full translate-y-1/2 -translate-x-1/2 pointer-events-none" />

        {/* Editor Sidebar */}
        <div className="lg:col-span-4 space-y-6 relative z-10 lg:sticky lg:top-8">
            <div className="neo-blur rounded-[2rem] p-8 space-y-10">
                
                {/* Mode Switcher */}
                <div className="flex p-1 bg-black/40 rounded-xl border border-white/5">
                    <button className="flex-1 py-2 rounded-lg bg-white/10 text-white text-[10px] font-black uppercase tracking-widest">Layout</button>
                    <button className="flex-1 py-2 rounded-lg text-white/30 text-[10px] font-black uppercase tracking-widest hover:text-white/60 transition-colors">Effects</button>
                    <button className="flex-1 py-2 rounded-lg text-white/30 text-[10px] font-black uppercase tracking-widest hover:text-white/60 transition-colors">Nodes</button>
                </div>

                {/* Section: Format */}
                <section>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center justify-between">
                        <span>Physical Matrix</span>
                        <Layout size={12} className="text-pink-500" />
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {formats.map((format) => (
                            <button
                                key={format.id}
                                onClick={() => setSelectedFormat(format.id)}
                                className={\`group flex flex-col items-center justify-center p-6 border rounded-2xl transition-all \${
                                    selectedFormat === format.id 
                                        ? 'bg-white text-black border-white shadow-xl scale-[1.02]' 
                                        : 'bg-white/5 border-white/5 text-white hover:bg-white/10 hover:border-white/10'
                                }\`}
                            >
                                <format.icon className={\`mb-3 \${selectedFormat === format.id ? 'text-black' : 'text-white/40 group-hover:text-white/80'}\`} size={24} />
                                <span className="text-[10px] font-black uppercase tracking-widest mb-1">{format.name}</span>
                                <span className={\`text-[7px] font-black uppercase tracking-tighter \${selectedFormat === format.id ? 'text-black/50' : 'text-white/20'}\`}>{format.size}</span>
                            </button>
                        ))}
                    </div>
                </section>

                {/* Section: Themes */}
                <section>
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center justify-between">
                        <span>Chromatic Spectrum</span>
                        <Palette size={12} className="text-pink-500" />
                    </h3>
                    <div className="grid grid-cols-3 gap-3">
                        {colorThemes.map((theme) => (
                            <button
                                key={theme.id}
                                onClick={() => setSelectedTheme(theme.id)}
                                className={\`group relative aspect-square rounded-xl overflow-hidden border-2 transition-all p-1 \${
                                    selectedTheme === theme.id ? 'border-pink-500 scale-110 shadow-lg shadow-pink-500/20' : 'border-transparent hover:border-white/20'
                                }\`}
                                title={theme.name}
                            >
                                <div 
                                    className="w-full h-full rounded-lg"
                                    style={{ background: \`linear-gradient(135deg, \${theme.colors[0]} 0%, \${theme.colors[1]} 100%)\` }}
                                />
                                {selectedTheme === theme.id && <div className="absolute inset-0 flex items-center justify-center"><Check size={12} className="text-white drop-shadow-md" strokeWidth={4} /></div>}
                            </button>
                        ))}
                    </div>
                </section>

                {/* Section: Content */}
                <section className="space-y-6">
                    <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-white/40 mb-6 flex items-center justify-between">
                        <span>Text Information</span>
                        <Type size={12} className="text-pink-500" />
                    </h3>
                    <div className="space-y-4">
                        <div className="space-y-2">
                             <input
                                type="text"
                                value={headline}
                                onChange={(e) => setHeadline(e.target.value)}
                                className="w-full h-14 bg-black/40 border border-white/5 rounded-2xl px-6 text-sm font-black text-white outline-none focus:border-pink-500/50 transition-all placeholder:text-white/10 uppercase font-display tracking-tight"
                                placeholder="HEADLINE"
                            />
                        </div>
                        <div className="space-y-2">
                            <textarea
                                value={subtext}
                                onChange={(e) => setSubtext(e.target.value)}
                                rows={2}
                                className="w-full p-6 bg-black/40 border border-white/5 rounded-2xl text-xs font-bold text-white/60 outline-none focus:border-pink-500/50 transition-all placeholder:text-white/10 resize-none italic leading-relaxed"
                                placeholder="Enter supporting copy..."
                            />
                        </div>
                    </div>
                </section>

                 {/* AI Engine */}
                <div className="p-8 rounded-[1.5rem] bg-gradient-to-br from-pink-500/20 to-transparent border border-pink-500/20">
                    <div className="flex items-center gap-3 mb-4">
                        <div className="p-2 bg-pink-500 rounded-lg text-white"><Sparkles size={16} fill="white" /></div>
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-white">Neuro-Synthesis</h4>
                    </div>
                    <p className="text-[10px] font-bold text-white/40 mb-6 leading-relaxed">Let autonomous agents generate high-conversion headline vectors based on current visual cues.</p>
                    <button 
                        onClick={handleGenerate}
                        disabled={isGenerating}
                        className="w-full py-3 bg-pink-500 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-pink-600 active:scale-95 transition-all shadow-xl shadow-pink-500/20 flex items-center justify-center gap-2"
                    >
                        {isGenerating ? <RefreshCw size={14} className="spinning" /> : <Wand2 size={14} />}
                        Sync with AI
                    </button>
                </div>
            </div>
        </div>

        {/* Preview & Assets Column */}
        <div className="lg:col-span-8 space-y-8 relative z-10">
            {/* Live Preview Card */}
            <div className="neo-blur rounded-[3rem] p-10 lg:p-14 overflow-hidden relative">
                <div className="flex items-center justify-between mb-12 relative z-20">
                    <h3 className="text-xs font-black uppercase font-display tracking-[0.2em] italic flex items-center gap-3 bg-black/50 py-2 px-6 rounded-full border border-white/10 shadow-2xl">
                        <Circle size={8} fill="currentColor" className="text-pink-500 animate-pulse" /> Live Rendering
                    </h3>
                    <div className="flex items-center gap-3">
                        <button className="w-10 h-10 flex items-center justify-center bg-white/5 rounded-full text-white/40 hover:text-white transition-all"><Share2 size={18} /></button>
                        <button 
                            onClick={handleExport}
                            className="flex items-center gap-2 px-8 py-3 bg-white text-black rounded-full font-black text-xs uppercase tracking-widest hover:scale-105 transition-all"
                        >
                            <Download size={16} /> Fast Export
                        </button>
                    </div>
                </div>

                <div className="flex items-center justify-center py-10">
                     <AdPreview
                        format={selectedFormat}
                        theme={selectedTheme}
                        headline={headline}
                        subtext={subtext}
                    />
                </div>
            </div>

            {/* Quick Templates & Export Section */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* Templates List */}
                <div className="neo-blur rounded-[2.5rem] p-8">
                     <div className="flex items-center justify-between mb-8">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 leading-none">Global Presets</h4>
                        <button className="text-[8px] font-black uppercase tracking-widest text-pink-500">View Catalog</button>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        {templates.map((template) => (
                            <TemplateCard
                                key={template.id}
                                template={template}
                                onClick={() => {
                                    setHeadline(template.name.toUpperCase());
                                    setSubtext(\`Crafted using the \${template.name} preset module.\`);
                                    showNotification(\`Module: \${template.name} injected\`);
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Export Options */}
                <div className="neo-blur rounded-[2.5rem] p-8 flex flex-col">
                     <div className="flex items-center justify-between mb-8">
                        <h4 className="text-[10px] font-black uppercase tracking-[0.3em] text-white/40 leading-none">Binary Protocol</h4>
                        <Settings size={14} className="text-white/20" />
                    </div>
                    
                    <div className="space-y-4 flex-1">
                        {[
                            { format: 'PNG-HDR', desc: 'Lossless transparency, optimized for web', size: '2.4mb', icon: Image },
                            { format: 'JPEG-LT', desc: 'Standard compression, low latency', size: '0.8mb', icon: Zap },
                            { format: 'SVG-VEC', desc: 'Infinite scale, vector instructions', size: '0.1mb', icon: MousePointer2 }
                        ].map((opt) => (
                            <button 
                                key={opt.format}
                                onClick={handleExport}
                                className="w-full flex items-center justify-between p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-white/10 hover:bg-white/[0.07] transition-all group text-left"
                            >
                                <div className="flex items-center gap-5">
                                    <div className="w-12 h-12 bg-black/40 rounded-xl flex items-center justify-center text-white/20 group-hover:text-pink-500 transition-all border border-white/5">
                                        <opt.icon size={20} />
                                    </div>
                                    <div>
                                        <h5 className="text-[11px] font-black text-white tracking-widest uppercase mb-1">{opt.format}</h5>
                                        <p className="text-[9px] font-bold text-white/30 leading-none">{opt.desc}</p>
                                    </div>
                                </div>
                                <div className="text-[9px] font-black text-white/10 group-hover:text-white/40 transition-colors uppercase">{opt.size}</div>
                            </button>
                        ))}
                    </div>

                    <div className="mt-8 pt-6 border-t border-white/5 flex items-center gap-3">
                         <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-lg shadow-emerald-500/50" />
                         <span className="text-[8px] font-black uppercase tracking-[0.3em] text-white/20">Cloud Interface Online</span>
                    </div>
                </div>
            </div>
        </div>
      </main>

      {/* Neural Notification HUD */}
      {notification && (
        <div className="fixed bottom-12 right-12 z-[100] animate-in slide-in-from-right-10 duration-500">
            <div className="px-8 py-5 neo-blur rounded-2xl shadow-well flex items-center gap-5 border-l-4 border-l-pink-500 bg-black/80">
                <div className="p-2 bg-pink-500 text-white rounded-lg"><Zap size={18} fill="currentColor" strokeWidth={0} /></div>
                <div>
                    <p className="text-[9px] font-black uppercase tracking-[0.2em] text-white/30 mb-0.5">System Message</p>
                    <span className="text-sm font-black text-white tracking-tight leading-none uppercase">{notification}</span>
                </div>
            </div>
        </div>
      )}

      <footer className="mt-32 text-center pb-12 relative">
          <div className="h-px w-24 bg-white/10 mx-auto mb-10" />
          <p className="text-[8px] font-black uppercase tracking-[0.6em] text-white/20">Proprietary Binary Hub — ADSTUDIO v4.22.0.1</p>
      </footer>
    </div>
  )
}`,
  }
};
