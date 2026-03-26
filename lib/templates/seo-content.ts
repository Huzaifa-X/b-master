import { TemplateDefinition } from './index';

export const seoContentTemplate: TemplateDefinition = {
  id: "seo-content",
  name: "SEO Content",
  description: "SEO analysis and content optimization tool powered by AI with Tailwind CSS",
  category: "Marketing",
  icon: "Search",
  files: {
    "package.json": JSON.stringify(
      {
        name: "seo-content-tool",
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
    <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <title>SEO Content Optimizer</title>
  </head>
  <body class="bg-[#0b0c10] text-slate-200">
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
        sans: ['"Plus Jakarta Sans"', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          50: '#f0f9ff',
          100: '#e0f2fe',
          200: '#bae6fd',
          300: '#7dd3fc',
          400: '#38bdf8',
          500: '#0ea5e9',
          600: '#0284c7',
          700: '#0369a1',
          800: '#075985',
          900: '#0c4a6e',
          950: '#082f49',
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
    @apply antialiased text-slate-200;
    background: radial-gradient(circle at top right, #1e293b, #0f172a, #0b0c10);
    min-height: 100vh;
  }
}

.glass-card {
  @apply bg-white/5 backdrop-blur-xl border border-white/10 shadow-2xl;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
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
    "src/data/mockData.js": `export const sampleKeywords = [
  { keyword: 'seo optimization', volume: 12500, difficulty: 45, trend: 'up' },
  { keyword: 'content marketing', volume: 8900, difficulty: 62, trend: 'up' },
  { keyword: 'keyword research', volume: 6700, difficulty: 38, trend: 'stable' },
  { keyword: 'search engine ranking', volume: 4200, difficulty: 55, trend: 'up' },
]

export const seoChecklist = [
  { text: 'Meta title is optimized (55 characters)', passed: true, priority: 'High' },
  { text: 'Meta description includes target keyword', passed: true, priority: 'High' },
  { text: 'H1 tag contains primary keyword', passed: true, priority: 'High' },
  { text: 'Images have alt text', passed: false, priority: 'Medium' },
  { text: 'Internal links present', passed: true, priority: 'Medium' },
  { text: 'Page loads under 3 seconds', passed: false, priority: 'High' },
]`,

    // --- COMPONENTS ---
    "src/components/SEOScore.jsx": `export default function SEOScore({ score }) {
  const getColor = () => {
    if (score >= 80) return 'stroke-emerald-500'
    if (score >= 60) return 'stroke-amber-500'
    return 'stroke-rose-500'
  }

  const getTextColor = () => {
    if (score >= 80) return 'text-emerald-500'
    if (score >= 60) return 'text-amber-500'
    return 'text-rose-500'
  }

  const circumference = 351.86; // 2 * PI * 56
  const offset = circumference - (score / 100) * circumference;

  return (
    <div className="relative w-32 h-32 shrink-0">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 128 128">
        <circle
          cx="64"
          cy="64"
          r="56"
          strokeWidth="10"
          fill="none"
          className="stroke-white/5"
        />
        <circle
          cx="64"
          cy="64"
          r="56"
          strokeWidth="10"
          fill="none"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          className={\`transition-all duration-1000 ease-out \${getColor()}\`}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className={\`text-3xl font-black tracking-tighter leading-none \${getTextColor()}\`}>{score}</span>
        <span className="text-[10px] font-black uppercase tracking-widest text-slate-500">Score</span>
      </div>
    </div>
  )
}`,

    "src/components/KeywordItem.jsx": `import { Hash, TrendingUp, BarChart3 } from 'lucide-react'

export default function KeywordItem({ keyword, volume, difficulty, trend }) {
  const getDifficultyColor = () => {
    if (difficulty <= 40) return 'text-emerald-400 bg-emerald-400/10'
    if (difficulty <= 70) return 'text-amber-400 bg-amber-400/10'
    return 'text-rose-400 bg-rose-400/10'
  }

  return (
    <div className="flex items-center justify-between p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-white/10 transition-all group">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-brand-500/10 text-brand-400 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
          <Hash size={18} />
        </div>
        <div>
          <span className="text-sm font-bold text-slate-100 block group-hover:text-brand-400 transition-colors">{keyword}</span>
          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-[10px] font-black uppercase tracking-widest text-slate-500 flex items-center gap-1">
                <BarChart3 size={10} /> {volume.toLocaleString()}
            </span>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-4">
        <span className={\`px-2.5 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest \${getDifficultyColor()}\`}>
          {difficulty}% KD
        </span>
        {trend === 'up' && (
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center animate-bounce">
                <TrendingUp size={14} />
            </div>
        )}
      </div>
    </div>
  )
}`,

    "src/components/ChecklistItem.jsx": `import { CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react'

export default function ChecklistItem({ text, passed, priority }) {
  return (
    <div className={\`flex items-start gap-4 p-4 rounded-2xl border transition-all \${passed ? 'bg-emerald-500/5 border-emerald-500/10 opacity-70' : 'glass-card border-rose-500/20'}\`}>
      <div className={\`mt-0.5 shrink-0 \${passed ? 'text-emerald-500' : 'text-rose-500'}\`}>
        {passed ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className={\`text-sm font-bold leading-snug mb-1 \${passed ? 'text-slate-400 line-through' : 'text-slate-100'}\`}>{text}</p>
        <span className={\`text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md border \${
            priority === 'High' ? 'bg-rose-500/10 text-rose-400 border-rose-500/10' : 'bg-slate-500/10 text-slate-400 border-slate-500/10'
        }\`}>
          {priority} Priority
        </span>
      </div>
      {!passed && <ChevronRight size={14} className="text-slate-600 mt-1" />}
    </div>
  )
}`,

    "src/components/SuggestionCard.jsx": `import { ArrowUpRight } from 'lucide-react'

export default function SuggestionCard({ title, description, icon: Icon }) {
  return (
    <button className="flex items-start gap-4 p-5 rounded-2xl bg-white/5 border border-white/5 hover:border-brand-500/30 hover:bg-white/10 transition-all text-left group">
      <div className="w-10 h-10 bg-brand-500/10 text-brand-400 rounded-xl flex items-center justify-center shrink-0 group-hover:bg-brand-500 group-hover:text-white transition-all">
        <Icon size={20} />
      </div>
      <div className="flex-1 min-w-0">
        <h4 className="text-sm font-black text-slate-100 mb-1 group-hover:text-brand-400 transition-colors uppercase tracking-tight">{title}</h4>
        <p className="text-xs font-medium text-slate-500 leading-relaxed group-hover:text-slate-300">{description}</p>
      </div>
      <ArrowUpRight size={16} className="text-slate-700 group-hover:text-brand-400 transition-colors" />
    </button>
  )
}`,

    // --- MAIN APP ---
    "src/App.jsx": `import { useState } from 'react'
import {
  Search, Target, FileText, Lightbulb, BarChart2, Globe, Hash, Zap, ArrowRight, RefreshCw,
  Sparkles, History, Settings, Bell, ChevronRight, LayoutGrid
} from 'lucide-react'
import SEOScore from './components/SEOScore'
import KeywordItem from './components/KeywordItem'
import ChecklistItem from './components/ChecklistItem'
import SuggestionCard from './components/SuggestionCard'
import { sampleKeywords, seoChecklist } from './data/mockData'

export default function App() {
  const [url, setUrl] = useState('')
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [hasResults, setHasResults] = useState(true)
  const [activeAction, setActiveAction] = useState(null)
  const [score, setScore] = useState(72)
  const [notification, setNotification] = useState(null)

  const handleAnalyze = () => {
    if (!url.trim()) return
    setIsAnalyzing(true)
    setTimeout(() => {
      setIsAnalyzing(false)
      setHasResults(true)
      setScore(Math.floor(Math.random() * 20) + 75)
      showNotification('AI Engine: Content Indexed Successfully')
    }, 2000)
  }

  const handleAction = (actionName) => {
    setActiveAction(actionName)
    setTimeout(() => {
      setActiveAction(null)
      showNotification(\`Successfully generated \${actionName}\`)
    }, 1500)
  }

  const showNotification = (msg) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3500)
  }

  return (
    <div className="max-w-7xl mx-auto min-h-screen py-10 px-6 font-sans">
      {/* Sidebar Sim (Nav) */}
      <nav className="fixed left-6 top-1/2 -translate-y-1/2 hidden xl:flex flex-col gap-6 p-4 glass-card rounded-3xl z-50">
          <button className="w-12 h-12 flex items-center justify-center text-brand-400 hover:bg-brand-500 hover:text-white rounded-2xl transition-all"><LayoutGrid size={24} /></button>
          <button className="w-12 h-12 flex items-center justify-center text-slate-500 hover:bg-white/10 rounded-2xl transition-all"><Search size={24} /></button>
          <button className="w-12 h-12 flex items-center justify-center text-slate-500 hover:bg-white/10 rounded-2xl transition-all"><History size={24} /></button>
          <div className="h-px bg-white/10 w-8 mx-auto" />
          <button className="w-12 h-12 flex items-center justify-center text-slate-500 hover:bg-white/10 rounded-2xl transition-all"><Settings size={24} /></button>
      </nav>

      {/* Header */}
      <header className="flex flex-col md:flex-row items-center justify-between gap-6 mb-12">
        <div className="flex items-center gap-5">
          <div className="w-14 h-14 bg-gradient-to-tr from-brand-600 to-brand-400 rounded-2xl flex items-center justify-center shadow-xl shadow-brand-500/20 active:scale-95 transition-transform rotate-3">
            <Search className="text-white" size={30} strokeWidth={3} />
          </div>
          <div>
            <h1 className="text-3xl font-black tracking-tighter leading-none mb-1 text-white">SEO Indexer</h1>
            <p className="text-xs font-black uppercase tracking-[0.4em] text-slate-500">Autonomous Content Intelligence</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
            <button className="w-12 h-12 flex items-center justify-center glass-card rounded-2xl text-slate-400 hover:text-white transition-colors relative">
                <Bell size={20} />
                <span className="absolute top-3 right-3 w-2 h-2 bg-rose-500 rounded-full border-2 border-[#0b0c10]" />
            </button>
            <button 
                onClick={() => handleAction('Pro Upgrade')}
                className="flex items-center gap-3 px-6 py-4 bg-brand-500 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-brand-500/20 hover:bg-brand-600 hover:-translate-y-1 active:scale-95 transition-all"
            >
                <Sparkles size={16} />
                Upgrade Pro
            </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="grid grid-cols-1 lg:grid-cols-12 gap-10">
        
        {/* Left Column: Input & Checklist */}
        <div className="lg:col-span-8 space-y-10">
          
          {/* Analysis Form */}
          <div className="glass-card rounded-[2.5rem] p-10 relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-64 h-64 bg-brand-500/5 blur-[80px] rounded-full group-hover:scale-150 transition-transform duration-1000" />
            <h2 className="text-xl font-black text-white tracking-tight leading-none mb-8 uppercase italic flex items-center gap-3">
                <div className="w-2 h-6 bg-brand-500 rounded-full" />
                Initialize Audit
            </h2>
            <div className="flex flex-col sm:flex-row gap-4 relative z-10">
              <div className="flex-1 relative group/input">
                <Globe className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-500 group-focus-within/input:text-brand-400 transition-colors" size={20} />
                <input
                  type="text"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="Insert domain URL or content string..."
                  className="w-full h-16 bg-white/5 border border-white/10 rounded-[1.5rem] pl-16 pr-6 text-slate-100 font-bold outline-none focus:border-brand-500/50 transition-all placeholder:text-slate-600"
                />
              </div>
              <button
                onClick={handleAnalyze}
                disabled={isAnalyzing}
                className="h-16 px-8 bg-slate-100 text-slate-900 rounded-[1.5rem] font-black text-sm uppercase tracking-widest flex items-center justify-center gap-3 hover:bg-white active:scale-95 transition-all disabled:opacity-50 shadow-xl shadow-white/5"
              >
                {isAnalyzing ? (
                  <>
                    <RefreshCw className="spinning" size={20} strokeWidth={3} />
                    Processing
                  </>
                ) : (
                  <>
                    <Zap size={20} fill="currentColor" strokeWidth={0} />
                    Run Audit
                  </>
                )}
              </button>
            </div>
          </div>

          {hasResults && (
            <div className="space-y-10 animate-in slide-in-from-bottom-10 duration-1000">
                {/* Score Summary */}
                <div className="glass-card rounded-[2.5rem] p-10 flex flex-col md:flex-row items-center gap-10">
                    <SEOScore score={score} />
                    <div className="flex-1 text-center md:text-left">
                        <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-3">
                            {score > 80 ? 'Superior Optimization' : 'Optimization Signal Detected'}
                        </h3>
                        <p className="text-slate-400 font-medium text-lg mb-6 leading-snug">
                            {score > 80 
                                ? 'Your index score exceeds 92% of the global marketing pool.' 
                                : 'Baseline requirements met. Significant crawlability updates available.'}
                        </p>
                        <div className="flex flex-wrap justify-center md:justify-start gap-4">
                            <div className="px-4 py-2 bg-emerald-500/10 text-emerald-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-500/10">6 Audit Passes</div>
                            <div className="px-4 py-2 bg-rose-500/10 text-rose-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-rose-500/10">2 Critical Fixes</div>
                            <div className="px-4 py-2 bg-amber-500/10 text-amber-400 rounded-xl text-[10px] font-black uppercase tracking-widest border border-amber-500/10">3 Opportunities</div>
                        </div>
                    </div>
                </div>

                {/* Audit Checklist */}
                <div className="glass-card rounded-[2.5rem] p-10">
                    <div className="flex items-center justify-between mb-8 border-b border-white/5 pb-6">
                        <h3 className="text-lg font-black text-white tracking-widest uppercase italic flex items-center gap-3 leading-none">
                            <Target className="text-rose-500" size={20} />
                            Critical Protocols
                        </h3>
                        <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">System Live Audit</span>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {seoChecklist.map((item, index) => (
                            <ChecklistItem key={index} {...item} />
                        ))}
                    </div>
                </div>
            </div>
          )}
        </div>

        {/* Right Column: Keywords & AI */}
        <div className="lg:col-span-4 space-y-10">
            {hasResults && (
                <>
                    {/* Related Keywords */}
                    <div className="glass-card rounded-[2.5rem] p-10">
                        <div className="flex items-center justify-between mb-8">
                            <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] flex items-center gap-2">
                                <Hash className="text-brand-400" size={16} /> Data Vectors
                            </h3>
                            <button className="text-[10px] font-black text-brand-400 hover:text-brand-300 transition-colors uppercase tracking-widest">View All</button>
                        </div>
                        <div className="flex flex-col gap-4">
                            {sampleKeywords.map((keyword, index) => (
                                <KeywordItem key={index} {...keyword} />
                            ))}
                        </div>
                    </div>

                    {/* Quick AI Actions */}
                    <div className="glass-card rounded-[2.5rem] p-10 bg-gradient-to-br from-white/[0.07] to-transparent">
                        <h3 className="text-xs font-black text-white uppercase tracking-[0.2em] mb-8 flex items-center gap-2">
                            <Zap className="text-amber-500" size={16} fill="currentColor" /> Autonomous Actions
                        </h3>
                        <div className="flex flex-col gap-3">
                            {[
                                { name: 'Meta Tags', icon: FileText, color: 'text-brand-400', bg: 'bg-brand-500/10' },
                                { name: 'Content Ideas', icon: Lightbulb, color: 'text-amber-400', bg: 'bg-amber-500/10' },
                                { name: 'Market Intel', icon: BarChart2, color: 'text-purple-400', bg: 'bg-purple-500/10' }
                            ].map((action) => (
                                <button 
                                    key={action.name}
                                    onClick={() => handleAction(action.name)}
                                    disabled={activeAction}
                                    className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5 hover:bg-white/10 hover:border-white/10 transition-all group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className={\`w-10 h-10 \${action.bg} \${action.color} rounded-xl flex items-center justify-center group-hover:rotate-12 transition-transform\`}>
                                            {activeAction === action.name ? <RefreshCw className="spinning" size={18} /> : <action.icon size={18} />}
                                        </div>
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-300 group-hover:text-white">{action.name}</span>
                                    </div>
                                    <ChevronRight size={14} className="text-slate-600 group-hover:translate-x-1 transition-transform" />
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* AI Insights */}
                    <div className="relative group rounded-[2.5rem] p-10 bg-brand-500 shadow-2xl shadow-brand-500/40 overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/20 blur-3xl rounded-full translate-x-10 -translate-y-10 group-hover:scale-150 transition-transform duration-1000" />
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-white/20 rounded-lg"><Sparkles size={20} className="text-white" /></div>
                                <h3 className="text-sm font-black text-white uppercase tracking-[0.2em]">Neural Insights</h3>
                            </div>
                            <ul className="space-y-4">
                                {[
                                    'Inject cluster keywords for H2 nodes.',
                                    'Link structural FAQs for snippets.',
                                    'Compress vector payload for LCP optimization.'
                                ].map((tip, i) => (
                                    <li key={i} className="flex items-start gap-3 text-xs font-bold text-white/80 leading-snug">
                                        <ArrowRight size={14} className="mt-0.5 shrink-0 opacity-50" />
                                        {tip}
                                    </li>
                                ))}
                            </ul>
                            <button className="w-full mt-8 py-4 bg-white text-brand-600 rounded-2xl font-black text-[10px] uppercase tracking-[0.3em] active:scale-95 transition-all shadow-lg hover:bg-slate-50">
                                Expand Intelligence
                            </button>
                        </div>
                    </div>
                </>
            )}
        </div>
      </main>

      {/* Notifications */}
      {notification && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[100] animate-in slide-in-from-bottom-5 fade-in duration-300">
            <div className="px-6 py-4 bg-slate-100 text-slate-900 rounded-2xl shadow-2xl flex items-center gap-4 border border-white/20">
                <div className="w-8 h-8 bg-brand-500 rounded-lg flex items-center justify-center text-white"><Zap size={16} fill="currentColor" strokeWidth={0} /></div>
                <span className="text-sm font-black uppercase tracking-tight">{notification}</span>
            </div>
        </div>
      )}

      <footer className="mt-20 text-center pb-20 opacity-20">
          <p className="text-[10px] font-black text-white uppercase tracking-[0.6em]">Powered by B-Master Neural Audit Engine v2.0</p>
      </footer>
    </div>
  )
}`,
  }
};
