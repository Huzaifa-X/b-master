export const visualAdsTemplate = {
  id: "visual-ads",
  name: "Visual Ads",
  description: "AI-powered marketing visual creator for stunning ads and banners",
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
    <link href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700;800&display=swap" rel="stylesheet">
    <title>AdStudio - Visual Ads Creator</title>
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
      case 'square': return 'aspect-square'
      case 'story': return 'aspect-story'
      case 'landscape': return 'aspect-video'
      case 'banner': return 'aspect-banner'
      default: return 'aspect-square'
    }
  }

  const gradientStyle = selectedTheme
    ? \`linear-gradient(135deg, \${selectedTheme.colors[0]} 0%, \${selectedTheme.colors[1]} 50%, \${selectedTheme.colors[2] || selectedTheme.colors[1]} 100%)\`
    : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'

  return (
    <div className={\`ad-preview \${getAspectClass()}\`}>
      <div className="ad-bg" style={{ background: gradientStyle }} />
      <div className="ad-decorations">
        <div className="ad-blob ad-blob-1" />
        <div className="ad-blob ad-blob-2" />
      </div>
      <div className="ad-content">
        <h2 className="ad-headline">{headline || 'Your Headline Here'}</h2>
        <p className="ad-subtext">{subtext || 'Add compelling subtext to capture attention'}</p>
        <button className="ad-cta">Shop Now</button>
      </div>
      <div className="ad-size-badge">{selectedFormat?.size}</div>
    </div>
  )
}`,

    "src/components/TemplateCard.jsx": `import { Eye } from 'lucide-react'

export default function TemplateCard({ template, onClick }) {
  return (
    <button onClick={onClick} className="template-card">
      <div className="template-bg" style={{ background: template.preview }} />
      <div className="template-overlay" />
      <div className="template-info">
        <span className="template-category">{template.category}</span>
        <h4 className="template-name">{template.name}</h4>
      </div>
      <div className="template-hover">
        <div className="template-eye">
          <Eye className="icon-sm" />
        </div>
      </div>
    </button>
  )
}`,

    // --- MAIN APP ---
    "src/App.jsx": `import { useState } from 'react'
import {
  Image, Sparkles, Download, RefreshCw, Palette, Type, Layout,
  Layers, Wand2, Check, ChevronRight, Zap, Share2
} from 'lucide-react'
import { formats, colorThemes, templates } from './data/constants'
import AdPreview from './components/AdPreview'
import TemplateCard from './components/TemplateCard'
import './App.css'

export default function App() {
  const [selectedFormat, setSelectedFormat] = useState('square')
  const [selectedTheme, setSelectedTheme] = useState('sunset')
  const [headline, setHeadline] = useState('Summer Sale')
  const [subtext, setSubtext] = useState('Up to 50% off on all products')
  const [isGenerating, setIsGenerating] = useState(false)
  const [isExporting, setIsExporting] = useState(false)
  const [notification, setNotification] = useState(null)

  const handleGenerate = () => {
    setIsGenerating(true)
    setTimeout(() => {
      setIsGenerating(false)
      showNotification('Ad Variants Refreshed!')
    }, 2000)
  }

  const handleExport = () => {
    setIsExporting(true)
    setTimeout(() => {
      setIsExporting(false)
      showNotification('Ad Exported Successfully!')
    }, 2500)
  }

  const showNotification = (msg) => {
    setNotification(msg)
    setTimeout(() => setNotification(null), 3000)
  }

  return (
    <div className="app">
      <header className="header">
        {notification && (
          <div className="notification">
            <Zap className="icon-sm" />
            {notification}
          </div>
        )}
        <div className="header-container">
          <div className="header-content">
            <div className="brand">
              <div className="brand-icon">
                <Image className="icon-md" />
              </div>
              <div>
                <h1 className="brand-title">AdStudio</h1>
                <p className="brand-subtitle">Visual Ads Creator</p>
              </div>
            </div>
            <div className="header-actions">
              <button className="projects-btn" onClick={() => alert('Opening your project library...')}>
                <Layers className="icon-sm" />
                My Projects
              </button>
              <button className="upgrade-btn" onClick={() => alert('Subscription plans modal would open!')}>
                <Sparkles className="icon-sm" />
                Upgrade
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="main-content">
        <div className="editor-grid">
          <div className="editor-panel">
            <div className="card">
              <h2 className="section-title">
                <Layout className="icon-md text-pink" />
                Ad Format
              </h2>
              <div className="formats-grid">
                {formats.map((format) => (
                  <button
                    key={format.id}
                    onClick={() => setSelectedFormat(format.id)}
                    className={\`format-btn \${selectedFormat === format.id ? 'active' : ''}\`}
                  >
                    <format.icon className={\`format-icon \${selectedFormat === format.id ? 'active' : ''}\`} />
                    <span className="format-name">{format.name}</span>
                    <span className="format-platform">{format.platform}</span>
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="section-title">
                <Palette className="icon-md text-pink" />
                Color Theme
              </h2>
              <div className="themes-grid">
                {colorThemes.map((theme) => (
                  <button
                    key={theme.id}
                    onClick={() => setSelectedTheme(theme.id)}
                    className={\`theme-btn \${selectedTheme === theme.id ? 'active' : ''}\`}
                  >
                    <div
                      className="theme-preview"
                      style={{
                        background: \`linear-gradient(135deg, \${theme.colors[0]} 0%, \${theme.colors[1]} 50%, \${theme.colors[2] || theme.colors[1]} 100%)\`
                      }}
                    />
                    <span className="theme-name">{theme.name}</span>
                    {selectedTheme === theme.id && (
                      <div className="theme-check">
                        <Check className="icon-xs" />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="section-title">
                <Type className="icon-md text-pink" />
                Ad Content
              </h2>
              <div className="content-fields">
                <div className="field">
                  <label className="field-label">Headline</label>
                  <input
                    type="text"
                    value={headline}
                    onChange={(e) => setHeadline(e.target.value)}
                    placeholder="Enter your headline..."
                    className="text-input"
                  />
                </div>
                <div className="field">
                  <label className="field-label">Subtext</label>
                  <textarea
                    value={subtext}
                    onChange={(e) => setSubtext(e.target.value)}
                    placeholder="Add supporting text..."
                    rows={2}
                    className="text-area"
                  />
                </div>
              </div>
            </div>

            <div className="ai-card">
              <div className="ai-content">
                <div className="ai-icon">
                  <Wand2 className="icon-lg" />
                </div>
                <div className="ai-info">
                  <h3 className="ai-title">AI Enhancement</h3>
                  <p className="ai-desc">Let AI generate engaging headlines and optimize your ad design.</p>
                  <button
                    onClick={handleGenerate}
                    disabled={isGenerating}
                    className="ai-btn"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="icon-sm spinning" />
                        Generating...
                      </>
                    ) : (
                      <>
                        <Sparkles className="icon-sm" />
                        Generate with AI
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="preview-panel">
            <div className="card">
              <div className="preview-header">
                <h2 className="section-title-inline">Live Preview</h2>
                <div className="preview-actions">
                  <button className="icon-btn" onClick={() => alert('Share link generated and copied to clipboard!')}>
                    <Share2 className="icon-md" />
                  </button>
                  <button className="export-btn">
                    <Download className="icon-sm" />
                    Export
                  </button>
                </div>
              </div>
              <div className="preview-area">
                <AdPreview
                  format={selectedFormat}
                  theme={selectedTheme}
                  headline={headline}
                  subtext={subtext}
                />
              </div>
            </div>

            <div className="card">
              <div className="templates-header">
                <h2 className="section-title-inline">Quick Templates</h2>
                <button className="view-all-link" onClick={() => alert('Full template catalog coming soon!')}>
                  View All <ChevronRight className="icon-sm" />
                </button>
              </div>
              <div className="templates-grid-preview">
                {templates.map((template) => (
                  <TemplateCard
                    key={template.id}
                    template={template}
                    onClick={() => {
                      setHeadline(template.name);
                      setSubtext(\`Perfect for your next \${template.category} campaign\`);
                      showNotification(\`Applied \${template.name} template\`);
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="card">
              <h2 className="section-title-inline">Export Options</h2>
              <div className="export-grid">
                <button 
                  onClick={handleExport}
                  disabled={isExporting}
                  className="export-option"
                >
                  <div className="export-option-header">
                    <div className="export-icon png">
                      <Image className="icon-sm" />
                    </div>
                    <span className="export-format">PNG</span>
                  </div>
                  <p className="export-desc">High quality, transparent background</p>
                </button>
                <button 
                  onClick={handleExport}
                  disabled={isExporting}
                  className="export-option"
                >
                  <div className="export-option-header">
                    <div className="export-icon jpg">
                      <Zap className="icon-sm" />
                    </div>
                    <span className="export-format">JPG</span>
                  </div>
                  <p className="export-desc">Compressed, smaller file size</p>
                </button>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}`,

    "src/App.css": `
:root {
  --pink: #EC4899;
  --pink-dark: #DB2777;
  --orange: #F97316;
  --purple: #A855F7;

  --bg: #F8FAFC;
  --surface: #FFFFFF;
  --text: #0F172A;
  --text-muted: #64748B;
  --text-light: #94A3B8;
  --border: #E2E8F0;

  --shadow-sm: 0 1px 2px 0 rgb(0 0 0 / 0.05);
  --shadow-md: 0 4px 6px -1px rgb(0 0 0 / 0.07), 0 2px 4px -2px rgb(0 0 0 / 0.05);
  --shadow-xl: 0 20px 25px -5px rgb(0 0 0 / 0.1), 0 8px 10px -6px rgb(0 0 0 / 0.1);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Manrope', system-ui, sans-serif;
  background: var(--bg);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
}

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
  border-radius: 12px;
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
.icon-xs { width: 12px; height: 12px; }
.icon-sm { width: 16px; height: 16px; }
.icon-md { width: 20px; height: 20px; }
.icon-lg { width: 24px; height: 24px; }

.text-pink { color: var(--pink); }

.app {
  min-height: 100vh;
  background: var(--bg);
}

/* Header */
.header {
  background: var(--surface);
  border-bottom: 1px solid var(--border);
  position: sticky;
  top: 0;
  z-index: 50;
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
  background: linear-gradient(135deg, var(--pink) 0%, var(--orange) 100%);
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

.header-actions {
  display: flex;
  align-items: center;
  gap: 12px;
}

.projects-btn {
  display: none;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: transparent;
  border: none;
  font-family: inherit;
  font-weight: 500;
  color: var(--text-muted);
  cursor: pointer;
  transition: color 0.2s;
}

.projects-btn:hover {
  color: var(--text);
}

@media (min-width: 640px) {
  .projects-btn { display: flex; }
}

.upgrade-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: linear-gradient(135deg, var(--pink) 0%, var(--orange) 100%);
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

.editor-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 2rem;
}

@media (min-width: 1024px) {
  .editor-grid { grid-template-columns: 1fr 1fr; }
}

.editor-panel,
.preview-panel {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

/* Cards */
.card {
  background: var(--surface);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
  box-shadow: var(--shadow-sm);
}

.section-title {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
  margin-bottom: 1rem;
  display: flex;
  align-items: center;
  gap: 8px;
}

.section-title-inline {
  font-size: 1rem;
  font-weight: 600;
  color: var(--text);
}

/* Formats Grid */
.formats-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 12px;
}

@media (min-width: 640px) {
  .formats-grid { grid-template-columns: repeat(4, 1fr); }
}

.format-btn {
  padding: 1rem;
  border: 2px solid var(--border);
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  text-align: center;
  transition: all 0.2s;
  font-family: inherit;
}

.format-btn:hover {
  border-color: var(--text-light);
}

.format-btn.active {
  border-color: var(--pink);
  background: rgba(236, 72, 153, 0.05);
}

.format-icon {
  width: 24px;
  height: 24px;
  margin: 0 auto 8px;
  color: var(--text-light);
}

.format-icon.active {
  color: var(--pink);
}

.format-name {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
}

.format-platform {
  display: block;
  font-size: 0.75rem;
  color: var(--text-muted);
  margin-top: 4px;
}

/* Themes Grid */
.themes-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 12px;
}

@media (min-width: 640px) {
  .themes-grid { grid-template-columns: repeat(6, 1fr); }
}

.theme-btn {
  position: relative;
  padding: 4px;
  border: 2px solid transparent;
  border-radius: 12px;
  background: transparent;
  cursor: pointer;
  transition: border-color 0.2s;
  font-family: inherit;
}

.theme-btn:hover {
  border-color: var(--border);
}

.theme-btn.active {
  border-color: var(--pink);
}

.theme-preview {
  height: 48px;
  border-radius: 8px;
}

.theme-name {
  display: block;
  font-size: 0.75rem;
  font-weight: 500;
  color: var(--text-muted);
  margin-top: 8px;
  text-align: center;
}

.theme-check {
  position: absolute;
  top: -4px;
  right: -4px;
  width: 20px;
  height: 20px;
  background: var(--pink);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
}

/* Content Fields */
.content-fields {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.field-label {
  display: block;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--text);
  margin-bottom: 8px;
}

.text-input {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  font-family: inherit;
  font-size: 1rem;
  outline: none;
  transition: all 0.2s;
}

.text-input:focus {
  border-color: var(--pink);
  box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.1);
}

.text-area {
  width: 100%;
  padding: 12px 16px;
  border: 1px solid var(--border);
  border-radius: 12px;
  font-family: inherit;
  font-size: 1rem;
  resize: none;
  outline: none;
  transition: all 0.2s;
}

.text-area:focus {
  border-color: var(--pink);
  box-shadow: 0 0 0 3px rgba(236, 72, 153, 0.1);
}

/* AI Card */
.ai-card {
  background: linear-gradient(135deg, var(--pink) 0%, var(--orange) 100%);
  border-radius: 16px;
  padding: 1.5rem;
  color: white;
}

.ai-content {
  display: flex;
  align-items: flex-start;
  gap: 1rem;
}

.ai-icon {
  width: 48px;
  height: 48px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.ai-info {
  flex: 1;
}

.ai-title {
  font-size: 1rem;
  font-weight: 600;
  margin-bottom: 4px;
}

.ai-desc {
  font-size: 0.875rem;
  color: rgba(255, 255, 255, 0.8);
  margin-bottom: 1rem;
}

.ai-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 20px;
  background: white;
  color: var(--pink);
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 600;
  cursor: pointer;
  transition: transform 0.2s;
}

.ai-btn:hover:not(:disabled) {
  transform: translateY(-2px);
}

.ai-btn:disabled {
  opacity: 0.8;
  cursor: not-allowed;
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

/* Preview Area */
.preview-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.preview-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.icon-btn {
  padding: 8px;
  background: transparent;
  border: 1px solid var(--border);
  border-radius: 8px;
  color: var(--text-muted);
  cursor: pointer;
  transition: all 0.2s;
}

.icon-btn:hover {
  color: var(--text);
  border-color: var(--text-light);
}

.export-btn {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 8px 16px;
  background: var(--text);
  color: white;
  border: none;
  border-radius: 8px;
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.2s;
}

.export-btn:hover {
  background: #1E293B;
}

.preview-area {
  background: var(--bg);
  border: 1px dashed var(--border);
  border-radius: 12px;
  padding: 2rem;
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 400px;
}

/* Ad Preview */
.ad-preview {
  position: relative;
  width: 100%;
  max-width: 400px;
  background: white;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: var(--shadow-xl);
  display: flex;
  flex-direction: column;
  justify-content: center;
  padding: 2rem;
  color: white;
  text-align: center;
  transition: all 0.3s ease;
}

.aspect-square { aspect-ratio: 1/1; }
.aspect-story { aspect-ratio: 9/16; max-width: 320px; }
.aspect-video { aspect-ratio: 16/9; max-width: 100%; }
.aspect-banner { aspect-ratio: 8/1; max-width: 100%; padding: 1rem; flex-direction: row; justify-content: space-between; text-align: left; }

.ad-bg {
  position: absolute;
  inset: 0;
  z-index: 0;
}

.ad-decorations {
  position: absolute;
  inset: 0;
  z-index: 1;
  overflow: hidden;
  opacity: 0.5;
}

.ad-blob {
  position: absolute;
  border-radius: 50%;
  background: white;
  filter: blur(40px);
}

.ad-blob-1 {
  top: -20%;
  left: -20%;
  width: 60%;
  height: 60%;
}

.ad-blob-2 {
  bottom: -20%;
  right: -20%;
  width: 60%;
  height: 60%;
}

.ad-content {
  position: relative;
  z-index: 2;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
}

.aspect-banner .ad-content {
  flex-direction: row;
  width: 100%;
  gap: 2rem;
}

.ad-headline {
  font-size: 2rem;
  font-weight: 800;
  line-height: 1.2;
}

.aspect-banner .ad-headline { font-size: 1.5rem; margin: 0; }

.ad-subtext {
  font-size: 1rem;
  opacity: 0.9;
  max-width: 80%;
  margin: 0 auto;
}

.aspect-banner .ad-subtext {
  max-width: none;
  margin: 0;
  flex: 1;
}

.ad-cta {
  padding: 12px 32px;
  background: white;
  color: black;
  border: none;
  border-radius: 100px;
  font-family: inherit;
  font-weight: 700;
  margin-top: 1rem;
  cursor: pointer;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.aspect-banner .ad-cta {
  margin-top: 0;
  white-space: nowrap;
}

.ad-size-badge {
  position: absolute;
  top: 1rem;
  right: 1rem;
  background: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(4px);
  padding: 4px 8px;
  border-radius: 6px;
  font-size: 0.75rem;
  font-family: monospace;
  z-index: 3;
}

/* Templates Area */
.templates-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.5rem;
}

.view-all-link {
  display: flex;
  align-items: center;
  gap: 4px;
  background: transparent;
  border: none;
  color: var(--pink);
  font-family: inherit;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
}

.view-all-link:hover {
  color: var(--pink-dark);
}

.templates-grid-preview {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.template-card {
  position: relative;
  aspect-ratio: 4/3;
  border-radius: 12px;
  border: none;
  padding: 0;
  cursor: pointer;
  overflow: hidden;
  text-align: left;
}

.template-bg {
  position: absolute;
  inset: 0;
}

.template-overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(to top, rgba(0,0,0,0.8) 0%, transparent 100%);
}

.template-info {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 12px;
  z-index: 2;
}

.template-category {
  display: inline-block;
  padding: 4px 8px;
  background: rgba(255, 255, 255, 0.2);
  backdrop-filter: blur(4px);
  border-radius: 4px;
  color: white;
  font-size: 0.625rem;
  font-weight: 600;
  text-transform: uppercase;
  margin-bottom: 4px;
}

.template-name {
  color: white;
  font-size: 0.875rem;
  font-weight: 600;
}

.template-hover {
  position: absolute;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.2s;
  z-index: 3;
}

.template-card:hover .template-hover {
  opacity: 1;
}

.template-eye {
  width: 40px;
  height: 40px;
  background: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--text);
  transform: scale(0.8);
  transition: transform 0.2s;
}

.template-card:hover .template-eye {
  transform: scale(1);
}

/* Export Area */
.export-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 1rem;
}

.export-option {
  padding: 1rem;
  background: var(--bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  text-align: left;
  cursor: pointer;
  transition: all 0.2s;
}

.export-option:hover {
  border-color: var(--pink);
  background: white;
  box-shadow: var(--shadow-sm);
}

.export-option-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
}

.export-icon {
  width: 32px;
  height: 32px;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
}

.export-icon.png {
  background: rgba(168, 85, 247, 0.1);
  color: var(--purple);
}

.export-icon.jpg {
  background: rgba(249, 115, 22, 0.1);
  color: var(--orange);
}

.export-format {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text);
}

.export-desc {
  font-size: 0.75rem;
  color: var(--text-muted);
}
`
  }
};
