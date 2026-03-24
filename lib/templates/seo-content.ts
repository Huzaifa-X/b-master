export const seoContentTemplate = {
  id: "seo-content",
  name: "SEO Content",
  description: "SEO analysis and content optimization tool powered by AI",
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
    <link href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
    <title>SEO Content Optimizer</title>
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

    "src/index.css": `* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}
`,

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
  const getColorClass = () => {
    if (score >= 80) return 'score-good'
    if (score >= 60) return 'score-warning'
    return 'score-bad'
  }

  return (
    <div className="seo-score">
      <svg className="score-ring" viewBox="0 0 128 128">
        <circle
          cx="64"
          cy="64"
          r="56"
          strokeWidth="12"
          fill="none"
          className="score-bg"
        />
        <circle
          cx="64"
          cy="64"
          r="56"
          strokeWidth="12"
          fill="none"
          strokeDasharray={350}
          strokeDashoffset={350 - (350 * score) / 100}
          strokeLinecap="round"
          className={\`score-progress \${getColorClass()}\`}
        />
      </svg>
      <div className="score-value-wrapper">
        <span className={\`score-value \${getColorClass()}\`}>{score}</span>
      </div>
    </div>
  )
}`,

    "src/components/KeywordItem.jsx": `import { Hash, TrendingUp } from 'lucide-react'

export default function KeywordItem({ keyword, volume, difficulty, trend }) {
  const getDifficultyClass = () => {
    if (difficulty <= 30) return 'difficulty-easy'
    if (difficulty <= 60) return 'difficulty-medium'
    return 'difficulty-hard'
  }

  return (
    <div className="keyword-item">
      <div className="keyword-left">
        <Hash className="icon-sm" />
        <span className="keyword-text">{keyword}</span>
      </div>
      <div className="keyword-right">
        <div className="keyword-volume">
          <div className="volume-value">{volume.toLocaleString()}</div>
          <div className="volume-label">monthly</div>
        </div>
        <span className={\`difficulty-badge \${getDifficultyClass()}\`}>
          {difficulty}% hard
        </span>
        {trend === 'up' && <TrendingUp className="trend-icon" />}
      </div>
    </div>
  )
}`,

    "src/components/ChecklistItem.jsx": `import { CheckCircle, AlertCircle } from 'lucide-react'

export default function ChecklistItem({ text, passed, priority }) {
  return (
    <div className={\`checklist-item \${passed ? 'passed' : 'warning'}\`}>
      <div className={\`checklist-icon \${passed ? 'passed' : 'warning'}\`}>
        {passed ? (
          <CheckCircle className="icon-xs" />
        ) : (
          <AlertCircle className="icon-xs" />
        )}
      </div>
      <div className="checklist-content">
        <p className="checklist-text">{text}</p>
        <span className="checklist-priority">{priority} priority</span>
      </div>
    </div>
  )
}`,

    "src/components/SuggestionCard.jsx": `export default function SuggestionCard({ title, description, icon: Icon }) {
  return (
    <div className="suggestion-card">
      <div className="suggestion-icon">
        <Icon className="icon-md" />
      </div>
      <h4 className="suggestion-title">{title}</h4>
      <p className="suggestion-desc">{description}</p>
    </div>
  )
}`,

    // --- MAIN APP ---
    "src/App.jsx": `import { useState } from 'react'
import {
  Search, Target, FileText, Lightbulb, BarChart2, Globe, Hash, Zap, ArrowRight, RefreshCw,
  Sparkles
} from 'lucide-react'
import SEOScore from './components/SEOScore'
import KeywordItem from './components/KeywordItem'
import ChecklistItem from './components/ChecklistItem'
import SuggestionCard from './components/SuggestionCard'
import { sampleKeywords, seoChecklist } from './data/mockData'
import './App.css'

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
      setScore(Math.floor(Math.random() * 20) + 75) // New score between 75-95
      showNotification('Analysis Complete!')
    }, 2000)
  }

  const handleAction = (actionName) => {
    setActiveAction(actionName)
    setTimeout(() => {
      setActiveAction(null)
      showNotification(\`\${actionName} Generated!\`)
    }, 1500)
  }

  const showNotification = (msg) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3000)
  }

  return (
    <div className="app">
      <header className="header">
        <div className="header-container">
          <div className="header-content">
            <div className="brand">
              <div className="brand-icon">
                <Search className="icon-md" />
              </div>
              <div>
                <h1 className="brand-title">SEO Optimizer</h1>
                <p className="brand-subtitle">AI-Powered Content Analysis</p>
              </div>
            </div>
            <button 
              onClick={() => showNotification('Upgrade to Pro started!')}
              className="upgrade-btn font-bold active:scale-95 transition-all"
            >
              <Sparkles className="icon-sm" />
              Upgrade Pro
            </button>
          </div>
        </div>
      </header>

      <main className="main-content">
        {notification && (
          <div className="notification">
            <Zap className="icon-sm" />
            {notification}
          </div>
        )}

        <div className="card input-card">
          <h2 className="card-title">Analyze Your Content</h2>
          <div className="input-row">
            <div className="input-wrapper">
              <Globe className="input-icon" />
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Enter URL or paste content to analyze..."
                className="url-input"
              />
            </div>
            <button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="analyze-btn"
            >
              {isAnalyzing ? (
                <>
                  <RefreshCw className="icon-sm spinning" />
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="icon-sm" />
                  Analyze
                </>
              )}
            </button>
          </div>
        </div>

        {hasResults && (
          <div className="results-grid">
            <div className="main-column">
              <div className="card score-card">
                <div className="score-content">
                  <SEOScore score={score} />
                  <div className="score-info">
                    <h3 className="score-title">
                      {score > 80 ? 'Excellent SEO Score' : 'Good SEO Score'}
                    </h3>
                    <p className="score-desc">
                      {score > 80 
                        ? 'Great job! Your content is highly optimized for search engines.' 
                        : 'Your content is well-optimized but has room for improvement.'}
                    </p>
                    <div className="score-badges">
                      <span className="badge passed">
                        {score > 85 ? '6' : '4'} Passed
                      </span>
                      <span className="badge warning">2 Warnings</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="card">
                <h3 className="section-title">
                  <Target className="icon-md text-teal" />
                  SEO Checklist
                </h3>
                <div className="checklist">
                  {seoChecklist.map((item, index) => (
                    <ChecklistItem key={index} {...item} />
                  ))}
                </div>
              </div>

              <div className="card">
                <h3 className="section-title">
                  <Hash className="icon-md text-teal" />
                  Related Keywords
                </h3>
                <div className="keywords-list">
                  {sampleKeywords.map((keyword, index) => (
                    <KeywordItem key={index} {...keyword} />
                  ))}
                </div>
              </div>
            </div>

            <div className="sidebar">
              <div className="card">
                <h3 className="section-title">Quick Actions</h3>
                <div className="quick-actions">
                  <button 
                    onClick={() => handleAction('Meta Tags')} 
                    className={\`action-btn \${activeAction === 'Meta Tags' ? 'active' : ''}\`}
                    disabled={activeAction}
                  >
                    {activeAction === 'Meta Tags' ? <RefreshCw className="icon-md spinning" /> : <FileText className="icon-md text-teal" />}
                    <span>{activeAction === 'Meta Tags' ? 'Generating...' : 'Generate Meta Tags'}</span>
                  </button>
                  <button 
                    onClick={() => handleAction('Content Ideas')} 
                    className={\`action-btn \${activeAction === 'Content Ideas' ? 'active' : ''}\`}
                    disabled={activeAction}
                  >
                    {activeAction === 'Content Ideas' ? <RefreshCw className="icon-md spinning" /> : <Lightbulb className="icon-md text-amber" />}
                    <span>{activeAction === 'Content Ideas' ? 'Thinking...' : 'Get Content Ideas'}</span>
                  </button>
                  <button 
                    onClick={() => handleAction('Competitors')} 
                    className={\`action-btn \${activeAction === 'Competitors' ? 'active' : ''}\`}
                    disabled={activeAction}
                  >
                    {activeAction === 'Competitors' ? <RefreshCw className="icon-md spinning" /> : <BarChart2 className="icon-md text-purple" />}
                    <span>{activeAction === 'Competitors' ? 'Analyzing...' : 'Competitor Analysis'}</span>
                  </button>
                </div>
              </div>

              <div className="ai-suggestions">
                <div className="ai-header">
                  <Zap className="icon-md" />
                  <h3>AI Suggestions</h3>
                </div>
                <ul className="ai-list">
                  <li className="ai-item">
                    <ArrowRight className="icon-sm" />
                    Add more long-tail keywords to improve relevance
                  </li>
                  <li className="ai-item">
                    <ArrowRight className="icon-sm" />
                    Include FAQ section for featured snippets
                  </li>
                  <li className="ai-item">
                    <ArrowRight className="icon-sm" />
                    Optimize images to improve page speed
                  </li>
                </ul>
                <button 
                  onClick={() => showNotification('Loading more suggestions...')}
                  className="view-all-btn active:opacity-80 transition-opacity"
                >
                  View All Suggestions
                </button>
              </div>

              <div className="card">
                <h3 className="section-title">Content Ideas</h3>
                <div className="suggestions">
                  <SuggestionCard
                    icon={FileText}
                    title="Blog Post"
                    description="10 SEO Tips for 2024"
                  />
                  <SuggestionCard
                    icon={Target}
                    title="Landing Page"
                    description="SEO Services Comparison"
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}`,

    "src/App.css": `
:root {
  --teal: #14B8A6;
  --teal-dark: #0D9488;
  --cyan: #06B6D4;
  --amber: #F59E0B;
  --purple: #A855F7;
  --green: #22C55E;
  --red: #EF4444;

  --bg: #F8FAFC;
  --surface: #FFFFFF;
  --text: #0F172A;
  --text-muted: #64748B;
  --text-light: #94A3B8;
  --border: #E2E8F0;

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Space Grotesk', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

/* Icons */
.icon-xs { width: 12px; height: 12px; }
.icon-sm { width: 16px; height: 16px; }
.icon-md { width: 20px; height: 20px; }

.text-teal { color: var(--teal); }
.text-amber { color: var(--amber); }
.text-purple { color: var(--purple); }

.app {
  min-height: 100vh;
  background: var(--bg);
  position: relative;
}

/* Notification */
.notification {
  position: fixed;
  bottom: 2rem;
  right: 2rem;
  background: var(--text);
  color: white;
  padding: 0.75rem 1.25rem;
  border-radius: var(--radius-md);
  display: flex;
  align-items: center;
  gap: 12px;
  font-size: 0.875rem;
  font-weight: 500;
  box-shadow: 0 10px 15px -3px rgb(0 0 0 / 0.1);
  animation: slideUp 0.3s ease-out;
  z-index: 100;
}

@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

/* Header */
.header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
}

.header-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 0 1rem;
}

@media (min-width: 640px) {
  .header-container { padding: 0 1.5rem; }
}

@media (min-width: 1024px) {
  .header-container { padding: 0 2rem; }
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 64px;
}

.brand {
  display: flex;
  align-items: center;
  gap: 12px;
}

.brand-icon {
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: linear-gradient(135deg, var(--teal) 0%, var(--cyan) 100%);
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

.upgrade-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, var(--teal) 0%, var(--cyan) 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-weight: 500;
  cursor: pointer;
  transition: opacity 0.2s;
}

.upgrade-btn:hover {
  opacity: 0.9;
}

/* Main Content */
.main-content {
  max-width: 1280px;
  margin: 0 auto;
  padding: 2rem 1rem;
}

@media (min-width: 640px) {
  .main-content { padding: 2rem 1.5rem; }
}

@media (min-width: 1024px) {
  .main-content { padding: 2rem; }
}

/* Cards */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.card-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1.125rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

/* Input Card */
.input-card {
  margin-bottom: 2rem;
}

.input-row {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

@media (min-width: 640px) {
  .input-row { flex-direction: row; }
}

.input-wrapper {
  flex: 1;
  position: relative;
}

.input-icon {
  position: absolute;
  left: 16px;
  top: 50%;
  transform: translateY(-50%);
  width: 20px;
  height: 20px;
  color: var(--text-light);
}

.url-input {
  width: 100%;
  padding: 12px 16px 12px 48px;
  border: 1px solid var(--border);
  border-radius: 12px;
  font-family: inherit;
  font-size: 1rem;
  outline: none;
  transition: all 0.2s;
}

.url-input:focus {
  border-color: var(--teal);
  box-shadow: 0 0 0 3px rgba(20, 184, 166, 0.1);
}

.url-input::placeholder {
  color: var(--text-light);
}

.analyze-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  padding: 12px 24px;
  background: linear-gradient(135deg, var(--teal) 0%, var(--cyan) 100%);
  color: white;
  border: none;
  border-radius: 12px;
  font-family: inherit;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: opacity 0.2s;
}

.analyze-btn:hover:not(:disabled) {
  opacity: 0.9;
}

.analyze-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Results Grid */
.results-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 1024px) {
  .results-grid { grid-template-columns: 2fr 1fr; }
}

.main-column {
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Score Card */
.score-card .score-content {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
}

@media (min-width: 640px) {
  .score-card .score-content {
    flex-direction: row;
  }
}

.seo-score {
  position: relative;
  width: 128px;
  height: 128px;
  flex-shrink: 0;
}

.score-ring {
  width: 100%;
  height: 100%;
  transform: rotate(-90deg);
}

.score-bg {
  stroke: #F1F5F9;
}

.score-progress {
  transition: stroke-dashoffset 1s ease;
}

.score-progress.score-good { stroke: var(--green); }
.score-progress.score-warning { stroke: var(--amber); }
.score-progress.score-bad { stroke: var(--red); }

.score-value-wrapper {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
}

.score-value {
  font-size: 1.875rem;
  font-weight: 700;
}

.score-value.score-good { color: var(--green); }
.score-value.score-warning { color: var(--amber); }
.score-value.score-bad { color: var(--red); }

.score-info {
  flex: 1;
  text-align: center;
}

@media (min-width: 640px) {
  .score-info { text-align: left; }
}

.score-title {
  font-size: 1.25rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 8px;
}

.score-desc {
  color: var(--text-muted);
  margin-bottom: 1rem;
  line-height: 1.5;
}

.score-badges {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  justify-content: center;
}

@media (min-width: 640px) {
  .score-badges { justify-content: flex-start; }
}

.badge {
  padding: 4px 12px;
  border-radius: 100px;
  font-size: 0.875rem;
  font-weight: 500;
}

.badge.passed {
  background: rgba(34, 197, 94, 0.1);
  color: #16A34A;
}

.badge.warning {
  background: rgba(245, 158, 11, 0.1);
  color: #D97706;
}

/* Checklist */
.checklist {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.checklist-item {
  display: flex;
  align-items: flex-start;
  gap: 12px;
  padding: 1rem;
  border-radius: 12px;
}

.checklist-item.passed {
  background: rgba(34, 197, 94, 0.05);
}

.checklist-item.warning {
  background: rgba(245, 158, 11, 0.05);
}

.checklist-icon {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 2px;
  color: white;
}

.checklist-icon.passed { background: var(--green); }
.checklist-icon.warning { background: var(--amber); }

.checklist-content {
  flex: 1;
}

.checklist-text {
  font-weight: 500;
  margin-bottom: 4px;
}

.checklist-priority {
  font-size: 0.8125rem;
  color: var(--text-muted);
}

/* Keywords List */
.keywords-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.keyword-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  transition: all 0.2s;
}

.keyword-item:hover {
  border-color: var(--teal);
  transform: translateX(4px);
}

.keyword-left {
  display: flex;
  align-items: center;
  gap: 8px;
  color: var(--teal);
}

.keyword-text {
  font-weight: 600;
  color: var(--text);
}

.keyword-right {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.keyword-volume {
  text-align: right;
}

.volume-value {
  font-weight: 600;
  color: var(--text);
  line-height: 1;
}

.volume-label {
  font-size: 0.75rem;
  color: var(--text-muted);
}

.difficulty-badge {
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 600;
}

.difficulty-easy { background: rgba(34, 197, 94, 0.1); color: #16A34A; }
.difficulty-medium { background: rgba(245, 158, 11, 0.1); color: #D97706; }
.difficulty-hard { background: rgba(239, 68, 68, 0.1); color: #DC2626; }

.trend-icon {
  width: 16px;
  height: 16px;
  color: var(--green);
}

/* Sidebar Actions */
.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.action-btn {
  display: flex;
  align-items: center;
  gap: 12px;
  width: 100%;
  padding: 12px;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  color: var(--text);
  font-family: inherit;
  font-size: 0.9375rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  border-color: var(--teal);
  background: white;
  box-shadow: var(--shadow-sm);
}

/* AI Suggestions */
.ai-suggestions {
  background: linear-gradient(135deg, #14B8A6 0%, #06B6D4 100%);
  border-radius: 16px;
  padding: 1.5rem;
  color: white;
}

.ai-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 1rem;
}

.ai-header h3 {
  font-size: 1.125rem;
  font-weight: 600;
}

.ai-list {
  list-style: none;
  display: flex;
  flex-direction: column;
  gap: 12px;
  margin-bottom: 1.5rem;
}

.ai-item {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  font-size: 0.9375rem;
  line-height: 1.5;
}

.ai-item .icon-sm {
  flex-shrink: 0;
  margin-top: 2px;
  opacity: 0.8;
}

.view-all-btn {
  width: 100%;
  padding: 8px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.view-all-btn:hover {
  background: rgba(255, 255, 255, 0.3);
}

/* Suggestions */
.suggestions {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.suggestion-card {
  padding: 12px;
  background: var(--bg);
  border: 1px dashed var(--border);
  border-radius: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.suggestion-card:hover {
  border-color: var(--teal);
  background: white;
}

.suggestion-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  background: rgba(20, 184, 166, 0.1);
  color: var(--teal);
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 8px;
}

.suggestion-title {
  font-size: 0.9375rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 4px;
}

.suggestion-desc {
  font-size: 0.8125rem;
  color: var(--text-muted);
}
`
  }
};
