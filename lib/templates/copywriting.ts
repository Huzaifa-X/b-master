import { TemplateDefinition } from './index';

export const copywritingTemplate: TemplateDefinition = {
  id: "copywriting",
  name: "Copywriting",
  description: "AI-powered social media copy generator for powerful marketing texts",
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
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.jsx"></script>
  </body>
</html>`,

    "vite.config.js": `import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
})`,

    "src/main.jsx": `import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)`,

    "src/App.jsx": `import { useState } from 'react'
import {
  PenTool, Sparkles, Copy, RefreshCw, Check, Twitter, Instagram,
  Linkedin, Facebook, Mail, MessageSquare, Megaphone, Target,
  Zap, ArrowRight, Heart, Share2
} from 'lucide-react'
import './App.css'

// Platform Icons
const platforms = [
  { id: 'twitter', name: 'Twitter/X', icon: Twitter, colorClass: 'platform-twitter', charLimit: 280 },
  { id: 'instagram', name: 'Instagram', icon: Instagram, colorClass: 'platform-instagram', charLimit: 2200 },
  { id: 'linkedin', name: 'LinkedIn', icon: Linkedin, colorClass: 'platform-linkedin', charLimit: 3000 },
  { id: 'facebook', name: 'Facebook', icon: Facebook, colorClass: 'platform-facebook', charLimit: 500 },
  { id: 'email', name: 'Email Subject', icon: Mail, colorClass: 'platform-email', charLimit: 60 },
]

// Copy Tones
const tones = [
  { id: 'professional', name: 'Professional', emoji: '💼' },
  { id: 'casual', name: 'Casual', emoji: '😊' },
  { id: 'witty', name: 'Witty', emoji: '😏' },
  { id: 'urgent', name: 'Urgent', emoji: '🔥' },
  { id: 'inspiring', name: 'Inspiring', emoji: '✨' },
  { id: 'friendly', name: 'Friendly', emoji: '👋' },
]

// Generated Copy Examples
const sampleCopies = {
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
}

