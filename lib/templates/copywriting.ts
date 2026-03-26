import { TemplateDefinition } from './index';

export const copywritingTemplate: TemplateDefinition = {
  id: "copywriting",
  name: "Copywriting",
  description: "AI-powered social media copy generator with Tailwind CSS",
  category: "Marketing",
  icon: "PenTool",
  files: {
    "package.json": JSON.stringify(
      {
        name: "copywriting-generator",
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
    <link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;500;600;700&display=swap" rel="stylesheet">
    <title>CopyGenius - AI Copywriting</title>
  </head>
  <body class="bg-slate-50 text-slate-900">
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
        sans: ['Sora', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: {
          DEFAULT: '#8B5CF6',
          dark: '#7C3AED',
          light: '#A78BFA',
          subtle: '#F5F3FF',
        }
      }
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
    font-family: 'Sora', system-ui, sans-serif;
    @apply bg-slate-50 text-slate-900;
    background: linear-gradient(135deg, #F8FAFC 0%, #EDE9FE 50%, #F8FAFC 100%);
    min-height: 100vh;
  }
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
    "src/data/constants.js": `import { Twitter, Instagram, Linkedin, Facebook, Mail } from 'lucide-react'

export const platforms = [
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, colorClass: 'bg-sky-500', charLimit: 280 },
  { id: 'instagram', name: 'Instagram', icon: Instagram, colorClass: 'bg-gradient-to-tr from-purple-500 to-pink-500', charLimit: 2200 },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, colorClass: 'bg-blue-600', charLimit: 3000 },
  { id: 'facebook', name: 'Facebook', icon: Facebook, colorClass: 'bg-blue-500', charLimit: 500 },
  { id: 'email', name: 'Email Subject', icon: Mail, colorClass: 'bg-emerald-500', charLimit: 60 },
]

export const tones = [
  { id: 'professional', name: 'Professional', emoji: '💼' },
  { id: 'casual', name: 'Casual', emoji: '😊' },
  { id: 'witty', name: 'Witty', emoji: '😏' },
  { id: 'urgent', name: 'Urgent', emoji: '🔥' },
  { id: 'inspiring', name: 'Inspiring', emoji: '✨' },
  { id: 'friendly', name: 'Friendly', emoji: '👋' },
]

export const sampleCopies = {
  twitter: [
    "🚀 Just launched our new feature and it's a game-changer! Say goodbye to manual work and hello to automation. Your productivity will thank you. #ProductivityHacks #TechNews",
    "The secret to success? It's not working harder—it's working smarter. Here's how we helped 10,000+ teams save 5 hours/week 👇 #WorkSmarter",
    "Tired of juggling multiple tools? We've got you covered. One platform. Endless possibilities. Try it free today! 💪"
  ],
  instagram: [
    "✨ Your success story starts here ✨\\n\\nWe believe in making the complex simple. That's why we built a solution that actually works for YOU.\\n\\n💡 Smart automation\\n⚡ Lightning fast\\n🎯 Results-driven\\n\\nReady to transform your workflow? Link in bio! 🔗\\n\\n#Productivity #Success #Innovation #WorkSmart #BusinessGrowth",
  ],
  linkedin: [
    "I've spent 10 years in this industry, and I've never seen anything like this.\\n\\nLast month, our team was drowning in manual processes. Today, we've automated 80% of our workflow.\\n\\nThe result?\\n→ 5 hours saved per team member, weekly\\n→ 40% reduction in errors\\n→ Team morale at an all-time high\\n\\nThe best investment isn't always money—it's finding the right tools.\\n\\nWhat's one tool that transformed your work? 👇"
  ]
}`,

    // --- COMPONENTS ---
    "src/components/CopyCard.jsx": `import { useState } from 'react'
import { Check, Copy, Heart, Share2 } from 'lucide-react'
import { platforms } from '../data/constants'

export default function CopyCard({ text, platform, onCopy, copied, isSaved, onToggleSave }) {
  const platformData = platforms.find(p => p.id === platform)
  const [sharing, setSharing] = useState(false)

  const handleShare = () => {
    setSharing(true)
    setTimeout(() => setSharing(false), 2000)
    if (navigator.share) {
      navigator.share({ title: 'Generated Copy', text: text })
    } else {
      navigator.clipboard.writeText(text)
    }
  }

  return (
    <div className="bg-white rounded-2xl border border-slate-200 p-6 shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-center mb-4">
        <div className={\`w-8 h-8 rounded-lg flex items-center justify-center text-white \${platformData?.colorClass}\`}>
          {platformData && <platformData.icon size={16} />}
        </div>
        <button onClick={() => onCopy(text)} className="p-2 hover:bg-slate-50 rounded-lg text-slate-400 hover:text-slate-900 transition-all">
          {copied ? <Check size={16} className="text-emerald-500" /> : <Copy size={16} />}
        </button>
      </div>
      <p className="text-[15px] leading-relaxed text-slate-700 mb-6 whitespace-pre-wrap">{text}</p>
      <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
        <button 
          onClick={onToggleSave} 
          className={\`p-2 rounded-lg transition-all \${isSaved ? 'text-rose-500 bg-rose-50' : 'text-slate-400 hover:bg-slate-50 hover:text-slate-900'}\`}
        >
          <Heart size={18} className={\`\${isSaved ? 'fill-current' : ''}\`} />
        </button>
        <button onClick={handleShare} className="p-2 rounded-lg text-slate-400 hover:bg-slate-50 hover:text-slate-900 transition-all">
          {sharing ? <Check size={18} className="text-emerald-500" /> : <Share2 size={18} />}
        </button>
        <span className="ml-auto text-[11px] font-bold text-slate-400 uppercase tracking-wider">{text.length} chars</span>
      </div>
    </div>
  )
}`,

    "src/components/TemplateCard.jsx": `export default function TemplateCard({ title, description, icon: Icon, onClick }) {
  return (
    <button onClick={onClick} className="flex flex-col p-4 rounded-xl border border-slate-200 bg-gradient-to-br from-white to-slate-50 text-left hover:border-purple-300 hover:shadow-md transition-all group active:scale-[0.98]">
      <div className="w-10 h-10 rounded-lg bg-purple-50 flex items-center justify-center text-purple-600 mb-3 group-hover:scale-110 transition-transform">
        <Icon size={20} />
      </div>
      <h4 className="font-bold text-slate-900 text-sm mb-1">{title}</h4>
      <p className="text-xs text-slate-500 line-clamp-1">{description}</p>
    </button>
  )
}`,

    // --- MAIN APP ---
    "src/App.jsx": `import { useState } from 'react'
import {
  PenTool, Sparkles, RefreshCw, MessageSquare, Megaphone, Target,
  Zap, ArrowRight
} from 'lucide-react'
import { platforms, tones, sampleCopies } from './data/constants'
import CopyCard from './components/CopyCard'
import TemplateCard from './components/TemplateCard'

export default function App() {
  const [topic, setTopic] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState('twitter')
  const [selectedTone, setSelectedTone] = useState('professional')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCopies, setGeneratedCopies] = useState([])
  const [savedCopies, setSavedCopies] = useState([])
  const [activeTab, setActiveTab] = useState('generate') // 'generate' or 'saved'
  const [copiedIndex, setCopiedIndex] = useState(null)

  const handleGenerate = () => {
    if (!topic.trim()) return
    setIsGenerating(true)
    setTimeout(() => {
      setGeneratedCopies(sampleCopies[selectedPlatform] || sampleCopies.twitter)
      setIsGenerating(false)
      setActiveTab('generate')
    }, 1500)
  }

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  const toggleSave = (text, platform) => {
    const existing = savedCopies.find(s => s.text === text)
    if (existing) {
      setSavedCopies(savedCopies.filter(s => s.text !== text))
    } else {
      setSavedCopies([{ text, platform, savedAt: Date.now() }, ...savedCopies])
    }
  }

  return (
    <div className="min-h-screen">
      <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 sticky top-0 z-50">
        <div className="max-w-[1200px] mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-purple-700 flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
              <PenTool size={20} />
            </div>
            <div>
              <h1 className="text-lg font-extrabold text-slate-900 tracking-tight leading-none">CopyGenius</h1>
              <p className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">AI-Powered Copywriting</p>
            </div>
          </div>
          <button 
            onClick={() => alert('Pro Plan billing modal would open here!')}
            className="flex items-center gap-2 px-4 py-2 bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-lg text-sm font-bold shadow-lg shadow-purple-500/20 hover:scale-[1.02] active:scale-95 transition-all"
          >
            <Sparkles size={16} />
            Pro Plan
          </button>
        </div>
      </header>

      <main className="max-w-[1200px] mx-auto px-6 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-5 gap-10">
          <div className="lg:col-span-2 space-y-6">
            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
              <h2 className="text-[15px] font-bold text-slate-900 mb-6 flex items-center gap-2 uppercase tracking-wide">
                <Target size={20} className="text-purple-600" />
                What's your topic?
              </h2>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="E.g., Launching a new productivity app that helps teams collaborate better..."
                className="w-full h-32 px-4 py-4 rounded-2xl border border-slate-100 bg-slate-50/50 outline-none focus:border-purple-500 focus:bg-white transition-all text-[15px] resize-none placeholder:text-slate-300"
              />
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
              <h2 className="text-[15px] font-bold text-slate-900 mb-6 uppercase tracking-wide">Choose Platform</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => setSelectedPlatform(platform.id)}
                    className={\`flex items-center gap-3 p-3 rounded-xl border-2 transition-all \${selectedPlatform === platform.id ? 'border-purple-600 bg-purple-50' : 'border-slate-50 hover:border-slate-200 bg-slate-50/30'}\`}
                  >
                    <div className={\`w-6 h-6 rounded-lg flex items-center justify-center text-white \${platform.colorClass}\`}>
                      <platform.icon size={12} />
                    </div>
                    <span className="text-[13px] font-bold text-slate-700 line-clamp-1">{platform.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
              <h2 className="text-[15px] font-bold text-slate-900 mb-6 uppercase tracking-wide">Select Tone</h2>
              <div className="flex flex-wrap gap-2">
                {tones.map((tone) => (
                  <button
                    key={tone.id}
                    onClick={() => setSelectedTone(tone.id)}
                    className={\`flex items-center gap-2 px-4 py-2 border-2 rounded-full transition-all text-sm font-bold \${selectedTone === tone.id ? 'border-purple-600 bg-purple-50 text-purple-700' : 'border-slate-50 hover:border-slate-200 text-slate-500'}\`}
                  >
                    <span>{tone.emoji}</span>
                    <span>{tone.name}</span>
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full p-5 bg-gradient-to-br from-purple-500 to-purple-700 text-white rounded-[2rem] font-bold text-lg flex items-center justify-center gap-3 shadow-xl shadow-purple-500/30 hover:shadow-2xl hover:shadow-purple-500/40 hover:-translate-y-0.5 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isGenerating ? (
                <>
                  <RefreshCw size={24} className="animate-spin" />
                  Generating Magic...
                </>
              ) : (
                <>
                  <Sparkles size={24} />
                  Generate Copy
                </>
              )}
            </button>

            <div className="bg-white rounded-[2rem] border border-slate-200 p-8 shadow-sm">
              <h2 className="text-[15px] font-bold text-slate-900 mb-6 uppercase tracking-wide">Quick Templates</h2>
              <div className="grid grid-cols-2 gap-3">
                <TemplateCard
                  icon={Megaphone}
                  title="Product Launch"
                  description="Announce your new product"
                  onClick={() => setTopic("Launching a new innovative product that solves a common problem")}
                />
                <TemplateCard
                  icon={Target}
                  title="Promotion"
                  description="Drive sales with urgency"
                  onClick={() => setTopic("Limited time offer with 50% discount on our premium plan")}
                />
                <TemplateCard
                  icon={MessageSquare}
                  title="Engagement"
                  description="Start a conversation"
                  onClick={() => setTopic("Share thoughts on industry trends and ask for audience opinions")}
                />
                <TemplateCard
                  icon={Zap}
                  title="Value Post"
                  description="Share tips & insights"
                  onClick={() => setTopic("Share 5 productivity tips that helped scale our business")}
                />
              </div>
            </div>
          </div>

          <div className="lg:col-span-3 space-y-8">
            <div className="flex items-center gap-1 p-1 bg-slate-100/50 rounded-2xl w-fit self-start">
              <button 
                onClick={() => setActiveTab('generate')} 
                className={\`px-6 py-2.5 rounded-xl text-sm font-bold transition-all \${activeTab === 'generate' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
              >
                Generated
              </button>
              <button 
                onClick={() => setActiveTab('saved')} 
                className={\`px-6 py-2.5 rounded-xl text-sm font-bold transition-all \${activeTab === 'saved' ? 'bg-white text-purple-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}\`}
              >
                Saved ({savedCopies.length})
              </button>
            </div>

            <div className="flex justify-between items-center bg-white px-8 py-4 rounded-2xl border border-slate-100 shadow-sm">
              <h2 className="text-xl font-extrabold text-slate-900">
                {activeTab === 'generate' ? 'Results' : 'Saved Collection'}
              </h2>
              {activeTab === 'generate' && generatedCopies.length > 0 && (
                <button onClick={handleGenerate} className="flex items-center gap-2 text-sm font-bold text-purple-600 hover:underline">
                  <RefreshCw size={14} />
                  Regenerate
                </button>
              )}
            </div>

            <div className="space-y-4">
              {activeTab === 'generate' ? (
                generatedCopies.length === 0 ? (
                  <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-[2rem] p-20 text-center animate-in fade-in duration-500">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-300 mx-auto mb-6 shadow-sm border border-slate-50">
                      <Sparkles size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">Ready to Create</h3>
                    <p className="text-slate-500 max-w-xs mx-auto text-sm">
                      Enter your topic on the left, choose a platform and tone, then click generate.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-5 duration-500">
                    {generatedCopies.map((copy, index) => (
                      <CopyCard
                        key={index}
                        text={copy}
                        platform={selectedPlatform}
                        onCopy={() => handleCopy(copy, index)}
                        copied={copiedIndex === index}
                        isSaved={savedCopies.some(s => s.text === copy)}
                        onToggleSave={() => toggleSave(copy, selectedPlatform)}
                      />
                    ))}
                  </div>
                )
              ) : (
                savedCopies.length === 0 ? (
                  <div className="bg-white/50 border-2 border-dashed border-slate-200 rounded-[2rem] p-20 text-center animate-in fade-in duration-500">
                    <div className="w-16 h-16 bg-white rounded-2xl flex items-center justify-center text-slate-200 mx-auto mb-6 shadow-sm border border-slate-50">
                      <Heart size={32} />
                    </div>
                    <h3 className="text-lg font-bold text-slate-900 mb-2">No Saved Copies</h3>
                    <p className="text-slate-500 max-w-xs mx-auto text-sm">
                      Click the heart icon on any generated copy to save it for later review.
                    </p>
                  </div>
                ) : (
                  <div className="grid gap-4 animate-in fade-in slide-in-from-bottom-5 duration-500">
                    {savedCopies.map((item, index) => (
                      <CopyCard
                        key={index}
                        text={item.text}
                        platform={item.platform}
                        onCopy={() => handleCopy(item.text, index)}
                        copied={copiedIndex === index}
                        isSaved={true}
                        onToggleSave={() => toggleSave(item.text, item.platform)}
                      />
                    ))}
                  </div>
                )
              )}
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-slate-800 rounded-[2rem] p-8 text-white shadow-xl shadow-slate-200/50">
              <h3 className="text-lg font-bold mb-6 flex items-center gap-3">
                <Zap size={24} className="text-yellow-400" />
                Pro Tips for Better Copy
              </h3>
              <ul className="space-y-4">
                {[
                  "Start with a hook that grabs attention in the first line",
                  "Use emojis strategically to break up text and add personality",
                  "End with a clear call-to-action to drive real engagement",
                  "A/B test different versions to see what resonates most"
                ].map((tip, i) => (
                  <li key={i} className="flex items-start gap-4 text-slate-300 text-[15px]">
                    <ArrowRight size={18} className="text-purple-400 mt-0.5 flex-shrink-0" />
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}`,
  }
};
