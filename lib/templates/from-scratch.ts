import { TemplateDefinition } from './index';

export const fromScratchTemplate: TemplateDefinition = {
  id: "from-scratch",
  name: "From Scratch",
  description: "A minimal blank starter - build anything you want from zero",
  category: "Starter",
  icon: "Layers",
  files: {
    "package.json": JSON.stringify(
      {
        name: "from-scratch-app",
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
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
    <title>My App</title>
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

    "src/App.jsx": `import { Sparkles } from 'lucide-react'
import './App.css'

export default function App() {
  return (
    <div className="app-container">
      <div className="content-box">
        {/* Icon */}
        <div className="icon-wrapper">
          <Sparkles className="icon" />
        </div>

        {/* Heading */}
        <div className="text-content">
          <h1 className="title">Start Building</h1>
          <p className="subtitle">
            Your blank canvas is ready. Tell me what you want to create!
          </p>
        </div>

        {/* Suggestions */}
        <div className="suggestions">
          {['Landing Page', 'Dashboard', 'Form', 'Gallery'].map((suggestion) => (
            <span key={suggestion} className="suggestion-tag">
              {suggestion}
            </span>
          ))}
        </div>
      </div>
    </div>
  )
}`,

    "src/App.css": `
:root {
  --primary: #8B5CF6;
  --primary-dark: #7C3AED;
  --primary-light: #A78BFA;
  --primary-bg: #F5F3FF;

  --bg-start: #F8FAFC;
  --bg-end: #F1F5F9;
  --surface: #FFFFFF;
  --text: #0F172A;
  --text-muted: #64748B;
  --border: #E2E8F0;

  --shadow-lg: 0 10px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.05);
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  background: linear-gradient(135deg, var(--bg-start) 0%, var(--bg-end) 100%);
  color: var(--text);
  -webkit-font-smoothing: antialiased;
  min-height: 100vh;
}

.app-container {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 1.5rem;
}

.content-box {
  text-align: center;
  max-width: 400px;
}

.icon-wrapper {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 64px;
  height: 64px;
  border-radius: 16px;
  background: linear-gradient(135deg, var(--primary) 0%, var(--primary-dark) 100%);
  box-shadow: 0 10px 25px -5px rgba(139, 92, 246, 0.4);
  margin-bottom: 1.5rem;
}

.icon {
  width: 32px;
  height: 32px;
  color: white;
}

.text-content {
  margin-bottom: 1.5rem;
}

.title {
  font-size: 1.875rem;
  font-weight: 700;
  color: var(--text);
  margin-bottom: 0.5rem;
}

.subtitle {
  font-size: 1rem;
  color: var(--text-muted);
  line-height: 1.5;
}

.suggestions {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.5rem;
  padding-top: 0.5rem;
}

.suggestion-tag {
  padding: 0.375rem 0.75rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--primary-dark);
  background: var(--primary-bg);
  border: 1px solid var(--primary-light);
  border-radius: 100px;
}

@media (max-width: 480px) {
  .title {
    font-size: 1.5rem;
  }

  .subtitle {
    font-size: 0.9375rem;
  }
}
`,

    "src/index.css": `* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

body {
  font-family: 'Inter', system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

#root {
  min-height: 100vh;
}`
  }
};