// Copy Card Component
function CopyCard({ text, platform, onCopy, copied }) {
  const platformData = platforms.find(p => p.id === platform)

  return (
    <div className="copy-card">
      <div className="copy-card-header">
        <div className={\`platform-icon \${platformData?.colorClass}\`}>
          {platformData && <platformData.icon className="icon-sm" />}
        </div>
        <button onClick={() => onCopy(text)} className="copy-btn">
          {copied ? <Check className="icon-sm text-success" /> : <Copy className="icon-sm" />}
        </button>
      </div>
      <p className="copy-text">{text}</p>
      <div className="copy-card-footer">
        <button className="action-btn">
          <Heart className="icon-sm" />
        </button>
        <button className="action-btn">
          <Share2 className="icon-sm" />
        </button>
        <span className="char-count">{text.length} chars</span>
      </div>
    </div>
  )
}

// Template Card
function TemplateCard({ title, description, icon: Icon, onClick }) {
  return (
    <button onClick={onClick} className="template-card">
      <div className="template-icon">
        <Icon className="icon-md" />
      </div>
      <h4 className="template-title">{title}</h4>
      <p className="template-desc">{description}</p>
    </button>
  )
}

// Main App
export default function App() {
  const [topic, setTopic] = useState('')
  const [selectedPlatform, setSelectedPlatform] = useState('twitter')
  const [selectedTone, setSelectedTone] = useState('professional')
  const [isGenerating, setIsGenerating] = useState(false)
  const [generatedCopies, setGeneratedCopies] = useState([])
  const [copiedIndex, setCopiedIndex] = useState(null)

  const handleGenerate = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setGeneratedCopies(sampleCopies[selectedPlatform] || sampleCopies.twitter)
      setIsGenerating(false)
    }, 1500)
  }

  const handleCopy = (text, index) => {
    navigator.clipboard.writeText(text)
    setCopiedIndex(index)
    setTimeout(() => setCopiedIndex(null), 2000)
  }

  return (
    <div className="app-container">
      {/* Header */}
      <header className="header">
        <div className="header-content">
          <div className="brand">
            <div className="brand-icon">
              <PenTool className="icon-md" />
            </div>
            <div>
              <h1 className="brand-title">CopyGenius</h1>
              <p className="brand-subtitle">AI-Powered Copywriting</p>
            </div>
          </div>
          <button className="pro-btn">
            <Sparkles className="icon-sm" />
            Pro Plan
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="content-grid">
          {/* Input Section */}
          <div className="input-section">
            {/* Topic Input */}
            <div className="card">
              <h2 className="card-title">
                <Target className="icon-md text-primary" />
                What's your topic?
              </h2>
              <textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="E.g., Launching a new productivity app that helps teams collaborate better..."
                className="topic-input"
              />
            </div>

            {/* Platform Selection */}
            <div className="card">
              <h2 className="card-title">Choose Platform</h2>
              <div className="platform-grid">
                {platforms.map((platform) => (
                  <button
                    key={platform.id}
                    onClick={() => setSelectedPlatform(platform.id)}
                    className={\`platform-btn \${selectedPlatform === platform.id ? 'active' : ''}\`}
                  >
                    <div className={\`platform-icon-sm \${platform.colorClass}\`}>
                      <platform.icon className="icon-xs" />
                    </div>
                    <span className="platform-name">{platform.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Tone Selection */}
            <div className="card">
              <h2 className="card-title">Select Tone</h2>
              <div className="tone-grid">
                {tones.map((tone) => (
                  <button
                    key={tone.id}
                    onClick={() => setSelectedTone(tone.id)}
                    className={\`tone-btn \${selectedTone === tone.id ? 'active' : ''}\`}
                  >
                    <span>{tone.emoji}</span>
                    <span className="tone-name">{tone.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Generate Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="generate-btn"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="icon-md spinning" />
                  Generating Magic...
                </>
              ) : (
                <>
                  <Sparkles className="icon-md" />
                  Generate Copy
                </>
              )}
            </button>

            {/* Quick Templates */}
            <div className="card">
              <h2 className="card-title">Quick Templates</h2>
              <div className="templates-grid">
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

          {/* Output Section */}
          <div className="output-section">
            <div className="output-header">
              <h2 className="section-title">Generated Copy</h2>
              {generatedCopies.length > 0 && (
                <button onClick={handleGenerate} className="regenerate-btn">
                  <RefreshCw className="icon-sm" />
                  Regenerate
                </button>
              )}
            </div>

            {generatedCopies.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">
                  <Sparkles className="icon-lg" />
                </div>
                <h3 className="empty-title">Ready to Create</h3>
                <p className="empty-desc">
                  Enter your topic, choose a platform and tone, then click generate to create engaging copy.
                </p>
              </div>
            ) : (
              <div className="copies-list">
                {generatedCopies.map((copy, index) => (
                  <CopyCard
                    key={index}
                    text={copy}
                    platform={selectedPlatform}
                    onCopy={() => handleCopy(copy, index)}
                    copied={copiedIndex === index}
                  />
                ))}
              </div>
            )}

            {/* Tips Section */}
            <div className="tips-card">
              <h3 className="tips-title">
                <Zap className="icon-md" />
                Pro Tips for Better Copy
              </h3>
              <ul className="tips-list">
                <li className="tip-item">
                  <ArrowRight className="icon-sm" />
                  Start with a hook that grabs attention in the first line
                </li>
                <li className="tip-item">
                  <ArrowRight className="icon-sm" />
                  Use emojis strategically to break up text and add personality
                </li>
                <li className="tip-item">
                  <ArrowRight className="icon-sm" />
                  End with a clear call-to-action to drive engagement
                </li>
                <li className="tip-item">
                  <ArrowRight className="icon-sm" />
                  A/B test different versions to see what resonates
                </li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}`,

    "src/App.css": `
:root {
  --primary: #8B5CF6;
  --primary-dark: #7C3AED;
  --primary-light: #A78BFA;
  --primary-bg: #F5F3FF;

  --twitter: #0EA5E9;
  --instagram: linear-gradient(135deg, #A855F7 0%, #EC4899 100%);
  --linkedin: #2563EB;
  --facebook: #3B82F6;
  --email: #10B981;

  --success: #10B981;
  --warning: #F59E0B;
  --error: #EF4444;

  --bg: #F8FAFC;
  --surface: #FFFFFF;
  --text: #0F172A;
  --text-muted: #64748B;
  --text-light: #94A3B8;
  --border: #E2E8F0;
  --border-light: #F1F5F9;

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-lg: 0 10px 15px -3px rgb(0 0 0 / 0.08), 0 4px 6px -4px rgb(0 0 0 / 0.05);

  --radius-sm: 8px;
  --radius-md: 12px;
  --radius-lg: 16px;
  --radius-xl: 20px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Sora', system-ui, sans-serif;
  background: linear-gradient(135deg, var(--bg) 0%, #EDE9FE 50%, var(--bg) 100%);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}

/* Icons */
.icon-xs { width: 12px; height: 12px; }
.icon-sm { width: 16px; height: 16px; }
.icon-md { width: 20px; height: 20px; }
.icon-lg { width: 32px; height: 32px; }

.text-primary { color: var(--primary); }
.text-success { color: var(--success); }

/* Layout */
.app-container {
  min-height: 100vh;
}

.header {
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 50;
}

.header-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 64px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.brand-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);
}

.brand-subtitle {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.pro-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.pro-btn:hover {
  opacity: 0.9;
}

/* Main Content */
.main-content {
  max-width: 1200px;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.content-grid {
  display: grid;
  grid-template-columns: 2fr 3fr;
  gap: 2rem;
}

@media (max-width: 1024px) {
  .content-grid {
    grid-template-columns: 1fr;
  }
}

/* Cards */
.card {
  background: var(--surface);
  border-radius: var(--radius-xl);
  border: 1px solid var(--border);
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.card-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Input Section */
.input-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.topic-input {
  width: 100%;
  height: 128px;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: 0.9375rem;
  resize: none;
  outline: none;
  transition: all 0.2s;
}

.topic-input:focus {
  border-color: var(--primary);
  box-shadow: 0 0 0 3px var(--primary-bg);
}

.topic-input::placeholder {
  color: var(--text-light);
}

/* Platform Grid */
.platform-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

@media (min-width: 640px) {
  .platform-grid {
    grid-template-columns: repeat(3, 1fr);
  }
}

.platform-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 12px;
  border: 2px solid var(--border);
  border-radius: var(--radius-md);
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.platform-btn:hover {
  border-color: var(--text-light);
}

.platform-btn.active {
  border-color: var(--primary);
  background: var(--primary-bg);
}

.platform-icon-sm {
  width: 24px;
  height: 24px;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.platform-twitter { background: var(--twitter); }
.platform-instagram { background: var(--instagram); }
.platform-linkedin { background: var(--linkedin); }
.platform-facebook { background: var(--facebook); }
.platform-email { background: var(--email); }

.platform-name {
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
}

/* Tone Grid */
.tone-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tone-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  border: 2px solid var(--border);
  border-radius: 100px;
  background: transparent;
  cursor: pointer;
  transition: all 0.2s;
  font-family: inherit;
}

.tone-btn:hover {
  border-color: var(--text-light);
}

.tone-btn.active {
  border-color: var(--primary);
  background: var(--primary-bg);
  color: var(--primary-dark);
}

.tone-name {
  font-size: 0.875rem;
  font-weight: 500;
}

/* Generate Button */
.generate-btn {
  width: 100%;
  padding: 1rem;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  color: white;
  border: none;
  border-radius: var(--radius-md);
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  transition: all 0.2s;
  box-shadow: 0 4px 14px 0 rgba(139, 92, 246, 0.3);
}

.generate-btn:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 6px 20px 0 rgba(139, 92, 246, 0.4);
}

.generate-btn:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Templates Grid */
.templates-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

.template-card {
  padding: 1rem;
  background: linear-gradient(135deg, var(--bg) 0%, var(--border-light) 100%);
  border: 1px solid var(--border);
  border-radius: var(--radius-md);
  cursor: pointer;
  text-align: left;
  transition: all 0.2s;
  font-family: inherit;
}

.template-card:hover {
  border-color: var(--primary-light);
  box-shadow: var(--shadow-md);
}

.template-icon {
  width: 40px;
  height: 40px;
  border-radius: var(--radius-md);
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  margin-bottom: 12px;
  transition: transform 0.2s;
}

.template-card:hover .template-icon {
  transform: scale(1.1);
}

.template-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
}

.template-desc {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

/* Output Section */
.output-section {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.output-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
}

.regenerate-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 12px;
  background: transparent;
  border: none;
  color: var(--primary);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: color 0.2s;
}

.regenerate-btn:hover {
  color: var(--primary-dark);
}

/* Empty State */
.empty-state {
  background: var(--surface);
  border: 2px dashed var(--border);
  border-radius: var(--radius-xl);
  padding: 3rem;
  text-align: center;
}

.empty-icon {
  width: 64px;
  height: 64px;
  margin: 0 auto 1rem;
  border-radius: var(--radius-lg);
  background: var(--primary-bg);
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--primary);
}

.empty-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 8px;
}

.empty-desc {
  font-size: 0.9375rem;
  color: var(--text-muted);
  max-width: 320px;
  margin: 0 auto;
}

/* Copy Cards */
.copies-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.copy-card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 1.25rem;
  transition: all 0.2s;
}

.copy-card:hover {
  box-shadow: var(--shadow-lg);
}

.copy-card-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 12px;
}

.platform-icon {
  width: 32px;
  height: 32px;
  border-radius: var(--radius-sm);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

.copy-btn {
  padding: 8px;
  background: transparent;
  border: none;
  border-radius: var(--radius-sm);
  color: var(--text-light);
  cursor: pointer;
  transition: all 0.2s;
}

.copy-btn:hover {
  color: var(--primary);
  background: var(--primary-bg);
}

.copy-text {
  font-size: 0.9375rem;
  line-height: 1.6;
  color: var(--text);
  white-space: pre-line;
}

.copy-card-footer {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border-light);
}

.action-btn {
  padding: 6px;
  background: transparent;
  border: none;
  color: var(--text-light);
  cursor: pointer;
  transition: color 0.2s;
}

.action-btn:hover {
  color: var(--primary);
}

.char-count {
  margin-left: auto;
  font-size: 0.75rem;
  color: var(--text-light);
}

/* Tips Card */
.tips-card {
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  border-radius: var(--radius-xl);
  padding: 1.5rem;
  color: white;
}

.tips-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tips-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
  list-style: none;
}

.tip-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.9);
}

.tip-item svg {
  flex-shrink: 0;
  margin-top: 2px;
}

/* Responsive */
@media (max-width: 640px) {
  .header-content {
    padding: 0 1rem;
  }

  .main-content {
    padding: 1rem;
  }

  .card {
    padding: 1rem;
  }

  .templates-grid {
    grid-template-columns: 1fr;
  }
}
`,

    "src/index.css": `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Sora', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#root {
  min-height: 100vh;
}`
  }
};
